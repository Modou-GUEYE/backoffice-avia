export type TypePartenaire = "particulier" | "entreprise";
export type CategoriePartenaire = "marchand" | "facturier";
export type TypePiece = "CNI" | "PASSEPORT" | "PERMIS" | "CARTE_SEJOUR";

export interface Structure {
  id: string;
  nom: string;
  pays: string;
}

export interface PointDeVente {
  id: string;
  code?: string;
  name: string;
  libelle: string;
  adresse?: string;
  telephone?: string;
  partnerId: string;
  statut: "actif" | "inactif";
  activatedAt?: string;
  deactivatedAt?: string;
}

export interface PointDeVenteCreate {
  libelle: string;
  name: string;
  code?: string | null;
  adresse?: string | null;
  telephone?: string | null;
  partner_id?: string | null;
}

export interface PointDeVenteUpdate {
  name?: string | null;
  code?: string | null;
  libelle?: string | null;
  adresse?: string | null;
  telephone?: string | null;
  is_active?: boolean | null;
}

export interface FetchPointsDeVenteParams {
  search?: string;
  isActive?: boolean;
  skip?: number;
  limit?: number;
}

export type CanalService = "WALLET" | "COMPTE_A_COMPTE" | "CASH";

export interface ServicePartenaire {
  id: string;
  code?: string | null;
  name: string;
  libelle: string;
  canal: CanalService | string;
  statut: "actif" | "inactif";
  partnerId?: string;
  activatedAt?: string;
  deactivatedAt?: string;
  description?: string | null;
  owner_code?: string | null;
  creation_date?: string | null;
}

export interface PartnerResponse {
  id: string;
  label: string;
  status: string;
  parent_ref_id?: string | null;
  parent_ref_type?: string | null;
  event_timestamp?: string | null;
}

export interface PartnerServicesResponse {
  partner_id: string;
  service_ids: string[];
}

export interface ReplacePartnerServicesRequest {
  service_ids: string[];
}

export interface Partenaire {
  id: string;
  name?: string;
  code?: string;
  type: TypePartenaire;
  categorie: CategoriePartenaire;
  // Particulier fields
  nom?: string;
  prenom?: string;
  dateNaissance?: string;
  typePiece?: TypePiece | string;
  dateDelivrance?: string;
  dateExpiration?: string;
  // Entreprise fields
  libelle?: string;
  ninea?: string;
  numeroIdentiteFiscale?: string;
  // Common
  login: string;
  telephone: string;
  email: string;
  profil: string;
  statut: "actif" | "inactif";
  dateCreation: string;
  activatedAt?: string;
  deactivatedAt?: string;
  pointsDeVente?: PointDeVente[];
  services?: ServicePartenaire[];
  serviceIds?: string[];
  archived?: boolean;
  hasTransactions?: boolean;
}

export interface CatalogServiceItem {
  id: string;
  code: string;
  label: string;
  name?: string;
  description?: string | null;
  status?: string;
  owner_code?: string | null;
  partner_id?: string | null;
}

export interface FetchCatalogServicesParams {
  owner_code?: string;
  page?: number;
  page_size?: number;
}

export interface PartenaireForm {
  code?: string;
  type: TypePartenaire;
  categorie: CategoriePartenaire;
  nom: string;
  prenom: string;
  dateNaissance: string;
  typePiece: string;
  dateDelivrance: string;
  dateExpiration: string;
  libelle: string;
  ninea: string;
  numeroIdentiteFiscale: string;
  telephone: string;
  email: string;
  profil: string;
  serviceIds: string[];
}

export interface PartenaireUserForm {
  prenom: string;
  nom: string;
  username: string;
  email: string;
  profil: string;
}

export type PartenaireRead = Partenaire;

export interface PartenaireSummary {
  total: number;
  marchands: number;
  facturiers: number;
  actifs: number;
  inactifs: number;
}
