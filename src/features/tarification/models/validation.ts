import { FieldErrors } from "@/shared/forms/fieldErrors";
import { CapCreateForm, CommissionForm, FeeForm, PromoForm, TaxForm } from "./types";

/**
 * Validation des formulaires de tarification : chaque fonction renvoie toutes les erreurs
 * à la fois, sous forme { champ → message } affiché sous le champ concerné.
 */

const isBlank = (value: string | null | undefined): boolean => !value || !value.trim();

/** Nombre saisi : vide → `emptyValue`, sinon parseFloat (NaN si invalide). */
const parseAmount = (value: string, emptyValue: number): number =>
  value.trim() === "" ? emptyValue : Number.parseFloat(value);

const TENANT_REQUIRED_MESSAGE = "L'entité cible est obligatoire pour ce niveau.";
const SERVICE_REQUIRED_MESSAGE = "Le type de service est obligatoire.";

// ===== COMMISSIONS =====

export type CommissionFormField =
  | "tenantLevel"
  | "tenantId"
  | "serviceType"
  | "phase"
  | "rateStructure"
  | "rateTcaStructure"
  | "rateDistributeur"
  | "rateGroupement"
  | "ratePartenaireTechnique"
  | "totalRate";

/** Somme des quatre taux devant faire 100 % (Structure + TCA + Groupement + Partenaire Technique). */
export const computeCommissionTotalRate = (form: CommissionForm): number => {
  const s = parseFloat(form.rateStructure) || 0;
  const tca = parseFloat(form.rateTcaStructure) || 0;
  const g = parseFloat(form.rateGroupement) || 0;
  const p = parseFloat(form.ratePartenaireTechnique) || 0;
  return Math.round((s + tca + g + p) * 100) / 100;
};

const COMMISSION_RATE_FIELDS = [
  "rateStructure",
  "rateTcaStructure",
  "rateDistributeur",
  "rateGroupement",
  "ratePartenaireTechnique",
] as const;

export const validateCommissionForm = (form: CommissionForm): FieldErrors<CommissionFormField> => {
  const errors: FieldErrors<CommissionFormField> = {};

  if (isBlank(form.tenantLevel)) errors.tenantLevel = "Le niveau d'application est obligatoire.";
  if (isBlank(form.serviceType)) errors.serviceType = SERVICE_REQUIRED_MESSAGE;
  if (isBlank(form.phase)) errors.phase = "La phase est obligatoire.";
  if (form.tenantLevel && form.tenantLevel !== "GLOBAL" && !form.tenantId) {
    errors.tenantId = "Veuillez sélectionner l'entité cible pour ce niveau.";
  }

  for (const field of COMMISSION_RATE_FIELDS) {
    const raw = form[field];
    if (isBlank(raw)) {
      errors[field] = "Le taux est obligatoire.";
    } else if (Number.isNaN(parseFloat(raw))) {
      errors[field] = "Le taux doit être une valeur numérique valide.";
    }
  }

  const totalRate = computeCommissionTotalRate(form);
  if (totalRate !== 100) {
    errors.totalRate = `La somme des quatre taux (Structure + TCA Structure + Groupement + Partenaire Technique) doit faire 100% (actuellement: ${totalRate}%).`;
  }

  return errors;
};

// ===== FRAIS =====

export type FeeFormField = "tenantId" | "serviceType" | "minBound" | "maxBound" | "fixedFee" | "rateFee";

/**
 * @param hasResolvedTenant l'entité cible effectivement résolue (sélection ou valeur par défaut) existe.
 */
export const validateFeeForm = (
  form: FeeForm,
  hasResolvedTenant: boolean
): FieldErrors<FeeFormField> => {
  const errors: FieldErrors<FeeFormField> = {};

  if (isBlank(form.serviceType)) errors.serviceType = SERVICE_REQUIRED_MESSAGE;
  if (form.tenantLevel !== "GLOBAL" && !hasResolvedTenant) {
    errors.tenantId = "Veuillez sélectionner l'entité cible (Structure, Produit, Distributeur ou Agence).";
  }

  const minBound = parseAmount(form.minBound, 0);
  const maxBound = Number.parseFloat(form.maxBound);
  const fixedFee = parseAmount(form.fixedFee, 0);
  const rateFee = parseAmount(form.rateFee, 0);

  if (isBlank(form.maxBound)) {
    errors.maxBound = "La borne maximale est obligatoire.";
  } else if (Number.isNaN(maxBound)) {
    errors.maxBound = "La borne maximale doit être un nombre valide.";
  } else if (maxBound <= 0) {
    errors.maxBound = "La borne maximale doit être une valeur strictement positive.";
  }

  if (Number.isNaN(minBound)) errors.minBound = "La borne minimale doit être un nombre valide.";
  else if (minBound < 0) errors.minBound = "La borne minimale doit être une valeur positive.";

  if (Number.isNaN(fixedFee)) errors.fixedFee = "Le frais fixe doit être un nombre valide.";
  else if (fixedFee < 0) errors.fixedFee = "Le frais fixe doit être une valeur positive.";

  if (Number.isNaN(rateFee)) errors.rateFee = "Le frais variable doit être un nombre valide.";
  else if (rateFee < 0) errors.rateFee = "Le frais variable doit être une valeur positive.";

  if (!errors.minBound && !errors.maxBound && minBound >= maxBound) {
    errors.maxBound = "La borne maximale doit être strictement supérieure à la borne minimale.";
  }

  return errors;
};

// ===== TAXES =====

export type TaxFormField = "tenantId" | "serviceType" | "clientType" | "taxType" | "taxRate" | "taxAmount";

export const validateTaxForm = (form: TaxForm): FieldErrors<TaxFormField> => {
  const errors: FieldErrors<TaxFormField> = {};

  if (isBlank(form.serviceType)) errors.serviceType = SERVICE_REQUIRED_MESSAGE;
  if (form.tenantLevel !== "GLOBAL" && !form.tenantId) errors.tenantId = TENANT_REQUIRED_MESSAGE;
  if (isBlank(form.clientType)) errors.clientType = "Le type de client est obligatoire.";
  if (isBlank(form.taxType)) errors.taxType = "Le type de taxe est obligatoire.";

  const rate = parseAmount(form.taxRate, 0);
  if (Number.isNaN(rate)) errors.taxRate = "Le taux doit être une valeur numérique valide.";
  else if (rate < 0) errors.taxRate = "Le taux doit être une valeur positive ou nulle.";
  else if (rate > 100) errors.taxRate = "Le taux de taxe ne peut pas dépasser 100%.";

  const amount = parseAmount(form.taxAmount, 0);
  if (Number.isNaN(amount)) errors.taxAmount = "Le montant doit être une valeur numérique valide.";
  else if (amount < 0) errors.taxAmount = "Le montant doit être une valeur positive ou nulle.";

  return errors;
};

// ===== PROMOTIONS =====

export type PromoFormField =
  | "code"
  | "serviceType"
  | "tenantId"
  | "startDate"
  | "endDate"
  | "fixedAmount"
  | "rateAmount"
  /** Règle croisée : au moins une remise (fixe ou taux) doit être renseignée. */
  | "discount";

export const validatePromoForm = (form: PromoForm, isEditing: boolean): FieldErrors<PromoFormField> => {
  const errors: FieldErrors<PromoFormField> = {};

  if (isBlank(form.code)) errors.code = "Le code promotionnel est obligatoire.";

  // Service et entité ne sont saisis qu'à la création (champs verrouillés en modification).
  if (!isEditing) {
    if (isBlank(form.serviceType)) errors.serviceType = SERVICE_REQUIRED_MESSAGE;
    if (form.tenantLevel !== "GLOBAL" && !form.tenantId) errors.tenantId = TENANT_REQUIRED_MESSAGE;
  }

  if (!form.startDate) errors.startDate = "La date de début est obligatoire.";
  if (!form.endDate) errors.endDate = "La date de fin est obligatoire.";
  if (form.startDate && form.endDate && new Date(form.startDate) > new Date(form.endDate)) {
    errors.endDate = "La date de fin doit être postérieure ou égale à la date de début.";
  }

  const fixedAmount = form.fixedAmount ? parseFloat(form.fixedAmount) : 0;
  const rateAmount = form.rateAmount ? parseFloat(form.rateAmount) : 0;
  if (Number.isNaN(fixedAmount) || fixedAmount < 0) {
    errors.fixedAmount = "La remise fixe doit être un nombre positif ou nul.";
  }
  if (Number.isNaN(rateAmount) || rateAmount < 0) {
    errors.rateAmount = "Le taux de réduction doit être un nombre positif ou nul.";
  }
  if (!errors.fixedAmount && !errors.rateAmount && fixedAmount <= 0 && rateAmount <= 0) {
    errors.discount = "Veuillez renseigner au moins une remise fixe (FCFA) ou un taux de réduction (%).";
  }

  return errors;
};

// ===== PLAFONDS =====

export type CapFormField =
  | "service_type"
  | "tenant_id"
  | "min_per_transaction"
  | "max_per_transaction"
  | "daily_cumulative"
  | "monthly_cumulative";

const numOrNull = (value: string): number | null => {
  const n = parseFloat(value);
  return Number.isNaN(n) ? null : n;
};

type CapLimits = Pick<
  CapCreateForm,
  "min_per_transaction" | "max_per_transaction" | "daily_cumulative" | "monthly_cumulative"
>;

/** Cohérence des plafonds (vide = illimité) : min ≤ max ≤ cumul journalier ≤ cumul mensuel. */
export const validateCapLimits = (form: CapLimits): FieldErrors<CapFormField> => {
  const errors: FieldErrors<CapFormField> = {};
  const min = numOrNull(form.min_per_transaction);
  const max = numOrNull(form.max_per_transaction);
  const daily = numOrNull(form.daily_cumulative);
  const monthly = numOrNull(form.monthly_cumulative);

  if (max !== null && min !== null && max < min) {
    errors.max_per_transaction = "Le montant max doit être supérieur ou égal au montant min.";
  }
  if (daily !== null && ((max !== null && daily < max) || (min !== null && daily < min))) {
    errors.daily_cumulative = "Le cumul journalier doit être supérieur ou égal au montant max et au montant min.";
  }
  if (
    monthly !== null &&
    ((daily !== null && monthly < daily) || (max !== null && monthly < max) || (min !== null && monthly < min))
  ) {
    errors.monthly_cumulative =
      "Le cumul mensuel doit être supérieur ou égal au cumul journalier, au montant max et au montant min.";
  }
  return errors;
};

export const validateCapForm = (form: CapCreateForm): FieldErrors<CapFormField> => {
  const errors: FieldErrors<CapFormField> = {};
  if (isBlank(form.service_type)) errors.service_type = SERVICE_REQUIRED_MESSAGE;
  if (form.tenant_level !== "GLOBAL" && isBlank(form.tenant_id)) errors.tenant_id = TENANT_REQUIRED_MESSAGE;
  return { ...errors, ...validateCapLimits(form) };
};

// ===== DÉROGATION / CONSOMMATION PLAFOND CLIENT =====

export type ClientCapOverrideField = "clientId" | "structureId" | "newLimit" | "comment";

export const validateClientCapOverride = (values: {
  clientId: string;
  structureId: string;
  newLimit: string;
  comment: string;
}): FieldErrors<ClientCapOverrideField> => {
  const errors: FieldErrors<ClientCapOverrideField> = {};
  if (isBlank(values.clientId)) errors.clientId = "L'identifiant du client est obligatoire.";
  if (!values.structureId) errors.structureId = "Veuillez sélectionner une structure concernée.";
  const limit = parseFloat(values.newLimit);
  if (isBlank(values.newLimit)) {
    errors.newLimit = "Le nouveau plafond est obligatoire.";
  } else if (Number.isNaN(limit) || limit <= 0) {
    errors.newLimit = "Veuillez renseigner une limite de plafond valide et positive (FCFA).";
  }
  if (isBlank(values.comment)) errors.comment = "Le motif de la dérogation est obligatoire.";
  return errors;
};

export type ClientCapUsageField = "clientId" | "structureId";

export const validateClientCapUsageLookup = (values: {
  clientId: string;
  structureId: string;
}): FieldErrors<ClientCapUsageField> => {
  const errors: FieldErrors<ClientCapUsageField> = {};
  if (isBlank(values.clientId)) errors.clientId = "Veuillez saisir l'identifiant du client.";
  if (!values.structureId) errors.structureId = "Veuillez sélectionner une structure.";
  return errors;
};
