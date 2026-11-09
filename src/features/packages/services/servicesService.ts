import httpClient from "@/core/network/httpClient";
import {
  ServiceResponse,
  ServicePaymentFlowResponse,
  ServiceListResponse,
  CreateServicePaymentFlowRequest,
  UpdateServicePaymentFlowRequest,
  ServiceVersionResponse,
} from "../models/types";
import { getErrorMessage } from "@/core/network/errorUtils";
import { useAuthStore } from "@/core/security/authStore";
import {
  fetchContracts,
  fetchContract,
  toggleContractActivation,
  createContractRaw,
  deleteContract,
} from "./contractsService";
import { ContractDefinitionResponse } from "../models/contractsTypes";
import { PartnerResponse } from "@/features/partenaires/models/types";

export * from "./contractsService";

// Erreur HTTP 404 (axios : `response.status`, sinon `status`)
const isNotFoundError = (error: unknown): boolean => {
  const err = error as { response?: { status?: number }; status?: number } | null | undefined;
  return err?.response?.status === 404 || err?.status === 404;
};

export const isTechnicalUser = (): boolean => {
  const user = useAuthStore.getState().user;
  if (!user) return false;
  if (
    user.role === "Profil Technique" ||
    user.role?.toLowerCase().includes("technique")
  ) {
    return true;
  }
  const permissions = user.permissions || [];
  return permissions.some(
    (p) =>
      p === "profile.bo-profil-technique" ||
      p === "profile.bo.profil-technique" ||
      p.toLowerCase().includes("profil-technique") ||
      p.toLowerCase().includes("technique") ||
      p.toLowerCase().includes("contract")
  );
};

export const mapContractToService = (contract: ContractDefinitionResponse): ServiceResponse => {
  return {
    id: contract.id,
    code: contract.code || contract.service_type,
    label: contract.label || contract.service_type,
    description: contract.description,
    category_id: null,
    status: contract.is_active ? "active" : "inactive",
    version: contract.version,
    source_format: contract.source_format,
    definition: contract.definition as Record<string, unknown>,
    is_contract: true,
    service_type: contract.service_type,
    version_id: contract.version_id,
    aggregate_version: contract.aggregate_version,
    is_active: contract.is_active,
    created_at: contract.created_at,
    updated_at: contract.updated_at,
  };
};

const mapStatus = (status: string): "active" | "inactive" => {
  const s = status.toLowerCase();
  return s === "active" ? "active" : "inactive";
};

export const fetchCatalogServices = async (): Promise<ServiceResponse[]> => {
  try {
    const { data } = await httpClient.get<ServiceListResponse>(
      "/api/v1/packages-services/services?page=1&page_size=100"
    );
    return data.items.map((item) => ({ ...item, status: mapStatus(item.status) }));
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les services du catalogue"));
  }
};

export const fetchServices = async (isTechnical?: boolean): Promise<ServiceResponse[]> => {
  try {
    const isTech = isTechnical !== undefined ? isTechnical : isTechnicalUser();
    if (isTech) {
      const contracts = await fetchContracts(false);
      return contracts.map(mapContractToService);
    }
    return await fetchCatalogServices();
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les services"));
  }
};

export const fetchServiceDetail = async (
  identifier: string,
  isTechnical?: boolean
): Promise<ServiceResponse> => {
  try {
    const isTech = isTechnical !== undefined ? isTechnical : isTechnicalUser();
    if (isTech) {
      const contract = await fetchContract(identifier);
      return mapContractToService(contract);
    }
    const { data } = await httpClient.get<ServiceResponse>(
      `/api/v1/packages-services/services/${encodeURIComponent(identifier)}`
    );
    return { ...data, status: mapStatus(data.status) };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les détails du service"));
  }
};

export const toggleServiceStatus = async (
  identifier: string,
  activate: boolean,
  isTechnical?: boolean
): Promise<ServiceResponse> => {
  try {
    const isTech = isTechnical !== undefined ? isTechnical : isTechnicalUser();
    if (isTech) {
      const updated = await toggleContractActivation(identifier, activate);
      return mapContractToService(updated);
    }
    const endpoint = activate
      ? `/api/v1/packages-services/services/${encodeURIComponent(identifier)}/activate`
      : `/api/v1/packages-services/services/${encodeURIComponent(identifier)}/deactivate`;
    const { data } = await httpClient.post<ServiceResponse>(endpoint);
    return { ...data, status: mapStatus(data.status) };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier le statut du service"));
  }
};

export const createService = async (
  payload: {
    code: string;
    label: string;
    description: string | null;
    category_id?: string | null;
    rawContractYaml?: string;
  },
  isTechnical?: boolean
): Promise<ServiceResponse> => {
  try {
    const isTech = isTechnical !== undefined ? isTechnical : isTechnicalUser();
    if (isTech) {
      if (payload.rawContractYaml) {
        const created = await createContractRaw(payload.rawContractYaml, "yaml");
        return mapContractToService(created);
      }
      const serviceTypeCode = payload.code.toUpperCase().replace(/\s+/g, "_");
      const defaultYaml = `code: "${payload.code}"\nservice_type: "${serviceTypeCode}"\nversion: "1.0"\nlabel: "${payload.label}"\ndescription: "${payload.description || ""}"\nexecution_steps:\n  - step: "PROCESS"\n    amount: "amount"\n`;
      const created = await createContractRaw(defaultYaml, "yaml");
      return mapContractToService(created);
    }

    const backendPayload = {
      code: payload.code,
      label: payload.label,
      description: payload.description || null,
      category_id: payload.category_id || null,
    };
    const { data } = await httpClient.post<ServiceResponse>("/api/v1/packages-services/services", backendPayload);
    return { ...data, status: mapStatus(data.status) };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer le service"));
  }
};

export const updateService = async (
  serviceId: string,
  payload: {
    code?: string;
    label?: string;
    description?: string | null;
    category_id?: string | null;
  },
  isTechnical?: boolean
): Promise<ServiceResponse> => {
  try {
    const isTech = isTechnical !== undefined ? isTechnical : isTechnicalUser();
    if (isTech) {
      throw new Error("La modification directe de ce service contrat n'est pas supportée");
    }
    const { data } = await httpClient.patch<ServiceResponse>(
      `/api/v1/packages-services/services/${encodeURIComponent(serviceId)}`,
      payload
    );
    return { ...data, status: mapStatus(data.status) };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier le service"));
  }
};

export const deleteService = async (identifier: string, isTechnical?: boolean): Promise<void> => {
  try {
    const isTech = isTechnical !== undefined ? isTechnical : isTechnicalUser();
    if (isTech) {
      await deleteContract(identifier);
      return;
    }
    await httpClient.delete(`/api/v1/packages-services/services/${encodeURIComponent(identifier)}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer le service"));
  }
};

export const fetchServicePaymentFlow = async (
  serviceId: string,
  _flowId?: string
): Promise<ServicePaymentFlowResponse | null> => {
  try {
    const { data } = await httpClient.get<ServicePaymentFlowResponse>(
      `/api/v1/packages-services/services/${serviceId}/payment-flow`
    );
    return data;
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw new Error(getErrorMessage(error, "Impossible de charger le flux de paiement"));
  }
};

export const fetchServicePaymentFlows = async (serviceId: string): Promise<ServicePaymentFlowResponse[]> => {
  try {
    const flow = await fetchServicePaymentFlow(serviceId);
    return flow ? [flow] : [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les flux de paiement du service"));
  }
};

export const createServicePaymentFlow = async (
  serviceId: string,
  payload: CreateServicePaymentFlowRequest | {
    source_payment_method_id?: string | null;
    destination_payment_method_id?: string | null;
    source_payment_method_ids?: string[];
    destination_payment_method_ids?: string[];
    constraints?: Record<string, unknown> | null;
  }
): Promise<ServicePaymentFlowResponse> => {
  try {
    const p = payload as {
      source_payment_method_ids?: string[];
      destination_payment_method_ids?: string[];
      source_payment_method_id?: string | null;
      destination_payment_method_id?: string | null;
      constraints?: Record<string, unknown> | null;
    };
    const formattedPayload: CreateServicePaymentFlowRequest = {
      source_payment_method_ids:
        p.source_payment_method_ids && p.source_payment_method_ids.length > 0
          ? p.source_payment_method_ids
          : p.source_payment_method_id
          ? [p.source_payment_method_id]
          : [],
      destination_payment_method_ids:
        p.destination_payment_method_ids && p.destination_payment_method_ids.length > 0
          ? p.destination_payment_method_ids
          : p.destination_payment_method_id
          ? [p.destination_payment_method_id]
          : [],
      constraints: p.constraints ?? null,
    };
    const { data } = await httpClient.post<ServicePaymentFlowResponse>(
      `/api/v1/packages-services/services/${serviceId}/payment-flow`,
      formattedPayload
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer le flux de paiement du service"));
  }
};

export const updateServicePaymentFlow = async (
  serviceId: string,
  payloadOrFlowId: string | UpdateServicePaymentFlowRequest | {
    source_payment_method_id?: string | null;
    destination_payment_method_id?: string | null;
    source_payment_method_ids?: string[];
    destination_payment_method_ids?: string[];
    constraints?: Record<string, unknown> | null;
  },
  maybePayload?: UpdateServicePaymentFlowRequest | {
    source_payment_method_id?: string | null;
    destination_payment_method_id?: string | null;
    source_payment_method_ids?: string[];
    destination_payment_method_ids?: string[];
    constraints?: Record<string, unknown> | null;
  }
): Promise<ServicePaymentFlowResponse> => {
  try {
    const rawPayload = (typeof payloadOrFlowId === "string" ? maybePayload! : payloadOrFlowId) as {
      source_payment_method_ids?: string[];
      destination_payment_method_ids?: string[];
      source_payment_method_id?: string | null;
      destination_payment_method_id?: string | null;
      constraints?: Record<string, unknown> | null;
    };
    const formattedPayload: UpdateServicePaymentFlowRequest = {
      source_payment_method_ids:
        rawPayload.source_payment_method_ids && rawPayload.source_payment_method_ids.length > 0
          ? rawPayload.source_payment_method_ids
          : rawPayload.source_payment_method_id
          ? [rawPayload.source_payment_method_id]
          : [],
      destination_payment_method_ids:
        rawPayload.destination_payment_method_ids && rawPayload.destination_payment_method_ids.length > 0
          ? rawPayload.destination_payment_method_ids
          : rawPayload.destination_payment_method_id
          ? [rawPayload.destination_payment_method_id]
          : [],
      constraints: rawPayload.constraints ?? null,
    };
    const { data } = await httpClient.put<ServicePaymentFlowResponse>(
      `/api/v1/packages-services/services/${serviceId}/payment-flow`,
      formattedPayload
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier le flux de paiement du service"));
  }
};

export const deleteServicePaymentFlow = async (
  serviceId: string,
  _flowId?: string
): Promise<void> => {
  try {
    await httpClient.delete(`/api/v1/packages-services/services/${serviceId}/payment-flow`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer le flux de paiement du service"));
  }
};

export const enableServicePaymentFlow = async (
  serviceId: string,
  _flowId?: string
): Promise<ServicePaymentFlowResponse> => {
  try {
    const { data } = await httpClient.post<ServicePaymentFlowResponse>(
      `/api/v1/packages-services/services/${serviceId}/payment-flow/enable`
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'activer le flux de paiement"));
  }
};

export const disableServicePaymentFlow = async (
  serviceId: string,
  _flowId?: string
): Promise<ServicePaymentFlowResponse> => {
  try {
    const { data } = await httpClient.post<ServicePaymentFlowResponse>(
      `/api/v1/packages-services/services/${serviceId}/payment-flow/disable`
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de désactiver le flux de paiement"));
  }
};

// ==========================================
// STRUCTURE PAYMENT FLOWS (Surcharge par Structure)
// ==========================================

export const fetchStructureServicePaymentFlow = async (
  structureId: string,
  serviceId: string
): Promise<ServicePaymentFlowResponse | null> => {
  try {
    const { data } = await httpClient.get<ServicePaymentFlowResponse>(
      `/api/v1/packages-services/structures/${structureId}/services/${serviceId}/payment-flow`
    );
    if (!data) return null;
    return {
      ...data,
      source_payment_method_ids:
        data.source_payment_method_ids && data.source_payment_method_ids.length > 0
          ? data.source_payment_method_ids
          : data.source_payment_method_id
          ? [data.source_payment_method_id]
          : [],
      destination_payment_method_ids:
        data.destination_payment_method_ids && data.destination_payment_method_ids.length > 0
          ? data.destination_payment_method_ids
          : data.destination_payment_method_id
          ? [data.destination_payment_method_id]
          : [],
    };
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw new Error(getErrorMessage(error, "Impossible de charger le flux de paiement pour cette structure"));
  }
};

export const createStructureServicePaymentFlow = async (
  structureId: string,
  serviceId: string,
  payload: CreateServicePaymentFlowRequest | {
    source_payment_method_id?: string | null;
    destination_payment_method_id?: string | null;
    source_payment_method_ids?: string[];
    destination_payment_method_ids?: string[];
    constraints?: Record<string, unknown> | null;
  }
): Promise<ServicePaymentFlowResponse> => {
  try {
    const rawPayload = payload as {
      source_payment_method_id?: string | null;
      destination_payment_method_id?: string | null;
      source_payment_method_ids?: string[];
      destination_payment_method_ids?: string[];
      constraints?: Record<string, unknown> | null;
    };
    const formattedPayload: CreateServicePaymentFlowRequest = {
      source_payment_method_ids:
        rawPayload.source_payment_method_ids && rawPayload.source_payment_method_ids.length > 0
          ? rawPayload.source_payment_method_ids
          : rawPayload.source_payment_method_id
          ? [rawPayload.source_payment_method_id]
          : [],
      destination_payment_method_ids:
        rawPayload.destination_payment_method_ids && rawPayload.destination_payment_method_ids.length > 0
          ? rawPayload.destination_payment_method_ids
          : rawPayload.destination_payment_method_id
          ? [rawPayload.destination_payment_method_id]
          : [],
      constraints: rawPayload.constraints ?? null,
    };
    const { data } = await httpClient.post<ServicePaymentFlowResponse>(
      `/api/v1/packages-services/structures/${structureId}/services/${serviceId}/payment-flow`,
      formattedPayload
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer la surcharge du flux de paiement"));
  }
};

export const updateStructureServicePaymentFlow = async (
  structureId: string,
  serviceId: string,
  payload: UpdateServicePaymentFlowRequest | {
    source_payment_method_id?: string | null;
    destination_payment_method_id?: string | null;
    source_payment_method_ids?: string[];
    destination_payment_method_ids?: string[];
    constraints?: Record<string, unknown> | null;
  }
): Promise<ServicePaymentFlowResponse> => {
  try {
    const rawPayload = payload as {
      source_payment_method_id?: string | null;
      destination_payment_method_id?: string | null;
      source_payment_method_ids?: string[];
      destination_payment_method_ids?: string[];
      constraints?: Record<string, unknown> | null;
    };
    const formattedPayload: UpdateServicePaymentFlowRequest = {
      source_payment_method_ids:
        rawPayload.source_payment_method_ids && rawPayload.source_payment_method_ids.length > 0
          ? rawPayload.source_payment_method_ids
          : rawPayload.source_payment_method_id
          ? [rawPayload.source_payment_method_id]
          : [],
      destination_payment_method_ids:
        rawPayload.destination_payment_method_ids && rawPayload.destination_payment_method_ids.length > 0
          ? rawPayload.destination_payment_method_ids
          : rawPayload.destination_payment_method_id
          ? [rawPayload.destination_payment_method_id]
          : [],
      constraints: rawPayload.constraints ?? null,
    };
    const { data } = await httpClient.put<ServicePaymentFlowResponse>(
      `/api/v1/packages-services/structures/${structureId}/services/${serviceId}/payment-flow`,
      formattedPayload
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier la surcharge du flux de paiement"));
  }
};

export const deleteStructureServicePaymentFlow = async (
  structureId: string,
  serviceId: string
): Promise<void> => {
  try {
    await httpClient.delete(
      `/api/v1/packages-services/structures/${structureId}/services/${serviceId}/payment-flow`
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de rétablir l'héritage du flux global"));
  }
};

export const enableStructureServicePaymentFlow = async (
  structureId: string,
  serviceId: string
): Promise<ServicePaymentFlowResponse> => {
  try {
    const { data } = await httpClient.post<ServicePaymentFlowResponse>(
      `/api/v1/packages-services/structures/${structureId}/services/${serviceId}/payment-flow/enable`
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'activer la surcharge"));
  }
};

export const disableStructureServicePaymentFlow = async (
  structureId: string,
  serviceId: string
): Promise<ServicePaymentFlowResponse> => {
  try {
    const { data } = await httpClient.post<ServicePaymentFlowResponse>(
      `/api/v1/packages-services/structures/${structureId}/services/${serviceId}/payment-flow/disable`
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de désactiver la surcharge"));
  }
};

// SERVICE VERSIONS (Réservé au profil technique et aux habilitations requises)

export const fetchServiceVersions = async (serviceId: string): Promise<ServiceVersionResponse[]> => {
  try {
    const { data } = await httpClient.get<
      | ServiceVersionResponse[]
      | {
          items?: ServiceVersionResponse[];
          versions?: ServiceVersionResponse[];
          data?: ServiceVersionResponse[];
        }
      | null
    >(`/api/v1/packages-services/services/${serviceId}/versions`);
    return Array.isArray(data) ? data : data?.items || data?.versions || data?.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les versions du service"));
  }
};

export const createServiceVersion = async (
  serviceId: string,
  payload: { version: string; changelog?: string | null }
): Promise<ServiceVersionResponse> => {
  try {
    const { data } = await httpClient.post<ServiceVersionResponse>(`/api/v1/packages-services/services/${serviceId}/versions`, payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer la version du service"));
  }
};

export const updateServiceVersion = async (
  serviceId: string,
  versionId: string,
  payload: { version: string; changelog?: string | null }
): Promise<ServiceVersionResponse> => {
  try {
    const { data } = await httpClient.put<ServiceVersionResponse>(
      `/api/v1/packages-services/services/${serviceId}/versions/${versionId}`,
      payload
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier la version du service"));
  }
};

export const publishServiceVersion = async (serviceId: string, versionId: string): Promise<ServiceVersionResponse> => {
  try {
    const { data } = await httpClient.post<ServiceVersionResponse>(
      `/api/v1/packages-services/services/${serviceId}/versions/${versionId}/publish`
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de publier la version du service"));
  }
};

export const deprecateServiceVersion = async (serviceId: string, versionId: string): Promise<ServiceVersionResponse> => {
  try {
    const { data } = await httpClient.post<ServiceVersionResponse>(
      `/api/v1/packages-services/services/${serviceId}/versions/${versionId}/deprecate`
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'obsolétiser la version du service"));
  }
};

export const fetchServicePartner = async (serviceId: string): Promise<PartnerResponse | null> => {
  try {
    const { data } = await httpClient.get<PartnerResponse>(
      `/api/v1/packages-services/services/${encodeURIComponent(serviceId)}/partner`
    );
    return data;
  } catch {
    return null;
  }
};
