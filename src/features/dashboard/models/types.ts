export interface TypeSummary {
  nombre: number;
  volume: number;
}

export interface DashboardSummaryResponse {
  nombre_transactions: number;
  volume_total: number;
  en_cours: TypeSummary;
  service?: Record<string, TypeSummary>;
  sens?: Record<string, TypeSummary>;
  moyen_paiement?: Record<string, TypeSummary>;
  produit?: Record<string, TypeSummary>;
  distributeur?: Record<string, TypeSummary>;
}

export interface DashboardFilters {
  date_from?: string;
  date_to?: string;
  structure?: string;
  structure_id?: string;
  entite_id?: string;
  agence?: string;
  agence_id?: string;
  /** Filtre explicite sur la caisse (UUID). Le périmètre du jeton s'applique de toute façon côté Reporting. */
  caisse_id?: string;
  agent_id?: string;
  type_transaction?: string;
  sens?: string;
  moyen_paiement?: string;
  produit?: string;
  produit_id?: string;
  distributeur?: string;
  distributeur_id?: string;
}

export type DatePreset = "today" | "7d" | "30d" | "month" | "custom";

export interface FilterOption {
  id: string;
  label: string;
  code?: string;
}
