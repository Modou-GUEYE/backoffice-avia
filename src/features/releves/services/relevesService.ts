import httpClient from "@/core/network/httpClient";
import { gatewayApiBaseUrl } from "@/core/network/apiGateway";
import { getErrorMessage } from "@/core/network/errorUtils";
import type {
  Correction,
  CorrectionInput,
  NotificationReleve,
  Releve,
  ReleveExportFormat,
  ReleveFilters,
  ReleveGenerateInput,
  ReleveListResponse,
} from "../models/types";

const BASE_PATH = "/api/v1/reporting/releves";

const EXPORT_MIME_TYPES: Record<ReleveExportFormat, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const buildListParams = (filters: ReleveFilters): Record<string, string | number> => {
  const params: Record<string, string | number> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params[key] = value as string | number;
  });
  return params;
};

export const fetchReleves = async (filters: ReleveFilters = {}): Promise<ReleveListResponse> => {
  try {
    const { data } = await httpClient.get<ReleveListResponse>(BASE_PATH, { params: buildListParams(filters) });
    return {
      total: data?.total ?? 0,
      skip: data?.skip ?? 0,
      limit: data?.limit ?? filters.limit ?? 0,
      items: Array.isArray(data?.items) ? data.items : [],
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les relevés mensuels."));
  }
};

export const fetchReleve = async (id: string): Promise<Releve> => {
  try {
    const { data } = await httpClient.get<Releve>(`${BASE_PATH}/${id}`);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger le relevé."));
  }
};

/** Génère le relevé du mois, ou le recalcule s'il est encore en brouillon (refusé s'il est figé). */
export const generateReleve = async (input: ReleveGenerateInput): Promise<Releve> => {
  try {
    const { data } = await httpClient.post<Releve>(`${BASE_PATH}/generer`, input);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de générer le relevé."));
  }
};

/** Figement irréversible de la période. */
export const figerReleve = async (id: string, figePar: string): Promise<Releve> => {
  try {
    // base_url : comme pour la notification, lien public construit à partir de la Gateway
    const { data } = await httpClient.post<Releve>(
      `${BASE_PATH}/${id}/figer`,
      { fige_par: figePar },
      { params: { base_url: getPublicGatewayBaseUrl() } },
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de figer le relevé."));
  }
};

/** Correction d'un relevé figé, imputée sur le relevé du mois suivant. */
export const createCorrection = async (id: string, input: CorrectionInput): Promise<Correction> => {
  try {
    const { data } = await httpClient.post<Correction>(`${BASE_PATH}/${id}/corrections`, input);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'enregistrer la correction."));
  }
};

/**
 * VITE_GATEWAY_BASE_URL, rendue absolue : en développement le script `dev` la force à « / » (proxy Vite qui relaie
 * /api vers la Gateway), elle est alors complétée avec l'origine de l'application ; en production elle est déjà absolue.
 */
export const getPublicGatewayBaseUrl = (): string =>
  new URL(gatewayApiBaseUrl || "/", window.location.origin).toString().replace(/\/$/, "");

/**
 * Prépare la notification du relevé (objet, message, lien de téléchargement) sans l'envoyer.
 * base_url = base publique de la Gateway qui expose l'API, pour que le lien ne pointe pas vers une adresse interne.
 */
export const notifierReleve = async (id: string): Promise<NotificationReleve> => {
  try {
    const { data } = await httpClient.post<NotificationReleve>(`${BASE_PATH}/${id}/notifier`, undefined, {
      params: { base_url: getPublicGatewayBaseUrl() },
    });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de préparer la notification du relevé."));
  }
};

export const downloadReleveExport = async (
  releve: Pick<Releve, "id" | "structure" | "annee" | "mois">,
  format: ReleveExportFormat,
): Promise<void> => {
  try {
    const response = await httpClient.get<Blob>(`${BASE_PATH}/${releve.id}/export`, {
      params: { format },
      responseType: "blob",
      headers: { Accept: EXPORT_MIME_TYPES[format] },
    });
    const contentDisposition = response.headers["content-disposition"] as string | undefined;
    const filenameMatch = contentDisposition ? /filename\*?=(?:UTF-8'')?([^";]+)/i.exec(contentDisposition) : null;
    const filename = filenameMatch?.[1]
      ? decodeURIComponent(filenameMatch[1].replace(/["']/g, ""))
      : `releve_${releve.structure}_${releve.annee}-${String(releve.mois).padStart(2, "0")}.${format}`;

    const url = URL.createObjectURL(new Blob([response.data], { type: EXPORT_MIME_TYPES[format] }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(getErrorMessage(error, `Impossible d'exporter le relevé en ${format.toUpperCase()}.`));
  }
};
