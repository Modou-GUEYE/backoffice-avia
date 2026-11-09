import httpClient from "@/core/network/httpClient";
import { getErrorMessage } from "@/core/network/errorUtils";
import {
  CapResponse,
  UpsertCapRequest,
  FetchCapsParams,
  ClientOverrideRequest,
  ClientCapUsage,
} from "../models/types";

interface SuccessResponse<T> {
  data: T;
  message: string;
}

// ----- GET /api/v1/settings/caps -----
export const fetchCaps = async (params?: FetchCapsParams): Promise<CapResponse[]> => {
  try {
    const cleanParams: Record<string, string> = {};
    if (params?.tenant_level) cleanParams.tenant_level = params.tenant_level;
    if (params?.tenant_id) cleanParams.tenant_id = params.tenant_id;
    if (params?.service_type) cleanParams.service_type = params.service_type;

    const { data } = await httpClient.get<SuccessResponse<CapResponse[]>>("/api/v1/settings/caps", {
      params: Object.keys(cleanParams).length > 0 ? cleanParams : undefined,
    });
    return data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les plafonds"));
  }
};

// ----- PUT /api/v1/settings/caps -----
export const upsertCap = async (payload: UpsertCapRequest): Promise<CapResponse> => {
  try {
    const cleanPayload: UpsertCapRequest = {
      ...payload,
      tenant_id: payload.tenant_level === "GLOBAL" ? null : payload.tenant_id ?? null,
    };
    const { data } = await httpClient.put<SuccessResponse<CapResponse>>("/api/v1/settings/caps", cleanPayload);
    return data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de mettre à jour le plafond"));
  }
};

// ----- DELETE /api/v1/settings/caps/{id} -----
export const deleteCap = async (id: string): Promise<void> => {
  try {
    await httpClient.delete(`/api/v1/settings/caps/${id}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer le plafond"));
  }
};

// ----- POST /api/v1/settings/caps/client/{clientId}/override -----
export const overrideClientCap = async (
  clientId: string,
  payload: ClientOverrideRequest
): Promise<void> => {
  try {
    await httpClient.post<SuccessResponse<void>>(
      `/api/v1/settings/caps/client/${encodeURIComponent(clientId)}/override`,
      payload
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'accorder la dérogation au client"));
  }
};

// ----- GET /api/v1/settings/caps/client/{clientId} -----
export const fetchClientCapUsage = async (
  clientId: string,
  structureId: string
): Promise<ClientCapUsage[]> => {
  try {
    const { data } = await httpClient.get<SuccessResponse<ClientCapUsage[]>>(
      `/api/v1/settings/caps/client/${encodeURIComponent(clientId)}/usage`,
      {
        params: {
          structure_id: structureId,
        },
      }
    );
    return data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger la consommation cumulée du client"));
  }
};
