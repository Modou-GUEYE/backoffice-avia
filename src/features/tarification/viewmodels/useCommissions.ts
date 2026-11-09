import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/core/network/errorUtils";
import {
  CommissionSplitResponse,
  CreateCommissionSplitRequest,
  UpdateCommissionSplitRequest,
  CommissionPhase,
  ServiceType,
  TenantLevel,
  CommissionForm,
  CatalogServiceItem,
} from "../models/types";
import {
  fetchCommissions,
  createCommission,
  updateCommission,
  deleteCommission,
  toggleCommissionStatus,
  fetchCommissionsConsolidated,
  fetchCommissionDetail,
  fetchCatalogServices,
} from "../services/commissionsService";
import { useAuthStore, getCurrentInstitutionId, parseDistributorIdFromToken } from "@/core/security/authStore";
import { fetchAgences } from "@/features/agences/services/agencesService";
import { AgenceRead } from "@/features/agences/models/types";
import { fetchProduits } from "@/features/produits/services/produitsService";
import { ProduitRead } from "@/features/produits/models/types";
import { fetchDistributeurs } from "@/features/distributeurs/services/distributeursService";
import { Distributeur } from "@/features/distributeurs/models/types";
import { fetchStructures } from "@/features/structures/services/structuresService";
import { StructureRead } from "@/features/structures/models/types";
import { hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import {
  CommissionFormField,
  computeCommissionTotalRate,
  validateCommissionForm,
} from "../models/validation";

export type CommissionFilterLevel = "ALL" | "PRODUCT" | "STRUCTURE";

const emptyForm: CommissionForm = {
  tenantLevel: "PRODUCT",
  tenantId: "",
  serviceType: "",
  phase: "UNIQUE",
  rateStructure: "",
  rateTcaStructure: "",
  rateDistributeur: "",
  rateGroupement: "",
  ratePartenaireTechnique: "",
  overrideReason: "",
};

/**
 * Périmètre imposé (ex. onglet Commission d'un produit) : niveau et entité fixés, sans filtre ni choix.
 * Sans `tenantId` (produit pas encore créé), les répartitions sont mises en attente localement puis
 * créées par `flushPendingCommissions` une fois l'entité enregistrée.
 */
export interface CommissionScope {
  tenantLevel: TenantLevel;
  tenantId: string | null;
  tenantLabel?: string;
}

const PENDING_ID_PREFIX = "pending-";

export const useCommissions = (options?: { enabled?: boolean; scope?: CommissionScope }) => {
  const enabled = options?.enabled ?? true;
  const scope = options?.scope;
  const scopeTenantId = scope?.tenantId ?? null;
  const hasScope = Boolean(scope);
  const isStaging = hasScope && !scopeTenantId;
  const currentUser = useAuthStore((state) => state.user);
  const isStructureAdmin = currentUser?.entityContext === "Structure";
  const isProductAdmin = currentUser?.entityContext === "Produit";
  const isDistributorAdmin = currentUser?.entityContext === "Distributeur";

  const resolvedInstitutionId = currentUser?.institutionId || getCurrentInstitutionId() || "";
  const resolvedDistributorId =
    currentUser?.distributorId || parseDistributorIdFromToken(useAuthStore.getState().token || undefined) || "";

  // ===== AGENCIES STATE =====
  const [agenciesState, setAgenciesState] = useState({
    items: [] as AgenceRead[],
    isLoading: false,
  });

  const loadAgencies = useCallback(async () => {
    if (!currentUser) return;
    const institutionId = getCurrentInstitutionId();
    try {
      setAgenciesState((prev) => ({ ...prev, isLoading: true }));
      let params: { parent_id?: string; parent_type?: string } | undefined = undefined;
      if (isStructureAdmin && institutionId) {
        params = { parent_id: institutionId, parent_type: "STRUCTURE" };
      } else if (isDistributorAdmin && resolvedDistributorId) {
        params = { parent_id: resolvedDistributorId, parent_type: "DISTRIBUTOR" };
      }
      const data = await fetchAgences(params);
      setAgenciesState((prev) => ({
        ...prev,
        items: data.filter((a) => !a.is_deleted),
      }));
    } catch (err) {
      console.error("Erreur chargement agences", err);
    } finally {
      setAgenciesState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [isStructureAdmin, isDistributorAdmin, resolvedDistributorId, currentUser]);

  const activeAgencies = useMemo(() => {
    return agenciesState.items.filter((a) => a.is_active);
  }, [agenciesState.items]);

  // ===== COMMISSIONS LIST STATE =====
  const [commissionsListState, setCommissionsListState] = useState({
    items: [] as CommissionSplitResponse[],
    isLoading: false,
    filterLevel: (isStructureAdmin ? "STRUCTURE" : isProductAdmin ? "PRODUCT" : "ALL") as CommissionFilterLevel,
    filterTenantId: isStructureAdmin || isProductAdmin ? resolvedInstitutionId : "",
    filterServiceType: "" as string,
  });

  // ===== PRODUCTS & DISTRIBUTORS & STRUCTURES =====
  const [productsState, setProductsState] = useState({
    items: [] as ProduitRead[],
    isLoading: false,
  });

  const [distributorsState, setDistributorsState] = useState({
    items: [] as Distributeur[],
    isLoading: false,
  });

  const [structuresState, setStructuresState] = useState({
    items: [] as StructureRead[],
    isLoading: false,
  });

  const [catalogServicesState, setCatalogServicesState] = useState({
    items: [] as CatalogServiceItem[],
    isLoading: false,
  });

  const loadEntities = useCallback(async () => {
    if (scope) {
      // Périmètre imposé : seuls les services du catalogue sont nécessaires
      setCatalogServicesState((prev) => ({ ...prev, isLoading: true }));
      const services = await fetchCatalogServices().catch(() => []);
      setCatalogServicesState({ items: services, isLoading: false });
      return;
    }
    try {
      setCatalogServicesState((prev) => ({ ...prev, isLoading: true }));
      const [prods, dists, structs, services] = await Promise.all([
        fetchProduits().catch(() => []),
        fetchDistributeurs().catch(() => []),
        fetchStructures().catch(() => ({ data: [] })),
        fetchCatalogServices().catch(() => []),
      ]);
      const productList = Array.isArray(prods) ? prods : [];
      const distributorList: Distributeur[] = Array.isArray(dists)
        ? dists
        : Array.isArray((dists as { items?: Distributeur[] })?.items)
        ? (dists as { items: Distributeur[] }).items
        : [];
      const structureList = Array.isArray(structs) ? structs : structs?.data || [];

      setProductsState({ items: productList, isLoading: false });
      setDistributorsState({ items: distributorList, isLoading: false });
      setStructuresState({ items: structureList, isLoading: false });
      setCatalogServicesState({ items: services, isLoading: false });

      // Synchroniser le tenantId initial si le filtre actif en a besoin
      setCommissionsListState((prev) => {
        if (prev.filterTenantId) return prev;
        if (prev.filterLevel === "PRODUCT" && productList.length > 0) {
          return { ...prev, filterTenantId: isProductAdmin && resolvedInstitutionId ? resolvedInstitutionId : productList[0].id };
        }
        if (prev.filterLevel === "STRUCTURE" && structureList.length > 0) {
          return { ...prev, filterTenantId: isStructureAdmin && resolvedInstitutionId ? resolvedInstitutionId : structureList[0].id };
        }
        return prev;
      });
    } catch (e) {
      console.error("Erreur chargement entités", e);
      setCatalogServicesState((prev) => ({ ...prev, isLoading: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProductAdmin, isStructureAdmin, resolvedInstitutionId, Boolean(scope)]);

  // ===== MODAL & FORM STATE =====
  const [formState, setFormState] = useState<CommissionForm>(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CommissionSplitResponse | null>(null);
  const [detailItem, setDetailItem] = useState<CommissionSplitResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  // Erreur renvoyée par l'API à l'enregistrement (les erreurs de saisie sont affichées sous les champs)
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    errors: formErrors,
    setErrors: setFormErrors,
    clearError: clearFormError,
    resetErrors: resetFormErrors,
  } = useFieldErrors<CommissionFormField>();

  // Répartitions saisies avant la création de l'entité du périmètre
  const [pendingItems, setPendingItems] = useState<CommissionSplitResponse[]>([]);

  const handleFormOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setSubmitError(null);
      resetFormErrors();
    }
  };

  // ===== LOAD COMMISSIONS =====
  const loadCommissions = useCallback(async () => {
    if (!enabled) return;
    if (scope) {
      if (!scopeTenantId) return;
      try {
        setCommissionsListState((prev) => ({ ...prev, isLoading: true }));
        const data = await fetchCommissions({ tenant_level: scope.tenantLevel, tenant_id: scopeTenantId });
        setCommissionsListState((prev) => ({ ...prev, items: data, isLoading: false }));
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, "Erreur lors du chargement des commissions"));
        setCommissionsListState((prev) => ({ ...prev, isLoading: false }));
      }
      return;
    }
    try {
      setCommissionsListState((prev) => ({ ...prev, isLoading: true }));
      // Si "ALL" ou si tenantId absent : appel à la vue consolidée de l'API
      if (commissionsListState.filterLevel === "ALL" || !commissionsListState.filterTenantId) {
        const data = await fetchCommissionsConsolidated();
        setCommissionsListState((prev) => ({ ...prev, items: data, isLoading: false }));
      } else {
        const params: { tenant_level?: string; tenant_id?: string; service_type?: string } = {
          tenant_level: commissionsListState.filterLevel,
          tenant_id: commissionsListState.filterTenantId,
        };
        if (commissionsListState.filterServiceType) {
          params.service_type = commissionsListState.filterServiceType;
        }
        const data = await fetchCommissions(params);
        setCommissionsListState((prev) => ({ ...prev, items: data, isLoading: false }));
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Erreur lors du chargement des commissions"));
      setCommissionsListState((prev) => ({ ...prev, isLoading: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    scope?.tenantLevel,
    scopeTenantId,
    commissionsListState.filterLevel,
    commissionsListState.filterTenantId,
    commissionsListState.filterServiceType,
  ]);

  // Nouvelle entité ou fermeture : on repart d'une liste d'attente vide
  useEffect(() => {
    setPendingItems([]);
    if (scope && !scopeTenantId) {
      setCommissionsListState((prev) => ({ ...prev, items: [] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, scopeTenantId]);

  // Chargement initial des référentiels (entités, services, agences) UNE SEULE FOIS à l'activation
  const hasLoadedReferentials = useRef(false);
  useEffect(() => {
    if (enabled && !hasLoadedReferentials.current) {
      hasLoadedReferentials.current = true;
      if (!hasScope) loadAgencies();
      loadEntities();
    }
  }, [enabled, hasScope, loadAgencies, loadEntities]);

  // Chargement des commissions UNIQUEMENT lors du changement des filtres
  useEffect(() => {
    if (enabled) {
      loadCommissions();
    }
  }, [enabled, loadCommissions]);

  // ===== RATE SUM HELPER (backend requires s + tca + g + p == 100) =====
  const totalRate = useMemo(() => computeCommissionTotalRate(formState), [formState]);

  // ===== OPEN DIALOGS =====
  const openCreateDialog = () => {
    setEditingItem(null);
    const defaultService = catalogServicesState.items[0]?.code || "VERSEMENT";
    const defaultLevel: TenantLevel =
      commissionsListState.filterLevel === "STRUCTURE" || isStructureAdmin
        ? "STRUCTURE"
        : "PRODUCT";

    let defaultTenantId = commissionsListState.filterTenantId || "";
    if (!defaultTenantId) {
      if (defaultLevel === "STRUCTURE" && structuresState.items.length > 0) {
        defaultTenantId = structuresState.items[0].id;
      } else if (productsState.items.length > 0) {
        defaultTenantId = productsState.items[0].id;
      }
    }

    setFormState({
      ...emptyForm,
      serviceType: defaultService,
      tenantLevel: scope ? scope.tenantLevel : defaultLevel,
      tenantId: scope ? scopeTenantId ?? "" : defaultTenantId,
    });
    setSubmitError(null);
    resetFormErrors();
    setIsFormOpen(true);
  };

  const openEditDialog = (item: CommissionSplitResponse) => {
    setEditingItem(item);
    setFormState({
      tenantLevel: item.tenant_level,
      tenantId: item.tenant_id || "",
      serviceType: item.service_type,
      phase: item.phase,
      rateStructure: String(item.rate_structure),
      rateTcaStructure: String(item.rate_tca_structure),
      rateDistributeur: String(item.rate_distributeur),
      rateGroupement: String(item.rate_groupement),
      ratePartenaireTechnique: String(item.rate_partenaire_technique),
      overrideReason: item.override_reason || "",
    });
    setSubmitError(null);
    resetFormErrors();
    setIsFormOpen(true);
  };

  const openDetailDialog = async (item: CommissionSplitResponse) => {
    try {
      const detail = await fetchCommissionDetail(item.id);
      setDetailItem(detail);
    } catch (err) {
      toast.error(getErrorMessage(err, "Impossible de charger le détail de la répartition"));
    }
  };

  // ===== SAVE COMMISSION =====
  const handleSave = async () => {
    const rateStructure = parseFloat(formState.rateStructure);
    const rateTcaStructure = parseFloat(formState.rateTcaStructure);
    const rateDistributeur = parseFloat(formState.rateDistributeur);
    const rateGroupement = parseFloat(formState.rateGroupement);
    const ratePartenaireTechnique = parseFloat(formState.ratePartenaireTechnique);

    // En attente de création de l'entité, la cible n'existe pas encore : elle sera fixée à l'enregistrement
    const errors = validateCommissionForm(isStaging ? { ...formState, tenantId: PENDING_ID_PREFIX } : formState);
    setFormErrors(errors);
    if (hasFieldErrors(errors)) return;

    if (isStaging) {
      const pending: CommissionSplitResponse = {
        id: editingItem?.id ?? `${PENDING_ID_PREFIX}${Date.now()}`,
        tenant_level: formState.tenantLevel,
        tenant_id: null,
        service_type: formState.serviceType,
        phase: formState.phase,
        rate_structure: rateStructure,
        rate_tca_structure: rateTcaStructure,
        rate_distributeur: rateDistributeur,
        rate_groupement: rateGroupement,
        rate_partenaire_technique: ratePartenaireTechnique,
        override_reason: formState.overrideReason || null,
        is_active: editingItem?.is_active ?? true,
      };
      setPendingItems((prev) =>
        editingItem ? prev.map((item) => (item.id === editingItem.id ? pending : item)) : [...prev, pending],
      );
      handleFormOpenChange(false);
      return;
    }

    setIsSaving(true);
    setSubmitError(null);
    try {
      if (editingItem) {
        const payload: UpdateCommissionSplitRequest = {
          tenant_level: formState.tenantLevel,
          tenant_id: formState.tenantId || null,
          service_type: formState.serviceType,
          phase: formState.phase,
          rate_structure: rateStructure,
          rate_tca_structure: rateTcaStructure,
          rate_distributeur: rateDistributeur,
          rate_groupement: rateGroupement,
          rate_partenaire_technique: ratePartenaireTechnique,
          override_reason: formState.overrideReason || null,
        };
        await updateCommission(editingItem.id, payload);
        toast.success("Répartition de commission modifiée avec succès");
      } else {
        const payload: CreateCommissionSplitRequest = {
          tenant_level: formState.tenantLevel,
          tenant_id: formState.tenantId || null,
          service_type: formState.serviceType,
          phase: formState.phase,
          rate_structure: rateStructure,
          rate_tca_structure: rateTcaStructure,
          rate_distributeur: rateDistributeur,
          rate_groupement: rateGroupement,
          rate_partenaire_technique: ratePartenaireTechnique,
          override_reason: formState.overrideReason || null,
        };
        await createCommission(payload);
        toast.success("Répartition de commission créée avec succès");
      }
      setIsFormOpen(false);
      await loadCommissions();
    } catch (err: unknown) {
      setSubmitError(getErrorMessage(err, "Une erreur est survenue lors de l'enregistrement"));
    } finally {
      setIsSaving(false);
    }
  };

  // ===== TOGGLE STATUS =====
  const handleToggleStatus = async (item: CommissionSplitResponse) => {
    const nextActive = !item.is_active;
    if (item.id.startsWith(PENDING_ID_PREFIX)) {
      setPendingItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, is_active: nextActive } : p)));
      return;
    }
    try {
      await toggleCommissionStatus(item.id, nextActive);
      toast.success(nextActive ? "Répartition activée" : "Répartition désactivée");
      await loadCommissions();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Erreur lors du changement de statut"));
    }
  };

  // ===== DELETE =====
  const handleDelete = async (id: string) => {
    // La répartition supprimée était en cours de modification : on repart d'un formulaire vierge
    if (editingItem?.id === id) handleFormOpenChange(false);
    if (id.startsWith(PENDING_ID_PREFIX)) {
      setPendingItems((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirmId(null);
      return;
    }
    try {
      await deleteCommission(id);
      toast.success("Répartition supprimée");
      setDeleteConfirmId(null);
      await loadCommissions();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Erreur lors de la suppression"));
    }
  };

  /**
   * Crée les répartitions mises en attente pour l'entité désormais enregistrée.
   * Renvoie la liste des répartitions qui n'ont pas pu être créées.
   */
  const flushPendingCommissions = async (tenantId: string): Promise<CommissionSplitResponse[]> => {
    const failures: CommissionSplitResponse[] = [];
    for (const item of pendingItems) {
      try {
        await createCommission({
          tenant_level: item.tenant_level,
          tenant_id: tenantId,
          service_type: item.service_type,
          phase: item.phase,
          rate_structure: item.rate_structure,
          rate_tca_structure: item.rate_tca_structure,
          rate_distributeur: item.rate_distributeur,
          rate_groupement: item.rate_groupement,
          rate_partenaire_technique: item.rate_partenaire_technique,
          override_reason: item.override_reason ?? null,
        });
        // L'API crée une répartition active : on applique le statut choisi
        if (!item.is_active) {
          const created = await fetchCommissions({ tenant_level: item.tenant_level, tenant_id: tenantId, service_type: item.service_type });
          const match = created.find((c) => c.phase === item.phase);
          if (match) await toggleCommissionStatus(match.id, false);
        }
      } catch {
        failures.push(item);
      }
    }
    setPendingItems([]);
    return failures;
  };

  return {
    scope,
    isStaging,
    flushPendingCommissions,
    commissions: isStaging ? pendingItems : commissionsListState.items,
    isLoading: commissionsListState.isLoading,
    filterLevel: commissionsListState.filterLevel,
    filterTenantId: commissionsListState.filterTenantId,
    filterServiceType: commissionsListState.filterServiceType,
    setFilterLevel: (l: CommissionFilterLevel) => {
      let nextTenantId = "";
      if (l === "PRODUCT") {
        nextTenantId = isProductAdmin && resolvedInstitutionId ? resolvedInstitutionId : productsState.items[0]?.id || "";
      } else if (l === "STRUCTURE") {
        nextTenantId = isStructureAdmin && resolvedInstitutionId ? resolvedInstitutionId : structuresState.items[0]?.id || "";
      }
      setCommissionsListState((prev) => ({
        ...prev,
        filterLevel: l,
        filterTenantId: nextTenantId,
      }));
    },
    setFilterTenantId: (id: string) => setCommissionsListState((prev) => ({ ...prev, filterTenantId: id })),
    setFilterServiceType: (st: string) => setCommissionsListState((prev) => ({ ...prev, filterServiceType: st })),
    loadCommissions,

    // Entities
    activeAgencies,
    products: productsState.items,
    distributors: distributorsState.items,
    structures: structuresState.items,
    catalogServices: catalogServicesState.items,
    isLoadingCatalogServices: catalogServicesState.isLoading,

    // Form & Dialogs
    formState,
    setFormState,
    isFormOpen,
    setIsFormOpen: handleFormOpenChange,
    editingItem,
    detailItem,
    setDetailItem,
    isSaving,
    totalRate,
    submitError,
    formErrors,
    clearFormError,
    openCreateDialog,
    openEditDialog,
    openDetailDialog,
    handleSave,

    // Status & Delete
    handleToggleStatus,
    deleteConfirmId,
    setDeleteConfirmId,
    handleDelete,
  };
};
