import {
  CustomerEnrollmentDetailsResponseSchema,
} from "../models/types";
import { IdentityUpdateFormValues } from "./identityUpdateHelpers";

export type EnrollmentListMeta = {
  type: string | null;
  nameLabel: string;
};

export type ValidationFormState = IdentityUpdateFormValues;

export const buildEnrollmentMetaFromDetails = (
  details: CustomerEnrollmentDetailsResponseSchema,
): EnrollmentListMeta => {
  const firstName = details.identity.firstName?.trim() ?? "";
  const lastName = details.identity.lastName?.trim() ?? "";
  const firstDocumentType = details.documents?.[0]?.type?.trim().toUpperCase() ?? "";
  const clientType = details.customer.clientType?.trim().toUpperCase();

  const isEntreprise =
    lastName.toLowerCase() === "entreprise"
    || firstDocumentType === "NINEA";

  const type = clientType === "COMMERCANT"
    ? "COMMERCANT"
    : (isEntreprise ? "ENTREPRISE" : "PARTICULIER");

  const nameLabel = clientType === "COMMERCANT"
    ? (details.identity.label?.trim() || [firstName, lastName].filter((value) => value.length > 0).join(" ") || "-")
    : isEntreprise
      ? (firstName || "-")
      : [firstName, lastName].filter((value) => value.length > 0).join(" ") || "-";

  return { type, nameLabel };
};

export const toValidationForm = (
  details: CustomerEnrollmentDetailsResponseSchema,
  overrides?: { phone?: string; email?: string },
): ValidationFormState => {
  const firstDocument = details.documents?.[0];
  const inferredPieceNumber =
    details.identity.documentNumber?.trim() || details.identity.nationalId?.trim() || "";

  return {
    firstName: details.identity.firstName ?? "",
    lastName: details.identity.lastName ?? "",
    dateOfBirth: details.identity.dateOfBirth ?? "",
    pieceType: details.identity.documentType ?? firstDocument?.type ?? "",
    pieceNumber: inferredPieceNumber,
    fiscalIdentity: details.identity.fiscalIdentity ?? details.identity.nationalId ?? "",
    phone: overrides?.phone ?? details.customer.phone ?? "",
    email: overrides?.email ?? details.customer.email ?? "",
    deliveryDate: details.identity.deliveryDate ?? "",
    expiryDate: details.identity.expiryDate ?? "",
    ninea: details.identity.ninea ?? "",
    label: details.identity.label ?? "",
  };
};
