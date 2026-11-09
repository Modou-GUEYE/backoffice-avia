import { httpClient } from "@/core/network/httpClient";
import { getErrorMessage } from "@/core/network/errorUtils";
import {
  IntegrationItem,
  CreateIntegrationRequest,
  PatchIntegrationRequest,
  IntegrationOperationItem,
  CreateIntegrationOperationRequest,
  PatchIntegrationOperationRequest,
  IntegrationImportPreviewResponse,
} from "../models/workflowsTypes";

const BASE_URL = "/api/v1/packages-services/integrations";

// ==========================================
// INTEGRATIONS
// ==========================================

export const fetchIntegrations = async (): Promise<IntegrationItem[]> => {
  try {
    const { data } = await httpClient.get<IntegrationItem[]>(BASE_URL);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger la liste des intégrations"));
  }
};

export const fetchActiveIntegrations = async (): Promise<IntegrationItem[]> => {
  try {
    const items = await fetchIntegrations();
    return items.filter((item) => item.active !== false);
  } catch (error) {
    console.warn("Impossible de charger les intégrations actives:", error);
    return [];
  }
};

export const getIntegration = async (integrationId: string): Promise<IntegrationItem> => {
  try {
    const { data } = await httpClient.get<IntegrationItem>(`${BASE_URL}/${integrationId}`);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de récupérer l'intégration"));
  }
};

export const createIntegration = async (
  payload: CreateIntegrationRequest
): Promise<IntegrationItem> => {
  try {
    const { data } = await httpClient.post<IntegrationItem>(BASE_URL, payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer l'intégration"));
  }
};

export const patchIntegration = async (
  integrationId: string,
  payload: PatchIntegrationRequest
): Promise<IntegrationItem> => {
  try {
    const { data } = await httpClient.patch<IntegrationItem>(
      `${BASE_URL}/${integrationId}`,
      payload
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de mettre à jour l'intégration"));
  }
};

export const deleteIntegration = async (integrationId: string): Promise<void> => {
  try {
    await httpClient.delete(`${BASE_URL}/${integrationId}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer l'intégration"));
  }
};

// ==========================================
// OPERATIONS
// ==========================================

export const fetchIntegrationOperations = async (
  integrationId: string
): Promise<IntegrationOperationItem[]> => {
  try {
    const { data } = await httpClient.get<IntegrationOperationItem[]>(
      `${BASE_URL}/${integrationId}/operations`
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les opérations de l'intégration"));
  }
};

export const getIntegrationOperation = async (
  integrationId: string,
  operationId: string
): Promise<IntegrationOperationItem> => {
  try {
    const { data } = await httpClient.get<IntegrationOperationItem>(
      `${BASE_URL}/${integrationId}/operations/${operationId}`
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de récupérer l'opération"));
  }
};

export const createIntegrationOperation = async (
  integrationId: string,
  payload: CreateIntegrationOperationRequest
): Promise<IntegrationOperationItem> => {
  try {
    const { data } = await httpClient.post<IntegrationOperationItem>(
      `${BASE_URL}/${integrationId}/operations`,
      payload
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer l'opération d'intégration"));
  }
};

export const patchIntegrationOperation = async (
  integrationId: string,
  operationId: string,
  payload: PatchIntegrationOperationRequest
): Promise<IntegrationOperationItem> => {
  try {
    const { data } = await httpClient.patch<IntegrationOperationItem>(
      `${BASE_URL}/${integrationId}/operations/${operationId}`,
      payload
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier l'opération d'intégration"));
  }
};

export const deleteIntegrationOperation = async (
  integrationId: string,
  operationId: string
): Promise<void> => {
  try {
    await httpClient.delete(`${BASE_URL}/${integrationId}/operations/${operationId}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer l'opération d'intégration"));
  }
};

// ==========================================
// IMPORT PREVIEW
// ==========================================

export const importOperationPreview = async (
  integrationId: string,
  file: File
): Promise<IntegrationImportPreviewResponse> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await httpClient.post<IntegrationImportPreviewResponse>(
      `${BASE_URL}/${integrationId}/operations/import-preview`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'analyser le fichier de spécification"));
  }
};
