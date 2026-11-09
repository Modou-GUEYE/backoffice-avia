import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHabilitations } from "./useHabilitations";
import * as habService from "../services/habilitationService";

vi.mock("../services/habilitationService", () => ({
  fetchHabilitationMatrix: vi.fn(),
  createProfile: vi.fn(),
  updateProfile: vi.fn(),
  replaceProfilePermissions: vi.fn(),
  syncProfile: vi.fn(),
  deleteProfile: vi.fn(),
  createPermission: vi.fn(),
  updatePermission: vi.fn(),
  deletePermission: vi.fn(),
  syncPermission: vi.fn(),
}));

vi.mock("@/core/network/httpClient", () => ({
  refreshAccessToken: vi.fn().mockResolvedValue({ access_token: "new-token" }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useHabilitations (OpenAPI Contract Compliant)", () => {
  const mockMatrix = {
    matrices: [
      {
        client_id: "backoffice-web",
        permissions: [
          {
            id: "perm-1",
            code: "perm.bo.user.list",
            name: "Lister les utilisateurs",
            client_id: "backoffice-web",
            description: "Permet de lister les utilisateurs",
            enabled: true,
            sync_status: "SYNCED",
            sync_error: null,
            created_at: "2026-01-01",
            updated_at: "2026-01-01",
          },
          {
            id: "perm-2",
            code: "perm.bo.user.add",
            name: "Créer un utilisateur",
            client_id: "backoffice-web",
            description: null,
            enabled: true,
            sync_status: "SYNCED",
            sync_error: null,
            created_at: "2026-01-01",
            updated_at: "2026-01-01",
          },
        ],
        rows: [
          {
            profile: {
              id: "prof-1",
              code: "profile.bo-admin",
              name: "Administrateur Backoffice",
              client_id: "backoffice-web",
              description: "Admin global",
              enabled: true,
              sync_status: "SYNCED",
              sync_error: null,
              created_at: "2026-01-01",
              updated_at: "2026-01-01",
            },
            permission_ids: ["perm-1", "perm-2"],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(habService.fetchHabilitationMatrix).mockResolvedValue(mockMatrix);
  });

  it("loads habilitation matrix on mount for default client backoffice-web", async () => {
    const { result } = renderHook(() => useHabilitations());

    await act(async () => {});

    expect(habService.fetchHabilitationMatrix).toHaveBeenCalledWith("backoffice-web");
    expect(result.current.profiles).toHaveLength(1);
    expect(result.current.availablePermissions).toHaveLength(2);
    expect(result.current.clientId).toBe("backoffice-web");
  });

  it("creates a new profile strictly per contract without any suffix gymnastics", async () => {
    vi.mocked(habService.createProfile).mockResolvedValue({
      id: "prof-2",
      code: "profile.bo.custom-manager",
      name: "Manager Personnalisé",
      client_id: "backoffice-web",
      description: "Gestionnaire",
      enabled: true,
      sync_status: "SYNCED",
      sync_error: null,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    });

    const { result } = renderHook(() => useHabilitations());
    await act(async () => {});

    act(() => {
      result.current.handleStartCreateProfile();
    });

    expect(result.current.isCreatingProfile).toBe(true);

    act(() => {
      result.current.setProfileForm({
        name: "Manager Personnalisé",
        code: "profile.bo.custom-manager",
        description: "Gestionnaire",
        enabled: true,
        permissionIds: ["perm-1"],
      });
    });

    await act(async () => {
      await result.current.handleConfirmCreateProfile();
    });

    expect(habService.createProfile).toHaveBeenCalledWith({
      code: "profile.bo.custom-manager",
      name: "Manager Personnalisé",
      client_id: "backoffice-web",
      description: "Gestionnaire",
      enabled: true,
    });

    expect(habService.replaceProfilePermissions).toHaveBeenCalledWith("prof-2", ["perm-1"]);
    expect(habService.syncProfile).toHaveBeenCalledWith("prof-2");
    expect(result.current.isCreatingProfile).toBe(false);
  });

  it("updates an existing profile strictly per contract", async () => {
    vi.mocked(habService.updateProfile).mockResolvedValue({
      id: "prof-1",
      code: "profile.bo-admin",
      name: "Admin Modifié",
      client_id: "backoffice-web",
      description: "Nouvelle description",
      enabled: true,
      sync_status: "SYNCED",
      sync_error: null,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    });

    const { result } = renderHook(() => useHabilitations());
    await act(async () => {});

    act(() => {
      result.current.handleStartEditProfile(mockMatrix.matrices[0].rows[0]);
    });

    expect(result.current.editingProfileRow).not.toBeNull();

    act(() => {
      result.current.setProfileForm((prev) => ({
        ...prev,
        name: "Admin Modifié",
        description: "Nouvelle description",
        permissionIds: ["perm-1"],
      }));
    });

    await act(async () => {
      await result.current.handleConfirmUpdateProfile();
    });

    expect(habService.updateProfile).toHaveBeenCalledWith("prof-1", {
      name: "Admin Modifié",
      description: "Nouvelle description",
      enabled: true,
    });
    expect(habService.replaceProfilePermissions).toHaveBeenCalledWith("prof-1", ["perm-1"]);
    expect(habService.syncProfile).toHaveBeenCalledWith("prof-1");
  });

  it("deletes a profile strictly per contract", async () => {
    vi.mocked(habService.deleteProfile).mockResolvedValue(undefined);

    const { result } = renderHook(() => useHabilitations());
    await act(async () => {});

    act(() => {
      result.current.setProfileToDelete(mockMatrix.matrices[0].rows[0]);
    });

    await act(async () => {
      await result.current.handleDeleteProfile();
    });

    expect(habService.deleteProfile).toHaveBeenCalledWith("prof-1");
    expect(result.current.profileToDelete).toBeNull();
  });
  it("envoie le code du profil uniquement quand il a été modifié", async () => {
    vi.mocked(habService.updateProfile).mockResolvedValue({} as never);

    const { result } = renderHook(() => useHabilitations());
    await act(async () => {});

    act(() => {
      result.current.handleStartEditProfile(mockMatrix.matrices[0].rows[0]);
    });
    act(() => {
      result.current.setProfileForm((prev) => ({ ...prev, code: "profile.bo.super-admin" }));
    });

    await act(async () => {
      await result.current.handleConfirmUpdateProfile();
    });

    expect(habService.updateProfile).toHaveBeenCalledWith(
      "prof-1",
      expect.objectContaining({ code: "profile.bo.super-admin" }),
    );
  });

  it("envoie le code de la permission uniquement quand il a été modifié", async () => {
    vi.mocked(habService.updatePermission).mockResolvedValue({} as never);
    const permission = mockMatrix.matrices[0].permissions[0];

    const { result } = renderHook(() => useHabilitations());
    await act(async () => {});

    act(() => {
      result.current.handleStartEditPermission(permission);
    });
    await act(async () => {
      await result.current.handleConfirmSavePermission();
    });
    expect(vi.mocked(habService.updatePermission).mock.calls[0][1]).not.toHaveProperty("code");

    act(() => {
      result.current.handleStartEditPermission(permission);
    });
    act(() => {
      result.current.setPermissionForm((prev) => ({ ...prev, code: "perm.bo.user.read" }));
    });
    await act(async () => {
      await result.current.handleConfirmSavePermission();
    });
    expect(vi.mocked(habService.updatePermission).mock.calls[1][1]).toEqual(
      expect.objectContaining({ code: "perm.bo.user.read" }),
    );
  });
  it("n'envoie que les permissions quand seules elles ont changé", async () => {
    const { result } = renderHook(() => useHabilitations());
    await act(async () => {});

    act(() => {
      result.current.handleStartEditProfile(mockMatrix.matrices[0].rows[0]);
    });
    act(() => {
      result.current.setProfileForm((prev) => ({ ...prev, permissionIds: ["perm-2"] }));
    });
    await act(async () => {
      await result.current.handleConfirmUpdateProfile();
    });

    expect(habService.updateProfile).not.toHaveBeenCalled();
    expect(habService.replaceProfilePermissions).toHaveBeenCalledWith("prof-1", ["perm-2"]);
  });
});
