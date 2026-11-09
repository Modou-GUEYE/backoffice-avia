import httpClient from "@/core/network/httpClient";
import { getErrorMessage } from "@/core/network/errorUtils";
import { rulesHttpClient } from "./feesService";
import {
  CommissionSplitResponse,
  CreateCommissionSplitRequest,
  UpdateCommissionSplitRequest,
  CatalogServiceItem,
  ServiceType,
  TenantLevel,
} from "../models/types";

export const fetchCommissions = async (params?: {
  tenant_level?: string;
  tenant_id?: string;
  service_type?: string;
}): Promise<CommissionSplitResponse[]> => {
  try {
    const { data } = await rulesHttpClient.get<{ data: CommissionSplitResponse[]; message?: string }>(
      "/commissions",
      { params }
    );
    return data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les grilles de commissions"));
  }
};

export const createCommission = async (
  payload: CreateCommissionSplitRequest
): Promise<CommissionSplitResponse> => {
  try {
    const { data } = await rulesHttpClient.post<{ data: CommissionSplitResponse; message?: string }>(
      "/commissions",
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer la répartition de commission"));
  }
};

export const updateCommission = async (
  id: string,
  payload: UpdateCommissionSplitRequest
): Promise<CommissionSplitResponse> => {
  try {
    const { data } = await rulesHttpClient.put<{ data: CommissionSplitResponse; message?: string }>(
      `/commissions/${id}`,
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier la répartition de commission"));
  }
};

export const deleteCommission = async (id: string): Promise<void> => {
  try {
    await rulesHttpClient.delete(`/commissions/${id}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer la répartition de commission"));
  }
};

export const toggleCommissionStatus = async (id: string, isActive: boolean): Promise<void> => {
  try {
    await rulesHttpClient.patch(`/commissions/${id}/status`, { is_active: isActive });
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        isActive ? "Impossible d'activer la répartition" : "Impossible de désactiver la répartition"
      )
    );
  }
};

export const fetchCommissionsConsolidated = async (): Promise<CommissionSplitResponse[]> => {
  try {
    const { data } = await rulesHttpClient.get<{ data: CommissionSplitResponse[]; message?: string }>(
      "/commissions/consolidated"
    );
    return data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger la vue consolidée des commissions"));
  }
};

export const fetchCommissionDetail = async (id: string): Promise<CommissionSplitResponse> => {
  try {
    const { data } = await rulesHttpClient.get<{ data: CommissionSplitResponse; message?: string }>(
      `/commissions/${id}`
    );
    return data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger le détail de la répartition"));
  }
};

export const fetchCatalogServices = async (): Promise<CatalogServiceItem[]> => {
  try {
    const response = await httpClient.get<{ items: CatalogServiceItem[] }>(
      "/api/v1/packages-services/services?page=1&page_size=100"
    );
    return response.data.items;
  } catch (err) {
    console.error("Erreur lors du chargement des services depuis la gateway", err);
    return [];
  }
};
