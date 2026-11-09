import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestAccessSecurityPasswordReset } from "@/core/security/accessSecurityService";
import { useForgotPassword } from "./useForgotPassword";

vi.mock("@/core/security/accessSecurityService", () => ({
  requestAccessSecurityPasswordReset: vi.fn(),
}));

const mockedRequestPasswordReset = vi.mocked(requestAccessSecurityPasswordReset);

describe("useForgotPassword", () => {
  beforeEach(() => {
    mockedRequestPasswordReset.mockReset();
  });

  it("refuse une adresse e-mail vide", async () => {
    const { result } = renderHook(() => useForgotPassword());

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(result.current.fieldErrors.email).toBe("Veuillez renseigner votre adresse e-mail.");
    expect(result.current.error).toBeNull();
    expect(mockedRequestPasswordReset).not.toHaveBeenCalled();
  });

  it("refuse une adresse e-mail invalide", async () => {
    const { result } = renderHook(() => useForgotPassword());
    act(() => result.current.setEmail("utilisateur sans domaine"));

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(result.current.fieldErrors.email).toBe("Veuillez saisir une adresse e-mail valide.");
    expect(result.current.error).toBeNull();
    expect(mockedRequestPasswordReset).not.toHaveBeenCalled();
  });

  it("envoie l'identifiant normalisé et affiche le succès", async () => {
    mockedRequestPasswordReset.mockResolvedValue({ message: "Demande envoyée" });
    const { result } = renderHook(() => useForgotPassword());
    act(() => result.current.setEmail("  J.DUPONT@EXAMPLE.COM  "));

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(mockedRequestPasswordReset).toHaveBeenCalledWith("j.dupont@example.com");
    expect(result.current.submitted).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("affiche l'erreur renvoyée par l'API", async () => {
    mockedRequestPasswordReset.mockRejectedValue(new Error("Utilisateur introuvable"));
    const { result } = renderHook(() => useForgotPassword());
    act(() => result.current.setEmail("j.dupont@example.com"));

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(result.current.submitted).toBe(false);
    expect(result.current.error).toBe("Utilisateur introuvable");
    expect(result.current.loading).toBe(false);
  });
});