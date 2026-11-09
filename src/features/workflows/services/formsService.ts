import httpClient from "@/core/network/httpClient";
import { getErrorMessage } from "@/core/network/errorUtils";
import {
  FormResponse,
  CreateFormRequest,
  UpdateFormRequest,
  FormFieldResponse,
  CreateFormFieldRequest,
  UpdateFormFieldRequest,
} from "../models/formsTypes";

export const fetchForms = async (): Promise<FormResponse[]> => {
  try {
    const { data } = await httpClient.get<FormResponse[]>("/api/v1/forms");
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les formulaires"));
  }
};

export const createForm = async (payload: CreateFormRequest): Promise<FormResponse> => {
  try {
    const { data } = await httpClient.post<FormResponse>("/api/v1/forms", payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer le formulaire"));
  }
};

export const fetchFormDetails = async (formId: string): Promise<FormResponse> => {
  try {
    const { data } = await httpClient.get<FormResponse>(`/api/v1/forms/${formId}`);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les détails du formulaire"));
  }
};

export const updateForm = async (formId: string, payload: UpdateFormRequest): Promise<FormResponse> => {
  try {
    const { data } = await httpClient.put<FormResponse>(`/api/v1/forms/${formId}`, payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier le formulaire"));
  }
};

export const deleteForm = async (formId: string): Promise<void> => {
  try {
    await httpClient.delete(`/api/v1/forms/${formId}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer le formulaire"));
  }
};

// CHAMPS (FIELDS)
export const fetchFormFields = async (formId: string): Promise<FormFieldResponse[]> => {
  try {
    const { data } = await httpClient.get<FormFieldResponse[]>(`/api/v1/forms/${formId}/fields`);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les champs du formulaire"));
  }
};

export const createFormField = async (
  formId: string,
  payload: CreateFormFieldRequest
): Promise<FormFieldResponse> => {
  try {
    const { data } = await httpClient.post<FormFieldResponse>(`/api/v1/forms/${formId}/fields`, payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'ajouter le champ"));
  }
};

export const updateFormField = async (
  formId: string,
  fieldId: string,
  payload: UpdateFormFieldRequest
): Promise<FormFieldResponse> => {
  try {
    const { data } = await httpClient.put<FormFieldResponse>(
      `/api/v1/forms/${formId}/fields/${fieldId}`,
      payload
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier le champ"));
  }
};

export const deleteFormField = async (formId: string, fieldId: string): Promise<void> => {
  try {
    await httpClient.delete(`/api/v1/forms/${formId}/fields/${fieldId}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer le champ"));
  }
};

export const reorderFormFields = async (formId: string, orderedIds: string[]): Promise<void> => {
  try {
    await httpClient.put(`/api/v1/forms/${formId}/fields/reorder`, { ordered_ids: orderedIds });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de réordonner les champs"));
  }
};
