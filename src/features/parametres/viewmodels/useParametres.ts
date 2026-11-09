import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  emptyPackageForm,
} from "../models/data";
import {
  AdministrationRead,
  PackageResponse,
  PackageForm,
  ServiceResponse,
  PaymentMethodResponse,
  ServicePaymentFlowResponse,
  FeeResponse,
  ServiceType,
  TenantLevel,
} from "../models/types";

import { ProduitRead } from "@/features/produits/models/types";
import { fetchProduits } from "@/features/produits/services/produitsService";
import {
  fetchFees,
  createFee,
  updateFee,
  deleteFee,
  toggleFeeStatus,
  fetchFeesConsolidated,
  fetchFeeDetail,
} from "../services/rulesService";
import {
  createAdministration,
  deleteAdministration,
  fetchAdministrations,
  toggleAdministrationStatus,
  updateAdministration,
} from "../services/administrationsService";
import {
  fetchPackages,
  createPackage,
  updatePackage,
  deletePackage,
  activatePackage,
  deactivatePackage,
  duplicatePackage,
  archivePackage,
  fetchPackageServices,
  addServiceToPackage,
  removeServiceFromPackage,
  fetchPackagePaymentMethods,
  addPaymentMethodToPackage,
  addPaymentMethodsToPackage,
  removePaymentMethodFromPackage,
} from "../services/packagesService";
import {
  fetchServices,
  toggleServiceStatus,
  createService,
  updateService,
  deleteService,
  fetchServicePaymentFlows,
  fetchServicePaymentFlow,
  createServicePaymentFlow,
  updateServicePaymentFlow,
  deleteServicePaymentFlow,
  enableServicePaymentFlow,
  disableServicePaymentFlow,
} from "../services/servicesService";
import { fetchPaymentMethods, togglePaymentMethodStatus } from "@/features/payment-methods/services/paymentMethodsService";

import { useAuthStore, getCurrentInstitutionId, parseDistributorIdFromToken } from "@/core/security/authStore";
import { fetchAgences } from "@/features/agences/services/agencesService";
import { AgenceRead } from "@/features/agences/models/types";

const emptyAdministrationForm = {
  name: "",
  contact_email: "",
  contact_phone: "",
};

type FilterLevel = "GLOBAL" | "STRUCTURE" | "PRODUCT" | "DISTRIBUTEUR" | "AGENCY";

const resolveDefaultTenantLevel = (
  isStructureAdmin: boolean,
  isProductAdmin: boolean,
  isDistributorAdmin: boolean,
): TenantLevel => {
  if (isStructureAdmin) return "STRUCTURE";
  if (isProductAdmin) return "PRODUCT";
  if (isDistributorAdmin) return "DISTRIBUTEUR";
  return "GLOBAL";
};

const getPaymentMethodIds = (
  flow: ServicePaymentFlowResponse,
  direction: "source" | "destination",
): string[] => {
  const ids = direction === "source"
    ? flow.source_payment_method_ids
    : flow.destination_payment_method_ids;
  if (Array.isArray(ids) && ids.length > 0) return ids;

  const id = direction === "source"
    ? flow.source_payment_method_id
    : flow.destination_payment_method_id;
  return id ? [id] : [];
};

const getFlowSourceIds = (flow: ServicePaymentFlowResponse): string[] =>
  getPaymentMethodIds(flow, "source");

const flowHasSourcePM = (flow: ServicePaymentFlowResponse, pmId: string): boolean =>
  getFlowSourceIds(flow).includes(pmId);

const getActivePackageServiceIds = async (packageId: string): Promise<string[]> => {
  const pServices = await fetchPackageServices(packageId);
  return pServices.filter((ps) => ps.is_enabled).map((ps) => ps.service_id);
};

const extractPackagePaymentMethodIds = async (
  packageId: string,
): Promise<string[]> => {
  const pms = await fetchPackagePaymentMethods(packageId).catch(() => []);
  return pms.filter((pm) => pm.is_enabled).map((pm) => pm.payment_method_id);
};

const syncPackagePaymentMethods = async (
  pkgId: string,
  currentPMList: string[],
  targetPMList: string[],
) => {
  const pmsToAdd = targetPMList.filter((pm) => !currentPMList.includes(pm));
  const pmsToRemove = currentPMList.filter((pm) => !targetPMList.includes(pm));

  if (pmsToAdd.length > 0) {
    await addPaymentMethodsToPackage(pkgId, pmsToAdd).catch(() => {});
  }
  for (const pmId of pmsToRemove) {
    await removePaymentMethodFromPackage(pkgId, pmId).catch(() => {});
  }
};

export const useParametres = (options?: { enabled?: boolean; activeTab?: string; activeSubTab?: string }) => {
  const enabled = options?.enabled ?? true;
  const activeTab = options?.activeTab;
  const activeSubTab = options?.activeSubTab;

  const [hasLoaded, setHasLoaded] = useState({
    administrations: false,
    packages: false,
    services: false,
    paymentMethods: false,
    fees: false,
    agencies: false,
  });

  const currentUser = useAuthStore((state) => state.user);
  const isStructureAdmin = currentUser?.entityContext === "Structure";
  const isProductAdmin = currentUser?.entityContext === "Produit";
  const isDistributorAdmin = currentUser?.entityContext === "Distributeur";

  const resolvedInstitutionId = currentUser?.institutionId || getCurrentInstitutionId() || "";
  const resolvedDistributorId = currentUser?.distributorId || parseDistributorIdFromToken(useAuthStore.getState().token || undefined) || "";
  const defaultTenantLevel = resolveDefaultTenantLevel(isStructureAdmin, isProductAdmin, isDistributorAdmin);
  let defaultTenantId = "";
  if (isStructureAdmin || isProductAdmin) {
    defaultTenantId = resolvedInstitutionId;
  } else if (isDistributorAdmin) {
    defaultTenantId = resolvedDistributorId;
  }

  // ===== FILTER STATE =====
  const [filterState, setFilterState] = useState({
    level: defaultTenantLevel as FilterLevel,
    tenantId: defaultTenantId,
  });

  // ===== AGENCIES STATE =====
  const [agenciesState, setAgenciesState] = useState({
    items: [] as AgenceRead[],
    isLoading: false,
  });

  // ===== ADMINISTRATIONS STATE =====
  const [administrationsState, setAdministrationsState] = useState({
    items: [] as AdministrationRead[],
    isLoading: true,
    editingId: null as string | null,
    form: emptyAdministrationForm,
  });

  // ===== PACKAGES STATE =====
  const [packagesState, setPackagesState] = useState({
    items: [] as PackageResponse[],
    isLoading: true,
    isSaving: false,
    dialogOpen: false,
    detailOpen: false,
    editingItem: null as PackageResponse | null,
    viewingItem: null as PackageResponse | null,
    form: emptyPackageForm as PackageForm,
    packageServices: [] as string[],
    packagePaymentMethods: [] as string[],
  });
  const isSavingPackageRef = useRef(false);

  // ===== DUPLICATE PACKAGE STATE =====
  const [duplicateState, setDuplicateState] = useState({
    dialogOpen: false,
    duplicatingItem: null as PackageResponse | null,
    form: emptyPackageForm as PackageForm,
  });

  // ===== SERVICES STATE =====
  const [servicesState, setServicesState] = useState({
    items: [] as ServiceResponse[],
    isLoading: true,
    dialogOpen: false,
    editingItem: null as ServiceResponse | null,
    form: {
      code: "",
      label: "",
      description: "",
      sourcePaymentMethodIds: [] as string[],
      destinationPaymentMethodIds: [] as string[],
    },
    flowsMap: {} as Record<string, ServicePaymentFlowResponse[]>,
  });

  // ===== PAYMENT METHODS STATE (for Package/Service mapping) =====
  const [paymentMethodsState, setPaymentMethodsState] = useState({
    items: [] as PaymentMethodResponse[],
    isLoading: false,
  });


  // ===== FEES STATE =====
  const [feesState, setFeesState] = useState({
    items: [] as FeeResponse[],
    isLoading: false,
    consolidated: [] as FeeResponse[],
    isLoadingConsolidated: false,
    dialogOpen: false,
    detailOpen: false,
    editingItem: null as FeeResponse | null,
    viewingItem: null as FeeResponse | null,
    isLoadingDetail: false,
    selectedProductId: "",
    selectedServiceType: "VERSEMENT" as ServiceType,
    produitsOptions: [] as ProduitRead[],
    form: {
      tenantLevel: defaultTenantLevel,
      tenantId: "",
      serviceType: "VERSEMENT" as ServiceType,
      minBound: "",
      maxBound: "",
      fixedFee: "",
      rateFee: "",
      overrideReason: "",
    },
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
      setAgenciesState((prev) => ({ ...prev, items: data.filter((a) => !a.is_deleted) }));
    } catch (err) {
      console.error("Erreur chargement agences", err);
    } finally {
      setAgenciesState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [currentUser, isDistributorAdmin, isStructureAdmin, resolvedDistributorId]);

  const activeAgencies = agenciesState.items.filter((a) => a.is_active);

  const resolveTenantIdForLevel = (level: FilterLevel): string => {
    if (level === "STRUCTURE" && isStructureAdmin) return resolvedInstitutionId;
    if (level === "PRODUCT" && isProductAdmin) return resolvedInstitutionId;
    if (level === "DISTRIBUTEUR" && isDistributorAdmin) return resolvedDistributorId;
    if (level === "AGENCY") return activeAgencies[0]?.id || agenciesState.items[0]?.id || "";
    return "";
  };

  const handleFilterLevelChange = (level: FilterLevel) => {
    if (isStructureAdmin && level !== "STRUCTURE" && level !== "AGENCY") return;
    if (isProductAdmin && level !== "PRODUCT") return;
    if (isDistributorAdmin && level !== "DISTRIBUTEUR" && level !== "AGENCY") return;

    setFilterState({ level, tenantId: resolveTenantIdForLevel(level) });
  };

  // Auto select first agency when agencies list is loaded and filterLevel is AGENCY
  // NOSONAR - orchestration des chargements lazy selon l'onglet et les permissions
  useEffect(() => { // NOSONAR
    if ((isStructureAdmin || isDistributorAdmin) && filterState.level === "AGENCY" && !filterState.tenantId && agenciesState.items.length > 0) {
      setFilterState((prev) => ({ ...prev, tenantId: agenciesState.items[0].id }));
    }
  }, [isStructureAdmin, isDistributorAdmin, filterState.level, filterState.tenantId, agenciesState.items]);


  const loadAdministrations = async () => {
    try {
      setAdministrationsState((prev) => ({ ...prev, isLoading: true }));
      const data = await fetchAdministrations();
      setAdministrationsState((prev) => ({ ...prev, items: data.filter((item) => !item.is_deleted) }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger les administrations");
    } finally {
      setAdministrationsState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const loadPackages = async () => {
    try {
      setPackagesState((prev) => ({ ...prev, isLoading: true }));
      const data = await fetchPackages();
      setPackagesState((prev) => ({ ...prev, items: data }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger les packages");
    } finally {
      setPackagesState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const loadServices = async () => {
    try {
      setServicesState((prev) => ({ ...prev, isLoading: true }));
      const data = await fetchServices();

      const flowsMap: Record<string, ServicePaymentFlowResponse[]> = {};
      await Promise.all(
        data.map(async (srv) => {
          try {
            const flows = await fetchServicePaymentFlows(srv.id);
            flowsMap[srv.id] = flows;
          } catch (e) {
            console.error("Error loading flows for service " + srv.id, e);
          }
        })
      );
      setServicesState((prev) => ({ ...prev, items: data, flowsMap }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger les services");
    } finally {
      setServicesState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const loadPaymentMethods = async () => {
    try {
      setPaymentMethodsState((prev) => ({ ...prev, isLoading: true }));
      const data = await fetchPaymentMethods();
      setPaymentMethodsState((prev) => ({ ...prev, items: data }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger les moyens de paiement");
    } finally {
      setPaymentMethodsState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const loadFees = useCallback(async (prodId = feesState.selectedProductId, srvType = feesState.selectedServiceType) => {
    if (filterState.level === "PRODUCT" && !prodId) {
      setFeesState((prev) => ({ ...prev, items: [] }));
      return;
    }
    try {
      setFeesState((prev) => ({ ...prev, isLoading: true }));
      const data = await fetchFees({
        tenant_level: filterState.level,
        tenant_id: filterState.level === "GLOBAL" ? undefined : (filterState.tenantId || prodId),
        service_type: srvType,
      });
      setFeesState((prev) => ({ ...prev, items: data }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger la grille de frais");
    } finally {
      setFeesState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [feesState.selectedProductId, feesState.selectedServiceType, filterState.level, filterState.tenantId]);

  const loadConsolidatedFees = async () => {
    setFeesState((prev) => ({ ...prev, isLoadingConsolidated: true }));
    try {
      const data = await fetchFeesConsolidated();
      setFeesState((prev) => ({ ...prev, consolidated: data }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger la vue consolidée des frais");
    } finally {
      setFeesState((prev) => ({ ...prev, isLoadingConsolidated: false }));
    }
  };

  const loadProduitsOptions = useCallback(async () => {
    try {
      const prods = await fetchProduits();
      const activeProds = prods.filter((p) => p.statut === "active" && !p.archived);
      setFeesState((prev) => ({ ...prev, produitsOptions: activeProds }));
      if (activeProds.length > 0 && !feesState.selectedProductId) {
        setFeesState((prev) => ({ ...prev, selectedProductId: activeProds[0].id }));
        void loadFees(activeProds[0].id, feesState.selectedServiceType);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger les produits");
    }
  }, [feesState.selectedProductId, feesState.selectedServiceType, loadFees]);

  // Lazy-load data based on active tab
  useEffect(() => {
    if (!enabled) return;

    // Load administrations if administrations tab is active or if activeTab is not specified
    if ((!activeTab || activeTab === "administrations") && !hasLoaded.administrations) {
      setHasLoaded((prev) => ({ ...prev, administrations: true }));
      void loadAdministrations();
    }

    // Load packages / services / payment methods when packages tab is active
    if (activeTab === "packages" || (!activeTab && !hasLoaded.packages)) {
      if ((!activeSubTab || activeSubTab === "listPackages") && !hasLoaded.packages) {
        setHasLoaded((prev) => ({ ...prev, packages: true }));
        void loadPackages();
      }
      const needsServices = ["listPackages", "listServices", "listWorkflows"].includes(activeSubTab || "");
      const needsPaymentMethods = ["listPackages", "listServices", "listPaymentMethods", "listWorkflows"].includes(activeSubTab || "");

      if (needsServices && !hasLoaded.services) {
        setHasLoaded((prev) => ({ ...prev, services: true }));
        void loadServices();
      }
      if (needsPaymentMethods && !hasLoaded.paymentMethods) {
        setHasLoaded((prev) => ({ ...prev, paymentMethods: true }));
        void loadPaymentMethods();
      }
    }

    // Load fees and agencies when fees tab is active
    if (activeTab === "fees" && !hasLoaded.fees) {
      setHasLoaded((prev) => ({ ...prev, fees: true, agencies: true }));
      void loadProduitsOptions();
      void loadAgencies();
    }
  }, [enabled, activeTab, activeSubTab, hasLoaded, loadAgencies, loadProduitsOptions]);

  useEffect(() => {
    if (!enabled || (activeTab && activeTab !== "fees")) return;
    void loadFees(feesState.selectedProductId, feesState.selectedServiceType);
  }, [enabled, activeTab, feesState.selectedProductId, feesState.selectedServiceType, filterState.level, filterState.tenantId, loadFees]);

  const resetAdministrationForm = () => {
    setAdministrationsState((prev) => ({
      ...prev,
      form: emptyAdministrationForm,
      editingId: null,
    }));
  };

  const editAdministration = (administration: AdministrationRead) => {
    setAdministrationsState((prev) => ({
      ...prev,
      editingId: administration.id,
      form: {
        name: administration.name ?? "",
        contact_email: administration.contact_email ?? "",
        contact_phone: administration.contact_phone ?? "",
      },
    }));
  };

  const saveAdministration = async () => {
    const { form, editingId } = administrationsState;
    const payload = {
      name: form.name.trim(),
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      settings: {},
    };

    if (!payload.name) {
      toast.error("Le nom de l'administration est obligatoire");
      return;
    }

    try {
      if (editingId) {
        const updated = await updateAdministration(editingId, payload);
        setAdministrationsState((prev) => ({
          ...prev,
          items: prev.items.map((item) => (item.id === updated.id ? updated : item)),
        }));
        toast.success("Administration modifiée avec succès");
      } else {
        const created = await createAdministration(payload);
        setAdministrationsState((prev) => ({
          ...prev,
          items: [created, ...prev.items],
        }));
        toast.success("Administration créée avec succès");
      }
      resetAdministrationForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer l'administration");
    }
  };

  const changeAdministrationStatus = async (administration: AdministrationRead, activate: boolean) => {
    try {
      const updated = await toggleAdministrationStatus(administration.id, activate);
      setAdministrationsState((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === updated.id ? updated : item)),
      }));
      toast.success(activate ? "Administration activée" : "Administration désactivée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier le statut");
    }
  };

  const removeAdministration = async (administration: AdministrationRead) => {
    try {
      await deleteAdministration(administration.id);
      setAdministrationsState((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.id !== administration.id),
        editingId: prev.editingId === administration.id ? null : prev.editingId,
        form: prev.editingId === administration.id ? emptyAdministrationForm : prev.form,
      }));
      toast.success("Administration supprimée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer l'administration");
    }
  };

  // ===== PACKAGES OPERATIONS =====
  const resetPackageForm = () => {
    setPackagesState((prev) => ({
      ...prev,
      form: emptyPackageForm,
      editingItem: null,
    }));
  };

  const validatePackagePayload = (
    form: PackageForm,
    editingItemId?: string,
  ) => {
    const payload = {
      code: form.code.trim(),
      label: form.label.trim(),
      description: form.description?.trim() || null,
      client_types: form.client_types || [],
    };

    if (!payload.code || !payload.label) {
      toast.error("Le code et le libellé sont obligatoires");
      return null;
    }

    if (payload.client_types.length === 0) {
      toast.error("Sélectionnez au moins un type de client");
      return null;
    }

    const isDuplicate = packagesState.items.some(
      (p) =>
        p.id !== editingItemId &&
        (p.code.toLowerCase() === payload.code.toLowerCase() ||
          p.label.toLowerCase() === payload.label.toLowerCase()),
    );
    if (isDuplicate) {
      toast.error("Le package existe déjà");
      return null;
    }

    return payload;
  };

  const openAddPackage = () => {
    const codeSuggestion = `PKG-${String(packagesState.items.length + 1).padStart(3, "0")}`;
    setPackagesState((prev) => ({
      ...prev,
      editingItem: null,
      form: { code: codeSuggestion, label: "", description: "", client_types: [], services: [], payment_methods: [] },
      dialogOpen: true,
    }));
  };

  const openEditPackage = async (pkg: PackageResponse) => {
    setPackagesState((prev) => ({ ...prev, editingItem: pkg }));
    try {
      const activeServiceIds = await getActivePackageServiceIds(pkg.id);
      const activePMIds = await extractPackagePaymentMethodIds(pkg.id);

      setPackagesState((prev) => ({
        ...prev,
        form: {
          code: pkg.code,
          label: pkg.label,
          description: pkg.description ?? "",
          client_types: pkg.client_types || [],
          services: activeServiceIds,
          payment_methods: activePMIds,
        },
        dialogOpen: true,
      }));
    } catch {
      setPackagesState((prev) => ({
        ...prev,
        form: { code: pkg.code, label: pkg.label, description: pkg.description ?? "", client_types: [], services: [], payment_methods: [] },
        dialogOpen: true,
      }));
    }
  };

  const openDetailPackage = async (pkg: PackageResponse) => {
    setPackagesState((prev) => ({ ...prev, viewingItem: pkg, detailOpen: true }));
    try {
      const activeServiceIds = await getActivePackageServiceIds(pkg.id);
      const activePMIds = await extractPackagePaymentMethodIds(pkg.id);
      setPackagesState((prev) => ({
        ...prev,
        packageServices: activeServiceIds,
        packagePaymentMethods: activePMIds,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du chargement des détails du package");
    }
  };

  // NOSONAR - orchestration des services et flux d'un package
  const savePackage = async () => { // NOSONAR
    const { form, editingItem } = packagesState;
    const payload = validatePackagePayload(form, editingItem?.id);
    if (!payload) return;

    if (form.services.length === 0) {
      toast.error("Sélectionnez au moins un service");
      return;
    }

    if (form.payment_methods.length === 0) {
      toast.error("Sélectionnez au moins un moyen de paiement");
      return;
    }

    if (isSavingPackageRef.current || packagesState.isSaving) return;
    isSavingPackageRef.current = true;
    setPackagesState((prev) => ({ ...prev, isSaving: true }));

    try {
      let pkgId = "";
      if (editingItem) {
        const updated = await updatePackage(editingItem.id, payload);
        setPackagesState((prev) => ({
          ...prev,
          items: prev.items.map((item) => (item.id === updated.id ? updated : item)),
        }));
        pkgId = updated.id;
      } else {
        const created = await createPackage({ ...payload, services: form.services, payment_methods: form.payment_methods });
        setPackagesState((prev) => ({ ...prev, items: [...prev.items, created] }));
        pkgId = created.id;
      }

      const currentPackageServices = editingItem
        ? await getActivePackageServiceIds(pkgId)
        : [];
      const servicesToAdd = form.services.filter((s) => !currentPackageServices.includes(s));
      const servicesToRemove = currentPackageServices.filter((s) => !form.services.includes(s));

      for (const srvId of servicesToAdd) await addServiceToPackage(pkgId, srvId);
      for (const srvId of servicesToRemove) {
        await removeServiceFromPackage(pkgId, srvId);
      }

      const currentPMList = editingItem
        ? await extractPackagePaymentMethodIds(pkgId)
        : [];
      await syncPackagePaymentMethods(pkgId, currentPMList, form.payment_methods);

      toast.success(editingItem ? "Package modifié avec succès" : "Package créé avec succès");
      setPackagesState((prev) => ({ ...prev, dialogOpen: false }));
      resetPackageForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer le package");
    } finally {
      isSavingPackageRef.current = false;
      setPackagesState((prev) => ({ ...prev, isSaving: false }));
    }
  };

  const removePackage = async (id: string) => {
    try {
      await deletePackage(id);
      setPackagesState((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
      toast.success("Package supprimé avec succès");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer le package");
    }
  };

  const changePackageStatus = async (pkg: PackageResponse, activate: boolean) => {
    try {
      const updated = activate ? await activatePackage(pkg.id) : await deactivatePackage(pkg.id);
      setPackagesState((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === updated.id ? updated : item)),
      }));
      toast.success(activate ? "Package activé" : "Package désactivé");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de changer le statut");
    }
  };

  const openDuplicatePackage = async (pkg: PackageResponse) => {
    setDuplicateState((prev) => ({ ...prev, duplicatingItem: pkg }));
    try {
      const activeServiceIds = await getActivePackageServiceIds(pkg.id);
      const activePMIds = await extractPackagePaymentMethodIds(pkg.id);

      setDuplicateState((prev) => ({
        ...prev,
        form: {
          code: `${pkg.code}-COPY`,
          label: `${pkg.label} (Copie)`,
          description: pkg.description ?? "",
          client_types: pkg.client_types || [],
          services: activeServiceIds,
          payment_methods: activePMIds,
        },
        dialogOpen: true,
      }));
    } catch {
      setDuplicateState((prev) => ({
        ...prev,
        form: { code: `${pkg.code}-COPY`, label: `${pkg.label} (Copie)`, description: pkg.description ?? "", client_types: [], services: [], payment_methods: [] },
        dialogOpen: true,
      }));
    }
  };

  // NOSONAR - duplication complète d'un package avec ses services et flux
  const confirmDuplicatePackage = async () => { // NOSONAR
    const { duplicatingItem, form } = duplicateState;
    if (!duplicatingItem) return;

    const payload = validatePackagePayload(form);
    if (!payload) return;

    try {
      const duplicated = await duplicatePackage(duplicatingItem.id, { code: payload.code, label: payload.label });
      const newPkgId = duplicated.id;

      if (payload.description !== duplicatingItem.description) {
        await updatePackage(newPkgId, { code: payload.code, label: payload.label, description: payload.description });
        duplicated.description = payload.description;
      }

      const currentPackageServices = await getActivePackageServiceIds(newPkgId);
      const servicesToAdd = form.services.filter((s) => !currentPackageServices.includes(s));
      const servicesToRemove = currentPackageServices.filter((s) => !form.services.includes(s));

      for (const srvId of servicesToAdd) await addServiceToPackage(newPkgId, srvId);
      for (const srvId of servicesToRemove) await removeServiceFromPackage(newPkgId, srvId);

      const currentPMs = await extractPackagePaymentMethodIds(newPkgId);
      await syncPackagePaymentMethods(newPkgId, currentPMs, form.payment_methods);

      setPackagesState((prev) => ({ ...prev, items: [...prev.items, { ...duplicated, status: "inactive" }] }));
      toast.success(`Package dupliqué avec succès sous le code: ${duplicated.code}`);
      setDuplicateState((prev) => ({ ...prev, dialogOpen: false, duplicatingItem: null }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de dupliquer le package");
    }
  };

  const archiveExistingPackage = async (id: string) => {
    try {
      const archived = await archivePackage(id);
      setPackagesState((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === id ? archived : item)),
      }));
      toast.success("Package archivé avec succès");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'archiver le package");
    }
  };

  // NOSONAR - orchestration des associations service et flux de paiement du package
  const toggleServiceInPackage = async (serviceId: string, enabled: boolean) => { // NOSONAR
    const viewingPackage = packagesState.viewingItem;
    if (!viewingPackage) return;
    try {
      if (enabled) {
        await addServiceToPackage(viewingPackage.id, serviceId);
        setPackagesState((prev) => ({ ...prev, packageServices: [...prev.packageServices, serviceId] }));
        toast.success("Service activé dans le package");
      } else {
        await removeServiceFromPackage(viewingPackage.id, serviceId);
        setPackagesState((prev) => ({
          ...prev,
          packageServices: prev.packageServices.filter((id) => id !== serviceId),
        }));
        toast.success("Service désactivé dans le package");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier le service du package");
    }
  };

  const togglePaymentMethodInPackage = async (pmId: string, enabled: boolean) => {
    const viewingPackage = packagesState.viewingItem;
    if (!viewingPackage) return;
    try {
      if (enabled) {
        await addPaymentMethodToPackage(viewingPackage.id, pmId);
        setPackagesState((prev) => ({ ...prev, packagePaymentMethods: [...prev.packagePaymentMethods, pmId] }));
        toast.success("Moyen de paiement activé dans le package");
      } else {
        await removePaymentMethodFromPackage(viewingPackage.id, pmId);
        setPackagesState((prev) => ({ ...prev, packagePaymentMethods: prev.packagePaymentMethods.filter((id) => id !== pmId) }));
        toast.success("Moyen de paiement désactivé dans le package");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier le moyen de paiement du package");
    }
  };

  const toggleServiceGlobalStatus = async (srv: ServiceResponse, activate: boolean) => {
    try {
      const updated = await toggleServiceStatus(srv.id, activate);
      setServicesState((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === updated.id ? updated : item)),
      }));
      toast.success(updated.status === "active" ? "Service activé" : "Service désactivé");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    }
  };

  const togglePaymentMethodGlobalStatus = async (pm: PaymentMethodResponse, activate: boolean) => {
    try {
      const updated = await togglePaymentMethodStatus(pm.code, activate);
      setPaymentMethodsState((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === updated.id
            ? { ...item, ...updated, logo_url: updated.logo_url ?? item.logo_url }
            : item,
        ),
      }));
      toast.success(updated.status === "active" ? "Moyen de paiement activé" : "Moyen de paiement désactivé");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    }
  };

  // ===== SERVICES OPERATIONS (CRUD) =====
  const resetServiceForm = () => {
    setServicesState((prev) => ({
      ...prev,
      form: { code: "", label: "", description: "", sourcePaymentMethodIds: [], destinationPaymentMethodIds: [] },
      editingItem: null,
    }));
  };

  const openAddService = () => {
    resetServiceForm();
    setServicesState((prev) => ({ ...prev, dialogOpen: true }));
  };

  const openEditService = async (srv: ServiceResponse) => {
    setServicesState((prev) => ({ ...prev, editingItem: srv }));
    try {
      const flows = await fetchServicePaymentFlows(srv.id);
      const firstFlow = flows[0];
      setServicesState((prev) => ({
        ...prev,
        editingItem: srv,
        form: {
          code: srv.code,
          label: srv.label,
          description: srv.description ?? "",
          sourcePaymentMethodIds: firstFlow ? getPaymentMethodIds(firstFlow, "source") : [],
          destinationPaymentMethodIds: firstFlow ? getPaymentMethodIds(firstFlow, "destination") : [],
        },
        dialogOpen: true,
      }));
    } catch (error) {
      console.error(error);
      setServicesState((prev) => ({
        ...prev,
        form: { code: srv.code, label: srv.label, description: srv.description ?? "", sourcePaymentMethodIds: [], destinationPaymentMethodIds: [] },
        dialogOpen: true,
      }));
    }
  };

  // NOSONAR - synchronisation du service et de son flux de paiement
  const saveService = async () => { // NOSONAR
    const { form, editingItem } = servicesState;
    const payload = {
      code: form.code.trim(),
      label: form.label.trim(),
      description: form.description.trim() || null,
    };

    if (!payload.code || !payload.label) {
      toast.error("Le code et le libellé sont obligatoires");
      return;
    }

    try {
      let savedService: ServiceResponse;
      if (editingItem) {
        savedService = await updateService(editingItem.id, payload);
        setServicesState((prev) => ({
          ...prev,
          items: prev.items.map((item) => (item.id === savedService.id ? savedService : item)),
        }));

        const existingFlows = await fetchServicePaymentFlows(editingItem.id);
        const hasSources = form.sourcePaymentMethodIds.length > 0;
        const hasDestinations = form.destinationPaymentMethodIds.length > 0;

        if (existingFlows.length > 0) {
          const firstFlow = existingFlows[0];
          if (hasSources && hasDestinations) {
            await updateServicePaymentFlow(editingItem.id, firstFlow.id, {
              source_payment_method_ids: form.sourcePaymentMethodIds,
              destination_payment_method_ids: form.destinationPaymentMethodIds,
            });
          } else {
            await deleteServicePaymentFlow(editingItem.id, firstFlow.id);
          }
        } else if (hasSources && hasDestinations) {
          await createServicePaymentFlow(editingItem.id, {
            source_payment_method_ids: form.sourcePaymentMethodIds,
            destination_payment_method_ids: form.destinationPaymentMethodIds,
          });
        }

        const refreshedFlows = await fetchServicePaymentFlows(editingItem.id);
        setServicesState((prev) => ({
          ...prev,
          flowsMap: { ...prev.flowsMap, [editingItem.id]: refreshedFlows },
        }));
        toast.success("Service modifié avec succès");
      } else {
        savedService = await createService(payload);
        setServicesState((prev) => ({ ...prev, items: [...prev.items, savedService] }));

        let newFlows: ServicePaymentFlowResponse[] = [];
        if (form.sourcePaymentMethodIds.length > 0 && form.destinationPaymentMethodIds.length > 0) {
          const created = await createServicePaymentFlow(savedService.id, {
            source_payment_method_ids: form.sourcePaymentMethodIds,
            destination_payment_method_ids: form.destinationPaymentMethodIds,
          });
          newFlows = [created];
        }
        setServicesState((prev) => ({
          ...prev,
          flowsMap: { ...prev.flowsMap, [savedService.id]: newFlows },
        }));
        toast.success("Service créé avec succès");
      }
      setServicesState((prev) => ({ ...prev, dialogOpen: false }));
      resetServiceForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer le service");
    }
  };

  const removeService = async (id: string) => {
    try {
      await deleteService(id);
      setServicesState((prev) => {
        const nextFlowsMap = { ...prev.flowsMap };
        delete nextFlowsMap[id];
        return {
          ...prev,
          items: prev.items.filter((item) => item.id !== id),
          flowsMap: nextFlowsMap,
        };
      });
      toast.success("Service supprimé avec succès");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer le service");
    }
  };

  const toggleServiceFlowStatus = async (serviceId: string, flowId: string, enable: boolean) => {
    try {
      const updated = enable
        ? await enableServicePaymentFlow(serviceId, flowId)
        : await disableServicePaymentFlow(serviceId, flowId);
      setServicesState((prev) => ({
        ...prev,
        flowsMap: {
          ...prev.flowsMap,
          [serviceId]: (prev.flowsMap[serviceId] || []).map((f) => (f.id === updated.id ? updated : f)),
        },
      }));
      toast.success(enable ? "Flux de paiement activé" : "Flux de paiement désactivé");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier le statut du flux");
    }
  };

  const refreshServiceFlow = async (serviceId: string, flowId: string) => {
    try {
      const flow = await fetchServicePaymentFlow(serviceId, flowId);
      setServicesState((prev) => ({
        ...prev,
        flowsMap: {
          ...prev.flowsMap,
          [serviceId]: (prev.flowsMap[serviceId] || []).map((f) => (f.id === flowId ? flow : f)),
        },
      }));
    } catch (error) {
      console.error("Impossible de rafraîchir le flux:", error);
    }
  };

  // ===== FEES GRID / TARIFICATION OPERATIONS =====
  const resolveFeeTenantId = (level: TenantLevel, agencyId: string): string | null => {
    if (level === "GLOBAL") return null;
    if (level === "STRUCTURE" || level === "PRODUCT") return resolvedInstitutionId || null;
    if (level === "DISTRIBUTEUR") return resolvedDistributorId || null;
    return agencyId || null;
  };

  const resetFeeForm = () => {
    setFeesState((prev) => ({
      ...prev,
      editingItem: null,
      form: {
        tenantLevel: defaultTenantLevel,
        tenantId: defaultTenantId,
        serviceType: prev.selectedServiceType,
        minBound: "",
        maxBound: "",
        fixedFee: "",
        rateFee: "",
        overrideReason: "",
      },
    }));
  };

  const handleFeeLevelChange = (level: FilterLevel) => {
    setFeesState((prev) => ({
      ...prev,
      form: { ...prev.form, tenantLevel: level as TenantLevel, tenantId: resolveTenantIdForLevel(level) },
    }));
  };

  const openAddFee = () => {
    resetFeeForm();
    setFeesState((prev) => ({ ...prev, dialogOpen: true }));
  };

  const openEditFee = async (fee: FeeResponse) => {
    try {
      const freshFee = await fetchFeeDetail(fee.id);
      setFeesState((prev) => ({
        ...prev,
        editingItem: freshFee,
        form: {
          tenantLevel: freshFee.tenant_level,
          tenantId: freshFee.tenant_id ?? "",
          serviceType: freshFee.service_type,
          minBound: freshFee.min_bound.toString(),
          maxBound: freshFee.max_bound.toString(),
          fixedFee: freshFee.fixed_fee.toString(),
          rateFee: freshFee.rate_fee.toString(),
          overrideReason: "",
        },
        dialogOpen: true,
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de charger les détails de cette ligne de frais");
    }
  };

  const openDetailFee = async (id: string) => {
    setFeesState((prev) => ({ ...prev, viewingItem: null, detailOpen: true, isLoadingDetail: true }));
    try {
      const freshFee = await fetchFeeDetail(id);
      setFeesState((prev) => ({ ...prev, viewingItem: freshFee }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de charger les détails de cette ligne de frais");
      setFeesState((prev) => ({ ...prev, detailOpen: false }));
    } finally {
      setFeesState((prev) => ({ ...prev, isLoadingDetail: false }));
    }
  };

  const saveFee = async () => {
    const { form, editingItem, items } = feesState;
    const minBoundNum = Number.parseFloat(form.minBound);
    const maxBoundNum = Number.parseFloat(form.maxBound);
    const fixedFeeNum = Number.parseFloat(form.fixedFee);
    const rateFeeNum = Number.parseFloat(form.rateFee);

    if (Number.isNaN(minBoundNum) || Number.isNaN(maxBoundNum) || Number.isNaN(fixedFeeNum) || Number.isNaN(rateFeeNum)) {
      toast.error("Veuillez renseigner toutes les valeurs numériques obligatoires (bornes et frais)");
      return;
    }
    if (minBoundNum < 0 || maxBoundNum < 0 || fixedFeeNum < 0 || rateFeeNum < 0) {
      toast.error("Les valeurs ne peuvent pas être négatives");
      return;
    }
    if (minBoundNum >= maxBoundNum) {
      toast.error("La borne minimale doit être inférieure à la borne maximale");
      return;
    }

    const hasOverlap = items.some((item) => {
      if (item.id === editingItem?.id) return false;
      const sameService = item.service_type === form.serviceType;
      const sameLevel = item.tenant_level === form.tenantLevel;
      const formTenantId = resolveFeeTenantId(form.tenantLevel, form.tenantId);
      const sameTenant = (item.tenant_id ?? null) === formTenantId;
      if (!sameService || !sameLevel || !sameTenant) return false;
      return (
        (minBoundNum < item.max_bound && maxBoundNum > item.min_bound) ||
        (minBoundNum === item.min_bound && maxBoundNum === item.max_bound)
      );
    });

    if (hasOverlap) {
      toast.error("Erreur, cette ligne de grille existe déjà");
      return;
    }

    try {
      if (editingItem) {
        const updated = await updateFee(editingItem.id, {
          min_bound: minBoundNum,
          max_bound: maxBoundNum,
          fixed_fee: fixedFeeNum,
          rate_fee: rateFeeNum,
        });
        setFeesState((prev) => ({
          ...prev,
          items: prev.items.map((item) => (item.id === updated.id ? updated : item)),
        }));
        toast.success("Ligne de frais modifiée avec succès");
      } else {
        const created = await createFee({
          min_bound: minBoundNum,
          max_bound: maxBoundNum,
          fixed_fee: fixedFeeNum,
          rate_fee: rateFeeNum,
          service_type: form.serviceType,
          tenant_level: form.tenantLevel,
          tenant_id: resolveFeeTenantId(form.tenantLevel, form.tenantId),
          override_reason: form.overrideReason?.trim() || null,
        });
        setFeesState((prev) => ({ ...prev, items: [...prev.items, created] }));
        toast.success("Ligne de frais créée avec succès");
      }
      setFeesState((prev) => ({ ...prev, dialogOpen: false }));
      resetFeeForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de sauvegarder la ligne de frais");
    }
  };

  const removeFee = async (id: string) => {
    try {
      await deleteFee(id);
      setFeesState((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
      toast.success("Ligne de frais supprimée avec succès");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer la ligne de frais");
    }
  };

  const toggleFee = async (id: string, isActive: boolean) => {
    try {
      await toggleFeeStatus(id, isActive);
      setFeesState((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === id ? { ...item, is_active: isActive } : item)),
      }));
      toast.success(isActive ? "Ligne de frais activée avec succès" : "Ligne de frais désactivée avec succès");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du changement de statut");
    }
  };

  return {
    administrations: administrationsState.items,
    administrationForm: administrationsState.form,
    setAdministrationForm: (val: typeof administrationsState.form) =>
      setAdministrationsState((prev) => ({ ...prev, form: val })),
    editingAdministrationId: administrationsState.editingId,
    isLoadingAdministrations: administrationsState.isLoading,
    loadAdministrations,
    editAdministration,
    resetAdministrationForm,
    saveAdministration,
    changeAdministrationStatus,
    removeAdministration,

    // Packages, Services, Moyens de paiement
    packages: packagesState.items,
    isSavingPackage: packagesState.isSaving,
    setPackages: (items: PackageResponse[]) => setPackagesState((prev) => ({ ...prev, items })),
    services: servicesState.items,
    setServices: (items: ServiceResponse[]) => setServicesState((prev) => ({ ...prev, items })),
    paymentMethods: paymentMethodsState.items,
    setPaymentMethods: (items: PaymentMethodResponse[]) => setPaymentMethodsState((prev) => ({ ...prev, items })),
    dialogPackageOpen: packagesState.dialogOpen,
    setDialogPackageOpen: (open: boolean) => setPackagesState((prev) => ({ ...prev, dialogOpen: open })),
    detailPackageOpen: packagesState.detailOpen,
    setDetailPackageOpen: (open: boolean) => setPackagesState((prev) => ({ ...prev, detailOpen: open })),
    editingPackage: packagesState.editingItem,
    setEditingPackage: (pkg: PackageResponse | null) => setPackagesState((prev) => ({ ...prev, editingItem: pkg })),
    viewingPackage: packagesState.viewingItem,
    setViewingPackage: (pkg: PackageResponse | null) => setPackagesState((prev) => ({ ...prev, viewingItem: pkg })),
    packageForm: packagesState.form,
    setPackageForm: (form: PackageForm) => setPackagesState((prev) => ({ ...prev, form })),
    packageServices: packagesState.packageServices,
    setPackageServices: (ids: string[]) => setPackagesState((prev) => ({ ...prev, packageServices: ids })),
    packagePaymentMethods: packagesState.packagePaymentMethods,
    setPackagePaymentMethods: (ids: string[]) => setPackagesState((prev) => ({ ...prev, packagePaymentMethods: ids })),
    isLoadingPackages: packagesState.isLoading,
    isLoadingServices: servicesState.isLoading,
    isLoadingPaymentMethods: paymentMethodsState.isLoading,
    loadPackages, loadServices, loadPaymentMethods,
    resetPackageForm, openAddPackage, openEditPackage, openDetailPackage,
    savePackage, removePackage, changePackageStatus, openDuplicatePackage, confirmDuplicatePackage, archiveExistingPackage,
    dialogDuplicateOpen: duplicateState.dialogOpen,
    setDialogDuplicateOpen: (open: boolean) => setDuplicateState((prev) => ({ ...prev, dialogOpen: open })),
    duplicatingPackage: duplicateState.duplicatingItem,
    setDuplicatingPackage: (pkg: PackageResponse | null) => setDuplicateState((prev) => ({ ...prev, duplicatingItem: pkg })),
    duplicateForm: duplicateState.form,
    setDuplicateForm: (form: PackageForm) => setDuplicateState((prev) => ({ ...prev, form })),
    toggleServiceInPackage, togglePaymentMethodInPackage,
    toggleServiceGlobalStatus, togglePaymentMethodGlobalStatus,

    // Service CRUD
    dialogServiceOpen: servicesState.dialogOpen,
    setDialogServiceOpen: (open: boolean) => setServicesState((prev) => ({ ...prev, dialogOpen: open })),
    editingService: servicesState.editingItem,
    setEditingService: (srv: ServiceResponse | null) => setServicesState((prev) => ({ ...prev, editingItem: srv })),
    serviceForm: servicesState.form,
    setServiceForm: (form: typeof servicesState.form) => setServicesState((prev) => ({ ...prev, form })),
    openAddService, openEditService, saveService, removeService,
    serviceFlowsMap: servicesState.flowsMap,
    toggleServiceFlowStatus,
    refreshServiceFlow,
    // Fees / Tarification
    selectedProductId: feesState.selectedProductId,
    setSelectedProductId: (id: string) => setFeesState((prev) => ({ ...prev, selectedProductId: id })),
    selectedServiceType: feesState.selectedServiceType,
    setSelectedServiceType: (type: ServiceType) => setFeesState((prev) => ({ ...prev, selectedServiceType: type })),
    fees: feesState.items,
    setFees: (items: FeeResponse[]) => setFeesState((prev) => ({ ...prev, items })),
    produitsOptions: feesState.produitsOptions,
    isLoadingFees: feesState.isLoading,
    dialogFeeOpen: feesState.dialogOpen,
    setDialogFeeOpen: (open: boolean) => setFeesState((prev) => ({ ...prev, dialogOpen: open })),
    editingFee: feesState.editingItem,
    feeForm: feesState.form,
    setFeeForm: (form: typeof feesState.form) => setFeesState((prev) => ({ ...prev, form })),
    loadFees,
    openAddFee,
    openEditFee,
    saveFee,
    removeFee,
    toggleFee,
    isStructureAdmin,
    isProductAdmin,
    isDistributorAdmin,
    filterLevel: filterState.level,
    setFilterLevel: (level: typeof filterState.level) => setFilterState((prev) => ({ ...prev, level })),
    filterTenantId: filterState.tenantId,
    setFilterTenantId: (id: string) => setFilterState((prev) => ({ ...prev, tenantId: id })),
    handleFilterLevelChange,
    handleFeeLevelChange,
    agencies: agenciesState.items,
    activeAgencies,
    isLoadingAgencies: agenciesState.isLoading,
    consolidatedFees: feesState.consolidated,
    isLoadingConsolidatedFees: feesState.isLoadingConsolidated,
    loadConsolidatedFees,
    fetchFeeDetail,
    detailFeeOpen: feesState.detailOpen,
    setDetailFeeOpen: (open: boolean) => setFeesState((prev) => ({ ...prev, detailOpen: open })),
    viewingFee: feesState.viewingItem,
    isLoadingFeeDetail: feesState.isLoadingDetail,
    openDetailFee,
  };
};
