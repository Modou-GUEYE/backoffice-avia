import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import { can } from "@/core/permissions/permissions";
import { useAgencyCatalogStore } from "@/core/references/agencyCatalogStore";
import { useStructureCatalogStore } from "@/core/references/structureCatalogStore";
import { fetchAgences } from "@/features/agences/services/agencesService";
import { emptyForm } from "../models/data";
import type { CaisseForm, CaisseRead } from "../models/types";
import {
  activateCaisse,
  type CaisseServiceError,
  deactivateCaisse,
  deleteCaisse,
  fetchCaisseById,
  hasCaisseDuplicate,
  updateCaisse,
} from "../services/caissesService";
import { hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import { type CaisseFormField, validateCaisseForm } from "./useCaisses";

export const useCaisseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [caisse, setCaisse] = useState<CaisseRead | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [agencyOptions, setAgencyOptions] = useState<Array<{ id: string; nom: string }>>([]);
  const [agencyName, setAgencyName] = useState<string>("");
  const [parentName, setParentName] = useState<string>("");

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpenState] = useState<boolean>(false);
  const {
    errors: editFormErrors,
    setErrors: setEditFormErrors,
    clearError: clearEditFormError,
    resetErrors: resetEditFormErrors,
  } = useFieldErrors<CaisseFormField>();

  const setEditDialogOpen = (open: boolean) => {
    // Chaque ouverture ou fermeture repart d'un formulaire sans erreur affichée
    resetEditFormErrors();
    setEditDialogOpenState(open);
  };
  const [editForm, setEditForm] = useState<CaisseForm>(emptyForm);

  // Status toggle dialog state
  const [statusDialogOpen, setStatusDialogOpen] = useState<boolean>(false);
  const [statusNextAction, setStatusNextAction] = useState<"activate" | "deactivate" | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

  const { currentActorRole, currentPermissions } = useCurrentActor();
  const entityContext = "Caisse" as const;

  const permissions = {
    canUpdate: can(currentActorRole, "update", entityContext, currentPermissions),
    canDelete: can(currentActorRole, "delete", entityContext, currentPermissions),
  };

  const catalogAgencies = useAgencyCatalogStore((state) => state.items);
  const catalogStructures = useStructureCatalogStore((state) => state.items);

  const readErrorMessage = (errorInput: unknown) => {
    const serviceError = errorInput as CaisseServiceError | Error;
    if (typeof (serviceError as CaisseServiceError)?.message === "string") {
      return (serviceError as CaisseServiceError).message;
    }
    return "Une erreur est survenue";
  };

  // Chargement direct de la caisse via GET /api/v1/organisation/caisses/{id}
  const loadCaisse = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchCaisseById(id);
      setCaisse(data);

      // Préremplissage du formulaire d'édition
      setEditForm({
        name: data.name,
        code: data.code ?? "",
        agency_id: data.agency_id,
      });

      // Résolution du nom d'agence depuis le store ou l'API
      const foundAgency = catalogAgencies.find(
        (a) => a.id.toLowerCase() === data.agency_id.toLowerCase()
      );
      if (foundAgency) {
        setAgencyName(foundAgency.nom);
      } else {
        fetchAgences()
          .then((agencies) => {
            const ag = agencies.find((item) => item.id.toLowerCase() === data.agency_id.toLowerCase());
            if (ag) {
              setAgencyName(ag.name);
            }
            setAgencyOptions(agencies.map((item) => ({ id: item.id, nom: item.name })));
          })
          .catch(() => {});
      }

      // Résolution de l'entité parente
      if (data.parent_id) {
        const foundStructure = catalogStructures.find(
          (s) => s.id.toLowerCase() === data.parent_id?.toLowerCase()
        );
        if (foundStructure) {
          setParentName(foundStructure.nom);
        }
      }
    } catch (err) {
      console.error("[useCaisseDetail] Erreur chargement caisse:", err);
      setError("Impossible de charger les informations de la caisse");
      setCaisse(null);
    } finally {
      setLoading(false);
    }
  }, [id, catalogAgencies, catalogStructures]);

  useEffect(() => {
    void loadCaisse();
  }, [loadCaisse]);

  const openEdit = () => {
    if (!permissions.canUpdate || !caisse) {
      toast.error("Vous n'avez pas l'habilitation pour modifier cette caisse");
      return;
    }
    setEditForm({
      name: caisse.name,
      code: caisse.code ?? "",
      agency_id: caisse.agency_id,
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!caisse || !permissions.canUpdate) return;

    const validationErrors = validateCaisseForm(editForm);
    setEditFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    const name = editForm.name.trim();
    const code = editForm.code?.trim() ?? "";

    try {
      const isDuplicate = await hasCaisseDuplicate(code, editForm.agency_id, caisse.id);
      if (isDuplicate) {
        toast.error("La caisse existe déjà!");
        return;
      }

      const updated = await updateCaisse(caisse.id, {
        name,
        code,
        agency_id: editForm.agency_id,
        parent_id: caisse.parent_id,
        parent_type: caisse.parent_type,
      });

      setCaisse(updated);
      setEditDialogOpen(false);
      toast.success("Caisse modifiée avec succès");
      void loadCaisse();
    } catch (err) {
      toast.error(readErrorMessage(err));
    }
  };

  const requestToggleStatut = () => {
    if (!permissions.canUpdate || !caisse) {
      toast.error("Vous n'avez pas l'habilitation pour modifier le statut");
      return;
    }
    setStatusNextAction(caisse.is_active ? "deactivate" : "activate");
    setStatusDialogOpen(true);
  };

  const confirmToggleStatut = async () => {
    if (!caisse || !statusNextAction) return;

    try {
      if (statusNextAction === "activate") {
        await activateCaisse(caisse.id);
        toast.success(`La caisse « ${caisse.name} » a été activée`);
      } else {
        await deactivateCaisse(caisse.id);
        toast.success(`La caisse « ${caisse.name} » a été désactivée`);
      }
      setStatusDialogOpen(false);
      void loadCaisse();
    } catch (err) {
      toast.error(readErrorMessage(err));
    }
  };

  const openDelete = () => {
    if (!permissions.canDelete || !caisse) {
      toast.error("Vous n'avez pas l'habilitation pour supprimer cette caisse");
      return;
    }
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!caisse || !permissions.canDelete) return;

    try {
      await deleteCaisse(caisse.id);
      toast.success("Caisse supprimée avec succès");
      setDeleteDialogOpen(false);
      navigate("/dashboard/caisses");
    } catch (err) {
      toast.error(readErrorMessage(err));
    }
  };

  return {
    caisse,
    loading,
    error,
    agencyName,
    parentName,
    agencyOptions,
    permissions,
    editDialogOpen,
    setEditDialogOpen,
    editForm,
    setEditForm,
    editFormErrors,
    clearEditFormError,
    statusDialogOpen,
    setStatusDialogOpen,
    statusNextAction,
    deleteDialogOpen,
    setDeleteDialogOpen,
    openEdit,
    handleSave,
    requestToggleStatut,
    confirmToggleStatut,
    openDelete,
    handleDelete,
    loadCaisse,
  };
};
