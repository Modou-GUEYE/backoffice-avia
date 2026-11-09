export const ENROLLMENT_STATUSES = {
  PENDING: "PENDING",
  UNSUB_PENDING: "UNSUB_PENDING",
  VALIDATED: "VALIDATED",
  APPROVED: "APPROVED",
  BLOCKED: "BLOCKED",
  DEACTIVATED: "DEACTIVATED",
  UNSUBSCRIBED: "UNSUBSCRIBED",
  REJECTED: "REJECTED",
} as const;

export type EnrollmentStatusCode = typeof ENROLLMENT_STATUSES[keyof typeof ENROLLMENT_STATUSES];

const {
  PENDING,
  UNSUB_PENDING,
  VALIDATED,
  APPROVED,
  BLOCKED,
  DEACTIVATED,
  UNSUBSCRIBED,
  REJECTED,
} = ENROLLMENT_STATUSES;

export const FILTERABLE_ENROLLMENT_STATUSES: EnrollmentStatusCode[] = [
  PENDING,
  VALIDATED,
  UNSUB_PENDING,
  UNSUBSCRIBED,
  BLOCKED,
];

export const normalizeEnrollmentStatus = (status?: string | null): string => {
  return (status ?? "").trim().toUpperCase();
};

const hasEnrollmentStatus = (
  status: string | null | undefined,
  expectedStatuses: readonly string[],
): boolean => {
  return expectedStatuses.includes(normalizeEnrollmentStatus(status));
};

export const isPendingEnrollmentStatus = (status?: string | null): boolean => {
  return hasEnrollmentStatus(status, [PENDING]);
};

export const isValidatedEnrollmentStatus = (status?: string | null): boolean => {
  return hasEnrollmentStatus(status, [VALIDATED]);
};

export const isApprovedEnrollmentStatus = (status?: string | null): boolean => {
  return hasEnrollmentStatus(status, [APPROVED]);
};

export const isRejectedEnrollmentStatus = (status?: string | null): boolean => {
  return hasEnrollmentStatus(status, [REJECTED]);
};

export const isUnsubscriptionPendingStatus = (status?: string | null): boolean => {
  return hasEnrollmentStatus(status, [UNSUB_PENDING]);
};

export const canGenerateEnrollmentCodeStatus = (status?: string | null): boolean => {
  return hasEnrollmentStatus(status, [PENDING, VALIDATED]);
};

export const canValidateEnrollmentStatus = (status?: string | null): boolean => {
  return hasEnrollmentStatus(status, [PENDING]);
};

export const canDeleteEnrollmentStatus = (status?: string | null): boolean => {
  return hasEnrollmentStatus(status, [PENDING]);
};

export const canRequestUnsubscriptionStatus = (status?: string | null): boolean => {
  return hasEnrollmentStatus(status, [VALIDATED]);
};

export const canConfirmUnsubscriptionStatus = (status?: string | null): boolean => {
  return hasEnrollmentStatus(status, [UNSUB_PENDING]);
};

export const canDeactivateEnrollmentStatus = (status?: string | null): boolean => {
  return hasEnrollmentStatus(status, [VALIDATED]);
};

export const canEditEnrollmentCodeStatus = (status?: string | null): boolean => {
  return !hasEnrollmentStatus(status, [VALIDATED, APPROVED, REJECTED]);
};

export const enrollmentStatusLabels: Record<string, string> = {
  [PENDING]: "En attente",
  [UNSUB_PENDING]: "Désinscription en cours",
  [VALIDATED]: "Validé",
  [APPROVED]: "Finalisé",
  [BLOCKED]: "Désactivé",
  [DEACTIVATED]: "Désactivé",
  [UNSUBSCRIBED]: "Désinscrit",
  [REJECTED]: "Rejeté",
};

export const getEnrollmentStatusLabel = (status: string): string => {
  return enrollmentStatusLabels[status] || status;
};
