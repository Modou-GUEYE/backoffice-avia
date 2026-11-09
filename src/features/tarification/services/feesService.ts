import axios from "axios";
import { attachAuthorizationHeader, attachAuthResponseInterceptor } from "@/core/network/httpClient";
import { getErrorMessage } from "@/core/network/errorUtils";
import { gatewayApiBaseUrl } from "@/core/network/apiGateway";
import {
  FeeResponse,
  CreateFeeGridRequest,
  UpdateFeeGridRequest,
  ServiceType,
  TenantLevel,
} from "../models/types";

const paramsServiceUrl = import.meta.env.VITE_PARAMS_SERVICE_URL || "";

const rulesApiBaseUrl = paramsServiceUrl
  ? `${paramsServiceUrl.replace(/\/$/, "")}/api/v1/settings`
  : gatewayApiBaseUrl && gatewayApiBaseUrl !== "/"
    ? `${gatewayApiBaseUrl}/api/v1/settings`
    : "/api/v1/settings";

export const rulesHttpClient = axios.create({
  baseURL: rulesApiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

rulesHttpClient.interceptors.request.use((config) => {
  attachAuthorizationHeader(config);
  return config;
});

attachAuthResponseInterceptor(rulesHttpClient);

export const fetchFees = async (params?: {
  tenant_level?: TenantLevel | string;
  tenant_id?: string;
  service_type?: ServiceType | string;
}): Promise<FeeResponse[]> => {
  try {
    const cleanParams: Record<string, string> = {};
    if (params?.tenant_level && params.tenant_level !== "ALL") {
      cleanParams.tenant_level = params.tenant_level;
    }
    if (params?.tenant_id && params.tenant_id.trim()) {
      cleanParams.tenant_id = params.tenant_id.trim();
    }
    if (params?.service_type && params.service_type !== "ALL") {
      cleanParams.service_type = params.service_type;
    }

    const { data } = await rulesHttpClient.get<{ data: FeeResponse[]; message?: string }>("/fees", {
      params: cleanParams,
    });
    return data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger la grille de frais"));
  }
};

export const createFee = async (payload: CreateFeeGridRequest): Promise<FeeResponse> => {
  try {
    const { data } = await rulesHttpClient.post<{ data: FeeResponse; message?: string }>("/fees", payload);
    return data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer la ligne de frais"));
  }
};

export const updateFee = async (id: string, payload: UpdateFeeGridRequest): Promise<FeeResponse> => {
  try {
    const { data } = await rulesHttpClient.put<{ data: FeeResponse; message?: string }>(`/fees/${id}`, payload);
    return data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier la ligne de frais"));
  }
};

export const deleteFee = async (id: string): Promise<void> => {
  try {
    await rulesHttpClient.delete(`/fees/${id}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer la ligne de frais"));
  }
};

export const toggleFeeStatus = async (id: string, isActive: boolean): Promise<void> => {
  try {
    await rulesHttpClient.patch(`/fees/${id}/status`, { is_active: isActive });
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        isActive ? "Impossible d'activer la ligne de frais" : "Impossible de désactiver la ligne de frais"
      )
    );
  }
};

export const fetchFeeDetail = async (id: string): Promise<FeeResponse> => {
  try {
    const { data } = await rulesHttpClient.get<{ data: FeeResponse; message?: string }>(`/fees/${id}`);
    return data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger le détail de la grille de frais"));
  }
};

export const fetchFeesConsolidated = async (): Promise<FeeResponse[]> => {
  try {
    const { data } = await rulesHttpClient.get<{ data: FeeResponse[]; message?: string }>("/fees/consolidated");
    return data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger la vue consolidée des frais"));
  }
};
