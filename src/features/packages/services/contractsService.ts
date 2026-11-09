import httpClient from "@/core/network/httpClient";
import { getErrorMessage } from "@/core/network/errorUtils";
import {
  ContractDefinitionResponse,
  ContractListResponse,
  ContractActivateRequest,
} from "../models/contractsTypes";

/**
 * Récupère la liste des contrats de service déployés sur le Moteur d'Exécution.
 * Appel via API Gateway: GET /api/v1/operation/contracts/
 */
export const fetchContracts = async (
  activeOnly = false
): Promise<ContractDefinitionResponse[]> => {
  try {
    const { data } = await httpClient.get<ContractListResponse>(
      "/api/v1/operation/contracts/",
      {
        params: { active_only: activeOnly },
      }
    );
    return data.contracts || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les contrats de service"));
  }
};

/**
 * Récupère les détails d'un contrat par son service_type ou son UUID.
 * Appel via API Gateway: GET /api/v1/operation/contracts/{identifier}
 */
export const fetchContract = async (
  identifier: string
): Promise<ContractDefinitionResponse> => {
  try {
    const { data } = await httpClient.get<ContractDefinitionResponse>(
      `/api/v1/operation/contracts/${encodeURIComponent(identifier)}`
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger le contrat de service"));
  }
};

/**
 * Crée un contrat de service en envoyant directement sa définition brute (YAML ou JSON).
 * Appel via API Gateway: POST /api/v1/operation/contracts/raw
 */
export const createContractRaw = async (
  content: string,
  format: "yaml" | "json" = "yaml"
): Promise<ContractDefinitionResponse> => {
  try {
    const contentType = format === "json" ? "application/json" : "application/x-yaml";
    const body = format === "json" ? JSON.parse(content) : content;

    const { data } = await httpClient.post<ContractDefinitionResponse>(
      "/api/v1/operation/contracts/raw",
      body,
      {
        headers: { "Content-Type": contentType },
      }
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer le contrat de service"));
  }
};

/**
 * Crée un contrat de service en uploadant un fichier JSON ou YAML.
 * Appel via API Gateway: POST /api/v1/operation/contracts/
 */
export const createContractUpload = async (
  file: File
): Promise<ContractDefinitionResponse> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await httpClient.post<ContractDefinitionResponse>(
      "/api/v1/operation/contracts/",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'uploader le contrat de service"));
  }
};

/**
 * Met à jour un contrat de service existant en uploadant une nouvelle définition.
 * Appel via API Gateway: PUT /api/v1/operation/contracts/{identifier}
 */
export const updateContractUpload = async (
  identifier: string,
  file: File
): Promise<ContractDefinitionResponse> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await httpClient.put<ContractDefinitionResponse>(
      `/api/v1/operation/contracts/${encodeURIComponent(identifier)}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de mettre à jour le contrat de service"));
  }
};

/**
 * Active ou désactive un contrat sur le Moteur d'Exécution.
 * Appel via API Gateway: PATCH /api/v1/operation/contracts/{identifier}/activate
 */
export const toggleContractActivation = async (
  identifier: string,
  isActive: boolean
): Promise<ContractDefinitionResponse> => {
  try {
    const payload: ContractActivateRequest = { is_active: isActive };
    const { data } = await httpClient.patch<ContractDefinitionResponse>(
      `/api/v1/operation/contracts/${encodeURIComponent(identifier)}/activate`,
      payload
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier le statut d'activation du contrat"));
  }
};

/**
 * Supprime un contrat de service sur le Moteur d'Exécution.
 * Appel via API Gateway: DELETE /api/v1/operation/contracts/{identifier}
 */
export const deleteContract = async (
  identifier: string
): Promise<void> => {
  try {
    await httpClient.delete(
      `/api/v1/operation/contracts/${encodeURIComponent(identifier)}`
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer le contrat de service"));
  }
};

/**
 * Télécharge la définition du contrat au format YAML ou JSON.
 * Appel via API Gateway: GET /api/v1/operation/contracts/{identifier}/download?format=...
 */
export const downloadContractDefinition = async (
  identifier: string,
  format: "yaml" | "json" = "yaml"
): Promise<void> => {
  try {
    const response = await httpClient.get(
      `/api/v1/operation/contracts/${encodeURIComponent(identifier)}/download`,
      {
        params: { format },
        responseType: "blob",
      }
    );

    const blob = new Blob([response.data], {
      type: format === "json" ? "application/json" : "application/x-yaml",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contract_${identifier}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de télécharger la définition du contrat"));
  }
};
