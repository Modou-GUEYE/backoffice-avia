import { FieldErrors } from "@/shared/forms/fieldErrors";

export interface PasswordCriterion {
  /** Libellé affiché dans la liste des exigences de sécurité. */
  label: string;
  /** Formulation utilisée dans le message d'erreur quand le critère n'est pas respecté. */
  requirement: string;
  met: boolean;
}

/** Critères de robustesse du nouveau mot de passe (onglet Sécurité du profil). */
export const getPasswordCriteria = (password: string): PasswordCriterion[] => [
  { label: "Au moins 8 caractères", requirement: "au moins 8 caractères", met: password.length >= 8 },
  { label: "Une lettre majuscule (A-Z)", requirement: "une lettre majuscule", met: /[A-Z]/.test(password) },
  { label: "Un chiffre (0-9)", requirement: "un chiffre", met: /[0-9]/.test(password) },
  {
    label: "Un caractère spécial (@$!%*?&#+-:;.,_)",
    requirement: "un caractère spécial",
    met: /[^A-Za-z0-9]/.test(password),
  },
];

export type PasswordChangeField = "currentPassword" | "newPassword" | "confirmPassword";

export interface PasswordChangeFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/** Valide le formulaire de changement de mot de passe et renvoie toutes les erreurs, par champ. */
export const validatePasswordChangeForm = (values: PasswordChangeFormValues): FieldErrors<PasswordChangeField> => {
  const errors: FieldErrors<PasswordChangeField> = {};

  if (!values.currentPassword) errors.currentPassword = "Le mot de passe actuel est obligatoire";

  if (!values.newPassword) errors.newPassword = "Le nouveau mot de passe est obligatoire";
  else if (values.newPassword.length < 8) {
    errors.newPassword = "Le nouveau mot de passe doit contenir au moins 8 caractères";
  } else {
    const missing = getPasswordCriteria(values.newPassword).filter((criterion) => !criterion.met);
    if (missing.length > 0) {
      errors.newPassword = `Le nouveau mot de passe doit contenir ${missing.map((criterion) => criterion.requirement).join(", ")}`;
    }
  }

  if (!values.confirmPassword) errors.confirmPassword = "La confirmation du mot de passe est obligatoire";
  else if (values.newPassword !== values.confirmPassword) {
    errors.confirmPassword = "Les nouveaux mots de passe ne correspondent pas";
  }

  return errors;
};
