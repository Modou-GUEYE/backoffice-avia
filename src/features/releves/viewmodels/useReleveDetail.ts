import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/core/security/authStore";
import { useUserPerimeter } from "@/core/security/useUserPerimeter";
import { fetchStructureById } from "@/features/structures/services/structuresService";
import { RelevePermissions, hasRelevePermission } from "@/core/permissions/permissions";
import { FieldErrors, hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import type { BeneficiaireType, NotificationReleve, Releve, ReleveExportFormat } from "../models/types";
import {
  createCorrection,
  downloadReleveExport,
  fetchReleve,
  figerReleve,
  generateReleve,
  notifierReleve,
} from "../services/relevesService";

export type CorrectionFormField = "motif" | "montant" | "beneficiaireType" | "beneficiaireId";

export interface CorrectionFormState {
  motif: string;
  montant: string;
  beneficiaireType: BeneficiaireType;
  beneficiaireId: string;
}

export const emptyCorrectionForm: CorrectionFormState = {
  motif: "",
  montant: "",
  beneficiaireType: "structure",
  beneficiaireId: "",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const AMOUNT_PATTERN = /^-?\d+(\.\d+)?$/;

/** Règles du contrat CorrectionCreateIn : motif et montant obligatoires, bénéficiaire précis hors structure. */
export const validateCorrectionForm = (form: CorrectionFormState): FieldErrors<CorrectionFormField> => {
  const errors: FieldErrors<CorrectionFormField> = {};
  if (!form.motif.trim()) errors.motif = "Le motif est obligatoire";
  const montant = form.montant.trim().replace(",", ".");
  if (!montant) errors.montant = "Le montant est obligatoire";
  else if (!AMOUNT_PATTERN.test(montant)) errors.montant = "Montant invalide (ex. 1500 ou -30)";
  else if (Number(montant) === 0) errors.montant = "Le montant doit être différent de 0";
  if (form.beneficiaireType !== "structure" && !form.beneficiaireId.trim()) {
    errors.beneficiaireId = "L'identifiant du bénéficiaire est obligatoire hors structure";
  }
  return errors;
};

export const isReleveFige = (releve: Pick<Releve, "statut"> | null | undefined): boolean =>
  releve?.statut?.toLowerCase() === "fige";

export const useReleveDetail = (releveId: string | undefined) => {
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions;
  // Auteur envoyé à l'API (fige_par / cree_par) en attendant sa déduction côté serveur depuis le jeton
  const actorLogin = user?.username || user?.email || "";

  const perimeter = useUserPerimeter();
  const [releve, setReleve] = useState<Releve | null>(null);
  const [structureName, setStructureName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [exporting, setExporting] = useState<ReleveExportFormat | null>(null);

  const load = useCallback(async () => {
    if (!releveId) return;
    setLoading(true);
    setError(null);
    try {
      setReleve(await fetchReleve(releveId));
    } catch (err) {
      setReleve(null);
      setError(err instanceof Error ? err.message : "Impossible de charger le relevé.");
    } finally {
      setLoading(false);
    }
  }, [releveId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Le relevé ne porte que l'identifiant de la structure : son nom vient du jeton (sa propre structure)
  // ou de la Gestion Institutionnelle par identifiant ; à défaut, l'identifiant est affiché
  const releveStructureId = releve?.structure ?? null;
  useEffect(() => {
    if (!releveStructureId) {
      setStructureName(null);
      return;
    }
    if (releveStructureId === perimeter.enforcedStructureId && perimeter.enforcedStructureLabel) {
      setStructureName(perimeter.enforcedStructureLabel);
      return;
    }
    // La Gestion Institutionnelle n'accepte qu'un UUID : une autre valeur (ancien relevé au nom) est affichée telle quelle
    if (!UUID_PATTERN.test(releveStructureId)) {
      setStructureName(null);
      return;
    }
    let isMounted = true;
    setStructureName(null);
    fetchStructureById(releveStructureId)
      .then((structure) => {
        if (isMounted) setStructureName(structure?.name?.trim() || null);
      })
      .catch(() => {
        if (isMounted) setStructureName(null);
      });
    return () => {
      isMounted = false;
    };
  }, [releveStructureId, perimeter.enforcedStructureId, perimeter.enforcedStructureLabel]);

  const isFige = isReleveFige(releve);
  const canRead = hasRelevePermission(permissions, RelevePermissions.read);
  const canGenerate = hasRelevePermission(permissions, RelevePermissions.generate);
  const canFreeze = hasRelevePermission(permissions, RelevePermissions.freeze);
  const canCorrect = hasRelevePermission(permissions, RelevePermissions.correct);
  const canExport = hasRelevePermission(permissions, RelevePermissions.export);
  const canNotify = hasRelevePermission(permissions, RelevePermissions.notify);

  const recalculate = async () => {
    if (!releve || isFige) return;
    setActionLoading(true);
    try {
      setReleve(await generateReleve({ structure_id: releve.structure, annee: releve.annee, mois: releve.mois }));
      toast.success("Relevé recalculé");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de recalculer le relevé.");
    } finally {
      setActionLoading(false);
    }
  };

  const [freezeConfirmOpen, setFreezeConfirmOpen] = useState(false);

  const freeze = async () => {
    if (!releve || isFige) return;
    setActionLoading(true);
    try {
      setReleve(await figerReleve(releve.id, actorLogin));
      toast.success("Relevé figé : la période est clôturée");
      setFreezeConfirmOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de figer le relevé.");
    } finally {
      setActionLoading(false);
    }
  };

  const exportReleve = async (format: ReleveExportFormat) => {
    if (!releve) return;
    setExporting(format);
    try {
      await downloadReleveExport(releve, format);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'exporter le relevé.");
    } finally {
      setExporting(null);
    }
  };

  // ===== Notification (contenu préparé par l'API, aucun envoi) =====
  const [notification, setNotification] = useState<NotificationReleve | null>(null);
  const [notifying, setNotifying] = useState(false);

  const prepareNotification = async () => {
    if (!releve) return;
    setNotifying(true);
    try {
      setNotification(await notifierReleve(releve.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de préparer la notification du relevé.");
    } finally {
      setNotifying(false);
    }
  };

  const closeNotification = () => setNotification(null);

  // ===== Correction (relevé figé, imputée sur M+1) =====
  const [correctionOpen, setCorrectionOpenState] = useState(false);
  const [correctionForm, setCorrectionForm] = useState<CorrectionFormState>(emptyCorrectionForm);
  const {
    errors: correctionErrors,
    setErrors: setCorrectionErrors,
    clearError: clearCorrectionError,
    resetErrors: resetCorrectionErrors,
  } = useFieldErrors<CorrectionFormField>();

  const setCorrectionOpen = (open: boolean) => {
    if (open) {
      setCorrectionForm(emptyCorrectionForm);
      resetCorrectionErrors();
    }
    setCorrectionOpenState(open);
  };

  const updateCorrectionField = <K extends CorrectionFormField>(field: K, value: CorrectionFormState[K]) => {
    clearCorrectionError(field);
    if (field === "beneficiaireType") clearCorrectionError("beneficiaireId");
    setCorrectionForm((prev) => ({ ...prev, [field]: value }));
  };

  const submitCorrection = async () => {
    if (!releve || !isFige) return;
    const errors = validateCorrectionForm(correctionForm);
    setCorrectionErrors(errors);
    if (hasFieldErrors(errors)) return;

    setActionLoading(true);
    try {
      const correction = await createCorrection(releve.id, {
        motif: correctionForm.motif.trim(),
        montant: Number(correctionForm.montant.trim().replace(",", ".")),
        beneficiaire_type: correctionForm.beneficiaireType,
        beneficiaire_id:
          correctionForm.beneficiaireType === "structure"
            ? releve.structure
            : correctionForm.beneficiaireId.trim(),
        cree_par: actorLogin,
      });
      toast.success(
        `Correction enregistrée : elle sera reportée sur le relevé de ${String(correction.mois_cible).padStart(2, "0")}/${correction.annee_cible}`,
      );
      setCorrectionOpenState(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'enregistrer la correction.");
    } finally {
      setActionLoading(false);
    }
  };

  return {
    releve,
    structureLabel: structureName || releve?.structure || "",
    loading,
    error,
    reload: load,
    isFige,
    actionLoading,
    canRead,
    exporting,
    canGenerate,
    canFreeze,
    canCorrect,
    canExport,
    canNotify,
    notification,
    notifying,
    prepareNotification,
    closeNotification,
    recalculate,
    freezeConfirmOpen,
    setFreezeConfirmOpen,
    freeze,
    exportReleve,
    correctionOpen,
    setCorrectionOpen,
    correctionForm,
    correctionErrors,
    updateCorrectionField,
    submitCorrection,
  };
};
