import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import { ServiceFormField, validateServiceForm } from "./packageValidation";
import {
  PackageResponse,
  PackageForm,
  ServiceResponse,
  ServiceForm,
} from "../models/types";
import { PaymentMethodResponse } from "@/features/payment-methods/models/types";
import { fetchPaymentMethods } from "@/features/payment-methods/services/paymentMethodsService";
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
  addServicesToPackage,
  removeServiceFromPackage,
  removeServicesFromPackage,
  fetchPackagePaymentMethods,
  addPaymentMethodToPackage,
  addPaymentMethodsToPackage,
  removePaymentMethodFromPackage,
} from "../services/packagesService";
import {
  fetchServices,
  fetchCatalogServices,
  createService,
  updateService,
  deleteService,
  toggleServiceStatus,
  isTechnicalUser,
  createContractUpload,
  updateContractUpload,
  mapContractToService,
} from "../services/servicesService";

export interface UsePackagesOptions {
  enabled?: boolean;
  isTechnical?: boolean;
}

const emptyPackageForm: PackageForm = {
  code: "",
  label: "",
  description: "",
  client_types: [],
  services: [],
  payment_methods: [],
};

const emptyServiceForm: ServiceForm = {
  code: "",
  label: "",
  description: "",
  category_id: null,
};

export const usePackages = (options?: UsePackagesOptions) => {
  const enabled = options?.enabled ?? true;
  const isTechnical = options?.isTechnical;

  // Data states
  const [packages, setPackages] = useState<PackageResponse[]>([]);
  const [services, setServices] = useState<ServiceResponse[]>([]);
  const [catalogServices, setCatalogServices] = useState<ServiceResponse[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Package modal & action states
  const [dialogPackageOpen, setDialogPackageOpen] = useState(false);
  const [detailPackageOpen, setDetailPackageOpen] = useState(false);
  const [packageForm, setPackageForm] = useState<PackageForm>(emptyPackageForm);
  const [editingPackage, setEditingPackage] = useState<PackageResponse | null>(null);
  const [viewingPackage, setViewingPackage] = useState<PackageResponse | null>(null);
  const [isSavingPackage, setIsSavingPackage] = useState(false);
  const isSavingPackageRef = useRef(false);


  // Associated items inside viewing package
  const [packageServices, setPackageServices] = useState<string[]>([]);
  const [packagePaymentMethods, setPackagePaymentMethods] = useState<string[]>([]);
  const [isLoadingDetailFlows, setIsLoadingDetailFlows] = useState(false);

  // Confirmation modals
  const [packageToDelete, setPackageToDelete] = useState<PackageResponse | null>(null);
  const [isDeletingPackage, setIsDeletingPackage] = useState(false);
  const [packageToArchive, setPackageToArchive] = useState<PackageResponse | null>(null);
  const [isArchivingPackage, setIsArchivingPackage] = useState(false);
  const [packageToToggleStatus, setPackageToToggleStatus] = useState<PackageResponse | null>(null);
  const [packageToggleConfirmation, setPackageToggleConfirmation] = useState<{
    pkg: PackageResponse;
    activate: boolean;
  } | null>(null);

  // Duplicate modal
  const [dialogDuplicateOpen, setDialogDuplicateOpen] = useState(false);
  const [duplicatingPackage, setDuplicatingPackage] = useState<PackageResponse | null>(null);
  const [duplicateForm, setDuplicateForm] = useState<PackageForm>(emptyPackageForm);

  // Service modal & action states
  const [dialogServiceOpen, setDialogServiceOpenState] = useState(false);
  const {
    errors: serviceFormErrors,
    setErrors: setServiceFormErrors,
    clearError: clearServiceFormError,
    resetErrors: resetServiceFormErrors,
  } = useFieldErrors<ServiceFormField>();
  const setDialogServiceOpen = useCallback(
    (open: boolean) => {
      resetServiceFormErrors();
      setDialogServiceOpenState(open);
    },
    [resetServiceFormErrors],
  );
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyServiceForm);
  const [editingService, setEditingService] = useState<ServiceResponse | null>(null);
  const [viewingService, setViewingService] = useState<ServiceResponse | null>(null);
  const [isSavingService, setIsSavingService] = useState(false);

  // Load all initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const isTech = isTechnical !== undefined ? isTechnical : isTechnicalUser();
      const [pkgs, srvs, pms, catSrvs] = await Promise.all([
        fetchPackages(),
        fetchServices(isTech),
        fetchPaymentMethods(),
        isTech ? fetchCatalogServices().catch(() => []) : Promise.resolve([]),
      ]);
      setPackages(pkgs);
      setServices(srvs);
      setPaymentMethods(pms);
      setCatalogServices(isTech ? (catSrvs.length > 0 ? catSrvs : srvs) : srvs);
    } catch (err) {
      toast.error((err as Error | null | undefined)?.message || "Erreur lors du chargement des packages et services");
    } finally {
      setIsLoading(false);
    }
  }, [isTechnical]);

  useEffect(() => {
    if (!enabled) return;
    void loadData();
  }, [enabled, loadData]);


  // Handlers pour la sélection des Services
  const handleToggleService = (serviceId: string, checked: boolean) => {
    setPackageForm((prev) => {
      const current = prev.services || [];
      const next = checked
        ? current.includes(serviceId) ? current : [...current, serviceId]
        : current.filter((id) => id !== serviceId);
      return { ...prev, services: next };
    });
  };

  const handleToggleAllServices = (selectAll: boolean) => {
    const list = catalogServices.length > 0 ? catalogServices : services;
    setPackageForm((prev) => ({
      ...prev,
      services: selectAll ? list.filter((s) => s.status === "active").map((s) => s.id) : [],
    }));
  };

  // Handlers pour la sélection des Moyens de Paiement
  const handleTogglePaymentMethod = (pmId: string, checked: boolean) => {
    setPackageForm((prev) => {
      const current = prev.payment_methods || [];
      const next = checked
        ? current.includes(pmId) ? current : [...current, pmId]
        : current.filter((id) => id !== pmId);
      return { ...prev, payment_methods: next };
    });
  };

  const handleToggleAllPaymentMethods = (selectAll: boolean) => {
    setPackageForm((prev) => ({
      ...prev,
      payment_methods: selectAll
        ? paymentMethods.filter((pm) => pm.status === "active").map((pm) => pm.id)
        : [],
    }));
  };


  // ===== PACKAGE HANDLERS =====
  const openAddPackage = () => {
    const codeSuggestion = `PKG-${String(packages.length + 1).padStart(3, "0")}`;
    setEditingPackage(null);
    setPackageForm({
      code: codeSuggestion,
      label: "",
      description: "",
      client_types: ["PARTICULIER", "ENTREPRISE", "COMMERCANT"],
      services: [],
      payment_methods: [],
    });
    setDialogPackageOpen(true);
  };

  const openEditPackage = async (pkg: PackageResponse) => {
    setEditingPackage(pkg);

    try {
      const [pServices, pMethods] = await Promise.all([
        fetchPackageServices(pkg.id).catch(() => []),
        fetchPackagePaymentMethods(pkg.id).catch(() => []),
      ]);
      const activeServiceIds = pServices.filter((ps) => ps.is_enabled).map((ps) => ps.service_id);
      const activePMIds = pMethods.filter((pm) => pm.is_enabled).map((pm) => pm.payment_method_id);

      setPackageForm({
        code: pkg.code,
        label: pkg.label,
        description: pkg.description ?? "",
        client_types: pkg.client_types || [],
        services: activeServiceIds,
        payment_methods: activePMIds,
      });
      setDialogPackageOpen(true);
    } catch {
      setPackageForm({
        code: pkg.code,
        label: pkg.label,
        description: pkg.description ?? "",
        client_types: pkg.client_types || [],
        services: [],
        payment_methods: [],
      });
      setDialogPackageOpen(true);
    }
  };

  const openDetailPackage = async (pkg: PackageResponse) => {
    setViewingPackage(pkg);
    setDetailPackageOpen(true);
    setIsLoadingDetailFlows(true);
    try {
      const [pServices, pMethods] = await Promise.all([
        fetchPackageServices(pkg.id).catch(() => []),
        fetchPackagePaymentMethods(pkg.id).catch(() => []),
      ]);
      const activeServiceIds = pServices.filter((ps) => ps.is_enabled).map((ps) => ps.service_id);
      const activePMIds = pMethods.filter((pm) => pm.is_enabled).map((pm) => pm.payment_method_id);

      setPackageServices(activeServiceIds);
      setPackagePaymentMethods(activePMIds);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du chargement des détails du package");
    } finally {
      setIsLoadingDetailFlows(false);
    }
  };

  const savePackage = async () => {
    const payload = {
      code: packageForm.code.trim(),
      label: packageForm.label.trim(),
      description: packageForm.description?.trim() || null,
      client_types: packageForm.client_types || [],
    };

    if (!payload.code || !payload.label) {
      toast.error("Le code et le libellé sont obligatoires");
      return;
    }

    if (payload.client_types.length === 0) {
      toast.error("Sélectionnez au moins un type de client");
      return;
    }

    if (packageForm.services.length === 0) {
      toast.error("Sélectionnez au moins un service");
      return;
    }

    if (packageForm.payment_methods.length === 0) {
      toast.error("Sélectionnez au moins un moyen de paiement");
      return;
    }

    if (isSavingPackageRef.current || isSavingPackage) return;
    isSavingPackageRef.current = true;
    setIsSavingPackage(true);

    try {
      let pkgId = "";
      if (editingPackage) {
        const updated = await updatePackage(editingPackage.id, payload);
        setPackages((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        pkgId = updated.id;
      } else {
        const created = await createPackage({
          ...payload,
          services: packageForm.services,
          payment_methods: packageForm.payment_methods,
        });
        setPackages((prev) => [...prev, created]);
        pkgId = created.id;
      }

      const desiredServiceIds = packageForm.services;
      const desiredPMIds = packageForm.payment_methods;

      // 1. Synchroniser les services du package (assigner / désassigner)
      // Pour la désassignation : DELETE /api/v1/packages-services/packages/{package_id}/services
      // Pour l'assignation : POST /api/v1/packages-services/packages/{package_id}/services
      if (editingPackage) {
        const currentPackageServices = (await fetchPackageServices(pkgId)).filter((ps) => ps.is_enabled);
        const currentServiceIds = currentPackageServices.map((ps) => ps.service_id);

        const servicesToRemove = currentServiceIds.filter((s) => !desiredServiceIds.includes(s));
        const servicesToAdd = desiredServiceIds.filter((s) => !currentServiceIds.includes(s));

        if (servicesToRemove.length > 0) {
          await removeServicesFromPackage(pkgId, servicesToRemove).catch((err) => {
            console.error("Erreur lors de la désassignation des services du package:", err);
          });
        }

        if (servicesToAdd.length > 0) {
          await addServicesToPackage(pkgId, servicesToAdd).catch((err) => {
            console.error("Erreur lors de l'assignation des services au package:", err);
          });
        }
      } else {
        if (desiredServiceIds.length > 0) {
          await addServicesToPackage(pkgId, desiredServiceIds).catch((err) => {
            console.error("Erreur lors de l'assignation des services au package:", err);
          });
        }
      }

      // 2. Synchroniser les moyens de paiement directement rattachés au package :
      // GET /api/v1/packages-services/packages/{package_id}/payment-methods (en édition uniquement)
      // POST /api/v1/packages-services/packages/{package_id}/payment-methods
      // DELETE /api/v1/packages-services/packages/{package_id}/payment-methods/{method_id}
      try {
        if (editingPackage) {
          const existingPMs = await fetchPackagePaymentMethods(pkgId).catch(() => []);
          const existingPMIds = existingPMs.map((pm) => pm.payment_method_id);

          // Supprimer ceux qui ont été désélectionnés
          const pmsToRemove = existingPMs.filter((pm) => !desiredPMIds.includes(pm.payment_method_id));
          if (pmsToRemove.length > 0) {
            await Promise.all(
              pmsToRemove.map((pm) =>
                removePaymentMethodFromPackage(pkgId, pm.payment_method_id).catch((err) => {
                  console.error("Erreur suppression moyen de paiement:", err);
                })
              )
            );
          }

          // Ajouter les nouveaux moyens de paiement en un seul appel
          const pmsToAdd = desiredPMIds.filter((pmId) => !existingPMIds.includes(pmId));
          if (pmsToAdd.length > 0) {
            await addPaymentMethodsToPackage(pkgId, pmsToAdd).catch((err) => {
              console.error("Erreur ajout moyens de paiement:", err);
            });
          }
        } else {
          // Création d'un nouveau package : aucun GET de diff nécessaire, un seul appel batch
          if (desiredPMIds.length > 0) {
            await addPaymentMethodsToPackage(pkgId, desiredPMIds).catch((err) => {
              console.error("Erreur ajout moyens de paiement:", err);
            });
          }
        }
      } catch (pmErr) {
        console.error("Erreur lors de la synchronisation des moyens de paiement du package:", pmErr);
      }

      toast.success(editingPackage ? "Package modifié avec succès" : "Package créé avec succès");
      setDialogPackageOpen(false);
      setPackageForm(emptyPackageForm);
      setEditingPackage(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer le package");
    } finally {
      isSavingPackageRef.current = false;
      setIsSavingPackage(false);
    }
  };

  const handleDeletePackage = async () => {
    if (!packageToDelete) return;
    try {
      setIsDeletingPackage(true);
      await deletePackage(packageToDelete.id);
      setPackages((prev) => prev.filter((item) => item.id !== packageToDelete.id));
      toast.success("Package supprimé avec succès");
      setPackageToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer le package");
    } finally {
      setIsDeletingPackage(false);
    }
  };

  const handleArchivePackage = async () => {
    if (!packageToArchive) return;
    if (packageToArchive.status === "archived") {
      toast.error("Ce package est déjà archivé");
      return;
    }
    if (packageToArchive.status === "active") {
      toast.error("Un package actif ne peut pas être archivé directement. Veuillez d'abord le désactiver.");
      return;
    }
    try {
      setIsArchivingPackage(true);
      const archived = await archivePackage(packageToArchive.id);
      setPackages((prev) =>
        prev.map((item) =>
          item.id === archived.id ? { ...archived, status: "archived" } : item
        )
      );
      toast.success("Package archivé avec succès");
      setPackageToArchive(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'archiver le package");
    } finally {
      setIsArchivingPackage(false);
    }
  };

  const handleTogglePackageStatus = async () => {
    if (!packageToggleConfirmation) return;
    const { pkg, activate } = packageToggleConfirmation;
    try {
      const updated = activate ? await activatePackage(pkg.id) : await deactivatePackage(pkg.id);
      setPackages((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(`Package ${activate ? "activé" : "désactivé"} avec succès`);
      setPackageToggleConfirmation(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier le statut du package");
    }
  };

  const openDuplicatePackage = async (pkg: PackageResponse) => {
    setDuplicatingPackage(pkg);
    try {
      const [pServices, pPaymentMethods] = await Promise.all([
        fetchPackageServices(pkg.id).catch(() => []),
        fetchPackagePaymentMethods(pkg.id).catch(() => []),
      ]);
      const activeServiceIds = pServices.filter((ps) => ps.is_enabled).map((ps) => ps.service_id);
      const activePMIds = pPaymentMethods.filter((pm) => pm.is_enabled).map((pm) => pm.payment_method_id);

      setDuplicateForm({
        code: `${pkg.code}-COPY`,
        label: `${pkg.label} (Copie)`,
        description: pkg.description ?? "",
        client_types: pkg.client_types || [],
        services: activeServiceIds,
        payment_methods: activePMIds,
      });
      setDialogDuplicateOpen(true);
    } catch {
      setDuplicateForm({
        code: `${pkg.code}-COPY`,
        label: `${pkg.label} (Copie)`,
        description: pkg.description ?? "",
        client_types: [],
        services: [],
        payment_methods: [],
      });
      setDialogDuplicateOpen(true);
    }
  };

  const handleConfirmDuplicatePackage = async () => {
    if (!duplicatingPackage) return;
    const payload = {
      code: duplicateForm.code.trim(),
      label: duplicateForm.label.trim(),
      description: duplicateForm.description?.trim() || null,
      client_types: duplicateForm.client_types || [],
    };

    if (!payload.code || !payload.label) {
      toast.error("Le code et le libellé sont obligatoires");
      return;
    }

    if (payload.client_types.length === 0) {
      toast.error("Sélectionnez au moins un type de client");
      return;
    }

    if (duplicateForm.services.length === 0) {
      toast.error("Sélectionnez au moins un service");
      return;
    }

    if (duplicateForm.payment_methods.length === 0) {
      toast.error("Sélectionnez au moins un moyen de paiement");
      return;
    }

    if (isSavingPackageRef.current || isSavingPackage) return;
    isSavingPackageRef.current = true;
    setIsSavingPackage(true);

    try {
      const duplicated = await duplicatePackage(duplicatingPackage.id, {
        code: payload.code,
        label: payload.label,
      });
      const newPkgId = duplicated.id;

      await updatePackage(newPkgId, {
        code: payload.code,
        label: payload.label,
        description: payload.description,
        client_types: payload.client_types,
      });
      duplicated.description = payload.description;
      duplicated.client_types = payload.client_types;

      const desiredServiceIds = duplicateForm.services;
      const desiredPMIds = duplicateForm.payment_methods;

      // 1. Assigner les services sélectionnés
      if (desiredServiceIds.length > 0) {
        await addServicesToPackage(newPkgId, desiredServiceIds).catch((err) => {
          console.error("Erreur assignation services duplication:", err);
        });
      }

      // 2. Assigner les moyens de paiement sélectionnés au nouveau package
      if (desiredPMIds.length > 0) {
        await addPaymentMethodsToPackage(newPkgId, desiredPMIds).catch((err) => {
          console.error("Erreur assignation moyens de paiement duplication:", err);
        });
      }

      setPackages((prev) => [...prev, { ...duplicated, status: "inactive" }]);
      toast.success(`Package dupliqué avec succès sous le code: ${duplicated.code}`);
      setDialogDuplicateOpen(false);
      setDuplicatingPackage(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de dupliquer le package");
    } finally {
      isSavingPackageRef.current = false;
      setIsSavingPackage(false);
    }
  };

  // Toggle single service inside viewing package
  const toggleServiceInPackage = async (serviceId: string, enabled: boolean) => {
    if (!viewingPackage) return;
    try {
      if (enabled) {
        await addServiceToPackage(viewingPackage.id, serviceId);
        setPackageServices((prev) => [...prev, serviceId]);
        toast.success("Service activé dans le package");
      } else {
        await removeServicesFromPackage(viewingPackage.id, [serviceId]);
        setPackageServices((prev) => prev.filter((id) => id !== serviceId));
        toast.success("Service désactivé dans le package");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier le service du package");
    }
  };

  // Toggle single payment method inside viewing package
  const togglePackagePaymentMethod = async (paymentMethodId: string, enabled: boolean) => {
    if (!viewingPackage) return;
    try {
      if (enabled) {
        await addPaymentMethodToPackage(viewingPackage.id, paymentMethodId);
        setPackagePaymentMethods((prev) => [...prev, paymentMethodId]);
        toast.success("Moyen de paiement activé dans le package");
      } else {
        await removePaymentMethodFromPackage(viewingPackage.id, paymentMethodId);
        setPackagePaymentMethods((prev) => prev.filter((id) => id !== paymentMethodId));
        toast.success("Moyen de paiement retiré du package");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier le moyen de paiement du package");
    }
  };

  // ===== SERVICE HANDLERS =====
  const openAddService = () => {
    setEditingService(null);
    setServiceForm(emptyServiceForm);
    setDialogServiceOpen(true);
  };

  const openEditService = (srv: ServiceResponse) => {
    setEditingService(srv);
    setServiceForm({
      code: srv.code,
      label: srv.label,
      description: srv.description || "",
      category_id: srv.category_id,
      contractFile: null,
      rawContractYaml: srv.definition ? JSON.stringify(srv.definition, null, 2) : "",
    });
    setDialogServiceOpen(true);
  };

  const openDetailService = (srv: ServiceResponse) => {
    setViewingService(srv);
  };

  const closeDetailService = () => {
    setViewingService(null);
  };

  const saveService = async () => {
    if (!isTechnicalUser()) {
      toast.error("La création ou modification est réservée au profil technique");
      return;
    }
    const validationErrors = validateServiceForm(serviceForm, Boolean(editingService));
    setServiceFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;
    try {
      setIsSavingService(true);
      if (editingService) {
        let fileToUpload = serviceForm.contractFile;
        if (!fileToUpload && serviceForm.rawContractYaml?.trim()) {
          const isJson = serviceForm.rawContractYaml.trim().startsWith("{");
          const ext = isJson ? "json" : "yaml";
          const mime = isJson ? "application/json" : "application/x-yaml";
          fileToUpload = new File(
            [serviceForm.rawContractYaml],
            `contract_${editingService.code || "update"}.${ext}`,
            { type: mime }
          );
        }
        if (!fileToUpload) {
          toast.error("Veuillez sélectionner un fichier ou renseigner la nouvelle définition");
          return;
        }
        const updated = await updateContractUpload(editingService.code || editingService.id, fileToUpload);
        setServices((prev) => prev.map((s) => (s.id === updated.id ? mapContractToService(updated) : s)));
        toast.success("Contrat modifié avec succès");
      } else {
        if (serviceForm.contractFile) {
          const created = await createContractUpload(serviceForm.contractFile);
          setServices((prev) => [...prev, mapContractToService(created)]);
        } else {
          const created = await createService(serviceForm);
          setServices((prev) => [...prev, created]);
        }
        toast.success("Contrat créé avec succès");
      }
      setDialogServiceOpen(false);
      setServiceForm(emptyServiceForm);
      setEditingService(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer le contrat");
    } finally {
      setIsSavingService(false);
    }
  };

  const handleToggleServiceStatus = async (srv: ServiceResponse) => {
    if (!isTechnicalUser() && !srv.is_contract) {
      toast.error("La modification du statut n'est pas autorisée");
      return;
    }
    try {
      const activate = srv.status !== "active";
      const identifier = srv.id || srv.service_type;
      const updated = await toggleServiceStatus(identifier, activate);
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast.success(`Contrat ${activate ? "activé" : "désactivé"} avec succès`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier le statut du contrat");
    }
  };

  const handleDeleteService = async (srvOrId: string | ServiceResponse) => {
    if (!isTechnicalUser()) {
      toast.error("La suppression n'est pas autorisée pour ce profil");
      return;
    }
    const identifier = typeof srvOrId === "object" ? (srvOrId.id || srvOrId.service_type) : srvOrId;
    try {
      await deleteService(identifier);
      setServices((prev) => prev.filter((s) => s.id !== identifier && s.service_type !== identifier));
      toast.success("Contrat supprimé avec succès");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer le contrat");
    }
  };

  return {
    // Data
    packages,
    services,
    catalogServices,
    packageCatalogServices: catalogServices.length > 0 ? catalogServices : services,
    paymentMethods,
    isLoading,
    loadData,

    // Package modals & forms
    dialogPackageOpen,
    setDialogPackageOpen,
    detailPackageOpen,
    setDetailPackageOpen,
    packageForm,
    setPackageForm,
    editingPackage,
    viewingPackage,
    isSavingPackage,
    packageServices,
    packagePaymentMethods,

    // Package actions
    openAddPackage,
    openEditPackage,
    openDetailPackage,
    savePackage,
    handleDeletePackage,
    isDeletingPackage,
    packageToDelete,
    setPackageToDelete,
    packageToArchive,
    setPackageToArchive,
    handleArchivePackage,
    isArchivingPackage,
    packageToToggleStatus,
    setPackageToToggleStatus,
    packageToggleConfirmation,
    setPackageToggleConfirmation,
    handleTogglePackageStatus,

    // Package Form Selection Handlers
    handleToggleService,
    handleToggleAllServices,
    handleTogglePaymentMethod,
    handleToggleAllPaymentMethods,

    // Duplicate
    dialogDuplicateOpen,
    setDialogDuplicateOpen,
    duplicatingPackage,
    duplicateForm,
    setDuplicateForm,
    openDuplicatePackage,
    handleConfirmDuplicatePackage,

    // In-package toggles
    toggleServiceInPackage,
    togglePackagePaymentMethod,
    isLoadingDetailFlows,

    // Service modals & actions
    dialogServiceOpen,
    setDialogServiceOpen,
    serviceForm,
    setServiceForm,
    serviceFormErrors,
    clearServiceFormError,
    editingService,
    viewingService,
    setViewingService,
    isSavingService,
    openAddService,
    openEditService,
    openDetailService,
    closeDetailService,
    saveService,
    handleToggleServiceStatus,
    handleDeleteService,
  };
};

export type UsePackagesReturn = ReturnType<typeof usePackages>;
