import { EntityBranding } from "@/core/theme/ThemeContext";

export interface StructureUser {
  id: string;
  username?: string;
  email?: string;
  isPendingCreation?: boolean;
  nom: string;
  prenom: string;
  matricule?: string;
  profil: string;
  agence?: string;
  agenceId?: string;
  caisse?: string;
  caisseId?: string;
}

export interface Structure {
  id: string;
  code: string;
  name: string;
  type: "BANK" | "IMF" | "PARTNER" | "OTHER";
  description?: string | null;
  legal_name?: string | null;
  registration_number?: string | null;
  address: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  is_active: boolean;
  activated_at?: string | null;
  deactivated_at?: string | null;
  nombreAgences: number;
  media_url?: string | null;
  mediaUrl?: string;
  libelleExpediteurSMS?: string;
  packageId?: string;
  productId?: string;
  produitId?: string;
  utilisateurs: StructureUser[];
  archived?: boolean;
  branding?: Partial<EntityBranding>;
}

export type StructureForm = {
  code: string;
  name: string;
  type: string;
  description: string;
  legal_name: string;
  registration_number: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  is_active: boolean;
  logoUrl: string;
  logoFile?: File | null;
  libelleExpediteurSMS: string;
  packageId: string;
  ajouterProduit: boolean;
  produitId: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  sidebarColor: string;
  borderColor: string;
};

export type StructureType = "BANK" | "IMF" | "PARTNER" | "OTHER";

export type StructureUserForm = {
  nom: string;
  prenom: string;
  username: string;
  email: string;
  profil: string;
  matricule?: string;
  agenceId?: string;
  caisseId?: string;
};

export const profilsStructure = [
  "Administrateur structure",
  "Gestionnaire structure",
  "Agent structure",
] as const;

export interface StructureCreate {
  name: string;
  code?: string | null;
  type?: StructureType;
  description?: string | null;
  legal_name?: string | null;
  registration_number?: string | null;
  address?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  product_id?: string;
  media_url?: string | null;
  media_id?: string | null;
  sender_label?: string | null;
  package?: string | null;
  branding_config?: Record<string, unknown> | null;
  file?: File | null;
  logoFile?: File | null;
}

export interface StructureRead {
  id: string;
  name: string;
  code?: string | null;
  type?: StructureType;
  description?: string | null;
  legal_name?: string | null;
  registration_number?: string | null;
  address?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  product_id?: string | null;
  is_active: boolean;
  activated_at?: string | null;
  deactivated_at?: string | null;
  is_deleted: boolean;
  media_url?: string | null;
  media_id?: string | null;
  sender_label?: string | null;
  package?: string | null;
  branding_config?: Record<string, unknown> | null;
}

export type StructureList = StructureRead[];
export type StructureDetail = StructureRead;

export interface StructureUpdate {
  name?: string | null;
  code?: string | null;
  type?: StructureType | null;
  description?: string | null;
  legal_name?: string | null;
  registration_number?: string | null;
  address?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  product_id?: string | null;
  media_url?: string | null;
  media_id?: string | null;
  sender_label?: string | null;
  package?: string | null;
  branding_config?: Record<string, unknown> | null;
  file?: File | null;
  logoFile?: File | null;
}

export interface StructureSummary {
  total: number;
  actifs: number;
  inactifs: number;
}

export interface StructurePaginatedResponse {
  items: StructureRead[];
  total: number;
  summary: StructureSummary;
}

export interface FetchStructuresParams {
  skip?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  type?: StructureType;
  product_id?: string;
  include_inactive?: boolean;
  name?: string;
}

export type FetchStructuresResult = StructureRead[] & {
  items: StructureRead[];
  total: number;
  summary: StructureSummary;
};
