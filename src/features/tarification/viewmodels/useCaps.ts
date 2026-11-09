import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  CapResponse,
  UpsertCapRequest,
  ServiceType,
  TenantLevel,
  CapEditForm,
  CapCreateForm,
  CatalogServiceItem,
} from "../models/types";
import {
  fetchCaps,
  upsertCap,
  deleteCap,
} from "../services/capsService";
import { fetchCatalogServices } from "../services/commissionsService";
import { hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import { CapFormField, validateCapForm, validateCapLimits } from "../models/validation";
import { useAuthStore, getCurrentInstitutionId, getCurrentInstitutionLabel, parseDistributorIdFromToken } from "@/core/security/authStore";
import { fetchAgences } from "@/features/agences/services/agencesService";
import { AgenceRead } from "@/features/agences/models/types";
import { fetchProduits } from "@/features/produits/services/produitsService";
import { ProduitRead } from "@/features/produits/models/types";
import { fetchDistributeurs } from "@/features/distributeurs/services/distributeursService";
import { Distributeur } from "@/features/distributeurs/models/types";
import { fetchStructures, extractStructuresList } from "@/features/structures/services/structuresService";
import { StructureRead } from "@/features/structures/models/types";

const CAP_LIMIT_FIELDS = [
  "min_per_transaction",
  "max_per_transaction",
  "daily_cumulative",
  "monthly_cumulative",
] as const satisfies readonly CapFormField[];

const numOrNull = (v: string): number | null => {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

export interface UseCapsOptions {
  enabled?: boolean;
  structures?: StructureRead[];
  catalogServices?: CatalogServiceItem[];
  products?: ProduitRead[];
  agencies?: AgenceRead[];
  distributors?: Distributeur[];
}

export const useCaps = (options?: UseCapsOptions) => {
  const enabled = options?.enabled ?? true;
  const currentUser = useAuthStore((state) => state.user);
  const isStructureAdmin = currentUser?.entityContext === "Structure";
  const isProductAdmin = currentUser?.entityContext === "Produit";
  const isDistributorAdmin = currentUser?.entityContext === "Distributeur";

  const resolvedInstitutionId = currentUser?.institutionId || getCurrentInstitutionId() || "";
  const resolvedDistributorId = currentUser?.distributorId || parseDistributorIdFromToken(useAuthStore.getState().token || undefined) || "";

  // ===== CAPS LIST STATE =====
  const [capsListState, setCapsListState] = useState({
    items: [] as CapResponse[],
    isLoading: false,
    filterLevel: (isStructureAdmin
      ? "STRUCTURE"
      : isProductAdmin
      ? "PRODUCT"
      : isDistributorAdmin
      ? "DISTRIBUTEUR"
      : "GLOBAL") as TenantLevel,
    filterTenantId: isStructureAdmin || isProductAdmin ? resolvedInstitutionId : isDistributorAdmin ? resolvedDistributorId : "",
    selectedServiceType: "ALL" as string,
  });

  // ===== EDIT INLINE STATE =====
  const [editState, setEditState] = useState({
    isSaving: false,
    editingItem: null as CapResponse | null,
    form: {
      min_per_transaction: "",
      max_per_transaction: "",
      daily_cumulative: "",
      monthly_cumulative: "",
    } as CapEditForm,
    validationError: null as string | null,
  });

  // ===== CREATE FORM STATE =====
  const [createState, setCreateState] = useState({
    showForm: false,
    isCreating: false,
    form: {
      service_type: "VERSEMENT" as ServiceType,
      tenant_level: (isStructureAdmin
        ? "STRUCTURE"
        : isProductAdmin
        ? "PRODUCT"
        : isDistributorAdmin
        ? "DISTRIBUTEUR"
        : "GLOBAL") as TenantLevel,
      tenant_id: isStructureAdmin || isProductAdmin ? resolvedInstitutionId : isDistributorAdmin ? resolvedDistributorId : "",
      min_per_transaction: "",
      max_per_transaction: "",
      daily_cumulative: "",
      monthly_cumulative: "",
    } as CapCreateForm,
    validationError: null as string | null,
  });

  // Erreurs de saisie du formulaire de création/modification, affichées sous les champs
  const {
    errors: createFormErrors,
    setErrors: setCreateFormErrors,
    clearError: clearCreateFormError,
    resetErrors: resetCreateFormErrors,
  } = useFieldErrors<CapFormField>();

  // ===== CLIENT OVERRIDE DIALOG STATE =====
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);

  // ===== AGENCIES STATE =====
  const [agenciesState, setAgenciesState] = useState({
    items: (options?.agencies || []) as AgenceRead[],
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

  // ===== PRODUCTS STATE =====
  const [productsState, setProductsState] = useState({
    items: (options?.products || []) as ProduitRead[],
    isLoading: false,
  });

  const loadProducts = useCallback(async () => {
    try {
      setProductsState((prev) => ({ ...prev, isLoading: true }));
      const data = await fetchProduits();
      setProductsState((prev) => ({
        ...prev,
        items: data,
      }));
    } catch (err) {
      console.error("Erreur chargement produits", err);
    } finally {
      setProductsState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  // ===== DISTRIBUTORS STATE =====
  const [distributorsState, setDistributorsState] = useState({
    items: (options?.distributors || []) as Distributeur[],
    isLoading: false,
  });

  // ===== STRUCTURES STATE =====
  const [structures, setStructures] = useState<StructureRead[]>(options?.structures || []);

  const loadDistributors = useCallback(async () => {
    if (!currentUser) return;
    const institutionId = getCurrentInstitutionId();
    try {
      setDistributorsState((prev) => ({ ...prev, isLoading: true }));
      const params = isStructureAdmin && institutionId ? { structure_id: institutionId } : undefined;
      const res = await fetchDistributeurs(params);
      setDistributorsState((prev) => ({ ...prev, items: res.items }));
    } catch (err) {
      console.error("Erreur chargement distributeurs", err);
    } finally {
      setDistributorsState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [isStructureAdmin, currentUser]);

  // Sync state if user auth profile loads later
  useEffect(() => {
    if (isStructureAdmin && resolvedInstitutionId) {
      setCapsListState((prev) => ({
        ...prev,
        filterLevel: "STRUCTURE",
        filterTenantId: resolvedInstitutionId,
      }));
      setCreateState((prev) => ({
        ...prev,
        form: {
          ...prev.form,
          tenant_level: "STRUCTURE",
          tenant_id: resolvedInstitutionId,
        },
      }));
    } else if (isProductAdmin && resolvedInstitutionId) {
      setCapsListState((prev) => ({
        ...prev,
        filterLevel: "PRODUCT",
        filterTenantId: resolvedInstitutionId,
      }));
      setCreateState((prev) => ({
        ...prev,
        form: {
          ...prev.form,
          tenant_level: "PRODUCT",
          tenant_id: resolvedInstitutionId,
        },
      }));
    } else if (isDistributorAdmin && resolvedDistributorId) {
      setCapsListState((prev) => ({
        ...prev,
        filterLevel: "DISTRIBUTEUR",
        filterTenantId: resolvedDistributorId,
      }));
      setCreateState((prev) => ({
        ...prev,
        form: {
          ...prev.form,
          tenant_level: "DISTRIBUTEUR",
          tenant_id: resolvedDistributorId,
        },
      }));
    }
  }, [isStructureAdmin, isProductAdmin, isDistributorAdmin, resolvedInstitutionId, resolvedDistributorId]);

  // ===== CATALOG SERVICES =====
  const [catalogServices, setCatalogServices] = useState<CatalogServiceItem[]>(options?.catalogServices || []);
  const [isLoadingCatalogServices, setIsLoadingCatalogServices] = useState(false);

  const loadCatalogServices = useCallback(async () => {
    try {
      setIsLoadingCatalogServices(true);
      const data = await fetchCatalogServices();
      setCatalogServices(data);
    } catch (err) {
      console.error("Erreur chargement services du catalogue:", err);
    } finally {
      setIsLoadingCatalogServices(false);
    }
  }, []);

  // Sync state if options are provided or updated
  useEffect(() => {
    if (options?.structures && options.structures.length > 0) {
      setStructures(options.structures);
    }
  }, [options?.structures]);

  useEffect(() => {
    if (options?.catalogServices && options.catalogServices.length > 0) {
      setCatalogServices(options.catalogServices);
    }
  }, [options?.catalogServices]);

  useEffect(() => {
    if (options?.products && options.products.length > 0) {
      setProductsState((prev) => ({ ...prev, items: options.products! }));
    }
  }, [options?.products]);

  useEffect(() => {
    if (options?.agencies && options.agencies.length > 0) {
      setAgenciesState((prev) => ({ ...prev, items: options.agencies! }));
    }
  }, [options?.agencies]);

  useEffect(() => {
    if (options?.distributors && options.distributors.length > 0) {
      setDistributorsState((prev) => ({ ...prev, items: options.distributors! }));
    }
  }, [options?.distributors]);

  // Load referentials only once and only what is missing
  const hasLoadedReferentials = useRef(false);
  useEffect(() => {
    if (!enabled || hasLoadedReferentials.current) return;
    hasLoadedReferentials.current = true;

    if (!options?.agencies?.length) void loadAgencies();
    if (!options?.products?.length) void loadProducts();
    if (!options?.distributors?.length) void loadDistributors();
    if (!options?.catalogServices?.length) void loadCatalogServices();
    if (!options?.structures?.length) {
      fetchStructures()
        .then((res) => {
          const list = extractStructuresList(res);
          setStructures(list);
        })
        .catch(() => {});
    }
  }, [enabled, options, loadAgencies, loadProducts, loadDistributors, loadCatalogServices]);

  // =========================
  // LIST
  // =========================
  const { filterLevel: capsFilterLevel, filterTenantId: capsFilterTenantId, selectedServiceType: capsSelectedServiceType } = capsListState;

  const loadCaps = useCallback(async () => {
    setCapsListState((prev) => ({ ...prev, isLoading: true }));
    try {
      const data = await fetchCaps({
        tenant_level: capsFilterLevel,
        tenant_id: capsFilterLevel === "GLOBAL" ? undefined : capsFilterTenantId?.trim() || undefined,
        service_type: capsSelectedServiceType === "ALL" ? undefined : (capsSelectedServiceType as ServiceType),
      });
      setCapsListState((prev) => ({ ...prev, items: data }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de chargement des plafonds");
    } finally {
      setCapsListState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [capsFilterLevel, capsFilterTenantId, capsSelectedServiceType]);

  useEffect(() => {
    if (!enabled) return;
    void loadCaps();
  }, [enabled, loadCaps]);

  // =========================
  // EDIT INLINE
  // =========================
  const handleStartEdit = useCallback((cap: CapResponse) => {
    setEditState((prev) => ({
      ...prev,
      editingItem: cap,
      validationError: null,
      form: {
        min_per_transaction: cap.min_per_transaction != null ? String(cap.min_per_transaction) : "",
        max_per_transaction: cap.max_per_transaction != null ? String(cap.max_per_transaction) : "",
        daily_cumulative: cap.daily_cumulative != null ? String(cap.daily_cumulative) : "",
        monthly_cumulative: cap.monthly_cumulative != null ? String(cap.monthly_cumulative) : "",
      },
    }));
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditState((prev) => ({
      ...prev,
      editingItem: null,
      validationError: null,
    }));
  }, []);

  const handleFieldChange = useCallback((field: keyof CapEditForm, value: string) => {
    setEditState((prev) => ({
      ...prev,
      validationError: null,
      form: {
        ...prev.form,
        [field]: value,
      },
    }));
  }, []);

  const validateForm = (form: CapEditForm): string | null =>
    Object.values(validateCapLimits(form)).find(Boolean) ?? null;

  const handleSave = useCallback(async () => {
    const { editingItem, form } = editState;
    if (!editingItem) return;
    const error = validateForm(form);
    if (error) {
      setEditState((prev) => ({ ...prev, validationError: error }));
      return;
    }
    setEditState((prev) => ({ ...prev, isSaving: true }));
    try {
      const payload: UpsertCapRequest = {
        service_type: editingItem.service_type,
        tenant_level: editingItem.tenant_level,
        tenant_id: editingItem.tenant_level === "GLOBAL" ? null : editingItem.tenant_id ?? null,
        min_per_transaction: numOrNull(form.min_per_transaction),
        max_per_transaction: numOrNull(form.max_per_transaction),
        daily_cumulative: numOrNull(form.daily_cumulative),
        monthly_cumulative: numOrNull(form.monthly_cumulative),
      };
      const updated = await upsertCap(payload);
      setCapsListState((prev) => ({
        ...prev,
        items: prev.items.map((c) => (c.id === updated.id ? updated : c)),
      }));
      setEditState((prev) => ({
        ...prev,
        editingItem: null,
        validationError: null,
      }));
      toast.success("Plafond mis à jour avec succès");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde du plafond");
    } finally {
      setEditState((prev) => ({ ...prev, isSaving: false }));
    }
  }, [editState]);

  // Auto select first agency when agencies list is loaded and filterLevel is AGENCY
  const agenciesItems = agenciesState.items;
  useEffect(() => {
    if ((isStructureAdmin || isDistributorAdmin) && capsFilterLevel === "AGENCY" && !capsFilterTenantId && agenciesItems.length > 0) {
      setCapsListState((prev) => ({ ...prev, filterTenantId: agenciesItems[0].id }));
    }
  }, [isStructureAdmin, isDistributorAdmin, capsFilterLevel, capsFilterTenantId, agenciesItems]);

  // =========================
  // CREATE
  // =========================
  const handleCreateFieldChange = useCallback(<K extends keyof CapCreateForm>(field: K, value: CapCreateForm[K]) => {
    if (isStructureAdmin && field === "tenant_level" && value !== "STRUCTURE" && value !== "AGENCY") {
      return;
    }
    if (isStructureAdmin && field === "tenant_id" && createState.form.tenant_level === "STRUCTURE") {
      return;
    }
    if (isDistributorAdmin && field === "tenant_level" && value !== "DISTRIBUTEUR" && value !== "AGENCY") {
      return;
    }
    if (isDistributorAdmin && field === "tenant_id" && createState.form.tenant_level === "DISTRIBUTEUR") {
      return;
    }
    if (isProductAdmin && (field === "tenant_level" || field === "tenant_id")) {
      return;
    }
    if (field === "tenant_level") {
      clearCreateFormError("tenant_id");
    } else {
      clearCreateFormError(field as CapFormField);
      // Les plafonds sont comparés entre eux : modifier l'un efface les erreurs des plafonds suivants.
      const limitIndex = CAP_LIMIT_FIELDS.indexOf(field as (typeof CAP_LIMIT_FIELDS)[number]);
      if (limitIndex >= 0) CAP_LIMIT_FIELDS.slice(limitIndex + 1).forEach(clearCreateFormError);
    }
    setCreateState((prev) => {
      const nextForm = { ...prev.form, [field]: value };
      if (field === "tenant_level") {
        if (value === "GLOBAL") {
          nextForm.tenant_id = "";
        } else if (value === "STRUCTURE") {
          nextForm.tenant_id = isStructureAdmin ? resolvedInstitutionId : structures[0]?.id || "";
        } else if (value === "PRODUCT") {
          nextForm.tenant_id = isProductAdmin ? resolvedInstitutionId : productsState.items[0]?.id || "";
        } else if (value === "DISTRIBUTEUR") {
          nextForm.tenant_id = isDistributorAdmin ? resolvedDistributorId : distributorsState.items[0]?.id || "";
        } else if (value === "AGENCY") {
          nextForm.tenant_id = agenciesState.items[0]?.id || "";
        }
      }
      return {
        ...prev,
        validationError: null,
        form: nextForm,
      };
    });
  }, [isStructureAdmin, isProductAdmin, isDistributorAdmin, createState.form.tenant_level, resolvedInstitutionId, resolvedDistributorId, structures, productsState.items, distributorsState.items, agenciesState.items, clearCreateFormError]);

  const openEditDialog = useCallback((cap: CapResponse) => {
    resetCreateFormErrors();
    setEditState((prev) => ({
      ...prev,
      editingItem: cap,
      validationError: null,
    }));
    setCreateState((prev) => ({
      ...prev,
      showForm: true,
      validationError: null,
      form: {
        service_type: cap.service_type,
        tenant_level: cap.tenant_level,
        tenant_id: cap.tenant_id ?? "",
        min_per_transaction: cap.min_per_transaction != null ? String(cap.min_per_transaction) : "",
        max_per_transaction: cap.max_per_transaction != null ? String(cap.max_per_transaction) : "",
        daily_cumulative: cap.daily_cumulative != null ? String(cap.daily_cumulative) : "",
        monthly_cumulative: cap.monthly_cumulative != null ? String(cap.monthly_cumulative) : "",
      },
    }));
  }, [resetCreateFormErrors]);

  const handleCreate = useCallback(async () => {
    const isEditing = !!editState.editingItem;
    const { form } = createState;
    const errors = validateCapForm(form);
    setCreateFormErrors(errors);
    if (hasFieldErrors(errors)) {
      setCreateState((prev) => ({ ...prev, validationError: null }));
      return;
    }
    const min = numOrNull(form.min_per_transaction);
    const max = numOrNull(form.max_per_transaction);
    const daily = numOrNull(form.daily_cumulative);
    const monthly = numOrNull(form.monthly_cumulative);
    setCreateState((prev) => ({ ...prev, isCreating: true, validationError: null }));
    try {
      const payload: UpsertCapRequest = {
        service_type: form.service_type,
        tenant_level: form.tenant_level,
        tenant_id: form.tenant_level === "GLOBAL" ? null : form.tenant_id.trim() || null,
        min_per_transaction: min,
        max_per_transaction: max,
        daily_cumulative: daily,
        monthly_cumulative: monthly,
      };
      const result = await upsertCap(payload);
      setCapsListState((prev) => {
        const idx = prev.items.findIndex(
          (c) => c.id === result.id || (c.service_type === result.service_type && c.tenant_level === result.tenant_level && (c.tenant_id ?? null) === (result.tenant_id ?? null))
        );
        return {
          ...prev,
          items: idx >= 0
            ? prev.items.map((c, i) => (i === idx ? result : c))
            : [result, ...prev.items],
        };
      });
      setEditState((prev) => ({ ...prev, editingItem: null, validationError: null }));
      setCreateState((prev) => ({
        ...prev,
        showForm: false,
        form: {
          service_type: "VERSEMENT",
          tenant_level: isStructureAdmin ? "STRUCTURE" : isProductAdmin ? "PRODUCT" : isDistributorAdmin ? "DISTRIBUTEUR" : "GLOBAL",
          tenant_id: isStructureAdmin || isProductAdmin ? resolvedInstitutionId : isDistributorAdmin ? resolvedDistributorId : "",
          min_per_transaction: "",
          max_per_transaction: "",
          daily_cumulative: "",
          monthly_cumulative: "",
        },
        validationError: null,
      }));
      toast.success(isEditing ? "Plafond mis à jour avec succès" : "Plafond créé avec succès");
    } catch (err) {
      const msg = err instanceof Error ? err.message : isEditing ? "Erreur lors de la sauvegarde du plafond" : "Erreur lors de la création du plafond";
      setCreateState((prev) => ({ ...prev, validationError: msg }));
    } finally {
      setCreateState((prev) => ({ ...prev, isCreating: false }));
    }
  }, [createState, editState.editingItem, isStructureAdmin, isProductAdmin, isDistributorAdmin, resolvedInstitutionId, resolvedDistributorId, setCreateFormErrors]);

  const handleFilterLevelChange = useCallback((level: TenantLevel) => {
    if (isStructureAdmin && level !== "STRUCTURE" && level !== "AGENCY") {
      return;
    }
    if (isProductAdmin && level !== "PRODUCT") {
      return;
    }
    if (isDistributorAdmin && level !== "DISTRIBUTEUR" && level !== "AGENCY") {
      return;
    }
    
    setCapsListState((prev) => {
      let tenantId = "";
      if (level === "GLOBAL") {
        tenantId = "";
      } else if (level === "STRUCTURE") {
        tenantId = isStructureAdmin ? resolvedInstitutionId : structures[0]?.id || "";
      } else if (level === "PRODUCT") {
        tenantId = isProductAdmin ? resolvedInstitutionId : productsState.items[0]?.id || "";
      } else if (level === "DISTRIBUTEUR") {
        tenantId = isDistributorAdmin ? resolvedDistributorId : distributorsState.items[0]?.id || "";
      } else if (level === "AGENCY") {
        tenantId = agenciesState.items[0]?.id || "";
      }
      return {
        ...prev,
        filterLevel: level,
        filterTenantId: tenantId,
      };
    });
  }, [isStructureAdmin, isProductAdmin, isDistributorAdmin, resolvedInstitutionId, resolvedDistributorId, structures, productsState.items, distributorsState.items, agenciesState.items]);

  const removeCap = useCallback(async (id: string) => {
    try {
      await deleteCap(id);
      setCapsListState((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
      toast.success("Plafond supprimé avec succès");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de supprimer le plafond");
    }
  }, []);

  return {
    // List
    caps: capsListState.items,
    isLoading: capsListState.isLoading,
    loadCaps,
    filterLevel: capsListState.filterLevel,
    setFilterLevel: (level: TenantLevel) =>
      setCapsListState((prev) => ({ ...prev, filterLevel: level })),
    filterTenantId: capsListState.filterTenantId,
    setFilterTenantId: (id: string) =>
      setCapsListState((prev) => ({ ...prev, filterTenantId: id })),
    handleFilterLevelChange,
    selectedServiceType: capsListState.selectedServiceType,
    setSelectedServiceType: (service: string) =>
      setCapsListState((prev) => ({ ...prev, selectedServiceType: service })),
    catalogServices,
    isLoadingCatalogServices,
    institutionLabel: getCurrentInstitutionLabel(),
    // Edit & Dialog
    isSaving: editState.isSaving || createState.isCreating,
    editingCap: editState.editingItem,
    editForm: editState.form,
    validationError: editState.validationError,
    handleStartEdit: openEditDialog,
    openEditDialog,
    handleCancelEdit,
    handleFieldChange,
    handleSave,
    // Create/Edit Dialog
    dialogOpen: createState.showForm,
    setDialogOpen: (open: boolean) => {
      if (!open) {
        setEditState((prev) => ({ ...prev, editingItem: null, validationError: null }));
      }
      resetCreateFormErrors();
      setCreateState((prev) => ({ ...prev, showForm: open, validationError: null }));
    },
    openCreateDialog: () => {
      resetCreateFormErrors();
      setEditState((prev) => ({ ...prev, editingItem: null, validationError: null }));
      setCreateState((prev) => ({
        ...prev,
        showForm: true,
        validationError: null,
        form: {
          service_type: "VERSEMENT",
          tenant_level: isStructureAdmin
            ? "STRUCTURE"
            : isProductAdmin
            ? "PRODUCT"
            : isDistributorAdmin
            ? "DISTRIBUTEUR"
            : "GLOBAL",
          tenant_id: isStructureAdmin || isProductAdmin ? resolvedInstitutionId : isDistributorAdmin ? resolvedDistributorId : "",
          min_per_transaction: "",
          max_per_transaction: "",
          daily_cumulative: "",
          monthly_cumulative: "",
        },
      }));
    },
    closeCreateDialog: () => {
      resetCreateFormErrors();
      setEditState((prev) => ({ ...prev, editingItem: null, validationError: null }));
      setCreateState((prev) => ({ ...prev, showForm: false, validationError: null }));
    },
    // Client Override Dialog
    overrideDialogOpen,
    setOverrideDialogOpen,
    openOverrideDialog: () => setOverrideDialogOpen(true),
    closeOverrideDialog: () => setOverrideDialogOpen(false),
    showCreateForm: createState.showForm,
    setShowCreateForm: (show: boolean | ((prev: boolean) => boolean)) =>
      setCreateState((prev) => ({
        ...prev,
        showForm: typeof show === "function" ? show(prev.showForm) : show,
      })),
    isCreating: createState.isCreating,
    createForm: createState.form,
    /** Erreur renvoyée par l'API à l'enregistrement (les erreurs de saisie sont dans createFormErrors). */
    createSubmitError: createState.validationError,
    createFormErrors,
    handleCreateFieldChange,
    handleCreate,
    currentUser,
    isStructureAdmin,
    isProductAdmin,
    isDistributorAdmin,
    agencies: agenciesState.items,
    activeAgencies,
    isLoadingAgencies: agenciesState.isLoading,
    products: productsState.items,
    isLoadingProducts: productsState.isLoading,
    distributors: distributorsState.items,
    isLoadingDistributors: distributorsState.isLoading,
    structures,
    removeCap,
  };
};
