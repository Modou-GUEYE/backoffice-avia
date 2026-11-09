import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { refreshAccessToken } from "@/core/network/httpClient";
import {
  fetchHabilitationMatrix,
  createProfile,
  updateProfile,
  replaceProfilePermissions,
  syncProfile,
  deleteProfile,
  createPermission,
  updatePermission,
  deletePermission,
  syncPermission,
} from "../services/habilitationService";
import {
  HabilitationMatrixResponse,
  HabilitationMatrixRowResponse,
  PermissionResponse,
  ProfileEditForm,
  PermissionForm,
} from "../models/types";
import { FieldErrors, hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";

export type ClientIdType = "backoffice-web" | "mobile-app";

export type ProfileFormField = "name" | "code";

/** Valide le formulaire de profil et renvoie toutes les erreurs, par champ. */
export const validateProfileForm = (form: ProfileEditForm): FieldErrors<ProfileFormField> => {
  const errors: FieldErrors<ProfileFormField> = {};
  if (!form.name.trim()) errors.name = "Le nom du profil est obligatoire";
  if (!form.code.trim()) errors.code = "Le code technique du profil est obligatoire";
  return errors;
};

export type PermissionFormField = "code" | "name";

/** Valide le formulaire de permission et renvoie toutes les erreurs, par champ. */
export const validatePermissionForm = (form: PermissionForm): FieldErrors<PermissionFormField> => {
  const errors: FieldErrors<PermissionFormField> = {};
  if (!form.code.trim()) errors.code = "Le code de la permission est obligatoire";
  if (!form.name.trim()) errors.name = "Le libellé de la permission est obligatoire";
  return errors;
};

export const useHabilitations = (options?: { enabled?: boolean }) => {
  const enabled = options?.enabled ?? true;

  // Selected client ID (backoffice-web by default, mobile-app supported)
  const [clientId, setClientId] = useState<ClientIdType>("backoffice-web");

  // Matrix and loading states
  const [matrix, setMatrix] = useState<HabilitationMatrixResponse | null>(null);
  const [isLoadingMatrix, setIsLoadingMatrix] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Active view tab (profiles / permissions)
  const [activeTab, setActiveTab] = useState<"profiles" | "permissions">("profiles");

  // Profile management states
  const [isCreatingProfile, setIsCreatingProfile] = useState<boolean>(false);
  const [editingProfileRow, setEditingProfileRow] = useState<HabilitationMatrixRowResponse | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<HabilitationMatrixRowResponse | null>(null);
  const [isDeletingProfile, setIsDeletingProfile] = useState<boolean>(false);

  const [profileForm, setProfileForm] = useState<ProfileEditForm>({
    name: "",
    code: "",
    description: "",
    enabled: true,
    permissionIds: [],
  });

  // Permission management states
  const [isCreatingPermission, setIsCreatingPermission] = useState<boolean>(false);
  const [editingPermission, setEditingPermission] = useState<PermissionResponse | null>(null);
  const [permissionToDelete, setPermissionToDelete] = useState<PermissionResponse | null>(null);
  const [isDeletingPermission, setIsDeletingPermission] = useState<boolean>(false);

  const [permissionForm, setPermissionForm] = useState<PermissionForm>({
    code: "",
    name: "",
    clientId: "backoffice-web",
    description: "",
    enabled: true,
  });

  const {
    errors: profileErrors,
    setErrors: setProfileErrors,
    clearError: clearProfileError,
    resetErrors: resetProfileErrors,
  } = useFieldErrors<ProfileFormField>();
  const {
    errors: permissionErrors,
    setErrors: setPermissionErrors,
    clearError: clearPermissionError,
    resetErrors: resetPermissionErrors,
  } = useFieldErrors<PermissionFormField>();

  // Load matrix for selected client_id
  const loadMatrix = useCallback(async (client: ClientIdType = clientId) => {
    try {
      setIsLoadingMatrix(true);
      const data = await fetchHabilitationMatrix(client);
      setMatrix(data);
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Impossible de charger la matrice des habilitations");
      console.error(error);
    } finally {
      setIsLoadingMatrix(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (!enabled) return;
    loadMatrix(clientId);
  }, [enabled, clientId, loadMatrix]);

  // Handle client ID change
  const handleClientChange = useCallback((newClient: ClientIdType) => {
    setClientId(newClient);
    resetProfileErrors();
    resetPermissionErrors();
    setIsCreatingProfile(false);
    setEditingProfileRow(null);
    setIsCreatingPermission(false);
    setEditingPermission(null);
  }, [resetProfileErrors, resetPermissionErrors]);

  // Current client matrix data
  const currentClientMatrix = useMemo(() => {
    if (!matrix || !matrix.matrices || matrix.matrices.length === 0) {
      return null;
    }
    return matrix.matrices.find((m) => m.client_id === clientId) || matrix.matrices[0];
  }, [matrix, clientId]);

  // Available permissions from current matrix
  const availablePermissions = useMemo((): PermissionResponse[] => {
    return currentClientMatrix?.permissions || [];
  }, [currentClientMatrix]);

  // Available profile rows from current matrix
  const profiles = useMemo((): HabilitationMatrixRowResponse[] => {
    return currentClientMatrix?.rows || [];
  }, [currentClientMatrix]);

  // ==========================================
  // PROFILE ACTIONS
  // ==========================================

  const handleStartCreateProfile = useCallback(() => {
    resetProfileErrors();
    setIsCreatingProfile(true);
    setEditingProfileRow(null);
    setProfileForm({
      name: "",
      code: clientId === "backoffice-web" ? "profile.bo." : "profile.mobile.",
      description: "",
      enabled: true,
      permissionIds: [],
    });
  }, [clientId, resetProfileErrors]);

  const handleStartEditProfile = useCallback((row: HabilitationMatrixRowResponse) => {
    resetProfileErrors();
    setEditingProfileRow(row);
    setIsCreatingProfile(false);
    setProfileForm({
      id: row.profile.id,
      name: row.profile.name,
      code: row.profile.code,
      description: row.profile.description || "",
      enabled: row.profile.enabled ?? true,
      permissionIds: [...(row.permission_ids || [])],
    });
  }, [resetProfileErrors]);

  const handleCancelProfileForm = useCallback(() => {
    resetProfileErrors();
    setIsCreatingProfile(false);
    setEditingProfileRow(null);
  }, [resetProfileErrors]);

  const handleTogglePermission = useCallback((permissionId: string) => {
    setProfileForm((prev) => {
      const exists = prev.permissionIds.includes(permissionId);
      return {
        ...prev,
        permissionIds: exists
          ? prev.permissionIds.filter((id) => id !== permissionId)
          : [...prev.permissionIds, permissionId],
      };
    });
  }, []);

  const handleToggleAllPermissions = useCallback((permissionIds: string[], checked: boolean) => {
    setProfileForm((prev) => {
      if (checked) {
        const nextSet = new Set([...prev.permissionIds, ...permissionIds]);
        return { ...prev, permissionIds: Array.from(nextSet) };
      } else {
        const removeSet = new Set(permissionIds);
        return {
          ...prev,
          permissionIds: prev.permissionIds.filter((id) => !removeSet.has(id)),
        };
      }
    });
  }, []);

  const handleConfirmCreateProfile = useCallback(async () => {
    const validationErrors = validateProfileForm(profileForm);
    setProfileErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    const trimmedName = profileForm.name.trim();
    const trimmedCode = profileForm.code.trim();

    try {
      setIsSaving(true);
      // 1. Create profile resource
      const newProfile = await createProfile({
        code: trimmedCode,
        name: trimmedName,
        client_id: clientId,
        description: profileForm.description.trim() || null,
        enabled: profileForm.enabled,
      });

      // 2. Assign permissions if selected
      if (profileForm.permissionIds.length > 0) {
        await replaceProfilePermissions(newProfile.id, profileForm.permissionIds);
      }

      // 3. Sync to Keycloak
      await syncProfile(newProfile.id);

      toast.success(`Profil "${trimmedName}" créé avec succès`);
      await loadMatrix(clientId);
      setIsCreatingProfile(false);

      // Refresh session token silently
      try {
        await refreshAccessToken();
      } catch (e) {
        // silent
      }
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Erreur lors de la création du profil");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }, [profileForm, clientId, loadMatrix, setProfileErrors]);

  const handleConfirmUpdateProfile = useCallback(async () => {
    if (!editingProfileRow) return;

    const validationErrors = validateProfileForm(profileForm);
    setProfileErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    const trimmedName = profileForm.name.trim();
    const trimmedCode = profileForm.code.trim();
    const codeChanged = trimmedCode !== editingProfileRow.profile.code;

    const profileId = editingProfileRow.profile.id;

    try {
      setIsSaving(true);
      const original = editingProfileRow.profile;
      const trimmedDescription = profileForm.description.trim() || null;
      const detailsChanged =
        codeChanged ||
        trimmedName !== original.name ||
        trimmedDescription !== (original.description || null) ||
        profileForm.enabled !== (original.enabled ?? true);
      const originalIds = [...(editingProfileRow.permission_ids || [])].sort();
      const nextIds = [...profileForm.permissionIds].sort();
      const permissionsChanged =
        originalIds.length !== nextIds.length || originalIds.some((id, i) => id !== nextIds[i]);

      // N'appeler que ce qui a changé : un utilisateur peut n'avoir que l'un des deux droits
      // 1. Update profile details
      if (detailsChanged) {
        await updateProfile(profileId, {
          ...(codeChanged && { code: trimmedCode }),
          name: trimmedName,
          description: trimmedDescription,
          enabled: profileForm.enabled,
        });
      }

      // 2. Update permissions
      if (permissionsChanged) {
        await replaceProfilePermissions(profileId, profileForm.permissionIds);
      }

      // 3. Sync to Keycloak
      if (detailsChanged || permissionsChanged) {
        await syncProfile(profileId);
      }

      toast.success(`Profil "${trimmedName}" mis à jour avec succès`);
      await loadMatrix(clientId);
      setEditingProfileRow(null);

      // Refresh session token silently
      try {
        await refreshAccessToken();
      } catch (e) {
        // silent
      }
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Erreur lors de la mise à jour du profil");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }, [editingProfileRow, profileForm, clientId, loadMatrix, setProfileErrors]);

  const handleDeleteProfile = useCallback(async () => {
    if (!profileToDelete) return;
    try {
      setIsDeletingProfile(true);
      await deleteProfile(profileToDelete.profile.id);
      await loadMatrix(clientId);
      toast.success(`Profil "${profileToDelete.profile.name}" supprimé avec succès`);
      setProfileToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Erreur lors de la suppression du profil");
      console.error(error);
    } finally {
      setIsDeletingProfile(false);
    }
  }, [profileToDelete, clientId, loadMatrix]);

  // ==========================================
  // PERMISSION ACTIONS
  // ==========================================

  const handleStartCreatePermission = useCallback(() => {
    resetPermissionErrors();
    setIsCreatingPermission(true);
    setEditingPermission(null);
    setPermissionForm({
      code: clientId === "backoffice-web" ? "perm.bo." : "perm.mobile.",
      name: "",
      clientId,
      description: "",
      enabled: true,
    });
  }, [clientId, resetPermissionErrors]);

  const handleStartEditPermission = useCallback((perm: PermissionResponse) => {
    resetPermissionErrors();
    setEditingPermission(perm);
    setIsCreatingPermission(false);
    setPermissionForm({
      id: perm.id,
      code: perm.code,
      name: perm.name,
      clientId: (perm.client_id as ClientIdType) || clientId,
      description: perm.description || "",
      enabled: perm.enabled ?? true,
    });
  }, [clientId, resetPermissionErrors]);

  const handleCancelPermissionModal = useCallback(() => {
    resetPermissionErrors();
    setIsCreatingPermission(false);
    setEditingPermission(null);
  }, [resetPermissionErrors]);

  const handleConfirmSavePermission = useCallback(async () => {
    const validationErrors = validatePermissionForm(permissionForm);
    setPermissionErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    const trimmedName = permissionForm.name.trim();
    const trimmedCode = permissionForm.code.trim();

    try {
      setIsSaving(true);
      if (editingPermission) {
        // Update existing permission
        const codeChanged = trimmedCode !== editingPermission.code;
        await updatePermission(editingPermission.id, {
          ...(codeChanged && { code: trimmedCode }),
          name: trimmedName,
          description: permissionForm.description.trim() || null,
          enabled: permissionForm.enabled,
        });
        await syncPermission(editingPermission.id);
        toast.success(`Permission "${trimmedName}" mise à jour`);
      } else {
        // Create new permission
        const newPerm = await createPermission({
          code: trimmedCode,
          name: trimmedName,
          client_id: permissionForm.clientId,
          description: permissionForm.description.trim() || null,
          enabled: permissionForm.enabled,
        });
        await syncPermission(newPerm.id);
        toast.success(`Permission "${trimmedName}" créée avec succès`);
      }

      await loadMatrix(clientId);
      setIsCreatingPermission(false);
      setEditingPermission(null);
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Erreur lors de l'enregistrement de la permission");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }, [permissionForm, editingPermission, clientId, loadMatrix, setPermissionErrors]);

  const handleDeletePermission = useCallback(async () => {
    if (!permissionToDelete) return;
    try {
      setIsDeletingPermission(true);
      await deletePermission(permissionToDelete.id);
      await loadMatrix(clientId);
      toast.success(`Permission "${permissionToDelete.name}" supprimée avec succès`);
      setPermissionToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Erreur lors de la suppression de la permission");
      console.error(error);
    } finally {
      setIsDeletingPermission(false);
    }
  }, [permissionToDelete, clientId, loadMatrix]);

  return {
    // Client & matrix
    clientId,
    setClientId: handleClientChange,
    matrix,
    isLoadingMatrix,
    isSaving,
    activeTab,
    setActiveTab,

    // Data direct without local filtering
    availablePermissions,
    profiles,

    // Profile form & actions
    isCreatingProfile,
    editingProfileRow,
    profileForm,
    setProfileForm,
    profileToDelete,
    setProfileToDelete,
    isDeletingProfile,
    handleStartCreateProfile,
    handleStartEditProfile,
    handleCancelProfileForm,
    handleTogglePermission,
    handleToggleAllPermissions,
    handleConfirmCreateProfile,
    handleConfirmUpdateProfile,
    handleDeleteProfile,
    profileErrors,
    clearProfileError,

    // Permission form & actions
    isCreatingPermission,
    editingPermission,
    permissionToDelete,
    setPermissionToDelete,
    isDeletingPermission,
    permissionForm,
    setPermissionForm,
    handleStartCreatePermission,
    handleStartEditPermission,
    handleCancelPermissionModal,
    handleConfirmSavePermission,
    handleDeletePermission,
    permissionErrors,
    clearPermissionError,

    // Reload
    reloadMatrix: () => loadMatrix(clientId),
  };
};

export default useHabilitations;
