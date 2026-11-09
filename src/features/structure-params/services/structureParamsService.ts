import { rulesHttpClient } from "@/features/parametres/services/rulesService";
import { getErrorMessage } from "@/core/network/errorUtils";
import { StructureParamsResponse, UpdateStructureParamsRequest } from "../models/types";

export const fetchStructureParams = async (id: string): Promise<StructureParamsResponse> => {
  try {
    const { data } = await rulesHttpClient.get<{ data: StructureParamsResponse }>(
      `/structures/${encodeURIComponent(id)}/params`
    );
    return data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les paramètres de la structure"));
  }
};

export const updateStructureParams = async (
  id: string,
  payload: UpdateStructureParamsRequest
): Promise<StructureParamsResponse> => {
  try {
    const { data } = await rulesHttpClient.put<{ data: StructureParamsResponse }>(
      `/structures/${encodeURIComponent(id)}/params`,
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier les paramètres de la structure"));
  }
};

export const resetStructureParams = async (id: string): Promise<StructureParamsResponse> => {
  try {
    const { data } = await rulesHttpClient.post<{ data: StructureParamsResponse }>(
      `/structures/${encodeURIComponent(id)}/params/reset`,
      {}
    );
    return data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de réinitialiser les paramètres de la structure"));
  }
};

export const fetchDefaultStructureParams = async (): Promise<StructureParamsResponse> => {
  try {
    const { data } = await rulesHttpClient.get<{ data: StructureParamsResponse }>(
      "/structures/params/defaults"
    );
    return data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les paramètres par défaut"));
  }
};

export const updateDefaultStructureParams = async (
  payload: UpdateStructureParamsRequest
): Promise<StructureParamsResponse> => {
  try {
    const { data } = await rulesHttpClient.put<{ data: StructureParamsResponse }>(
      "/structures/params/defaults",
      payload
    );
    return data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier les paramètres par défaut"));
  }
};
