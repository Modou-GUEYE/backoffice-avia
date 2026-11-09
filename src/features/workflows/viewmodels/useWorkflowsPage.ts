import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useForms } from "./useForms";
import { useWorkflows } from "./useWorkflows";
import { useFieldCatalog } from "./useFieldCatalog";
import { useIntegrations } from "./useIntegrations";
import { fetchServices, fetchServiceVersions } from "@/features/packages/services/servicesService";
import { fetchPaymentMethods } from "@/features/payment-methods/services/paymentMethodsService";
import type { ServiceResponse, ServiceVersionResponse } from "@/features/packages/models/types";
import type { PaymentMethodResponse } from "@/features/payment-methods/models/types";

export interface UseWorkflowsPageOptions {
  initialTab?: "forms" | "workflows" | "fields" | "integrations";
  services?: ServiceResponse[];
  paymentMethods?: PaymentMethodResponse[];
  structureId?: string;
}

export const useWorkflowsPage = (options?: UseWorkflowsPageOptions) => {
  const [activeTab, setActiveTab] = useState<"forms" | "workflows" | "fields" | "integrations">(
    options?.initialTab || "workflows"
  );

  // Synchronize activeTab if initialTab changes
  useEffect(() => {
    if (options?.initialTab) {
      setActiveTab(options.initialTab);
    }
  }, [options?.initialTab]);

  // Services and Payment Methods state
  const [services, setServices] = useState<ServiceResponse[]>(options?.services || []);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodResponse[]>(
    options?.paymentMethods || []
  );
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  // Update services / paymentMethods if passed as props
  useEffect(() => {
    if (options?.services) {
      setServices(options.services);
    }
  }, [options?.services]);

  useEffect(() => {
    if (options?.paymentMethods) {
      setPaymentMethods(options.paymentMethods);
    }
  }, [options?.paymentMethods]);

  // Fetch services and payment methods if not provided
  useEffect(() => {
    if (!options?.services || options.services.length === 0) {
      let isMounted = true;
      const loadData = async () => {
        try {
          setIsLoadingServices(true);
          const [loadedServices, loadedPms] = await Promise.all([
            fetchServices().catch(() => []),
            (!options?.paymentMethods || options.paymentMethods.length === 0)
              ? fetchPaymentMethods().catch(() => [])
              : Promise.resolve(options.paymentMethods),
          ]);
          if (isMounted) {
            setServices(loadedServices);
            if (!options?.paymentMethods || options.paymentMethods.length === 0) {
              setPaymentMethods(loadedPms);
            }
          }
        } finally {
          if (isMounted) setIsLoadingServices(false);
        }
      };
      void loadData();
      return () => {
        isMounted = false;
      };
    }
  }, [options?.services, options?.paymentMethods]);

  // Filtre de la liste : le contrat ne propose que service_version_id (facultatif) ; vide = toutes les versions
  const [selectedWfFilterVersionId, setSelectedWfFilterVersionId] = useState<string>("");
  const [wfFilterVersions, setWfFilterVersions] = useState<ServiceVersionResponse[]>([]);
  const [isLoadingWfFilterVersions, setIsLoadingWfFilterVersions] = useState(false);

  // Workflow modal dropdown selector state
  const [selectedWfServiceId, setSelectedWfServiceId] = useState<string>("");
  const [serviceVersionsForWf, setServiceVersionsForWf] = useState<ServiceVersionResponse[]>([]);
  const [isLoadingWfVersions, setIsLoadingWfVersions] = useState(false);

  // ViewModels
  const formsVm = useForms({ enabled: activeTab === "forms" });

  const workflowsVm = useWorkflows({
    enabled: activeTab === "workflows",
    serviceVersionId: selectedWfFilterVersionId,
    structureId: options?.structureId,
  });

  const fieldCatalogVm = useFieldCatalog({
    enabled: activeTab === "fields" || activeTab === "forms",
  });

  const integrationsVm = useIntegrations({
    enabled: activeTab === "integrations",
  });

  // Versions de tous les services, pour le filtre et pour afficher la version de chaque workflow
  useEffect(() => {
    if (activeTab !== "workflows" || services.length === 0) return;
    let cancelled = false;
    setIsLoadingWfFilterVersions(true);
    Promise.all(services.map((srv) => fetchServiceVersions(srv.id).catch(() => [] as ServiceVersionResponse[])))
      .then((lists) => {
        if (!cancelled) setWfFilterVersions(lists.flat());
      })
      .finally(() => {
        if (!cancelled) setIsLoadingWfFilterVersions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, services]);

  // Service de la version filtrée (pré-remplit le service à la création d'un workflow)
  const selectedWfFilterServiceId =
    wfFilterVersions.find((v) => v.id === selectedWfFilterVersionId)?.service_id ?? "";

  // Workflow dropdown service change
  const handleSelectWfService = async (serviceId: string) => {
    setSelectedWfServiceId(serviceId);
    setServiceVersionsForWf([]);
    workflowsVm.setWorkflowFormData((prev) => ({
      ...prev,
      service_version_id: "",
    }));
    if (!serviceId) return;

    try {
      setIsLoadingWfVersions(true);
      const versions = await fetchServiceVersions(serviceId);
      setServiceVersionsForWf(versions);
      if (versions.length > 0) {
        const published =
          versions.find((v) => v.status?.toUpperCase() === "PUBLISHED") || versions[0];
        workflowsVm.setWorkflowFormData((prev) => ({
          ...prev,
          service_version_id: published.id,
        }));
      }
    } catch {
      toast.error("Impossible de charger les versions de ce service");
    } finally {
      setIsLoadingWfVersions(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    formsVm,
    workflowsVm,
    fieldCatalogVm,
    integrationsVm,
    services,
    paymentMethods,
    isLoadingServices,
    selectedWfFilterServiceId,
    selectedWfFilterVersionId,
    setSelectedWfFilterVersionId,
    wfFilterVersions,
    isLoadingWfFilterVersions,
    selectedWfServiceId,
    setSelectedWfServiceId,
    serviceVersionsForWf,
    isLoadingWfVersions,
    handleSelectWfService,
  };
};
