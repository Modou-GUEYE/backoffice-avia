import { useMemo } from "react";
import { StructureParamsResponse } from "@/features/structure-params/models/types";
import {
  CustomerEnrollmentDetailsResponseSchema,
} from "../models/types";

/** Score de correspondance entre les données saisies et les données SigKyc */
export type CorrespondenceScore = {
  matched: number;
  total: number;
  percentage: number;
};

type EnterpriseFormSnapshot = {
  label: string;
  phone: string;
  email: string;
  ninea: string;
  fiscalIdentity: string;
};

type ParticulierFormSnapshot = {
  lastName: string;
  firstName: string;
  phone: string;
  email: string;
  pieceType: string;
  pieceNumber: string;
  dateOfBirth: string;
  deliveryDate: string;
  expiryDate: string;
};

const diacriticPattern = /[\u0300-\u036f]/u;

export const normalizeForScore = (value: string | null | undefined): string =>
  Array.from((value ?? "").normalize("NFD"))
    .filter((char) => !diacriticPattern.test(char))
    .join("")
    .trim()
    .toLowerCase();

const normalizeDocType = (value: string | null | undefined): string => {
  const normalized = Array.from(normalizeForScore(value))
    .map((char) => (char === "_" || char === "-" ? " " : char))
    .join("")
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .join(" ")
    .trim();

  if (!normalized) return "";

  if (["cni", "carte nationale d identite", "national identity card", "national id", "id card"].includes(normalized)) {
    return "cni";
  }
  if (["passport", "passeport"].includes(normalized)) return "passport";
  if (["ninea", "ninea number"].includes(normalized)) return "ninea";

  return normalized;
};

const buildEnterpriseChecks = (
  enterpriseForm: EnterpriseFormSnapshot,
  sig: NonNullable<CustomerEnrollmentDetailsResponseSchema["sibKyc"]>,
  structureParams: StructureParamsResponse | null,
): boolean[] => {
  const checks: boolean[] = [];

  const thresholdLibelle = structureParams?.kyc_match_libelle_pct;
  const thresholdNinea = structureParams?.kyc_match_ninea_pct;
  const thresholdNif = structureParams?.kyc_match_num_identite_fiscale_pct;

  if (thresholdLibelle !== null && thresholdLibelle !== undefined) {
    const sim1 = getStringSimilarity(enterpriseForm.label, sig.firstName);
    const sim2 = getStringSimilarity(enterpriseForm.label, sig.lastName);
    checks.push(Math.max(sim1, sim2) >= thresholdLibelle);
  }

  if (thresholdNinea !== null && thresholdNinea !== undefined) {
    const sim1 = getStringSimilarity(enterpriseForm.ninea, sig.idNumber);
    const sim2 = getStringSimilarity(enterpriseForm.ninea, sig.nationalId);
    checks.push(Math.max(sim1, sim2) >= thresholdNinea);
  }

  if (thresholdNif !== null && thresholdNif !== undefined) {
    const sim1 = getStringSimilarity(enterpriseForm.fiscalIdentity, sig.nationalId);
    const sim2 = getStringSimilarity(enterpriseForm.fiscalIdentity, sig.idNumber);
    checks.push(Math.max(sim1, sim2) >= thresholdNif);
  }

  return checks;
};

const getLevenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

export const getStringSimilarity = (s1: string, s2: string): number => {
  const norm1 = normalizeForScore(s1);
  const norm2 = normalizeForScore(s2);
  if (!norm1 && !norm2) return 100;
  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 100;

  const distance = getLevenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  return Math.round((1 - distance / maxLength) * 100);
};

const buildParticulierChecks = (
  particulierForm: ParticulierFormSnapshot,
  sig: NonNullable<CustomerEnrollmentDetailsResponseSchema["sibKyc"]>,
  structureParams: StructureParamsResponse | null,
): boolean[] => {
  const checks: boolean[] = [];

  const thresholdNom = structureParams?.kyc_match_nom_pct;
  const thresholdPrenom = structureParams?.kyc_match_prenom_pct;
  const thresholdBirth = structureParams?.kyc_match_date_naissance_pct;

  if (thresholdNom !== null && thresholdNom !== undefined) {
    const sim = getStringSimilarity(particulierForm.lastName, sig.lastName);
    checks.push(sim >= thresholdNom);
  }

  if (thresholdPrenom !== null && thresholdPrenom !== undefined) {
    const sim = getStringSimilarity(particulierForm.firstName, sig.firstName);
    checks.push(sim >= thresholdPrenom);
  }

  if (thresholdBirth !== null && thresholdBirth !== undefined) {
    const birthMatch = particulierForm.dateOfBirth === sig.dateOfBirth;
    checks.push((birthMatch ? 100 : 0) >= thresholdBirth);
  }

  return checks;
};

export const useEnrollmentCorrespondenceScore = (
  isPending: boolean,
  isEntreprise: boolean,
  viewClientDetails: CustomerEnrollmentDetailsResponseSchema | null,
  enterpriseForm: EnterpriseFormSnapshot,
  particulierForm: ParticulierFormSnapshot,
  fallbackScore: CorrespondenceScore | null,
  structureParams: StructureParamsResponse | null,
): CorrespondenceScore | null => {
  return useMemo(() => {
    if (!isPending || !viewClientDetails?.sibKyc) {
      return fallbackScore;
    }

    const sig = viewClientDetails.sibKyc;
    const checks: boolean[] = [];

    // Nom check
    if (structureParams?.kyc_match_nom_pct !== null && structureParams?.kyc_match_nom_pct !== undefined) {
      const sim = getStringSimilarity(particulierForm.lastName, sig.lastName || "");
      checks.push(sim >= structureParams.kyc_match_nom_pct);
    }

    // Prénom check
    if (structureParams?.kyc_match_prenom_pct !== null && structureParams?.kyc_match_prenom_pct !== undefined) {
      const sim = getStringSimilarity(particulierForm.firstName, sig.firstName || "");
      checks.push(sim >= structureParams.kyc_match_prenom_pct);
    }

    // Date de naissance check
    if (structureParams?.kyc_match_date_naissance_pct !== null && structureParams?.kyc_match_date_naissance_pct !== undefined) {
      const birthMatch = particulierForm.dateOfBirth === sig.dateOfBirth;
      checks.push((birthMatch ? 100 : 0) >= structureParams.kyc_match_date_naissance_pct);
    }

    // Dénomination (Libellé) check
    if (structureParams?.kyc_match_libelle_pct !== null && structureParams?.kyc_match_libelle_pct !== undefined) {
      const targetSigLabel = sig.label || sig.firstName || sig.lastName || "";
      const sim = getStringSimilarity(enterpriseForm.label, targetSigLabel);
      checks.push(sim >= structureParams.kyc_match_libelle_pct);
    }

    // Ninea check
    if (structureParams?.kyc_match_ninea_pct !== null && structureParams?.kyc_match_ninea_pct !== undefined) {
      const targetSigNinea = sig.ninea || sig.idNumber || sig.nationalId || "";
      const sim = getStringSimilarity(enterpriseForm.ninea, targetSigNinea);
      checks.push(sim >= structureParams.kyc_match_ninea_pct);
    }

    // NIF check
    if (structureParams?.kyc_match_num_identite_fiscale_pct !== null && structureParams?.kyc_match_num_identite_fiscale_pct !== undefined) {
      const targetSigNif = sig.fiscalIdentity || sig.nationalId || sig.idNumber || "";
      const sim = getStringSimilarity(enterpriseForm.fiscalIdentity, targetSigNif);
      checks.push(sim >= structureParams.kyc_match_num_identite_fiscale_pct);
    }

    if (checks.length === 0) return null;

    const matched = checks.filter(Boolean).length;
    return {
      matched,
      total: checks.length,
      percentage: Math.round((matched / checks.length) * 100),
    };
  }, [isPending, viewClientDetails, enterpriseForm, particulierForm, fallbackScore, structureParams]);
};
