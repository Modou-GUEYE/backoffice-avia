import axios from "axios";
import { accessSecurityApiBaseUrl } from "@/core/network/apiGateway";
import { attachAuthorizationHeader, refreshAccessToken } from "@/core/network/httpClient";
import { notifySessionExpired } from "@/core/security/sessionManager";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  profiles: string[];
}

export interface PasswordResetRequestResponse {
  message: string;
}

export interface PasswordSetValidateRequest {
  username: string;
  reset_token: string;
  new_password: string;
}

export interface PasswordSetValidateResponse {
  message: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export interface RefreshTokenResponse {
  token_type: string;
  access_token: string;
  expires_in: number;
}

export type AccessSecurityRefType =
  | "ADMIN"
  | "STRUCTURE"
  | "AGENCY"
  | "AGENCE"
  | "CAISSE"
  | "PRODUCT"
  | "PARTNER"
  | "DISTRIBUTOR";

export interface TargetScopeRef {
  ref_type: AccessSecurityRefType;
  ref_id: string;
}

export interface CreateBackofficeUserRequest {
  username: string;
  email: string;
  target_scope: TargetScopeRef[];
  profiles: string[];
  telephone?: string | null;
  matricule?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  agence?: string | null;
  caisse?: string | null;
}

export interface CreateBackofficeUserResponse {
  account_id: string;
  account_user_id: string;
  account_username: string;
  temporary_password: string;
  target_scope: TargetScopeRef[];
  profiles: string[];
}

export interface AvailableRolesResponse {
  roles: string[];
}

export interface KeycloakRoleResponse {
  role_name: string;
}

export interface AssignPermissionsToClientCompositeRoleRequest {
  client_id: string;
  roles: string[];
}

export interface AssignPermissionsToClientCompositeRoleResponse {
  group_name: string;
  roles: string[];
}

export interface HierarchyMemberUser {
  user_id: string;
  username: string;
  active?: boolean;
  first_name?: string | null;
  last_name?: string | null;
  profiles?: string[];
  telephone?: string;
  matricule?: string;
  agence?: string;
  caisse?: string;
  email?: string;
}

export interface HierarchyMembersResponse {
  ref_type: string;
  ref_id: string;
  ref_label?: string;
  users: HierarchyMemberUser[];
}

export interface HierarchyMembersFilters {
  ref_label?: string;
  username?: string;
  email?: string;
  profile?: string;
  status?: "active" | "inactive" | "enabled" | "disabled";
}

export type ProfileClientId = "mobile-app" | "backoffice-web";

export interface UpdateAccessSecurityUserRequest {
  login?: string | null;
  profiles?: string[] | null;
  profile_client_id?: ProfileClientId | null;
  first_name?: string | null;
  last_name?: string | null;
  telephone?: string | null;
  matricule?: string | null;
  agence?: string | null;
  caisse?: string | null;
  email?: string | null;
  target_scope?: TargetScopeRef[] | null;
}

export interface UpdateAccessSecurityUserResponse {
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  telephone?: string | null;
  matricule?: string | null;
  agence?: string | null;
  caisse?: string | null;
  email?: string | null;
}

export interface UserStatusActionResponse {
  user_id: string;
  message: string;
}

const ensureAccessSecurityConfigured = (): void => {
  if (!accessSecurityApiBaseUrl) {
    throw new Error("La base URL API Gateway est requise pour la connexion");
  }
};

const accessSecurityHttpClient = axios.create({
  baseURL: accessSecurityApiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

type AccessSecurityErrorPayload = {
  detail?: unknown;
  message?: unknown;
  error?: unknown;
  error_msg?: unknown;
  title?: unknown;
};

export interface ParsedAuthError {
  title: string;
  message: string;
  rawMessage?: string;
  statusCode?: number;
  requiresPasswordReset?: boolean;
}

export class AccessSecurityRequestError extends Error {
  title: string;
  rawMessage?: string;
  statusCode?: number;
  requiresPasswordReset?: boolean;

  constructor(
    message: string,
    rawMessage?: string,
    statusCode?: number,
    title = "Échec de connexion",
    requiresPasswordReset = false,
  ) {
    super(message);
    this.name = "AccessSecurityRequestError";
    this.title = title;
    this.rawMessage = rawMessage;
    this.statusCode = statusCode;
    this.requiresPasswordReset = requiresPasswordReset;
  }
}

accessSecurityHttpClient.interceptors.request.use((config) => {
  attachAuthorizationHeader(config);

  // Prepend security prefix
  if (config.url?.startsWith("/v1")) {
    config.url = config.url.replace("/v1", "/api/v1/security");
  }

  // Disable caching for GET requests
  if (config.method?.toLowerCase() === "get") {
    config.headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
    config.headers["Pragma"] = "no-cache";
    config.headers["Expires"] = "0";
  }
  return config;
});

let securityRefreshPromise: Promise<string | null> | null = null;

accessSecurityHttpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || !error.config) {
      throw error;
    }

    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest._retry) {
      throw error;
    }

    originalRequest._retry = true;
    if (!securityRefreshPromise) {
      securityRefreshPromise = refreshAccessToken().finally(() => {
        securityRefreshPromise = null;
      });
    }

    const nextAccessToken = await securityRefreshPromise;
    if (!nextAccessToken) {
      notifySessionExpired();
      throw error;
    }

    attachAuthorizationHeader(originalRequest);
    return accessSecurityHttpClient(originalRequest);
  },
);

export const normalizeIntegrationError = (value: string): string => {
  const normalized = value.toLowerCase();
  if (
    normalized.includes("invalid user credentials") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("invalid_grant")
  ) {
    return "Identifiant ou mot de passe incorrect.";
  }
  if (normalized.includes("account disabled")) {
    return "Ce compte utilisateur est désactivé. Veuillez contacter l'administrateur.";
  }
  if (normalized.includes("linked_hierarchy_entity_inactive")) {
    return "Votre structure ou agence est désactivée. Accès refusé.";
  }
  if (
    normalized.includes("user_not_found_or_deleted") ||
    normalized.includes("user not found or deleted") ||
    normalized.includes("user_not_found")
  ) {
    return "Ce compte utilisateur est introuvable ou a été supprimé. L'entité ou le partenaire associé a peut-être été supprimé. Veuillez contacter votre administrateur.";
  }
  if (
    normalized.includes("resource already exists in keycloak") ||
    normalized.includes("already exist")
  ) {
    return "Cet identifiant est déjà utilisé par un autre utilisateur. Veuillez en choisir un autre.";
  }
  if (
    normalized.includes("internal server error") ||
    normalized.includes("500 internal server error")
  ) {
    return "Une erreur serveur s'est produite. Veuillez réessayer ultérieurement ou contacter l'équipe technique.";
  }
  return value;
};

const getFirstStringValue = (values: Array<unknown>): string | null => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
};

const extractDetailMessage = (detail: unknown): string | null => {
  if (typeof detail === "string") {
    return detail.trim() || null;
  }

  if (typeof detail === "object" && detail !== null) {
    const detailObj = detail as Record<string, unknown>;
    const errorDesc = detailObj.reason || detailObj.error_description || detailObj.errorMsg || detailObj.message || detailObj.error;
    if (typeof errorDesc === "string" && errorDesc.trim()) {
      return errorDesc.trim();
    }
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown };
    if (typeof first?.msg === "string" && first.msg.trim()) {
      return first.msg.trim();
    }
  }

  return null;
};

const getErrorMessageFromPayload = (data?: AccessSecurityErrorPayload): string | null => {
  const directMessage = getFirstStringValue([data?.message, data?.error_msg, data?.error]);
  if (directMessage) {
    const normalized = normalizeIntegrationError(directMessage);
    if (normalized !== directMessage) {
      return normalized;
    }
  }

  const detailMessage = extractDetailMessage(data?.detail);
  if (detailMessage) {
    const normalized = normalizeIntegrationError(detailMessage);
    if (normalized !== detailMessage) {
      return normalized;
    }
  }

  if (typeof data?.detail === "object" && data.detail !== null) {
    const detailObj = data.detail as Record<string, unknown>;
    const errorProp = typeof detailObj.error === "string" ? detailObj.error : "";
    if (errorProp) {
      const normalized = normalizeIntegrationError(errorProp);
      if (normalized !== errorProp) {
        return normalized;
      }
    }
  }

  return null;
};

const getRawErrorMessageFromPayload = (data?: AccessSecurityErrorPayload): string | null => {
  const directMessage = getFirstStringValue([data?.message, data?.error_msg, data?.error]);
  if (directMessage) {
    return directMessage;
  }

  return extractDetailMessage(data?.detail);
};

export const getErrorMessageFromStatus = (status: number | undefined, fallbackMessage: string): string | null => {
  if (status === 400) {
    return "Données de connexion invalides. Veuillez vérifier vos informations.";
  }

  if (status === 401) {
    return "Identifiant ou mot de passe incorrect.";
  }

  if (status === 403) {
    return "Accès non autorisé. Vous n'avez pas la permission d'accéder à ce compte.";
  }

  if (status === 404) {
    return "Le service d'authentification est indisponible. Veuillez contacter l'équipe technique.";
  }

  if (status === 429) {
    return "Trop de tentatives de connexion. Veuillez patienter avant de réessayer.";
  }

  if (status && status >= 500) {
    if (status === 502 || status === 504) {
      return "Le serveur est temporairement indisponible. Veuillez réessayer dans quelques instants.";
    }
    return "Une erreur serveur s'est produite. Veuillez réessayer ultérieurement ou contacter l'équipe technique.";
  }

  if (status && status >= 400) {
    return `${fallbackMessage} (HTTP ${status})`;
  }

  return null;
};

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (!axios.isAxiosError(error)) {
    return fallbackMessage;
  }

  const rawMessage = error.message?.toLowerCase() ?? "";
  if (rawMessage.includes("network error") || rawMessage.includes("failed to fetch")) {
    return "Impossible de contacter le serveur. Veuillez réessayer dans quelques instants.";
  }

  const status = error.response?.status;
  const data = error.response?.data as AccessSecurityErrorPayload | undefined;

  // 1. Erreurs fonctionnelles Keycloak identifiées dans le payload (ex: mot de passe incorrect même si le proxy renvoie 502)
  const payloadMessage = getErrorMessageFromPayload(data);
  if (payloadMessage) {
    return payloadMessage;
  }

  // 2. Erreurs serveur HTTP (>= 500, ex: 502 Bad Gateway sans erreur fonctionnelle)
  if (status && status >= 500) {
    return getErrorMessageFromStatus(status, fallbackMessage) || fallbackMessage;
  }

  // 3. Erreurs clientes HTTP (4xx)
  const statusMessage = getErrorMessageFromStatus(status, fallbackMessage);
  if (statusMessage) {
    return statusMessage;
  }

  return fallbackMessage;
};

/** Contrat Access Security (TargetScopeRef, chemin hierarchy/{ref_type}) : l'agence s'écrit AGENCY. */
export const normalizeRefTypeForBackend = (refType: AccessSecurityRefType | string): AccessSecurityRefType => {
  const upper = String(refType).toUpperCase();
  if (upper === "AGENCE" || upper === "AGENCY") {
    return "AGENCY";
  }
  return refType as AccessSecurityRefType;
};

export const parseAuthError = (error: unknown): ParsedAuthError => {
  if (!axios.isAxiosError(error)) {
    const message = error instanceof Error ? error.message : "Impossible de se connecter";
    return { title: "Échec de connexion", message };
  }

  const status = error.response?.status;
  const data = error.response?.data as AccessSecurityErrorPayload | undefined;

  let rawCode = "";
  let rawDesc = "";

  if (data?.detail && typeof data.detail === "object") {
    const detailObj = data.detail as Record<string, unknown>;
    rawCode = typeof detailObj.error === "string" ? detailObj.error.trim().toLowerCase() : "";
    rawDesc = typeof detailObj.error_description === "string"
      ? detailObj.error_description.trim()
      : typeof detailObj.message === "string"
        ? detailObj.message.trim()
        : "";
  } else if (typeof data?.detail === "string") {
    rawDesc = data.detail.trim();
  } else if (typeof data?.error === "string") {
    rawCode = data.error.trim().toLowerCase();
  } else if (typeof data?.message === "string") {
    rawDesc = data.message.trim();
  }

  const rawMessage = rawDesc || rawCode || undefined;
  const lowerDesc = rawDesc.toLowerCase();

  // 1. Initialisation de mot de passe obligatoire (premier login)
  if (
    lowerDesc.includes("account is not fully set up") ||
    lowerDesc.includes("account is not fully setup") ||
    lowerDesc.includes("update_password") ||
    rawCode === "update_password"
  ) {
    return {
      title: "Mot de passe requis",
      message: "Veuillez initialiser votre mot de passe pour continuer.",
      rawMessage,
      statusCode: status,
      requiresPasswordReset: true,
    };
  }

  // 2. Erreurs fonctionnelles d'authentification Keycloak
  if (
    rawCode === "invalid_grant" ||
    lowerDesc.includes("invalid user credentials") ||
    lowerDesc.includes("invalid credentials") ||
    status === 401
  ) {
    return {
      title: "Échec de connexion",
      message: "Identifiant ou mot de passe incorrect.",
      rawMessage,
      statusCode: status,
    };
  }

  if (lowerDesc.includes("account disabled") || rawCode === "account_disabled") {
    return {
      title: "Compte désactivé",
      message: "Ce compte utilisateur est désactivé. Veuillez contacter l'administrateur.",
      rawMessage,
      statusCode: status,
    };
  }

  if (rawCode === "linked_hierarchy_entity_inactive" || lowerDesc.includes("linked_hierarchy_entity_inactive")) {
    return {
      title: "Accès refusé",
      message: "Votre structure ou agence est désactivée. Accès refusé.",
      rawMessage,
      statusCode: status,
    };
  }

  if (
    rawCode === "user_not_found_or_deleted" ||
    lowerDesc.includes("user_not_found_or_deleted") ||
    lowerDesc.includes("user not found or deleted") ||
    lowerDesc.includes("user_not_found")
  ) {
    return {
      title: "Compte introuvable ou supprimé",
      message: "Ce compte utilisateur est introuvable ou a été supprimé. L'entité ou le partenaire associé a peut-être été supprimé. Veuillez contacter votre administrateur.",
      rawMessage,
      statusCode: status,
    };
  }

  // 3. Erreurs serveur HTTP standard (sans erreur fonctionnelle Keycloak)
  if (status === 502 || status === 504) {
    return {
      title: "Service indisponible",
      message: "Le serveur est temporairement indisponible. Veuillez réessayer dans quelques instants.",
      rawMessage,
      statusCode: status,
    };
  }

  if (status === 400) {
    return {
      title: "Échec de connexion",
      message: "Données de connexion invalides. Veuillez vérifier vos informations.",
      rawMessage,
      statusCode: status,
    };
  }

  if (status === 403) {
    return {
      title: "Accès non autorisé",
      message: "Accès non autorisé. Vous n'avez pas la permission d'accéder à ce compte.",
      rawMessage,
      statusCode: status,
    };
  }

  if (status === 429) {
    return {
      title: "Trop de tentatives",
      message: "Trop de tentatives de connexion. Veuillez patienter avant de réessayer.",
      rawMessage,
      statusCode: status,
    };
  }

  if (status && status >= 500) {
    return {
      title: "Erreur serveur",
      message: "Une erreur serveur s'est produite. Veuillez réessayer ultérieurement ou contacter l'équipe technique.",
      rawMessage,
      statusCode: status,
    };
  }

  // 4. Problèmes de connectivité réseau
  const axiosMsg = String(error.message || "").toLowerCase();
  const axiosCode = String(error.code || "").toUpperCase();
  if (
    !error.response ||
    axiosCode === "ECONNABORTED" ||
    axiosCode === "ERR_NETWORK" ||
    axiosMsg.includes("network error") ||
    axiosMsg.includes("failed to fetch")
  ) {
    return {
      title: "Connexion impossible",
      message: "Impossible de contacter le serveur. Veuillez vérifier votre connexion.",
      statusCode: status,
    };
  }

  return {
    title: "Échec de connexion",
    message: rawDesc || `Erreur de connexion (HTTP ${status || "inconnu"}).`,
    rawMessage,
    statusCode: status,
  };
};

export const loginWithAccessSecurity = async (payload: LoginRequest): Promise<LoginResponse> => {
  ensureAccessSecurityConfigured();

  try {
    const { data } = await accessSecurityHttpClient.post<LoginResponse>("/v1/tokens/login", payload);
    return data;
  } catch (error) {
    const parsed = parseAuthError(error);
    throw new AccessSecurityRequestError(
      parsed.message,
      parsed.rawMessage,
      parsed.statusCode,
      parsed.title,
      parsed.requiresPasswordReset,
    );
  }
};

export const refreshAccessSecurityToken = async (
  refreshToken: string,
): Promise<RefreshTokenResponse> => {
  ensureAccessSecurityConfigured();

  try {
    const { data } = await accessSecurityHttpClient.post<RefreshTokenResponse>(
      "/v1/tokens/refresh",
      { refresh_token: refreshToken },
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de rafraichir la session"));
  }
};

export const revokeAccessSecurityToken = async (token?: string | null): Promise<void> => {
  if (!token) {
    return;
  }

  ensureAccessSecurityConfigured();

  try {
    await accessSecurityHttpClient.post("/v1/tokens/revoke", { token, refresh_token: token });
  } catch {
    // Ignore revoke errors: local logout must still complete.
  }
};

export const logoutAccessSecurityToken = async (refreshToken?: string | null): Promise<void> => {
  if (!refreshToken) {
    return;
  }

  ensureAccessSecurityConfigured();

  try {
    // Try POST /v1/tokens/logout first
    await accessSecurityHttpClient.post("/v1/tokens/logout", { refresh_token: refreshToken, token: refreshToken });
  } catch {
    try {
      // Fallback to /v1/tokens/revoke with refreshToken
      await accessSecurityHttpClient.post("/v1/tokens/revoke", { refresh_token: refreshToken, token: refreshToken });
    } catch {
      // Ignore logout/revoke errors: local logout must always complete.
    }
  }
};

export const requestAccessSecurityPasswordReset = async (
  emailOrUsername: string,
  emailHint?: string,
): Promise<PasswordResetRequestResponse> => {
  ensureAccessSecurityConfigured();

  const identifier = emailOrUsername.trim();
  const email = emailHint?.trim() || (identifier.includes("@") ? identifier : "");
  const targetEmail = email || identifier;

  try {
    const { data } = await accessSecurityHttpClient.post<PasswordResetRequestResponse>(
      `/v1/users/${encodeURIComponent(targetEmail)}/password-reset/admin`,
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'envoyer la demande de réinitialisation"));
  }
};

export const requestPasswordResetSelfService = async (
  identifier: string,
): Promise<PasswordResetRequestResponse> => {
  ensureAccessSecurityConfigured();

  const trimmed = identifier.trim();
  try {
    const { data } = await accessSecurityHttpClient.post<PasswordResetRequestResponse>(
      "/v1/users/password-reset/request",
      { username: trimmed, email: trimmed },
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'envoyer la demande de réinitialisation"));
  }
};

export const validateAccessSecurityPasswordSet = async (
  payload: PasswordSetValidateRequest,
): Promise<PasswordSetValidateResponse> => {
  ensureAccessSecurityConfigured();

  try {
    const { data } = await accessSecurityHttpClient.post<PasswordSetValidateResponse>(
      "/v1/users/password-set/validate",
      payload,
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de definir le nouveau mot de passe"));
  }
};

const compositeRolesCache = new Map<string, { data: string[]; timestamp: number }>();
const COMPOSITE_ROLES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const clearCompositeRolesCache = (): void => {
  compositeRolesCache.clear();
};

export const listClientCompositeRoles = async (clientId: string): Promise<string[]> => {
  ensureAccessSecurityConfigured();

  const cached = compositeRolesCache.get(clientId);
  if (cached && Date.now() - cached.timestamp < COMPOSITE_ROLES_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const { data } = await accessSecurityHttpClient.get<AvailableRolesResponse>(
      "/v1/users/keycloak/client-composite-roles",
      { params: { client_id: clientId } },
    );
    const roles = data.roles ?? [];
    compositeRolesCache.set(clientId, { data: roles, timestamp: Date.now() });
    return roles;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les profils"));
  }
};

export const listClientRoles = async (clientId: string): Promise<string[]> => {
  ensureAccessSecurityConfigured();

  try {
    const { data } = await accessSecurityHttpClient.get<AvailableRolesResponse>(
      "/v1/users/keycloak/client-roles",
      { params: { client_id: clientId } },
    );
    return data.roles ?? [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les actions"));
  }
};

export const createClientCompositeRole = async (
  name: string,
  clientId: string,
): Promise<KeycloakRoleResponse> => {
  ensureAccessSecurityConfigured();

  try {
    const { data } = await accessSecurityHttpClient.post<KeycloakRoleResponse>(
      "/v1/users/keycloak/client-composite-roles",
      {
        name,
        client_id: clientId,
      },
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de creer le profil"));
  }
};

export const assignPermissionsToClientCompositeRole = async (
  compositeRoleName: string,
  payload: AssignPermissionsToClientCompositeRoleRequest,
): Promise<AssignPermissionsToClientCompositeRoleResponse> => {
  ensureAccessSecurityConfigured();

  try {
    const { data } = await accessSecurityHttpClient.post<AssignPermissionsToClientCompositeRoleResponse>(
      `/v1/users/keycloak/client-composite-roles/${encodeURIComponent(compositeRoleName)}/permissions`,
      payload,
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier les habilitations du profil"));
  }
};

export const listHierarchyMembers = async (
  refType: string,
  refId: string,
  _clientId?: string,
  filters?: HierarchyMembersFilters,
): Promise<HierarchyMembersResponse> => {
  ensureAccessSecurityConfigured();

  try {
    const backendRefType = normalizeRefTypeForBackend(refType);
    const { data } = await accessSecurityHttpClient.get<HierarchyMembersResponse>(
      `/v1/users/hierarchy/${encodeURIComponent(backendRefType)}/${encodeURIComponent(refId)}/members`,
      {
        params: {
          ...filters,
        },
      },
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les utilisateurs"));
  }
};

export const createBackofficeUser = async (
  payload: CreateBackofficeUserRequest,
): Promise<CreateBackofficeUserResponse> => {
  ensureAccessSecurityConfigured();

  const requestPayload: CreateBackofficeUserRequest = {
    ...payload,
    target_scope: payload.target_scope.map((scope) => ({
      ...scope,
      ref_type: normalizeRefTypeForBackend(scope.ref_type),
    })),
  };

  try {
    const { data } = await accessSecurityHttpClient.post<CreateBackofficeUserResponse>(
      "/v1/users/backoffice",
      requestPayload,
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de creer l'utilisateur"));
  }
};

export const updateAccessSecurityUser = async (
  userId: string,
  payload: UpdateAccessSecurityUserRequest,
): Promise<UpdateAccessSecurityUserResponse> => {
  ensureAccessSecurityConfigured();

  const requestPayload: UpdateAccessSecurityUserRequest = payload.target_scope
    ? {
        ...payload,
        target_scope: payload.target_scope.map((scope) => ({
          ...scope,
          ref_type: normalizeRefTypeForBackend(scope.ref_type),
        })),
      }
    : payload;

  try {
    const { data } = await accessSecurityHttpClient.put<UpdateAccessSecurityUserResponse>(
      `/v1/users/${encodeURIComponent(userId)}`,
      requestPayload,
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier l'utilisateur"));
  }
};

export const changeAccessSecurityPassword = async (
  userId: string,
  payload: PasswordChangeRequest,
): Promise<PasswordSetValidateResponse> => {
  ensureAccessSecurityConfigured();

  try {
    const { data } = await accessSecurityHttpClient.put<PasswordSetValidateResponse>(
      `/v1/users/${encodeURIComponent(userId)}/password`,
      payload,
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de changer le mot de passe"));
  }
};

export const deleteAccessSecurityUser = async (userId: string): Promise<void> => {
  ensureAccessSecurityConfigured();

  try {
    await accessSecurityHttpClient.delete(`/v1/users/${encodeURIComponent(userId)}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer l'utilisateur"));
  }
};

export const activateAccessSecurityUser = async (userId: string): Promise<UserStatusActionResponse> => {
  ensureAccessSecurityConfigured();

  try {
    const { data } = await accessSecurityHttpClient.post<UserStatusActionResponse>(
      `/v1/users/${encodeURIComponent(userId)}/activate`,
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'activer l'utilisateur"));
  }
};

export const deactivateAccessSecurityUser = async (userId: string): Promise<UserStatusActionResponse> => {
  ensureAccessSecurityConfigured();

  try {
    const { data } = await accessSecurityHttpClient.post<UserStatusActionResponse>(
      `/v1/users/${encodeURIComponent(userId)}/deactivate`,
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de desactiver l'utilisateur"));
  }
};

// ─── Import en masse ──────────────────────────────────────────────────────────

export interface ImportBackofficeUsersFailureDetail {
  row_number: number;
  username: string;
  reason: string;
}

export interface ImportBackofficeUsersResponse {
  successful_imports: number;
  failures: number;
  failure_details: ImportBackofficeUsersFailureDetail[];
}

/**
 * Import en masse d'utilisateurs via un fichier CSV ou XLSX.
 * Endpoint: POST /v1/users/imports/backoffice (multipart/form-data)
 * @param file       Fichier .csv ou .xlsx
 * @param targetScope Scope cible (structure, produit, etc.)
 */
export const importBackofficeUsers = async (
  file: File,
  targetScope: TargetScopeRef[],
): Promise<ImportBackofficeUsersResponse> => {
  ensureAccessSecurityConfigured();

  const normalizedScope = targetScope.map((scope) => ({
    ...scope,
    ref_type: normalizeRefTypeForBackend(scope.ref_type),
  }));

  const formData = new FormData();
  formData.append("file", file);
  formData.append("target_scope", JSON.stringify(normalizedScope));

  try {
    const { data } = await accessSecurityHttpClient.post<ImportBackofficeUsersResponse>(
      "/v1/users/imports/backoffice",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'importer les utilisateurs"));
  }
};

// ─── Default Realm Users ──────────────────────────────────────────────────────

export interface DefaultRealmUser {
  user_id: string;
  username: string;
  email?: string | null;
  enabled: boolean;
}

export interface DefaultRealmUsersResponse {
  users: DefaultRealmUser[];
}

let defaultRealmUsersCache: { data: DefaultRealmUser[]; timestamp: number } | null = null;
const DEFAULT_REALM_USERS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export const fetchDefaultRealmUsers = async (): Promise<DefaultRealmUser[]> => {
  if (
    defaultRealmUsersCache &&
    Date.now() - defaultRealmUsersCache.timestamp < DEFAULT_REALM_USERS_CACHE_TTL_MS
  ) {
    return defaultRealmUsersCache.data;
  }

  try {
    const { data } = await accessSecurityHttpClient.get<DefaultRealmUsersResponse>(
      "/v1/users/keycloak/default-realm/users",
    );
    const users = data?.users ?? [];
    defaultRealmUsersCache = { data: users, timestamp: Date.now() };
    return users;
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs du realm via Gateway:", error);
    return [];
  }
};

