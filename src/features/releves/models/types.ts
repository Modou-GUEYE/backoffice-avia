/** Contrat Reporting : /api/v1/reporting/releves (ReleveOut, ReleveListResponse, CorrectionCreateIn, CorrectionOut). */

export type ReleveStatut = "brouillon" | "fige";

/** Les montants « par bénéficiaire » agrègent par type de bénéficiaire, pas par identifiant. */
export type BeneficiaireType = "produit" | "structure" | "partenaire_technique" | "distributeur";

export type MontantsParBeneficiaire = Partial<Record<BeneficiaireType, number>>;

/** Agrégat d'un groupe de transactions ; `quoteparts` = somme de toutes les quotes-parts du groupe. */
export interface ReleveGroupe {
  nombre: number;
  volume: number;
  frais: number;
  quoteparts: number;
}

export interface AjustementAnterieur {
  correction_id: string;
  releve_source_id: string;
  motif: string;
  montant: number;
  beneficiaire_type: BeneficiaireType | string;
  beneficiaire_id?: string | null;
  statut: string;
  cree_par: string;
  created_at: string;
}

export interface Releve {
  id: string;
  structure: string;
  annee: number;
  mois: number;
  periode_debut: string;
  periode_fin: string;
  nombre_transactions: number;
  volume_total: number;
  total_frais: number;
  total_quoteparts: MontantsParBeneficiaire;
  detail_par_produit: Record<string, ReleveGroupe>;
  detail_par_distributeur: Record<string, ReleveGroupe>;
  statut: ReleveStatut | string;
  fige_le?: string | null;
  fige_par?: string | null;
  ajustements_anterieurs?: AjustementAnterieur[];
  ajustements_par_beneficiaire?: MontantsParBeneficiaire;
  montants_nets_par_beneficiaire?: MontantsParBeneficiaire;
  total_ajustements: number;
  montant_net_a_reverser: number;
  created_at: string;
  updated_at: string;
}

export interface ReleveListResponse {
  total: number;
  skip: number;
  limit: number;
  items: Releve[];
}

export interface ReleveFilters {
  /** Identifiant (UUID) de la structure, tel que porté par les transactions et le jeton. */
  structure?: string;
  annee?: number;
  mois?: number;
  statut?: string;
  skip?: number;
  limit?: number;
}

/** ReleveGenerateIn : UUID de la structure, identique au périmètre du JWT et aux événements Kafka. */
export interface ReleveGenerateInput {
  structure_id: string;
  annee: number;
  mois: number;
}

export interface CorrectionInput {
  motif: string;
  montant: number;
  beneficiaire_type: BeneficiaireType;
  /** Obligatoire hors structure. */
  beneficiaire_id?: string | null;
  cree_par: string;
}

export interface Correction {
  id: string;
  releve_source_id: string;
  structure: string;
  annee_cible: number;
  mois_cible: number;
  motif: string;
  montant: number;
  beneficiaire_type: string;
  beneficiaire_id?: string | null;
  statut: string;
  cree_par: string;
  created_at: string;
}

export type ReleveExportFormat = "pdf" | "xlsx";

/** NotificationReleveOut : contenu préparé de la notification (un lien, pas une pièce jointe). Aucun envoi n'est fait. */
export interface NotificationReleve {
  releve_id: string;
  structure: string;
  periode: string;
  objet: string;
  lien_telechargement: string;
  message: string;
  avec_piece_jointe?: boolean;
}
