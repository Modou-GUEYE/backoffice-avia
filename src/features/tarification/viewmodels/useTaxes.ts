import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  TaxResponse,
  CreateTaxRequest,
  UpdateTaxRequest,
  ClientType,
  ServiceType,
  TenantLevel,
  TaxForm,
  CatalogServiceItem,
} from "../models/types";
import {
  fetchTaxes,
  createTax,
  updateTax,
  deleteTax,
  toggleTaxStatus,
  fetchTaxDetail,
} from "../services/taxesService";
import { fetchCatalogServices } from "../services/commissionsService";
import { useAuthStore, getCurrentInstitutionId, getCurrentInstitutionLabel, parseDistributorIdFromToken } from "@/core/security/authStore";
import { fetchAgences } from "@/features/agences/services/agencesService";
import { AgenceRead } from "@/features/agences/models/types";
import { fetchProduits } from "@/features/produits/services/produitsService";
import { ProduitRead } from "@/features/produits/models/types";
import { fetchDistributeurs } from "@/features/distributeurs/services/distributeursService";
import { Distributeur } from "@/features/distributeurs/models/types";
import { fetchStructures, extractStructuresList } from "@/features/structures/services/structuresService";
import { StructureRead } from "@/features/structures/models/types";
import { hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import { TaxFormField, validateTaxForm } from "../models/validation";

export interface UseTaxesOptions {
  enabled?: boolean;
  structures?: StructureRead[];
  catalogServices?: CatalogServiceItem[];
  products?: ProduitRead[];
  agencies?: AgenceRead[];
  distributors?: Distributeur[];
}

export const useTaxes = (options?: UseTaxesOptions) => {
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

  // ===== TAXES LIST STATE =====
  const [taxesListState, setTaxesListState] = useState({
    items: [] as TaxResponse[],
    isLoading: false,
    filterLevel: (isStructureAdmin
      ? "STRUCTURE"
      : isProductAdmin
      ? "PRODUCT"
      : isDistributorAdmin
      ? "DISTRIBUTEUR"
      : "GLOBAL") as TenantLevel,
    filterTenantId: isStructureAdmin || isProductAdmin ? resolvedInstitutionId : isDistributorAdmin ? resolvedDistributorId : "",
    selectedServiceType: "ALL" as ServiceType | "ALL",
  });

  // ===== DIALOG STATES =====
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    isSaving: false,
    editingItem: null as TaxResponse | null,
  });

  // ===== DETAIL DIALOG STATES =====
  const [detailState, setDetailState] = useState({
    isOpen: false,
    viewingItem: null as TaxResponse | null,
    isLoading: false,
  });

  // ===== FORM STATE =====
  const {
    errors: formErrors,
    setErrors: setFormErrors,
    clearError: clearFormError,
    resetErrors: resetFormErrors,
  } = useFieldErrors<TaxFormField>();

  const [taxForm, setTaxForm] = useState<TaxForm>({
    tenantLevel: isStructureAdmin ? "STRUCTURE" : isProductAdmin ? "PRODUCT" : isDistributorAdmin ? "DISTRIBUTEUR" : "GLOBAL",
    tenantId: isStructureAdmin || isProductAdmin ? resolvedInstitutionId : isDistributorAdmin ? resolvedDistributorId : "",
    serviceType: "VERSEMENT",
    clientType: "PARTICULIER",
    taxType: "TIMBRE_FISCAL",
    taxRate: "",
    taxAmount: "",
    overrideReason: "",
  });

  const resetForm = useCallback(() => {
    setTaxForm({
      tenantLevel: isStructureAdmin ? "STRUCTURE" : isProductAdmin ? "PRODUCT" : isDistributorAdmin ? "DISTRIBUTEUR" : "GLOBAL",
      tenantId: isStructureAdmin || isProductAdmin ? resolvedInstitutionId : isDistributorAdmin ? resolvedDistributorId : "",
      serviceType: "VERSEMENT",
      clientType: "PARTICULIER",
      taxType: "TIMBRE_FISCAL",
      taxRate: "",
      taxAmount: "",
      overrideReason: "",
    });
    setDialogState((prev) => ({ ...prev, editingItem: null }));
    resetFormErrors();
  }, [isStructureAdmin, isProductAdmin, isDistributorAdmin, resolvedInstitutionId, resolvedDistributorId, resetFormErrors]);

  // Sync state if user auth profile loads later
  useEffect(() => {
    if (isStructureAdmin && resolvedInstitutionId) {
      setTaxesListState((prev) => ({
        ...prev,
        filterLevel: "STRUCTURE",
        filterTenantId: resolvedInstitutionId,
      }));
    } else if (isProductAdmin && resolvedInstitutionId) {
      setTaxesListState((prev) => ({
        ...prev,
        filterLevel: "PRODUCT",
        filterTenantId: resolvedInstitutionId,
      }));
    } else if (isDistributorAdmin && resolvedDistributorId) {
      setTaxesListState((prev) => ({
        ...prev,
        filterLevel: "DISTRIBUTEUR",
        filterTenantId: resolvedDistributorId,
      }));
    }
    resetForm();
  }, [isStructureAdmin, isProductAdmin, isDistributorAdmin, resolvedInstitutionId, resolvedDistributorId, resetForm]);

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
        items: data.filter((p) => p.statut === "active" && !p.archived),
      }));
    } catch (err) {
      console.error("Erreur chargement produits", err);
    } finally {
      setProductsState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  // ===== CATALOG SERVICES STATE =====
  const [catalogServices, setCatalogServices] = useState<CatalogServiceItem[]>(options?.catalogServices || []);
  const [isLoadingCatalogServices, setIsLoadingCatalogServices] = useState(false);

  const loadCatalogServices = useCallback(async () => {
    try {
      setIsLoadingCatalogServices(true);
      const data = await fetchCatalogServices();
      setCatalogServices(data);
    } catch (err) {
      console.error("Erreur chargement services catalogue:", err);
    } finally {
      setIsLoadingCatalogServices(false);
    }
  }, []);

  // ===== DISTRIBUTORS STATE =====
  const [distributorsState, setDistributorsState] = useState({
    items: (options?.distributors || []) as Distributeur[],
    isLoading: false,
  });

  // ===== STRUCTURES STATE =====
  const [structures, setStructures] = useState<StructureRead[]>(options?.structures || []);

  const loadStructures = useCallback(async () => {
    try {
      const data = await fetchStructures();
      setStructures(extractStructuresList(data));
    } catch (err) {
      console.error("Erreur chargement structures:", err);
    }
  }, []);

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
    if (!options?.structures?.length) void loadStructures();
    if (!options?.catalogServices?.length) void loadCatalogServices();
  }, [
    enabled,
    options?.agencies?.length,
    options?.products?.length,
    options?.distributors?.length,
    options?.structures?.length,
    options?.catalogServices?.length,
    loadAgencies,
    loadProducts,
    loadDistributors,
    loadStructures,
    loadCatalogServices,
  ]);

  // =========================
  // LIST
  // =========================
  const {
    filterLevel: taxesFilterLevel,
    filterTenantId: taxesFilterTenantId,
    selectedServiceType: taxesSelectedServiceType,
  } = taxesListState;

  const loadTaxes = useCallback(
    async (srvType = taxesSelectedServiceType) => {
      if (taxesFilterLevel === "PRODUCT" && !taxesFilterTenantId) {
        setTaxesListState((prev) => ({ ...prev, items: [] }));
        return;
      }
      setTaxesListState((prev) => ({ ...prev, isLoading: true }));
      try {
        const data = await fetchTaxes({
          tenant_level: taxesFilterLevel,
          tenant_id:
            taxesFilterLevel === "GLOBAL"
              ? undefined
              : taxesFilterTenantId?.trim() || undefined,
          service_type: srvType === "ALL" ? undefined : (srvType as ServiceType),
        });
        setTaxesListState((prev) => ({ ...prev, items: data }));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur de chargement des taxes");
      } finally {
        setTaxesListState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [taxesFilterLevel, taxesFilterTenantId, taxesSelectedServiceType]
  );

  useEffect(() => {
    if (!enabled) return;
    void loadTaxes();
  }, [enabled, loadTaxes]);

  // Auto select first agency when agencies list is loaded and filterLevel is AGENCY
  const agenciesItems = agenciesState.items;
  useEffect(() => {
    if ((isStructureAdmin || isDistributorAdmin) && taxesFilterLevel === "AGENCY" && !taxesFilterTenantId && agenciesItems.length > 0) {
      setTaxesListState((prev) => ({ ...prev, filterTenantId: agenciesItems[0].id }));
    }
  }, [isStructureAdmin, isDistributorAdmin, taxesFilterLevel, taxesFilterTenantId, agenciesItems]);

  // =========================
  // ADD & EDIT FORM OPEN
  // =========================
  const openAddTax = () => {
    resetForm();
    setDialogState((prev) => ({ ...prev, isOpen: true }));
  };

  const openEditTax = async (tax: TaxResponse) => {
    try {
      const freshTax = await fetchTaxDetail(tax.id);
      resetFormErrors();
      setDialogState((prev) => ({ ...prev, editingItem: freshTax, isOpen: true }));
      setTaxForm({
        tenantLevel: freshTax.tenant_level,
        tenantId: (freshTax.structure_id || freshTax.tenant_id) ?? "",
        serviceType: freshTax.service_type,
        clientType: freshTax.client_type,
        taxType: freshTax.tax_type,
        taxRate: freshTax.tax_rate !== undefined && freshTax.tax_rate !== null ? freshTax.tax_rate.toString() : "",
        taxAmount: freshTax.tax_amount !== undefined && freshTax.tax_amount !== null ? freshTax.tax_amount.toString() : "",
        overrideReason: freshTax.override_reason || "",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de charger les détails de la taxe");
    }
  };

  const openDetailTax = async (id: string) => {
    setDetailState((prev) => ({ ...prev, viewingItem: null, isOpen: true, isLoading: true }));
    try {
      const freshTax = await fetchTaxDetail(id);
      setDetailState((prev) => ({ ...prev, viewingItem: freshTax }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de charger les détails de la taxe");
      setDetailState((prev) => ({ ...prev, isOpen: false }));
    } finally {
      setDetailState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // =========================
  // SAVE / SUBMIT
  // =========================
  const saveTax = async () => {
    const { editingItem } = dialogState;

    const errors = validateTaxForm(taxForm);
    setFormErrors(errors);
    if (hasFieldErrors(errors)) return;

    const rateNum = taxForm.taxRate.trim() === "" ? 0 : Number.parseFloat(taxForm.taxRate);
    const amountNum = taxForm.taxAmount.trim() === "" ? 0 : Number.parseFloat(taxForm.taxAmount);

    setDialogState((prev) => ({ ...prev, isSaving: true }));
    try {
      if (editingItem) {
        // Edit mode - all fields editable like in Plafond
        const payload: UpdateTaxRequest = {
          tax_type: taxForm.taxType.trim(),
          client_type: taxForm.clientType,
          tax_rate: rateNum,
          tax_amount: amountNum,
          service_type: taxForm.serviceType,
          tenant_level: taxForm.tenantLevel,
          tenant_id:
            taxForm.tenantLevel === "GLOBAL"
              ? null
              : taxForm.tenantId || null,
          override_reason: taxForm.overrideReason.trim() || null,
        };
        const updated = await updateTax(editingItem.id, payload);
        setTaxesListState((prev) => ({
          ...prev,
          items: prev.items.map((item) => (item.id === updated.id ? updated : item)),
        }));
        setDetailState((prev) => (prev.viewingItem?.id === updated.id ? { ...prev, viewingItem: updated } : prev));
        toast.success("Taxe modifiée avec succès");
      } else {
        // Create mode
        const payload: CreateTaxRequest = {
          tax_type: taxForm.taxType.trim(),
          client_type: taxForm.clientType,
          tax_rate: rateNum,
          tax_amount: amountNum,
          service_type: taxForm.serviceType,
          tenant_level: taxForm.tenantLevel,
          tenant_id:
            taxForm.tenantLevel === "GLOBAL"
              ? null
              : taxForm.tenantId || null,
          override_reason: taxForm.overrideReason.trim() || null,
        };

        // Client-side check for duplicate
        const duplicateExists = taxesListState.items.some(
          (t) =>
            t.service_type === payload.service_type &&
            t.client_type === payload.client_type &&
            t.tax_type.toUpperCase() === payload.tax_type.toUpperCase() &&
            t.tenant_level === payload.tenant_level &&
            t.tenant_id === payload.tenant_id
        );

        if (duplicateExists) {
          throw new Error("Erreur, cette taxe existe déjà");
        }

        const created = await createTax(payload);
        setTaxesListState((prev) => ({ ...prev, items: [created, ...prev.items] }));
        toast.success("Taxe ajoutée avec succès");
      }
      setDialogState((prev) => ({ ...prev, isOpen: false }));
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de sauvegarder la taxe");
    } finally {
      setDialogState((prev) => ({ ...prev, isSaving: false }));
    }
  };

  // =========================
  // DELETE & STATUS TOGGLE
  // =========================
  const removeTax = async (id: string) => {
    try {
      await deleteTax(id);
      setTaxesListState((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
      toast.success("Taxe supprimée avec succès");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de supprimer la taxe");
    }
  };

  const toggleTax = async (id: string, currentStatus: boolean) => {
    try {
      await toggleTaxStatus(id, !currentStatus);
      setTaxesListState((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === id ? { ...item, is_active: !currentStatus } : item)),
      }));
      toast.success(!currentStatus ? "Taxe activée avec succès" : "Taxe désactivée avec succès");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de modifier le statut de la taxe");
    }
  };

  const handleFilterLevelChange = useCallback((level: TenantLevel) => {
    if (isStructureAdmin && level !== "STRUCTURE" && level !== "AGENCY") return;
    if (isProductAdmin && level !== "PRODUCT") return;
    if (isDistributorAdmin && level !== "DISTRIBUTEUR" && level !== "AGENCY") return;

    setTaxesListState((prev) => {
      let tenantId = "";
      if (level === "GLOBAL") {
        tenantId = "";
      } else if (level === "PRODUCT") {
        tenantId = isProductAdmin ? resolvedInstitutionId : productsState.items[0]?.id || "";
      } else if (level === "STRUCTURE") {
        tenantId = isStructureAdmin ? resolvedInstitutionId : structures[0]?.id || "";
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

  const handleTaxLevelChange = (level: TenantLevel) => {
    clearFormError("tenantId");
    setTaxForm((prev) => {
      const next = { ...prev, tenantLevel: level };
      if (level === "GLOBAL") {
        next.tenantId = "";
      } else if (level === "PRODUCT") {
        next.tenantId = isProductAdmin ? resolvedInstitutionId : productsState.items[0]?.id || "";
      } else if (level === "STRUCTURE") {
        next.tenantId = isStructureAdmin ? resolvedInstitutionId : structures[0]?.id || "";
      } else if (level === "DISTRIBUTEUR") {
        next.tenantId = isDistributorAdmin ? resolvedDistributorId : distributorsState.items[0]?.id || "";
      } else if (level === "AGENCY") {
        next.tenantId = agenciesState.items[0]?.id || "";
      }
      return next;
    });
  };

  return {
    isStructureAdmin,
    isProductAdmin,
    isDistributorAdmin,
    taxes: taxesListState.items,
    isLoading: taxesListState.isLoading,
    filterLevel: taxesListState.filterLevel,
    filterTenantId: taxesListState.filterTenantId,
    setFilterTenantId: (id: string) => setTaxesListState((prev) => ({ ...prev, filterTenantId: id })),
    selectedServiceType: taxesListState.selectedServiceType,
    setSelectedServiceType: (srvType: ServiceType | "ALL") =>
      setTaxesListState((prev) => ({ ...prev, selectedServiceType: srvType })),
    products: productsState.items,
    agencies: agenciesState.items,
    activeAgencies,
    distributors: distributorsState.items,
    catalogServices,
    isLoadingCatalogServices,
    institutionLabel: getCurrentInstitutionLabel(),
    dialogOpen: dialogState.isOpen,
    setDialogOpen: (open: boolean) => {
      setDialogState((prev) => ({ ...prev, isOpen: open }));
      if (!open) resetFormErrors();
    },
    isSaving: dialogState.isSaving,
    editingTax: dialogState.editingItem,
    detailOpen: detailState.isOpen,
    setDetailOpen: (open: boolean) => setDetailState((prev) => ({ ...prev, isOpen: open })),
    viewingTax: detailState.viewingItem,
    setViewingTax: (item: TaxResponse | null) => setDetailState((prev) => ({ ...prev, viewingItem: item })),
    isLoadingDetail: detailState.isLoading,
    taxForm,
    setTaxForm,
    formErrors,
    clearFormError,
    openAddTax,
    openEditTax,
    openDetailTax,
    saveTax,
    removeTax,
    toggleTax,
    handleFilterLevelChange,
    handleTaxLevelChange,
    loadTaxes,
    resolvedDistributorId,
    structures,
  };
};
