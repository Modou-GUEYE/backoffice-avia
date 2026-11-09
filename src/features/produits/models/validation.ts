import { FieldErrors, isValidEmail } from "@/shared/forms/fieldErrors";
import { isProfileRole } from "@/features/utilisateurs/models/profileLabels";
import { ProduitForm, ProduitUserDraft } from "./types";

export const ALPHA_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/;
export const LOGIN_PATTERN = /^[A-Za-z0-9._-]+$/;
export const NUMERIC_PATTERN = /^\d+(\.\d+)?$/;
export const SENDER_LABEL_MAX_LENGTH = 10;

export type ProduitFormField = "nom" | "libelleExpediteur";

/** Champs du formulaire produit affichés dans l'onglet « Général ». */

/** Valide le formulaire produit et renvoie toutes les erreurs, par champ. */
export const validateProduitForm = (
  form: Pick<ProduitForm, "nom" | "libelleExpediteur">,
  options: { isDuplicate?: boolean } = {},
): FieldErrors<ProduitFormField> => {
  const errors: FieldErrors<ProduitFormField> = {};

  const nom = form.nom.trim();
  if (!nom) errors.nom = "Le libellé du produit est obligatoire";
  else if (!ALPHA_PATTERN.test(nom)) errors.nom = "Le libellé du produit doit être alphabétique";
  else if (options.isDuplicate) errors.nom = "Le produit existe déjà !";

  const expediteur = form.libelleExpediteur.trim();
  if (!expediteur) errors.libelleExpediteur = "Le libellé expéditeur (SMS) est obligatoire";
  else if (!ALPHA_PATTERN.test(expediteur)) errors.libelleExpediteur = "Le libellé expéditeur doit être alphabétique";
  else if (expediteur.length > SENDER_LABEL_MAX_LENGTH) {
    errors.libelleExpediteur = `Le libellé expéditeur ne doit pas dépasser ${SENDER_LABEL_MAX_LENGTH} caractères`;
  }

  return errors;
};

export type ProduitUserDraftField = keyof ProduitUserDraft;

/**
 * Valide l'utilisateur saisi dans le formulaire produit et renvoie toutes les erreurs, par champ.
 * En mode « update » (modification d'un utilisateur déjà ajouté), seuls les champs obligatoires sont contrôlés.
 */
export const validateProduitUserDraft = (
  draft: ProduitUserDraft,
  mode: "create" | "update" = "create",
): FieldErrors<ProduitUserDraftField> => {
  const errors: FieldErrors<ProduitUserDraftField> = {};
  const prenom = draft.prenom.trim();
  const nom = draft.nom.trim();
  const username = draft.username.trim();
  const email = draft.email.trim();
  const role = draft.role.trim();
  const checkFormat = mode === "create";

  if (!prenom) errors.prenom = "Le prénom est obligatoire";
  else if (checkFormat && !ALPHA_PATTERN.test(prenom)) errors.prenom = "Le prénom doit être alphabétique";

  if (!nom) errors.nom = "Le nom est obligatoire";
  else if (checkFormat && !ALPHA_PATTERN.test(nom)) errors.nom = "Le nom doit être alphabétique";

  // Le login est généré à partir du prénom et du nom : inutile de le signaler tant que ceux-ci sont en erreur
  if (!errors.prenom && !errors.nom) {
    if (!username) errors.username = "Le login est obligatoire";
    else if (checkFormat && !LOGIN_PATTERN.test(username)) {
      errors.username = "Le login ne doit contenir que des lettres, chiffres, points, tirets ou underscores";
    }
  }

  if (!email) errors.email = "L'e-mail est obligatoire";
  else if (checkFormat && !isValidEmail(email.toLowerCase())) errors.email = "L'adresse e-mail n'est pas valide";

  if (!role) errors.role = "Le profil est obligatoire";
  else if (checkFormat && !isProfileRole(role)) errors.role = "Le profil sélectionné est invalide";

  return errors;
};

/** Formulaire du dialogue utilisateur de la fiche produit. */
export type ProduitDetailUserFormValues = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  profile: string;
};

export type ProduitDetailUserFormField = keyof ProduitDetailUserFormValues;

/** Valide le dialogue utilisateur de la fiche produit et renvoie toutes les erreurs, par champ. */
export const validateProduitDetailUserForm = (
  form: ProduitDetailUserFormValues,
): FieldErrors<ProduitDetailUserFormField> => {
  const errors: FieldErrors<ProduitDetailUserFormField> = {};
  if (!form.firstName.trim()) errors.firstName = "Le prénom est obligatoire";
  if (!form.lastName.trim()) errors.lastName = "Le nom est obligatoire";
  if (!form.username.trim()) errors.username = "Le nom d'utilisateur est obligatoire";
  if (!form.email.trim()) errors.email = "L'e-mail est obligatoire";
  if (!form.profile.trim()) errors.profile = "Le profil est obligatoire";
  return errors;
};
