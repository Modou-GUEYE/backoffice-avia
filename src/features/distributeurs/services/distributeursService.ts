import { AxiosError } from "axios";
import httpClient from "@/core/network/httpClient";
import type { AgenceRead } from "@/features/agences/models/types";
import type { CaisseRead } from "@/features/caisses/models/types";
import type {
  Distributeur,
  DistributorCreate,
  DistributorRead,
  DistributorSummary,
  DistributorUpdate,
  FetchDistributorsParams,
  FetchDistributorsResult,
} from "../models/types";

const DISTRIBUTORS_BASE_PATH = "/api/v1/organisation/distributors";

export interface DistributorServiceError {
  message: string;
  status?: number;
  details?: unknown;
}

const createDistributorServiceError = (
  message: string,
  status?: number,
  details?: unknown,
): DistributorServiceError => ({ message, status, details });

const normalizeBackendMessage = (message: string): string => {
  const normalized = message.trim().toLowerCase();

  if (
    normalized.includes("request failed with status code 500") ||
    normalized.includes("internal server error") ||
    normalized.includes("server error")
  ) {
    return "Le serveur a rencontré une erreur interne. Merci de réessayer dans quelques instants.";
  }

  if (
    normalized.includes("request failed with status code 502") ||
    normalized.includes("request failed with status code 503") ||
    normalized.includes("request failed with status code 504")
  ) {
    return "Le service est temporairement indisponible. Merci de réessayer plus tard.";
  }

  if (
    normalized.includes("request failed with status code 401") ||
    normalized.includes("request failed with status code 403")
  ) {
    return "Votre session a expiré ou vous n'avez pas les permissions nécessaires.";
  }

  if (normalized === "network error" || normalized.includes("failed to fetch")) {
    return "Impossible de contacter le serveur. Veuillez réessayer dans quelques instants.";
  }

  return message;
};

const getArrayDetailMessage = (detail: unknown): string | undefined => {
  if (!Array.isArray(detail) || detail.length === 0) {
    return undefined;
  }

  const first = detail[0] as { msg?: unknown; loc?: unknown };
  const msg = typeof first?.msg === "string" ? first.msg : null;
  const loc = Array.isArray(first?.loc)
    ? first.loc.filter((part): part is string => typeof part === "string").join(".")
    : null;

  if (msg && loc) {
    return `${loc}: ${msg}`;
  }

  return msg ?? undefined;
};

const getObjectDetailMessage = (detail: unknown): string | undefined => {
  if (!detail || typeof detail !== "object") {
    return undefined;
  }

  const nestedMessage = (detail as { message?: unknown }).message;
  return typeof nestedMessage === "string" && nestedMessage.trim().length > 0
    ? nestedMessage
    : undefined;
};

const getDetailMessage = (detail: unknown): string | undefined => {
  if (typeof detail === "string" && detail.trim().length > 0) {
    return detail;
  }

  return getArrayDetailMessage(detail) ?? getObjectDetailMessage(detail);
};

const getStatusMessage = (status?: number): string | undefined => {
  if (status === 500) {
    return "Le serveur a rencontré une erreur interne. Merci de réessayer dans quelques instants.";
  }
  if (status === 502 || status === 503 || status === 504) {
    return "Le service est temporairement indisponible. Merci de réessayer plus tard.";
  }
  if (status === 401 || status === 403) {
    return "Votre session a expiré ou vous n'avez pas les permissions nécessaires.";
  }
  return undefined;
};

export const normalizeDistributorError = (error: unknown): DistributorServiceError => {
  const axiosError = error as AxiosError<{ detail?: unknown; message?: string }>;
  const status = axiosError?.response?.status;
  const detail = axiosError?.response?.data?.detail;
  const messageFromDetail = getDetailMessage(detail);
  const messageFromApi = axiosError?.response?.data?.message;
  const statusMessage = getStatusMessage(status);

  const message =
    (messageFromDetail ? normalizeBackendMessage(messageFromDetail) : undefined) ||
    (messageFromApi ? normalizeBackendMessage(messageFromApi) : undefined) ||
    statusMessage ||
    (axiosError?.message ? normalizeBackendMessage(axiosError.message) : undefined) ||
    "Erreur inattendue lors de l'appel API distributeurs";

  const safeMessage =
    message.trim().toLowerCase().startsWith("request failed with status code")
      ? "Erreur inattendue lors de l'appel API distributeurs"
      : message;

  return createDistributorServiceError(safeMessage, status, detail ?? axiosError?.response?.data);
};

export const mapApiToDistributeur = (raw: Record<string, unknown> | DistributorRead): Distributeur => {
  const record = raw as Record<string, unknown>;

  const id = String(record.id ?? "");
  const name = String(record.name ?? record.nom ?? "");
  const structureId = record.structure_id ? String(record.structure_id) : undefined;
  const isActive = Boolean(record.is_active ?? record.statut === "actif");

  return {
    id,
    name,
    nom: name,
    address: record.address ? String(record.address) : null,
    contact_email: record.contact_email ? String(record.contact_email) : null,
    contact_phone: record.contact_phone ? String(record.contact_phone) : null,
    branding_config: (record.branding_config as Record<string, unknown>) ?? null,
    features_config: (record.features_config as Record<string, unknown>) ?? null,
    media_id: record.media_id ? String(record.media_id) : null,
    media_url: record.media_url ? String(record.media_url) : null,
    structure_id: structureId ?? "",
    structureId,
    is_active: isActive,
    statut: isActive ? "actif" : "inactif",
    activated_at: record.activated_at ? String(record.activated_at) : null,
    activatedAt: record.activated_at ? String(record.activated_at) : "",
    deactivated_at: record.deactivated_at ? String(record.deactivated_at) : null,
    is_deleted: Boolean(record.is_deleted ?? record.archived),
    archived: Boolean(record.is_deleted ?? record.archived),
    agencies_count: typeof record.agencies_count === "number" ? record.agencies_count : null,
    cash_registers_count: typeof record.cash_registers_count === "number" ? record.cash_registers_count : null,
    nombreAgences: typeof record.agencies_count === "number" ? record.agencies_count : null,
    nombreCaisses: typeof record.cash_registers_count === "number" ? record.cash_registers_count : null,
  };
};

export const extractDistributorSummary = (raw: unknown): DistributorSummary | null => {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const summary = (record.summary ?? record.kpis ?? record.stats) as Record<string, unknown> | undefined;
  if (!summary || typeof summary !== "object") return null;
  return {
    total: typeof summary.total === "number" ? summary.total : Number(summary.total ?? 0),
    actifs: typeof summary.actifs === "number"
      ? summary.actifs
      : typeof summary.active === "number"
        ? summary.active
        : Number(summary.actifs ?? summary.active ?? 0),
    inactifs: typeof summary.inactifs === "number"
      ? summary.inactifs
      : typeof summary.inactive === "number"
        ? summary.inactive
        : Number(summary.inactifs ?? summary.inactive ?? 0),
  };
};

export const fetchDistributeurs = async (
  params?: FetchDistributorsParams,
): Promise<FetchDistributorsResult> => {
  try {
    const queryParams: Record<string, unknown> = {
      include_inactive: true,
      ...params,
    };

    Object.keys(queryParams).forEach((key) => {
      const val = queryParams[key];
      if (val === undefined || val === null || val === "") {
        delete queryParams[key];
      }
    });

    const { data } = await httpClient.get<unknown>(`${DISTRIBUTORS_BASE_PATH}/`, {
      params: queryParams,
    });

    const rawItems: Array<Record<string, unknown>> = Array.isArray(data)
      ? (data as Array<Record<string, unknown>>)
      : Array.isArray((data as { items?: Array<Record<string, unknown>> })?.items)
        ? (data as { items: Array<Record<string, unknown>> }).items
        : [];

    const items = rawItems.map(mapApiToDistributeur);

    const summary: DistributorSummary = extractDistributorSummary(data) ?? {
      total: typeof (data as { total?: number })?.total === "number" ? (data as { total: number }).total : rawItems.length,
      actifs: 0,
      inactifs: 0,
    };

    const total =
      typeof (data as { total?: number })?.total === "number"
        ? (data as { total: number }).total
        : summary.total;

    return {
      items,
      total,
      summary,
    };
  } catch (error) {
    throw normalizeDistributorError(error);
  }
};

export const fetchDistributeurById = async (id: string): Promise<Distributeur> => {
  try {
    const { data } = await httpClient.get<Record<string, unknown>>(
      `${DISTRIBUTORS_BASE_PATH}/${encodeURIComponent(id)}`,
    );
    return mapApiToDistributeur(data);
  } catch (error) {
    throw normalizeDistributorError(error);
  }
};

export const buildDistributorFormData = (
  payload: DistributorCreate | DistributorUpdate,
  file?: File | null,
): FormData => {
  const formData = new FormData();
  const fileToUpload = file || payload.file;

  if (payload.name) formData.append("name", payload.name.trim());
  if (payload.structure_id) formData.append("structure_id", payload.structure_id.trim());
  if (payload.address !== undefined && payload.address !== null && payload.address.trim()) {
    formData.append("address", payload.address.trim());
  }
  if (payload.contact_email !== undefined && payload.contact_email !== null && payload.contact_email.trim()) {
    formData.append("contact_email", payload.contact_email.trim());
  }
  if (payload.contact_phone !== undefined && payload.contact_phone !== null && payload.contact_phone.trim()) {
    formData.append("contact_phone", payload.contact_phone.trim());
  }
  if (payload.branding_config) {
    formData.append("branding_config", JSON.stringify(payload.branding_config));
  }
  if (payload.features_config) {
    formData.append("features_config", JSON.stringify(payload.features_config));
  }
  if (payload.media_id) {
    formData.append("media_id", payload.media_id);
  }
  if (payload.media_url) {
    formData.append("media_url", payload.media_url);
  }

  if (fileToUpload) {
    formData.append("file", fileToUpload);
  }

  return formData;
};

export const createDistributeur = async (
  payload: DistributorCreate | FormData,
  file?: File | null,
): Promise<Distributeur> => {
  try {
    const fileToUpload =
      file ||
      (typeof payload === "object" && !(payload instanceof FormData) && payload.file);

    const body =
      typeof FormData !== "undefined" && payload instanceof FormData
        ? payload
        : fileToUpload
          ? buildDistributorFormData(payload as DistributorCreate, fileToUpload)
          : (() => {
            const p = payload as DistributorCreate;
            const cleanPayload: Record<string, unknown> = {
              name: p.name.trim(),
              structure_id: p.structure_id.trim(),
            };
            if (p.address?.trim()) cleanPayload.address = p.address.trim();
            if (p.contact_email?.trim()) cleanPayload.contact_email = p.contact_email.trim();
            if (p.contact_phone?.trim()) cleanPayload.contact_phone = p.contact_phone.trim();
            if (p.branding_config) cleanPayload.branding_config = p.branding_config;
            if (p.features_config) cleanPayload.features_config = p.features_config;
            if (p.media_id) cleanPayload.media_id = p.media_id;
            if (p.media_url) cleanPayload.media_url = p.media_url;
            return cleanPayload;
          })();

    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const { data } = await httpClient.post<Record<string, unknown>>(
      `${DISTRIBUTORS_BASE_PATH}/`,
      body,
      isFormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined,
    );
    return mapApiToDistributeur(data);
  } catch (error) {
    throw normalizeDistributorError(error);
  }
};

export const updateDistributeur = async (
  id: string,
  payload: DistributorUpdate | FormData,
  file?: File | null,
): Promise<Distributeur> => {
  try {
    const fileToUpload =
      file ||
      (typeof payload === "object" && !(payload instanceof FormData) && payload.file);

    const body =
      typeof FormData !== "undefined" && payload instanceof FormData
        ? payload
        : fileToUpload
          ? buildDistributorFormData(payload as DistributorUpdate, fileToUpload)
          : (() => {
            const p = payload as DistributorUpdate;
            const cleanPayload: Record<string, unknown> = {};
            if (p.name?.trim()) cleanPayload.name = p.name.trim();
            if (p.structure_id?.trim()) cleanPayload.structure_id = p.structure_id.trim();
            if (p.address !== undefined) cleanPayload.address = p.address ?? null;
            if (p.contact_email !== undefined) cleanPayload.contact_email = p.contact_email ?? null;
            if (p.contact_phone !== undefined) cleanPayload.contact_phone = p.contact_phone ?? null;
            if (p.branding_config !== undefined) cleanPayload.branding_config = p.branding_config;
            if (p.features_config !== undefined) cleanPayload.features_config = p.features_config;
            if (p.media_id !== undefined) cleanPayload.media_id = p.media_id;
            if (p.media_url !== undefined) cleanPayload.media_url = p.media_url;
            return cleanPayload;
          })();

    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const { data } = await httpClient.patch<Record<string, unknown>>(
      `${DISTRIBUTORS_BASE_PATH}/${encodeURIComponent(id)}`,
      body,
      isFormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined,
    );
    return mapApiToDistributeur(data);
  } catch (error) {
    throw normalizeDistributorError(error);
  }
};

export const deleteDistributeur = async (id: string): Promise<void> => {
  try {
    await httpClient.delete<void>(
      `${DISTRIBUTORS_BASE_PATH}/${encodeURIComponent(id)}`,
    );
  } catch (error) {
    throw normalizeDistributorError(error);
  }
};

export const activateDistributeur = async (id: string): Promise<Distributeur> => {
  try {
    const { data } = await httpClient.post<Record<string, unknown>>(
      `${DISTRIBUTORS_BASE_PATH}/${encodeURIComponent(id)}/activate`,
    );
    return mapApiToDistributeur(data);
  } catch (error) {
    throw normalizeDistributorError(error);
  }
};

export const deactivateDistributeur = async (id: string): Promise<Distributeur> => {
  try {
    const { data } = await httpClient.post<Record<string, unknown>>(
      `${DISTRIBUTORS_BASE_PATH}/${encodeURIComponent(id)}/deactivate`,
    );
    return mapApiToDistributeur(data);
  } catch (error) {
    throw normalizeDistributorError(error);
  }
};

export const fetchDistributorAgencies = async (
  id: string,
  params?: { skip?: number; limit?: number; search?: string; city?: string; is_active?: boolean },
): Promise<AgenceRead[]> => {
  try {
    const { data } = await httpClient.get<AgenceRead[]>(
      `${DISTRIBUTORS_BASE_PATH}/${encodeURIComponent(id)}/agencies`,
      { params },
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw normalizeDistributorError(error);
  }
};

export const fetchDistributorCaisses = async (
  id: string,
  params?: { skip?: number; limit?: number; search?: string; is_active?: boolean },
): Promise<CaisseRead[]> => {
  try {
    const { data } = await httpClient.get<CaisseRead[]>(
      `${DISTRIBUTORS_BASE_PATH}/${encodeURIComponent(id)}/caisses`,
      { params },
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw normalizeDistributorError(error);
  }
};
