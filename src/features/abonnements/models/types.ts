export type SubscriptionPeriodicity = "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL";
export type SubscriptionStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "EXPIRED";

export interface ServiceResponse {
  id: string;
  code: string;
  label: string;
  description: string | null;
  category_id: string | null;
  status: string;
  owner_code?: string | null;
  creation_date?: string;
  partner_id?: string | null;
}

export interface ServicesListResponse {
  items: ServiceResponse[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface SubscriptionResponse {
  id: string;
  structure_id: string;
  label: string;
  description: string | null;
  periodicity: SubscriptionPeriodicity;
  amount: string;
  status: SubscriptionStatus;
  expires_at: string | null;
  service_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateSubscriptionRequest {
  structure_id: string;
  label: string;
  description: string | null;
  periodicity: SubscriptionPeriodicity;
  amount: number;
  status?: SubscriptionStatus;
  expires_at: string | null;
  service_ids: string[];
}

export interface UpdateSubscriptionRequest {
  structure_id: string;
  label: string;
  description: string | null;
  periodicity: SubscriptionPeriodicity;
  amount: number;
  status: SubscriptionStatus;
  expires_at: string | null;
  service_ids: string[];
}
