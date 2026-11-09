export interface ContractPrecondition {
  rule: string;
  account?: string;
  expression?: string;
  [key: string]: unknown;
}

export interface ContractExecutionStep {
  step: string;
  account?: string;
  amount?: string;
  from_account?: string;
  to_account?: string;
  fee_account?: string;
  code_operation?: string;
  condition?: string;
  on_true?: ContractExecutionStep[];
  on_false?: ContractExecutionStep[];
  [key: string]: unknown;
}

export interface ContractPostcondition {
  rule: string;
  expression?: string;
  [key: string]: unknown;
}

export interface ContractCompensationRule {
  action: string;
  manual?: boolean;
  [key: string]: unknown;
}

export interface ContractDefinition {
  service_type?: string;
  code?: string;
  version?: string;
  label?: string;
  description?: string;
  preconditions?: ContractPrecondition[];
  execution_steps?: ContractExecutionStep[];
  postconditions?: ContractPostcondition[];
  compensation?: Record<string, ContractCompensationRule>;
  [key: string]: unknown;
}

export interface ContractDefinitionResponse {
  id: string;
  service_type: string;
  code?: string | null;
  version: string;
  label?: string | null;
  description: string;
  version_id?: string | null;
  aggregate_version?: number | null;
  source_format: "yaml" | "json" | string;
  is_active: boolean;
  definition: ContractDefinition;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ContractListResponse {
  contracts: ContractDefinitionResponse[];
  total: number;
}

export interface ContractActivateRequest {
  is_active: boolean;
}
