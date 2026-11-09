import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  activateAccessSecurityUser,
  createBackofficeUser,
  deactivateAccessSecurityUser,
  deleteAccessSecurityUser,
  listClientCompositeRoles,
  listHierarchyMembers,
  requestAccessSecurityPasswordReset,
  updateAccessSecurityUser,
  type TargetScopeRef,
  type HierarchyMembersFilters,
} from "@/core/security/accessSecurityService";

const ACCESS_SECURITY_CLIENT_ID =
  import.meta.env.VITE_ACCESS_SECURITY_CLIENT_ID ?? "backoffice-web";
import {
  isProfileRole,
  isProfileRoleForEntityContext,
} from "@/features/utilisateurs/models/profileLabels";
import type { DistributeurUser, DistributeurUserForm } from "../models/types";
import { emptyDistributeurUserForm } from "../models/data";
import { type DistributeurUserFormField, validateDistributeurUserForm } from "../models/validation";
import { hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";

export const normalizeLoginPart = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

export const deriveLogin = (
  prenom = "",
  nom = "",
  existingUsernames?: string[]
): string => {
  const normalizedPrenom = normalizeLoginPart(prenom);
  const normalizedNom = normalizeLoginPart(nom);

  if (!normalizedPrenom || !normalizedNom) {
    return "";
  }

  const base = `${normalizedPrenom.charAt(0)}.${normalizedPrenom}${normalizedNom}`;
  let candidate = base;
  let counter = 1;

  if (existingUsernames && existingUsernames.length > 0) {
    const existingSet = new Set(
      existingUsernames
        .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
        .map((u) => u.toLowerCase())
    );
    while (existingSet.has(candidate)) {
      candidate = `${base}${counter}`;
      counter++;
    }
  }

  return candidate;
};

export const useDistributeurUsers = (dialogOpen: boolean) => {
  const [users, setUsers] = useState<DistributeurUser[]>([]);
  const [userForm, setUserForm] = useState<DistributeurUserForm>(emptyDistributeurUserForm);
  const [availableUserRoles, setAvailableUserRoles] = useState<string[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const {
    errors: userFormErrors,
    setErrors: setUserFormErrors,
    clearError: clearUserFormError,
    resetErrors: resetUserFormErrors,
  } = useFieldErrors<DistributeurUserFormField>();

  // Fetch available roles from Keycloak via Access Security Microservice
  useEffect(() => {
    if (!dialogOpen) return;
    let active = true;

    listClientCompositeRoles(ACCESS_SECURITY_CLIENT_ID)
      .then((roles) => {
        if (!active) return;
        const filteredRoles = roles
          .filter(isProfileRole)
          .filter((role) => isProfileRoleForEntityContext(role, "Distributeur"));
        setAvailableUserRoles(filteredRoles);
      })
      .catch((error) => {
        if (!active) return;
        setAvailableUserRoles([]);
        const message =
          error instanceof Error
            ? error.message
            : "Service Access Security indisponible côté backend.";
        toast.error(message);
      });

    return () => {
      active = false;
    };
  }, [dialogOpen]);

  // Ensure userForm has a valid default role
  useEffect(() => {
    if (availableUserRoles.length === 0) return;
    setUserForm((prev) => {
      if (prev.profil && availableUserRoles.includes(prev.profil)) {
        return prev;
      }
      return {
        ...prev,
        profil: availableUserRoles[0],
      };
    });
  }, [availableUserRoles]);

  const resetUserState = useCallback(() => {
    setUsers([]);
    setUserForm({
      ...emptyDistributeurUserForm,
      profil: availableUserRoles[0] || "",
    });
    setShowUserForm(false);
    setSelectedUserId(null);
    resetUserFormErrors();
  }, [availableUserRoles, resetUserFormErrors]);

  const openAddUserForm = useCallback(() => {
    setSelectedUserId(null);
    setUserForm({
      ...emptyDistributeurUserForm,
      profil: availableUserRoles[0] || "",
    });
    setShowUserForm(true);
    resetUserFormErrors();
  }, [availableUserRoles, resetUserFormErrors]);

  const cancelUserForm = useCallback(() => {
    setSelectedUserId(null);
    setUserForm({
      ...emptyDistributeurUserForm,
      profil: availableUserRoles[0] || "",
    });
    setShowUserForm(false);
    resetUserFormErrors();
  }, [availableUserRoles, resetUserFormErrors]);

  const addUser = useCallback(() => {
    const prenom = userForm.prenom.trim();
    const nom = userForm.nom.trim();
    const email = userForm.email.trim().toLowerCase();
    const profil = userForm.profil || availableUserRoles[0] || "";
    const username = (
      userForm.username.trim() || deriveLogin(prenom, nom, users.map((u) => u.username))
    ).trim();

    const validationErrors = validateDistributeurUserForm({ prenom, nom, username, email, profil });
    setUserFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    setUsers((prev) => {
      const existingIndex = prev.findIndex(
        (u) =>
          (u.username && u.username.toLowerCase() === username.toLowerCase()) ||
          (email && u.email && u.email.toLowerCase() === email)
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          nom,
          prenom,
          username,
          email,
          profil,
        };
        return updated;
      }

      const newUser: DistributeurUser = {
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        nom,
        prenom,
        username,
        email,
        profil,
        isPendingCreation: true,
      };
      return [...prev, newUser];
    });

    setUserForm({
      ...emptyDistributeurUserForm,
      profil: availableUserRoles[0] || "",
    });
    setSelectedUserId(null);
    setShowUserForm(false);
    toast.success("Utilisateur enregistré");
  }, [userForm, availableUserRoles, users, setUserFormErrors]);

  const editUser = useCallback(
    (userId: string) => {
      const user = users.find((u) => u.id === userId);
      if (!user) return;
      setUserForm({
        nom: user.nom,
        prenom: user.prenom,
        username: user.username || "",
        email: user.email || "",
        profil: user.profil,
        matricule: user.matricule || "",
      });
      setSelectedUserId(user.isPendingCreation ? null : user.id);
      setShowUserForm(true);
      resetUserFormErrors();
    },
    [users, resetUserFormErrors]
  );

  const removeUser = useCallback(
    async (userId: string) => {
      const user = users.find((u) => u.id === userId);
      if (!user) return;

      if (user.isPendingCreation) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        toast.success("Utilisateur retiré");
        return;
      }

      try {
        await deleteAccessSecurityUser(userId);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        toast.success("Utilisateur supprimé avec succès");
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Erreur lors de la suppression de l'utilisateur"
        );
      }
    },
    [users]
  );

  const updateDistributeurUser = useCallback(async () => {
    if (!selectedUserId) {
      addUser();
      return;
    }

    const firstName = userForm.prenom.trim();
    const lastName = userForm.nom.trim();
    const email = userForm.email.trim().toLowerCase();
    const profil = userForm.profil;

    const validationErrors = validateDistributeurUserForm({
      prenom: firstName,
      nom: lastName,
      username: userForm.username,
      email,
      profil,
    });
    setUserFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    setIsUpdatingUser(true);
    try {
      const updatedUser = await updateAccessSecurityUser(selectedUserId, {
        login: userForm.username.trim(),
        profiles: [profil],
        profile_client_id: "backoffice-web",
        first_name: firstName,
        last_name: lastName,
        email,
        matricule: userForm.matricule?.trim() || null,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUserId
            ? {
                ...u,
                nom: updatedUser.last_name || lastName,
                prenom: updatedUser.first_name || firstName,
                email: updatedUser.email || email,
                profil,
                matricule: updatedUser.matricule || userForm.matricule?.trim() || undefined,
              }
            : u
        )
      );

      setUserForm({
        ...emptyDistributeurUserForm,
        profil: availableUserRoles[0] || "",
      });
      setSelectedUserId(null);
      setShowUserForm(false);
      toast.success("Utilisateur modifié avec succès");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la modification de l'utilisateur"
      );
    } finally {
      setIsUpdatingUser(false);
    }
  }, [selectedUserId, userForm, availableUserRoles, addUser, setUserFormErrors]);

  const loadUsersForDistributor = useCallback(
    async (distributorId: string, filters?: HierarchyMembersFilters) => {
      try {
        const res = filters
          ? await listHierarchyMembers("DISTRIBUTOR", distributorId, ACCESS_SECURITY_CLIENT_ID, filters)
          : await listHierarchyMembers("DISTRIBUTOR", distributorId, ACCESS_SECURITY_CLIENT_ID);
        if (res.users && res.users.length > 0) {
          const keycloakUsers: DistributeurUser[] = res.users.map((u) => ({
            id: u.user_id,
            nom: u.last_name || "",
            prenom: u.first_name || "",
            username: u.username || "",
            email: u.email || "",
            matricule: u.matricule || "",
            profil: u.profiles?.[0] || "",
            active: u.active !== false,
            statut: u.active === false ? "Inactif" : "Actif",
            isPendingCreation: false,
          }));
          setUsers(keycloakUsers);
        } else {
          setUsers([]);
        }
      } catch {
        setUsers([]);
      }
    },
    [],
  );

  const toggleStatut = useCallback(
    async (userId: string) => {
      const user = users.find((u) => u.id === userId);
      if (!user) return;
      const isCurrentlyActive = user.active !== false && user.statut !== "Inactif";
      try {
        if (isCurrentlyActive) {
          await deactivateAccessSecurityUser(userId);
        } else {
          await activateAccessSecurityUser(userId);
        }
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  active: !isCurrentlyActive,
                  statut: isCurrentlyActive ? "Inactif" : "Actif",
                }
              : u,
          ),
        );
        const userFullName =
          [user.prenom, user.nom].filter(Boolean).join(" ") || user.username;
        toast.success(`Statut de ${userFullName} mis à jour`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Impossible de modifier le statut",
        );
      }
    },
    [users],
  );

  const resetPassword = useCallback(async (user: DistributeurUser) => {
    const username = user.username?.trim() || "";
    const email = user.email?.trim() || "";
    const identifier = email || username;
    if (!identifier) {
      toast.error("Aucun identifiant ou email valide pour cet utilisateur");
      return;
    }
    const fullName = [user.prenom, user.nom].filter(Boolean).join(" ") || identifier;
    try {
      await requestAccessSecurityPasswordReset(identifier, email);
      toast.success(
        `Demande de réinitialisation du mot de passe envoyée pour ${fullName}`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Erreur lors de la réinitialisation du mot de passe",
      );
    }
  }, []);

  const validatePassword = useCallback(
    (user: DistributeurUser, onNavigate?: (url: string) => void) => {
      const identifier = user.username?.trim() || user.email?.trim();
      if (!identifier) {
        toast.error("Aucun identifiant ou email valide pour cet utilisateur");
        return;
      }
      const targetUrl = `/set-password?username=${encodeURIComponent(identifier)}`;
      if (onNavigate) {
        onNavigate(targetUrl);
      } else if (typeof window !== "undefined") {
        window.location.href = targetUrl;
      }
    },
    [],
  );

  const savePendingUsers = useCallback(
    async (distributorId: string, structureId?: string) => {
      const pendingUsers = users.filter((u) => u.isPendingCreation);
      if (pendingUsers.length === 0) return;

      for (const u of pendingUsers) {
        const username = u.username.trim();
        const email = u.email.trim();

        try {
          const target_scope: TargetScopeRef[] = [];
          if (structureId && structureId.trim()) {
            target_scope.push({
              ref_type: "STRUCTURE",
              ref_id: structureId.trim(),
            });
          }
          target_scope.push({
            ref_type: "DISTRIBUTOR",
            ref_id: distributorId,
          });

          const createPayload = {
            username,
            email,
            target_scope,
            profiles: [u.profil],
            first_name: u.prenom?.trim() || null,
            last_name: u.nom?.trim() || null,
            matricule: u.matricule?.trim() || null,
          };

          await createBackofficeUser(createPayload);
        } catch (err) {
          const rawMessage = err instanceof Error ? err.message : "Erreur inconnue";
          const message = rawMessage.toLowerCase();

          if (
            message.includes("already exist") ||
            message.includes("déjà") ||
            message.includes("resource already exists")
          ) {
            console.info(`[useDistributeurUsers] Utilisateur ${username} existe déjà dans Keycloak.`);
          } else {
            console.error(`[useDistributeurUsers] Erreur création utilisateur ${username}:`, err);
            toast.error(`Erreur création utilisateur ${username}: ${rawMessage}`);
          }
        }
      }
    },
    [users]
  );

  return {
    users,
    setUsers,
    userForm,
    setUserForm,
    availableUserRoles,
    showUserForm,
    setShowUserForm,
    selectedUserId,
    isUpdatingUser,
    deriveLogin,
    userFormErrors,
    setUserFormErrors,
    clearUserFormError,
    resetUserFormErrors,
    resetUserState,
    openAddUserForm,
    cancelUserForm,
    addUser,
    editUser,
    removeUser,
    updateDistributeurUser,
    loadUsersForDistributor,
    savePendingUsers,
    toggleStatut,
    resetPassword,
    validatePassword,
  };
};
