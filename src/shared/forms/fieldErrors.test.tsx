import { describe, expect, it } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import { FieldError, hasFieldErrors, invalidFieldProps, isValidEmail, useFieldErrors } from "./fieldErrors";

describe("fieldErrors", () => {
  it("affiche le message sous le champ et rien quand le champ est valide", () => {
    const { rerender } = render(<FieldError message="Le nom est obligatoire" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Le nom est obligatoire");
    rerender(<FieldError />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("marque le champ invalide (aria-invalid + bordure rouge)", () => {
    expect(invalidFieldProps("Erreur", "h-9")).toEqual({
      "aria-invalid": true,
      className: expect.stringContaining("border-destructive"),
    });
    expect(invalidFieldProps(undefined, "h-9")).toEqual({ "aria-invalid": undefined, className: "h-9" });
  });

  it("valide le format d'un e-mail", () => {
    expect(isValidEmail("diop@example.com")).toBe(true);
    expect(isValidEmail("diop@example")).toBe(false);
    expect(isValidEmail("diop example.com")).toBe(false);
  });

  it("efface l'erreur d'un champ sans toucher aux autres", () => {
    const { result } = renderHook(() => useFieldErrors<"nom" | "email">());
    act(() => result.current.setErrors({ nom: "Obligatoire", email: "Invalide" }));
    act(() => result.current.clearError("nom"));
    expect(result.current.errors).toEqual({ email: "Invalide" });
    expect(hasFieldErrors(result.current.errors)).toBe(true);
    act(() => result.current.resetErrors());
    expect(hasFieldErrors(result.current.errors)).toBe(false);
  });
});
