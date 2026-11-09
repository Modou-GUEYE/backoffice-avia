import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { can } from "@/core/permissions/permissions";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import { getCurrentInstitutionId, getCurrentDistributorId } from "@/core/security/authStore";
import { useAgencyCatalogStore } from "@/core/references/agencyCatalogStore";
import { fetchAgences } from "@/features/agences/services/agencesService";
import { AgencyParentType } from "@/features/agences/models/types";
import { CaisseForm, CaisseRead, CaisseSummary, FetchCaissesParams } from "../models/types";
import { emptyForm } from "../models/data";
import {
  activateCaisse,
  CaisseServiceError,
  createCaisse,
  deactivateCaisse,
  deleteCaisse,
  fetchCaisses,
  hasCaisseDuplicate,
  updateCaisse,
} from "../services/caissesService";
import { FieldErrors, hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";

export type CaisseFormField = "agency_id" | "name" | "code";

/** Valide le nom et le code d'une caisse (obligatoires, longueurs attendues par l'API). */
export const validateCaisseNameCode = (
  rawName: string,
  rawCode: string | null | undefined,
): FieldErrors<"name" | "code"> => {
  const errors: FieldErrors<"name" | "code"> = {};
  const name = rawName.trim();
  const code = rawCode?.trim() ?? "";

  if (!name) errors.name = "Le nom de la caisse est obligatoire";
  else if (name.length < 2 || name.length > 255) {
    errors.name = "Le nom de la caisse doit contenir entre 2 et 255 caractères";
  }

  if (!code) errors.code = "Le code de la caisse est obligatoire";
  else if (code.length < 2 || code.length > 50) {
    errors.code = "Le code de la caisse doit contenir entre 2 et 50 caractères";
  }

  return errors;
};

/** Valide le formulaire caisse et renvoie toutes les erreurs, par champ. */
export const validateCaisseForm = (form: CaisseForm): FieldErrors<CaisseFormField> => {
  const errors: FieldErrors<CaisseFormField> = {};
  if (!form.agency_id) errors.agency_id = "L'agence de rattachement est obligatoire";
  return { ...errors, ...validateCaisseNameCode(form.name, form.code) };
};

export const useCaisses = () => {
  const [caisses, setCaisses] = useState<CaisseRead[]>([]);
  const [summary, setSummary] = useState<CaisseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterAgencyId, setFilterAgencyId] = useState("all");
  const [filterStatut, setFilterStatut] = useState("all");
  const [filterParentType, setFilterParentType] = useState<"all" | AgencyParentType>("all");

  // Agencies
  const [liveAgenceOptions, setLiveAgenceOptions] = useState<
    Array<{
      id: string;
      nom: string;
      parent_id?: string | null;
      parent_type?: "STRUCTURE" | "DISTRIBUTOR" | null;
    }>
  >([]);

  // Dialogs
  const [dialogOpen, setDialogOpenState] = useState(false);
  const {
    errors: formErrors,
    setErrors: setFormErrors,
    clearError: clearFormError,
    resetErrors: resetFormErrors,
  } = useFieldErrors<CaisseFormField>();

  const setDialogOpen = (open: boolean) => {
    // Chaque ouverture ou fermeture repart d'un formulaire sans erreur affichée
    resetFormErrors();
    setDialogOpenState(open);
  };
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [editingCaisse, setEditingCaisse] = useState<CaisseRead | null>(null);
  const [detailCaisse, setDetailCaisse] = useState<CaisseRead | null>(null);
  const [deletingCaisse, setDeletingCaisse] = useState<CaisseRead | null>(null);
  const [statusTargetCaisse, setStatusTargetCaisse] = useState<CaisseRead | null>(null);
  const [statusNextAction, setStatusNextAction] = useState<"activate" | "deactivate" | null>(null);

  const [form, setForm] = useState<CaisseForm>(emptyForm);

  const { currentActorRole, entityContext: connectedEntityContext, currentPermissions } = useCurrentActor();
  const entityContext = "Caisse" as const;

  const permissions = {
    canRead: can(currentActorRole, "read", entityContext, currentPermissions),
    canCreate: can(currentActorRole, "create", entityContext, currentPermissions),
    canUpdate: can(currentActorRole, "update", entityContext, currentPermissions),
    canDelete: can(currentActorRole, "delete", entityContext, currentPermissions),
  };

  const isStructure = connectedEntityContext === "Structure";
  const isDistributor = connectedEntityContext === "Distributeur";
  const isRestrictedContext = isStructure || isDistributor;

  const catalogAgencies = useAgencyCatalogStore((state) => state.items);
  const mergeAgencyCatalog = useAgencyCatalogStore((state) => state.mergeFromList);

  const agenceOptions = useMemo(() => {
    if (liveAgenceOptions.length > 0) {
      return liveAgenceOptions.map((a) => ({
        id: a.id,
        nom: a.nom,
        parent_id: a.parent_id,
        parent_type: a.parent_type,
      }));
    }
    return catalogAgencies.map((a) => ({ id: a.id, nom: a.nom }));
  }, [liveAgenceOptions, catalogAgencies]);

  const resolveAgencyLabel = useCallback(
    (agencyId: string) =>
      liveAgenceOptions.find((a) => a.id.toLowerCase() === agencyId.toLowerCase())?.nom ??
      catalogAgencies.find((a) => a.id.toLowerCase() === agencyId.toLowerCase())?.nom,
    [liveAgenceOptions, catalogAgencies]
  );

  const resolveParentTypeLabel = useCallback(
    (agencyId: string) =>
      liveAgenceOptions.find((a) => a.id === agencyId)?.parent_type || undefined,
    [liveAgenceOptions]
  );

  const readErrorMessage = (errorInput: unknown) => {
    const serviceError = errorInput as CaisseServiceError | Error;
    if (typeof (serviceError as CaisseServiceError)?.message === "string") {
      return (serviceError as CaisseServiceError).message;
    }
    return "Une erreur est survenue";
  };

  // Direct backend loader with all real query parameters
  const loadCaisses = useCallback(
    async (paramsOverride?: {
      search?: string;
      agencyId?: string;
      statut?: string;
      parentType?: "all" | AgencyParentType;
    }) => {
      const searchVal = paramsOverride?.search !== undefined ? paramsOverride.search : search;
      const agencyVal = paramsOverride?.agencyId !== undefined ? paramsOverride.agencyId : filterAgencyId;
      const statutVal = paramsOverride?.statut !== undefined ? paramsOverride.statut : filterStatut;
      const parentTypeVal = paramsOverride?.parentType !== undefined ? paramsOverride.parentType : filterParentType;

      const institutionId = getCurrentInstitutionId();
      const distributorId = getCurrentDistributorId();
      const isDistributorUser = connectedEntityContext === "Distributeur";

      const dataFilter: FetchCaissesParams = {};

      if (parentTypeVal !== "all") {
        dataFilter.parent_type = parentTypeVal;
      }

      if (connectedEntityContext === "Structure" && institutionId) {
        dataFilter.parent_id = institutionId;
      } else if (isDistributorUser && distributorId) {
        dataFilter.parent_id = distributorId;
      }

      if (agencyVal !== "all") {
        dataFilter.agency_id = agencyVal;
      }
      if (searchVal.trim()) {
        dataFilter.search = searchVal.trim();
      }
      if (statutVal === "active") {
        dataFilter.is_active = true;
      } else if (statutVal === "inactive") {
        dataFilter.is_active = false;
      }

      setLoading(true);
      try {
        const data = await fetchCaisses(dataFilter);
        setCaisses(data);
        setSummary(data.summary ?? null);
        setError(null);
      } catch (err) {
        console.error("[useCaisses] Erreur chargement caisses:", err);
        setCaisses([]);
        setSummary(null);
        setError("Impossible de charger les caisses");
      } finally {
        setLoading(false);
      }
    },
    [search, filterAgencyId, filterStatut, filterParentType, connectedEntityContext]
  );

  // Debounced search / filter without any local JavaScript filtering
  const prevFiltersRef = useRef({
    search,
    agency: filterAgencyId,
    statut: filterStatut,
    parentType: filterParentType,
  });
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      void loadCaisses();
      return;
    }

    const changed =
      prevFiltersRef.current.search !== search ||
      prevFiltersRef.current.agency !== filterAgencyId ||
      prevFiltersRef.current.statut !== filterStatut ||
      prevFiltersRef.current.parentType !== filterParentType;

    prevFiltersRef.current = {
      search,
      agency: filterAgencyId,
      statut: filterStatut,
      parentType: filterParentType,
    };
    if (!changed) return;

    const timer = setTimeout(() => {
      void loadCaisses();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, filterAgencyId, filterStatut, filterParentType, loadCaisses]);

  // Préchargement des agences pour résoudre les noms dans le tableau et alimenter le filtre
  const loadAgencies = useCallback(async () => {
    const institutionId = getCurrentInstitutionId();
    const distributorId = getCurrentDistributorId();

    const dataFilter: { parent_id?: string; parent_type?: string } = {};

    if (connectedEntityContext === "Structure" && institutionId) {
      dataFilter.parent_id = institutionId;
      dataFilter.parent_type = "STRUCTURE";
    } else if (isDistributor && distributorId) {
      dataFilter.parent_id = distributorId;
      dataFilter.parent_type = "DISTRIBUTOR";
    }

    try {
      const data = await fetchAgences(Object.keys(dataFilter).length > 0 ? dataFilter : undefined);
      const options = data.map((item) => ({
        id: item.id,
        nom: item.name,
        parent_id: item.parent_id,
        parent_type: item.parent_type,
      }));
      setLiveAgenceOptions(options);
      mergeAgencyCatalog(options.map((item) => ({ id: item.id, nom: item.nom })));
    } catch {
      setLiveAgenceOptions([]);
    }
  }, [connectedEntityContext, isDistributor, isStructure, mergeAgencyCatalog]);

  // Solution C : Chargement automatique en parallèle des agences au montage
  useEffect(() => {
    void loadAgencies();
  }, [loadAgencies]);

  const openAdd = () => {
    if (!permissions.canCreate) {
      toast.error("Vous n'avez pas l'habilitation pour ajouter une caisse");
      return;
    }

    void loadAgencies();
    setEditingCaisse(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openDetail = (c: CaisseRead) => {
    void loadAgencies();
    setDetailCaisse(c);
    setDetailDialogOpen(true);
  };

  const openEdit = (c: CaisseRead) => {
    if (!permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour modifier une caisse");
      return;
    }

    void loadAgencies();
    setEditingCaisse(c);
    setForm({
      name: c.name,
      code: c.code,
      agency_id: c.agency_id,
    });
    setDialogOpen(true);
  };

  const getParentType = (): "STRUCTURE" | "DISTRIBUTOR" | undefined => {
    if (isStructure) return "STRUCTURE";
    if (isDistributor) return "DISTRIBUTOR";
    return undefined;
  };

  const validateForm = (): { name: string; code: string } | null => {
    const errors = validateCaisseForm(form);
    setFormErrors(errors);
    if (hasFieldErrors(errors)) return null;

    return { name: form.name.trim(), code: form.code?.trim() ?? "" };
  };

  const handleSave = async () => {
    if (editingCaisse && !permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour modifier une caisse");
      return;
    }
    if (!editingCaisse && !permissions.canCreate) {
      toast.error("Vous n'avez pas l'habilitation pour ajouter une caisse");
      return;
    }

    const validated = validateForm();
    if (!validated) return;

    try {
      const selectedAgency = liveAgenceOptions.find((a) => a.id === form.agency_id);
      const institutionId = getCurrentInstitutionId();
      const distributorId = getCurrentDistributorId();
      const parentId = institutionId || distributorId || selectedAgency?.parent_id || undefined;
      const parentType = getParentType() || (selectedAgency?.parent_type as "STRUCTURE" | "DISTRIBUTOR" | undefined);

      if (editingCaisse) {
        const duplicate = await hasCaisseDuplicate(validated.code, form.agency_id, editingCaisse.id);
        if (duplicate) {
          toast.error("La caisse existe déjà!");
          return;
        }

        const updated = await updateCaisse(editingCaisse.id, {
          name: validated.name,
          code: validated.code,
          agency_id: form.agency_id,
          parent_id: parentId,
          parent_type: parentType,
        });
        setCaisses((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        toast.success("Caisse modifiée avec succès");
      } else {
        const duplicate = await hasCaisseDuplicate(validated.code, form.agency_id);
        if (duplicate) {
          toast.error("La caisse existe déjà!");
          return;
        }

        const created = await createCaisse({
          name: validated.name,
          code: validated.code,
          agency_id: form.agency_id,
          parent_id: parentId,
          parent_type: parentType,
        });
        setCaisses((prev) => [created, ...prev]);
        toast.success("Caisse ajoutée avec succès");
      }

      setDialogOpen(false);
      setForm(emptyForm);
      void loadCaisses();
    } catch (error_) {
      toast.error(readErrorMessage(error_));
    }
  };

  const openDelete = (c: CaisseRead) => {
    if (!permissions.canDelete) {
      toast.error("Vous n'avez pas l'habilitation pour supprimer une caisse");
      return;
    }

    setDeletingCaisse(c);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!permissions.canDelete) {
      toast.error("Vous n'avez pas l'habilitation pour supprimer une caisse");
      return;
    }

    if (!deletingCaisse) return;

    try {
      await deleteCaisse(deletingCaisse.id);
      setCaisses((prev) => prev.filter((item) => item.id !== deletingCaisse.id));
      toast.success("Caisse supprimée");
      setDeleteDialogOpen(false);
      setDeletingCaisse(null);
      void loadCaisses();
    } catch (error_) {
      toast.error(readErrorMessage(error_));
    }
  };

  const requestToggleStatut = (caisse: CaisseRead) => {
    if (!permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour modifier le statut");
      return;
    }

    setStatusTargetCaisse(caisse);
    setStatusNextAction(caisse.is_active ? "deactivate" : "activate");
    setStatusDialogOpen(true);
  };

  const confirmToggleStatut = async () => {
    if (!statusTargetCaisse || !statusNextAction) {
      return;
    }

    try {
      const updated =
        statusNextAction === "deactivate"
          ? await deactivateCaisse(statusTargetCaisse.id)
          : await activateCaisse(statusTargetCaisse.id);
      setCaisses((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setStatusDialogOpen(false);
      setStatusTargetCaisse(null);
      setStatusNextAction(null);
      toast.success("Statut mis à jour");
      void loadCaisses();
    } catch (error_) {
      toast.error(readErrorMessage(error_));
    }
  };

  const cancelToggleStatut = () => {
    setStatusDialogOpen(false);
    setStatusTargetCaisse(null);
    setStatusNextAction(null);
  };

  const statusDialogTitle =
    statusNextAction === "deactivate"
      ? "Confirmer la désactivation"
      : "Confirmer l'activation";

  let statusDialogDescription = "";
  if (statusTargetCaisse) {
    statusDialogDescription =
      statusNextAction === "deactivate"
        ? `Voulez-vous désactiver la caisse « ${statusTargetCaisse.name} » ?`
        : `Voulez-vous activer la caisse « ${statusTargetCaisse.name} » ?`;
  }

  const statusConfirmLabel = statusNextAction === "deactivate" ? "Désactiver" : "Activer";

  const statutBadge = (isActive: boolean) =>
    isActive
      ? "bg-accent/15 text-accent border-accent/30 hover:bg-accent/20"
      : "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20";

  return {
    caisses,
    filtered: caisses,
    summary,
    currentActorRole,
    entityContext,
    permissions,
    isRestrictedContext,
    agenceOptions,
    loadAgencies,
    loading,
    error,
    search,
    setSearch,
    filterAgencyId,
    setFilterAgencyId,
    filterStatut,
    setFilterStatut,
    filterParentType,
    setFilterParentType,
    dialogOpen,
    setDialogOpen,
    detailDialogOpen,
    setDetailDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    statusDialogOpen,
    setStatusDialogOpen,
    statusTargetCaisse,
    statusNextAction,
    statusDialogTitle,
    statusDialogDescription,
    statusConfirmLabel,
    editingCaisse,
    detailCaisse,
    setDetailCaisse,
    deletingCaisse,
    setDeletingCaisse,
    form,
    setForm,
    formErrors,
    clearFormError,
    openAdd,
    openDetail,
    openEdit,
    openDelete,
    handleSave,
    handleDelete,
    resolveAgencyLabel,
    resolveParentTypeLabel,
    requestToggleStatut,
    confirmToggleStatut,
    cancelToggleStatut,
    statutBadge,
  };
};
