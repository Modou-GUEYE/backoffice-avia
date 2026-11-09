import { FieldErrors } from "@/shared/forms/fieldErrors";
import { validateAgainstSchema } from "../models/schemaValidation";

/** Message affiché sous une zone JSON dont le contenu ne peut pas être analysé. */
export const INVALID_JSON_MESSAGE = "Format JSON invalide";

/** Vrai si la valeur est renseignée mais n'est pas un JSON valide (une zone vide reste valide). */
export const isInvalidJson = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    JSON.parse(trimmed);
    return false;
  } catch {
    return true;
  }
};

/** Premier champ en erreur, dans l'ordre où les erreurs ont été produites (ordre d'affichage du formulaire). */
export const firstErrorKey = <K extends string>(errors: FieldErrors<K>): K | undefined =>
  (Object.keys(errors) as K[]).find((key) => Boolean(errors[key]));

/**
 * Erreur de la saisie JSON au regard d'un schéma du type de champ ; `undefined` si la saisie est vide,
 * n'est pas du JSON (déjà signalé par `isInvalidJson`) ou est conforme.
 */
export const schemaErrorMessage = (value: string, schema: Record<string, unknown> | null | undefined): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed || isInvalidJson(trimmed)) return undefined;
  const [first] = validateAgainstSchema(JSON.parse(trimmed), schema);
  return first;
};
