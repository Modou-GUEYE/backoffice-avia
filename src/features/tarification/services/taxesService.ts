import { getErrorMessage } from "@/core/network/errorUtils";
import { rulesHttpClient } from "./feesService";
import {
  TaxResponse,
  CreateTaxRequest,
  UpdateTaxRequest,
  ServiceType,
  TenantLevel,
} from "../models/types";

export const fetchTaxes = async (params: {
  tenant_level?: TenantLevel;
  tenant_id?: string;
  service_type?: ServiceType | string;
}): Promise<TaxResponse[]> => {
  try {
    const queryParams: Record<string, string> = {};
    if (params.tenant_level) queryParams.tenant_level = params.tenant_level;
    if (params.tenant_id && params.tenant_id.trim()) queryParams.tenant_id = params.tenant_id.trim();
    if (params.service_type && params.service_type !== "ALL") queryParams.service_type = params.service_type;

    const { data } = await rulesHttpClient.get<{ data: TaxResponse[]; message?: string }>("/taxes", {
      params: queryParams,
    });
    return data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger la grille de taxes"));
  }
};

export const createTax = async (payload: CreateTaxRequest): Promise<TaxResponse> => {
  try {
    const { data } = await rulesHttpClient.post<{ data: TaxResponse; message?: string }>("/taxes", payload);
    return data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer la taxe"));
  }
};

export const updateTax = async (id: string, payload: UpdateTaxRequest): Promise<TaxResponse> => {
  try {
    const { data } = await rulesHttpClient.put<{ data: TaxResponse; message?: string }>(`/taxes/${id}`, payload);
    return data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier la taxe"));
  }
};

export const deleteTax = async (id: string): Promise<void> => {
  try {
    await rulesHttpClient.delete(`/taxes/${id}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer la taxe"));
  }
};

export const toggleTaxStatus = async (id: string, isActive: boolean): Promise<void> => {
  try {
    await rulesHttpClient.patch(`/taxes/${id}/status`, { is_active: isActive });
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        isActive ? "Impossible d'activer la taxe" : "Impossible de désactiver la taxe"
      )
    );
  }
};

export const fetchTaxDetail = async (id: string): Promise<TaxResponse> => {
  try {
    const { data } = await rulesHttpClient.get<{ data: TaxResponse; message?: string }>(`/taxes/${id}`);
    return data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger le détail de la taxe"));
  }
};
