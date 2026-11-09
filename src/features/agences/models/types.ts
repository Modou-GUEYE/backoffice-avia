export type AgencyParentType = "STRUCTURE" | "DISTRIBUTOR";

export interface ParentEntityOption {
  id: string;
  nom: string;
  type: AgencyParentType;
}

export type AgenceCaisseFormLine = {
  existing_id?: string;
  name: string;
  code: string;
};

export type AgenceForm = {
  name: string;
  code: string;
  parent_id: string;
  parent_type: AgencyParentType;
  structureId?: string;
  city: string;
  region: string;
  country: string;
  address: string;
  contact_phone: string;
  contact_email: string;
  is_active: boolean;
  caisses: AgenceCaisseFormLine[];
};

export interface AgenceCreate {
  name: string;
  code?: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  parent_id: string;
  parent_type: AgencyParentType;
}

export interface AgenceRead {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  parent_id: string;
  parent_type: AgencyParentType;
  is_active: boolean;
  activated_at?: string | null;
  deactivated_at?: string | null;
  is_deleted?: boolean;
}

export type AgenceList = AgenceRead[];
export type AgenceDetail = AgenceRead;

export interface AgenceUpdate {
  name?: string | null;
  code?: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  parent_id?: string | null;
  parent_type?: AgencyParentType | null;
}

export interface AgencySummary {
  total: number;
  actifs: number;
  inactifs: number;
}

export interface AgencyPaginatedResponse {
  items: AgenceRead[];
  total: number;
  summary: AgencySummary;
}

export interface FetchAgencesParams {
  skip?: number;
  limit?: number;
  include_inactive?: boolean;
  search?: string;
  city?: string;
  is_active?: boolean;
  parent_id?: string;
  parent_type?: AgencyParentType | string;
}

export type FetchAgencesResult = AgenceRead[] & {
  items: AgenceRead[];
  total: number;
  summary: AgencySummary;
};
