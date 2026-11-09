import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAuthStore, getCurrentInstitutionId } from "@/core/security/authStore";
import { fetchStructures } from "@/features/structures/services/structuresService";
import { StructureRead } from "@/features/structures/models/types";
import { StructureParamsResponse, UpdateStructureParamsRequest } from "../models/types";
import {
  fetchStructureParams,
  updateStructureParams,
  resetStructureParams,
  fetchDefaultStructureParams,
  updateDefaultStructureParams,
} from "../services/structureParamsService";

export interface UseStructureParamsOptions {
  enabled?: boolean;
}

export const useStructureParams = (options?: UseStructureParamsOptions) => {
  const enabled = options?.enabled ?? true;
  const currentUser = useAuthStore((state) => state.user);
  const isStructureAdmin = currentUser?.entityContext === "Structure";
  const resolvedInstitutionId = currentUser?.institutionId || getCurrentInstitutionId() || "";

  // Structure options for dropdown (only for Central / Admin roles)
  const [structures, setStructures] = useState<StructureRead[]>([]);
  const [isLoadingStructures, setIsLoadingStructures] = useState(false);
  const [selectedStructureId, setSelectedStructureId] = useState<string>(
    isStructureAdmin ? resolvedInstitutionId : "GLOBAL_DEFAULTS"
  );

  // Parameters states
  const [structureParams, setStructureParams] = useState<StructureParamsResponse | null>(null);
  const [paramsForm, setParamsForm] = useState<UpdateStructureParamsRequest>({});
  const [isLoadingParams, setIsLoadingParams] = useState(false);
  const [isSavingParams, setIsSavingParams] = useState(false);

  // Load structures for selector
  const loadStructures = useCallback(async () => {
    if (isStructureAdmin) return;
    try {
      setIsLoadingStructures(true);
      const data = await fetchStructures();
      const activeStructures = data.filter((s) => !s.is_deleted && s.is_active);
      setStructures(activeStructures);
    } catch (err) {
      console.error("Erreur lors de la récupération des structures", err);
    } finally {
      setIsLoadingStructures(false);
    }
  }, [isStructureAdmin]);

  // Load params for a specific structure
  const loadParams = useCallback(async (structureId: string) => {
    if (!structureId) {
      setStructureParams(null);
      setParamsForm({});
      return;
    }
    try {
      setIsLoadingParams(true);
      const res =
        structureId === "GLOBAL_DEFAULTS"
          ? await fetchDefaultStructureParams()
          : await fetchStructureParams(structureId);
      setStructureParams(res);
      setParamsForm({
        compte_beneficiaire_format: res.compte_beneficiaire_format || "NUMERIC",
        compte_beneficiaire_length: res.compte_beneficiaire_length ?? null,
        double_auth_enabled: res.double_auth_enabled ?? false,
        kyc_match_date_naissance_pct: res.kyc_match_date_naissance_pct ?? null,
        kyc_match_nom_pct: res.kyc_match_nom_pct ?? null,
        kyc_match_prenom_pct: res.kyc_match_prenom_pct ?? null,
        kyc_match_libelle_pct: res.kyc_match_libelle_pct ?? null,
        kyc_match_ninea_pct: res.kyc_match_ninea_pct ?? null,
        kyc_match_num_identite_fiscale_pct: res.kyc_match_num_identite_fiscale_pct ?? null,
        ouverture_mutualisation: res.ouverture_mutualisation ?? false,
      });
    } catch (err) {
      console.error("Erreur chargement paramètres de structure", err);
      setStructureParams(null);
      setParamsForm({
        compte_beneficiaire_format: "NUMERIC",
        compte_beneficiaire_length: null,
        double_auth_enabled: false,
        kyc_match_date_naissance_pct: null,
        kyc_match_nom_pct: null,
        kyc_match_prenom_pct: null,
        kyc_match_libelle_pct: null,
        kyc_match_ninea_pct: null,
        kyc_match_num_identite_fiscale_pct: null,
        ouverture_mutualisation: false,
      });
    } finally {
      setIsLoadingParams(false);
    }
  }, []);

  // Initialize
  useEffect(() => {
    if (!enabled) return;
    void loadStructures();
  }, [enabled, loadStructures]);

  useEffect(() => {
    if (!enabled) return;
    if (selectedStructureId) {
      void loadParams(selectedStructureId);
    }
  }, [enabled, selectedStructureId, loadParams]);

  // Actions
  const handleSaveParams = async () => {
    if (!selectedStructureId) return;
    try {
      setIsSavingParams(true);
      let res: StructureParamsResponse;
      if (selectedStructureId === "GLOBAL_DEFAULTS") {
        res = await updateDefaultStructureParams(paramsForm);
        toast.success("Paramètres globaux par défaut enregistrés");
      } else {
        res = await updateStructureParams(selectedStructureId, paramsForm);
        toast.success("Paramètres de la structure enregistrés");
      }
      setStructureParams(res);
    } catch (err) {
      toast.error((err as { message?: string } | null | undefined)?.message || "Erreur lors de l'enregistrement des paramètres");
    } finally {
      setIsSavingParams(false);
    }
  };

  const handleResetParams = async () => {
    if (!selectedStructureId || selectedStructureId === "GLOBAL_DEFAULTS") return;
    try {
      setIsSavingParams(true);
      const res = await resetStructureParams(selectedStructureId);
      setStructureParams(res);
      setParamsForm({
        compte_beneficiaire_format: res.compte_beneficiaire_format || "NUMERIC",
        compte_beneficiaire_length: res.compte_beneficiaire_length ?? null,
        double_auth_enabled: res.double_auth_enabled ?? false,
        kyc_match_date_naissance_pct: res.kyc_match_date_naissance_pct ?? null,
        kyc_match_nom_pct: res.kyc_match_nom_pct ?? null,
        kyc_match_prenom_pct: res.kyc_match_prenom_pct ?? null,
        kyc_match_libelle_pct: res.kyc_match_libelle_pct ?? null,
        kyc_match_ninea_pct: res.kyc_match_ninea_pct ?? null,
        kyc_match_num_identite_fiscale_pct: res.kyc_match_num_identite_fiscale_pct ?? null,
        ouverture_mutualisation: res.ouverture_mutualisation ?? false,
      });
      toast.success("Paramètres réinitialisés avec succès aux valeurs par défaut");
    } catch (err) {
      toast.error((err as { message?: string } | null | undefined)?.message || "Erreur lors de la réinitialisation des paramètres");
    } finally {
      setIsSavingParams(false);
    }
  };

  return {
    isStructureAdmin,
    structures,
    isLoadingStructures,
    selectedStructureId,
    setSelectedStructureId,
    structureParams,
    paramsForm,
    setParamsForm,
    isLoadingParams,
    isSavingParams,
    handleSaveParams,
    handleResetParams,
    reloadParams: () => loadParams(selectedStructureId),
  };
};

export type UseStructureParamsReturn = ReturnType<typeof useStructureParams>;
