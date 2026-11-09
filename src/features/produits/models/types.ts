export interface ProduitUtilisateur {
  id: string;
  username?: string;
  email?: string;
  nom: string;
  prenom: string;
  matricule: string;
  profil: string;
  isPendingCreation?: boolean;
}

export interface ProduitRead {
  id: string;
  nom: string;
  code?: string;
  shortCode?: string;
  description?: string;
  logo?: string;
  libelleExpediteur: string;
  structuresAssociees: string[];
  statut: "active" | "inactive";
  dateCreation: string;
  archived?: boolean;
  utilisateurs: ProduitUtilisateur[];
  administrationId?: string;
  brandingConfig?: Record<string, unknown>;
  mediaUrl?: string;
  media_url?: string | null;
}

export type ProduitUtilisateurForm = {
  id: string;
  username?: string;
  email?: string;
  nom: string;
  prenom: string;
  matricule: string;
  profil: string;
  isPendingCreation?: boolean;
};

export type ProduitUserDraft = {
  nom: string;
  prenom: string;
  username: string;
  email: string;
  role: string;
};

export type ProduitForm = {
  nom: string;
  code?: string;
  description?: string;
  logo?: string;
  logoFile?: File | null;
  mediaUrl?: string;
  libelleExpediteur: string;
  structuresAssociees: string[];
  statut: "active" | "inactive";
  utilisateurs: ProduitUtilisateur[];
  // Branding (Charte graphique)
  faviconUrl: string;
  apsfdLogoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  sidebarColor: string;
  borderColor: string;
  loginBgUrl: string;
  brandingConfig?: Record<string, unknown>;
};

export type ApiProductRead = {
  id: string;
  name: string;
  code: string | null;
  description?: string | null;
  short_code?: string | null;
  settings?: Record<string, unknown> | null;
  branding_config?: Record<string, unknown> | null;
  logo_url?: string | null;
  logo_media_id?: string | null;
  media_id?: string | null;
  media_url?: string | null;
  administration_id: string;
  is_active: boolean;
  activated_at?: string | null;
  deactivated_at?: string | null;
  is_deleted?: boolean;
};

export interface ProductSummary {
  total: number;
  actifs: number;
  inactifs: number;
}

export interface ProductPaginatedResponse {
  items: ApiProductRead[];
  total: number;
  summary: ProductSummary;
}

export type ApiProductCreate = {
  name: string;
  code?: string | null;
  description?: string | null;
  short_code?: string | null;
  settings?: Record<string, unknown> | null;
  branding_config?: Record<string, unknown> | null;
  logo_url?: string | null;
  logo_media_id?: string | null;
  media_id?: string | null;
  media_url?: string | null;
  administration_id: string;
};

export type ApiProductUpdate = Partial<ApiProductCreate>;

export interface StructureUserRead {
  id: string;
  nom: string;
  prenom: string;
  matricule?: string | null;
  email?: string | null;
  profils: string[];
  is_active: boolean;
  activated_at?: string | null;
  deactivated_at?: string | null;
  code?: string | null;
  name: string;
  is_deleted?: boolean;
  structure_id: string;
}

export type ProductUserRead = StructureUserRead;


