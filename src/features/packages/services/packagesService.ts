import httpClient from "@/core/network/httpClient";
import axios from "axios";
import {
  PackageResponse,
  PackageForm,
  PackageServiceItemResponse,
  PackagePaymentMethodResponse,
  StructurePackageAssignmentResponse,
} from "../models/types";
import { getErrorMessage } from "@/core/network/errorUtils";

const mapStatus = (status: string): "active" | "inactive" | "archived" => {
  const s = (status || "").toLowerCase();
  if (s === "active") return "active";
  if (s === "archived" || s === "archive" || s === "archivé") return "archived";
  return "inactive";
};

export const fetchPackages = async (): Promise<PackageResponse[]> => {
  try {
    const { data } = await httpClient.get<PackageResponse[]>("/api/v1/packages-services/packages");
    return data.map((item) => ({ ...item, status: mapStatus(item.status) }));
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les packages"));
  }
};

export const fetchPackageById = async (id: string): Promise<PackageResponse> => {
  try {
    const { data } = await httpClient.get<PackageResponse>(`/api/v1/packages-services/packages/${id}`);
    return { ...data, status: mapStatus(data.status) };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger le package"));
  }
};


export const createPackage = async (payload: PackageForm): Promise<PackageResponse> => {
  try {
    const backendPayload = {
      code: payload.code,
      label: payload.label,
      description: payload.description || null,
      client_types: payload.client_types || [],
    };
    const { data } = await httpClient.post<PackageResponse>("/api/v1/packages-services/packages", backendPayload);
    return { ...data, status: mapStatus(data.status) };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer le package"));
  }
};

export const updatePackage = async (id: string, payload: Partial<PackageForm>): Promise<PackageResponse> => {
  try {
    const backendPayload = {
      code: payload.code,
      label: payload.label,
      description: payload.description !== undefined ? payload.description : undefined,
      client_types: payload.client_types !== undefined ? payload.client_types : undefined,
    };
    const { data } = await httpClient.put<PackageResponse>(`/api/v1/packages-services/packages/${id}`, backendPayload);
    return { ...data, status: mapStatus(data.status) };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier le package"));
  }
};

export const deletePackage = async (id: string): Promise<void> => {
  try {
    await httpClient.delete(`/api/v1/packages-services/packages/${id}`);
  } catch (error) {
    const parsedMsg = getErrorMessage(error, "");
    if (parsedMsg.includes("cannot be deleted because it has existing assignments") || parsedMsg.includes("existing assignments")) {
      throw new Error("Ce package ne peut pas être supprimé car il est actuellement affecté à une ou plusieurs structures.");
    }
    throw new Error(getErrorMessage(error, "Impossible de supprimer le package. Il est probablement associé à une structure avec des transactions."));
  }
};

export const activatePackage = async (id: string): Promise<PackageResponse> => {
  try {
    const { data } = await httpClient.post<PackageResponse>(`/api/v1/packages-services/packages/${id}/activate`);
    return { ...data, status: mapStatus(data.status) };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'activer le package"));
  }
};

export const deactivatePackage = async (id: string): Promise<PackageResponse> => {
  try {
    const { data } = await httpClient.post<PackageResponse>(`/api/v1/packages-services/packages/${id}/deactivate`);
    return { ...data, status: mapStatus(data.status) };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de désactiver le package"));
  }
};

export const duplicatePackage = async (
  id: string,
  payload: { code: string; label?: string | null }
): Promise<PackageResponse> => {
  try {
    const { data } = await httpClient.post<PackageResponse>(`/api/v1/packages-services/packages/${id}/duplicate`, payload);
    return { ...data, status: mapStatus(data.status) };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de dupliquer le package"));
  }
};

export const archivePackage = async (id: string): Promise<PackageResponse> => {
  try {
    const { data } = await httpClient.post<PackageResponse>(`/api/v1/packages-services/packages/${id}/archive`);
    return { ...data, status: mapStatus(data.status) };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'archiver le package"));
  }
};

// PACKAGE SERVICES OPERATIONS

export const fetchPackageServices = async (packageId: string): Promise<PackageServiceItemResponse[]> => {
  try {
    const { data } = await httpClient.get<PackageServiceItemResponse[]>(`/api/v1/packages-services/packages/${packageId}/services`);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les services du package"));
  }
};

export const addServicesToPackage = async (
  packageId: string,
  serviceIds: string[]
): Promise<PackageServiceItemResponse | void> => {
  try {
    const { data } = await httpClient.post<PackageServiceItemResponse>(
      `/api/v1/packages-services/packages/${packageId}/services`,
      { service_ids: serviceIds }
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'ajouter les services au package"));
  }
};

export const addServiceToPackage = async (
  packageId: string,
  serviceId: string
): Promise<PackageServiceItemResponse> => {
  try {
    const { data } = await httpClient.post<PackageServiceItemResponse>(
      `/api/v1/packages-services/packages/${packageId}/services`,
      { service_ids: [serviceId] }
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'ajouter le service au package"));
  }
};

export const removeServiceFromPackage = async (
  packageId: string,
  serviceId: string
): Promise<void> => {
  try {
    await httpClient.delete(`/api/v1/packages-services/packages/${packageId}/services`, {
      data: { service_ids: [serviceId] },
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return;
    }
    try {
      await httpClient.delete(`/api/v1/packages-services/packages/${packageId}/services/${serviceId}`);
    } catch {
      throw new Error(getErrorMessage(error, "Impossible de retirer le service du package"));
    }
  }
};

export const removeServicesFromPackage = async (
  packageId: string,
  serviceIds: string[]
): Promise<void> => {
  if (serviceIds.length === 0) return;
  try {
    await httpClient.delete(`/api/v1/packages-services/packages/${packageId}/services`, {
      data: { service_ids: serviceIds },
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return;
    }
    throw new Error(getErrorMessage(error, "Impossible de retirer les services du package"));
  }
};

// ==========================================
// PACKAGE PAYMENT METHODS
// ==========================================

export const fetchPackagePaymentMethods = async (
  packageId: string,
): Promise<PackagePaymentMethodResponse[]> => {
  try {
    const { data } = await httpClient.get<PackagePaymentMethodResponse[]>(
      `/api/v1/packages-services/packages/${packageId}/payment-methods`,
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les moyens de paiement du package"));
  }
};

export const addPaymentMethodsToPackage = async (
  packageId: string,
  paymentMethodIds: string[],
): Promise<PackagePaymentMethodResponse[]> => {
  if (!paymentMethodIds.length) return [];
  try {
    const { data } = await httpClient.post<PackagePaymentMethodResponse[]>(
      `/api/v1/packages-services/packages/${packageId}/payment-methods`,
      { payment_method_ids: paymentMethodIds },
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'ajouter les moyens de paiement au package"));
  }
};

export const addPaymentMethodToPackage = async (
  packageId: string,
  paymentMethodId: string,
): Promise<PackagePaymentMethodResponse[]> => {
  return addPaymentMethodsToPackage(packageId, [paymentMethodId]);
};

export const setPackagePaymentMethodStatus = async (
  packageId: string,
  methodId: string,
  isEnabled: boolean,
): Promise<PackagePaymentMethodResponse> => {
  try {
    const { data } = await httpClient.patch<PackagePaymentMethodResponse>(
      `/api/v1/packages-services/packages/${packageId}/payment-methods/${methodId}`,
      { is_enabled: isEnabled },
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier le statut du moyen de paiement"));
  }
};

export const removePaymentMethodFromPackage = async (
  packageId: string,
  methodId: string,
): Promise<void> => {
  try {
    await httpClient.delete(
      `/api/v1/packages-services/packages/${packageId}/payment-methods/${methodId}`,
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return;
    }
    throw new Error(getErrorMessage(error, "Impossible de retirer le moyen de paiement du package"));
  }
};

export const assignPackageToStructure = async (
  structureId: string,
  packageId: string,
): Promise<StructurePackageAssignmentResponse> => {
  try {
    const { data } = await httpClient.post<StructurePackageAssignmentResponse>(
      `/api/v1/packages-services/structures/${structureId}/package-assignments`,
      { package_id: packageId },
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'assigner le package à la structure"));
  }
};

export const changeStructurePackage = async (
  structureId: string,
  packageId: string,
): Promise<StructurePackageAssignmentResponse> => {
  try {
    const { data } = await httpClient.put<StructurePackageAssignmentResponse>(
      `/api/v1/packages-services/structures/${structureId}/package-assignments/change`,
      { package_id: packageId },
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier le package de la structure"));
  }
};

export const getStructurePackageAssignments = async (
  structureId: string,
): Promise<StructurePackageAssignmentResponse[]> => {
  try {
    const { data } = await httpClient.get<StructurePackageAssignmentResponse[]>(
      `/api/v1/packages-services/structures/${structureId}/package-assignments`,
    );
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return [];
    }
    throw new Error(getErrorMessage(error, "Impossible de charger les assignations de package"));
  }
};

export const fetchStructureActivePackage = async (
  structureId: string,
): Promise<StructurePackageAssignmentResponse | null> => {
  try {
    const assignments = await getStructurePackageAssignments(structureId);
    if (!assignments || assignments.length === 0) return null;
    const sorted = [...assignments].sort(
      (a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
    );
    return sorted[0];
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    return null;
  }
};

export const suspendStructurePackage = async (
  structureId: string,
): Promise<StructurePackageAssignmentResponse> => {
  try {
    const { data } = await httpClient.post<StructurePackageAssignmentResponse>(
      `/api/v1/packages-services/structures/${structureId}/package-assignments/suspend`,
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de suspendre le package de la structure"));
  }
};

export const resumeStructurePackage = async (
  structureId: string,
): Promise<StructurePackageAssignmentResponse> => {
  try {
    const { data } = await httpClient.post<StructurePackageAssignmentResponse>(
      `/api/v1/packages-services/structures/${structureId}/package-assignments/resume`,
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de réactiver le package de la structure"));
  }
};

export const terminateStructurePackage = async (
  structureId: string,
): Promise<StructurePackageAssignmentResponse> => {
  try {
    const { data } = await httpClient.post<StructurePackageAssignmentResponse>(
      `/api/v1/packages-services/structures/${structureId}/package-assignments/terminate`,
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de résilier le package de la structure"));
  }
};
