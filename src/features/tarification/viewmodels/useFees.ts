import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/core/network/errorUtils";
import {
  FeeResponse,
  FeeForm,
  ServiceType,
  TenantLevel,
  FeeFilterLevel,
  FeeFilterService,
  CatalogServiceItem,
} from "../models/types";
import {
  fetchFees,
  createFee,
  updateFee,
  deleteFee,
  toggleFeeStatus,
  fetchFeeDetail,
} from "../services/feesService";
import { fetchCatalogServices } from "../services/commissionsService";
import {
  useAuthStore,
  getCurrentInstitutionId,
  getCurrentInstitutionLabel,
  parseDistributorIdFromToken,
} from "@/core/security/authStore";
import { fetchAgences } from "@/features/agences/services/agencesService";
import { AgenceRead } from "@/features/agences/models/types";
import { fetchProduits } from "@/features/produits/services/produitsService";
import { ProduitRead } from "@/features/produits/models/types";
import { fetchDistributeurs } from "@/features/distributeurs/services/distributeursService";
import { Distributeur } from "@/features/distributeurs/models/types";
import { fetchStructures, extractStructuresList } from "@/features/structures/services/structuresService";
import { StructureRead } from "@/features/structures/models/types";
import { hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import { FeeFormField, validateFeeForm } from "../models/validation";

const emptyFeeForm: FeeForm = {
  tenantLevel: "GLOBAL",
  tenantId: "",
  serviceType: "VERSEMENT",
  minBound: "",
  maxBound: "",
  fixedFee: "",
  rateFee: "",
  overrideReason: "",
};

export const useFees = (options?: { enabled?: boolean }) => {
  const enabled = options?.enabled ?? true;
  const currentUser = useAuthStore((state) => state.user);
  const isStructureAdmin = currentUser?.entityContext === "Structure";
  const isProductAdmin = currentUser?.entityContext === "Produit";
  const isDistributorAdmin = currentUser?.entityContext === "Distributeur";

  const resolvedInstitutionId = currentUser?.institutionId || getCurrentInstitutionId() || "";
  const resolvedDistributorId =
    currentUser?.distributorId ||
    parseDistributorIdFromToken(useAuthStore.getState().token || undefined) ||
    "";

  // Filter State
  const [filterLevel, setFilterLevel] = useState<FeeFilterLevel>(
    (isStructureAdmin
      ? "STRUCTURE"
      : isProductAdmin
      ? "PRODUCT"
      : isDistributorAdmin
      ? "DISTRIBUTEUR"
      : "GLOBAL") as FeeFilterLevel
  );

  const [filterTenantId, setFilterTenantId] = useState<string>(
    isStructureAdmin || isProductAdmin
      ? resolvedInstitutionId
      : isDistributorAdmin
      ? resolvedDistributorId
      : ""
  );

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedServiceType, setSelectedServiceType] = useState<FeeFilterService>("ALL");

  // Items State
  const [items, setItems] = useState<FeeResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);


  // Modal / Form State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FeeResponse | null>(null);
  const [form, setForm] = useState<FeeForm>(emptyFeeForm);
  const [isSaving, setIsSaving] = useState(false);
  // Erreur renvoyée par l'API à l'enregistrement (les erreurs de saisie sont affichées sous les champs)
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    errors: formErrors,
    setErrors: setFormErrors,
    clearError: clearFormError,
    resetErrors: resetFormErrors,
  } = useFieldErrors<FeeFormField>();

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSubmitError(null);
      resetFormErrors();
    }
  };

  // Detail Dialog State
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<FeeResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Confirmation States
  const [feeToDelete, setFeeToDelete] = useState<string | null>(null);
  const [feeToToggle, setFeeToToggle] = useState<{ id: string; nextActive: boolean; label: string } | null>(null);

  // External Reference Data States
  const [produitsOptions, setProduitsOptions] = useState<ProduitRead[]>([]);
  const [agencies, setAgencies] = useState<AgenceRead[]>([]);
  const [distributors, setDistributors] = useState<Distributeur[]>([]);
  const [structures, setStructures] = useState<StructureRead[]>([]);
  const [catalogServices, setCatalogServices] = useState<CatalogServiceItem[]>([]);
  const [isLoadingCatalogServices, setIsLoadingCatalogServices] = useState(false);

  // Load Agencies
  const loadAgencies = useCallback(async () => {
    if (!currentUser) return;
    const institutionId = getCurrentInstitutionId();
    try {
      let params: { parent_id?: string; parent_type?: string } | undefined = undefined;
      if (isStructureAdmin && institutionId) {
        params = { parent_id: institutionId, parent_type: "STRUCTURE" };
      } else if (isDistributorAdmin && resolvedDistributorId) {
        params = { parent_id: resolvedDistributorId, parent_type: "DISTRIBUTOR" };
      }
      const data = await fetchAgences(params);
      setAgencies(data.filter((a) => !a.is_deleted));
    } catch (err) {
      console.error("Erreur chargement agences:", err);
    }
  }, [isStructureAdmin, isDistributorAdmin, resolvedDistributorId, currentUser]);

  const activeAgencies = useMemo(() => {
    return agencies.filter((a) => a.is_active);
  }, [agencies]);

  const entitiesLoadedRef = useRef(false);

  // Load Products
  const loadProducts = useCallback(async () => {
    try {
      const data = await fetchProduits();
      const active = data.filter((p) => p.statut === "active");
      setProduitsOptions(active);
      if (active.length > 0) {
        setSelectedProductId((prev) => prev || active[0].id);
      }
    } catch (err) {
      console.error("Erreur chargement produits:", err);
    }
  }, []);

  // Load Distributors
  const loadDistributors = useCallback(async () => {
    if (!currentUser) return;
    const institutionId = getCurrentInstitutionId();
    try {
      const params = isStructureAdmin && institutionId ? { structure_id: institutionId } : undefined;
      const res = await fetchDistributeurs(params);
      setDistributors(res.items);
    } catch (err) {
      console.error("Erreur chargement distributeurs:", err);
    }
  }, [isStructureAdmin, currentUser]);

  // Load Structures
  const loadStructures = useCallback(async () => {
    try {
      const data = await fetchStructures();
      const list = extractStructuresList(data);
      setStructures(list);
      setForm((prev) => {
        if (prev.tenantLevel === "STRUCTURE" && !prev.tenantId && list.length > 0) {
          return { ...prev, tenantId: list[0].id };
        }
        return prev;
      });
    } catch (err) {
      console.error("Erreur chargement structures:", err);
    }
  }, []);

  // Load Catalog Services
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

  // Chargement initial des référentiels (services, structures, produits, etc.) à l'activation de l'onglet
  const hasLoadedReferentials = useRef(false);
  useEffect(() => {
    if (enabled && !hasLoadedReferentials.current) {
      hasLoadedReferentials.current = true;
      void loadProducts();
      void loadAgencies();
      void loadDistributors();
      void loadStructures();
      void loadCatalogServices();
    }
  }, [enabled, loadProducts, loadAgencies, loadDistributors, loadStructures, loadCatalogServices]);

  const loadFormEntities = useCallback(() => {
    if (entitiesLoadedRef.current) return;
    entitiesLoadedRef.current = true;
    void loadProducts();
    void loadAgencies();
    void loadDistributors();
    void loadStructures();
    void loadCatalogServices();
  }, [loadProducts, loadAgencies, loadDistributors, loadStructures, loadCatalogServices]);

  useEffect(() => {
    if (!enabled) return;
    if (dialogOpen || detailOpen) {
      loadFormEntities();
    }
  }, [enabled, dialogOpen, detailOpen, loadFormEntities]);

  const lastFetchedKeyRef = useRef<string>("");

  // Load Fees
  const loadFees = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchFees({
        tenant_level: filterLevel,
        tenant_id: filterLevel === "GLOBAL" || filterLevel === "ALL" ? undefined : filterTenantId || undefined,
        service_type: selectedServiceType,
      });
      setItems(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger la grille de frais");
    } finally {
      setIsLoading(false);
    }
  }, [filterLevel, filterTenantId, selectedServiceType]);

  useEffect(() => {
    if (!enabled) {
      lastFetchedKeyRef.current = "";
      return;
    }
    const currentKey = `${filterLevel}:${filterTenantId}:${selectedServiceType}`;
    if (lastFetchedKeyRef.current === currentKey) {
      return;
    }
    lastFetchedKeyRef.current = currentKey;
    void loadFees();
  }, [enabled, filterLevel, filterTenantId, selectedServiceType, loadFees]);

  const handleFilterLevelChange = (level: FeeFilterLevel) => {
    setFilterLevel(level);
    if (level === "GLOBAL" || level === "ALL") {
      setFilterTenantId("");
    } else if (level === "PRODUCT") {
      void loadProducts();
      setFilterTenantId(selectedProductId);
    } else if (level === "STRUCTURE") {
      void loadStructures();
      setFilterTenantId(resolvedInstitutionId);
    } else if (level === "DISTRIBUTEUR") {
      void loadDistributors();
      setFilterTenantId(resolvedDistributorId);
    } else if (level === "AGENCY") {
      void loadAgencies();
      setFilterTenantId(activeAgencies[0]?.id || "");
    }
  };

  const handleFeeLevelChange = (level: TenantLevel) => {
    let tenantId = "";
    if (level === "STRUCTURE") {
      tenantId = structures[0]?.id || "";
    } else if (level === "PRODUCT") {
      tenantId = produitsOptions[0]?.id || "";
    } else if (level === "DISTRIBUTEUR") {
      tenantId = distributors[0]?.id || "";
    } else if (level === "AGENCY") {
      tenantId = activeAgencies[0]?.id || agencies[0]?.id || "";
    }
    clearFormError("tenantId");
    setForm((prev) => ({ ...prev, tenantLevel: level, tenantId }));
  };

  const resolveFeeTenantId = (level: TenantLevel, rawTenantId: string): string | null => {
    if (level === "GLOBAL") return null;
    if (level === "STRUCTURE") return rawTenantId || structures[0]?.id || null;
    if (level === "PRODUCT") return rawTenantId || produitsOptions[0]?.id || null;
    if (level === "DISTRIBUTEUR") return rawTenantId || distributors[0]?.id || null;
    if (level === "AGENCY") return rawTenantId || activeAgencies[0]?.id || agencies[0]?.id || null;
    return rawTenantId?.trim() || null;
  };

  const resetFeeForm = () => {
    const defaultLevel: TenantLevel = (isStructureAdmin
      ? "STRUCTURE"
      : isProductAdmin
      ? "PRODUCT"
      : isDistributorAdmin
      ? "DISTRIBUTEUR"
      : "GLOBAL") as TenantLevel;
    let defaultTenantId = "";
    if (defaultLevel === "STRUCTURE") {
      defaultTenantId = structures[0]?.id || resolvedInstitutionId || "";
    } else if (defaultLevel === "PRODUCT") {
      defaultTenantId = resolvedInstitutionId || selectedProductId || produitsOptions[0]?.id || "";
    } else if (defaultLevel === "DISTRIBUTEUR") {
      defaultTenantId = resolvedDistributorId || distributors[0]?.id || "";
    }
    const defaultService: ServiceType =
      selectedServiceType && selectedServiceType !== "ALL"
        ? (selectedServiceType as ServiceType)
        : catalogServices[0]?.code || "VERSEMENT";
    setForm({
      ...emptyFeeForm,
      tenantLevel: defaultLevel,
      tenantId: defaultTenantId,
      serviceType: defaultService,
    });
    setEditingItem(null);
    setSubmitError(null);
    resetFormErrors();
  };

  const openAddFee = () => {
    loadFormEntities();
    resetFeeForm();
    setDialogOpen(true);
  };

  const openEditFee = (fee: FeeResponse) => {
    loadFormEntities();
    setEditingItem(fee);
    setForm({
      tenantLevel: fee.tenant_level,
      tenantId: fee.tenant_id ?? "",
      serviceType: fee.service_type,
      minBound: String(fee.min_bound),
      maxBound: String(fee.max_bound),
      fixedFee: String(fee.fixed_fee),
      rateFee: String(fee.rate_fee),
      overrideReason: fee.override_reason ?? "",
    });
    setSubmitError(null);
    resetFormErrors();
    setDialogOpen(true);
  };

  const openDetailFee = async (fee: FeeResponse) => {
    loadFormEntities();
    setViewingItem(fee);
    setDetailOpen(true);
    setIsLoadingDetail(true);
    try {
      const detailed = await fetchFeeDetail(fee.id);
      setViewingItem(detailed);
    } catch (err) {
      toast.error(getErrorMessage(err, "Impossible de charger le détail de la grille de frais"));
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const saveFee = async () => {
    setSubmitError(null);

    const errors = validateFeeForm(form, Boolean(resolveFeeTenantId(form.tenantLevel, form.tenantId)));
    setFormErrors(errors);
    if (hasFieldErrors(errors)) return;

    const minBoundNum = form.minBound.trim() === "" ? 0 : Number.parseFloat(form.minBound);
    const maxBoundNum = Number.parseFloat(form.maxBound);
    const fixedFeeNum = form.fixedFee.trim() === "" ? 0 : Number.parseFloat(form.fixedFee);
    const rateFeeNum = form.rateFee.trim() === "" ? 0 : Number.parseFloat(form.rateFee);

    try {
      setIsSaving(true);
      if (editingItem) {
        await updateFee(editingItem.id, {
          min_bound: minBoundNum,
          max_bound: maxBoundNum,
          fixed_fee: fixedFeeNum,
          rate_fee: rateFeeNum,
          service_type: form.serviceType,
          tenant_level: form.tenantLevel,
          tenant_id: resolveFeeTenantId(form.tenantLevel, form.tenantId),
          override_reason: form.overrideReason?.trim() || null,
        });
        toast.success("Ligne de tarification modifiée avec succès");
      } else {
        await createFee({
          min_bound: minBoundNum,
          max_bound: maxBoundNum,
          fixed_fee: fixedFeeNum,
          rate_fee: rateFeeNum,
          service_type: form.serviceType,
          tenant_level: form.tenantLevel,
          tenant_id: resolveFeeTenantId(form.tenantLevel, form.tenantId),
          override_reason: form.overrideReason?.trim() || null,
        });
        toast.success("Ligne de tarification créée avec succès");
      }
      setDialogOpen(false);
      resetFeeForm();
      await loadFees();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Impossible de sauvegarder la ligne de frais";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const removeFee = async (id: string) => {
    try {
      await deleteFee(id);
      toast.success("Ligne de frais supprimée avec succès");
      await loadFees();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer la ligne de frais");
    }
  };

  const toggleStatus = async (id: string, nextActive: boolean) => {
    try {
      await toggleFeeStatus(id, nextActive);
      toast.success(nextActive ? "Ligne de frais activée" : "Ligne de frais désactivée");
      await loadFees();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier le statut");
    }
  };

  const confirmDeleteFee = async () => {
    if (feeToDelete) {
      await removeFee(feeToDelete);
      setFeeToDelete(null);
    }
  };

  const confirmToggleFee = async () => {
    if (feeToToggle) {
      await toggleStatus(feeToToggle.id, feeToToggle.nextActive);
      setFeeToToggle(null);
    }
  };

  return {
    currentUser,
    isStructureAdmin,
    isProductAdmin,
    isDistributorAdmin,
    resolvedInstitutionId,
    resolvedDistributorId,
    institutionLabel: getCurrentInstitutionLabel() || "Ma Structure",
    // Filters
    filterLevel,
    filterTenantId,
    handleFilterLevelChange,
    setFilterTenantId,
    selectedProductId,
    setSelectedProductId,
    selectedServiceType,
    setSelectedServiceType,
    // Data
    fees: items,
    isLoadingFees: isLoading,
    loadFees,
    // Form & Dialog
    dialogOpen,
    setDialogOpen: handleDialogOpenChange,
    editingItem,
    form,
    setForm,
    isSaving,
    submitError,
    formErrors,
    clearFormError,
    handleFeeLevelChange,
    openAddFee,
    openEditFee,
    saveFee,
    removeFee,
    toggleStatus,
    // Detail
    detailOpen,
    setDetailOpen,
    viewingItem,
    setViewingItem,
    isLoadingDetail,
    openDetailFee,
    // Confirmations
    feeToDelete,
    setFeeToDelete,
    feeToToggle,
    setFeeToToggle,
    confirmDeleteFee,
    confirmToggleFee,
    // Options
    produitsOptions,
    agencies,
    activeAgencies,
    distributors,
    structures,
    catalogServices,
    isLoadingCatalogServices,
  };
};

export default useFees;
