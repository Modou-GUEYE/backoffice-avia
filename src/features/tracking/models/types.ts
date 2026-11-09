export interface TrackingEvent {
  id: string;
  source: string;
  action: string;
  event_timestamp: string;
  entite?: string | null;
  profil: string;
  utilisateur: string;
  method?: string | null;
  endpoint?: string | null;
  event_label?: string | null;
  created_at?: string;
  resultat_action?: string | null;
  navigateur?: string | null;
  adresse_ip?: string | null;
  agence_id?: string | null;
  structure_id?: string | null;
  caisse_id?: string | null;
  distributor_id?: string | null;
  distributeur_id?: string | null;
  product_id?: string | null;
  administration_id?: string | null;
}

export type TrackingEventDetail = TrackingEvent;

export interface TrackingEventListResponse {
  total: number;
  skip: number;
  limit: number;
  items: TrackingEvent[];
  summary: TrackingEventSummary;
}

export interface TrackingEventSummary {
  total_events: number;
  distinct_users: number;
  active_sources: number;
  success_operations: number;
  failed_operations: number;
}

export interface TrackingFilters {
  source?: string;
  action?: string;
  entite?: string;
  structure_id?: string;
  profil?: string;
  utilisateur?: string;
  method?: string;
  adresse_ip?: string;
  agence_id?: string;
  caisse_id?: string;
  distributor_id?: string;
  distributeur_id?: string;
  product_id?: string;
  administration_id?: string;
  navigateur?: string;
  resultat_action?: string;
  date_from?: string;
  date_to?: string;
  skip?: number;
  limit?: number;
}
