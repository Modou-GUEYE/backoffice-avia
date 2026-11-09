import { CustomerEnrollmentDetailsResponseSchema } from "../models/types";

export type IdentityUpdateFormValues = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  pieceType: string;
  pieceNumber: string;
  fiscalIdentity: string;
  phone: string;
  email: string;
  deliveryDate: string;
  expiryDate: string;
  ninea?: string;
  label?: string;
};

export type IdentityUpdateContext = {
  customerId: string;
  enrollmentId: string;
  savedPhone: string;
  savedEmail: string;
};

export const resolveIdentityUpdateContext = (
  enrollmentId: string | undefined,
  customerId: string | null,
  formValues: IdentityUpdateFormValues,
): IdentityUpdateContext => {
  if (!enrollmentId) {
    throw new Error("Enrôlement introuvable");
  }

  const normalizedCustomerId = customerId?.trim() ?? "";
  if (!normalizedCustomerId) {
    throw new Error("Impossible de mettre à jour les données saisies: identifiant client introuvable");
  }

  return {
    customerId: normalizedCustomerId,
    enrollmentId,
    savedPhone: formValues.phone,
    savedEmail: formValues.email,
  };
};

export const buildParticulierIdentityPayload = (formValues: IdentityUpdateFormValues) => {
  const normalizedPieceType = formValues.pieceType.trim();
  const normalizedPieceNumber = formValues.pieceNumber.trim();

  return {
    firstName: formValues.firstName || null,
    lastName: formValues.lastName || null,
    dateOfBirth: formValues.dateOfBirth || null,
    documentType: normalizedPieceType || null,
    documentNumber: normalizedPieceNumber || null,
    deliveryDate: formValues.deliveryDate || null,
    expiryDate: formValues.expiryDate || null,
  };
};

export const buildEntrepriseIdentityPayload = (formValues: IdentityUpdateFormValues) => {
  const normalizedNinea = formValues.pieceNumber.trim();

  return {
    firstName: formValues.firstName || null,
    lastName: "Entreprise",
    dateOfBirth: formValues.dateOfBirth || null,
    documentType: "NINEA",
    documentNumber: normalizedNinea || null,
    ninea: normalizedNinea || null,
    fiscalIdentity: formValues.fiscalIdentity || null,
    label: formValues.firstName || null,
  };
};

export const buildCommercantIdentityPayload = (formValues: IdentityUpdateFormValues) => {
  const normalizedPieceType = formValues.pieceType.trim();
  const normalizedPieceNumber = formValues.pieceNumber.trim();

  return {
    firstName: formValues.firstName || null,
    lastName: formValues.lastName || null,
    dateOfBirth: formValues.dateOfBirth || null,
    documentType: normalizedPieceType || null,
    documentNumber: normalizedPieceNumber || null,
    deliveryDate: formValues.deliveryDate || null,
    expiryDate: formValues.expiryDate || null,
    ninea: formValues.ninea || null,
    fiscalIdentity: formValues.fiscalIdentity || null,
    label: formValues.label || null,
  };
};

export const hasExpectedIdentityNames = (
  details: CustomerEnrollmentDetailsResponseSchema,
  formValues: IdentityUpdateFormValues,
): boolean => {
  const firstNameUpdated =
    (details.identity.firstName ?? "").trim() === (formValues.firstName ?? "").trim();
  const lastNameUpdated =
    (details.identity.lastName ?? "").trim() === (formValues.lastName ?? "").trim();

  return firstNameUpdated && lastNameUpdated;
};
