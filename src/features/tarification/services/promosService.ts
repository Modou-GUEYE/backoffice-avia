import { getErrorMessage } from "@/core/network/errorUtils";
import { rulesHttpClient } from "./feesService";
import {
  PromoResponse,
  CreatePromoRequest,
  UpdatePromoRequest,
  ServiceType,
  TenantLevel,
} from "../models/types";

export const fetchPromos = async (params?: {
  tenant_level?: TenantLevel;
  tenant_id?: string;
  service_type?: ServiceType;
}): Promise<PromoResponse[]> => {
  try {
    const { data } = await rulesHttpClient.get<{ data: PromoResponse[]; message?: string }>(
      "/promos",
      { params }
    );
    return data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les promotions"));
  }
};

export const createPromo = async (payload: CreatePromoRequest): Promise<PromoResponse> => {
  try {
    const { data } = await rulesHttpClient.post<{ data: PromoResponse; message?: string }>(
      "/promos",
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer la promotion"));
  }
};

export const updatePromo = async (
  id: string,
  payload: UpdatePromoRequest
): Promise<PromoResponse> => {
  try {
    const { data } = await rulesHttpClient.put<{ data: PromoResponse; message?: string }>(
      `/promos/${id}`,
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier la promotion"));
  }
};

export const deletePromo = async (id: string): Promise<void> => {
  try {
    await rulesHttpClient.delete(`/promos/${id}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer la promotion"));
  }
};

export const togglePromoStatus = async (id: string, isActive: boolean): Promise<void> => {
  try {
    await rulesHttpClient.patch(`/promos/${id}/status`, { is_active: isActive });
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        isActive ? "Impossible d'activer la promotion" : "Impossible de désactiver la promotion"
      )
    );
  }
};

export const fetchPromoDetail = async (id: string): Promise<PromoResponse> => {
  try {
    const { data } = await rulesHttpClient.get<{ data: PromoResponse; message?: string }>(
      `/promos/${id}`
    );
    return data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger le détail de la promotion"));
  }
};
