import httpClient from "@/core/network/httpClient";
import {
  Partenaire,
  PartenaireSummary,
  PointDeVente,
  PointDeVenteCreate,
  PointDeVenteUpdate,
  FetchPointsDeVenteParams,
  ServicePartenaire,
  CanalService,
  CatalogServiceItem,
  FetchCatalogServicesParams,
  PartnerResponse,
  PartnerServicesResponse,
} from "../models/types";
import { institutionApiUrl } from "./institutionApi";

const asRecord = (value: unknown): Record<string, unknown> =>
  (value && typeof value === "object" ? (value as Record<string, unknown>) : {});

const asString = (value: unknown): string | null => (typeof value === "string" ? value : null);
const asStringArray = (value: unknown): string[] =>
(Array.isArray(value)
  ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  : []);

const mapApiPointDeVenteToUi = (raw: unknown): PointDeVente => {
  const r = asRecord(raw);
  return {
    id: asString(r.id) ?? "",
    code: asString(r.code) ?? undefined,
    name: asString(r.name) ?? asString(r.libelle) ?? "",
    libelle: asString(r.libelle) ?? asString(r.name) ?? "",
    adresse: asString(r.adresse) ?? undefined,
    telephone: asString(r.telephone) ?? undefined,
    partnerId: asString(r.partner_id) ?? "",
    statut: r.is_active === false ? "inactif" : "actif",
    activatedAt: asString(r.activated_at) ?? undefined,
    deactivatedAt: asString(r.deactivated_at) ?? undefined,
  };
};

const mapApiServiceToUi = (raw: unknown): ServicePartenaire => {
  const r = asRecord(raw);
  const label = asString(r.label) ?? asString(r.name) ?? asString(r.libelle) ?? "Service";
  const statusStr = asString(r.status)?.toLowerCase();
  const isActif = statusStr ? statusStr === "active" : r.is_active !== false;

  return {
    id: asString(r.id) ?? "",
    name: label,
    libelle: label,
    code: asString(r.code),
    canal: (asString(r.canal) as CanalService) ?? "WALLET",
    statut: isActif ? "actif" : "inactif",
    partnerId: asString(r.partner_id) ?? undefined,
    activatedAt: asString(r.activated_at) ?? asString(r.creation_date) ?? undefined,
    deactivatedAt: asString(r.deactivated_at) ?? undefined,
    description: asString(r.description) ?? undefined,
    owner_code: asString(r.owner_code) ?? undefined,
    creation_date: asString(r.creation_date) ?? undefined,
  };
};

const detailArrayToMessage = (detail: unknown): string | null => {
  if (typeof detail === "string") return detail;
  if (!Array.isArray(detail)) return null;

  const details = detail
    .map((item) => {
      if (typeof item === "string") return item;
      const detailRecord = asRecord(item);
      const msg = asString(detailRecord.msg);
      const locArr = Array.isArray(detailRecord.loc)
        ? detailRecord.loc.filter((entry): entry is string => typeof entry === "string" && entry !== "body")
        : [];
      const loc = locArr.join(".");

      if (msg && loc) {
        return `${loc}: ${msg}`;
      }

      return msg ?? "";
    })
    .filter((value) => value.trim().length > 0)
    .join(" | ");

  return details || null;
};

const extractListFromResponse = (raw: unknown): unknown[] => {
  if (Array.isArray(raw)) {
    return raw;
  }

  const record = asRecord(raw);
  // PartnerPaginatedResponse retourne items en premier
  const possibleLists = [
    record.items,
    record.data,
    record.content,
    record.results,
    record.partners,
    record.services,
  ];

  for (const candidate of possibleLists) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

const toApiErrorMessage = (error: unknown, fallback: string): string => {
  const response = asRecord(asRecord(error).response);
  const data = asRecord(response.data);
  const message = data["message"] ?? data["detail"];

  if (typeof message === "string" && message.trim().length > 0) {
    return message.trim();
  }

  const details = detailArrayToMessage(data["detail"]);
  if (details) {
    return details.trim();
  }

  if (typeof asRecord(error).message === "string") {
    const msg = (asRecord(error).message as string).trim();
    if (msg) return msg;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return fallback;
};

type ApiPartnerCategory = "MARCHAND" | "FACTURIER";
type ApiPartnerEntityType = "PARTICULIER" | "ENTREPRISE";

const toUiCategorie = (apiType: string): Partenaire["categorie"] => {
  if (apiType === "FACTURIER" || apiType === "BILLER") {
    return "facturier";
  }

  return "marchand";
};

const toApiPartnerCategory = (categorie: Partenaire["categorie"]): ApiPartnerCategory =>
  (categorie === "facturier" ? "FACTURIER" : "MARCHAND");

const toUiType = (apiEntityType: string | null, partnerKind: string | null): Partenaire["type"] => {
  if (apiEntityType === "PARTICULIER" || partnerKind === "particulier") {
    return "particulier";
  }

  return "entreprise";
};

const toApiEntityType = (type: Partenaire["type"]): ApiPartnerEntityType =>
  (type === "particulier" ? "PARTICULIER" : "ENTREPRISE");

const toPartnerName = (partenaire: Partenaire): string => {
  if (partenaire.type === "entreprise") {
    return partenaire.libelle?.trim() || partenaire.login || "Entreprise";
  }
  const fullName = `${partenaire.prenom ?? ""} ${partenaire.nom ?? ""}`.trim();
  return fullName || partenaire.login || "Particulier";
};



const mapApiToPartenaire = (raw: unknown, index?: number): Partenaire => {
  const record = asRecord(raw);
  const id =
    asString(record.id) ??
    asString(record.uuid) ??
    asString(record.partner_id) ??
    asString(record.code) ??
    (record._id ? String(record._id) : null) ??
    `partner-${index ?? Date.now()}`;

  const name = asString(record.name) ?? asString(record.libelle) ?? asString(record.nom) ?? "Partenaire";
  const category = asString(record.category) ?? asString(record.type) ?? "MARCHAND";

  if (!id) {
    throw new Error("Les données du partenaire sont incomplètes (identifiant manquant)");
  }

  const entityType = asString(record.entity_type);
  const partnerKind = asString(record.partner_kind);
  const uiType: Partenaire["type"] = toUiType(entityType, partnerKind);
  const normalizedStatus = record.is_active === false ? "inactif" : "actif";
  const profils = asStringArray(record.profils);


  const pointsDeVente = Array.isArray(record.points_de_vente)
    ? record.points_de_vente.map((pdv) => mapApiPointDeVenteToUi(pdv))
    : [];

  const services = Array.isArray(record.services)
    ? record.services.map((s) => mapApiServiceToUi(s))
    : [];

  return {
    id,
    name,
    code: asString(record.code) ?? undefined,
    type: uiType,
    categorie: toUiCategorie(category),
    nom: asString(record.nom) ?? asString(record.last_name) ?? undefined,
    prenom: asString(record.prenom) ?? asString(record.first_name) ?? undefined,
    dateNaissance: asString(record.date_naissance) ?? asString(record.birth_date) ?? undefined,
    typePiece: asString(record.type_piece) ?? asString(record.id_type) ?? undefined,
    dateDelivrance: asString(record.date_delivrance) ?? asString(record.issue_date) ?? undefined,
    dateExpiration: asString(record.date_expiration) ?? asString(record.expiry_date) ?? undefined,
    libelle: asString(record.libelle) ?? asString(record.name) ?? name,
    ninea: asString(record.ninea) ?? undefined,
    numeroIdentiteFiscale:
      asString(record.num_identite_fiscale)
      ?? asString(record.numero_identite_fiscale)
      ?? asString(record.nif)
      ?? undefined,
    login: asString(record.login) ?? asString(record.username) ?? asString(record.code) ?? id,
    telephone: asString(record.telephone) ?? asString(record.phone) ?? asString(record.phone_number) ?? "",
    email: asString(record.email) ?? "",
    profil: asString(record.profil) ?? asStringArray(record.profils)[0] ?? "",
    statut: normalizedStatus,
    dateCreation: asString(record.activated_at) ?? asString(record.created_at) ?? "",
    activatedAt: asString(record.activated_at) ?? undefined,
    deactivatedAt: asString(record.deactivated_at) ?? undefined,
    pointsDeVente,
    services,
    archived: Boolean(record.is_deleted),
    hasTransactions: Boolean(record.has_transactions),
  };
};

const cleanPayload = (payload: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null),
  );

const buildCreatePayload = (
  partenaire: Partenaire,
): Record<string, unknown> => {
  const payload = {
    name: toPartnerName(partenaire),
    code: partenaire.code?.trim() || undefined,
    entity_type: toApiEntityType(partenaire.type),
    category: toApiPartnerCategory(partenaire.categorie),
    email: partenaire.email.trim(),
    telephone: partenaire.telephone.trim() || undefined,
    prenom: partenaire.type === "particulier" ? (partenaire.prenom?.trim() || undefined) : undefined,
    nom: partenaire.type === "particulier" ? (partenaire.nom?.trim() || undefined) : undefined,
    type_piece: partenaire.type === "particulier" ? (partenaire.typePiece || undefined) : undefined,
    date_naissance: partenaire.type === "particulier" ? (partenaire.dateNaissance || undefined) : undefined,
    date_delivrance: partenaire.type === "particulier" ? (partenaire.dateDelivrance || undefined) : undefined,
    date_expiration: partenaire.type === "particulier" ? (partenaire.dateExpiration || undefined) : undefined,
    libelle: partenaire.type === "entreprise" ? (partenaire.libelle?.trim() || undefined) : undefined,
    ninea: partenaire.type === "entreprise" ? (partenaire.ninea?.trim() || undefined) : undefined,
    num_identite_fiscale:
      partenaire.type === "entreprise"
        ? (partenaire.numeroIdentiteFiscale?.trim() || undefined)
        : undefined,
  };

  return cleanPayload(payload);
};

const buildUpdatePayload = (partenaire: Partenaire): Record<string, unknown> => {
  const payload = {
    name: toPartnerName(partenaire),
    code: partenaire.code?.trim() || undefined,
    entity_type: toApiEntityType(partenaire.type),
    category: toApiPartnerCategory(partenaire.categorie),
    email: partenaire.email.trim(),
    telephone: partenaire.telephone.trim() || undefined,
    prenom: partenaire.type === "particulier" ? (partenaire.prenom?.trim() || undefined) : undefined,
    nom: partenaire.type === "particulier" ? (partenaire.nom?.trim() || undefined) : undefined,
    type_piece: partenaire.type === "particulier" ? (partenaire.typePiece || undefined) : undefined,
    date_naissance: partenaire.type === "particulier" ? (partenaire.dateNaissance || undefined) : undefined,
    date_delivrance: partenaire.type === "particulier" ? (partenaire.dateDelivrance || undefined) : undefined,
    date_expiration: partenaire.type === "particulier" ? (partenaire.dateExpiration || undefined) : undefined,
    libelle: partenaire.type === "entreprise" ? (partenaire.libelle?.trim() || undefined) : undefined,
    ninea: partenaire.type === "entreprise" ? (partenaire.ninea?.trim() || undefined) : undefined,
    num_identite_fiscale:
      partenaire.type === "entreprise"
        ? (partenaire.numeroIdentiteFiscale?.trim() || undefined)
        : undefined,
  };

  return cleanPayload(payload);
};

export interface FetchPartenairesParams {
  skip?: number;
  limit?: number;
  includeInactive?: boolean;
  includeArchived?: boolean;
  category?: string;
  entityType?: string;
  isActive?: boolean;
  search?: string;
}

export interface FetchPartenairesResult {
  partenaires: Partenaire[];
  summary?: PartenaireSummary;
  total?: number;
}

const extractSummaryFromResponse = (raw: unknown): PartenaireSummary | undefined => {
  const record = asRecord(raw);
  const summaryRecord = asRecord(record.summary);

  if (
    summaryRecord.total !== undefined ||
    summaryRecord.marchands !== undefined ||
    summaryRecord.facturiers !== undefined ||
    summaryRecord.actifs !== undefined
  ) {
    return {
      total: typeof summaryRecord.total === "number" ? summaryRecord.total : Number(summaryRecord.total ?? 0),
      marchands: typeof summaryRecord.marchands === "number" ? summaryRecord.marchands : Number(summaryRecord.marchands ?? 0),
      facturiers: typeof summaryRecord.facturiers === "number" ? summaryRecord.facturiers : Number(summaryRecord.facturiers ?? 0),
      actifs: typeof summaryRecord.actifs === "number" ? summaryRecord.actifs : Number(summaryRecord.actifs ?? 0),
      inactifs: typeof summaryRecord.inactifs === "number" ? summaryRecord.inactifs : Number(summaryRecord.inactifs ?? 0),
    };
  }

  return undefined;
};

export const fetchPartenaires = async (params?: FetchPartenairesParams): Promise<FetchPartenairesResult> => {
  try {
    const skip = params?.skip ?? 0;
    const limit = params?.limit ?? 100;
    const includeInactive = params?.includeInactive ?? true;
    const includeArchived = params?.includeArchived ?? false;

      let path = `/api/v1/organisation/partners/?skip=${skip}&limit=${limit}&include_inactive=${includeInactive}&include_archived=${includeArchived}`;
      if (params?.isActive !== undefined) {
        path += `&is_active=${params.isActive}`;
      }
    if (params?.category && params.category !== "all") {
      path += `&category=${encodeURIComponent(params.category.toUpperCase())}`;
    }
    if (params?.entityType && params.entityType !== "all") {
      path += `&entity_type=${encodeURIComponent(params.entityType.toUpperCase())}`;
    }
    if (params?.search && params.search.trim().length > 0) {
      path += `&search=${encodeURIComponent(params.search.trim())}`;
    }

    const response = await httpClient.get<unknown>(institutionApiUrl(path));
    const items = extractListFromResponse(response.data);
    const summary = extractSummaryFromResponse(response.data);
    const total = typeof asRecord(response.data).total === "number" ? (asRecord(response.data).total as number) : undefined;

    return {
      partenaires: items.map((item, index) => mapApiToPartenaire(item, index)),
      summary,
      total,
    };
  } catch (error) {
    throw new Error(toApiErrorMessage(error, "Impossible de charger les partenaires"));
  }
};

export const fetchPartenaireById = async (partnerId: string): Promise<Partenaire> => {
  try {
    const response = await httpClient.get<unknown>(institutionApiUrl(`/api/v1/organisation/partners/${partnerId}`));
    return mapApiToPartenaire(response.data);
  } catch (error) {
    throw new Error(toApiErrorMessage(error, "Impossible de charger le détail du partenaire"));
  }
};


export const createPartenaire = async (
  partenaire: Partenaire,
): Promise<Partenaire> => {
  const payload = buildCreatePayload(partenaire);

  try {
    const response = await httpClient.post(institutionApiUrl("/api/v1/organisation/partners/"), payload);
    return mapApiToPartenaire(response.data);
  } catch (error) {
    throw new Error(toApiErrorMessage(error, "Impossible de créer le partenaire"));
  }
};

export const updatePartenaire = async (partenaire: Partenaire): Promise<Partenaire> => {
  const payload = buildUpdatePayload(partenaire);

  try {
    const response = await httpClient.patch(institutionApiUrl(`/api/v1/organisation/partners/${partenaire.id}`), payload);
    return mapApiToPartenaire(response.data);
  } catch (error) {
    throw new Error(toApiErrorMessage(error, "Impossible de modifier le partenaire"));
  }
};

export const togglePartenaireStatus = async (partenaire: Partenaire): Promise<Partenaire> => {
  const action = partenaire.statut === "actif" ? "deactivate" : "activate";

  try {
    const response = await httpClient.post(institutionApiUrl(`/api/v1/organisation/partners/${partenaire.id}/${action}`));
    return mapApiToPartenaire(response.data);
  } catch (error) {
    throw new Error(toApiErrorMessage(error, "Impossible de modifier le statut du partenaire"));
  }
};

export const archivePartenaire = async (partenaireId: string): Promise<void> => {
  try {
    await httpClient.delete(institutionApiUrl(`/api/v1/organisation/partners/${partenaireId}`));
  } catch (error) {
    throw new Error(toApiErrorMessage(error, "Impossible de supprimer le partenaire"));
  }
};

export const fetchPointsDeVente = async (
  partnerId: string,
  params?: FetchPointsDeVenteParams
): Promise<PointDeVente[]> => {
  try {
    const skip = params?.skip ?? 0;
    const limit = params?.limit ?? 100;
    let path = `/api/v1/organisation/partners/${encodeURIComponent(partnerId)}/points-de-vente?skip=${skip}&limit=${limit}`;
    if (params?.search && params.search.trim().length > 0) {
      path += `&search=${encodeURIComponent(params.search.trim())}`;
    }
    if (params?.isActive !== undefined) {
      path += `&is_active=${params.isActive}`;
    }
    const response = await httpClient.get<unknown[]>(institutionApiUrl(path));
    const items = Array.isArray(response.data) ? response.data : extractListFromResponse(response.data);
    return items.map(mapApiPointDeVenteToUi);
  } catch (error) {
    throw new Error(toApiErrorMessage(error, "Impossible de charger les points de vente"));
  }
};

export const createPointDeVente = async (
  partnerId: string,
  pdv: PointDeVenteCreate
): Promise<PointDeVente> => {
  try {
    const payload = cleanPayload({
      name: pdv.name || pdv.libelle,
      libelle: pdv.libelle || pdv.name,
      code: pdv.code?.trim() || undefined,
      adresse: pdv.adresse?.trim() || undefined,
      telephone: pdv.telephone?.trim() || undefined,
      partner_id: partnerId,
    });
    const response = await httpClient.post(
      institutionApiUrl(`/api/v1/organisation/partners/${encodeURIComponent(partnerId)}/points-de-vente`),
      payload
    );
    return mapApiPointDeVenteToUi(response.data);
  } catch (error) {
    throw new Error(toApiErrorMessage(error, "Impossible de créer le point de vente"));
  }
};

export const updatePointDeVente = async (
  partnerId: string,
  pdvId: string,
  pdv: PointDeVenteUpdate
): Promise<PointDeVente> => {
  try {
    const payload = cleanPayload({
      name: pdv.name?.trim() || undefined,
      libelle: pdv.libelle?.trim() || undefined,
      code: pdv.code?.trim() || undefined,
      adresse: pdv.adresse?.trim() || undefined,
      telephone: pdv.telephone?.trim() || undefined,
      is_active: pdv.is_active,
    });
    const response = await httpClient.patch(
      institutionApiUrl(
        `/api/v1/organisation/partners/${encodeURIComponent(partnerId)}/points-de-vente/${encodeURIComponent(pdvId)}`
      ),
      payload
    );
    return mapApiPointDeVenteToUi(response.data);
  } catch (error) {
    throw new Error(toApiErrorMessage(error, "Impossible de modifier le point de vente"));
  }
};

/** Active ou désactive un point de vente : POST …/points-de-vente/{pdv_id}/activate | /deactivate (sans corps). */
export const togglePointDeVenteStatus = async (
  partnerId: string,
  pdvId: string,
  activate: boolean
): Promise<PointDeVente> => {
  try {
    const response = await httpClient.post(
      institutionApiUrl(
        `/api/v1/organisation/partners/${encodeURIComponent(partnerId)}/points-de-vente/${encodeURIComponent(pdvId)}/${activate ? "activate" : "deactivate"}`
      )
    );
    return mapApiPointDeVenteToUi(response.data);
  } catch (error) {
    throw new Error(
      toApiErrorMessage(error, activate ? "Impossible d'activer le point de vente" : "Impossible de désactiver le point de vente")
    );
  }
};

export const deletePointDeVente = async (partnerId: string, pdvId: string): Promise<void> => {
  try {
    await httpClient.delete(
      institutionApiUrl(
        `/api/v1/organisation/partners/${encodeURIComponent(partnerId)}/points-de-vente/${encodeURIComponent(pdvId)}`
      )
    );
  } catch (error) {
    throw new Error(toApiErrorMessage(error, "Impossible de supprimer le point de vente"));
  }
};

export const fetchCatalogServices = async (
  params?: string | FetchCatalogServicesParams
): Promise<CatalogServiceItem[]> => {
  try {
    const ownerCode = typeof params === "string" ? params : params?.owner_code;
    const page = typeof params === "object" ? params?.page : undefined;
    const pageSize = typeof params === "object" ? params?.page_size : undefined;

    const searchParams = new URLSearchParams();
    if (ownerCode && ownerCode.trim()) {
      searchParams.set("owner_code", ownerCode.trim());
    }
    if (page !== undefined) {
      searchParams.set("page", String(page));
    }
    if (pageSize !== undefined) {
      searchParams.set("page_size", String(pageSize));
    }

    const queryString = searchParams.toString();
    const endpoint = `/api/v1/packages-services/services${queryString ? `?${queryString}` : ""}`;

    const response = await httpClient.get<unknown>(endpoint);
    const data = response.data;
    let items: unknown[] = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      if (Array.isArray(record.items)) {
        items = record.items;
      } else if (Array.isArray(record.data)) {
        items = record.data;
      }
    }

    return items.map((raw) => {
      const item = raw as Partial<CatalogServiceItem> | null | undefined;
      return {
        id: String(item?.id ?? ""),
        code: String(item?.code ?? ""),
        label: String(item?.label ?? item?.name ?? item?.code ?? ""),
        name: item?.name ? String(item.name) : undefined,
        description: item?.description ?? null,
        status: item?.status ? String(item.status) : undefined,
        owner_code: item?.owner_code ?? null,
        partner_id: item?.partner_id ?? null,
      };
    });
  } catch (err) {
    console.error("Erreur lors du chargement des services du catalogue", err);
    return [];
  }
};

export const replacePartnerServices = async (
  partnerId: string,
  serviceIds: string[]
): Promise<PartnerServicesResponse> => {
  try {
    const response = await httpClient.put<PartnerServicesResponse>(
      `/api/v1/packages-services/partners/${encodeURIComponent(partnerId)}/services`,
      { service_ids: serviceIds }
    );
    return response.data;
  } catch (error) {
    throw new Error(toApiErrorMessage(error, "Impossible d'assigner les services au partenaire"));
  }
};

export const fetchPartnerServices = async (partnerId: string): Promise<ServicePartenaire[]> => {
  try {
    const response = await httpClient.get<unknown>(
      `/api/v1/packages-services/partners/${encodeURIComponent(partnerId)}/services`
    );
    const data = response.data;
    if (Array.isArray(data)) {
      return data.map((s) => mapApiServiceToUi(s));
    }
    const record = asRecord(data);
    if (Array.isArray(record.items)) {
      return record.items.map((s) => mapApiServiceToUi(s));
    }
    if (Array.isArray(record.services)) {
      return record.services.map((s) => mapApiServiceToUi(s));
    }
    if (Array.isArray(record.service_ids)) {
      return record.service_ids.map((id: unknown) => ({
        id: String(id),
        name: String(id),
        libelle: String(id),
        canal: "WALLET" as const,
        statut: "actif" as const,
        partnerId,
      }));
    }
    return [];
  } catch (error) {
    console.warn(`[fetchPartnerServices] Could not load partner services for ${partnerId}:`, error);
    return [];
  }
};

export const fetchServicePartner = async (serviceId: string): Promise<PartnerResponse> => {
  try {
    const response = await httpClient.get<PartnerResponse>(
      `/api/v1/packages-services/services/${encodeURIComponent(serviceId)}/partner`
    );
    return response.data;
  } catch (error) {
    throw new Error(toApiErrorMessage(error, "Impossible de charger le partenaire associé au service"));
  }
};


