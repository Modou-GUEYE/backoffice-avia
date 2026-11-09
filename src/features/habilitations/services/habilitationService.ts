import axios from "axios";
import { gatewayApiBaseUrl } from "@/core/network/apiGateway";
import { attachAuthorizationHeader, attachAuthResponseInterceptor } from "@/core/network/httpClient";
import { getErrorMessage } from "@/core/network/errorUtils";
import {
  HabilitationMatrixResponse,
  HabilitationResourceRequest,
  ProfileResponse,
  UpdateHabilitationResourceRequest,
  PermissionResponse,
} from "../models/types";

const habilitationHttpClient = axios.create({
  baseURL: gatewayApiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

habilitationHttpClient.interceptors.request.use((config) => {
  attachAuthorizationHeader(config);

  // Prepend security prefix
  if (config.url?.startsWith("/v1")) {
    config.url = config.url.replace("/v1", "/api/v1/security");
  }

  if (config.method?.toLowerCase() === "get") {
    config.headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
    config.headers["Pragma"] = "no-cache";
    config.headers["Expires"] = "0";
  }
  return config;
});

attachAuthResponseInterceptor(habilitationHttpClient);

export const fetchHabilitationMatrix = async (clientId?: string): Promise<HabilitationMatrixResponse> => {
  try {
    const { data } = await habilitationHttpClient.get<HabilitationMatrixResponse>("/v1/habilitation-matrix", {
      params: clientId ? { client_id: clientId } : undefined,
    });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger la matrice des habilitations"));
  }
};

export const createProfile = async (payload: HabilitationResourceRequest): Promise<ProfileResponse> => {
  try {
    const { data } = await habilitationHttpClient.post<ProfileResponse>("/v1/habilitation-matrix/profiles", payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer le profil d'habilitation"));
  }
};

export const updateProfile = async (
  profileId: string,
  payload: UpdateHabilitationResourceRequest
): Promise<ProfileResponse> => {
  try {
    const { data } = await habilitationHttpClient.patch<ProfileResponse>(
      `/v1/habilitation-matrix/profiles/${profileId}`,
      payload
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de mettre à jour le profil d'habilitation"));
  }
};

export const replaceProfilePermissions = async (
  profileId: string,
  permissionIds: string[]
): Promise<ProfileResponse> => {
  try {
    const { data } = await habilitationHttpClient.put<ProfileResponse>(
      `/v1/habilitation-matrix/profiles/${profileId}/permissions`,
      { permission_ids: permissionIds }
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier les permissions du profil"));
  }
};

export const syncProfile = async (profileId: string): Promise<ProfileResponse> => {
  try {
    const { data } = await habilitationHttpClient.post<ProfileResponse>(
      `/v1/habilitation-matrix/profiles/${profileId}/sync`
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de synchroniser le profil avec Keycloak"));
  }
};

export const deleteProfile = async (profileId: string): Promise<void> => {
  try {
    await habilitationHttpClient.delete(`/v1/habilitation-matrix/profiles/${profileId}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer le profil"));
  }
};

export const createPermission = async (payload: HabilitationResourceRequest): Promise<PermissionResponse> => {
  try {
    const { data } = await habilitationHttpClient.post<PermissionResponse>("/v1/habilitation-matrix/permissions", payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer la permission"));
  }
};

export const updatePermission = async (
  permissionId: string,
  payload: UpdateHabilitationResourceRequest
): Promise<PermissionResponse> => {
  try {
    const { data } = await habilitationHttpClient.patch<PermissionResponse>(
      `/v1/habilitation-matrix/permissions/${permissionId}`,
      payload
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier la permission"));
  }
};

export const deletePermission = async (permissionId: string): Promise<void> => {
  try {
    await habilitationHttpClient.delete(`/v1/habilitation-matrix/permissions/${permissionId}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer la permission"));
  }
};

export const syncPermission = async (permissionId: string): Promise<PermissionResponse> => {
  try {
    const { data } = await habilitationHttpClient.post<PermissionResponse>(
      `/v1/habilitation-matrix/permissions/${permissionId}/sync`
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de synchroniser la permission"));
  }
};

