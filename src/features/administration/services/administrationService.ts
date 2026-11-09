import httpClient from "@/core/network/httpClient";
import { gatewayApiBaseUrl } from "@/core/network/apiGateway";
import { getErrorMessage } from "@/core/network/errorUtils";
import { AdministrationCreate, AdministrationRead, AdministrationUpdate } from "../models/types";

const hasApiBaseUrl = Boolean(gatewayApiBaseUrl);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let fallbackAdministrations: AdministrationRead[] = [
  {
    id: "admin-avia-default",
    name: "Administration Centrale AVIA",
    code: "ADM-AVIA",
    description: "Opérateur central de la plateforme AVIA",
    contact_email: "contact@example.com",
    contact_phone: "+221 33 000 00 00",
    settings: {},
    is_active: true,
    activated_at: "2024-01-01T00:00:00Z",
    deactivated_at: null,
    is_deleted: false,
  },
];

const getApiEndpoint = (subpath = "") => {
  return `/api/v1/organisation/administrations${subpath}`;
};

export const fetchAdministrations = async (): Promise<AdministrationRead[]> => {
  if (!hasApiBaseUrl) {
    await wait(120);
    return [...fallbackAdministrations];
  }

  try {
    const { data } = await httpClient.get<AdministrationRead[]>(getApiEndpoint("/"));
    return data;
  } catch {
    try {
      const { data } = await httpClient.get<AdministrationRead[]>("/api/v1/administrations/");
      return data;
    } catch (fallbackError) {
      throw new Error(getErrorMessage(fallbackError, "Impossible de charger les administrations"));
    }
  }
};

export const fetchAdministrationById = async (id: string): Promise<AdministrationRead | null> => {
  if (!hasApiBaseUrl) {
    await wait(80);
    return fallbackAdministrations.find((item) => item.id === id) ?? null;
  }

  try {
    const { data } = await httpClient.get<AdministrationRead>(getApiEndpoint(`/${id}`));
    return data;
  } catch {
    try {
      const { data } = await httpClient.get<AdministrationRead>(`/api/v1/administrations/${id}`);
      return data;
    } catch {
      return null;
    }
  }
};

export const createAdministration = async (payload: AdministrationCreate): Promise<AdministrationRead> => {
  if (!hasApiBaseUrl) {
    await wait(120);
    const created: AdministrationRead = {
      id: globalThis.crypto?.randomUUID?.() ?? `fallback-administration-${Date.now()}`,
      name: payload.name,
      code: payload.code ?? "",
      description: payload.description ?? null,
      contact_email: payload.contact_email ?? null,
      contact_phone: payload.contact_phone ?? null,
      settings: payload.settings ?? null,
      is_active: true,
      activated_at: new Date().toISOString(),
      deactivated_at: null,
      is_deleted: false,
    };
    fallbackAdministrations = [created, ...fallbackAdministrations];
    return created;
  }

  try {
    const { data } = await httpClient.post<AdministrationRead>(getApiEndpoint("/"), payload);
    return data;
  } catch {
    try {
      const { data } = await httpClient.post<AdministrationRead>("/api/v1/administrations/", payload);
      return data;
    } catch (fallbackError) {
      throw new Error(getErrorMessage(fallbackError, "Impossible de créer l'administration"));
    }
  }
};

export const updateAdministration = async (
  id: string,
  payload: AdministrationUpdate,
): Promise<AdministrationRead> => {
  if (!hasApiBaseUrl) {
    await wait(120);
    const current = fallbackAdministrations.find((item) => item.id === id);
    if (!current) {
      throw new Error("Administration introuvable");
    }

    const updated: AdministrationRead = {
      ...current,
      ...payload,
    };
    fallbackAdministrations = fallbackAdministrations.map((item) => (item.id === id ? updated : item));
    return updated;
  }

  try {
    const { data } = await httpClient.patch<AdministrationRead>(getApiEndpoint(`/${id}`), payload);
    return data;
  } catch {
    try {
      const { data } = await httpClient.patch<AdministrationRead>(`/api/v1/administrations/${id}`, payload);
      return data;
    } catch (fallbackError) {
      throw new Error(getErrorMessage(fallbackError, "Impossible de modifier l'administration"));
    }
  }
};

export const toggleAdministrationStatus = async (
  id: string,
  activate: boolean,
): Promise<AdministrationRead> => {
  if (!hasApiBaseUrl) {
    await wait(120);
    const current = fallbackAdministrations.find((item) => item.id === id);
    if (!current) {
      throw new Error("Administration introuvable");
    }

    const updated: AdministrationRead = {
      ...current,
      is_active: activate,
      activated_at: activate ? new Date().toISOString() : current.activated_at,
      deactivated_at: activate ? null : new Date().toISOString(),
    };

    fallbackAdministrations = fallbackAdministrations.map((item) => (item.id === id ? updated : item));
    return updated;
  }

  try {
    const endpoint = activate
      ? getApiEndpoint(`/${id}/activate`)
      : getApiEndpoint(`/${id}/deactivate`);
    const { data } = await httpClient.post<AdministrationRead>(endpoint);
    return data;
  } catch {
    try {
      const endpoint = activate
        ? `/api/v1/administrations/${id}/activate`
        : `/api/v1/administrations/${id}/deactivate`;
      const { data } = await httpClient.post<AdministrationRead>(endpoint);
      return data;
    } catch (fallbackError) {
      throw new Error(getErrorMessage(fallbackError, "Impossible de modifier le statut de l'administration"));
    }
  }
};

export const deleteAdministration = async (id: string): Promise<void> => {
  if (!hasApiBaseUrl) {
    await wait(100);
    fallbackAdministrations = fallbackAdministrations.filter((item) => item.id !== id);
    return;
  }

  try {
    await httpClient.delete(getApiEndpoint(`/${id}`));
  } catch {
    try {
      await httpClient.delete(`/api/v1/administrations/${id}`);
    } catch (fallbackError) {
      throw new Error(getErrorMessage(fallbackError, "Impossible de supprimer l'administration"));
    }
  }
};
