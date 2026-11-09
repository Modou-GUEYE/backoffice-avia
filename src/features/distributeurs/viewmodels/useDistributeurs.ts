import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { can } from "@/core/permissions/permissions";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import { getCurrentInstitutionId, getCurrentDistributorId } from "@/core/security/authStore";
import { useStructureCatalogStore } from "@/core/references/structureCatalogStore";
import { fetchStructures } from "@/features/structures/services/structuresService";
import type {
  Distributeur,
  DistributeurForm,
  DistributorCreate,
  DistributorSummary,
  DistributorUpdate,
  FetchDistributorsParams,
} from "../models/types";
import { emptyDistributeurForm } from "../models/data";
import { type DistributeurFormField, validateDistributeurForm } from "../models/validation";
import { hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import { useDistributeurUsers } from "./useDistributeurUsers";
import {
  activateDistributeur,
  createDistributeur,
  deactivateDistributeur,
  deleteDistributeur,
  fetchDistributeurs,
  updateDistributeur,
} from "../services/distributeursService";

export const useDistributeurs = () => {
  const [distributeurs, setDistributeurs] = useState<Distributeur[]>([]);
  const [summary, setSummary] = useState<DistributorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStructureId, setFilterStructureId] = useState("all");
  const [filterStatut, setFilterStatut] = useState("all");

  // Structures options
  const [structureOptions, setStructureOptions] = useState<Array<{ id: string; nom: string }>>([]);

  // Dialogs
  const [dialogOpen, setDialogOpenState] = useState(false);
  const [editingDistributeur, setEditingDistributeur] = useState<Distributeur | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDistributeur, setDeletingDistributeur] = useState<Distributeur | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Distributeur | null>(null);
  const [statusNextAction, setStatusNextAction] = useState<"activate" | "deactivate" | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form
  const [form, setForm] = useState<DistributeurForm>(emptyDistributeurForm);
  const {
    errors: formErrors,
    setErrors: setFormErrors,
    clearError: clearFormError,
    resetErrors: resetFormErrors,
  } = useFieldErrors<DistributeurFormField>();

  // User management for Distributeur modal
  const userManager = useDistributeurUsers(dialogOpen);
  const { resetUserFormErrors } = userManager;

  // Ouverture/fermeture du formulaire : les erreurs de validation repartent de zéro
  const setDialogOpen = useCallback(
    (open: boolean) => {
      resetFormErrors();
      resetUserFormErrors();
      setDialogOpenState(open);
    },
    [resetFormErrors, resetUserFormErrors],
  );

  const { currentActorRole, entityContext: connectedEntityContext, currentPermissions } = useCurrentActor();
  const institutionId = getCurrentInstitutionId();
  const distributorId = getCurrentDistributorId();

  const isStructureUser = connectedEntityContext === "Structure";
  const singleStructureMode = isStructureUser && Boolean(institutionId);

  const permissions = useMemo(() => {
    const canDo = (action: "read" | "create" | "update" | "delete") =>
      can(currentActorRole, action, "Distributeur", currentPermissions);

    return {
      canRead: canDo("read"),
      canCreate: canDo("create"),
      canUpdate: canDo("update"),
      canDelete: canDo("delete"),
    };
  }, [currentActorRole, currentPermissions]);

  // Load structures for filter and form dropdown
  const loadStructures = useCallback(async () => {
    try {
      const cached = useStructureCatalogStore.getState().items;
      if (cached.length > 0) {
        setStructureOptions(cached.map((s) => ({ id: s.id, nom: s.nom })));
        return;
      }
      const res = await fetchStructures({ limit: 100 });
      const rawList = Array.isArray(res) ? res : ((res as { items?: unknown[] })?.items || []);
      const items = rawList.map((s: { id?: unknown; name?: unknown; nom?: unknown }) => ({
        id: String(s.id),
        nom: String(s.name || s.nom || "Structure"),
      }));
      setStructureOptions(items);
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    void loadStructures();
  }, [loadStructures]);

  // Load distributeurs
  const loadDistributeurs = useCallback(
    async (paramsOverride?: { search?: string; structureId?: string; statut?: string }) => {
      const searchVal = paramsOverride?.search !== undefined ? paramsOverride.search : search;
      const structureVal = paramsOverride?.structureId !== undefined ? paramsOverride.structureId : filterStructureId;
      const statutVal = paramsOverride?.statut !== undefined ? paramsOverride.statut : filterStatut;

      const filter: FetchDistributorsParams = {};

      if (singleStructureMode && institutionId) {
        filter.structure_id = institutionId;
      } else if (structureVal !== "all" && structureVal.trim()) {
        filter.structure_id = structureVal.trim();
      }

      if (searchVal.trim()) {
        filter.search = searchVal.trim();
      }

      if (statutVal === "active") {
        filter.is_active = true;
      } else if (statutVal === "inactive") {
        filter.is_active = false;
      }

      setLoading(true);
      try {
        const result = await fetchDistributeurs(filter);
        setDistributeurs(result.items);
        setSummary(result.summary);
        setError(null);
      } catch (err) {
        console.error("[useDistributeurs] Erreur chargement distributeurs:", err);
        setDistributeurs([]);
        setSummary(null);
        setError(err instanceof Error ? err.message : "Impossible de charger les distributeurs");
      } finally {
        setLoading(false);
      }
    },
    [search, filterStructureId, filterStatut, singleStructureMode, institutionId],
  );

  // Debounced search and filter
  const prevFiltersRef = useRef({ search, structure: filterStructureId, statut: filterStatut });
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      void loadDistributeurs();
      return;
    }

    const changed =
      prevFiltersRef.current.search !== search ||
      prevFiltersRef.current.structure !== filterStructureId ||
      prevFiltersRef.current.statut !== filterStatut;

    if (!changed) return;

    prevFiltersRef.current = { search, structure: filterStructureId, statut: filterStatut };

    const timer = setTimeout(() => {
      void loadDistributeurs({ search, structureId: filterStructureId, statut: filterStatut });
    }, 300);

    return () => clearTimeout(timer);
  }, [search, filterStructureId, filterStatut, loadDistributeurs]);

  // Handle logo file selection
  const onFileSelected = useCallback((file: File | null) => {
    if (!file) {
      setForm((prev) => ({ ...prev, previewUrl: "", file: null }));
      return;
    }
    const previewUrl = typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : "";
    setForm((prev) => ({ ...prev, previewUrl, file }));
  }, []);
  const onLogoFileSelected = onFileSelected;

  // Open add modal
  const openAdd = useCallback(() => {
    setEditingDistributeur(null);
    setForm({
      ...emptyDistributeurForm,
      structureId: singleStructureMode && institutionId ? institutionId : structureOptions[0]?.id || "",
      previewUrl: "",
      file: null,
    });
    userManager.resetUserState();
    setDialogOpen(true);
  }, [singleStructureMode, institutionId, structureOptions, userManager, setDialogOpen]);

  // Open edit modal
  const openEdit = useCallback(
    (distributeur: Distributeur) => {
      setEditingDistributeur(distributeur);
      setForm({
        nom: distributeur.name || distributeur.nom,
        structureId: distributeur.structure_id || distributeur.structureId || "",
        address: distributeur.address ?? "",
        contact_email: distributeur.contact_email ?? "",
        contact_phone: distributeur.contact_phone ?? "",
        statut: distributeur.is_active ? "actif" : "inactif",
        previewUrl: distributeur.media_url || "",
        file: null,
      });
      userManager.resetUserState();
      void userManager.loadUsersForDistributor(distributeur.id);
      setDialogOpen(true);
    },
    [userManager, setDialogOpen],
  );

  // Save (create or update)
  const handleSave = useCallback(async () => {
    const validationErrors = validateDistributeurForm(form);
    setFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    setIsSaving(true);
    try {
      if (editingDistributeur) {
        const payload: DistributorUpdate = {
          name: form.nom.trim(),
          structure_id: form.structureId.trim(),
          address: form.address?.trim() || null,
          contact_email: form.contact_email?.trim() || null,
          contact_phone: form.contact_phone?.trim() || null,
          file: form.file,
        };

        const updated = await updateDistributeur(editingDistributeur.id, payload, form.file);
        await userManager.savePendingUsers(updated.id, form.structureId.trim());
        setDistributeurs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        toast.success("Distributeur mis à jour avec succès");
      } else {
        const payload: DistributorCreate = {
          name: form.nom.trim(),
          structure_id: form.structureId.trim(),
          address: form.address?.trim() || null,
          contact_email: form.contact_email?.trim() || null,
          contact_phone: form.contact_phone?.trim() || null,
          file: form.file,
        };

        const created = await createDistributeur(payload, form.file);
        await userManager.savePendingUsers(created.id, form.structureId.trim());
        setDistributeurs((prev) => [created, ...prev]);
        setSummary((prev) =>
          prev
            ? { ...prev, total: prev.total + 1, actifs: created.is_active ? prev.actifs + 1 : prev.actifs }
            : null,
        );
        toast.success("Distributeur créé avec succès");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  }, [form, editingDistributeur, userManager, setFormErrors, setDialogOpen]);

  // Request status toggle
  const requestToggleStatut = useCallback((distributeur: Distributeur) => {
    setStatusTarget(distributeur);
    setStatusNextAction(distributeur.is_active ? "deactivate" : "activate");
    setStatusDialogOpen(true);
  }, []);

  // Confirm status toggle
  const handleToggleStatut = useCallback(async () => {
    if (!statusTarget || !statusNextAction) return;
    try {
      const updated =
        statusNextAction === "activate"
          ? await activateDistributeur(statusTarget.id)
          : await deactivateDistributeur(statusTarget.id);

      setDistributeurs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setSummary((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          actifs: updated.is_active ? prev.actifs + 1 : prev.actifs - 1,
          inactifs: !updated.is_active ? prev.inactifs + 1 : prev.inactifs - 1,
        };
      });
      toast.success(
        `Distributeur ${updated.is_active ? "activé" : "désactivé"} avec succès`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du changement de statut");
    } finally {
      setStatusDialogOpen(false);
      setStatusTarget(null);
      setStatusNextAction(null);
    }
  }, [statusTarget, statusNextAction]);

  // Open delete confirmation
  const openDelete = useCallback((distributeur: Distributeur) => {
    setDeletingDistributeur(distributeur);
    setDeleteDialogOpen(true);
  }, []);

  // Confirm delete
  const handleDelete = useCallback(async () => {
    if (!deletingDistributeur) return;
    try {
      await deleteDistributeur(deletingDistributeur.id);
      setDistributeurs((prev) => prev.filter((d) => d.id !== deletingDistributeur.id));
      setSummary((prev) =>
        prev
          ? {
              total: Math.max(0, prev.total - 1),
              actifs: deletingDistributeur.is_active ? Math.max(0, prev.actifs - 1) : prev.actifs,
              inactifs: !deletingDistributeur.is_active ? Math.max(0, prev.inactifs - 1) : prev.inactifs,
            }
          : null,
      );
      toast.success("Distributeur supprimé avec succès");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setDeleteDialogOpen(false);
      setDeletingDistributeur(null);
    }
  }, [deletingDistributeur]);

  // Helper to resolve structure name
  const resolveStructureLabel = useCallback(
    (structureId?: string) => {
      if (!structureId) return "—";
      const found = structureOptions.find((s) => s.id === structureId);
      return found ? found.nom : structureId;
    },
    [structureOptions],
  );

  return {
    distributeurs,
    filtered: distributeurs,
    summary,
    loading,
    error,
    search,
    setSearch,
    filterStructureId,
    setFilterStructureId,
    filterStatut,
    setFilterStatut,
    structureOptions,
    singleStructureMode,
    permissions,
    dialogOpen,
    setDialogOpen,
    editingDistributeur,
    form,
    setForm,
    formErrors,
    clearFormError,
    isSaving,
    openAdd,
    openEdit,
    handleSave,
    onFileSelected,
    onLogoFileSelected,
    // Status
    statusDialogOpen,
    setStatusDialogOpen,
    statusTarget,
    statusNextAction,
    requestToggleStatut,
    handleToggleStatut,
    // Delete
    deleteDialogOpen,
    setDeleteDialogOpen,
    deletingDistributeur,
    openDelete,
    handleDelete,
    // Helpers
    resolveStructureLabel,
    refresh: loadDistributeurs,
    // Utilisateurs tab
    users: userManager.users,
    userForm: userManager.userForm,
    setUserForm: userManager.setUserForm,
    availableUserRoles: userManager.availableUserRoles,
    userFormErrors: userManager.userFormErrors,
    clearUserFormError: userManager.clearUserFormError,
    showUserForm: userManager.showUserForm,
    selectedUserId: userManager.selectedUserId,
    isUpdatingUser: userManager.isUpdatingUser,
    deriveLogin: userManager.deriveLogin,
    openAddUserForm: userManager.openAddUserForm,
    cancelUserForm: userManager.cancelUserForm,
    addUser: userManager.addUser,
    editUser: userManager.editUser,
    removeUser: userManager.removeUser,
    updateDistributeurUser: userManager.updateDistributeurUser,
  };
};
