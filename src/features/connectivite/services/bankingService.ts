import axios from "axios";
import { attachAuthorizationHeader, attachAuthResponseInterceptor } from "@/core/network/httpClient";
import { gatewayApiBaseUrl } from "@/core/network/apiGateway";
import { getErrorMessage } from "@/core/network/errorUtils";
import {
  BankingBackend,
  BankingConfig,
  BankingEndpoint,
  BankingOperationDef,
  BankingProbeResult,
  UpsertBankingConfigRequest,
  UpsertBankingEndpointRequest,
  CreateBankingOperationRequest,
  UpdateBankingOperationRequest,
} from "../models/types";

const configApiBaseUrl = gatewayApiBaseUrl && gatewayApiBaseUrl !== "/"
  ? `${gatewayApiBaseUrl}/api/v1/config`
  : "/api/v1/config";

export const bankingHttpClient = axios.create({
  baseURL: configApiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

bankingHttpClient.interceptors.request.use((config) => {
  attachAuthorizationHeader(config);
  return config;
});

attachAuthResponseInterceptor(bankingHttpClient);

/** Erreur du service Configuration, avec le code métier renvoyé (ex. CONN_001, CONN_002). */
export class ConfigApiError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = "ConfigApiError";
  }
}

const toConfigApiError = (error: unknown, fallback: string) => {
  const code = axios.isAxiosError(error) ? (error.response?.data as { code?: unknown } | undefined)?.code : undefined;
  return new ConfigApiError(getErrorMessage(error, fallback), typeof code === "string" ? code : undefined);
};

const connectionPath = (backend: BankingBackend, structureId?: string) =>
  structureId
    ? `/structures/${encodeURIComponent(structureId)}/connections/${backend}`
    : `/defaults/connections/${backend}`;

// --- General Banking Config ---

export const fetchDefaultBankingConfig = async (backend: BankingBackend): Promise<BankingConfig> => {
  try {
    const { data } = await bankingHttpClient.get<BankingConfig>(connectionPath(backend));
    return data;
  } catch (error) {
    throw toConfigApiError(error, "Impossible de charger la configuration de connectivité par défaut");
  }
};

export const updateDefaultBankingConfig = async (
  backend: BankingBackend,
  payload: UpsertBankingConfigRequest,
): Promise<BankingConfig> => {
  try {
    const { data } = await bankingHttpClient.put<BankingConfig>(connectionPath(backend), payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier la configuration de connectivité par défaut"));
  }
};

export const fetchStructureBankingConfig = async (id: string, backend: BankingBackend): Promise<BankingConfig> => {
  try {
    const { data } = await bankingHttpClient.get<BankingConfig>(connectionPath(backend, id));
    return data;
  } catch (error) {
    throw toConfigApiError(error, "Impossible de charger la configuration de connectivité de la structure");
  }
};

export const updateStructureBankingConfig = async (
  id: string,
  backend: BankingBackend,
  payload: UpsertBankingConfigRequest,
): Promise<BankingConfig> => {
  try {
    const { data } = await bankingHttpClient.put<BankingConfig>(connectionPath(backend, id), payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier la configuration de connectivité de la structure"));
  }
};

export const deleteStructureBankingConfig = async (id: string, backend: BankingBackend): Promise<void> => {
  try {
    await bankingHttpClient.delete(connectionPath(backend, id));
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer la connexion de la structure"));
  }
};

// --- Endpoints mapping ---

/** Paramètre `payment_method`, facultatif : omis si l'opération ne dépend pas d'un moyen de paiement. */
const paymentMethodParams = (paymentMethod?: string) =>
  paymentMethod ? { params: { payment_method: paymentMethod } } : undefined;

export const fetchDefaultEndpoints = async (paymentMethod?: string): Promise<BankingEndpoint[]> => {
  try {
    const { data } = await bankingHttpClient.get<BankingEndpoint[]>(
      "/defaults/endpoints",
      paymentMethodParams(paymentMethod),
    );
    return data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger la liste des endpoints par défaut"));
  }
};

export const updateDefaultEndpoint = async (
  operation: string,
  payload: UpsertBankingEndpointRequest,
  paymentMethod?: string,
): Promise<BankingEndpoint> => {
  try {
    const { data } = await bankingHttpClient.put<BankingEndpoint>(
      `/defaults/endpoints/${encodeURIComponent(operation)}`,
      payload,
      paymentMethodParams(paymentMethod),
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier l'endpoint par défaut"));
  }
};

export const deleteDefaultEndpoint = async (operation: string, paymentMethod?: string): Promise<void> => {
  try {
    await bankingHttpClient.delete(
      `/defaults/endpoints/${encodeURIComponent(operation)}`,
      paymentMethodParams(paymentMethod),
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer l'endpoint par défaut"));
  }
};

export const fetchStructureEndpoints = async (id: string, paymentMethod?: string): Promise<BankingEndpoint[]> => {
  try {
    const { data } = await bankingHttpClient.get<BankingEndpoint[]>(
      `/structures/${encodeURIComponent(id)}/endpoints`,
      paymentMethodParams(paymentMethod),
    );
    return data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les endpoints de la structure"));
  }
};

export const updateStructureEndpoint = async (
  id: string,
  operation: string,
  payload: UpsertBankingEndpointRequest,
  paymentMethod?: string,
): Promise<BankingEndpoint> => {
  try {
    const { data } = await bankingHttpClient.put<BankingEndpoint>(
      `/structures/${encodeURIComponent(id)}/endpoints/${encodeURIComponent(operation)}`,
      payload,
      paymentMethodParams(paymentMethod),
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de surcharger l'endpoint de la structure"));
  }
};

export const deleteStructureEndpointOverride = async (
  id: string,
  operation: string,
  paymentMethod?: string,
): Promise<void> => {
  try {
    await bankingHttpClient.delete(
      `/structures/${encodeURIComponent(id)}/endpoints/${encodeURIComponent(operation)}`,
      paymentMethodParams(paymentMethod),
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer la surcharge de l'endpoint"));
  }
};

export const testStructureEndpoint = async (
  id: string,
  operation: string,
  paymentMethod?: string,
): Promise<BankingProbeResult> => {
  try {
    const { data } = await bankingHttpClient.post<BankingProbeResult>(
      `/structures/${encodeURIComponent(id)}/endpoints/${encodeURIComponent(operation)}/test`,
      undefined,
      paymentMethodParams(paymentMethod),
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de tester le câblage de l'endpoint"));
  }
};

// --- Operations catalog ---

/** Catalogue des opérations ; le filtre `backend` du contrat est facultatif. */
export const fetchBankingOperations = async (backend?: BankingBackend): Promise<BankingOperationDef[]> => {
  try {
    const { data } = await bankingHttpClient.get<BankingOperationDef[]>(
      "/operations",
      backend ? { params: { backend } } : undefined,
    );
    return data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger le catalogue des opérations"));
  }
};

export const fetchBankingOperation = async (code: string): Promise<BankingOperationDef> => {
  try {
    const { data } = await bankingHttpClient.get<BankingOperationDef>(
      `/operations/${encodeURIComponent(code)}`,
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger l'opération"));
  }
};

export const createBankingOperation = async (payload: CreateBankingOperationRequest): Promise<BankingOperationDef> => {
  try {
    const { data } = await bankingHttpClient.post<BankingOperationDef>("/operations", {
      ...payload,
      is_active: payload.is_active ?? true,
      backend: payload.backend,
    });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'ajouter l'opération au catalogue"));
  }
};

export const updateBankingOperation = async (code: string, payload: UpdateBankingOperationRequest): Promise<BankingOperationDef> => {
  try {
    const { data } = await bankingHttpClient.post<BankingOperationDef>(
      "/operations",
      { code, ...payload },
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier l'opération du catalogue"));
  }
};

export const toggleBankingOperationStatus = async (code: string, isActive: boolean): Promise<BankingOperationDef> => {
  try {
    const { data } = await bankingHttpClient.patch<BankingOperationDef>(
      `/operations/${encodeURIComponent(code)}/status`,
      { is_active: isActive },
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier le statut de l'opération"));
  }
};

export const deleteBankingOperation = async (code: string): Promise<void> => {
  try {
    await bankingHttpClient.delete(`/operations/${encodeURIComponent(code)}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de retirer l'opération du catalogue"));
  }
};
