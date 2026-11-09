// ===== COMMON ENUMS & TYPES =====

export type ServiceType = string;

export interface CatalogServiceItem {
  id: string;
  code: string;
  label: string;
  description?: string | null;
  status?: string;
}

export type TenantLevel = "GLOBAL" | "PRODUCT" | "STRUCTURE" | "AGENCY" | "DISTRIBUTEUR";

export type ClientType = "PARTICULIER" | "ENTREPRISE";

export type TarificationSubTab = "frais" | "plafonds" | "taxes" | "commissions" | "promos";

// ===== COMMISSIONS =====

export type CommissionPhase = "UNIQUE" | "INITIATION" | "DENOUEMENT" | string;

export interface CommissionSplitResponse {
  id: string;
  service_type: string;
  tenant_level: string;
  tenant_id: string | null;
  phase: string;
  rate_structure: number;
  rate_tca_structure: number;
  rate_distributeur: number;
  rate_groupement: number;
  rate_partenaire_technique: number;
  is_active: boolean;
  badge?: string | null;
  override_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface CreateCommissionSplitRequest {
  service_type: string;
  tenant_level: string;
  tenant_id?: string | null;
  phase?: string;
  rate_structure: number;
  rate_tca_structure: number;
  rate_distributeur: number;
  rate_groupement: number;
  rate_partenaire_technique: number;
  override_reason?: string | null;
}

export interface UpdateCommissionSplitRequest {
  tenant_level?: string;
  tenant_id?: string | null;
  service_type?: string;
  phase?: string;
  rate_structure?: number;
  rate_tca_structure?: number;
  rate_distributeur?: number;
  rate_groupement?: number;
  rate_partenaire_technique?: number;
  override_reason?: string | null;
}

export interface ConsolidatedCommissionView {
  badge: string;
  inherited: boolean;
  module: string;
  name: string;
  tenant_id: string;
  tenant_level: TenantLevel;
}

export interface CommissionForm {
  tenantLevel: string;
  tenantId: string;
  serviceType: string;
  phase: string;
  rateStructure: string;
  rateTcaStructure: string;
  rateDistributeur: string;
  rateGroupement: string;
  ratePartenaireTechnique: string;
  overrideReason: string;
}

// ===== PROMOTIONS =====

export interface PromoResponse {
  id: string;
  code: string;
  service_type: ServiceType;
  tenant_level: TenantLevel;
  tenant_id: string | null;
  fee_grid_id?: string | null;
  start_date: string;
  end_date: string;
  rate_amount: number;
  fixed_amount: number;
  is_active: boolean;
  override_reason?: string | null;
  structure_id?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface CreatePromoRequest {
  code: string;
  service_type?: ServiceType;
  tenant_level: TenantLevel;
  tenant_id?: string | null;
  fee_grid_id?: string | null;
  start_date: string;
  end_date: string;
  rate_amount?: number;
  fixed_amount?: number;
  override_reason?: string | null;
}

export interface UpdatePromoRequest {
  code?: string;
  start_date?: string;
  end_date?: string;
  rate_amount?: number;
  fixed_amount?: number;
  override_reason?: string | null;
}

export interface PromoForm {
  code: string;
  serviceType: ServiceType;
  tenantLevel: TenantLevel;
  tenantId: string;
  feeGridId: string;
  startDate: string;
  endDate: string;
  rateAmount: string;
  fixedAmount: string;
  overrideReason: string;
}

// ===== CLIENT CAP OVERRIDE =====

export interface ClientOverrideRequest {
  client_id: string;
  structure_id: string;
  new_limit: number;
  comment: string;
}

export interface ClientCapUsage {
  id?: string;
  client_id: string;
  structure_id: string;
  service_type: string;
  daily_total: number;
  monthly_total: number;
  reference_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FeeResponse {
  id: string;
  min_bound: number;
  max_bound: number;
  fixed_fee: number;
  rate_fee: number;
  service_type: ServiceType;
  tenant_level: TenantLevel;
  tenant_id: string | null;
  structure_id?: string | null;
  is_active: boolean;
  badge?: string | null;
  override_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface CreateFeeGridRequest {
  min_bound: number;
  max_bound: number;
  fixed_fee: number;
  rate_fee: number;
  service_type: ServiceType;
  tenant_level: TenantLevel;
  tenant_id?: string | null;
  override_reason?: string | null;
}

export interface UpdateFeeGridRequest {
  min_bound?: number;
  max_bound?: number;
  fixed_fee?: number;
  rate_fee?: number;
  service_type?: ServiceType;
  tenant_level?: TenantLevel;
  tenant_id?: string | null;
  override_reason?: string | null;
}

export interface FeeForm {
  tenantLevel: TenantLevel;
  tenantId: string;
  serviceType: ServiceType;
  minBound: string;
  maxBound: string;
  fixedFee: string;
  rateFee: string;
  overrideReason: string;
}

export type FeeFilterLevel = "ALL" | TenantLevel;
export type FeeFilterService = "ALL" | ServiceType;

// ===== PLAFONDS (CAPS) =====

export interface CapResponse {
  id: string;
  badge?: string | null;
  service_type: ServiceType;
  tenant_level: TenantLevel;
  tenant_id: string | null;
  min_per_transaction: number | null;
  max_per_transaction: number | null;
  daily_cumulative: number | null;
  monthly_cumulative: number | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface UpsertCapRequest {
  service_type: ServiceType;
  tenant_level: TenantLevel;
  tenant_id?: string | null;
  min_per_transaction?: number | null;
  max_per_transaction?: number | null;
  daily_cumulative?: number | null;
  monthly_cumulative?: number | null;
}

export interface FetchCapsParams {
  tenant_level?: TenantLevel;
  tenant_id?: string;
  service_type?: ServiceType;
}

export interface CapEditForm {
  min_per_transaction: string;
  max_per_transaction: string;
  daily_cumulative: string;
  monthly_cumulative: string;
}

export interface CapCreateForm {
  service_type: ServiceType;
  tenant_level: TenantLevel;
  tenant_id: string;
  min_per_transaction: string;
  max_per_transaction: string;
  daily_cumulative: string;
  monthly_cumulative: string;
}

// ===== TAXES =====

export interface TaxResponse {
  id: string;
  tax_type: string;
  client_type: ClientType;
  tax_rate?: number | null;
  tax_amount?: number | null;
  service_type: ServiceType;
  tenant_level: TenantLevel;
  tenant_id: string | null;
  structure_id?: string | null;
  is_active: boolean;
  badge?: string | null;
  override_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateTaxRequest {
  tax_type: string;
  client_type: ClientType;
  tax_rate?: number;
  tax_amount?: number;
  service_type: ServiceType;
  tenant_level: TenantLevel;
  tenant_id?: string | null;
  override_reason?: string | null;
}

export interface UpdateTaxRequest {
  tax_type?: string;
  client_type?: ClientType;
  service_type?: ServiceType;
  tenant_level?: TenantLevel;
  tenant_id?: string | null;
  tax_rate?: number;
  tax_amount?: number;
  override_reason?: string | null;
}

export interface TaxForm {
  tenantLevel: TenantLevel;
  tenantId: string;
  serviceType: ServiceType;
  clientType: ClientType;
  taxType: string;
  taxRate: string;
  taxAmount: string;
  overrideReason: string;
}
