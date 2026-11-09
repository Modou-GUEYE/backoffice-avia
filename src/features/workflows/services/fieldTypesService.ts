import httpClient from "@/core/network/httpClient";
import { getErrorMessage } from "@/core/network/errorUtils";
import {
  FieldTypeResponse,
  CreateFieldTypeRequest,
  UpdateFieldTypeRequest,
  FieldDefinitionResponse,
  CreateFieldDefinitionRequest,
  UpdateFieldDefinitionRequest,
  PatchFieldDefinitionRequest,
} from "../models/fieldsTypes";

// ==========================================
// FIELD TYPES
// ==========================================

export const fetchFieldTypes = async (): Promise<FieldTypeResponse[]> => {
  try {
    const { data } = await httpClient.get<FieldTypeResponse[]>("/api/v1/field-types");
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les types de champs"));
  }
};

export const fetchFieldTypeDetails = async (typeId: string): Promise<FieldTypeResponse> => {
  try {
    const { data } = await httpClient.get<FieldTypeResponse>(`/api/v1/field-types/${typeId}`);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les détails du type de champ"));
  }
};

export const createFieldType = async (payload: CreateFieldTypeRequest): Promise<FieldTypeResponse> => {
  try {
    const { data } = await httpClient.post<FieldTypeResponse>("/api/v1/field-types", payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer le type de champ"));
  }
};

export const updateFieldType = async (
  typeId: string,
  payload: UpdateFieldTypeRequest
): Promise<FieldTypeResponse> => {
  try {
    const { data } = await httpClient.put<FieldTypeResponse>(`/api/v1/field-types/${typeId}`, payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier le type de champ"));
  }
};

export const deleteFieldType = async (typeId: string): Promise<void> => {
  try {
    await httpClient.delete(`/api/v1/field-types/${typeId}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer le type de champ"));
  }
};

// ==========================================
// FIELD DEFINITIONS
// ==========================================

export const fetchFieldDefinitions = async (): Promise<FieldDefinitionResponse[]> => {
  try {
    const { data } = await httpClient.get<FieldDefinitionResponse[]>("/api/v1/field-definitions");
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les définitions de champs"));
  }
};

export const fetchFieldDefinitionDetails = async (definitionId: string): Promise<FieldDefinitionResponse> => {
  try {
    const { data } = await httpClient.get<FieldDefinitionResponse>(`/api/v1/field-definitions/${definitionId}`);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les détails de la définition"));
  }
};

export const createFieldDefinition = async (
  payload: CreateFieldDefinitionRequest
): Promise<FieldDefinitionResponse> => {
  try {
    const { data } = await httpClient.post<FieldDefinitionResponse>("/api/v1/field-definitions", payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer la définition de champ"));
  }
};

export const updateFieldDefinition = async (
  definitionId: string,
  payload: UpdateFieldDefinitionRequest
): Promise<FieldDefinitionResponse> => {
  try {
    const { data } = await httpClient.put<FieldDefinitionResponse>(
      `/api/v1/field-definitions/${definitionId}`,
      payload
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier la définition de champ"));
  }
};

export const patchFieldDefinition = async (
  definitionId: string,
  payload: PatchFieldDefinitionRequest
): Promise<FieldDefinitionResponse> => {
  try {
    const { data } = await httpClient.patch<FieldDefinitionResponse>(
      `/api/v1/field-definitions/${definitionId}`,
      payload
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier la définition de champ"));
  }
};

export const deleteFieldDefinition = async (definitionId: string): Promise<void> => {
  try {
    await httpClient.delete(`/api/v1/field-definitions/${definitionId}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer la définition de champ"));
  }
};
