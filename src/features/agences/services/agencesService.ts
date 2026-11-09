import httpClient from "@/core/network/httpClient";
import axios from "axios";
import { gatewayApiBaseUrl } from "@/core/network/apiGateway";
import {
  AgenceCreate,
  AgenceRead,
  AgenceUpdate,
  AgencySummary,
  FetchAgencesParams,
  FetchAgencesResult,
} from "../models/types";
import { CaisseRead } from "@/features/caisses/models/types";

const hasApiBaseUrl = Boolean(gatewayApiBaseUrl);

const ensureApiConfigured = () => {
  if (!hasApiBaseUrl) {
    throw new Error("VITE_GATEWAY_BASE_URL est requis pour la gestion des agences");
  }
};

const getErrorMessage = (error: unknown, defaultMessage: string): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const responseData = (error as { response?: { data?: { detail?: unknown; message?: string }; status?: number } }).response;
    const data = responseData?.data;

    if (typeof data?.detail === "string" && data.detail.trim()) {
      return data.detail;
    }

    if (Array.isArray(data?.detail) && data.detail.length > 0) {
      const first = data.detail[0] as { msg?: string; loc?: string[] };
      if (first?.msg) return first.msg;
    }

    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message;
    }

    if (responseData?.status === 401 || responseData?.status === 403) {
      return "Session expirée ou permissions insuffisantes.";
    }

    if (responseData?.status === 500) {
      return "Erreur interne du serveur. Merci de réessayer plus tard.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return defaultMessage;
};

export const extractAgencesList = (raw: unknown): AgenceRead[] => {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const candidates = [
      record.items,
      record.data,
      record.results,
      record.agencies,
      record.content,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as AgenceRead[];
      }
    }
  }
  return [];
};

export const extractAgencySummary = (raw: unknown): AgencySummary | null => {
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

export const fetchAgences = async (params?: FetchAgencesParams): Promise<FetchAgencesResult> => {
  ensureApiConfigured();

  try {
    const queryParams: Record<string, unknown> = {
      include_inactive: true,
      ...params,
    };

    // Remove undefined / empty values
    Object.keys(queryParams).forEach((key) => {
      const val = queryParams[key];
      if (val === undefined || val === null || val === "") {
        delete queryParams[key];
      }
    });

    const { data } = await httpClient.get<unknown>("/api/v1/organisation/agencies/", {
      params: queryParams,
    });

    const items = extractAgencesList(data);
    const extractedSummary = extractAgencySummary(data);
    const summary: AgencySummary = extractedSummary ?? {
      total: items.length,
      actifs: items.filter((a) => a.is_active).length,
      inactifs: items.filter((a) => !a.is_active).length,
    };
    const rawTotal = (data as { total?: unknown } | null | undefined)?.total;
    const total = typeof rawTotal === "number" ? rawTotal : items.length;

    return Object.assign(items, {
      items,
      total,
      summary,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les agences"));
  }
};

export const fetchAgenceById = async (id: string): Promise<AgenceRead> => {
  ensureApiConfigured();

  try {
    const { data } = await httpClient.get<AgenceRead>(`/api/v1/organisation/agencies/${encodeURIComponent(id)}`);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, `Impossible de récupérer le détail de l'agence ${id}`));
  }
};

export const createAgence = async (payload: AgenceCreate): Promise<AgenceRead> => {
  ensureApiConfigured();

  try {
    const { data } = await httpClient.post<AgenceRead>("/api/v1/organisation/agencies/", payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer l'agence"));
  }
};

export const updateAgence = async (id: string, payload: AgenceUpdate): Promise<AgenceRead> => {
  ensureApiConfigured();

  try {
    const { data } = await httpClient.patch<AgenceRead>(
      `/api/v1/organisation/agencies/${encodeURIComponent(id)}`,
      payload
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier l'agence"));
  }
};

export const toggleAgenceStatus = async (id: string, activate: boolean): Promise<AgenceRead> => {
  ensureApiConfigured();

  try {
    const endpoint = activate
      ? `/api/v1/organisation/agencies/${encodeURIComponent(id)}/activate`
      : `/api/v1/organisation/agencies/${encodeURIComponent(id)}/deactivate`;
    const { data } = await httpClient.post<AgenceRead>(endpoint);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier le statut de l'agence"));
  }
};

export const deleteAgence = async (id: string): Promise<void> => {
  ensureApiConfigured();

  try {
    await httpClient.delete(`/api/v1/organisation/agencies/${encodeURIComponent(id)}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer l'agence"));
  }
};

export const fetchAgencyCaisses = async (
  agencyId: string,
  params?: {
    skip?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
  },
): Promise<CaisseRead[]> => {
  ensureApiConfigured();

  try {
    const { data } = await httpClient.get<CaisseRead[]>(
      `/api/v1/organisation/agencies/${encodeURIComponent(agencyId)}/caisses`,
      { params },
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les caisses de l'agence"));
  }
};
