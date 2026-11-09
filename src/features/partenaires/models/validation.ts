import { FieldErrors, isValidEmail } from "@/shared/forms/fieldErrors";
import type { PartenaireForm, PartenaireUserForm } from "./types";

export type PartenaireFormField =
  | "nom"
  | "prenom"
  | "categorie"
  | "email"
  | "typePiece"
  | "dateNaissance"
  | "dateDelivrance"
  | "dateExpiration"
  | "libelle"
  | "numeroIdentiteFiscale"
  | "ninea";

export type PartenaireUserFormField = "prenom" | "nom" | "username" | "email" | "profil";

/** Champs du dialogue utilisateur de la fiche partenaire (noms de champs en anglais). */
export type PartenaireDetailUserFormField = "firstName" | "lastName" | "username" | "email" | "profile";

const validateEmail = (email: string): string | undefined => {
  if (!email.trim()) return "L'e-mail est obligatoire";
  if (!isValidEmail(email)) return "L'adresse e-mail n'est pas valide";
  return undefined;
};

/** Valide le formulaire partenaire (particulier ou entreprise) et renvoie toutes les erreurs, par champ. */
export const validatePartenaireForm = (form: PartenaireForm): FieldErrors<PartenaireFormField> => {
  const errors: FieldErrors<PartenaireFormField> = {};

  if (form.type === "particulier") {
    if (!form.nom.trim()) errors.nom = "Le nom est obligatoire";
    if (!form.prenom.trim()) errors.prenom = "Le prénom est obligatoire";
  } else {
    if (!form.libelle.trim()) errors.libelle = "Le libellé de l'entreprise est obligatoire";
    if (!form.numeroIdentiteFiscale.trim()) {
      errors.numeroIdentiteFiscale = "Le numéro d'identité fiscale est obligatoire";
    }
  }

  if (!form.categorie) errors.categorie = "La catégorie est obligatoire";

  const emailError = validateEmail(form.email);
  if (emailError) errors.email = emailError;

  if (form.type === "particulier") {
    if (!form.typePiece) errors.typePiece = "Le type de pièce est obligatoire";
    if (!form.dateNaissance) errors.dateNaissance = "La date de naissance est obligatoire";
    if (!form.dateDelivrance) errors.dateDelivrance = "La date de délivrance est obligatoire";
    if (!form.dateExpiration) errors.dateExpiration = "La date d'expiration est obligatoire";
  } else if (!form.ninea.trim()) {
    errors.ninea = "Le NINEA est obligatoire";
  }

  return errors;
};

/** Valide le formulaire d'un utilisateur de partenaire et renvoie toutes les erreurs, par champ. */
export const validatePartenaireUserForm = (
  form: Pick<PartenaireUserForm, "prenom" | "nom" | "username" | "email" | "profil">,
): FieldErrors<PartenaireUserFormField> => {
  const errors: FieldErrors<PartenaireUserFormField> = {};

  if (!form.prenom.trim()) errors.prenom = "Le prénom est obligatoire";
  if (!form.nom.trim()) errors.nom = "Le nom est obligatoire";
  if (!form.username.trim()) errors.username = "Le login est obligatoire";
  const emailError = validateEmail(form.email);
  if (emailError) errors.email = emailError;
  if (!form.profil.trim()) errors.profil = "Le profil est obligatoire";

  return errors;
};

/** Valide le dialogue utilisateur de la fiche partenaire et renvoie toutes les erreurs, par champ. */
export const validatePartenaireDetailUserForm = (form: {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  profile: string;
}): FieldErrors<PartenaireDetailUserFormField> => {
  const errors = validatePartenaireUserForm({
    prenom: form.firstName,
    nom: form.lastName,
    username: form.username,
    email: form.email,
    profil: form.profile,
  });

  const detailErrors: FieldErrors<PartenaireDetailUserFormField> = {
    firstName: errors.prenom,
    lastName: errors.nom,
    username: errors.username ? "Le nom d'utilisateur est obligatoire" : undefined,
    email: errors.email,
    profile: errors.profil,
  };

  return Object.fromEntries(
    Object.entries(detailErrors).filter(([, message]) => Boolean(message)),
  ) as FieldErrors<PartenaireDetailUserFormField>;
};
