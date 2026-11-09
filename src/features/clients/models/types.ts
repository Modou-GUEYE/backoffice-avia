export interface CustomerCreateSchema {
  phone: string;
  country: string;
  email?: string | null;
  clientType?: string | null;
}

/** Client renvoyé par GET /enrollment/applications/{enrollment_id}/details (EnrollmentDetailsCustomerSchema). */
export interface EnrollmentDetailsCustomerSchema extends CustomerCreateSchema {
  codeClient?: string | null;
}

export type SexEnum = "M" | "F";

export interface IdentityDataSchema {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex?: SexEnum | null;
  nationalId?: string | null;
  address?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  deliveryDate?: string | null;
  expiryDate?: string | null;
  ninea?: string | null;
  fiscalIdentity?: string | null;
  label?: string | null;
}

/** Exact contract of PATCH /enrollment/customers/{customer_id}/identity */
export interface PatchCustomerIdentitySchema {
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  deliveryDate?: string | null;
  expiryDate?: string | null;
  ninea?: string | null;
  fiscalIdentity?: string | null;
  label?: string | null;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
}

export interface DocumentRefSchema {
  type: string;
  uri: string;
}

export interface InstitutionSchema {
  id: string;
  label?: string;
  codeClient?: string;
}

export interface SIBKycDataSchema {
  phone?: string | null;
  country?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  sex?: SexEnum | null;
  nationalId?: string | null;
  address?: string | null;
  dateOfRegistration?: string | null;
  dateOfLastUpdate?: string | null;
  subscriptionStatus?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  ninea?: string | null;
  fiscalIdentity?: string | null;
  label?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
}

export interface EnrollmentApplicationSchema {
  id: string;
  institutionLabel: string;
  status: string;
  referenceLink?: string | null;
  enrollmentCode?: string | null;
  rejectionReason?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  customerId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  clientType?: string | null;
}

export interface CustomerEnrollmentDetailsResponseSchema {
  customerId: string;
  customer: EnrollmentDetailsCustomerSchema;
  identity: IdentityDataSchema;
  documents?: DocumentRefSchema[];
  sibKyc?: SIBKycDataSchema | null;
}

export interface EnrollmentApplicationCreateSchema {
  customer: CustomerCreateSchema;
  identity: IdentityDataSchema;
  documents?: DocumentRefSchema[];
  institutions?: InstitutionSchema[];
}

export interface EnrollmentApplicationResponseSchema {
  customerId: string;
  enrollments: EnrollmentApplicationSchema[];
  createdAt: string;
  updatedAt?: string | null;
}

export interface EnrollmentCodeValidationSchema {
  enrollmentCode: string;
}

export interface EnrollmentCodeGenerationResponseSchema {
  enrollmentCode: string;
}

/** Matches CustomerProfileResponseSchema from the Enrollment API contract. */
export interface CustomerProfileResponseSchema {
  customerId: string;
  status: string;
  kycLevel: string;
  verifiedAt?: string | null;
}

export interface CouplageAccountSchema {
  referenceIban?: string | null;
  accountNumber?: string | null;
  accountType?: string | null;
  accountLabel?: string | null;
  accountHolder?: string | null;
  currency?: string | null;
}
