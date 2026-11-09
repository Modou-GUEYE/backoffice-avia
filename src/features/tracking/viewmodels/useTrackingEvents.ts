import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/core/security/authStore";
import { useUserPerimeter } from "@/core/security/useUserPerimeter";
import { fetchProduits } from "@/features/produits/services/produitsService";
import { fetchStructures } from "@/features/structures/services/structuresService";
import { fetchAgences } from "@/features/agences/services/agencesService";
import { fetchCaisses } from "@/features/caisses/services/caissesService";
import { fetchDistributeurs } from "@/features/distributeurs/services/distributeursService";
import {
  TrackingEvent,
  TrackingEventSummary,
  TrackingFilters,
} from "../models/types";
import {
  downloadTrackingExport,
  fetchTrackingEvents,
  fetchTrackingSources,
} from "../services/trackingService";

type CatalogRecord = Record<string, unknown>;
export type ProductCatalogItem = { id: string; nom: string };
export type StructureCatalogItem = { id: string; nom: string; productId?: string };
export type AgencyCatalogItem = {
  id: string;
  nom: string;
  structureId?: string;
  structureNom?: string;
  distributorId?: string;
  parentId?: string;
  parentType?: string;
};
export type CaisseCatalogItem = { id: string; nom: string; agenceId?: string; structureId?: string };
export type DistributorCatalogItem = { id: string; nom: string; structureId?: string };

const DEFAULT_LIMIT = 50;

export const TRACKING_SOURCE_LABELS: Record<string, string> = {
  "access-security": "Access Security",
  "package-and-payment-methods": "Package & Payment Methods",
  "gestion-institution-microservice": "Gestion Institution",
  "parametrage-metier-service": "Paramétrage métier",
  "parametrage-metier": "Paramétrage métier",
  "operations-financieres": "Opérations financières",
  diffusion: "Diffusion",
  "execution-engine": "Execution Engine",
};

const asCatalogArray = (value: unknown): CatalogRecord[] =>
  Array.isArray(value)
    ? value.filter((item): item is CatalogRecord => typeof item === "object" && item !== null)
    : [];

const asText = (value: unknown, fallback = "") => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
};

export const mapProducts = (value: unknown): ProductCatalogItem[] =>
  asCatalogArray(value).map((item) => ({
    id: asText(item.id),
    nom: asText(item.nom || item.libelle || item.code || item.id),
  }));

export const mapStructures = (value: unknown): StructureCatalogItem[] =>
  asCatalogArray(value).map((item) => ({
    id: asText(item.id),
    nom: asText(item.nom || item.name || item.id),
    productId: asText(item.productId || item.product_id) || undefined,
  }));

export const mapAgences = (value: unknown): AgencyCatalogItem[] =>
  asCatalogArray(value).map((item) => ({
    id: asText(item.id),
    nom: asText(item.nom || item.name || item.code || item.id),
    structureId: asText(item.structureId || item.structure_id || item.parent_id) || undefined,
    structureNom: asText(item.structureNom) || undefined,
    distributorId: asText(item.distributorId || item.parent_id) || undefined,
    parentId: asText(item.parent_id) || undefined,
    parentType: asText(item.parent_type).toUpperCase() || undefined,
  }));

export const mapCaisses = (value: unknown): CaisseCatalogItem[] =>
  asCatalogArray(value).map((item) => ({
    id: asText(item.id),
    nom: asText(item.nom || item.name || item.code || `Caisse ${asText(item.id)}`),
    agenceId: asText(item.agenceId || item.agence_id || item.agency_id) || undefined,
    structureId: asText(item.structureId || item.structure_id) || undefined,
  }));

export const mapDistributeurs = (value: unknown): DistributorCatalogItem[] =>
  asCatalogArray(value).map((item) => ({
    id: asText(item.id),
    nom: asText(item.nom || item.name || item.id),
    structureId: asText(item.structureId || item.structure_id) || undefined,
  }));

const detectDevice = (userAgent: string): string => {
  if (/windows/i.test(userAgent)) return "Windows";
  if (/macintosh|mac os x/i.test(userAgent)) return "macOS";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/android/i.test(userAgent)) return "Android";
  if (/linux/i.test(userAgent)) return "Linux";
  return "";
};

const detectBrowser = (userAgent: string): string => {
  if (/edg\//i.test(userAgent)) return "Edge";
  if (/opera|opr\//i.test(userAgent)) return "Opera";
  if (/chrome|crios/i.test(userAgent) && !/edg\//i.test(userAgent)) return "Chrome";
  if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) return "Safari";
  if (/firefox|fxios/i.test(userAgent)) return "Firefox";
  if (/msie|trident/i.test(userAgent)) return "Internet Explorer";
  return "";
};

/** Nom d'une entité du catalogue à partir de son id (ou de son nom) ; l'entrée est renvoyée si elle est inconnue. */
export const resolveCatalogName = (items: Array<{ id: string; nom: string }>, idOrNom?: string | null): string => {
  if (!idOrNom) return "-";
  const found = items.find((item) => item.id === idOrNom || item.nom.toLowerCase() === idOrNom.toLowerCase());
  return found ? found.nom : idOrNom;
};

export const formatTrackingDate = (dateStr?: string): string => {
  if (!dateStr || typeof dateStr !== "string") return "-";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const formatTrackingUserAgent = (ua?: string | null): string => {
  if (!ua || typeof ua !== "string" || !ua.trim()) return "-";

  const device = detectDevice(ua);
  const browser = detectBrowser(ua);

  if (browser && device) return `${browser} / ${device}`;
  if (browser) return browser;
  if (device) return device;

  return ua.length > 25 ? `${ua.slice(0, 25)}...` : ua;
};

export const getTrackingMethodBadgeClass = (method?: string | null): string => {
  switch (method?.toUpperCase()) {
    case "GET":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "POST":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "PUT":
    case "PATCH":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "DELETE":
      return "bg-rose-500/10 text-rose-600 border-rose-500/20";
    default:
      return "bg-slate-500/10 text-slate-600 border-slate-500/20";
  }
};

/** Libellés des niveaux (entite) d'un événement. */
export const TRACKING_ENTITE_LABELS: Record<string, string> = {
  ADMIN: "Administration",
  PRODUCT: "Produit",
  STRUCTURE: "Structure",
  AGENCE: "Agence",
  CAISSE: "Caisse",
  DISTRIBUTOR: "Distributeur",
};

/** Niveaux du plus haut au plus bas : un utilisateur ne filtre que sur son niveau et ceux qui en dépendent. */
const TRACKING_LEVEL_ORDER = ["ADMIN", "PRODUCT", "STRUCTURE", "DISTRIBUTOR", "AGENCE", "CAISSE"];

/** Niveaux proposés au filtre selon le profil ; null = tous (administrateur back-office ou contexte inconnu). */
export const getAllowedTrackingLevels = (perimeter: {
  isGlobalAdmin: boolean;
  isProductUser: boolean;
  isStructureUser: boolean;
  isDistributorUser: boolean;
  isAgencyUser: boolean;
  isCaisseUser: boolean;
  isCashier: boolean;
}): string[] | null => {
  let topLevel: string | null = null;
  if (perimeter.isGlobalAdmin) topLevel = null;
  else if (perimeter.isCashier || perimeter.isCaisseUser) topLevel = "CAISSE";
  else if (perimeter.isAgencyUser) topLevel = "AGENCE";
  else if (perimeter.isDistributorUser) topLevel = "DISTRIBUTOR";
  else if (perimeter.isStructureUser) topLevel = "STRUCTURE";
  else if (perimeter.isProductUser) topLevel = "PRODUCT";
  return topLevel ? TRACKING_LEVEL_ORDER.slice(TRACKING_LEVEL_ORDER.indexOf(topLevel)) : null;
};

/** Résultat considéré comme un succès (même règle que la liste). */
export const isTrackingSuccess = (result?: string | null): boolean =>
  Boolean(result && (result.toUpperCase().includes("SUCCESS") || result.toUpperCase() === "OK"));

const initialFilters: TrackingFilters = {
  source: "",
  action: "",
  entite: "",
  structure_id: "",
  profil: "",
  utilisateur: "",
  method: "",
  adresse_ip: "",
  agence_id: "",
  caisse_id: "",
  distributor_id: "",
  product_id: "",
  navigateur: "",
  resultat_action: "",
  date_from: "",
  date_to: "",
  skip: 0,
  limit: DEFAULT_LIMIT,
};

type Option = { value: string; label: string };

/** Ajoute l'entité imposée par le périmètre si elle manque au référentiel (référentiel inaccessible ou incomplet). */
/** Clé propre à l'utilisateur connecté : un autre compte ouvert dans le même onglet ne reprend pas ces filtres. */
const getFiltersStorageKey = (): string => {
  const user = useAuthStore.getState().user;
  return `tracking.filters.${user?.userId || user?.email || "anonyme"}`;
};

const readStoredFilters = (): TrackingFilters => {
  try {
    const raw = sessionStorage.getItem(getFiltersStorageKey());
    return raw ? { ...initialFilters, ...(JSON.parse(raw) as Partial<TrackingFilters>) } : initialFilters;
  } catch {
    return initialFilters;
  }
};

const withEnforcedOption = (options: Option[], id: string | null, label: string | null): Option[] => {
  if (!id || options.some((o) => o.value === id)) return options;
  return [...options, { value: id, label: label || id }];
};

export const useTrackingEvents = () => {
  const perimeter = useUserPerimeter();
  // Catalogs
  const [availableProduits, setAvailableProduits] = useState<ProductCatalogItem[]>([]);
  const [availableStructures, setAvailableStructures] = useState<StructureCatalogItem[]>([]);
  const [availableAgences, setAvailableAgences] = useState<AgencyCatalogItem[]>([]);
  const [availableCaisses, setAvailableCaisses] = useState<CaisseCatalogItem[]>([]);
  const [availableDistributeurs, setAvailableDistributeurs] = useState<DistributorCatalogItem[]>([]);
  const [availableTrackingSources, setAvailableTrackingSources] = useState<string[]>([]);

  const [filters, setFilters] = useState<TrackingFilters>(readStoredFilters);

  // Les filtres sont conservés pour l'onglet : retour du détail d'un événement sans les perdre
  useEffect(() => {
    try {
      sessionStorage.setItem(getFiltersStorageKey(), JSON.stringify(filters));
    } catch {
      // Stockage indisponible : les filtres repartent simplement de zéro
    }
  }, [filters]);

  const allowedLevels = useMemo(
    () => getAllowedTrackingLevels(perimeter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      perimeter.isGlobalAdmin,
      perimeter.isProductUser,
      perimeter.isStructureUser,
      perimeter.isDistributorUser,
      perimeter.isAgencyUser,
      perimeter.isCaisseUser,
      perimeter.isCashier,
    ],
  );

  // Filtres effectifs : le périmètre de l'utilisateur remplace les valeurs choisies (comme le Reporting)
  const effectiveFilters = useMemo<TrackingFilters>(() => {
    const merged: TrackingFilters = { ...filters };
    if (perimeter.enforcedProductId) merged.product_id = perimeter.enforcedProductId;
    if (perimeter.enforcedStructureId) merged.structure_id = perimeter.enforcedStructureId;
    if (perimeter.enforcedDistributorId) merged.distributor_id = perimeter.enforcedDistributorId;
    if (perimeter.enforcedAgencyId) merged.agence_id = perimeter.enforcedAgencyId;
    // Plusieurs agences : une agence hors rattachement (ex. filtre conservé) n'est pas envoyée
    else if (merged.agence_id && perimeter.enforcedAgencyIds.length > 1 && !perimeter.enforcedAgencyIds.includes(merged.agence_id)) {
      merged.agence_id = "";
    }
    if (perimeter.enforcedCaisseId) merged.caisse_id = perimeter.enforcedCaisseId;
    // Niveau hors du périmètre (ex. filtre conservé d'une session précédente) : ignoré
    if (merged.entite && allowedLevels && !allowedLevels.includes(merged.entite)) merged.entite = "";
    return merged;
  }, [
    filters,
    allowedLevels,
    perimeter.enforcedProductId,
    perimeter.enforcedStructureId,
    perimeter.enforcedDistributorId,
    perimeter.enforcedAgencyId,
    perimeter.enforcedAgencyIds,
    perimeter.enforcedCaisseId,
  ]);

  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [summary, setSummary] = useState<TrackingEventSummary>({
    total_events: 0,
    distinct_users: 0,
    active_sources: 0,
    success_operations: 0,
    failed_operations: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const safeEvents = useMemo(() => (Array.isArray(events) ? events : []), [events]);

  const sourceOptions = useMemo(() => {
    return [
      { value: "", label: "Tous les modules" },
      ...availableTrackingSources.map((source) => ({
        value: source,
        label: TRACKING_SOURCE_LABELS[source] ?? source,
      })),
    ];
  }, [availableTrackingSources]);

  const getStructureName = useCallback(
    (idOrNom?: string | null) => resolveCatalogName(availableStructures, idOrNom),
    [availableStructures],
  );

  const getAgenceName = useCallback(
    (idOrNom?: string | null) => resolveCatalogName(availableAgences, idOrNom),
    [availableAgences],
  );

  const getCaisseName = useCallback(
    (idOrNom?: string | null) => resolveCatalogName(availableCaisses, idOrNom),
    [availableCaisses],
  );

  const getDistributeurName = useCallback(
    (idOrNom?: string | null) => resolveCatalogName(availableDistributeurs, idOrNom),
    [availableDistributeurs],
  );

  const getProduitName = useCallback(
    (idOrNom?: string | null) => resolveCatalogName(availableProduits, idOrNom),
    [availableProduits],
  );

  const produitOptions = useMemo(() => {
    const base = [{ value: "", label: "Tous les produits" }];
    const seen = new Set<string>();
    availableProduits.forEach((p) => {
      if (perimeter.enforcedProductId && p.id !== perimeter.enforcedProductId) return;
      if (p.id && !seen.has(p.id)) {
        base.push({ value: p.id, label: p.nom });
        seen.add(p.id);
      }
    });
    return withEnforcedOption(base, perimeter.enforcedProductId, perimeter.enforcedProductLabel);
  }, [availableProduits, perimeter.enforcedProductId, perimeter.enforcedProductLabel]);

  const entiteOptions = useMemo(() => [
    { value: "", label: "Tous les niveaux" },
    ...TRACKING_LEVEL_ORDER.filter((level) => !allowedLevels || allowedLevels.includes(level)).map((level) => ({
      value: level,
      label: TRACKING_ENTITE_LABELS[level],
    })),
  ], [allowedLevels]);

  // Listes des filtres limitées au périmètre de l'utilisateur, en suivant les rattachements :
  // structure → distributeurs, structure ou distributeur → agences, agence → caisses.
  const scopedStructureIds = useMemo(() => {
    if (perimeter.enforcedStructureId) return new Set([perimeter.enforcedStructureId]);
    if (perimeter.enforcedProductId) {
      return new Set(
        availableStructures
          .filter((s) => s.productId?.toLowerCase() === perimeter.enforcedProductId?.toLowerCase())
          .map((s) => s.id),
      );
    }
    return null;
  }, [availableStructures, perimeter.enforcedStructureId, perimeter.enforcedProductId]);

  const scopedDistributeurs = useMemo(() => {
    if (perimeter.enforcedDistributorId) {
      return availableDistributeurs.filter((d) => d.id === perimeter.enforcedDistributorId);
    }
    if (!scopedStructureIds) return availableDistributeurs;
    return availableDistributeurs.filter((d) => d.structureId && scopedStructureIds.has(d.structureId));
  }, [availableDistributeurs, perimeter.enforcedDistributorId, scopedStructureIds]);

  const scopedAgences = useMemo(() => {
    const distributorIds = new Set(scopedDistributeurs.map((d) => d.id));
    const restrictToDistributors = Boolean(perimeter.enforcedDistributorId || filters.distributor_id);
    if (filters.distributor_id) {
      distributorIds.clear();
      distributorIds.add(filters.distributor_id);
    }
    // Utilisateur rattaché à plusieurs agences : uniquement les siennes
    if (perimeter.enforcedAgencyIds.length > 1) {
      return availableAgences.filter((a) => perimeter.enforcedAgencyIds.includes(a.id));
    }
    if (!scopedStructureIds && !restrictToDistributors) return availableAgences;

    return availableAgences.filter((a) => {
      if (a.parentType === "DISTRIBUTOR") return Boolean(a.parentId && distributorIds.has(a.parentId));
      if (restrictToDistributors) return false;
      return Boolean(a.parentId && scopedStructureIds?.has(a.parentId));
    });
  }, [
    availableAgences,
    scopedDistributeurs,
    scopedStructureIds,
    perimeter.enforcedDistributorId,
    perimeter.enforcedAgencyIds,
    filters.distributor_id,
  ]);

  const structureOptions = useMemo(() => {
    const base = [{ value: "", label: "Toutes les structures" }];
    const seen = new Set<string>();

    availableStructures.forEach((s) => {
      if (perimeter.enforcedStructureId && s.id !== perimeter.enforcedStructureId) return;
      if (filters.product_id && s.productId && s.productId.toLowerCase() !== filters.product_id.toLowerCase()) {
        return;
      }
      if (s.id && !seen.has(s.id)) {
        base.push({ value: s.id, label: s.nom });
        seen.add(s.id);
      }
    });

    return withEnforcedOption(base, perimeter.enforcedStructureId, perimeter.enforcedStructureLabel);
  }, [availableStructures, filters.product_id, perimeter.enforcedStructureId, perimeter.enforcedStructureLabel]);

  const agenceOptions = useMemo(() => {
    const base = [{ value: "", label: "Toutes les agences" }];
    const seen = new Set<string>();

    scopedAgences.forEach((agency) => {
      if (perimeter.enforcedAgencyId && agency.id !== perimeter.enforcedAgencyId) return;
      if (agency.id && !seen.has(agency.id)) {
        base.push({ value: agency.id, label: agency.nom });
        seen.add(agency.id);
      }
    });

    return withEnforcedOption(base, perimeter.enforcedAgencyId, perimeter.enforcedAgencyLabel);
  }, [scopedAgences, perimeter.enforcedAgencyId, perimeter.enforcedAgencyLabel]);

  const caisseOptions = useMemo(() => {
    const base = [{ value: "", label: "Toutes les caisses" }];
    const scopedAgenceIds = new Set(scopedAgences.map((a) => a.id));
    const restrictCaissesToAgences = scopedAgences !== availableAgences;
    const seen = new Set<string>();

    availableCaisses.forEach((c) => {
      if (perimeter.enforcedCaisseId && c.id !== perimeter.enforcedCaisseId) return;
      if (filters.agence_id && c.agenceId && c.agenceId.toLowerCase() !== filters.agence_id.toLowerCase()) {
        return;
      }
      if (restrictCaissesToAgences && !(c.agenceId && scopedAgenceIds.has(c.agenceId))) return;

      if (c.id && !seen.has(c.id)) {
        base.push({ value: c.id, label: c.nom });
        seen.add(c.id);
      }
    });
    return withEnforcedOption(base, perimeter.enforcedCaisseId, perimeter.enforcedCaisseLabel);
  }, [availableCaisses, availableAgences, scopedAgences, filters.agence_id, perimeter.enforcedCaisseId, perimeter.enforcedCaisseLabel]);

  const distributeurOptions = useMemo(() => {
    const base = [{ value: "", label: "Tous les distributeurs" }];
    const seen = new Set<string>();

    scopedDistributeurs.forEach((d) => {
      if (perimeter.enforcedDistributorId && d.id !== perimeter.enforcedDistributorId) return;
      if (d.id && !seen.has(d.id)) {
        base.push({ value: d.id, label: d.nom });
        seen.add(d.id);
      }
    });
    return withEnforcedOption(base, perimeter.enforcedDistributorId, perimeter.enforcedDistributorLabel);
  }, [scopedDistributeurs, perimeter.enforcedDistributorId, perimeter.enforcedDistributorLabel]);

  const formatDate = formatTrackingDate;
  const formatUserAgent = formatTrackingUserAgent;
  const getMethodBadgeClass = getTrackingMethodBadgeClass;

  const limit = filters.limit || DEFAULT_LIMIT;
  const skip = filters.skip || 0;
  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    let isMounted = true;

    const loadCatalogs = async () => {
      try {
        const [prodRes, structRes, agenceRes, caisseRes, distRes, sourcesRes] = await Promise.allSettled([
          fetchProduits(),
          fetchStructures(),
          fetchAgences(),
          fetchCaisses(),
          fetchDistributeurs(),
          fetchTrackingSources(),
        ]);

        if (!isMounted) return;

        if (prodRes.status === "fulfilled") setAvailableProduits(mapProducts(prodRes.value));
        if (structRes.status === "fulfilled") setAvailableStructures(mapStructures(structRes.value));
        if (agenceRes.status === "fulfilled") setAvailableAgences(mapAgences(agenceRes.value));
        if (caisseRes.status === "fulfilled") setAvailableCaisses(mapCaisses(caisseRes.value));
        if (distRes.status === "fulfilled") setAvailableDistributeurs(mapDistributeurs(distRes.value.items));
        if (sourcesRes.status === "fulfilled") {
          setAvailableTrackingSources([...new Set(sourcesRes.value)]);
        }
      } catch (error) {
        console.warn("[Catalog Load Error]", error);
      }
    };

    void loadCatalogs();
    return () => {
      isMounted = false;
    };
  }, []);


  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchTrackingEvents(effectiveFilters);
      setEvents(Array.isArray(response?.items) ? response.items : []);
      setTotal(typeof response?.total === "number" ? response.total : 0);
      setSummary(response?.summary ?? {
        total_events: response?.total ?? 0,
        distinct_users: 0,
        active_sources: 0,
        success_operations: 0,
        failed_operations: 0,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors du chargement des traces d'audit.";
      setError(msg);
      setEvents([]);
      setTotal(0);
      setSummary({
        total_events: 0,
        distinct_users: 0,
        active_sources: 0,
        success_operations: 0,
        failed_operations: 0,
      });
      toast({
        title: "Erreur de chargement",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [effectiveFilters]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const updateFilters = (newFilters: Partial<TrackingFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      skip: newFilters.skip ?? 0,
    }));
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
    setExporting(true);
    try {
      await downloadTrackingExport(effectiveFilters, format);
      toast({
        title: "Export réussi",
        description: `Les événements filtrés ont été exportés en ${format.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: "Exportation impossible",
        description: error instanceof Error ? error.message : "Impossible d'exporter les événements.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return {
    events,
    total,
    loading,
    exporting,
    error,
    filters: effectiveFilters,
    perimeter,
    updateFilters,
    resetFilters,
    refetch: loadEvents,

    availableProduits,
    availableStructures,
    availableAgences,
    availableCaisses,
    availableDistributeurs,

    safeEvents,
    summary,
    sourceOptions,
    produitOptions,
    entiteOptions,
    structureOptions,
    agenceOptions,
    caisseOptions,
    distributeurOptions,
    limit,
    skip,
    currentPage,
    totalPages,

    formatDate,
    formatUserAgent,
    getMethodBadgeClass,
    getStructureName,
    getAgenceName,
    getCaisseName,
    getDistributeurName,
    getProduitName,


    handleExport,
  };
};
