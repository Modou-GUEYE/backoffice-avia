import { describe, expect, it } from "vitest";
import { validateLoginCredentials } from "./useAuth";
import { validateForgotPasswordForm } from "./useForgotPassword";
import { validateSetPasswordForm } from "./useSetPassword";
import { getPasswordCriteria, validatePasswordChangeForm } from "./passwordChangeValidation";

describe("validateLoginCredentials", () => {
  it("signale les deux champs vides en même temps", () => {
    expect(validateLoginCredentials("  ", "")).toEqual({
      identifier: "L'identifiant est obligatoire.",
      password: "Le mot de passe est obligatoire.",
    });
  });

  it("signale un identifiant au format invalide et un mot de passe trop court", () => {
    expect(validateLoginCredentials("jean dupont", "12345")).toEqual({
      identifier: "Le nom d'utilisateur ne doit contenir que des lettres, chiffres, tirets ou points.",
      password: "Le mot de passe doit comporter au moins 6 caractères.",
    });
  });

  it("refuse un identifiant de moins de 3 caractères", () => {
    expect(validateLoginCredentials("ab", "secret1").identifier).toBeDefined();
  });

  it("accepte des identifiants valides (espaces autour ignorés)", () => {
    expect(validateLoginCredentials("  J.Dupont-01 ", " secret ")).toEqual({});
  });
});

describe("validateForgotPasswordForm", () => {
  it("exige l'adresse e-mail", () => {
    expect(validateForgotPasswordForm("   ")).toEqual({ email: "Veuillez renseigner votre adresse e-mail." });
  });

  it("refuse une adresse e-mail mal formée", () => {
    expect(validateForgotPasswordForm("jean@domaine")).toEqual({ email: "Veuillez saisir une adresse e-mail valide." });
  });

  it("accepte une adresse e-mail valide", () => {
    expect(validateForgotPasswordForm(" Jean@Domaine.com ")).toEqual({});
  });
});

describe("validateSetPasswordForm", () => {
  it("signale tous les champs vides en même temps", () => {
    expect(validateSetPasswordForm({ username: "", resetToken: " ", newPassword: "", confirmPassword: "" })).toEqual({
      username: "Le username est obligatoire.",
      resetToken: "Le mot de passe temporaire est obligatoire.",
      newPassword: "Le nouveau mot de passe est obligatoire.",
      confirmPassword: "La confirmation du mot de passe est obligatoire.",
    });
  });

  it("signale un mot de passe trop court et une confirmation différente", () => {
    expect(
      validateSetPasswordForm({ username: "jdupont", resetToken: "tmp", newPassword: "short", confirmPassword: "other" }),
    ).toEqual({
      newPassword: "Le nouveau mot de passe doit contenir au moins 8 caracteres.",
      confirmPassword: "La confirmation du mot de passe ne correspond pas.",
    });
  });

  it("accepte un formulaire valide", () => {
    expect(
      validateSetPasswordForm({ username: "jdupont", resetToken: "tmp", newPassword: "longenough", confirmPassword: "longenough" }),
    ).toEqual({});
  });
});

describe("validatePasswordChangeForm", () => {
  it("signale tous les champs vides en même temps", () => {
    expect(validatePasswordChangeForm({ currentPassword: "", newPassword: "", confirmPassword: "" })).toEqual({
      currentPassword: "Le mot de passe actuel est obligatoire",
      newPassword: "Le nouveau mot de passe est obligatoire",
      confirmPassword: "La confirmation du mot de passe est obligatoire",
    });
  });

  it("signale un nouveau mot de passe trop court", () => {
    expect(validatePasswordChangeForm({ currentPassword: "old", newPassword: "Ab1!", confirmPassword: "Ab1!" })).toEqual({
      newPassword: "Le nouveau mot de passe doit contenir au moins 8 caractères",
    });
  });

  it("liste les critères de complexité manquants", () => {
    expect(
      validatePasswordChangeForm({ currentPassword: "old", newPassword: "abcdefgh", confirmPassword: "abcdefgh" }).newPassword,
    ).toBe("Le nouveau mot de passe doit contenir une lettre majuscule, un chiffre, un caractère spécial");
  });

  it("signale une confirmation différente", () => {
    expect(
      validatePasswordChangeForm({ currentPassword: "old", newPassword: "Abcdef1!", confirmPassword: "Abcdef1?" }),
    ).toEqual({ confirmPassword: "Les nouveaux mots de passe ne correspondent pas" });
  });

  it("accepte un formulaire valide", () => {
    expect(
      validatePasswordChangeForm({ currentPassword: "old", newPassword: "Abcdef1!", confirmPassword: "Abcdef1!" }),
    ).toEqual({});
  });

  it("évalue chaque critère de robustesse", () => {
    expect(getPasswordCriteria("Abcdef1!").every((criterion) => criterion.met)).toBe(true);
    expect(getPasswordCriteria("abc").map((criterion) => criterion.met)).toEqual([false, false, false, false]);
  });
});
