export interface DistributorRead {
  id: string;
  name: string;
  address?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  branding_config?: Record<string, unknown> | null;
  features_config?: Record<string, unknown> | null;
  media_id?: string | null;
  media_url?: string | null;
  structure_id: string;
  is_active: boolean;
  activated_at?: string | null;
  deactivated_at?: string | null;
  is_deleted: boolean;
  agencies_count?: number | null;
  cash_registers_count?: number | null;
}

export interface DistributorSummary {
  total: number;
  actifs: number;
  inactifs: number;
}

export interface FetchDistributorsParams {
  skip?: number;
  limit?: number;
  include_inactive?: boolean;
  search?: string;
  structure_id?: string;
  is_active?: boolean;
}

export interface FetchDistributorsResult {
  items: Distributeur[];
  total: number;
  summary: DistributorSummary;
}

export interface DistributorCreate {
  name: string;
  structure_id: string;
  address?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  branding_config?: Record<string, unknown> | null;
  features_config?: Record<string, unknown> | null;
  media_id?: string | null;
  media_url?: string | null;
  file?: File | null;
}

export interface DistributorUpdate {
  name?: string;
  structure_id?: string | null;
  address?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  branding_config?: Record<string, unknown> | null;
  features_config?: Record<string, unknown> | null;
  media_id?: string | null;
  media_url?: string | null;
  file?: File | null;
}

// Distributeur extends DistributorRead with compatibility aliases used across views
export type Distributeur = DistributorRead & {
  // Aliases for compatibility
  nom: string;
  structureId?: string;
  statut: "actif" | "inactif";
  activatedAt: string;
  nombreAgences: number | null;
  nombreCaisses: number | null;
  archived?: boolean;
};

export interface DistributeurForm {
  nom: string;
  structureId: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
  statut: "actif" | "inactif";
  file?: File | null;
  previewUrl?: string;
}

export interface DistributeurUser {
  id: string;
  nom: string;
  prenom: string;
  username: string;
  email: string;
  profil: string;
  matricule?: string;
  isPendingCreation?: boolean;
  active?: boolean;
  statut?: "Actif" | "Inactif";
  telephone?: string;
}

export interface DistributeurUserForm {
  nom: string;
  prenom: string;
  username: string;
  email: string;
  profil: string;
  matricule?: string;
  telephone?: string;
}

