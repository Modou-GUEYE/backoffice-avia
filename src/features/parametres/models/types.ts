export interface EntiteAdministration {
  id: string;
  nom: string;
  parametresGlobaux: boolean;
  gestionEntites: boolean;
  gestionModules: boolean;
  gestionProfils: boolean;
  reglesAccesTransverses: boolean;
}

export interface AdministrationCreate {
  name: string;
  code?: string | null;
  description?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  settings?: Record<string, unknown> | null;
}

export interface AdministrationRead {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  settings?: Record<string, unknown> | null;
  is_active: boolean;
  activated_at?: string | null;
  deactivated_at?: string | null;
  is_deleted: boolean;
}

export type AdministrationList = AdministrationRead[];
export type AdministrationDetail = AdministrationRead;

export interface AdministrationUpdate {
  name?: string | null;
  code?: string | null;
  description?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  settings?: Record<string, unknown> | null;
}

// ===== TYPES DE ROLES PAR ENTITE =====

// Roles de l'entite Administration
export type AdministrationRole = "Administrateur" | "Contrôleur" | "Profil Technique";

// Roles de l'entite Structure
export type StructureRole = "Administrateur" | "Contrôleur" | "Initiateur financier" | "Validateur financier";

// Roles de l'entite Agence
export type AgenceRole = "Agent" | "Superviseur";

// Roles de l'entite Produit (Profil central - visualisation uniquement)
export type ProduitRole = "Profil central";

// Roles de l'entite autonome
export type EnsembleAutonomeRole = "Administrateur" | "Agent" | "Superviseur";

// Profils financiers (transversaux a Structure et Ensemble autonome)
export type FinancialProfile = "Initiateur financier" | "Validateur financier";

// Union de tous les roles possibles du systeme
export type GlobalRole = 
  | AdministrationRole 
  | StructureRole 
  | AgenceRole 
  | ProduitRole 
  | EnsembleAutonomeRole;

// ===== INTERFACE ROLE HISTORIQUE (CONSERVEE POUR COMPATIBILITE ASCENDANTE) =====
export interface Role {
  id: string;
  nom: string;
  description: string;
  permissions: string[];
  statut: "Actif" | "Inactif";
}

export type RoleForm = Omit<Role, "id">;

// ===== TYPES POUR LA GESTION DES PACKAGES, SERVICES ET MOYENS DE PAIEMENT =====

export type {
  PackageResponse,
  ServiceResponse,
} from "@/features/packages/models/types";

export type {
  MethodKind,
  LoopType,
  BankingBackendType,
  PaymentMethodResponse,
  UpsertPaymentMethodPayload,
} from "@/features/payment-methods/models/types";

export interface PackageServiceItemResponse {
  id: string;
  package_id: string;
  service_id: string;
  is_enabled: boolean;
}

export interface ServicePaymentFlowResponse {
  id: string;
  service_id: string;
  source_payment_method_id?: string | null;
  destination_payment_method_id?: string | null;
  source_payment_method_ids?: string[];
  destination_payment_method_ids?: string[];
  is_enabled: boolean;
  constraints?: Record<string, unknown> | null;
}

export interface PackagePaymentFlowResponse {
  id: string;
  package_service_id: string;
  service_payment_flow_id: string;
  is_enabled: boolean;
  constraints_override?: Record<string, unknown> | null;
}

export interface PackageForm {
  code: string;
  label: string;
  description: string;
  client_types?: string[];
  services: string[];
  payment_methods: string[];
}

// ===== DIFFUSION & COMMUNICATIONS TYPES =====

export type CampaignStatus = "pas_encore_diffusee" | "en_cours" | "deja_diffusee" | "suspendue";
export type MediaType = "image" | "audio" | "video";
export type CampaignTarget = "tous" | "agences" | "localite" | "type_client" | "tranche_age";

export interface CampaignOut {
  id: string;
  libelle: string;
  type: MediaType;
  date_debut: string; // ISO Datetime
  date_fin: string; // ISO Datetime
  cible: CampaignTarget;
  cible_ids?: string[] | null;
  description?: string | null;
  status: CampaignStatus;
  filename?: string | null;
  structure_id?: string | null;
  media_id?: string | null;
  // Backward compatibility with legacy payloads still seen in some older clients.
  media_url?: string | null;
  url?: string | null;
}

export const resolveCampaignMediaUrl = (campaign?: Partial<CampaignOut> | null): string | null => {
  const rawUrl = campaign?.media_url ?? campaign?.url ?? null;
  if (typeof rawUrl === "string" && rawUrl.trim().length > 0) {
    return rawUrl.trim();
  }

  const rawMediaId = campaign?.media_id ?? null;
  if (typeof rawMediaId === "string" && rawMediaId.trim().length > 0) {
    const value = rawMediaId.trim();
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }
  }

  return null;
};

export interface CampaignHistoryEntry {
  diffusion_id: string;
  date_debut: string;
  date_fin: string;
  status: CampaignStatus;
  archived_at: string;
}

export interface CampaignHistoryResponse {
  campaign_id: string;
  history: CampaignHistoryEntry[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface CampaignListResponse {
  data: CampaignOut[];
  pagination: PaginationMeta;
}

export type NotificationCanal = "sms" | "mail" | "app";
export type Channel = "sms" | "email" | "app";
export type TransactionType = "virement" | "versement" | "retrait" | "paiement" | "transfert_b2w";

export interface NotificationRead {
  id: string;
  libelle: string;
  type_transaction: string;
  canal: NotificationCanal;
  channel?: string[];
  contenu_envoyeur: string;
  contenu_destinataire: string;
  is_active: boolean;
}

// ===== REGLES METIER & TARIFICATION (Frais, Caps, Taxes) =====

export type ServiceType = string;

export type TenantLevel = "GLOBAL" | "PRODUCT" | "STRUCTURE" | "AGENCY" | "DISTRIBUTEUR";

export interface FeeResponse {
  id: string;
  min_bound: number;
  max_bound: number;
  fixed_fee: number;
  rate_fee: number;
  service_type: ServiceType;
  tenant_level: TenantLevel;
  tenant_id: string | null;
  is_active: boolean;
  badge?: string | null;
  override_reason?: string | null;
}

export interface CreateFeeGridRequest {
  min_bound: number;
  max_bound: number;
  fixed_fee: number;
  rate_fee: number;
  service_type: ServiceType;
  tenant_level: TenantLevel;
  tenant_id?: string | null;
  override_reason?: string | null;
}

export interface UpdateFeeGridRequest {
  min_bound?: number;
  max_bound?: number;
  fixed_fee?: number;
  rate_fee?: number;
  override_reason?: string | null;
}


