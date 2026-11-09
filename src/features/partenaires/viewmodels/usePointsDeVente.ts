import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FieldErrors, hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import type { PointDeVente } from "../models/types";
import {
  createPointDeVente,
  deletePointDeVente,
  fetchPointsDeVente,
  togglePointDeVenteStatus,
  updatePointDeVente,
} from "../services/partenairesService";

export interface PointDeVenteFormState {
  libelle: string;
  code: string;
  adresse: string;
  telephone: string;
}

export type PointDeVenteFormField = keyof PointDeVenteFormState;

export const emptyPointDeVenteForm: PointDeVenteFormState = {
  libelle: "",
  code: "",
  adresse: "",
  telephone: "",
};

/** Règles du contrat PointDeVenteCreate : libellé 2 à 255 caractères, code optionnel de 2 à 50 caractères. */
export const validatePointDeVenteForm = (form: PointDeVenteFormState): FieldErrors<PointDeVenteFormField> => {
  const errors: FieldErrors<PointDeVenteFormField> = {};
  const libelle = form.libelle.trim();
  const code = form.code.trim();

  if (!libelle) errors.libelle = "Le libellé est obligatoire";
  else if (libelle.length < 2 || libelle.length > 255) {
    errors.libelle = "Le libellé doit contenir entre 2 et 255 caractères";
  }
  if (code && (code.length < 2 || code.length > 50)) {
    errors.code = "Le code doit contenir entre 2 et 50 caractères";
  }
  return errors;
};

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export const usePointsDeVente = (partnerId: string | undefined, initialItems: PointDeVente[] = []) => {
  const [items, setItems] = useState<PointDeVente[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [dialogOpen, setDialogOpenState] = useState(false);
  const [editing, setEditing] = useState<PointDeVente | null>(null);
  const [form, setForm] = useState<PointDeVenteFormState>(emptyPointDeVenteForm);
  const [saving, setSaving] = useState(false);
  const { errors: formErrors, setErrors: setFormErrors, clearError: clearFormError, resetErrors } =
    useFieldErrors<PointDeVenteFormField>();

  const [toDelete, setToDelete] = useState<PointDeVente | null>(null);
  const [deleting, setDeleting] = useState(false);

  // La fiche partenaire charge déjà les points de vente : on part de cette liste
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const reload = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      setItems(await fetchPointsDeVente(partnerId));
    } catch (error) {
      toast.error(errorMessage(error, "Impossible de charger les points de vente"));
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  const filteredItems = useMemo(() => {
    const query = search.toLowerCase().trim();
    return items.filter((pdv) => {
      if (query) {
        const haystack = [pdv.libelle || pdv.name, pdv.code, pdv.adresse].join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return statusFilter === "all" || pdv.statut === statusFilter;
    });
  }, [items, search, statusFilter]);

  const setDialogOpen = (open: boolean) => {
    resetErrors();
    setDialogOpenState(open);
    if (!open) setEditing(null);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyPointDeVenteForm);
    setDialogOpen(true);
  };

  const openEdit = (pdv: PointDeVente) => {
    setEditing(pdv);
    setForm({
      libelle: pdv.libelle || pdv.name || "",
      code: pdv.code ?? "",
      adresse: pdv.adresse ?? "",
      telephone: pdv.telephone ?? "",
    });
    resetErrors();
    setDialogOpenState(true);
  };

  const updateField = (field: PointDeVenteFormField, value: string) => {
    clearFormError(field);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const save = async () => {
    if (!partnerId) return;
    const errors = validatePointDeVenteForm(form);
    setFormErrors(errors);
    if (hasFieldErrors(errors)) return;

    const libelle = form.libelle.trim();
    setSaving(true);
    try {
      if (editing) {
        const updated = await updatePointDeVente(partnerId, editing.id, {
          name: libelle,
          libelle,
          code: form.code,
          adresse: form.adresse,
          telephone: form.telephone,
        });
        setItems((prev) => prev.map((pdv) => (pdv.id === updated.id ? updated : pdv)));
        toast.success("Point de vente modifié avec succès");
      } else {
        const created = await createPointDeVente(partnerId, {
          name: libelle,
          libelle,
          code: form.code,
          adresse: form.adresse,
          telephone: form.telephone,
          partner_id: partnerId,
        });
        setItems((prev) => [created, ...prev]);
        toast.success("Point de vente ajouté avec succès");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(errorMessage(error, "Impossible d'enregistrer le point de vente"));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (pdv: PointDeVente) => {
    if (!partnerId) return;
    const activate = pdv.statut !== "actif";
    try {
      const updated = await togglePointDeVenteStatus(partnerId, pdv.id, activate);
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(activate ? "Point de vente activé" : "Point de vente désactivé");
    } catch (error) {
      toast.error(errorMessage(error, "Impossible de modifier le statut du point de vente"));
    }
  };

  const confirmDelete = async () => {
    if (!partnerId || !toDelete) return;
    setDeleting(true);
    try {
      await deletePointDeVente(partnerId, toDelete.id);
      setItems((prev) => prev.filter((pdv) => pdv.id !== toDelete.id));
      toast.success("Point de vente supprimé");
      setToDelete(null);
    } catch (error) {
      toast.error(errorMessage(error, "Impossible de supprimer le point de vente"));
    } finally {
      setDeleting(false);
    }
  };

  return {
    items,
    filteredItems,
    loading,
    reload,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    dialogOpen,
    setDialogOpen,
    editing,
    form,
    formErrors,
    updateField,
    saving,
    openCreate,
    openEdit,
    save,
    toggleActive,
    toDelete,
    setToDelete,
    deleting,
    confirmDelete,
  };
};
