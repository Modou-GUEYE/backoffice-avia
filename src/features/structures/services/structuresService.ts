import httpClient from "@/core/network/httpClient";
import axios from "axios";
import { gatewayApiBaseUrl } from "@/core/network/apiGateway";
import {
  FetchStructuresParams,
  FetchStructuresResult,
  StructureCreate,
  StructureRead,
  StructureSummary,
  StructureUpdate,
} from "../models/types";
import { AgenceRead } from "@/features/agences/models/types";
import { CaisseRead } from "@/features/caisses/models/types";

const STRUCTURES_REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 30000);

const hasApiBaseUrl = Boolean(gatewayApiBaseUrl);

const ensureApiConfigured = () => {
  if (!hasApiBaseUrl) {
    throw new Error("VITE_GATEWAY_BASE_URL est requis pour la gestion des structures");
  }
};

const stringifyForLog = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return Object.prototype.toString.call(value);
  }
};

const isTimeoutError = (error: unknown): boolean =>
  axios.isAxiosError(error) && (error.code === "ECONNABORTED" || error.message.toLowerCase().includes("timeout"));

const getMessageFromDetail = (detail: unknown): string | null => {
  if (!Array.isArray(detail) || detail.length === 0) {
    return null;
  }

  const first = detail[0] as { msg?: unknown; loc?: unknown };
  const msg = typeof first?.msg === "string" ? first.msg : null;
  const loc = Array.isArray(first?.loc)
    ? first.loc.filter((part): part is string => typeof part === "string").join(".")
    : null;

  if (msg && loc) {
    return `${loc}: ${msg}`;
  }

  return msg;
};

const getResponseDataMessage = (error: unknown): string | null => {
  if (
    typeof error !== "object"
    || error === null
    || !("response" in error)
    || typeof (error as { response?: unknown }).response !== "object"
  ) {
    return null;
  }

  const data = (error as { response?: { data?: { message?: unknown; detail?: unknown } } }).response?.data;
  if (!data) {
    return null;
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  return getMessageFromDetail(data.detail);
};

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (isTimeoutError(error)) {
    return "Délai d'attente dépassé. Vérifiez la connexion au serveur puis réessayez.";
  }

  const responseDataMessage = getResponseDataMessage(error);
  if (responseDataMessage) {
    return responseDataMessage;
  }

  if (axios.isAxiosError(error) && error.response?.data) {
    return `${fallbackMessage} - ${stringifyForLog(error.response.data)}`;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};

const logStructureRequestFailure = (
  operation: "create" | "update",
  payload: StructureCreate | StructureUpdate | FormData,
  error: unknown,
) => {
  if (!axios.isAxiosError(error)) {
    console.error(
      `[structures][${operation}] unexpected error\npayload=${stringifyForLog(payload)}\nerror=${stringifyForLog(error)}`,
    );
    return;
  }

  console.error(
    `[structures][${operation}] request failed\nstatus=${error.response?.status ?? "unknown"}`
    + `\nurl=${error.config?.url ?? "unknown"}`
    + `\npayload=${stringifyForLog(payload)}`
    + `\nresponse=${stringifyForLog(error.response?.data)}`
    + `\nmessage=${error.message}`,
  );
};

export const extractStructuresList = (raw: unknown): StructureRead[] => {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const candidates = [
      record.items,
      record.data,
      record.results,
      record.structures,
      record.content,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as StructureRead[];
      }
    }
  }
  return [];
};

export const extractStructureSummary = (raw: unknown): StructureSummary | null => {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const summary = record.summary as Record<string, unknown> | undefined;
  if (!summary || typeof summary !== "object") return null;
  return {
    total: typeof summary.total === "number" ? summary.total : Number(summary.total ?? 0),
    actifs: typeof summary.actifs === "number" ? summary.actifs : Number(summary.actifs ?? 0),
    inactifs: typeof summary.inactifs === "number" ? summary.inactifs : Number(summary.inactifs ?? 0),
  };
};

export const buildStructureFormData = (
  payload: StructureCreate | StructureUpdate,
  file?: File | null,
): FormData => {
  const formData = new FormData();
  const fileToUpload = file || payload.file || payload.logoFile;

  if (payload.name) formData.append("name", payload.name);
  if (payload.code) formData.append("code", payload.code);
  if (payload.type) formData.append("type", payload.type);
  if (payload.description) formData.append("description", payload.description);
  if (payload.legal_name) formData.append("legal_name", payload.legal_name);
  if (payload.registration_number) formData.append("registration_number", payload.registration_number);
  if (payload.address) formData.append("address", payload.address);
  if (payload.contact_email) formData.append("contact_email", payload.contact_email);
  if (payload.contact_phone) formData.append("contact_phone", payload.contact_phone);
  if (payload.product_id) formData.append("product_id", payload.product_id);
  if (payload.sender_label) formData.append("sender_label", payload.sender_label);
  if (payload.package) formData.append("package", payload.package);
  if (payload.branding_config) formData.append("branding_config", JSON.stringify(payload.branding_config));
  if (fileToUpload) {
    formData.append("file", fileToUpload);
  }
  return formData;
};

export const fetchStructures = async (
  searchOrParams?: string | FetchStructuresParams
): Promise<FetchStructuresResult> => {
  ensureApiConfigured();
  try {
    let queryParams: Record<string, unknown> = {};
    if (typeof searchOrParams === "string") {
      queryParams = {
        search: searchOrParams.trim() || undefined,
        include_inactive: true,
      };
    } else if (searchOrParams && typeof searchOrParams === "object") {
      queryParams = {
        skip: searchOrParams.skip ?? 0,
        limit: searchOrParams.limit ?? 100,
        include_inactive: searchOrParams.include_inactive ?? true,
        ...(searchOrParams.search ? { search: searchOrParams.search.trim() } : {}),
        ...(typeof searchOrParams.is_active === "boolean" ? { is_active: searchOrParams.is_active } : {}),
        ...(searchOrParams.type ? { type: searchOrParams.type } : {}),
        ...(searchOrParams.product_id ? { product_id: searchOrParams.product_id } : {}),
        ...(searchOrParams.name ? { name: searchOrParams.name.trim() } : {}),
      };
    } else {
      queryParams = {
        skip: 0,
        limit: 100,
        include_inactive: true,
      };
    }

    const { data } = await httpClient.get<unknown>("/api/v1/organisation/structures/", {
      params: queryParams,
    });
    const items = extractStructuresList(data);
    const extractedSummary = extractStructureSummary(data);
    const summary: StructureSummary = extractedSummary ?? {
      total: items.length,
      actifs: items.filter((s) => s.is_active).length,
      inactifs: items.filter((s) => !s.is_active).length,
    };
    const rawTotal = (data as { total?: unknown } | null | undefined)?.total;
    const total = typeof rawTotal === "number" ? rawTotal : items.length;

    return Object.assign(items, {
      items,
      total,
      summary,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les structures"));
  }
};

export const fetchStructureById = async (id: string): Promise<StructureRead> => {
  ensureApiConfigured();
  try {
    const { data } = await httpClient.get<StructureRead>(`/api/v1/organisation/structures/${encodeURIComponent(id)}`);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, `Impossible de charger la structure ${id}`));
  }
};

export const createStructure = async (
  payload: StructureCreate | FormData,
  file?: File | null,
): Promise<StructureRead> => {
  ensureApiConfigured();
  try {
    const fileToUpload = file || (typeof payload === "object" && !(payload instanceof FormData) && (payload.file || payload.logoFile));
    const body = typeof FormData !== "undefined" && payload instanceof FormData
      ? payload
      : fileToUpload
        ? buildStructureFormData(payload as StructureCreate, fileToUpload)
        : payload;

    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const { data } = await httpClient.post<StructureRead>("/api/v1/organisation/structures/", body, {
      timeout: STRUCTURES_REQUEST_TIMEOUT_MS,
      ...(isFormData ? { headers: { "Content-Type": "multipart/form-data" } } : {}),
    });
    return data;
  } catch (error) {
    logStructureRequestFailure("create", payload, error);
    throw new Error(getErrorMessage(error, "Impossible de créer la structure"));
  }
};

export const updateStructure = async (
  id: string,
  payload: StructureUpdate | FormData,
  file?: File | null,
): Promise<StructureRead> => {
  ensureApiConfigured();
  try {
    const fileToUpload = file || (typeof payload === "object" && !(payload instanceof FormData) && (payload.file || payload.logoFile));
    const body = typeof FormData !== "undefined" && payload instanceof FormData
      ? payload
      : fileToUpload
        ? buildStructureFormData(payload as StructureUpdate, fileToUpload)
        : payload;

    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const { data } = await httpClient.patch<StructureRead>(
      `/api/v1/organisation/structures/${encodeURIComponent(id)}`,
      body,
      {
        timeout: STRUCTURES_REQUEST_TIMEOUT_MS,
        ...(isFormData ? { headers: { "Content-Type": "multipart/form-data" } } : {}),
      }
    );
    return data;
  } catch (error) {
    logStructureRequestFailure("update", payload, error);
    throw new Error(getErrorMessage(error, "Impossible de modifier la structure"));
  }
};

export const toggleStructureStatus = async (id: string, activate: boolean): Promise<StructureRead> => {
  ensureApiConfigured();
  try {
    const endpoint = activate
      ? `/api/v1/organisation/structures/${encodeURIComponent(id)}/activate`
      : `/api/v1/organisation/structures/${encodeURIComponent(id)}/deactivate`;
    const { data } = await httpClient.post<StructureRead>(endpoint);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier le statut de la structure"));
  }
};

export const deleteStructure = async (id: string): Promise<void> => {
  ensureApiConfigured();
  try {
    await httpClient.delete(`/api/v1/organisation/structures/${encodeURIComponent(id)}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer la structure"));
  }
};

export const archiveStructure = async (id: string): Promise<StructureRead | void> => {
  return deleteStructure(id);
};

export const fetchStructureAgencies = async (
  id: string,
  params?: { skip?: number; limit?: number; search?: string; city?: string; is_active?: boolean }
): Promise<AgenceRead[]> => {
  ensureApiConfigured();
  try {
    const { data } = await httpClient.get<unknown>(
      `/api/v1/organisation/structures/${encodeURIComponent(id)}/agencies`,
      { params }
    );
    if (Array.isArray(data)) return data as AgenceRead[];
    if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
      return (data as { items: AgenceRead[] }).items;
    }
    return [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les agences de la structure"));
  }
};

export const fetchStructureCaisses = async (
  id: string,
  params?: { skip?: number; limit?: number; search?: string; is_active?: boolean }
): Promise<CaisseRead[]> => {
  ensureApiConfigured();
  try {
    const { data } = await httpClient.get<unknown>(
      `/api/v1/organisation/structures/${encodeURIComponent(id)}/caisses`,
      { params }
    );
    if (Array.isArray(data)) return data as CaisseRead[];
    if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
      return (data as { items: CaisseRead[] }).items;
    }
    return [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les caisses de la structure"));
  }
};

export const fetchStructureDistributors = async (
  id: string,
  params?: { skip?: number; limit?: number; search?: string; is_active?: boolean }
): Promise<Record<string, unknown>[]> => {
  ensureApiConfigured();
  try {
    const { data } = await httpClient.get<unknown>(
      `/api/v1/organisation/structures/${encodeURIComponent(id)}/distributors`,
      { params }
    );
    if (Array.isArray(data)) return data as Record<string, unknown>[];
    if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
      return (data as { items: Record<string, unknown>[] }).items;
    }
    return [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les distributeurs de la structure"));
  }
};
