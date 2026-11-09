import httpClient from "@/core/network/httpClient";
import { useAuthStore } from "@/core/security/authStore";
import { getErrorMessage } from "@/core/network/errorUtils";
import {
  CampaignOut,
  CampaignListResponse,
  CampaignHistoryResponse,
  MediaType,
  CampaignStatus,
  CampaignTarget,
} from "../models/types";

export interface ListCampaignsParams {
  page?: number;
  limit?: number;
  status?: CampaignStatus | "";
  type?: MediaType | "";
  date_from?: string;
  date_to?: string;
  structure_id?: string;
}

const buildUserContextHeaders = (): Record<string, string> => {
  const user = useAuthStore.getState().user;
  const headers: Record<string, string> = {
    "Content-Type": "multipart/form-data",
  };
  if (user?.entityContext) headers["X-User-Structure"] = user.entityContext;
  if (user?.role) headers["X-User-Profil"] = user.role;
  if (user?.email) headers["X-User-Id"] = user.email;
  if (user?.institutionId) headers["X-User-Structure-Id"] = user.institutionId;
  return headers;
};

export const fetchCampaigns = async (params: ListCampaignsParams = {}): Promise<CampaignListResponse> => {
  const queryParams: Record<string, string | number> = {};
  if (params.page !== undefined) queryParams.page = params.page;
  if (params.limit !== undefined) queryParams.limit = params.limit;
  if (params.status) queryParams.status = params.status;
  if (params.type) queryParams.type = params.type;
  if (params.date_from) queryParams.date_from = params.date_from;
  if (params.date_to) queryParams.date_to = params.date_to;
  if (params.structure_id) queryParams.structure_id = params.structure_id;

  const { data } = await httpClient.get<CampaignListResponse>("/api/v1/diffusion/campaigns", {
    params: queryParams,
  });
  return data;
};

export const fetchCampaignById = async (id: string): Promise<CampaignOut> => {
  const { data } = await httpClient.get<CampaignOut>(`/api/v1/diffusion/campaigns/${encodeURIComponent(id)}`);
  return data;
};

export const createCampaign = async (formData: FormData): Promise<CampaignOut> => {
  try {
    const { data } = await httpClient.post<CampaignOut>("/api/v1/diffusion/campaigns", formData, {
      headers: buildUserContextHeaders(),
    });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer la publicité."));
  }
};

export const updateCampaign = async (id: string, formData: FormData): Promise<CampaignOut> => {
  try {
    const { data } = await httpClient.put<CampaignOut>(
      `/api/v1/diffusion/campaigns/${encodeURIComponent(id)}`,
      formData,
      {
        headers: buildUserContextHeaders(),
      },
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier la publicité."));
  }
};

export const suspendCampaign = async (id: string): Promise<CampaignOut> => {
  const { data } = await httpClient.patch<CampaignOut>(`/api/v1/diffusion/campaigns/${encodeURIComponent(id)}/suspend`);
  return data;
};

export const deleteCampaign = async (id: string): Promise<void> => {
  try {
    await httpClient.delete(`/api/v1/diffusion/campaigns/${encodeURIComponent(id)}`, {
      headers: buildUserContextHeaders(),
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer la publicité."));
  }
};

export const fetchCampaignHistory = async (id: string): Promise<CampaignHistoryResponse> => {
  const { data } = await httpClient.get<CampaignHistoryResponse>(
    `/api/v1/diffusion/campaigns/${encodeURIComponent(id)}/history`,
  );
  return data;
};

export const fetchMediaTypes = async (): Promise<MediaType[]> => {
  const { data } = await httpClient.get<MediaType[]>("/api/v1/diffusion/campaigns/media-types");
  return data;
};

export const fetchTargets = async (): Promise<CampaignTarget[]> => {
  const { data } = await httpClient.get<CampaignTarget[]>("/api/v1/diffusion/campaigns/targets");
  return data;
};

export const fetchClientTypes = async (): Promise<string[]> => {
  const { data } = await httpClient.get<string[]>("/api/v1/diffusion/campaigns/client-types");
  return data;
};
