import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  AdministrationRead,
  AdministrationForm,
} from "../models/types";
import {
  fetchAdministrations,
  createAdministration,
  updateAdministration,
  deleteAdministration,
  toggleAdministrationStatus,
} from "../services/administrationService";
import { FieldErrors, hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";

export type AdministrationFormField = "name";

/** Valide le formulaire d'administration et renvoie toutes les erreurs, par champ. */
export const validateAdministrationForm = (
  form: AdministrationForm,
): FieldErrors<AdministrationFormField> => {
  const errors: FieldErrors<AdministrationFormField> = {};
  if (!form.name.trim()) errors.name = "Le nom de l'administration est obligatoire";
  return errors;
};

const emptyAdministrationForm: AdministrationForm = {
  name: "",
  contact_email: "",
  contact_phone: "",
};

export const useAdministration = (options?: { enabled?: boolean }) => {
  const enabled = options?.enabled ?? true;

  const [administrations, setAdministrations] = useState<AdministrationRead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingAdministrationId, setEditingAdministrationId] = useState<string | null>(null);
  const [administrationForm, setAdministrationForm] = useState<AdministrationForm>(emptyAdministrationForm);

  // Confirmation dialog states
  const [administrationToDelete, setAdministrationToDelete] = useState<AdministrationRead | null>(null);
  const [administrationToToggle, setAdministrationToToggle] = useState<AdministrationRead | null>(null);

  const {
    errors: formErrors,
    setErrors: setFormErrors,
    clearError: clearFormError,
    resetErrors: resetFormErrors,
  } = useFieldErrors<AdministrationFormField>();

  const loadAdministrations = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchAdministrations();
      setAdministrations(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger les administrations");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      void loadAdministrations();
    }
  }, [enabled, loadAdministrations]);

  const resetAdministrationForm = () => {
    setAdministrationForm(emptyAdministrationForm);
    setEditingAdministrationId(null);
    resetFormErrors();
  };

  const editAdministration = (administration: AdministrationRead) => {
    setEditingAdministrationId(administration.id);
    resetFormErrors();
    setAdministrationForm({
      name: administration.name,
      contact_email: administration.contact_email ?? "",
      contact_phone: administration.contact_phone ?? "",
    });
  };

  const saveAdministration = async () => {
    const validationErrors = validateAdministrationForm(administrationForm);
    setFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    try {
      if (editingAdministrationId) {
        const updated = await updateAdministration(editingAdministrationId, {
          name: administrationForm.name.trim(),
          contact_email: administrationForm.contact_email.trim() || null,
          contact_phone: administrationForm.contact_phone.trim() || null,
        });

        setAdministrations((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        toast.success("Administration mise à jour avec succès");
      } else {
        const created = await createAdministration({
          name: administrationForm.name.trim(),
          contact_email: administrationForm.contact_email.trim() || null,
          contact_phone: administrationForm.contact_phone.trim() || null,
        });

        setAdministrations((prev) => [created, ...prev]);
        toast.success("Administration créée avec succès");
      }

      resetAdministrationForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'enregistrement");
    }
  };

  const removeAdministration = async (administration: AdministrationRead) => {
    try {
      await deleteAdministration(administration.id);
      setAdministrations((prev) => prev.filter((item) => item.id !== administration.id));
      if (editingAdministrationId === administration.id) {
        resetAdministrationForm();
      }
      toast.success("Administration supprimée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer l'administration");
    }
  };

  const changeAdministrationStatus = async (administration: AdministrationRead, activate: boolean) => {
    try {
      const updated = await toggleAdministrationStatus(administration.id, activate);
      setAdministrations((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      toast.success(activate ? "Administration activée" : "Administration désactivée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier le statut");
    }
  };

  const confirmDelete = async () => {
    if (administrationToDelete) {
      await removeAdministration(administrationToDelete);
      setAdministrationToDelete(null);
    }
  };

  const confirmToggle = async () => {
    if (administrationToToggle) {
      await changeAdministrationStatus(administrationToToggle, !administrationToToggle.is_active);
      setAdministrationToToggle(null);
    }
  };

  return {
    administrations,
    isLoading,
    administrationForm,
    editingAdministrationId,
    setAdministrationForm,
    formErrors,
    clearFormError,
    loadAdministrations,
    resetAdministrationForm,
    editAdministration,
    saveAdministration,
    removeAdministration,
    changeAdministrationStatus,
    // Confirmation dialogs
    administrationToDelete,
    setAdministrationToDelete,
    administrationToToggle,
    setAdministrationToToggle,
    confirmDelete,
    confirmToggle,
  };
};

export default useAdministration;
