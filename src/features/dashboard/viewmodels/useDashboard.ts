import { useCallback, useEffect, useMemo, useState } from "react";
import { useCaisseFilterOptions } from "@/shared/filters/useCaisseFilterOptions";
import {
  DashboardFilters,
  DashboardSummaryResponse,
  FilterOption,
} from "../models/types";
import { fetchDashboardSummary } from "../services/dashboardService";
import { fetchStructures } from "@/features/structures/services/structuresService";
import { fetchAgences } from "@/features/agences/services/agencesService";
import { fetchProduits, fetchProduitById } from "@/features/produits/services/produitsService";
import { fetchDistributeurs } from "@/features/distributeurs/services/distributeursService";
import { fetchPaymentMethods } from "@/features/payment-methods/services/paymentMethodsService";
import { useUserPerimeter } from "@/core/security/useUserPerimeter";
import { useAuthStore } from "@/core/security/authStore";

/** Élément de référentiel (structure, agence, produit, distributeur, moyen de paiement) aux formats variables selon les API. */
type CatalogItem = { id?: string; name?: string; nom?: string; code?: string; label?: string };

/** Extrait la liste d'un référentiel, qu'il soit renvoyé en tableau ou paginé (`items` ou clé spécifique). */
const toCatalogList = (value: unknown, key?: string): CatalogItem[] => {
  if (Array.isArray(value)) return value as CatalogItem[];
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const list = obj.items ?? (key ? obj[key] : undefined);
    return Array.isArray(list) ? (list as CatalogItem[]) : [];
  }
  return [];
};

export const useDashboard = () => {
  const perimeter = useUserPerimeter();

  const [filters, setFilters] = useState<DashboardFilters>({});

  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Options pour les menus déroulants
  const [structures, setStructures] = useState<FilterOption[]>([]);
  const [agences, setAgences] = useState<FilterOption[]>([]);
  const [produits, setProduits] = useState<FilterOption[]>([]);
  const [distributeurs, setDistributeurs] = useState<FilterOption[]>([]);
  const [moyensPaiement, setMoyensPaiement] = useState<FilterOption[]>([]);

  // Filtres effectifs avec périmètre d'habilitation injecté
  const effectiveFilters = useMemo<DashboardFilters>(() => {
    const merged: DashboardFilters = { ...filters };
    if (perimeter.enforcedStructureId) {
      merged.structure_id = perimeter.enforcedStructureId;
    }
    if (perimeter.enforcedDistributorId) {
      merged.distributeur_id = perimeter.enforcedDistributorId;
    }
    if (perimeter.enforcedAgencyId) {
      merged.agence_id = perimeter.enforcedAgencyId;
    } else if (merged.agence_id && perimeter.enforcedAgencyIds.length > 1 && !perimeter.enforcedAgencyIds.includes(merged.agence_id)) {
      // Plusieurs agences : une agence hors rattachement n'est pas envoyée
      merged.agence_id = undefined;
    }
    // Caissier : filtre explicite sur sa caisse (le Reporting applique aussi le périmètre du jeton)
    if (perimeter.enforcedCaisseId) {
      merged.caisse_id = perimeter.enforcedCaisseId;
    }
    if (perimeter.enforcedProductId) {
      merged.produit_id = perimeter.enforcedProductId;
    }
    return merged;
  }, [
    filters,
    perimeter.enforcedStructureId,
    perimeter.enforcedDistributorId,
    perimeter.enforcedAgencyId,
    perimeter.enforcedAgencyIds,
    perimeter.enforcedCaisseId,
    perimeter.enforcedProductId,
  ]);

  // Chargement des référentiels pour les filtres selon le périmètre utilisateur
  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      try {
        if (perimeter.isProductUser && perimeter.enforcedProductId) {
          try {
            const prod = await fetchProduitById(perimeter.enforcedProductId);
            if (active && prod) {
              setProduits([
                {
                  id: perimeter.enforcedProductId,
                  label: prod.nom || prod.code || perimeter.enforcedProductLabel || perimeter.enforcedProductId,
                },
              ]);
            } else if (active) {
              setProduits([
                {
                  id: perimeter.enforcedProductId,
                  label: perimeter.enforcedProductLabel || perimeter.enforcedProductId,
                },
              ]);
            }
          } catch {
            if (active) {
              setProduits([
                {
                  id: perimeter.enforcedProductId,
                  label: perimeter.enforcedProductLabel || perimeter.enforcedProductId,
                },
              ]);
            }
          }

          const [structRes, agenceRes, distRes, pmRes] = await Promise.allSettled([
            fetchStructures({ limit: 100 }),
            fetchAgences({ skip: 0, limit: 100 }),
            fetchDistributeurs({ limit: 100 }),
            fetchPaymentMethods(false),
          ]);

          if (!active) return;

          if (structRes.status === "fulfilled" && structRes.value) {
            const list = toCatalogList(structRes.value, "structures");
            setStructures(
              list.map((s: CatalogItem) => ({
                id: s.id || s.name || s.nom,
                label: s.name || s.nom || s.id,
                code: s.code,
              }))
            );
          }

          if (distRes.status === "fulfilled" && distRes.value) {
            const list = toCatalogList(distRes.value, "distributeurs");
            setDistributeurs(
              list.map((d: CatalogItem) => ({
                id: d.id || d.name || d.nom || d.code,
                label: d.name || d.nom || d.code || d.id,
                code: d.code,
              }))
            );
          }

          if (agenceRes.status === "fulfilled" && agenceRes.value) {
            const list = toCatalogList(agenceRes.value);
            setAgences(
              list.map((a: CatalogItem) => ({
                id: a.id,
                label: a.name,
              }))
            );
          }

          if (pmRes.status === "fulfilled" && pmRes.value && Array.isArray(pmRes.value)) {
            setMoyensPaiement(
              toCatalogList(pmRes.value).map((m) => ({
                id: m.code || m.id,
                label: m.label || m.nom || m.code,
                code: m.code,
              }))
            );
          }
        } else if (perimeter.isStructureUser && perimeter.enforcedStructureId) {
          // Structure User : voit sa structure, ses distributeurs rattachés, et les agences associées
          setStructures([
            {
              id: perimeter.enforcedStructureId,
              label: perimeter.enforcedStructureLabel || perimeter.enforcedStructureId,
            },
          ]);

          const [distRes, agenceRes, prodRes, pmRes] = await Promise.allSettled([
            fetchDistributeurs({ structure_id: perimeter.enforcedStructureId, limit: 100 }),
            fetchAgences({ parent_id: perimeter.enforcedStructureId, parent_type: "STRUCTURE", skip: 0, limit: 100 }),
            fetchProduits({ limit: 100 }),
            fetchPaymentMethods(false),
          ]);

          if (!active) return;

          if (distRes.status === "fulfilled" && distRes.value) {
            const list = toCatalogList(distRes.value, "distributeurs");
            const mappedDist = list
              .map((d: CatalogItem) => ({
                id: d.id || d.name || d.nom || d.code,
                label: d.name || d.nom || d.code || d.id,
                code: d.code,
              }))
              .filter((o: CatalogItem) => o.id);
            setDistributeurs(mappedDist);
          }

          if (agenceRes.status === "fulfilled" && agenceRes.value) {
            const list = toCatalogList(agenceRes.value);
            setAgences(
              list.map((a: CatalogItem) => ({
                id: a.id,
                label: a.name,
              }))
            );
          }

          if (prodRes.status === "fulfilled" && prodRes.value) {
            const list = toCatalogList(prodRes.value, "produits");
            setProduits(
              list.map((p: CatalogItem) => ({
                id: p.code || p.nom || p.name || p.id,
                label: p.nom || p.name || p.code || p.id,
                code: p.code,
              }))
            );
          }

          if (pmRes.status === "fulfilled" && pmRes.value && Array.isArray(pmRes.value)) {
            setMoyensPaiement(
              toCatalogList(pmRes.value).map((m) => ({
                id: m.code || m.id,
                label: m.label || m.nom || m.code,
                code: m.code,
              }))
            );
          }
        } else if (perimeter.isDistributorUser && perimeter.enforcedDistributorId) {
          // Distributor User : verrouillé sur son distributeur et ses agences
          setDistributeurs([
            {
              id: perimeter.enforcedDistributorId,
              label: perimeter.enforcedDistributorLabel || perimeter.enforcedDistributorId,
            },
          ]);
          if (perimeter.enforcedStructureId) {
            setStructures([
              {
                id: perimeter.enforcedStructureId,
                label: perimeter.enforcedStructureLabel || perimeter.enforcedStructureId,
              },
            ]);
          }

          const [agenceRes, prodRes, pmRes] = await Promise.allSettled([
            fetchAgences({ parent_id: perimeter.enforcedDistributorId, parent_type: "DISTRIBUTOR", skip: 0, limit: 100 }),
            fetchProduits({ limit: 100 }),
            fetchPaymentMethods(false),
          ]);

          if (!active) return;

          if (agenceRes.status === "fulfilled" && agenceRes.value) {
            const list = toCatalogList(agenceRes.value);
            setAgences(
              list.map((a: CatalogItem) => ({
                id: a.id,
                label: a.name,
              }))
            );
          }

          if (prodRes.status === "fulfilled" && prodRes.value) {
            const list = toCatalogList(prodRes.value, "produits");
            setProduits(
              list.map((p: CatalogItem) => ({
                id: p.code || p.nom || p.name || p.id,
                label: p.nom || p.name || p.code || p.id,
                code: p.code,
              }))
            );
          }

          if (pmRes.status === "fulfilled" && pmRes.value && Array.isArray(pmRes.value)) {
            setMoyensPaiement(
              toCatalogList(pmRes.value).map((m) => ({
                id: m.code || m.id,
                label: m.label || m.nom || m.code,
                code: m.code,
              }))
            );
          }
        } else if (perimeter.isAgencyUser && perimeter.enforcedAgencyIds.length > 0) {
          // Agency User : limité à son agence, ou à ses agences s'il en a plusieurs
          if (perimeter.enforcedStructureId) {
            setStructures([
              {
                id: perimeter.enforcedStructureId,
                label: perimeter.enforcedStructureLabel || perimeter.enforcedStructureId,
              },
            ]);
          }
          if (perimeter.enforcedDistributorId) {
            setDistributeurs([
              {
                id: perimeter.enforcedDistributorId,
                label: perimeter.enforcedDistributorLabel || perimeter.enforcedDistributorId,
              },
            ]);
          }

          const parentId = perimeter.enforcedStructureId || perimeter.enforcedDistributorId;
          const parentType = perimeter.enforcedStructureId ? "STRUCTURE" : "DISTRIBUTOR";

          const [agenceRes, prodRes, pmRes] = await Promise.allSettled([
            parentId
              ? fetchAgences({ parent_id: parentId, parent_type: parentType, skip: 0, limit: 100 })
              : Promise.resolve([]),
            fetchProduits({ limit: 100 }),
            fetchPaymentMethods(false),
          ]);

          if (!active) return;

          const agenceList = agenceRes.status === "fulfilled" && agenceRes.value ? toCatalogList(agenceRes.value) : [];
          const userAgences = perimeter.enforcedAgencyIds.map((agencyId) => {
            const found = agenceList.find((a: CatalogItem) => a.id === agencyId);
            return { id: agencyId, label: found?.name || found?.nom || (agencyId === perimeter.enforcedAgencyId ? perimeter.enforcedAgencyLabel : null) || agencyId };
          });
          // Une seule agence : son libellé est mémorisé pour l'affichage du profil
          if (perimeter.enforcedAgencyId && userAgences[0] && userAgences[0].label !== perimeter.enforcedAgencyId) {
            useAuthStore.getState().updateResolvedEntities({
              agencyId: perimeter.enforcedAgencyId,
              agencyLabel: userAgences[0].label,
            });
          }
          setAgences(userAgences);

          if (prodRes.status === "fulfilled" && prodRes.value) {
            const list = toCatalogList(prodRes.value, "produits");
            setProduits(
              list.map((p: CatalogItem) => ({
                id: p.code || p.nom || p.name || p.id,
                label: p.nom || p.name || p.code || p.id,
                code: p.code,
              }))
            );
          }

          if (pmRes.status === "fulfilled" && pmRes.value && Array.isArray(pmRes.value)) {
            setMoyensPaiement(
              toCatalogList(pmRes.value).map((m) => ({
                id: m.code || m.id,
                label: m.label || m.nom || m.code,
                code: m.code,
              }))
            );
          }
        } else {
          // Global Admin
          const [structRes, agenceRes, prodRes, distRes, pmRes] = await Promise.allSettled([
            fetchStructures({ limit: 100 }),
            fetchAgences({ skip: 0, limit: 100 }),
            fetchProduits({ limit: 100 }),
            fetchDistributeurs({ limit: 100 }),
            fetchPaymentMethods(false),
          ]);

          if (!active) return;

          if (structRes.status === "fulfilled" && structRes.value) {
            const list = toCatalogList(structRes.value, "structures");
            setStructures(
              list.map((s: CatalogItem) => ({
                id: s.id || s.name || s.nom,
                label: s.name || s.nom || s.id,
                code: s.code,
              }))
            );
          }

          if (agenceRes.status === "fulfilled" && agenceRes.value) {
            const list = toCatalogList(agenceRes.value);
            setAgences(
              list.map((a: CatalogItem) => ({
                id: a.id,
                label: a.name,
              }))
            );
          }

          if (prodRes.status === "fulfilled" && prodRes.value) {
            const list = toCatalogList(prodRes.value, "produits");
            setProduits(
              list.map((p: CatalogItem) => ({
                id: p.code || p.nom || p.name || p.id,
                label: p.nom || p.name || p.code || p.id,
                code: p.code,
              }))
            );
          }

          if (distRes.status === "fulfilled" && distRes.value) {
            const list = toCatalogList(distRes.value, "distributeurs");
            setDistributeurs(
              list.map((d: CatalogItem) => ({
                id: d.id || d.name || d.nom || d.code,
                label: d.name || d.nom || d.code || d.id,
                code: d.code,
              }))
            );
          }

          if (pmRes.status === "fulfilled" && pmRes.value && Array.isArray(pmRes.value)) {
            setMoyensPaiement(
              toCatalogList(pmRes.value).map((m) => ({
                id: m.code || m.id,
                label: m.label || m.nom || m.code,
                code: m.code,
              }))
            );
          }
        }
      } catch (err) {
        console.warn("[useDashboard] Erreur chargement référentiels:", err);
      }
    };

    loadOptions();

    return () => {
      active = false;
    };
  }, [
    perimeter.isGlobalAdmin,
    perimeter.isProductUser,
    perimeter.isStructureUser,
    perimeter.isDistributorUser,
    perimeter.isAgencyUser,
    perimeter.enforcedProductId,
    perimeter.enforcedProductLabel,
    perimeter.enforcedStructureId,
    perimeter.enforcedStructureLabel,
    perimeter.enforcedDistributorId,
    perimeter.enforcedDistributorLabel,
    perimeter.enforcedAgencyId,
    perimeter.enforcedAgencyIds,
    perimeter.enforcedAgencyLabel,
  ]);

  const loadSummary = useCallback(async (currentFilters: DashboardFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardSummary(currentFilters);
      setSummary(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors du chargement des statistiques";
      setError(msg);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary(effectiveFilters);
  }, [effectiveFilters, loadSummary]);

  const updateFilter = useCallback((key: keyof DashboardFilters, value: string | undefined) => {
    if (key === "structure_id" && perimeter.enforcedStructureId) return;
    if (key === "distributeur_id" && perimeter.enforcedDistributorId) return;
    if (key === "agence_id" && perimeter.enforcedAgencyId) return;
    // Plusieurs agences : seules les agences de rattachement peuvent être choisies
    if (
      key === "agence_id" &&
      value &&
      value !== "all" &&
      perimeter.enforcedAgencyIds.length > 1 &&
      !perimeter.enforcedAgencyIds.includes(value)
    ) {
      return;
    }
    if ((key === "produit_id" || key === "produit") && perimeter.enforcedProductId) return;
    if (key === "caisse_id" && perimeter.enforcedCaisseId) return;

    setFilters((prev) => {
      const next = { ...prev };
      if (!value || value === "all") {
        delete next[key];
      } else {
        next[key] = value;
      }
      // Une autre agence : la caisse choisie n'en fait plus forcément partie
      if (key === "agence_id") delete next.caisse_id;
      return next;
    });
  }, [
    perimeter.enforcedStructureId,
    perimeter.enforcedDistributorId,
    perimeter.enforcedAgencyId,
    perimeter.enforcedAgencyIds,
    perimeter.enforcedProductId,
    perimeter.enforcedCaisseId,
  ]);

  const refetch = useCallback(() => {
    loadSummary(effectiveFilters);
  }, [effectiveFilters, loadSummary]);

  // Filtre Caisse (caisse_id) : caisses de l'agence choisie ou des agences de l'utilisateur
  const caisseFilter = useCaisseFilterOptions({
    agenceId: effectiveFilters.agence_id,
    enforcedAgencyIds: perimeter.enforcedAgencyIds,
    enforcedCaisseId: perimeter.enforcedCaisseId,
    enforcedCaisseLabel: perimeter.enforcedCaisseLabel,
  });

  return {
    summary,
    loading,
    error,
    filters: effectiveFilters,
    structures,
    agences,
    caisses: caisseFilter.options,
    caissesNeedAgency: caisseFilter.needsAgency,
    produits,
    distributeurs,
    moyensPaiement,
    perimeter,
    updateFilter,
    refetch,
  };
};
