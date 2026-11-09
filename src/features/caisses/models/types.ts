import { AgencyParentType } from "@/features/agences/models/types";

export type Caisse = CaisseRead & {
  agency_label?: string;
  last_transaction_at?: string;
};

export type CaisseForm = {
  name: string;
  code?: string | null;
  agency_id: string;
};

export interface CaisseCreate {
  name: string;
  code?: string | null;
  agency_id: string;
  parent_id?: string | null;
  parent_type?: AgencyParentType | null;
}

export interface CaisseRead {
  id: string;
  name: string;
  code?: string | null;
  agency_id: string;
  parent_id?: string | null;
  parent_type?: AgencyParentType | null;
  is_active: boolean;
  activated_at?: string | null;
  deactivated_at?: string | null;
  is_deleted: boolean;
}

export interface CaisseSummary {
  total: number;
  actifs: number;
  inactifs: number;
}

export interface CaissePaginatedResponse {
  items: CaisseRead[];
  total: number;
  summary: CaisseSummary;
}

export interface FetchCaissesParams {
  skip?: number;
  limit?: number;
  search?: string;
  agency_id?: string;
  is_active?: boolean;
  parent_id?: string;
  parent_type?: AgencyParentType;
  include_inactive?: boolean;
}

export type FetchCaissesResult = CaisseRead[] & {
  items: CaisseRead[];
  total: number;
  summary: CaisseSummary;
};

export type CaisseList = CaisseRead[];
export type CaisseDetail = CaisseRead;

export interface CaisseUpdate {
  name?: string | null;
  code?: string | null;
  agency_id?: string | null;
  parent_id?: string | null;
  parent_type?: AgencyParentType | null;
}

export interface CaisseAgenceLineCreate {
  name: string;
  code?: string | null;
}

export interface CreateCaissesForAgencyInput {
  agency_id: string;
  parent_id?: string | null;
  parent_type?: AgencyParentType | null;
  caisses: CaisseAgenceLineCreate[];
}

export interface CreateCaissesForAgencyResult {
  created: CaisseRead[];
  skippedDuplicates: string[];
  errors: Array<{ code: string; message: string }>;
}
