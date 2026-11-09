import { EnrollmentApplicationSchema } from "../models/types";

const ENROLLMENT_CUSTOMER_ID_MAP_STORAGE_KEY = "avia_enrollment_customer_id_map";
const ENROLLMENT_REFERENCE_LINK_MAP_STORAGE_KEY = "avia_enrollment_reference_link_map";

export const readEnrollmentCustomerIdMap = (): Record<string, string> => {
  if (globalThis.window === undefined) {
    return {};
  }

  try {
    const rawValue = globalThis.window.localStorage.getItem(ENROLLMENT_CUSTOMER_ID_MAP_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
        .map(([key, value]) => [key, (value as string).trim()]),
    );
  } catch {
    return {};
  }
};

export const writeEnrollmentCustomerIdMap = (map: Record<string, string>): void => {
  if (globalThis.window === undefined) {
    return;
  }

  try {
    globalThis.window.localStorage.setItem(
      ENROLLMENT_CUSTOMER_ID_MAP_STORAGE_KEY,
      JSON.stringify(map),
    );
  } catch {
    // Ignore storage write failure.
  }
};

export const withRememberedCustomerId = (
  previous: Record<string, string>,
  enrollmentId: string,
  customerId?: string | null,
): Record<string, string> => {
  const normalizedEnrollmentId = enrollmentId.trim();
  const normalizedCustomerId = customerId?.trim() ?? "";

  if (!normalizedEnrollmentId || !normalizedCustomerId) {
    return previous;
  }

  if (previous[normalizedEnrollmentId] === normalizedCustomerId) {
    return previous;
  }

  return {
    ...previous,
    [normalizedEnrollmentId]: normalizedCustomerId,
  };
};

export const resolveCustomerIdForEnrollment = (
  enrollment: EnrollmentApplicationSchema,
  customerIdMap: Record<string, string>,
): string | null => {
  const inlineCustomerId = enrollment.customerId?.trim();
  if (inlineCustomerId) {
    return inlineCustomerId;
  }

  const mappedCustomerId = customerIdMap[enrollment.id]?.trim();
  return mappedCustomerId || null;
};

export const readEnrollmentReferenceLinkMap = (): Record<string, string> => {
  if (globalThis.window === undefined) {
    return {};
  }

  try {
    const rawValue = globalThis.window.localStorage.getItem(ENROLLMENT_REFERENCE_LINK_MAP_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
        .map(([key, value]) => [key, (value as string).trim()]),
    );
  } catch {
    return {};
  }
};

export const writeEnrollmentReferenceLinkMap = (map: Record<string, string>): void => {
  if (globalThis.window === undefined) {
    return;
  }

  try {
    globalThis.window.localStorage.setItem(
      ENROLLMENT_REFERENCE_LINK_MAP_STORAGE_KEY,
      JSON.stringify(map),
    );
  } catch {
    // Ignore storage write failure.
  }
};

export const withRememberedReferenceLink = (
  previous: Record<string, string>,
  enrollmentId: string,
  referenceLink?: string | null,
): Record<string, string> => {
  const normalizedEnrollmentId = enrollmentId.trim();
  const normalizedReferenceLink = referenceLink?.trim() ?? "";

  if (!normalizedEnrollmentId || !normalizedReferenceLink) {
    return previous;
  }

  if (previous[normalizedEnrollmentId] === normalizedReferenceLink) {
    return previous;
  }

  return {
    ...previous,
    [normalizedEnrollmentId]: normalizedReferenceLink,
  };
};

export const resolveReferenceLinkForEnrollment = (
  enrollment: EnrollmentApplicationSchema,
  referenceLinkMap: Record<string, string>,
): string | null => {
  const inlineReferenceLink = enrollment.referenceLink?.trim();
  if (inlineReferenceLink) {
    return inlineReferenceLink;
  }

  const mappedReferenceLink = referenceLinkMap[enrollment.id]?.trim();
  return mappedReferenceLink || null;
};

// ---------------------------------------------------------------------------
// Status override map — stores locally projected statuses when the backend
// list API hasn't yet reflected the result of an action (e.g. deactivation).
// ---------------------------------------------------------------------------

const ENROLLMENT_STATUS_OVERRIDE_MAP_STORAGE_KEY = "avia_enrollment_status_override_map";

export const readEnrollmentStatusOverrideMap = (): Record<string, string> => {
  if (globalThis.window === undefined) {
    return {};
  }

  try {
    const rawValue = globalThis.window.localStorage.getItem(ENROLLMENT_STATUS_OVERRIDE_MAP_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
        .map(([key, value]) => [key, (value as string).trim()]),
    );
  } catch {
    return {};
  }
};

export const setEnrollmentStatusOverride = (enrollmentId: string, status: string): void => {
  if (globalThis.window === undefined) {
    return;
  }

  const normalizedId = enrollmentId.trim();
  const normalizedStatus = status.trim();
  if (!normalizedId || !normalizedStatus) {
    return;
  }

  try {
    const map = readEnrollmentStatusOverrideMap();
    map[normalizedId] = normalizedStatus;
    globalThis.window.localStorage.setItem(
      ENROLLMENT_STATUS_OVERRIDE_MAP_STORAGE_KEY,
      JSON.stringify(map),
    );
  } catch {
    // Ignore storage write failure.
  }
};
