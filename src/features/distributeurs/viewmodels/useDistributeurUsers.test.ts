import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { deriveLogin, useDistributeurUsers } from "./useDistributeurUsers";
import * as accessSecurityService from "@/core/security/accessSecurityService";

vi.mock("@/core/security/accessSecurityService", () => ({
  ACCESS_SECURITY_CLIENT_ID: "client-test",
  createBackofficeUser: vi.fn(),
  updateAccessSecurityUser: vi.fn(),
  deleteAccessSecurityUser: vi.fn().mockResolvedValue(undefined),
  listClientCompositeRoles: vi.fn().mockResolvedValue(["profile.bo.autonome-set-admin", "profile.bo.autonome-set-agent"]),
  listHierarchyMembers: vi.fn().mockResolvedValue({ users: [] }),
}));

describe("useDistributeurUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("derives login correctly from first name and last name", () => {
    expect(deriveLogin("Jean", "Dupont")).toBe("j.jeandupont");
    expect(deriveLogin("Éric", "M'Baye")).toBe("e.ericmbaye");
    expect(deriveLogin("Jean", "Dupont", ["j.jeandupont"])).toBe("j.jeandupont1");
    expect(deriveLogin("Jean", "Dupont", ["j.jeandupont", "j.jeandupont1"])).toBe("j.jeandupont2");
  });

  it("adds a user and derives login automatically", async () => {
    const { result } = renderHook(() => useDistributeurUsers(true));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setUserForm({
        nom: "Diop",
        prenom: "Amadou",
        username: "",
        email: "amadou.diop@example.com",
        profil: "profile.bo.autonome-set-admin",
      });
    });

    act(() => {
      result.current.addUser();
    });

    expect(result.current.users).toHaveLength(1);
    expect(result.current.users[0].nom).toBe("Diop");
    expect(result.current.users[0].prenom).toBe("Amadou");
    expect(result.current.users[0].username).toBe("a.amadoudiop");
    expect(result.current.users[0].email).toBe("amadou.diop@example.com");
    expect(result.current.users[0].isPendingCreation).toBe(true);
  });

  it("removes a pending user without calling API", async () => {
    const { result } = renderHook(() => useDistributeurUsers(true));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setUserForm({
        nom: "Fall",
        prenom: "Fatou",
        username: "ffall",
        email: "fatou.fall@example.com",
        profil: "profile.bo.autonome-set-agent",
      });
    });

    act(() => {
      result.current.addUser();
    });

    expect(result.current.users).toHaveLength(1);
    const userId = result.current.users[0].id;

    await act(async () => {
      await result.current.removeUser(userId);
    });

    expect(result.current.users).toHaveLength(0);
    expect(accessSecurityService.deleteAccessSecurityUser).not.toHaveBeenCalled();
  });

  it("calls deleteAccessSecurityUser when removing an existing persisted user", async () => {
    vi.mocked(accessSecurityService.listHierarchyMembers).mockResolvedValue({
      ref_type: "DISTRIBUTOR",
      ref_id: "dist-1",
      users: [
        {
          user_id: "persisted-u1",
          username: "ffall",
          first_name: "Fatou",
          last_name: "Fall",
          email: "fatou.fall@example.com",
          profiles: ["profile.bo.autonome-set-agent"],
        },
      ],
    });

    const { result } = renderHook(() => useDistributeurUsers(true));

    await act(async () => {
      await result.current.loadUsersForDistributor("dist-1");
    });

    expect(result.current.users).toHaveLength(1);
    expect(result.current.users[0].isPendingCreation).toBe(false);

    await act(async () => {
      await result.current.removeUser("persisted-u1");
    });

    expect(accessSecurityService.deleteAccessSecurityUser).toHaveBeenCalledWith("persisted-u1");
    expect(result.current.users).toHaveLength(0);
  });

  it("saves pending users with target scope DISTRIBUTOR and STRUCTURE", async () => {
    vi.mocked(accessSecurityService.createBackofficeUser).mockResolvedValue({
      account_id: "acc-1",
      account_user_id: "user-1",
      account_username: "adiop",
      temporary_password: "temp-password-123",
      target_scope: [
        { ref_type: "STRUCTURE", ref_id: "struct-456" },
        { ref_type: "DISTRIBUTOR", ref_id: "distrib-123" },
      ],
      profiles: ["profile.bo.autonome-set-admin"],
    });

    const { result } = renderHook(() => useDistributeurUsers(true));

    act(() => {
      result.current.setUserForm({
        nom: "Diop",
        prenom: "Amadou",
        username: "adiop",
        email: "amadou.diop@example.com",
        profil: "profile.bo.autonome-set-admin",
      });
    });

    act(() => {
      result.current.addUser();
    });

    await act(async () => {
      await result.current.savePendingUsers("distrib-123", "struct-456");
    });

    expect(accessSecurityService.createBackofficeUser).toHaveBeenCalledWith({
      username: "adiop",
      email: "amadou.diop@example.com",
      target_scope: [
        { ref_type: "STRUCTURE", ref_id: "struct-456" },
        { ref_type: "DISTRIBUTOR", ref_id: "distrib-123" },
      ],
      profiles: ["profile.bo.autonome-set-admin"],
      first_name: "Amadou",
      last_name: "Diop",
      matricule: null,
    });
  });

  it("expose les erreurs par champ au lieu d'ajouter un utilisateur incomplet", async () => {
    const { result } = renderHook(() => useDistributeurUsers(true));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setUserForm({ nom: "", prenom: "", username: "", email: "awa@", profil: "profile.bo.autonome-set-admin" });
    });

    act(() => {
      result.current.addUser();
    });

    expect(result.current.users).toHaveLength(0);
    expect(result.current.userFormErrors).toEqual({
      prenom: "Le prénom est obligatoire",
      nom: "Le nom est obligatoire",
      username: "Le login est obligatoire",
      email: "L'adresse e-mail n'est pas valide",
    });

    act(() => {
      result.current.clearUserFormError("prenom");
    });
    expect(result.current.userFormErrors.prenom).toBeUndefined();

    act(() => {
      result.current.cancelUserForm();
    });
    expect(result.current.userFormErrors).toEqual({});
  });
});

