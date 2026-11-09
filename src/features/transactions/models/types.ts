/**
 * Types pour le module Journal des Transactions
 */

export interface TransactionOut {
  id: string;
  reference: string;
  type_transaction: string;
  statut: string;
  date_initiation: string | null;
  date_finalisation: string | null;
  montant: number;
  frais: number | null;
  structure: string;
  initiateur: string;
  moyen_paiement: string | null;
  sens: string | null;
  produit: string | null;
  distributeur: string | null;
  quoteparts: Record<string, unknown> | null;
  receveur: string | null;
  agent: string | null;
  agence: string | null;
  canal: string | null;
  motif_rejet: string | null;
  anomalie_ordre: boolean;
  anomalie_detail: string | null;
  updated_at: string;
}

export interface TransactionDetailOut extends TransactionOut {
  raw_payloads: Record<string, unknown>[];
  created_at: string;
}

export interface TransactionListResponse {
  total: number;
  skip: number;
  limit: number;
  items: TransactionOut[];
}

export interface TransactionFilters {
  skip?: number;
  limit?: number;
  type_transaction?: string;
  structure?: string;
  structure_id?: string;
  entite_id?: string;
  reference?: string;
  statut?: string;
  agence?: string;
  agence_id?: string;
  /** Filtre explicite sur la caisse (UUID). Le périmètre du jeton s'applique de toute façon côté Reporting. */
  caisse_id?: string;
  agent?: string;
  agent_id?: string;
  anomalie_ordre?: boolean;
  sens?: string;
  moyen_paiement?: string;
  produit?: string;
  produit_id?: string;
  distributeur?: string;
  distributeur_id?: string;
  montant_min?: number;
  montant_max?: number;
  date_from?: string;
  date_to?: string;
}

export type TransactionExportFormat = "csv" | "xlsx" | "pdf";
