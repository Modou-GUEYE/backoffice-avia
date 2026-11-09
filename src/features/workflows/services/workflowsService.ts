import httpClient from "@/core/network/httpClient";
import { getErrorMessage } from "@/core/network/errorUtils";
import {
  WorkflowResponse,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  DuplicateWorkflowRequest,
  WorkflowStepResponse,
  CreateWorkflowStepRequest,
  UpdateWorkflowStepRequest,
  PatchWorkflowStepRequest,
  WorkflowMappingContextResponse,
  PreviewWorkflowMappingContextRequest,
  AssignWorkflowPaymentFlowRequest,
  AvailableServiceListResponse,
  AvailableServiceResponse,
  PaymentMethodDirection,
  WorkflowInstancePaymentMethodItem,
  IntegrationItem,
  IntegrationOperationItem,
} from "../models/workflowsTypes";

// ==========================================
// WORKFLOWS
// ==========================================

export const fetchWorkflows = async (
  serviceVersionId?: string,
  structureId?: string
): Promise<WorkflowResponse[]> => {
  try {
    const params = new URLSearchParams();
    if (serviceVersionId) params.append("service_version_id", serviceVersionId);
    if (structureId) params.append("structure_id", structureId);

    const queryString = params.toString();
    const url = `/api/v1/packages-services/workflows${queryString ? `?${queryString}` : ""}`;
    const { data } = await httpClient.get<WorkflowResponse[]>(url);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les workflows"));
  }
};

export const fetchWorkflowDetails = async (
  workflowId: string,
  structureId?: string
): Promise<WorkflowResponse> => {
  try {
    const url = structureId
      ? `/api/v1/packages-services/workflows/${workflowId}?structure_id=${encodeURIComponent(structureId)}`
      : `/api/v1/packages-services/workflows/${workflowId}`;
    const { data } = await httpClient.get<WorkflowResponse>(url);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les détails du workflow"));
  }
};

export const createWorkflow = async (payload: CreateWorkflowRequest): Promise<WorkflowResponse> => {
  try {
    const structId = payload.structure_id?.trim() || null;
    const body: CreateWorkflowRequest = {
      name: payload.name.trim(),
      service_version_id: payload.service_version_id.trim(),
      definition_kind: payload.definition_kind || "WORKFLOW",
      workflow_type: payload.workflow_type?.trim() || "STANDARD",
    };
    if (structId) {
      body.structure_id = structId;
    }
    const url = structId
      ? `/api/v1/packages-services/workflows?structure_id=${encodeURIComponent(structId)}`
      : "/api/v1/packages-services/workflows";
    const { data } = await httpClient.post<WorkflowResponse>(url, body);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer le workflow"));
  }
};

export const updateWorkflow = async (
  workflowId: string,
  payload: UpdateWorkflowRequest,
  structureId?: string
): Promise<WorkflowResponse> => {
  try {
    const structId = structureId?.trim() || undefined;
    const url = structId
      ? `/api/v1/packages-services/workflows/${workflowId}?structure_id=${encodeURIComponent(structId)}`
      : `/api/v1/packages-services/workflows/${workflowId}`;
    const body: UpdateWorkflowRequest = {
      name: payload.name.trim(),
    };
    if (payload.workflow_type !== undefined) {
      body.workflow_type = payload.workflow_type ? payload.workflow_type.trim() : null;
    }
    const { data } = await httpClient.put<WorkflowResponse>(url, body);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier le workflow"));
  }
};

export const deleteWorkflow = async (workflowId: string, structureId?: string): Promise<void> => {
  try {
    const url = structureId
      ? `/api/v1/packages-services/workflows/${workflowId}?structure_id=${encodeURIComponent(structureId)}`
      : `/api/v1/packages-services/workflows/${workflowId}`;
    await httpClient.delete(url);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer le workflow"));
  }
};

export const activateWorkflow = async (
  workflowId: string,
  structureId?: string
): Promise<WorkflowResponse> => {
  try {
    const url = structureId
      ? `/api/v1/packages-services/workflows/${workflowId}/activate?structure_id=${encodeURIComponent(structureId)}`
      : `/api/v1/packages-services/workflows/${workflowId}/activate`;
    const { data } = await httpClient.post<WorkflowResponse>(url);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'activer le workflow"));
  }
};

export const deactivateWorkflow = async (
  workflowId: string,
  structureId?: string
): Promise<WorkflowResponse> => {
  try {
    const url = structureId
      ? `/api/v1/packages-services/workflows/${workflowId}/deactivate?structure_id=${encodeURIComponent(structureId)}`
      : `/api/v1/packages-services/workflows/${workflowId}/deactivate`;
    const { data } = await httpClient.post<WorkflowResponse>(url);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de désactiver le workflow"));
  }
};

export const setDefaultWorkflow = async (
  workflowId: string,
  structureId?: string
): Promise<WorkflowResponse> => {
  try {
    const url = structureId
      ? `/api/v1/packages-services/workflows/${workflowId}/set-default?structure_id=${encodeURIComponent(structureId)}`
      : `/api/v1/packages-services/workflows/${workflowId}/set-default`;
    const { data } = await httpClient.post<WorkflowResponse>(url);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de définir comme workflow par défaut"));
  }
};

export const duplicateWorkflow = async (
  sourceWorkflowId: string,
  payload: DuplicateWorkflowRequest,
  sourceStructureId?: string
): Promise<WorkflowResponse> => {
  try {
    const url = sourceStructureId
      ? `/api/v1/packages-services/workflows/${sourceWorkflowId}/duplicate?structure_id=${encodeURIComponent(sourceStructureId)}`
      : `/api/v1/packages-services/workflows/${sourceWorkflowId}/duplicate`;
    const { data } = await httpClient.post<WorkflowResponse>(url, payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de dupliquer le workflow"));
  }
};

// ==========================================
// WORKFLOW STEPS
// ==========================================

export const fetchWorkflowSteps = async (
  workflowId: string,
  responsibility: "MOBILE" | "SYSTEM" | "ALL" = "ALL",
  structureId?: string
): Promise<WorkflowStepResponse[]> => {
  try {
    const params = new URLSearchParams();
    params.append("responsibility", responsibility);
    if (structureId) params.append("structure_id", structureId);

    const url = `/api/v1/packages-services/workflows/${workflowId}/steps?${params.toString()}`;
    const { data } = await httpClient.get<WorkflowStepResponse[]>(url);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les étapes du workflow"));
  }
};

export const createWorkflowStep = async (
  workflowId: string,
  payload: CreateWorkflowStepRequest,
  structureId?: string
): Promise<WorkflowStepResponse> => {
  try {
    const url = structureId
      ? `/api/v1/packages-services/workflows/${workflowId}/steps?structure_id=${encodeURIComponent(structureId)}`
      : `/api/v1/packages-services/workflows/${workflowId}/steps`;
    const { data } = await httpClient.post<WorkflowStepResponse>(url, payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer l'étape"));
  }
};

export const updateWorkflowStep = async (
  workflowId: string,
  stepId: string,
  payload: UpdateWorkflowStepRequest,
  structureId?: string
): Promise<WorkflowStepResponse> => {
  try {
    const url = structureId
      ? `/api/v1/packages-services/workflows/${workflowId}/steps/${stepId}?structure_id=${encodeURIComponent(structureId)}`
      : `/api/v1/packages-services/workflows/${workflowId}/steps/${stepId}`;
    const { data } = await httpClient.put<WorkflowStepResponse>(url, payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier l'étape"));
  }
};

export const patchWorkflowStep = async (
  workflowId: string,
  stepId: string,
  payload: PatchWorkflowStepRequest,
  structureId?: string
): Promise<WorkflowStepResponse> => {
  try {
    const url = structureId
      ? `/api/v1/packages-services/workflows/${workflowId}/steps/${stepId}?structure_id=${encodeURIComponent(structureId)}`
      : `/api/v1/packages-services/workflows/${workflowId}/steps/${stepId}`;
    const { data } = await httpClient.patch<WorkflowStepResponse>(url, payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier l'étape"));
  }
};

export const deleteWorkflowStep = async (
  workflowId: string,
  stepId: string,
  structureId?: string
): Promise<void> => {
  try {
    const url = structureId
      ? `/api/v1/packages-services/workflows/${workflowId}/steps/${stepId}?structure_id=${encodeURIComponent(structureId)}`
      : `/api/v1/packages-services/workflows/${workflowId}/steps/${stepId}`;
    await httpClient.delete(url);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer l'étape"));
  }
};

export const reorderWorkflowSteps = async (
  workflowId: string,
  orderedIds: string[],
  structureId?: string
): Promise<WorkflowStepResponse[]> => {
  try {
    const url = structureId
      ? `/api/v1/packages-services/workflows/${workflowId}/steps/reorder?structure_id=${encodeURIComponent(structureId)}`
      : `/api/v1/packages-services/workflows/${workflowId}/steps/reorder`;
    const { data } = await httpClient.put<WorkflowStepResponse[]>(url, { ordered_ids: orderedIds });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de réordonner les étapes"));
  }
};

// ==========================================
// WORKFLOW PAYMENT FLOW
// ==========================================

export const assignWorkflowPaymentFlow = async (
  workflowId: string,
  servicePaymentFlowId: string,
  structureId?: string
): Promise<WorkflowResponse> => {
  try {
    const payload: AssignWorkflowPaymentFlowRequest = { service_payment_flow_id: servicePaymentFlowId };
    const url = structureId
      ? `/api/v1/packages-services/workflows/${workflowId}/payment-flow?structure_id=${encodeURIComponent(structureId)}`
      : `/api/v1/packages-services/workflows/${workflowId}/payment-flow`;
    const { data } = await httpClient.put<WorkflowResponse>(url, payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'assigner le flux de paiement au workflow"));
  }
};

export const unassignWorkflowPaymentFlow = async (
  workflowId: string,
  structureId?: string
): Promise<WorkflowResponse> => {
  try {
    const url = structureId
      ? `/api/v1/packages-services/workflows/${workflowId}/payment-flow?structure_id=${encodeURIComponent(structureId)}`
      : `/api/v1/packages-services/workflows/${workflowId}/payment-flow`;
    const { data } = await httpClient.delete<WorkflowResponse>(url);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de dissocier le flux de paiement du workflow"));
  }
};

// ==========================================
// MAPPING CONTEXT
// ==========================================

export const fetchStepMappingContext = async (
  workflowId: string,
  stepId: string,
  structureId?: string
): Promise<WorkflowMappingContextResponse> => {
  try {
    const url = structureId
      ? `/api/v1/packages-services/workflows/${workflowId}/steps/${stepId}/mapping-context?structure_id=${encodeURIComponent(structureId)}`
      : `/api/v1/packages-services/workflows/${workflowId}/steps/${stepId}/mapping-context`;
    const { data } = await httpClient.get<WorkflowMappingContextResponse>(url);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger le contexte de mapping de l'étape"));
  }
};

export const previewStepMappingContext = async (
  workflowId: string,
  payload: PreviewWorkflowMappingContextRequest,
  structureId?: string
): Promise<WorkflowMappingContextResponse> => {
  try {
    const url = structureId
      ? `/api/v1/packages-services/workflows/${workflowId}/steps/mapping-context/preview?structure_id=${encodeURIComponent(structureId)}`
      : `/api/v1/packages-services/workflows/${workflowId}/steps/mapping-context/preview`;
    const { data } = await httpClient.post<WorkflowMappingContextResponse>(url, payload);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de prévisualiser le contexte de mapping de l'étape"));
  }
};

// ==========================================
// STRUCTURE AVAILABLE SERVICES
// ==========================================

export const fetchStructureAvailableServices = async (
  structureId: string,
  page = 1,
  pageSize = 20
): Promise<AvailableServiceListResponse> => {
  try {
    const url = `/api/v1/packages-services/structures/${structureId}/available-services?page=${page}&page_size=${pageSize}`;
    const { data } = await httpClient.get<AvailableServiceListResponse | AvailableServiceResponse[]>(url);
    if (Array.isArray(data)) {
      return {
        items: data,
        page,
        page_size: pageSize,
        total: data.length,
        total_pages: Math.ceil(data.length / pageSize) || 1,
      };
    }
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les services disponibles de la structure"));
  }
};

// ==========================================
// WORKFLOW INSTANCES PAYMENT METHODS
// ==========================================

export const fetchInstancePaymentMethods = async (
  instanceId: string,
  direction: PaymentMethodDirection
): Promise<WorkflowInstancePaymentMethodItem[]> => {
  try {
    const url = `/api/v1/packages-services/workflow-instances/${instanceId}/payment-methods?direction=${direction}`;
    const { data } = await httpClient.get<WorkflowInstancePaymentMethodItem[]>(url);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les moyens de paiement de l'instance"));
  }
};

// ==========================================
// INTEGRATIONS & OPERATIONS
// ==========================================

export * from "./integrationsService";


