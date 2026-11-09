import { FieldErrors } from "@/shared/forms/fieldErrors";
import { PackageForm, ServiceForm } from "../models/types";

export type PackageFormField = "label" | "code" | "client_types" | "services" | "payment_methods";

/** Valide le formulaire de package (création, modification, duplication) et renvoie toutes les erreurs, par champ. */
export const validatePackageForm = (form: PackageForm): FieldErrors<PackageFormField> => {
  const errors: FieldErrors<PackageFormField> = {};
  if (!form.label.trim()) errors.label = "Le libellé du package est obligatoire";
  if (!form.code.trim()) errors.code = "Le code du package est obligatoire";
  if (!form.client_types || form.client_types.length === 0) {
    errors.client_types = "Sélectionnez au moins un type de client";
  }
  if (!form.services || form.services.length === 0) {
    errors.services = "Sélectionnez au moins un service";
  }
  if (!form.payment_methods || form.payment_methods.length === 0) {
    errors.payment_methods = "Sélectionnez au moins un moyen de paiement";
  }
  return errors;
};

export type ServiceFormField = "contract";

/**
 * Valide le formulaire de contrat de service : une définition (YAML/JSON) ou un fichier est requis.
 * En modification, un nouveau fichier ou une nouvelle définition est obligatoire.
 */
export const validateServiceForm = (
  form: ServiceForm,
  isEditing: boolean,
): FieldErrors<ServiceFormField> => {
  const errors: FieldErrors<ServiceFormField> = {};
  const hasDefinition = Boolean(form.contractFile) || Boolean(form.rawContractYaml?.trim());
  if (!hasDefinition && (!form.code || !form.label)) {
    errors.contract = "Veuillez renseigner la définition YAML/JSON ou sélectionner un fichier de contrat";
  } else if (!hasDefinition && isEditing) {
    errors.contract = "Veuillez sélectionner un fichier ou renseigner la nouvelle définition";
  }
  return errors;
};

export type ServiceVersionFormField = "version";

/** Valide le formulaire de création d'une version de service. */
export const validateServiceVersionForm = (data: {
  version: string;
}): FieldErrors<ServiceVersionFormField> => {
  const errors: FieldErrors<ServiceVersionFormField> = {};
  if (!data.version.trim()) errors.version = "Le numéro de version est requis";
  return errors;
};

export type ServicePaymentFlowFormField = "source" | "destination";

/** Valide le flux de paiement d'un service : au moins une source et une destination. */
export const validateServicePaymentFlowForm = (
  sourceIds: string[],
  destinationIds: string[],
): FieldErrors<ServicePaymentFlowFormField> => {
  const errors: FieldErrors<ServicePaymentFlowFormField> = {};
  if (sourceIds.length === 0) {
    errors.source = "Veuillez sélectionner au moins un moyen de paiement source (débit).";
  }
  if (destinationIds.length === 0) {
    errors.destination = "Veuillez sélectionner au moins un moyen de paiement destinataire (crédit).";
  }
  return errors;
};
