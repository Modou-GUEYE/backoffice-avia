import httpClient from "@/core/network/httpClient";
import { getRequestedPartnerId } from "@/core/security/authStore";
import { fetchStructures } from "@/features/structures/services/structuresService";
import {
  CouplageAccountSchema,
  CustomerProfileResponseSchema,
  EnrollmentApplicationCreateSchema,
  EnrollmentApplicationResponseSchema,
  EnrollmentApplicationSchema,
  EnrollmentCodeGenerationResponseSchema,
  EnrollmentCodeValidationSchema,
  PatchCustomerIdentitySchema,
  CustomerEnrollmentDetailsResponseSchema,
} from "../models/types";

const enrollmentHttpClient = httpClient;

const SERVER_ERROR_MESSAGE = "Le serveur a rencontré une erreur interne. Merci de réessayer dans quelques instants.";
const SERVICE_UNAVAILABLE_MESSAGE = "Le service est temporairement indisponible. Merci de réessayer plus tard.";
const UNAUTHORIZED_MESSAGE = "Votre session a expiré ou vous n'avez pas les permissions nécessaires.";
const NETWORK_ERROR_MESSAGE = "Impossible de contacter le serveur. Veuillez réessayer dans quelques instants.";

const normalizeBackendMessage = (message: string): string => {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes("request failed with status code 500")) {
    return SERVER_ERROR_MESSAGE;
  }

  if (
    normalized.includes("request failed with status code 502")
    || normalized.includes("request failed with status code 503")
    || normalized.includes("request failed with status code 504")
  ) {
    return SERVICE_UNAVAILABLE_MESSAGE;
  }

  if (
    normalized.includes("request failed with status code 401")
    || normalized.includes("request failed with status code 403")
  ) {
    return UNAUTHORIZED_MESSAGE;
  }

  if (normalized === "network error" || normalized.includes("failed to fetch")) {
    return NETWORK_ERROR_MESSAGE;
  }

  if (normalized.includes("enrollment code not found")) {
    return "Code d'enrôlement introuvable";
  }

  if (normalized.includes("customer not found")) {
    return "Client introuvable";
  }

  if (normalized.includes("method not allowed")) {
    return "Opération non autorisée par l'API";
  }

  if (normalized.includes("internal server error")) {
    return "Erreur interne du serveur";
  }

  return message;
};

type ApiErrorResponse = {
  data?: unknown;
  status?: number;
  statusText?: string;
};

const extractErrorResponse = (error: unknown): ApiErrorResponse | null => {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  return (error as { response?: ApiErrorResponse }).response ?? null;
};

const extractDetailArrayMessage = (detail: unknown): string | null => {
  if (!Array.isArray(detail) || detail.length === 0) {
    return null;
  }

  const first = detail[0] as { msg?: unknown; loc?: unknown };
  const msg = typeof first?.msg === "string" ? first.msg : null;
  if (!msg) {
    return null;
  }

  const loc = Array.isArray(first?.loc)
    ? first.loc.filter((part): part is string => typeof part === "string").join(".")
    : null;

  return loc ? `${loc}: ${normalizeBackendMessage(msg)}` : normalizeBackendMessage(msg);
};

const toStatusFallbackMessage = (status: number, fallback: string, statusText?: string): string => {
  if (status === 500) {
    return SERVER_ERROR_MESSAGE;
  }

  if (status === 502 || status === 503 || status === 504) {
    return SERVICE_UNAVAILABLE_MESSAGE;
  }

  if (status === 401 || status === 403) {
    return UNAUTHORIZED_MESSAGE;
  }

  const normalizedStatusText = normalizeBackendMessage((statusText ?? "").trim());
  return normalizedStatusText
    ? `${fallback} (${status} ${normalizedStatusText})`
    : `${fallback} (${status})`;
};

const toMessageFromResponseData = (data: unknown): string | null => {
  if (typeof data === "string" && data.trim().length > 0) {
    return normalizeBackendMessage(data);
  }

  if (typeof data !== "object" || data === null) {
    return null;
  }

  const message = (data as { message?: unknown }).message;
  if (typeof message === "string" && message.trim().length > 0) {
    return normalizeBackendMessage(message);
  }

  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim().length > 0) {
    return normalizeBackendMessage(detail);
  }

  return extractDetailArrayMessage(detail);
};

const toMessageFromErrorInstance = (error: unknown, fallback: string): string | null => {
  if (!(error instanceof Error) || error.message.trim().length === 0) {
    return null;
  }

  const normalizedMessage = normalizeBackendMessage(error.message);
  if (normalizedMessage !== error.message) {
    return normalizedMessage;
  }

  if (error.message.trim().toLowerCase().startsWith("request failed with status code")) {
    return fallback;
  }

  return normalizedMessage;
};

const toApiErrorMessage = (error: unknown, fallback: string): string => {
  const response = extractErrorResponse(error);

  const messageFromData = toMessageFromResponseData(response?.data);
  if (messageFromData) {
    return messageFromData;
  }

  if (typeof response?.status === "number") {
    return toStatusFallbackMessage(response.status, fallback, response.statusText);
  }

  const messageFromError = toMessageFromErrorInstance(error, fallback);
  return messageFromError ?? fallback;
};

const readHttpStatus = (error: unknown): number | null => {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const response = (error as { response?: { status?: unknown } }).response;
  return typeof response?.status === "number" ? response.status : null;
};

const diacriticPattern = /[\u0300-\u036f]/u;

const normalizeIdentityValue = (value: string): string =>
  Array.from(value.normalize("NFD"))
    .filter((char) => !diacriticPattern.test(char))
    .join("")
    .trim()
    .toLowerCase();

const identitiesMatch = (
  reference: { firstName: string; lastName: string; dateOfBirth: string },
  candidate: { firstName: string; lastName: string; dateOfBirth: string },
): boolean => {
  return (
    normalizeIdentityValue(reference.firstName) === normalizeIdentityValue(candidate.firstName)
    && normalizeIdentityValue(reference.lastName) === normalizeIdentityValue(candidate.lastName)
    && reference.dateOfBirth === candidate.dateOfBirth
  );
};

export interface CustomerCodeConsistencyResult {
  exists: boolean;
  matches: boolean;
}

export const fetchEnrollmentsByIdentifier = async (
  identifier: string,
  fallbackErrorMessage: string = "Impossible de récupérer les enrôlements",
): Promise<EnrollmentApplicationSchema[]> => {
  const normalizedIdentifier = identifier.trim().toUpperCase();

  if (!normalizedIdentifier) {
    return [];
  }

  try {
    const { data } = await enrollmentHttpClient.get<EnrollmentApplicationSchema[]>(
      `/enrollment/applications/${encodeURIComponent(normalizedIdentifier)}`,
    );
    return data;
  } catch (error) {
    if (readHttpStatus(error) === 404) {
      return [];
    }

    throw new Error(toApiErrorMessage(error, fallbackErrorMessage));
  }
};

export const fetchEnrollmentsByCustomerCode = async (
  clientCode: string,
): Promise<EnrollmentApplicationSchema[]> => {
  return fetchEnrollmentsByIdentifier(
    clientCode,
    "Impossible de récupérer les enrôlements du code client",
  );
};

export const fetchEnrollmentsByCustomerId = async (
  customerId: string,
): Promise<EnrollmentApplicationSchema[]> => {
  return fetchEnrollmentsByIdentifier(
    customerId,
    "Impossible de récupérer les enrôlements du client",
  );
};

export const checkCustomerCodeExists = async (
  clientCode: string,
): Promise<boolean> => {
  const enrollments = await fetchEnrollmentsByIdentifier(
    clientCode,
    "Impossible de contrôler le code client",
  );

  return enrollments.length > 0;
};

export const checkCustomerCodeConsistency = async (
  clientCode: string,
  identity: { firstName: string; lastName: string; dateOfBirth: string },
): Promise<CustomerCodeConsistencyResult> => {
  const enrollments = await fetchEnrollmentsByIdentifier(
    clientCode,
    "Impossible de contrôler le code client",
  );

  if (enrollments.length === 0) {
    return { exists: false, matches: false };
  }

  for (const enrollment of enrollments) {
    const details = await fetchEnrollmentDetails(enrollment.id);
    if (
      identitiesMatch(
        {
          firstName: details.identity.firstName,
          lastName: details.identity.lastName,
          dateOfBirth: details.identity.dateOfBirth,
        },
        identity,
      )
    ) {
      return { exists: true, matches: true };
    }
  }

  return { exists: true, matches: false };
};

const resolveStatusesToFetch = (status?: string): string[] | undefined => {
  const normalizedStatus = status?.trim().toUpperCase();
  if (normalizedStatus && normalizedStatus !== "ALL") {
    return [normalizedStatus];
  }

  return undefined;
};

const resolveCandidateInstitutionIds = (
  institutionId: string,
  partnerId: string | null,
): string[] => {
  return Array.from(
    new Set(
      [institutionId, partnerId]
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
};

const mergeEnrollments = (
  target: Map<string, EnrollmentApplicationSchema>,
  source: EnrollmentApplicationSchema[],
): void => {
  for (const enrollment of source) {
    const existing = target.get(enrollment.id);
    if (!existing) {
      target.set(enrollment.id, enrollment);
      continue;
    }

    const pickPreferred = (currentValue?: string | null, incomingValue?: string | null) => {
      const normalizedIncoming = incomingValue?.trim();
      if (normalizedIncoming) {
        return incomingValue;
      }
      return currentValue;
    };

    target.set(enrollment.id, {
      ...existing,
      ...enrollment,
      referenceLink: pickPreferred(existing.referenceLink, enrollment.referenceLink),
      enrollmentCode: pickPreferred(existing.enrollmentCode, enrollment.enrollmentCode),
      rejectionReason: pickPreferred(existing.rejectionReason, enrollment.rejectionReason),
      institutionLabel: pickPreferred(existing.institutionLabel, enrollment.institutionLabel) || existing.institutionLabel,
      createdAt: pickPreferred(existing.createdAt, enrollment.createdAt),
      updatedAt: pickPreferred(existing.updatedAt, enrollment.updatedAt),
      customerId: pickPreferred(existing.customerId, enrollment.customerId),
    });
  }
};

const fetchInstitutionEnrollmentsByStatuses = async (
  candidateInstitutionId: string,
  statusesToFetch?: string[],
  extraParams?: { client_type?: string; institution_label?: string },
): Promise<{
  hasSuccessfulRequest: boolean;
  lastError: unknown;
  enrollmentsById: Map<string, EnrollmentApplicationSchema>;
}> => {
  const enrollmentsById = new Map<string, EnrollmentApplicationSchema>();

  const buildParams = (statusToFetch?: string) => ({
    ...(statusToFetch ? { status: statusToFetch } : {}),
    ...(extraParams?.client_type ? { client_type: extraParams.client_type } : {}),
    ...(extraParams?.institution_label ? { institution_label: extraParams.institution_label } : {}),
  });

  const requests = statusesToFetch && statusesToFetch.length > 0
    ? statusesToFetch.map((statusToFetch) =>
        enrollmentHttpClient.get<EnrollmentApplicationSchema[]>(
          `/enrollment/applications/institution/${candidateInstitutionId}`,
          { params: buildParams(statusToFetch) },
        ))
    : [
        enrollmentHttpClient.get<EnrollmentApplicationSchema[]>(
          `/enrollment/applications/institution/${candidateInstitutionId}`,
          { params: buildParams() },
        ),
      ];

  const settledRequests = await Promise.allSettled(requests);

  let hasSuccessfulRequest = false;
  let lastError: unknown = null;

  settledRequests.forEach((result) => {
    if (result.status === "fulfilled") {
      hasSuccessfulRequest = true;
      mergeEnrollments(enrollmentsById, result.value.data);
      return;
    }

    lastError = result.reason;
  });

  return {
    hasSuccessfulRequest,
    lastError,
    enrollmentsById,
  };
};

export const fetchPendingEnrollmentsByInstitution = async (
  institutionId: string,
  filters?: {
    status?: string;
    client_type?: string;
    institution_label?: string;
  },
): Promise<EnrollmentApplicationSchema[]> => {
  const statusesToFetch = resolveStatusesToFetch(filters?.status);
  const extraParams = {
    client_type: filters?.client_type?.trim() || undefined,
    institution_label: filters?.institution_label?.trim().toUpperCase() || undefined,
  };

  let candidateInstitutionIds: string[] = [];
  if (institutionId === "ALL" || !institutionId) {
    try {
      const structures = await fetchStructures();
      candidateInstitutionIds = structures.filter((s) => !s.is_deleted && s.is_active).map((s) => s.id);
    } catch (error) {
      console.error("Error fetching structures for global admin: ", error);
    }
  } else {
    candidateInstitutionIds = resolveCandidateInstitutionIds(
      institutionId,
      getRequestedPartnerId(),
    );
  }

  let lastError: unknown = null;
  let hasSuccessfulRequest = false;
  const enrollmentsById = new Map<string, EnrollmentApplicationSchema>();

  const settledInstitutionRequests = await Promise.allSettled(
    candidateInstitutionIds.map((candidateInstitutionId) =>
      fetchInstitutionEnrollmentsByStatuses(candidateInstitutionId, statusesToFetch, extraParams),
    ),
  );

  settledInstitutionRequests.forEach((result) => {
    if (result.status === "fulfilled") {
      if (result.value.hasSuccessfulRequest) {
        hasSuccessfulRequest = true;
        mergeEnrollments(enrollmentsById, Array.from(result.value.enrollmentsById.values()));
      }

      if (result.value.lastError) {
        lastError = result.value.lastError;
      }
      return;
    }

    lastError = result.reason;
  });

  if (hasSuccessfulRequest || candidateInstitutionIds.length === 0) {
    return Array.from(enrollmentsById.values());
  }

  throw new Error(
    toApiErrorMessage(lastError, "Impossible de charger les enrôlements"),
  );
};

export const fetchEnrollmentDetails = async (
  enrollmentId: string,
): Promise<CustomerEnrollmentDetailsResponseSchema> => {
  try {
    const { data } = await enrollmentHttpClient.get<CustomerEnrollmentDetailsResponseSchema>(
      `/enrollment/applications/${enrollmentId}/details`,
    );
    return data;
  } catch (error) {
    throw new Error(
      toApiErrorMessage(error, "Impossible de charger les détails d'enrôlement"),
    );
  }
};

export const fetchEnrollmentClientCode = async (
  _enrollmentId: string,
): Promise<string | null> => {
  return null;
};

export const createEnrollmentApplication = async (
  payload: EnrollmentApplicationCreateSchema,
): Promise<EnrollmentApplicationResponseSchema> => {
  try {
    const { data } = await enrollmentHttpClient.post<EnrollmentApplicationResponseSchema>(
      `/enrollment/applications`,
      payload,
    );
    // Enrich each enrollment with the customerId returned at creation — it is
    // the only moment the API exposes this UUID, needed later for PATCH identity.
    const enriched: EnrollmentApplicationResponseSchema = {
      ...data,
      enrollments: data.enrollments.map((enrollment) => ({
        ...enrollment,
        customerId: data.customerId,
      })),
    };
    return enriched;
  } catch (error) {
    throw new Error(
      toApiErrorMessage(error, "Impossible de créer l'enrôlement"),
    );
  }
};

export const validateEnrollment = async (
  enrollmentId: string,
  payload: EnrollmentCodeValidationSchema,
): Promise<EnrollmentApplicationSchema> => {
  try {
    const { data } = await enrollmentHttpClient.post<EnrollmentApplicationSchema>(
      `/enrollment/applications/${enrollmentId}/validate`,
      payload,
    );
    return data;
  } catch (error) {
    throw new Error(
      toApiErrorMessage(error, "Impossible de valider l'enrôlement"),
    );
  }
};

export const assignEnrollmentSubscription = async (
  enrollmentId: string,
  subscriptionId: string,
): Promise<void> => {
  const normalizedEnrollmentId = enrollmentId.trim();
  const normalizedSubscriptionId = subscriptionId.trim();

  if (!normalizedEnrollmentId) {
    throw new Error("Identifiant d'enrôlement introuvable");
  }

  if (!normalizedSubscriptionId) {
    throw new Error("Identifiant d'abonnement introuvable");
  }

  try {
    await enrollmentHttpClient.patch(
      `/enrollment/applications/${encodeURIComponent(normalizedEnrollmentId)}/subscription`,
      { subscription_id: normalizedSubscriptionId },
    );
  } catch (error) {
    throw new Error(
      toApiErrorMessage(error, "Impossible d'assigner l'abonnement à l'enrôlement"),
    );
  }
};

export const updateCustomerIdentity = async (
  customerId: string,
  payload: PatchCustomerIdentitySchema,
): Promise<void> => {
  const normalizedCustomerId = customerId.trim();

  if (!normalizedCustomerId) {
    throw new Error("Identifiant client introuvable");
  }

  try {
    await enrollmentHttpClient.patch(
      `/enrollment/customers/${encodeURIComponent(normalizedCustomerId)}/identity`,
      payload,
    );
  } catch (error) {
    throw new Error(
      toApiErrorMessage(error, "Impossible de mettre à jour l'identité du client"),
    );
  }
};

const tryPostWithFallbackEndpoints = async <T>(
  endpoints: string[],
  fallbackErrorMessage: string,
  options?: {
    payload?: unknown;
    ignoredStatuses?: number[];
  },
): Promise<T> => {
  const ignoredStatuses = options?.ignoredStatuses ?? [404, 405];
  let fallbackError: unknown = null;

  for (const endpoint of endpoints) {
    try {
      const { data } = await enrollmentHttpClient.post<T>(endpoint, options?.payload);
      return data;
    } catch (error) {
      const status = readHttpStatus(error);

      if (status === null || !ignoredStatuses.includes(status)) {
        throw new Error(toApiErrorMessage(error, fallbackErrorMessage));
      }

      fallbackError = error;
    }
  }

  throw new Error(toApiErrorMessage(fallbackError, fallbackErrorMessage));
};

/**
 * @deprecated NOT in the OpenAPI contract.
 * Endpoints /applications/{id}/deactivate and /applications/{id}/disable do not exist.
 * Use `deactivateCustomer` (POST /customers/{customerId}/deactivate) instead.
 */
export const deactivateEnrollment = async (
  enrollmentId: string,
): Promise<EnrollmentApplicationSchema> => {
  return tryPostWithFallbackEndpoints<EnrollmentApplicationSchema>(
    [
      `/enrollment/applications/${enrollmentId}/deactivate`,
      `/enrollment/applications/${enrollmentId}/disable`,
    ],
    "Impossible de désactiver le client",
  );
};

export const deactivateCustomer = async (
  customerId: string,
): Promise<CustomerProfileResponseSchema> => {
  try {
    const { data } = await enrollmentHttpClient.post<CustomerProfileResponseSchema>(
      `/enrollment/customers/${encodeURIComponent(customerId)}/deactivate`,
    );
    return data;
  } catch (error) {
    throw new Error(
      toApiErrorMessage(error, "Impossible de désactiver le client"),
    );
  }
};

export const unsubscribeEnrollment = async (
  enrollmentId: string,
): Promise<EnrollmentApplicationSchema> => {
  try {
    const { data } = await enrollmentHttpClient.post<EnrollmentApplicationSchema>(
      `/enrollment/unsubscriptions/${encodeURIComponent(enrollmentId)}/request`,
    );
    return data;
  } catch (error) {
    throw new Error(toApiErrorMessage(error, "Impossible d'effectuer la désinscription"));
  }
};

export const confirmUnsubscription = async (
  enrollmentId: string,
): Promise<EnrollmentApplicationSchema> => {
  try {
    const { data } = await enrollmentHttpClient.post<EnrollmentApplicationSchema>(
      `/enrollment/unsubscriptions/${encodeURIComponent(enrollmentId)}/confirm`,
    );
    return data;
  } catch (error) {
    throw new Error(toApiErrorMessage(error, "Impossible de valider la désinscription"));
  }
};

export const deleteEnrollment = async (
  enrollmentId: string,
): Promise<void> => {
  try {
    await enrollmentHttpClient.delete(`/enrollment/applications/${enrollmentId}`);
  } catch (error) {
    if (readHttpStatus(error) === 405) {
      throw new Error("La suppression d'un enrôlement n'est pas supportée par l'API backend.");
    }

    throw new Error(
      toApiErrorMessage(error, "Impossible de supprimer l'enrôlement"),
    );
  }
};

export const generateEnrollmentCode = async (
  enrollmentId: string,
): Promise<EnrollmentCodeGenerationResponseSchema> => {
  try {
    const { data } = await enrollmentHttpClient.post<EnrollmentCodeGenerationResponseSchema>(
      `/enrollment/applications/${enrollmentId}/code/generate`,
    );
    if (!data.enrollmentCode?.trim()) {
      throw new Error("Le backend n'a pas retourné de code d'enrôlement");
    }

    return { enrollmentCode: data.enrollmentCode.trim() };
  } catch (error) {
    throw new Error(
      toApiErrorMessage(error, "Impossible de générer un nouveau code d'enrôlement"),
    );
  }
};

export const fetchCouplageAccounts = async (
  couplageId: string,
): Promise<CouplageAccountSchema[]> => {
  try {
    const { data } = await enrollmentHttpClient.get<CouplageAccountSchema[]>(
      `/enrollment/couplages/${couplageId}/accounts`,
    );
    return data;
  } catch (error) {
    throw new Error(
      toApiErrorMessage(error, "Impossible de charger les comptes du couplage"),
    );
  }
};

/**
 * @unsupported Endpoints /applications/{id}/password/reset and /applications/{id}/reset-password
 * are NOT in the OpenAPI contract for the Enrollment service.
 * This function will always result in a 404/405 error until the backend exposes this route.
 */
export const resetEnrollmentPassword = async (
  enrollmentId: string,
  options?: { code_client?: string },
): Promise<void> => {
  const payload = options?.code_client?.trim()
    ? {
      code_client: options.code_client.trim(),
    }
    : undefined;

  await tryPostWithFallbackEndpoints(
    [
      `/enrollment/applications/${enrollmentId}/password/reset`,
      `/enrollment/applications/${enrollmentId}/reset-password`,
    ],
    "Impossible de réinitialiser le mot de passe",
    { payload },
  );
};
