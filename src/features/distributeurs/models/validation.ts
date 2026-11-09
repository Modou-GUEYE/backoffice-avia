import { FieldErrors, isValidEmail } from "@/shared/forms/fieldErrors";
import type { AgenceForm } from "@/features/agences/models/types";
import type { CaisseForm } from "@/features/caisses/models/types";
import { validateCaisseForm, type CaisseFormField } from "@/features/caisses/viewmodels/useCaisses";
import type { DistributeurForm, DistributeurUserForm } from "./types";

export type DistributeurFormField = "nom" | "structureId";

export type DistributeurUserFormField = "prenom" | "nom" | "username" | "email" | "profil";

/** Valide le formulaire distributeur et renvoie toutes les erreurs, par champ. */
export const validateDistributeurForm = (
  form: DistributeurForm,
  options: { requireStructure?: boolean } = {},
): FieldErrors<DistributeurFormField> => {
  const { requireStructure = true } = options;
  const errors: FieldErrors<DistributeurFormField> = {};

  if (!form.nom.trim()) errors.nom = "Le nom du distributeur est obligatoire";
  if (requireStructure && !form.structureId.trim()) {
    errors.structureId = "La structure de rattachement est obligatoire";
  }

  return errors;
};

/** Valide le formulaire d'un utilisateur de distributeur et renvoie toutes les erreurs, par champ. */
export const validateDistributeurUserForm = (
  form: Pick<DistributeurUserForm, "prenom" | "nom" | "username" | "email" | "profil">,
): FieldErrors<DistributeurUserFormField> => {
  const errors: FieldErrors<DistributeurUserFormField> = {};

  if (!form.prenom.trim()) errors.prenom = "Le prénom est obligatoire";
  if (!form.nom.trim()) errors.nom = "Le nom est obligatoire";
  if (!form.username.trim()) errors.username = "Le login est obligatoire";
  if (!form.email.trim()) errors.email = "L'e-mail est obligatoire";
  else if (!isValidEmail(form.email)) errors.email = "L'adresse e-mail n'est pas valide";
  if (!form.profil.trim()) errors.profil = "Le profil est obligatoire";

  return errors;
};

export type DistributeurAgenceFormField = "name" | "code";

/**
 * Valide l'agence saisie depuis la fiche distributeur : mêmes règles que la page Agences
 * (le rattachement au distributeur est imposé par la fiche, il n'est donc pas saisi).
 */
export const validateDistributeurAgenceForm = (
  form: Pick<AgenceForm, "name" | "code">,
): FieldErrors<DistributeurAgenceFormField> => {
  const errors: FieldErrors<DistributeurAgenceFormField> = {};
  if (!(form.name || "").trim()) errors.name = "Le nom de l'agence est obligatoire";
  if (!(form.code || "").trim()) errors.code = "Le code de l'agence est obligatoire";
  return errors;
};

/** Valide la caisse saisie depuis la fiche distributeur : mêmes règles que la page Caisses. */
export const validateDistributeurCaisseForm = (form: CaisseForm): FieldErrors<CaisseFormField> =>
  validateCaisseForm(form);
