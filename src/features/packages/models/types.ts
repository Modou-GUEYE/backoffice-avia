export interface PackageResponse {
  id: string;
  code: string;
  label: string;
  description: string | null;
  client_types?: string[];
  status: "active" | "inactive" | "archived";
  services?: string[];
  payment_methods?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ServiceResponse {
  id: string;
  code: string;
  label: string;
  description: string | null;
  category_id: string | null;
  status: "active" | "inactive";
  version?: string;
  source_format?: string;
  definition?: Record<string, unknown>;
  is_contract?: boolean;
  service_type?: string;
  version_id?: string | null;
  aggregate_version?: number | null;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  partner_id?: string | null;
  owner_code?: string | null;
  creation_date?: string;
}

export interface ServiceListResponse {
  items: ServiceResponse[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface CreateServiceRequest {
  code: string;
  label: string;
  description?: string | null;
  category_id?: string | null;
}

export interface UpdateServiceRequest {
  code: string;
  label: string;
  description?: string | null;
  category_id?: string | null;
}

export interface PatchServiceRequest {
  code?: string | null;
  label?: string | null;
  description?: string | null;
  category_id?: string | null;
}

export interface PackageServiceItemResponse {
  id: string;
  package_id: string;
  service_id: string;
  is_enabled: boolean;
}

export interface ServicePaymentFlowResponse {
  id: string;
  structure_id?: string | null;
  service_id: string;
  source_payment_method_id?: string | null;
  destination_payment_method_id?: string | null;
  source_payment_method_ids: string[];
  destination_payment_method_ids: string[];
  is_enabled: boolean;
  constraints?: Record<string, unknown> | null;
  scope?: "DEFAULT" | "STRUCTURE";
  inherited?: boolean;
}

// Version d'un service (réservé au profil technique)
export interface ServiceVersionResponse {
  id: string;
  service_id: string;
  version: string;
  status?: string | null;
  changelog?: string | null;
  [key: string]: unknown;
}

export interface CreateServicePaymentFlowRequest {
  source_payment_method_ids: string[];
  destination_payment_method_ids: string[];
  constraints?: Record<string, unknown> | null;
}

export interface UpdateServicePaymentFlowRequest {
  source_payment_method_ids: string[];
  destination_payment_method_ids: string[];
  constraints?: Record<string, unknown> | null;
}

export interface PackagePaymentMethodResponse {
  id: string;
  package_id: string;
  payment_method_id: string;
  is_enabled: boolean;
}

export interface AddPackagePaymentMethodRequest {
  payment_method_ids: string[];
}

export interface UpdatePackagePaymentMethodRequest {
  is_enabled: boolean;
}


export interface PackageForm {
  code: string;
  label: string;
  description: string;
  client_types?: string[];
  services: string[];
  payment_methods: string[];
}

export interface ServiceForm {
  code: string;
  label: string;
  description: string;
  category_id: string | null;
  rawContractYaml?: string;
  contractFile?: File | null;
}

export interface StructurePackageAssignmentResponse {
  id: string;
  structure_id: string;
  package_id: string;
  status: string;
  assigned_at: string;
  terminated_at?: string | null;
}
