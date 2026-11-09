import { AxiosError } from "axios";
import httpClient from "@/core/network/httpClient";
import {
  CaisseCreate,
  CaisseRead,
  CaisseSummary,
  CaisseUpdate,
  CreateCaissesForAgencyInput,
  CreateCaissesForAgencyResult,
  FetchCaissesParams,
  FetchCaissesResult,
} from "../models/types";

const CAISSES_BASE_PATH = "/api/v1/organisation/caisses";

export interface CaisseServiceError {
  message: string;
  status?: number;
  details?: unknown;
}

const createCaisseServiceError = (
  message: string,
  status?: number,
  details?: unknown,
): CaisseServiceError => ({ message, status, details });

const normalizeBackendMessage = (message: string): string => {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes("request failed with status code 500") || normalized.includes("internal server error") || normalized.includes("server error")) {
    return "Le serveur a rencontré une erreur interne. Merci de réessayer dans quelques instants.";
  }

  if (
    normalized.includes("request failed with status code 502")
    || normalized.includes("request failed with status code 503")
    || normalized.includes("request failed with status code 504")
  ) {
    return "Le service est temporairement indisponible. Merci de réessayer plus tard.";
  }

  if (
    normalized.includes("request failed with status code 401")
    || normalized.includes("request failed with status code 403")
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

  return undefined;
};

export const normalizeCaisseError = (error: unknown): CaisseServiceError => {
  const axiosError = error as AxiosError<{ detail?: unknown; message?: string }>;
  const status = axiosError?.response?.status;
  const data = axiosError?.response?.data;
  const errorDescription = (data as { error_description?: unknown } | undefined)?.error_description;

  // Récupération directe du message retourné par le backend, sans mapping
  const backendMessage =
    (typeof data?.message === "string" && data.message.trim().length > 0 ? data.message.trim() : undefined) ||
    (typeof data?.detail === "string" && data.detail.trim().length > 0 ? data.detail.trim() : undefined) ||
    getDetailMessage(data?.detail) ||
    (typeof errorDescription === "string" && errorDescription.trim().length > 0 ? errorDescription.trim() : undefined);

  if (backendMessage) {
    return createCaisseServiceError(backendMessage, status, data);
  }

  const fallbackMessage = axiosError?.message || "Erreur inattendue lors de l'appel API caisse";
  return createCaisseServiceError(fallbackMessage, status, data);
};

export const extractCaisseSummary = (raw: unknown): CaisseSummary | null => {
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

export const fetchCaisses = async (params?: FetchCaissesParams): Promise<FetchCaissesResult> => {
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

    const { data } = await httpClient.get<unknown>(
      `${CAISSES_BASE_PATH}/`,
      { params: queryParams }
    );

    const items: CaisseRead[] = Array.isArray(data)
      ? (data as CaisseRead[])
      : Array.isArray((data as { items?: CaisseRead[] })?.items)
        ? (data as { items: CaisseRead[] }).items
        : [];

    const extractedSummary = extractCaisseSummary(data);
    const summary: CaisseSummary = extractedSummary ?? {
      total: 0,
      actifs: 0,
      inactifs: 0,
    };
    const total = typeof (data as { total?: number })?.total === "number"
      ? (data as { total: number }).total
      : (extractedSummary?.total ?? 0);

    return Object.assign(items, {
      items,
      total,
      summary,
    });
  } catch (error) {
    throw normalizeCaisseError(error);
  }
};

export const fetchCaisseById = async (id: string): Promise<CaisseRead> => {
  return runApiMutation(async () => {
    const { data } = await httpClient.get<CaisseRead>(`${CAISSES_BASE_PATH}/${id}`);
    return data;
  });
};

const runApiMutation = async (request: () => Promise<CaisseRead>): Promise<CaisseRead> => {
  try {
    return await request();
  } catch (error) {
    throw normalizeCaisseError(error);
  }
};

const runApiMutationList = async (request: () => Promise<FetchCaissesResult>): Promise<FetchCaissesResult> => {
  try {
    return await request();
  } catch (error) {
    throw normalizeCaisseError(error);
  }
};

const extractCaissesList = (data: unknown): FetchCaissesResult => {
  const items: CaisseRead[] = Array.isArray(data)
    ? (data as CaisseRead[])
    : Array.isArray((data as { items?: CaisseRead[] })?.items)
      ? (data as { items: CaisseRead[] }).items
      : [];

  const extractedSummary = extractCaisseSummary(data);
  const summary: CaisseSummary = extractedSummary ?? {
    total: 0,
    actifs: 0,
    inactifs: 0,
  };
  const total = typeof (data as { total?: number })?.total === "number"
    ? (data as { total: number }).total
    : (extractedSummary?.total ?? 0);

  return Object.assign(items, {
    items,
    total,
    summary,
  });
};

export const hasCaisseDuplicate = async (
  code: string,
  agencyId: string,
  excludeId?: string,
): Promise<boolean> => {
  try {
    const list = await fetchCaisses({ agency_id: agencyId });
    const normalizedCode = code.trim().toLowerCase();

    return list.items.some(
      (item) =>
        item.id !== excludeId &&
        !item.is_deleted &&
        item.code?.trim().toLowerCase() === normalizedCode,
    );
  } catch {
    return false;
  }
};

export const createCaisse = async (payload: CaisseCreate): Promise<CaisseRead> => {
  return runApiMutation(async () => {
    const { data } = await httpClient.post<CaisseRead>(`${CAISSES_BASE_PATH}/`, payload);
    return data;
  });
};

export const updateCaisse = async (id: string, payload: CaisseUpdate): Promise<CaisseRead> => {
  return runApiMutation(async () => {
    const { data } = await httpClient.patch<CaisseRead>(`${CAISSES_BASE_PATH}/${id}`, payload);
    return data;
  });
};

export const deleteCaisse = async (id: string): Promise<CaisseRead> => {
  return runApiMutation(async () => {
    const { data } = await httpClient.delete<CaisseRead>(`${CAISSES_BASE_PATH}/${id}`);
    return data;
  });
};

export const activateCaisse = async (id: string): Promise<CaisseRead> => {
  return runApiMutation(async () => {
    const { data } = await httpClient.post<CaisseRead>(`${CAISSES_BASE_PATH}/${id}/activate`);
    return data;
  });
};

export const deactivateCaisse = async (id: string): Promise<CaisseRead> => {
  return runApiMutation(async () => {
    const { data } = await httpClient.post<CaisseRead>(`${CAISSES_BASE_PATH}/${id}/deactivate`);
    return data;
  });
};

export const createCaissesForAgency = async (
  input: CreateCaissesForAgencyInput,
): Promise<CreateCaissesForAgencyResult> => {
  const created: CaisseRead[] = [];
  const skippedDuplicates: string[] = [];
  const errors: Array<{ code: string; message: string }> = [];

  for (const caisseLine of input.caisses) {
    const code = caisseLine.code.trim();
    if (!code) {
      continue;
    }

    const payload: CaisseCreate = {
      name: caisseLine.name.trim(),
      code: code || null,
      agency_id: input.agency_id,
      parent_id: input.parent_id || null,
      parent_type: input.parent_type || null,
    };

    try {
      const item = await createCaisse(payload);
      created.push(item);
    } catch (error) {
      const normalized = normalizeCaisseError(error);
      errors.push({
        code,
        message: normalized.message,
      });
    }
  }

  return {
    created,
    skippedDuplicates,
    errors,
  };
};
