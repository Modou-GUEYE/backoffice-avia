export interface StructureParamsResponse {
  badge: string;
  compte_beneficiaire_format: string;
  compte_beneficiaire_length: number | null;
  double_auth_enabled: boolean;
  kyc_match_date_naissance_pct: number | null;
  kyc_match_nom_pct: number | null;
  kyc_match_prenom_pct: number | null;
  kyc_match_libelle_pct: number | null;
  kyc_match_ninea_pct: number | null;
  kyc_match_num_identite_fiscale_pct: number | null;
  ouverture_mutualisation: boolean;
  accepte_operations_pos_externe?: boolean;
  structure_id: string;
  structure_name: string;
  tenant_level: string;
}

export interface UpdateStructureParamsRequest {
  compte_beneficiaire_format?: string | null;
  compte_beneficiaire_length?: number | null;
  double_auth_enabled?: boolean;
  kyc_match_date_naissance_pct?: number | null;
  kyc_match_nom_pct?: number | null;
  kyc_match_prenom_pct?: number | null;
  kyc_match_libelle_pct?: number | null;
  kyc_match_ninea_pct?: number | null;
  kyc_match_num_identite_fiscale_pct?: number | null;
  ouverture_mutualisation?: boolean;
  accepte_operations_pos_externe?: boolean;
}

export type CompteBeneficiaireFormat = "NUMERIC" | "ALPHANUMERIC" | "IBAN";
