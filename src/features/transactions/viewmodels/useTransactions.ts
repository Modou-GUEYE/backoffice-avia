import { useState, useEffect, useCallback, useMemo } from "react";
import { useCaisseFilterOptions } from "@/shared/filters/useCaisseFilterOptions";
import {
  TransactionDetailOut,
  TransactionExportFormat,
  TransactionFilters,
  TransactionOut,
} from "../models/types";
import {
  fetchTransactions,
  fetchTransactionDetail,
  downloadTransactionsExport,
} from "../services/transactionsService";
import { fetchStructures } from "@/features/structures/services/structuresService";
import { fetchAgences } from "@/features/agences/services/agencesService";
import { fetchProduits, fetchProduitById } from "@/features/produits/services/produitsService";
import { fetchDistributeurs } from "@/features/distributeurs/services/distributeursService";
import { fetchPaymentMethods } from "@/features/payment-methods/services/paymentMethodsService";
import { useUserPerimeter } from "@/core/security/useUserPerimeter";
import { useAuthStore } from "@/core/security/authStore";
import { toast } from "@/hooks/use-toast";

export interface FilterOption {
  id: string;
  label: string;
}

// Formes minimales des référentiels utilisées pour construire les options de filtres
type AgenceOptionSource = { id: string; name?: string; nom?: string };
type ProduitOptionSource = { id?: string; code?: string; nom?: string; name?: string };

export const useTransactions = () => {
  const perimeter = useUserPerimeter();

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50); // Default 50 as defined in OpenAPI contract

  const [filters, setFilters] = useState<TransactionFilters>({});

  const [transactions, setTransactions] = useState<TransactionOut[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal State
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetailOut | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Export State
  const [exportLoading, setExportLoading] = useState<boolean>(false);

  // Options dynamiques pour les listes déroulantes basées sur les référentiels et le périmètre utilisateur
  const [structures, setStructures] = useState<FilterOption[]>([]);
  const [agences, setAgences] = useState<FilterOption[]>([]);
  const [produits, setProduits] = useState<FilterOption[]>([]);
  const [distributeurs, setDistributeurs] = useState<FilterOption[]>([]);
  const [moyensPaiement, setMoyensPaiement] = useState<FilterOption[]>([]);

  // Filtres effectifs avec périmètre d'habilitation injecté
  const effectiveFilters = useMemo<TransactionFilters>(() => {
    const merged: TransactionFilters = { ...filters };
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
            const raw = structRes.value as unknown as { items?: Array<{ id?: string; name?: string; nom?: string }> };
            const list = Array.isArray(raw) ? raw : raw.items || [];
            setStructures(
              list
                .map((s) => ({
                  id: s.id || s.name || s.nom || "",
                  label: s.name || s.nom || s.id || "",
                }))
                .filter((o) => o.id)
            );
          }

          if (distRes.status === "fulfilled" && distRes.value) {
            const raw = distRes.value as unknown as { items?: Array<{ id?: string; name?: string; nom?: string }> };
            const list = Array.isArray(raw) ? raw : raw.items || [];
            setDistributeurs(
              list
                .map((d) => ({
                  id: d.id || d.name || d.nom || "",
                  label: d.name || d.nom || d.id || "",
                }))
                .filter((o) => o.id)
            );
          }

          if (agenceRes.status === "fulfilled" && agenceRes.value) {
            const list: AgenceOptionSource[] = Array.isArray(agenceRes.value)
              ? agenceRes.value
              : (agenceRes.value as { items?: AgenceOptionSource[] })?.items || [];
            setAgences(
              list.map((a: AgenceOptionSource) => ({
                id: a.id,
                label: a.name,
              }))
            );
          }

          if (pmRes.status === "fulfilled" && pmRes.value) {
            const list = Array.isArray(pmRes.value) ? pmRes.value : [];
            setMoyensPaiement(
              list
                .map((m: { id?: string; name?: string; code?: string }) => ({
                  id: m.code || m.name || m.id || "",
                  label: m.name || m.code || m.id || "",
                }))
                .filter((o: FilterOption) => o.id)
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
            const raw = distRes.value as unknown as { items?: Array<{ id?: string; name?: string; nom?: string }> };
            const list = Array.isArray(raw) ? raw : raw.items || [];
            const mappedDist = list
              .map((d) => ({
                id: d.id || d.name || d.nom || "",
                label: d.name || d.nom || d.id || "",
              }))
              .filter((o) => o.id);
            setDistributeurs(mappedDist);
          }

          if (agenceRes.status === "fulfilled" && agenceRes.value) {
            const list: AgenceOptionSource[] = Array.isArray(agenceRes.value)
              ? agenceRes.value
              : (agenceRes.value as { items?: AgenceOptionSource[] })?.items || [];
            setAgences(
              list.map((a: AgenceOptionSource) => ({
                id: a.id,
                label: a.name,
              }))
            );
          }

          if (prodRes.status === "fulfilled" && prodRes.value) {
            const raw = prodRes.value as unknown as ProduitOptionSource[] | { items?: ProduitOptionSource[] };
            const list = Array.isArray(raw) ? raw : raw.items || [];
            setProduits(
              list
                .map((p: ProduitOptionSource) => ({
                  id: p.code || p.nom || p.name || p.id || "",
                  label: p.nom || p.name || p.code || p.id || "",
                }))
                .filter((o: FilterOption) => o.id)
            );
          }

          if (pmRes.status === "fulfilled" && pmRes.value) {
            const list = Array.isArray(pmRes.value) ? pmRes.value : [];
            setMoyensPaiement(
              list
                .map((m: { id?: string; name?: string; code?: string }) => ({
                  id: m.code || m.name || m.id || "",
                  label: m.name || m.code || m.id || "",
                }))
                .filter((o: FilterOption) => o.id)
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
            const list: AgenceOptionSource[] = Array.isArray(agenceRes.value)
              ? agenceRes.value
              : (agenceRes.value as { items?: AgenceOptionSource[] })?.items || [];
            setAgences(
              list.map((a: AgenceOptionSource) => ({
                id: a.id,
                label: a.name,
              }))
            );
          }

          if (prodRes.status === "fulfilled" && prodRes.value) {
            const raw = prodRes.value as unknown as ProduitOptionSource[] | { items?: ProduitOptionSource[] };
            const list = Array.isArray(raw) ? raw : raw.items || [];
            setProduits(
              list
                .map((p: ProduitOptionSource) => ({
                  id: p.code || p.nom || p.name || p.id || "",
                  label: p.nom || p.name || p.code || p.id || "",
                }))
                .filter((o: FilterOption) => o.id)
            );
          }

          if (pmRes.status === "fulfilled" && pmRes.value) {
            const list = Array.isArray(pmRes.value) ? pmRes.value : [];
            setMoyensPaiement(
              list
                .map((m: { id?: string; name?: string; code?: string }) => ({
                  id: m.code || m.name || m.id || "",
                  label: m.name || m.code || m.id || "",
                }))
                .filter((o: FilterOption) => o.id)
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

          const agenceList: AgenceOptionSource[] = agenceRes.status === "fulfilled" && agenceRes.value ? Array.isArray(agenceRes.value) ? agenceRes.value : (agenceRes.value as { items?: AgenceOptionSource[] })?.items || [] : [];
          const userAgences = perimeter.enforcedAgencyIds.map((agencyId) => {
            const found = agenceList.find((a: AgenceOptionSource) => a.id === agencyId);
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
            const raw = prodRes.value as unknown as ProduitOptionSource[] | { items?: ProduitOptionSource[] };
            const list = Array.isArray(raw) ? raw : raw.items || [];
            setProduits(
              list
                .map((p: ProduitOptionSource) => ({
                  id: p.code || p.nom || p.name || p.id || "",
                  label: p.nom || p.name || p.code || p.id || "",
                }))
                .filter((o: FilterOption) => o.id)
            );
          }

          if (pmRes.status === "fulfilled" && pmRes.value) {
            const list = Array.isArray(pmRes.value) ? pmRes.value : [];
            setMoyensPaiement(
              list
                .map((m: { id?: string; name?: string; code?: string }) => ({
                  id: m.code || m.name || m.id || "",
                  label: m.name || m.code || m.id || "",
                }))
                .filter((o: FilterOption) => o.id)
            );
          }
        } else {
          // Global Admin ou rôle non restreint
          const [structRes, agenceRes, prodRes, distRes, pmRes] = await Promise.allSettled([
            fetchStructures({ limit: 100 }),
            fetchAgences({ skip: 0, limit: 100 }),
            fetchProduits({ limit: 100 }),
            fetchDistributeurs({ limit: 100 }),
            fetchPaymentMethods(false),
          ]);

          if (!active) return;

          if (structRes.status === "fulfilled" && structRes.value) {
            const raw = structRes.value as unknown as { items?: Array<{ id?: string; name?: string; nom?: string }> };
            const list = Array.isArray(raw) ? raw : raw.items || [];
            setStructures(
              list
                .map((s) => ({
                  id: s.id || s.name || s.nom || "",
                  label: s.name || s.nom || s.id || "",
                }))
                .filter((o) => o.id)
            );
          }

          if (distRes.status === "fulfilled" && distRes.value) {
            const raw = distRes.value as unknown as { items?: Array<{ id?: string; name?: string; nom?: string }> };
            const list = Array.isArray(raw) ? raw : raw.items || [];
            setDistributeurs(
              list
                .map((d) => ({
                  id: d.id || d.name || d.nom || "",
                  label: d.name || d.nom || d.id || "",
                }))
                .filter((o) => o.id)
            );
          }

          if (agenceRes.status === "fulfilled" && agenceRes.value) {
            const list: AgenceOptionSource[] = Array.isArray(agenceRes.value)
              ? agenceRes.value
              : (agenceRes.value as { items?: AgenceOptionSource[] })?.items || [];
            setAgences(
              list.map((a: AgenceOptionSource) => ({
                id: a.id,
                label: a.name,
              }))
            );
          }

          if (prodRes.status === "fulfilled" && prodRes.value) {
            const raw = prodRes.value as unknown as ProduitOptionSource[] | { items?: ProduitOptionSource[] };
            const list = Array.isArray(raw) ? raw : raw.items || [];
            setProduits(
              list
                .map((p: ProduitOptionSource) => ({
                  id: p.code || p.nom || p.name || p.id || "",
                  label: p.nom || p.name || p.code || p.id || "",
                }))
                .filter((o: FilterOption) => o.id)
            );
          }

          if (pmRes.status === "fulfilled" && pmRes.value) {
            const list = Array.isArray(pmRes.value) ? pmRes.value : [];
            setMoyensPaiement(
              list
                .map((m: { id?: string; name?: string; code?: string }) => ({
                  id: m.code || m.name || m.id || "",
                  label: m.name || m.code || m.id || "",
                }))
                .filter((o: FilterOption) => o.id)
            );
          }
        }
      } catch (err) {
        console.warn("[useTransactions] Erreur chargement référentiels:", err);
      }
    };

    loadOptions();

    return () => {
      active = false;
    };
  }, [
    perimeter.isGlobalAdmin,
    perimeter.isStructureUser,
    perimeter.isDistributorUser,
    perimeter.isAgencyUser,
    perimeter.isProductUser,
    perimeter.enforcedStructureId,
    perimeter.enforcedStructureLabel,
    perimeter.enforcedDistributorId,
    perimeter.enforcedDistributorLabel,
    perimeter.enforcedAgencyId,
    perimeter.enforcedAgencyIds,
    perimeter.enforcedAgencyLabel,
    perimeter.enforcedProductId,
    perimeter.enforcedProductLabel,
  ]);

  // Chargement direct auprès du backend via les query parameters du contrat OpenAPI
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const skip = (page - 1) * pageSize;
      const data = await fetchTransactions({
        ...effectiveFilters,
        skip,
        limit: pageSize,
      });
      setTransactions(data.items);
      setTotal(data.total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors du chargement des transactions.";
      setError(msg);
      setTransactions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [effectiveFilters, page, pageSize]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Détail d'une transaction
  const openDetail = useCallback(async (transactionId: string) => {
    setSelectedTransactionId(transactionId);
    setSelectedTransaction(null);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const detail = await fetchTransactionDetail(transactionId);
      setSelectedTransaction(detail);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Impossible de charger les détails.";
      setDetailError(msg);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedTransactionId(null);
    setSelectedTransaction(null);
    setDetailError(null);
  }, []);

  // Mise à jour directe d'un filtre du contrat, protégée par le périmètre
  const updateFilter = useCallback((key: keyof TransactionFilters, value: unknown) => {
    if (key === "structure_id" && perimeter.enforcedStructureId) return;
    if (key === "distributeur_id" && perimeter.enforcedDistributorId) return;
    if (key === "agence_id" && perimeter.enforcedAgencyId) return;
    // Plusieurs agences : seules les agences de rattachement peuvent être choisies
    if (
      key === "agence_id" &&
      typeof value === "string" &&
      value &&
      value !== "all" &&
      perimeter.enforcedAgencyIds.length > 1 &&
      !perimeter.enforcedAgencyIds.includes(value)
    ) {
      return;
    }
    if ((key === "produit_id" || key === "produit") && perimeter.enforcedProductId) return;
    if (key === "caisse_id" && perimeter.enforcedCaisseId) return;

    setPage(1);
    setFilters((prev) => {
      const next = { ...prev };
      if (value === undefined || value === null || value === "" || value === "all") {
        delete next[key];
      } else {
        (next as Record<string, unknown>)[key] = value;
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
    perimeter.enforcedCaisseId,
    perimeter.enforcedProductId,
  ]);

  // Export conforme aux formats du contrat (csv, xlsx, pdf)
  const exportTransactions = useCallback(
    async (format: TransactionExportFormat) => {
      setExportLoading(true);
      try {
        await downloadTransactionsExport(effectiveFilters, format);
        toast({
          title: "Export réussi",
          description: `Le fichier ${format.toUpperCase()} a été généré avec succès.`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : `Échec de l'export ${format.toUpperCase()}.`;
        toast({
          title: "Erreur d'export",
          description: msg,
          variant: "destructive",
        });
      } finally {
        setExportLoading(false);
      }
    },
    [effectiveFilters]
  );

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  // Filtre Caisse (caisse_id) : caisses de l'agence choisie ou des agences de l'utilisateur
  const caisseFilter = useCaisseFilterOptions({
    agenceId: effectiveFilters.agence_id,
    enforcedAgencyIds: perimeter.enforcedAgencyIds,
    enforcedCaisseId: perimeter.enforcedCaisseId,
    enforcedCaisseLabel: perimeter.enforcedCaisseLabel,
  });

  return {
    transactions,
    total,
    loading,
    error,
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
    filters: effectiveFilters,
    updateFilter,
    refresh: loadTransactions,
    perimeter,
    // Détail
    selectedTransactionId,
    selectedTransaction,
    detailLoading,
    detailError,
    openDetail,
    closeDetail,
    // Export
    exportLoading,
    exportTransactions,
    // Options
    structures,
    agences,
    caisses: caisseFilter.options,
    caissesNeedAgency: caisseFilter.needsAgency,
    produits,
    distributeurs,
    moyensPaiement,
  };
};
