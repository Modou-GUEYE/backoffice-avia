import httpClient from "@/core/network/httpClient";
import { gatewayApiBaseUrl } from "@/core/network/apiGateway";
import {
  ApiProductCreate,
  ApiProductRead,
  ApiProductUpdate,
  ProduitRead,
  ProduitUtilisateur,
  ProductSummary,
} from "../models/types";
import { StructureRead } from "@/features/structures/models/types";
import { extractStructuresList } from "@/features/structures/services/structuresService";

const hasApiBaseUrl = Boolean(gatewayApiBaseUrl);

const ensureApiConfigured = () => {
  if (!hasApiBaseUrl) {
    throw new Error("VITE_GATEWAY_BASE_URL est requis pour la gestion des produits");
  }
};

type ApiAdministrationRead = {
  id: string;
  name: string;
  code: string;
};

type ApiAdministrationCreate = {
  name: string;
  code?: string | null;
  description?: string | null;
};

type ApiAdministrationListResponse =
  | ApiAdministrationRead[]
  | {
      items?: ApiAdministrationRead[];
      data?: ApiAdministrationRead[];
      results?: ApiAdministrationRead[];
    };

const normalizeBackendMessage = (message: string): string => {
  const n = message.trim().toLowerCase();
  if (n.includes("request failed with status code 500") || n.includes("internal server error") || n.includes("server error")) {
    return "Le serveur a rencontré une erreur interne. Merci de réessayer dans quelques instants.";
  }
  if (n.includes("request failed with status code 502") || n.includes("request failed with status code 503") || n.includes("request failed with status code 504")) {
    return "Le service est temporairement indisponible. Merci de réessayer plus tard.";
  }
  if (n.includes("request failed with status code 401") || n.includes("request failed with status code 403")) {
    return "Votre session a expiré ou vous n'avez pas les permissions nécessaires.";
  }
  if (n === "network error" || n.includes("failed to fetch")) {
    return "Impossible de contacter le serveur. Veuillez réessayer dans quelques instants.";
  }
  return message;
};

const getMessageFromStatus = (status: number | null | undefined): string | null => {
  if (status === 409) return "Impossible d'effectuer l'opération : conflit avec des éléments existants ou rattachés.";
  if (status === 500) return "Le serveur a rencontré une erreur interne. Merci de réessayer dans quelques instants.";
  if (status === 502 || status === 503 || status === 504) return "Le service est temporairement indisponible. Merci de réessayer plus tard.";
  if (status === 401 || status === 403) return "Votre session a expiré ou vous n'avez pas les permissions nécessaires.";
  return null;
};

const getMessageFromDetail = (detail: unknown): string | null => {
  if (typeof detail === "string" && detail.trim()) return normalizeBackendMessage(detail);
  if (!Array.isArray(detail) || detail.length === 0) return null;
  const first = detail[0] as { msg?: unknown; loc?: unknown };
  const msg = typeof first?.msg === "string" ? first.msg : null;
  if (!msg) return null;
  const loc = Array.isArray(first?.loc)
    ? first.loc.filter((p): p is string => typeof p === "string").join(".")
    : null;
  return loc ? `${loc}: ${normalizeBackendMessage(msg)}` : normalizeBackendMessage(msg);
};

const getMessageFromResponseBody = (data: unknown): string | null => {
  if (!data) return null;
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      return getMessageFromResponseBody(parsed);
    } catch {
      return normalizeBackendMessage(trimmed);
    }
  }

  if (typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return normalizeBackendMessage(record.message);
    }
    if (typeof record.detail === "string" && record.detail.trim()) {
      return normalizeBackendMessage(record.detail);
    }
    if ("detail" in record && record.detail) {
      const detailMsg = getMessageFromDetail(record.detail);
      if (detailMsg) return detailMsg;
    }
    if (typeof record.details === "string" && record.details.trim()) {
      return normalizeBackendMessage(record.details);
    }
    if ("details" in record && Array.isArray(record.details)) {
      const detailsMsg = getMessageFromDetail(record.details);
      if (detailsMsg) return detailsMsg;
    }
    if (typeof record.error === "string" && record.error.trim()) {
      if (record.error === "has_structures") {
        return "Impossible de supprimer le produit : des structures y sont rattachées.";
      }
      return normalizeBackendMessage(record.error);
    }
  }
  return null;
};

const getMessageFromError = (error: unknown, fallbackMessage: string): string | null => {
  if (!(error instanceof Error) || !error.message) return null;
  const normalized = normalizeBackendMessage(error.message);
  if (normalized !== error.message) return normalized;
  if (error.message.trim().toLowerCase().startsWith("request failed with status code")) return fallbackMessage;
  return normalized;
};

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosError = error as { response?: { status?: number; data?: unknown } };
    if (typeof axiosError.response === "object" && axiosError.response !== null) {
      const bodyMessage = getMessageFromResponseBody(axiosError.response.data);
      if (bodyMessage) return bodyMessage;
      const statusMessage = getMessageFromStatus(axiosError.response.status);
      if (statusMessage) return statusMessage;
    }
  }
  return getMessageFromError(error, fallbackMessage) ?? fallbackMessage;
};

export const mapApiProductToUi = (product: ApiProductRead): ProduitRead => {
  const settings = product.settings ?? {};
  const extractStructures = (rawSettings: Record<string, unknown>): string[] => {
    const candidates = [
      rawSettings["structuresAssociees"],
      rawSettings["structures_associees"],
      rawSettings["structure_codes"],
      rawSettings["structures"],
    ];

    const found = candidates.find((entry) => Array.isArray(entry));
    if (!Array.isArray(found)) {
      return [];
    }

    return found.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  };

  const getFirstStringField = (record: Record<string, unknown>, ...keys: string[]): string => {
    for (const key of keys) {
      const val = typeof record[key] === "string" ? record[key].trim() : "";
      if (val) return val;
    }
    return "";
  };

  const extractUtilisateurs = (rawSettings: Record<string, unknown>): ProduitUtilisateur[] => {
    const candidates = [
      rawSettings["utilisateurs"],
      rawSettings["users"],
      rawSettings["product_users"],
      rawSettings["assigned_users"],
    ];

    const rawUsers = candidates.find((entry) => Array.isArray(entry));
    if (!Array.isArray(rawUsers)) {
      return [];
    }

    return rawUsers
      .map((rawUser, index) => {
        if (typeof rawUser !== "object" || rawUser === null) return null;

        const record = rawUser as Record<string, unknown>;
        const username = getFirstStringField(record, "username", "login", "account_username");
        const email = getFirstStringField(record, "email", "mail");
        const nom = getFirstStringField(record, "nom", "last_name");
        const prenom = getFirstStringField(record, "prenom", "first_name");
        const profil = getFirstStringField(record, "profil", "role");
        const matricule = getFirstStringField(record, "matricule");

        if (!profil) return null;

        const resolvedUsername = username || email.split("@")[0] || "";
        const fallbackName = resolvedUsername.split(/[._-]+/).filter(Boolean);
        const resolvedPrenom = prenom || fallbackName[0] || "-";
        const resolvedNom = nom || fallbackName.slice(1).join(" ") || fallbackName[0] || "-";

        const id = getFirstStringField(record, "id", "user_id") || `u-${product.id}-${index}`;

        return {
          id,
          ...(resolvedUsername ? { username: resolvedUsername } : {}),
          ...(email ? { email } : {}),
          nom: resolvedNom,
          prenom: resolvedPrenom,
          matricule,
          profil,
        };
      })
      .filter((value): value is ProduitUtilisateur => value !== null);
  };

  return {
    id: product.id,
    nom: product.name,
    code: product.code ?? undefined,
    shortCode: product.short_code ?? undefined,
    description: product.description ?? undefined,
    logo: product.media_url ?? undefined,
    mediaUrl: product.media_url ?? undefined,
    media_url: product.media_url ?? null,
    libelleExpediteur: product.short_code ?? product.code ?? product.name,
    structuresAssociees: extractStructures(settings),
    statut: product.is_active ? "active" : "inactive",
    dateCreation: product.activated_at || new Date().toISOString(),
    archived: Boolean(product.is_deleted),
    utilisateurs: extractUtilisateurs(settings),
    administrationId: product.administration_id || undefined,
    brandingConfig: (product.branding_config as Record<string, unknown>) ?? {},
  };
};

const mapUiSettingsToApi = (
  produit: Pick<ProduitRead, "structuresAssociees" | "utilisateurs">,
): Record<string, unknown> => ({
  structuresAssociees: produit.structuresAssociees,
  users: produit.utilisateurs.map((user) => ({
    user_id: user.id,
    username: user.username,
    email: user.email,
    role: user.profil,
  })),
});

const extractAdministrationsList = (response: ApiAdministrationListResponse): ApiAdministrationRead[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.results)) return response.results;
  return [];
};

const getAdministrationId = async (): Promise<string> => {
  const { data } = await httpClient.get<ApiAdministrationListResponse>("/api/v1/administrations/");
  const administrations = extractAdministrationsList(data);
  const existingAdministrationId = administrations[0]?.id;
  if (existingAdministrationId) {
    return existingAdministrationId;
  }

  throw new Error("Aucune administration trouvée. Créez d'abord une administration avant de créer un produit.");
};

export interface FetchProduitsParams {
  skip?: number;
  limit?: number;
  include_inactive?: boolean;
  search?: string;
  is_active?: boolean;
  administration_id?: string;
}

export const extractProductsList = (raw: unknown): ApiProductRead[] => {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const candidates = [
      record.items,
      record.data,
      record.results,
      record.products,
      record.content,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as ApiProductRead[];
      }
    }
  }
  return [];
};

export const extractProductSummary = (raw: unknown): ProductSummary | null => {
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

export type FetchProduitsResult = ProduitRead[] & {
  items: ProduitRead[];
  total: number;
  summary: ProductSummary;
};

export const fetchProduits = async (params?: FetchProduitsParams): Promise<FetchProduitsResult> => {
  ensureApiConfigured();

  try {
    const queryParams: Record<string, unknown> = {
      skip: params?.skip ?? 0,
      limit: params?.limit ?? 100,
      include_inactive: params?.include_inactive ?? true,
    };
    if (params?.search) queryParams.search = params.search;
    if (typeof params?.is_active === "boolean") queryParams.is_active = params.is_active;
    if (params?.administration_id) queryParams.administration_id = params.administration_id;

    const { data } = await httpClient.get<unknown>("/api/v1/organisation/products/", { params: queryParams });
    const productsRaw = extractProductsList(data);
    const productsMapped = productsRaw.map(mapApiProductToUi);
    const extractedSummary = extractProductSummary(data);
    const summary: ProductSummary = extractedSummary ?? {
      total: productsMapped.length,
      actifs: productsMapped.filter((p) => p.statut === "active").length,
      inactifs: productsMapped.filter((p) => p.statut === "inactive").length,
    };
    const rawTotal = (data as { total?: unknown } | null | undefined)?.total;
    const total = typeof rawTotal === "number" ? rawTotal : productsMapped.length;

    return Object.assign(productsMapped, {
      items: productsMapped,
      total,
      summary,
    });
  } catch (error) {
    const message = getErrorMessage(error, "Impossible de charger les produits");
    if (message === "Le serveur a rencontré une erreur interne. Merci de réessayer dans quelques instants.") {
      throw new Error("Chargement des produits impossible: le backend Produits retourne une erreur 500");
    }
    throw new Error(message);
  }
};

export const fetchProduitById = async (id: string): Promise<ProduitRead> => {
  ensureApiConfigured();

  try {
    const { data } = await httpClient.get<ApiProductRead>(`/api/v1/organisation/products/${id}`);
    return mapApiProductToUi(data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les détails du produit"));
  }
};

export interface FetchProductStructuresParams {
  skip?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}

export const fetchProductStructures = async (
  id: string,
  params?: FetchProductStructuresParams,
): Promise<StructureRead[]> => {
  ensureApiConfigured();

  try {
    const queryParams: Record<string, unknown> = {
      skip: params?.skip ?? 0,
      limit: params?.limit ?? 100,
    };
    if (params?.search) queryParams.search = params.search;
    if (typeof params?.is_active === "boolean") queryParams.is_active = params.is_active;

    const { data } = await httpClient.get<unknown>(
      `/api/v1/organisation/products/${encodeURIComponent(id)}/structures`,
      { params: queryParams },
    );
    return extractStructuresList(data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les structures du produit"));
  }
};

export type ProduitCreatePayload = Omit<ProduitRead, "id" | "dateCreation" | "archived"> & {
  file?: File | null;
  logoFile?: File | null;
};

export type ProduitUpdatePayload = Partial<Omit<ProduitRead, "id" | "dateCreation" | "archived">> & {
  file?: File | null;
  logoFile?: File | null;
};

export const createProduit = async (
  payload: ProduitCreatePayload,
): Promise<ProduitRead> => {
  ensureApiConfigured();

  try {
    const administrationId = payload.administrationId || (await getAdministrationId());
    const fileToUpload = payload.file || payload.logoFile;

    let responseData: ApiProductRead;

    if (fileToUpload) {
      const formData = new FormData();
      formData.append("name", payload.nom);
      formData.append("administration_id", administrationId);
      if (payload.code) formData.append("code", payload.code);
      if (payload.description) formData.append("description", payload.description);
      if (payload.libelleExpediteur || payload.shortCode) {
        formData.append("short_code", payload.libelleExpediteur || payload.shortCode || "");
      }
      formData.append("settings", JSON.stringify(mapUiSettingsToApi(payload)));
      formData.append("branding_config", JSON.stringify(payload.brandingConfig || {}));
      formData.append("file", fileToUpload);

      const { data } = await httpClient.post<ApiProductRead>("/api/v1/organisation/products/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      responseData = data;
    } else {
      const createPayload: ApiProductCreate = {
        name: payload.nom,
        code: payload.code || null,
        description: payload.description || null,
        short_code: payload.libelleExpediteur || payload.shortCode || null,
        media_url: payload.mediaUrl || null,
        settings: mapUiSettingsToApi(payload),
        branding_config: payload.brandingConfig || {},
        administration_id: administrationId,
      };

      const { data } = await httpClient.post<ApiProductRead>("/api/v1/organisation/products/", createPayload);
      responseData = data;
    }

    const mapped = mapApiProductToUi(responseData);

    if (mapped.utilisateurs.length === 0 && payload.utilisateurs.length > 0) {
      return {
        ...mapped,
        utilisateurs: payload.utilisateurs,
      };
    }

    return mapped;
  } catch (error) {
    const fallbackMessage = error instanceof Error && error.message.trim().length > 0
      ? error.message
      : "Impossible de créer le produit";
    throw new Error(getErrorMessage(error, fallbackMessage));
  }
};

export const updateProduit = async (
  id: string,
  payload: ProduitUpdatePayload,
): Promise<ProduitRead> => {
  ensureApiConfigured();

  try {
    const fileToUpload = payload.file || payload.logoFile;
    let responseData: ApiProductRead;

    if (fileToUpload) {
      const formData = new FormData();
      if (payload.nom) formData.append("name", payload.nom);
      if (payload.code !== undefined) formData.append("code", payload.code || "");
      if (payload.description !== undefined) formData.append("description", payload.description || "");
      if (payload.libelleExpediteur || payload.shortCode) {
        formData.append("short_code", payload.libelleExpediteur || payload.shortCode || "");
      }
      if (payload.structuresAssociees !== undefined || payload.utilisateurs !== undefined) {
        formData.append("settings", JSON.stringify(mapUiSettingsToApi(payload as Pick<ProduitRead, "structuresAssociees" | "utilisateurs">)));
      }
      if (payload.brandingConfig !== undefined) {
        formData.append("branding_config", JSON.stringify(payload.brandingConfig));
      }
      if (payload.administrationId) {
        formData.append("administration_id", payload.administrationId);
      }
      formData.append("file", fileToUpload);

      const { data } = await httpClient.patch<ApiProductRead>(`/api/v1/organisation/products/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      responseData = data;
    } else {
      const updatePayload: ApiProductUpdate = {
        name: payload.nom,
        code: payload.code,
        description: payload.description,
        short_code: payload.libelleExpediteur ?? payload.shortCode,
        media_url: payload.mediaUrl !== undefined ? (payload.mediaUrl || null) : undefined,
        settings: (payload.structuresAssociees !== undefined || payload.utilisateurs !== undefined)
          ? mapUiSettingsToApi(payload as Pick<ProduitRead, "structuresAssociees" | "utilisateurs">)
          : undefined,
        branding_config: payload.brandingConfig,
        administration_id: payload.administrationId,
      };

      const { data } = await httpClient.patch<ApiProductRead>(`/api/v1/organisation/products/${id}`, updatePayload);
      responseData = data;
    }

    const mapped = mapApiProductToUi(responseData);

    if (mapped.utilisateurs.length === 0 && payload.utilisateurs && payload.utilisateurs.length > 0) {
      return {
        ...mapped,
        utilisateurs: payload.utilisateurs,
      };
    }

    return mapped;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier le produit"));
  }
};

export const toggleProduitStatus = async (id: string, activate: boolean): Promise<ProduitRead> => {
  ensureApiConfigured();

  try {
    const endpoint = activate
      ? `/api/v1/organisation/products/${id}/activate`
      : `/api/v1/organisation/products/${id}/deactivate`;
    const { data } = await httpClient.post<ApiProductRead>(endpoint);
    return mapApiProductToUi(data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier le statut du produit"));
  }
};

export const archiveProduit = async (id: string): Promise<void> => {
  ensureApiConfigured();

  try {
    await httpClient.delete(`/api/v1/organisation/products/${id}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer le produit"));
  }
};
