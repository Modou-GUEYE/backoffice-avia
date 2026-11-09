import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  CapResponse,
  UpsertCapRequest,
  ServiceType,
  fetchCaps,
  upsertCap,
  deleteCap,
} from "../services/capsService";
import { useAuthStore, getCurrentInstitutionId, parseDistributorIdFromToken } from "@/core/security/authStore";
import { fetchAgences } from "@/features/agences/services/agencesService";
import { AgenceRead } from "@/features/agences/models/types";
import { fetchProduits } from "@/features/produits/services/produitsService";
import { ProduitRead } from "@/features/produits/models/types";
import { fetchDistributeurs } from "@/features/distributeurs/services/distributeursService";
import { Distributeur } from "@/features/distributeurs/models/types";
import { fetchStructures } from "@/features/structures/services/structuresService";
import { StructureRead } from "@/features/structures/models/types";

export interface CapEditForm {
  min_per_transaction: string;
  max_per_transaction: string;
  daily_cumulative: string;
  monthly_cumulative: string;
}

export interface CapCreateForm {
  service_type: ServiceType;
  tenant_level: import("../services/capsService").TenantLevel;
  tenant_id: string;
  min_per_transaction: string;
  max_per_transaction: string;
  daily_cumulative: string;
  monthly_cumulative: string;
}

const numOrNull = (v: string): number | null => {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

export const useCaps = (options?: { enabled?: boolean }) => {
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
      : "GLOBAL") as import("../services/capsService").TenantLevel,
    filterTenantId: isStructureAdmin || isProductAdmin ? resolvedInstitutionId : isDistributorAdmin ? resolvedDistributorId : "",
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
        : "GLOBAL") as import("../services/capsService").TenantLevel,
      tenant_id: isStructureAdmin || isProductAdmin ? resolvedInstitutionId : isDistributorAdmin ? resolvedDistributorId : "",
      min_per_transaction: "",
      max_per_transaction: "",
      daily_cumulative: "",
      monthly_cumulative: "",
    } as CapCreateForm,
    validationError: null as string | null,
  });

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

  // ===== PRODUCTS STATE =====
  const [productsState, setProductsState] = useState({
    items: [] as ProduitRead[],
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
    items: [] as Distributeur[],
    isLoading: false,
  });

  // ===== STRUCTURES STATE =====
  const [structures, setStructures] = useState<StructureRead[]>([]);

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

  useEffect(() => {
    if (!enabled) return;
    void loadAgencies();
    void loadProducts();
    void loadDistributors();
    // Load structures for consolidated view entity labels
    fetchStructures().then(setStructures).catch(() => {});
  }, [enabled, loadAgencies, loadProducts, loadDistributors]);

  // =========================
  // LIST
  // =========================
  const loadCaps = useCallback(async () => {
    const { filterLevel, filterTenantId } = capsListState;
    setCapsListState((prev) => ({ ...prev, isLoading: true }));
    try {
      const data = await fetchCaps({
        tenant_level: filterLevel,
        tenant_id: filterTenantId || undefined,
      });
      setCapsListState((prev) => ({ ...prev, items: data }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de chargement des plafonds");
    } finally {
      setCapsListState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [capsListState.filterLevel, capsListState.filterTenantId]);

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

  const validateForm = (form: CapEditForm): string | null => {
    const min = numOrNull(form.min_per_transaction);
    const max = numOrNull(form.max_per_transaction);
    const daily = numOrNull(form.daily_cumulative);
    const monthly = numOrNull(form.monthly_cumulative);
    if (max !== null && min !== null && max < min)
      return "Erreur, le montant max doit être > à montant min";
    if (daily !== null) {
      if ((max !== null && daily < max) || (min !== null && daily < min))
        return "Erreur, le cumul journalier doit être > à montant max ou min";
    }
    if (monthly !== null) {
      if ((daily !== null && monthly < daily) || (max !== null && monthly < max) || (min !== null && monthly < min))
        return "Erreur, le cumul mensuel doit être > à cumul journalier ou montant max ou min";
    }
    return null;
  };

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
        tenant_id: editingItem.tenant_id ?? undefined,
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
  useEffect(() => {
    const { filterLevel, filterTenantId } = capsListState;
    const { items: agenciesItems } = agenciesState;
    if ((isStructureAdmin || isDistributorAdmin) && filterLevel === "AGENCY" && !filterTenantId && agenciesItems.length > 0) {
      setCapsListState((prev) => ({ ...prev, filterTenantId: agenciesItems[0].id }));
    }
  }, [isStructureAdmin, isDistributorAdmin, capsListState.filterLevel, capsListState.filterTenantId, agenciesState.items]);

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
    setCreateState((prev) => {
      const nextForm = { ...prev.form, [field]: value };
      if (field === "tenant_level") {
        if (value === "STRUCTURE") {
          nextForm.tenant_id = resolvedInstitutionId;
        } else if (value === "DISTRIBUTEUR") {
          nextForm.tenant_id = resolvedDistributorId;
        } else {
          nextForm.tenant_id = agenciesState.items[0]?.id || "";
        }
      }
      return {
        ...prev,
        validationError: null,
        form: nextForm,
      };
    });
  }, [isStructureAdmin, isProductAdmin, isDistributorAdmin, createState.form.tenant_level, resolvedInstitutionId, resolvedDistributorId, agenciesState.items]);

  const handleCreate = useCallback(async () => {
    const { form } = createState;
    if (form.tenant_level !== "GLOBAL" && !form.tenant_id.trim()) {
      setCreateState((prev) => ({ ...prev, validationError: "L'identifiant est requis pour ce niveau de locataire (Structure, Agence ou Produit)" }));
      return;
    }
    const min = numOrNull(form.min_per_transaction);
    const max = numOrNull(form.max_per_transaction);
    const daily = numOrNull(form.daily_cumulative);
    const monthly = numOrNull(form.monthly_cumulative);
    if (max !== null && min !== null && max < min) {
      setCreateState((prev) => ({ ...prev, validationError: "Erreur, le montant max doit être > à montant min" })); return;
    }
    if (daily !== null && ((max !== null && daily < max) || (min !== null && daily < min))) {
      setCreateState((prev) => ({ ...prev, validationError: "Erreur, le cumul journalier doit être > à montant max ou min" })); return;
    }
    if (monthly !== null && ((daily !== null && monthly < daily) || (max !== null && monthly < max) || (min !== null && monthly < min))) {
      setCreateState((prev) => ({ ...prev, validationError: "Erreur, le cumul mensuel doit être > à cumul journalier ou montant max ou min" })); return;
    }
    setCreateState((prev) => ({ ...prev, isCreating: true }));
    try {
      const payload: UpsertCapRequest = {
        service_type: form.service_type,
        tenant_level: form.tenant_level,
        tenant_id: form.tenant_id || null,
        min_per_transaction: min,
        max_per_transaction: max,
        daily_cumulative: daily,
        monthly_cumulative: monthly,
      };
      const created = await upsertCap(payload);
      setCapsListState((prev) => {
        const idx = prev.items.findIndex(
          (c) => c.service_type === created.service_type && c.tenant_level === created.tenant_level
        );
        return {
          ...prev,
          items: idx >= 0
            ? prev.items.map((c, i) => (i === idx ? created : c))
            : [created, ...prev.items],
        };
      });
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
      toast.success("Plafond créé avec succès");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création du plafond");
    } finally {
      setCreateState((prev) => ({ ...prev, isCreating: false }));
    }
  }, [createState, isStructureAdmin, isProductAdmin, isDistributorAdmin, resolvedInstitutionId, resolvedDistributorId]);

  const handleFilterLevelChange = useCallback((level: import("../services/capsService").TenantLevel) => {
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
      if (level === "STRUCTURE" && isStructureAdmin) {
        tenantId = resolvedInstitutionId;
      } else if (level === "PRODUCT" && isProductAdmin) {
        tenantId = resolvedInstitutionId;
      } else if (level === "DISTRIBUTEUR" && isDistributorAdmin) {
        tenantId = resolvedDistributorId;
      } else {
        tenantId = agenciesState.items[0]?.id || "";
      }
      return {
        ...prev,
        filterLevel: level,
        filterTenantId: tenantId,
      };
    });
  }, [isStructureAdmin, isProductAdmin, isDistributorAdmin, resolvedInstitutionId, resolvedDistributorId, agenciesState.items]);

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
    setFilterLevel: (level: import("../services/capsService").TenantLevel) =>
      setCapsListState((prev) => ({ ...prev, filterLevel: level })),
    filterTenantId: capsListState.filterTenantId,
    setFilterTenantId: (id: string) =>
      setCapsListState((prev) => ({ ...prev, filterTenantId: id })),
    handleFilterLevelChange,
    // Edit
    isSaving: editState.isSaving,
    editingCap: editState.editingItem,
    editForm: editState.form,
    validationError: editState.validationError,
    handleStartEdit,
    handleCancelEdit,
    handleFieldChange,
    handleSave,
    // Create
    showCreateForm: createState.showForm,
    setShowCreateForm: (show: boolean | ((prev: boolean) => boolean)) =>
      setCreateState((prev) => ({
        ...prev,
        showForm: typeof show === "function" ? show(prev.showForm) : show,
      })),
    isCreating: createState.isCreating,
    createForm: createState.form,
    createValidationError: createState.validationError,
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
