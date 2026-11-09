import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/core/network/errorUtils";
import {
  PromoResponse,
  CreatePromoRequest,
  UpdatePromoRequest,
  ServiceType,
  TenantLevel,
  PromoForm,
  CatalogServiceItem,
  FeeResponse,
} from "../models/types";
import {
  fetchPromos,
  createPromo,
  updatePromo,
  deletePromo,
  togglePromoStatus,
  fetchPromoDetail,
} from "../services/promosService";
import { fetchFees } from "../services/feesService";
import { fetchCatalogServices } from "../services/commissionsService";
import { useAuthStore, getCurrentInstitutionId, parseDistributorIdFromToken } from "@/core/security/authStore";
import { fetchAgences } from "@/features/agences/services/agencesService";
import { AgenceRead } from "@/features/agences/models/types";
import { fetchDistributeurs } from "@/features/distributeurs/services/distributeursService";
import { Distributeur } from "@/features/distributeurs/models/types";
import { fetchStructures } from "@/features/structures/services/structuresService";
import { StructureRead } from "@/features/structures/models/types";
import { hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import { PromoFormField, validatePromoForm } from "../models/validation";

const emptyForm: PromoForm = {
  code: "",
  serviceType: "",
  tenantLevel: "GLOBAL",
  tenantId: "",
  feeGridId: "",
  startDate: new Date().toISOString().split("T")[0],
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  rateAmount: "",
  fixedAmount: "",
  overrideReason: "",
};

export interface UsePromosOptions {
  enabled?: boolean;
  structures?: StructureRead[];
  catalogServices?: CatalogServiceItem[];
  agencies?: AgenceRead[];
  distributors?: Distributeur[];
}

export const usePromos = (options?: UsePromosOptions) => {
  const enabled = options?.enabled ?? true;
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

  // ===== PROMOS LIST STATE =====
  const [promosListState, setPromosListState] = useState({
    items: [] as PromoResponse[],
    isLoading: false,
    filterLevel: (isStructureAdmin
      ? "STRUCTURE"
      : isProductAdmin
      ? "PRODUCT"
      : isDistributorAdmin
      ? "DISTRIBUTEUR"
      : "GLOBAL") as TenantLevel,
    filterTenantId: isStructureAdmin || isProductAdmin ? resolvedInstitutionId : isDistributorAdmin ? resolvedDistributorId : "",
    filterServiceType: "" as ServiceType | "",
  });

  // ===== DISTRIBUTORS & STRUCTURES & SERVICES =====
  const [distributorsState, setDistributorsState] = useState({
    items: options?.distributors || ([] as Distributeur[]),
    isLoading: false,
  });

  const [structuresState, setStructuresState] = useState({
    items: options?.structures || ([] as StructureRead[]),
    isLoading: false,
  });

  const [catalogServicesState, setCatalogServicesState] = useState({
    items: options?.catalogServices || ([] as CatalogServiceItem[]),
    isLoading: false,
  });

  const loadCatalogServices = useCallback(async () => {
    try {
      setCatalogServicesState((prev) => ({ ...prev, isLoading: true }));
      const data = await fetchCatalogServices();
      setCatalogServicesState({ items: data, isLoading: false });
    } catch (err) {
      console.error("Erreur chargement services du catalogue:", err);
      setCatalogServicesState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Sync state if options are provided or updated
  useEffect(() => {
    if (options?.catalogServices && options.catalogServices.length > 0) {
      setCatalogServicesState({ items: options.catalogServices, isLoading: false });
    }
  }, [options?.catalogServices]);

  useEffect(() => {
    if (options?.structures && options.structures.length > 0) {
      setStructuresState({ items: options.structures, isLoading: false });
    }
  }, [options?.structures]);

  useEffect(() => {
    if (options?.distributors && options.distributors.length > 0) {
      setDistributorsState({ items: options.distributors, isLoading: false });
    }
  }, [options?.distributors]);

  useEffect(() => {
    if (options?.agencies && options.agencies.length > 0) {
      setAgenciesState((prev) => ({ ...prev, items: options.agencies! }));
    }
  }, [options?.agencies]);

  const loadEntities = useCallback(async () => {
    try {
      const [dists, structs, services] = await Promise.all([
        options?.distributors?.length ? Promise.resolve(options.distributors) : fetchDistributeurs().catch(() => []),
        options?.structures?.length ? Promise.resolve(options.structures) : fetchStructures().catch(() => ({ data: [] })),
        options?.catalogServices?.length ? Promise.resolve(options.catalogServices) : fetchCatalogServices().catch(() => []),
      ]);
      const distributorList: Distributeur[] = Array.isArray(dists)
        ? dists
        : Array.isArray((dists as { items?: Distributeur[] })?.items)
        ? (dists as { items: Distributeur[] }).items
        : [];
      setDistributorsState({ items: distributorList, isLoading: false });
      setStructuresState({
        items: Array.isArray(structs) ? structs : structs?.data || [],
        isLoading: false,
      });
      setCatalogServicesState({ items: services, isLoading: false });
    } catch (e) {
      console.error("Erreur chargement entités", e);
    }
  }, [options?.distributors, options?.structures, options?.catalogServices]);

  // ===== MODAL & FORM STATE =====
  const [formState, setFormState] = useState<PromoForm>(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PromoResponse | null>(null);
  const [detailItem, setDetailItem] = useState<PromoResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  // Erreur renvoyée par l'API à l'enregistrement (les erreurs de saisie sont affichées sous les champs)
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    errors: formErrors,
    setErrors: setFormErrors,
    clearError: clearFormError,
    resetErrors: resetFormErrors,
  } = useFieldErrors<PromoFormField>();

  const handleFormOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setSubmitError(null);
      resetFormErrors();
    }
  };

  // ===== FEE GRIDS (FOR PROMO LINKING) =====
  const [feeGridsState, setFeeGridsState] = useState({
    items: [] as FeeResponse[],
    isLoading: false,
  });

  const loadFeeGrids = useCallback(
    async (tenantLevel: TenantLevel, tenantId?: string, serviceType?: string) => {
      try {
        setFeeGridsState((prev) => ({ ...prev, isLoading: true }));
        const params = {
          tenant_level: tenantLevel,
          tenant_id: tenantLevel === "GLOBAL" ? undefined : tenantId || undefined,
          service_type: serviceType || undefined,
        };
        const data = await fetchFees(params);
        setFeeGridsState({ items: data.filter((f) => f.is_active), isLoading: false });
      } catch (err) {
        console.error("Erreur chargement grilles de frais pour promo:", err);
        setFeeGridsState({ items: [], isLoading: false });
      }
    },
    []
  );

  useEffect(() => {
    if (isFormOpen) {
      void loadFeeGrids(formState.tenantLevel, formState.tenantId, formState.serviceType);
    }
  }, [isFormOpen, formState.tenantLevel, formState.tenantId, formState.serviceType, loadFeeGrids]);


  // ===== LOAD PROMOS =====
  const loadPromos = useCallback(async () => {
    if (!enabled) return;
    try {
      setPromosListState((prev) => ({ ...prev, isLoading: true }));
      const params = {
        tenant_level: promosListState.filterLevel,
        tenant_id: promosListState.filterTenantId || undefined,
        service_type: promosListState.filterServiceType || undefined,
      };
      const data = await fetchPromos(params);
      setPromosListState((prev) => ({ ...prev, items: data, isLoading: false }));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Erreur lors du chargement des promotions"));
      setPromosListState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [
    enabled,
    promosListState.filterLevel,
    promosListState.filterTenantId,
    promosListState.filterServiceType,
  ]);


  // Chargement initial des référentiels (entités, agences) UNE SEULE FOIS à l'activation
  const hasLoadedReferentials = useRef(false);
  useEffect(() => {
    if (enabled && !hasLoadedReferentials.current) {
      hasLoadedReferentials.current = true;
      loadAgencies();
      loadEntities();
    }
  }, [enabled, loadAgencies, loadEntities]);

  // Chargement des promos UNIQUEMENT lors du changement des filtres
  useEffect(() => {
    if (enabled) {
      loadPromos();
    }
  }, [enabled, loadPromos]);

  // ===== OPEN DIALOGS =====
  const openCreateDialog = () => {
    setEditingItem(null);
    const defaultService = catalogServicesState.items[0]?.code || "";
    setFormState({
      ...emptyForm,
      serviceType: defaultService,
      tenantLevel: promosListState.filterLevel,
      tenantId: promosListState.filterTenantId,
    });
    setSubmitError(null);
    resetFormErrors();
    setIsFormOpen(true);
  };

  const openEditDialog = (item: PromoResponse) => {
    setEditingItem(item);
    setFormState({
      code: item.code,
      serviceType: item.service_type,
      tenantLevel: item.tenant_level,
      tenantId: item.tenant_id || "",
      feeGridId: item.fee_grid_id || "",
      startDate: item.start_date ? item.start_date.split("T")[0] : "",
      endDate: item.end_date ? item.end_date.split("T")[0] : "",
      rateAmount: item.rate_amount != null && Number(item.rate_amount) > 0 ? String(item.rate_amount) : "",
      fixedAmount: item.fixed_amount != null && Number(item.fixed_amount) > 0 ? String(item.fixed_amount) : "",
      overrideReason: "",
    });
    setSubmitError(null);
    resetFormErrors();
    setIsFormOpen(true);
  };

  const openDetailDialog = async (item: PromoResponse) => {
    try {
      const detail = await fetchPromoDetail(item.id);
      setDetailItem(detail);
    } catch (err) {
      toast.error(getErrorMessage(err, "Impossible de charger le détail de la promotion"));
    }
  };

  // ===== SAVE PROMO =====
  const handleSave = async () => {
    const errors = validatePromoForm(formState, Boolean(editingItem));
    setFormErrors(errors);
    if (hasFieldErrors(errors)) return;

    const rateAmount = formState.rateAmount ? parseFloat(formState.rateAmount) : 0;
    const fixedAmount = formState.fixedAmount ? parseFloat(formState.fixedAmount) : 0;

    setIsSaving(true);
    setSubmitError(null);
    try {
      if (editingItem) {
        const payload: UpdatePromoRequest = {
          code: formState.code.trim().toUpperCase(),
          start_date: formState.startDate.split("T")[0],
          end_date: formState.endDate.split("T")[0],
          rate_amount: rateAmount,
          fixed_amount: fixedAmount,
          override_reason: formState.overrideReason || null,
        };
        await updatePromo(editingItem.id, payload);
        toast.success("Promotion modifiée avec succès");
      } else {
        const payload: CreatePromoRequest = {
          code: formState.code.trim().toUpperCase(),
          service_type: formState.serviceType,
          tenant_level: formState.tenantLevel,
          tenant_id: formState.tenantId || null,
          fee_grid_id: formState.feeGridId || null,
          start_date: formState.startDate.split("T")[0],
          end_date: formState.endDate.split("T")[0],
          rate_amount: rateAmount,
          fixed_amount: fixedAmount,
          override_reason: formState.overrideReason || null,
        };
        await createPromo(payload);
        toast.success("Promotion créée avec succès");
      }
      setIsFormOpen(false);
      await loadPromos();
    } catch (err: unknown) {
      setSubmitError(getErrorMessage(err, "Une erreur est survenue lors de l'enregistrement"));
    } finally {
      setIsSaving(false);
    }
  };

  // ===== TOGGLE STATUS =====
  const handleToggleStatus = async (item: PromoResponse) => {
    const nextActive = !item.is_active;
    try {
      await togglePromoStatus(item.id, nextActive);
      toast.success(nextActive ? "Promotion activée" : "Promotion désactivée");
      await loadPromos();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Erreur lors du changement de statut"));
    }
  };

  // ===== DELETE =====
  const handleDelete = async (id: string) => {
    try {
      await deletePromo(id);
      toast.success("Promotion supprimée");
      setDeleteConfirmId(null);
      await loadPromos();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Erreur lors de la suppression"));
    }
  };

  return {
    promos: promosListState.items,
    isLoading: promosListState.isLoading,
    filterLevel: promosListState.filterLevel,
    filterTenantId: promosListState.filterTenantId,
    filterServiceType: promosListState.filterServiceType,
    setFilterLevel: (l: TenantLevel) => setPromosListState((prev) => ({ ...prev, filterLevel: l, filterTenantId: "" })),
    setFilterTenantId: (id: string) => setPromosListState((prev) => ({ ...prev, filterTenantId: id })),
    setFilterServiceType: (st: ServiceType | "") => setPromosListState((prev) => ({ ...prev, filterServiceType: st })),
    loadPromos,

    // Entities
    activeAgencies,
    distributors: distributorsState.items,
    structures: structuresState.items,
    catalogServices: catalogServicesState.items,
    isLoadingCatalogServices: catalogServicesState.isLoading,
    loadCatalogServices,

    // Fee Grids
    feeGrids: feeGridsState.items,
    isLoadingFeeGrids: feeGridsState.isLoading,
    loadFeeGrids,

    // Form & Dialogs
    formState,
    setFormState,
    isFormOpen,
    setIsFormOpen: handleFormOpenChange,
    editingItem,
    detailItem,
    setDetailItem,
    isSaving,
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
