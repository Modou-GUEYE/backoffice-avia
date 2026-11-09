export interface WorkflowResponse {
  id: string;
  name: string;
  structure_id?: string | null;
  definition_kind?: "WORKFLOW" | "TEMPLATE" | string;
  service_version_id: string;
  service_payment_flow_id?: string | null;
  workflow_type: string;
  status: string;
  is_default: boolean;
}

export interface CreateWorkflowRequest {
  name: string;
  service_version_id: string;
  structure_id?: string | null;
  definition_kind?: "WORKFLOW" | "TEMPLATE" | string;
  workflow_type?: string;
}

export interface DuplicateWorkflowRequest {
  name: string;
  structure_id?: string | null;
  service_version_id: string;
}

export interface AvailableServiceResponse {
  id: string;
  code: string;
  supports_workflows: boolean;
  workflow_id?: string | null;
}

export interface AvailableServiceListResponse {
  items: AvailableServiceResponse[];
  page: number;
  page_size: number;
  total: number;
  total_pages?: number;
}

export type PaymentMethodDirection = "SOURCE" | "DESTINATION";

export interface WorkflowInstancePaymentMethodItem {
  id: string;
  name?: string;
  code?: string;
  description?: string;
  [key: string]: unknown;
}

export interface UpdateWorkflowRequest {
  name: string;
  workflow_type?: string | null;
}

export interface AssignWorkflowPaymentFlowRequest {
  service_payment_flow_id: string;
}

export type StepType = "FORM" | "CONFIRMATION" | "INFO" | "API" | string;
export type StepResponsibility = "MOBILE" | "SYSTEM" | string;
export type StepExecutionMode = "INLINE" | "ASYNC" | string;
export type AuthorizationMode = "NONE" | "FORWARD_BEARER" | string;
export type CompletionMode = "IMMEDIATE" | "POLLING" | "EVENT" | string;

export interface WorkflowStepResponse {
  id: string;
  workflow_id: string;
  step_order: number;
  step_key: string;
  step_type: StepType;
  responsibility: StepResponsibility;
  execution_mode?: StepExecutionMode | null;
  integration_operation_id?: string | null;
  title: string;
  config?: Record<string, unknown> | null;
  condition?: Record<string, unknown> | null;
  next_step_rules?: Record<string, unknown> | null;
}

export interface CreateWorkflowStepRequest {
  step_order: number;
  step_key: string;
  step_type: StepType;
  responsibility?: StepResponsibility;
  execution_mode?: StepExecutionMode | null;
  integration_operation_id?: string | null;
  title: string;
  config?: Record<string, unknown> | null;
  condition?: Record<string, unknown> | null;
  next_step_rules?: Record<string, unknown> | null;
}

export interface UpdateWorkflowStepRequest {
  step_key?: string | null;
  step_type?: StepType | null;
  responsibility?: StepResponsibility | null;
  execution_mode?: StepExecutionMode | null;
  integration_operation_id?: string | null;
  title?: string | null;
  config?: Record<string, unknown> | null;
  condition?: Record<string, unknown> | null;
  next_step_rules?: Record<string, unknown> | null;
}

export interface PatchWorkflowStepRequest {
  step_key?: string | null;
  step_type?: StepType | null;
  responsibility?: StepResponsibility | null;
  execution_mode?: StepExecutionMode | null;
  integration_operation_id?: string | null;
  title?: string | null;
  config?: Record<string, unknown> | null;
  condition?: Record<string, unknown> | null;
  next_step_rules?: Record<string, unknown> | null;
}

export interface ReorderStepsRequest {
  ordered_ids: string[];
}

// ==========================================
// FORM STEP CONFIGURATION
// ==========================================

export const RUNTIME_OUTPUT_VALUE_TYPES = ["string", "number", "integer", "boolean", "uuid", "object", "array"] as const;
export type RuntimeOutputValueType = (typeof RUNTIME_OUTPUT_VALUE_TYPES)[number];

/**
 * Clés de valeurs techniques connues du backend, avec le type attendu.
 * Liste fournie par l'équipe backend, en attendant qu'elle soit exposée par l'API.
 */
export const KNOWN_RUNTIME_OUTPUT_KEYS: { key: string; value_type: RuntimeOutputValueType }[] = [
  { key: "initiator_account_id", value_type: "string" },
  { key: "target_account_id", value_type: "string" },
  { key: "biller_account_id", value_type: "string" },
  { key: "wallet_account_id", value_type: "string" },
  { key: "bank_account_id", value_type: "string" },
];

/** Valeur technique non affichée, fournie par le mobile à la soumission d'une étape FORM. */
export interface RuntimeOutput {
  key: string;
  value_type: RuntimeOutputValueType;
  required: boolean;
}

export interface FormStepConfig {
  form_id: string;
  runtime_outputs?: RuntimeOutput[];
}

// ==========================================
// INFO STEP CONFIGURATION
// ==========================================

export interface InfoDisplayField {
  label: string;
  from: string;
  format?: string;
  currency?: string;
}

export interface InfoStepConfig {
  message?: string;
  display_fields?: InfoDisplayField[];
  summary_fields?: InfoDisplayField[];
}

// ==========================================
// CONFIRMATION STEP CONFIGURATION
// ==========================================

export interface ConfirmationSummaryField {
  label: string;
  from: string;
  format?: string;
  currency?: string;
}

export interface ConfirmationStepConfig {
  message?: string;
  summary_fields?: ConfirmationSummaryField[];
}

// ==========================================
// MAPPING CONTEXT
// ==========================================

export interface WorkflowMappingSource {
  path: string;
  label: string;
  value_type: string;
  format?: string | null;
  nullable: boolean;
  renderer_type?: string | null;
  step_key?: string | null;
  allowed_formats?: string[];
}

export interface WorkflowMappingTarget {
  key: string;
  label: string;
  value_type: string;
  format?: string | null;
  required: boolean;
  nullable: boolean;
}

export interface PreviewWorkflowMappingContextRequest {
  step_order: number;
  step_type: StepType;
  integration_operation_id?: string | null;
}

export interface WorkflowMappingContextResponse {
  workflow_id: string;
  step_id?: string | null;
  sources: WorkflowMappingSource[];
  targets: WorkflowMappingTarget[];
}

export type PreviewWorkflowMappingContextResponse = WorkflowMappingContextResponse;

// ==========================================
// INTEGRATIONS & OPERATIONS
// ==========================================

export interface IntegrationItem {
  id: string;
  key: string;
  label: string;
  base_url: string;
  active: boolean;
}

export interface CreateIntegrationRequest {
  key: string;
  label: string;
  base_url: string;
  active?: boolean;
}

export interface PatchIntegrationRequest {
  label?: string | null;
  base_url?: string | null;
  active?: boolean | null;
}

export interface IntegrationOperationItem {
  id: string;
  integration_id: string;
  key: string;
  label: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | string;
  relative_path: string;
  completion_mode: CompletionMode;
  authorization_mode?: AuthorizationMode;
  operation_id_field?: string | null;
  status_path?: string | null;
  status_field?: string;
  result_field?: string | null;
  error_code_field?: string | null;
  error_message_field?: string | null;
  event_topic?: string | null;
  timeout_seconds?: number;
  poll_interval_seconds?: number;
  completion_timeout_seconds?: number;
  request_schema?: Record<string, unknown> | null;
  response_schema?: Record<string, unknown> | null;
  active: boolean;
}

export interface CreateIntegrationOperationRequest {
  key: string;
  label: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | string;
  relative_path: string;
  completion_mode?: CompletionMode;
  authorization_mode?: AuthorizationMode;
  operation_id_field?: string | null;
  status_path?: string | null;
  status_field?: string;
  result_field?: string | null;
  error_code_field?: string | null;
  error_message_field?: string | null;
  event_topic?: string | null;
  timeout_seconds?: number;
  poll_interval_seconds?: number;
  completion_timeout_seconds?: number;
  request_schema?: Record<string, unknown> | null;
  response_schema?: Record<string, unknown> | null;
  active?: boolean;
}

export interface PatchIntegrationOperationRequest {
  label?: string | null;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | string | null;
  relative_path?: string | null;
  completion_mode?: CompletionMode | null;
  authorization_mode?: AuthorizationMode | null;
  operation_id_field?: string | null;
  status_path?: string | null;
  status_field?: string | null;
  result_field?: string | null;
  error_code_field?: string | null;
  error_message_field?: string | null;
  event_topic?: string | null;
  timeout_seconds?: number | null;
  poll_interval_seconds?: number | null;
  completion_timeout_seconds?: number | null;
  request_schema?: Record<string, unknown> | null;
  response_schema?: Record<string, unknown> | null;
  active?: boolean | null;
}

// ==========================================
// OPENAPI IMPORT PREVIEW
// ==========================================

export interface ImportResponseOption {
  status_code: string;
  response_schema: Record<string, unknown> | null;
}

export interface ImportOperationCandidate {
  key: string;
  label: string;
  method: string;
  relative_path: string;
  request_schema: Record<string, unknown> | null;
  response_schema: Record<string, unknown> | null;
  response_options: ImportResponseOption[];
  requires_response_selection: boolean;
  warnings: string[];
  errors: string[];
}

export interface IntegrationImportPreviewResponse {
  operations: ImportOperationCandidate[];
}


