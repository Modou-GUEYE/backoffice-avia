import { can } from "@/core/permissions/permissions";
import { useStructureCatalogStore } from "@/core/references/structureCatalogStore";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import { CaisseCreate, CaisseRead, CaisseUpdate } from "@/features/caisses/models/types";
import {
  activateCaisse,
  createCaisse,
  deactivateCaisse,
  deleteCaisse,
  hasCaisseDuplicate,
  updateCaisse,
} from "@/features/caisses/services/caissesService";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { AgenceRead, AgencyParentType } from "../models/types";
import { fetchAgenceById, fetchAgencyCaisses } from "../services/agencesService";
import httpClient from "@/core/network/httpClient";
import {
  HierarchyMembersFilters,
  HierarchyMemberUser,
  listHierarchyMembers,
} from "@/core/security/accessSecurityService";
import { FieldErrors, hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import { validateCaisseNameCode } from "@/features/caisses/viewmodels/useCaisses";

const ACCESS_SECURITY_CLIENT_ID =
  import.meta.env.VITE_ACCESS_SECURITY_CLIENT_ID ?? "backoffice-web";

export type CaisseDialogForm = {
  name: string;
  code: string;
};

const emptyCaisseForm: CaisseDialogForm = {
  name: "",
  code: "",
};

export type CaisseDialogFormField = keyof CaisseDialogForm;

/** Valide le formulaire de caisse de la fiche agence et renvoie toutes les erreurs, par champ. */
export const validateCaisseDialogForm = (form: CaisseDialogForm): FieldErrors<CaisseDialogFormField> =>
  validateCaisseNameCode(form.name, form.code);

export const useAgenceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [agence, setAgence] = useState<AgenceRead | null>(null);
  const [caisses, setCaisses] = useState<CaisseRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [caissesLoaded, setCaissesLoaded] = useState<boolean>(false);
  const [caissesLoading, setCaissesLoading] = useState<boolean>(false);
  const [caisseSearch, setCaisseSearch] = useState<string>("");
  const [caisseStatus, setCaisseStatus] = useState<string>("all");

  const [utilisateurs, setUtilisateurs] = useState<HierarchyMemberUser[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const [utilisateursLoaded, setUtilisateursLoaded] = useState<boolean>(false);
  const [userUsername, setUserUsername] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userProfile, setUserProfile] = useState<string>("");
  const [userStatus, setUserStatus] = useState<string>("all");

  const availableProfiles = useMemo(() => {
    const defaultProfiles = [
      "profile.bo.agence-agent",
      "profile.bo.agence-superviseur",
    ];
    const userProfiles = utilisateurs.flatMap((u) => u.profiles || []);
    const set = new Set([...defaultProfiles, ...userProfiles]);
    return Array.from(set).filter(Boolean);
  }, [utilisateurs]);

  const [parentName, setParentName] = useState<string>("");

  const [caisseDialogOpen, setCaisseDialogOpenState] = useState(false);
  const {
    errors: caisseFormErrors,
    setErrors: setCaisseFormErrors,
    clearError: clearCaisseFormError,
    resetErrors: resetCaisseFormErrors,
  } = useFieldErrors<CaisseDialogFormField>();

  const setCaisseDialogOpen = (open: boolean) => {
    // Chaque ouverture ou fermeture repart d'un formulaire sans erreur affichée
    resetCaisseFormErrors();
    setCaisseDialogOpenState(open);
  };
  const [editingCaisse, setEditingCaisse] = useState<CaisseRead | null>(null);
  const [detailCaisse, setDetailCaisse] = useState<CaisseRead | null>(null);
  const [detailCaisseDialogOpen, setDetailCaisseDialogOpen] = useState<boolean>(false);
  const [deletingCaisse, setDeletingCaisse] = useState<CaisseRead | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusTargetCaisse, setStatusTargetCaisse] = useState<CaisseRead | null>(null);
  const [statusNextAction, setStatusNextAction] = useState<"activate" | "deactivate" | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [caisseForm, setCaisseForm] = useState<CaisseDialogForm>(emptyCaisseForm);
  const structureCatalogItems = useStructureCatalogStore((state) => state.items);
  const mergeStructureCatalog = useStructureCatalogStore((state) => state.mergeFromList);

  const { currentActorRole, currentPermissions } = useCurrentActor();
  const readEntityContext = "Agence" as const;
  const caisseCreateEntityContext = "Caisse" as const;

  const permissions = {
    canRead: can(currentActorRole, "read", readEntityContext, currentPermissions),
    canCreate: can(currentActorRole, "create", caisseCreateEntityContext, currentPermissions),
    canUpdate: can(currentActorRole, "update", caisseCreateEntityContext, currentPermissions),
    canDelete: can(currentActorRole, "delete", caisseCreateEntityContext, currentPermissions),
  };

  const resolveParentLabel = (parentId?: string, parentType?: AgencyParentType | string) => {
    if (parentName) return parentName;
    if (!parentId) return "—";
    const targetId = parentId.toLowerCase();
    const struct = structureCatalogItems.find((item) => item.id.toLowerCase() === targetId);
    if (struct) return struct.nom;
    return "—";
  };

  const resolveStructureLabel = (structureId?: string) => resolveParentLabel(structureId, "STRUCTURE");

  // Chargement de l'onglet Détails : Récupération directe de l'agence
  useEffect(() => {
    let active = true;
    if (!id) {
      setAgence(null);
      setCaisses([]);
      setCaissesLoaded(false);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setCaisses([]);
    setCaissesLoaded(false);

    const loadData = async () => {
      try {
        const agenceData = await fetchAgenceById(id);
        if (!active) return;
        setAgence(agenceData);

        // Résolution de l'entité parente
        if (agenceData.parent_id) {
          if (agenceData.parent_type === "DISTRIBUTOR") {
            try {
              const distRes = await httpClient.get<{ id: string; name: string }>(
                `/api/v1/organisation/distributors/${encodeURIComponent(agenceData.parent_id)}`
              );
              if (active && distRes.data?.name) {
                setParentName(distRes.data.name);
              }
            } catch {
              // fallback
            }
          } else {
            const cached = structureCatalogItems.find(
              (s) => s.id.toLowerCase() === agenceData.parent_id.toLowerCase()
            );
            if (cached) {
              setParentName(cached.nom);
            } else {
              try {
                const structRes = await httpClient.get<{ id: string; name: string }>(
                  `/api/v1/organisation/structures/${encodeURIComponent(agenceData.parent_id)}`
                );
                if (active && structRes.data?.name) {
                  setParentName(structRes.data.name);
                  mergeStructureCatalog([{ id: structRes.data.id, nom: structRes.data.name }]);
                }
              } catch {
                // fallback
              }
            }
          }
        }
      } catch (error) {
        console.error("[useAgenceDetail] Failed to load data:", error);
        if (active) {
          setAgence(null);
          toast.error("Impossible de charger les détails de l'agence");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [id, mergeStructureCatalog]);

  // Chargement des caisses avec filtres backend search et is_active
  const loadCaisses = useCallback(
    async (paramsOverride?: { search?: string; status?: string }) => {
      if (!id) return;
      const searchVal = paramsOverride?.search !== undefined ? paramsOverride.search : caisseSearch;
      const statusVal = paramsOverride?.status !== undefined ? paramsOverride.status : caisseStatus;
      setCaissesLoading(true);
      try {
        const isActiveParam = statusVal === "active" ? true : statusVal === "inactive" ? false : undefined;
        const data = await fetchAgencyCaisses(id, {
          search: searchVal.trim() || undefined,
          is_active: isActiveParam,
        });
        setCaisses(Array.isArray(data) ? data.filter((c) => !c.is_deleted) : []);
        setCaissesLoaded(true);
      } catch (error) {
        console.error("[useAgenceDetail] Error loading caisses:", error);
        toast.error("Impossible de charger les caisses de l'agence");
      } finally {
        setCaissesLoading(false);
      }
    },
    [id, caisseSearch, caisseStatus]
  );

  // Debounced effect for caisses filter
  const prevCaisseFiltersRef = useRef({ search: caisseSearch, status: caisseStatus });
  useEffect(() => {
    if (activeTab !== "caisses" || !id || !caissesLoaded) return;
    const changed =
      prevCaisseFiltersRef.current.search !== caisseSearch ||
      prevCaisseFiltersRef.current.status !== caisseStatus;
    prevCaisseFiltersRef.current = { search: caisseSearch, status: caisseStatus };
    if (!changed) return;
    const timer = setTimeout(() => {
      void loadCaisses();
    }, 300);
    return () => clearTimeout(timer);
  }, [caisseSearch, caisseStatus, activeTab, id, caissesLoaded, loadCaisses]);

  // Chargement à la demande des utilisateurs pour l'onglet Utilisateurs
  const loadUsers = useCallback(
    async (paramsOverride?: {
      username?: string;
      email?: string;
      profile?: string;
      status?: string;
    }) => {
      if (!id) return;
      const usernameVal = paramsOverride?.username !== undefined ? paramsOverride.username : userUsername;
      const emailVal = paramsOverride?.email !== undefined ? paramsOverride.email : userEmail;
      const profileVal = paramsOverride?.profile !== undefined ? paramsOverride.profile : userProfile;
      const statusVal = paramsOverride?.status !== undefined ? paramsOverride.status : userStatus;
      setUsersLoading(true);
      try {
        const filters: HierarchyMembersFilters = {};
        if (usernameVal.trim()) filters.username = usernameVal.trim();
        if (emailVal.trim()) filters.email = emailVal.trim();
        if (profileVal.trim() && profileVal !== "all" && profileVal !== "__all__") filters.profile = profileVal.trim();
        if (statusVal === "active" || statusVal === "inactive") filters.status = statusVal;

        const res = Object.keys(filters).length > 0
          ? await listHierarchyMembers("AGENCE", id, ACCESS_SECURITY_CLIENT_ID, filters)
          : await listHierarchyMembers("AGENCE", id, ACCESS_SECURITY_CLIENT_ID);
        setUtilisateurs(res?.users || []);
        setUtilisateursLoaded(true);
      } catch (error) {
        console.error("[useAgenceDetail] Error loading agency users:", error);
        toast.error("Impossible de charger les utilisateurs de l'agence");
      } finally {
        setUsersLoading(false);
      }
    },
    [id, userUsername, userEmail, userProfile, userStatus]
  );

  // Debounced effect for users filter
  const prevUserFiltersRef = useRef({
    username: userUsername,
    email: userEmail,
    profile: userProfile,
    status: userStatus,
  });
  useEffect(() => {
    if (activeTab !== "utilisateurs" || !id) return;
    const changed =
      prevUserFiltersRef.current.username !== userUsername ||
      prevUserFiltersRef.current.email !== userEmail ||
      prevUserFiltersRef.current.profile !== userProfile ||
      prevUserFiltersRef.current.status !== userStatus;
    prevUserFiltersRef.current = {
      username: userUsername,
      email: userEmail,
      profile: userProfile,
      status: userStatus,
    };
    if (!changed) return;
    const timer = setTimeout(() => {
      void loadUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [userUsername, userEmail, userProfile, userStatus, activeTab, id, loadUsers]);

  // Gestion du changement d'onglet
  const handleTabChange = useCallback(
    (newTab: string) => {
      setActiveTab(newTab);
      if (newTab === "caisses") {
        if (!caissesLoaded) {
          void loadCaisses();
        }
      } else if (newTab === "utilisateurs") {
        if (!utilisateursLoaded) {
          void loadUsers();
        }
      }
    },
    [caissesLoaded, loadCaisses, utilisateursLoaded, loadUsers]
  );

  const openCaisseDialog = () => {
    if (!permissions.canCreate) {
      toast.error("Vous n'avez pas l'habilitation pour ajouter une caisse");
      return;
    }
    setEditingCaisse(null);
    setCaisseForm(emptyCaisseForm);
    setCaisseDialogOpen(true);
  };

  const openDetailCaisseDialog = (caisse: CaisseRead) => {
    setDetailCaisse(caisse);
    setDetailCaisseDialogOpen(true);
  };

  const openEditCaisseDialog = (caisse: CaisseRead) => {
    if (!permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour modifier une caisse");
      return;
    }

    setEditingCaisse(caisse);
    setCaisseForm({
      name: caisse.name,
      code: caisse.code ?? "",
    });
    setCaisseDialogOpen(true);
  };
  const buildCaissePayload = (name: string, code: string): CaisseCreate => {
    return {
      name,
      code,
      agency_id: id || "",
      parent_id: agence?.parent_id || null,
      parent_type: agence?.parent_type || null,
    };
  };

  const handleSaveCaisse = async () => {
    if (editingCaisse && !permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour modifier une caisse");
      return;
    }

    if (!editingCaisse && !permissions.canCreate) {
      toast.error("Vous n'avez pas l'habilitation pour ajouter une caisse");
      return;
    }

    const name = caisseForm.name.trim();
    const code = caisseForm.code.trim();

    const validationErrors = validateCaisseDialogForm(caisseForm);
    setCaisseFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    if (!id) return;

    try {
      const isDuplicate = await hasCaisseDuplicate(code, id, editingCaisse?.id);
      if (isDuplicate) {
        toast.error("La caisse  existe déjà!");
        return;
      }

      const payload = buildCaissePayload(name, code);

      if (editingCaisse) {
        const updated = await updateCaisse(editingCaisse.id, payload);
        setCaisses((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        toast.success("Caisse modifiée avec succès");
      } else {
        const created = await createCaisse(payload);
        setCaisses((prev) => [created, ...prev]);
        toast.success("Caisse ajoutée avec succès");
      }

      setEditingCaisse(null);
      setCaisseDialogOpen(false);
      setCaisseForm(emptyCaisseForm);
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : "Erreur lors de l'enregistrement de la caisse";
      toast.error(message);
    }
  };

  const openDeleteCaisse = (caisse: CaisseRead) => {
    if (!permissions.canDelete) {
      toast.error("Vous n'avez pas l'habilitation pour supprimer une caisse");
      return;
    }

    setDeletingCaisse(caisse);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCaisse = async () => {
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
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : "Erreur lors de la suppression";
      toast.error(message);
    }
  };

  const requestToggleCaisseStatut = (caisse: CaisseRead) => {
    if (!permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour modifier le statut");
      return;
    }

    setStatusTargetCaisse(caisse);
    setStatusNextAction(caisse.is_active ? "deactivate" : "activate");
    setStatusDialogOpen(true);
  };

  const confirmToggleCaisseStatut = async () => {
    if (!statusTargetCaisse || !statusNextAction) return;

    try {
      const updated =
        statusNextAction === "deactivate"
          ? await deactivateCaisse(statusTargetCaisse.id)
          : await activateCaisse(statusTargetCaisse.id);
      setCaisses((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success("Statut mis à jour");
      setStatusDialogOpen(false);
      setStatusTargetCaisse(null);
      setStatusNextAction(null);
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : "Erreur lors de la mise à jour du statut";
      toast.error(message);
    }
  };

  const cancelToggleCaisseStatut = () => {
    setStatusDialogOpen(false);
    setStatusTargetCaisse(null);
    setStatusNextAction(null);
  };

  const statusDialogTitle =
    statusNextAction === "deactivate"
      ? "Confirmer la désactivation"
      : "Confirmer l'activation";

  const statusDialogDescription = (() => {
    if (!statusTargetCaisse) {
      return "";
    }

    if (statusNextAction === "deactivate") {
      return `Voulez-vous désactiver la caisse « ${statusTargetCaisse.name} » ?`;
    }

    return `Voulez-vous activer la caisse « ${statusTargetCaisse.name} » ?`;
  })();

  const statusConfirmLabel = statusNextAction === "deactivate" ? "Désactiver" : "Activer";

  const statutBadge = (isActive: boolean) =>
    isActive
      ? "bg-accent/15 text-accent border-accent/30 hover:bg-accent/20"
      : "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20";

  return {
    agence,
    caisses,
    loading,
    activeTab,
    handleTabChange,
    caissesLoading,
    caissesLoaded,
    caisseSearch,
    setCaisseSearch,
    caisseStatus,
    setCaisseStatus,
    loadCaisses,
    utilisateurs,
    usersLoading,
    utilisateursLoaded,
    userUsername,
    setUserUsername,
    userSearch: userUsername,
    setUserSearch: setUserUsername,
    userEmail,
    setUserEmail,
    userProfile,
    setUserProfile,
    userStatus,
    setUserStatus,
    availableProfiles,
    loadUsers,
    permissions,
    caisseDialogOpen,
    editingCaisse,
    deletingCaisse,
    deleteDialogOpen,
    statusTargetCaisse,
    statusNextAction,
    statusDialogOpen,
    statusDialogTitle,
    statusDialogDescription,
    statusConfirmLabel,
    setCaisseDialogOpen,
    setDeleteDialogOpen,
    setDeletingCaisse,
    setStatusDialogOpen,
    caisseForm,
    setCaisseForm,
    caisseFormErrors,
    clearCaisseFormError,
    resolveStructureLabel,
    resolveParentLabel,
    detailCaisse,
    detailCaisseDialogOpen,
    setDetailCaisseDialogOpen,
    openDetailCaisseDialog,
    openCaisseDialog,
    openEditCaisseDialog,
    openDeleteCaisse,
    handleSaveCaisse,
    handleDeleteCaisse,
    requestToggleCaisseStatut,
    confirmToggleCaisseStatut,
    cancelToggleCaisseStatut,
    statutBadge,
  };
};
