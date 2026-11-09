import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { can } from "@/core/permissions/permissions";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import { useStructureCatalogStore } from "@/core/references/structureCatalogStore";
import { emptyForm as emptyAgenceForm } from "@/features/agences/models/data";
import type {
  AgenceCaisseFormLine,
  AgenceCreate,
  AgenceForm,
  AgenceRead,
  AgenceUpdate,
  AgencyParentType,
} from "@/features/agences/models/types";
import {
  createAgence,
  deleteAgence,
  fetchAgencyCaisses,
  toggleAgenceStatus,
  updateAgence,
} from "@/features/agences/services/agencesService";
import {
  activateCaisse,
  createCaisse,
  createCaissesForAgency,
  deactivateCaisse,
  deleteCaisse,
  updateCaisse,
} from "@/features/caisses/services/caissesService";
import { useAgencyCatalogStore } from "@/core/references/agencyCatalogStore";
import type { CaisseForm, CaisseRead } from "@/features/caisses/models/types";
import {
  createBackofficeUser,
  updateAccessSecurityUser,
  type TargetScopeRef,
  type HierarchyMembersFilters,
} from "@/core/security/accessSecurityService";
import type {
  Distributeur,
  DistributeurForm,
  DistributeurUser,
  DistributorUpdate,
} from "../models/types";
import { emptyDistributeurForm } from "../models/data";
import {
  type DistributeurFormField,
  validateDistributeurAgenceForm,
  validateDistributeurCaisseForm,
  validateDistributeurForm,
  validateDistributeurUserForm,
} from "../models/validation";
import type { AgenceFormField } from "@/features/agences/viewmodels/useAgences";
import type { CaisseFormField } from "@/features/caisses/viewmodels/useCaisses";
import { hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import { useDistributeurUsers } from "./useDistributeurUsers";
import {
  activateDistributeur,
  deactivateDistributeur,
  deleteDistributeur,
  fetchDistributeurById,
  fetchDistributorAgencies,
  fetchDistributorCaisses,
  updateDistributeur,
} from "../services/distributeursService";

export const useDistributeurDetail = () => {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [distributeur, setDistributeur] = useState<Distributeur | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active tab state (synced with ?tab= query param)
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTabState] = useState<string>(tabFromUrl || "details");

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTabState(tabFromUrl);
    }
  }, [tabFromUrl]);

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "details") {
        next.delete("tab");
      } else {
        next.set("tab", tab);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Sub-resources states (lazy loaded per tab)
  const [agences, setAgences] = useState<AgenceRead[]>([]);
  const [caisses, setCaisses] = useState<CaisseRead[]>([]);
  const [agencesLoading, setAgencesLoading] = useState(false);
  const [caissesLoading, setCaissesLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [agencesLoaded, setAgencesLoaded] = useState(false);
  const [caissesLoaded, setCaissesLoaded] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);

  // Filtres Agences (recherche backend : search, city, is_active)
  const [agencySearch, setAgencySearch] = useState("");
  const [agencyCity, setAgencyCity] = useState("");
  const [agencyStatus, setAgencyStatus] = useState("all");

  // Filtres Caisses (recherche backend : search, is_active)
  const [caisseSearch, setCaisseSearch] = useState("");
  const [caisseStatus, setCaisseStatus] = useState("all");

  // Filtres Utilisateurs (recherche backend : username, email, profile, status)
  const [userUsername, setUserUsername] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userProfile, setUserProfile] = useState("all");
  const [userStatus, setUserStatus] = useState("all");

  // Dialogs
  const [editDialogOpen, setEditDialogOpenState] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Agence form & actions dialogs
  const [agenceDialogOpen, setAgenceDialogOpen] = useState(false);
  const [editingAgence, setEditingAgence] = useState<AgenceRead | null>(null);
  const [agenceForm, setAgenceForm] = useState<AgenceForm>(emptyAgenceForm);
  const [isSavingAgence, setIsSavingAgence] = useState(false);
  const [togglingAgence, setTogglingAgence] = useState<AgenceRead | null>(null);
  const [agenceStatusDialogOpen, setAgenceStatusDialogOpen] = useState(false);
  const [deletingAgence, setDeletingAgence] = useState<AgenceRead | null>(null);
  const [agenceDeleteDialogOpen, setAgenceDeleteDialogOpen] = useState(false);

  // Caisse form & actions dialogs
  const [caisseDialogOpen, setCaisseDialogOpen] = useState(false);
  const [editingCaisse, setEditingCaisse] = useState<CaisseRead | null>(null);
  const [caisseForm, setCaisseForm] = useState<CaisseForm>({
    name: "",
    code: "",
    agency_id: "",
  });
  const [isSavingCaisse, setIsSavingCaisse] = useState(false);
  const [togglingCaisse, setTogglingCaisse] = useState<CaisseRead | null>(null);
  const [caisseStatusDialogOpen, setCaisseStatusDialogOpen] = useState(false);
  const [deletingCaisse, setDeletingCaisse] = useState<CaisseRead | null>(null);
  const [caisseDeleteDialogOpen, setCaisseDeleteDialogOpen] = useState(false);

  // Erreurs de validation des dialogues Agence / Caisse, remises à zéro à chaque ouverture/fermeture
  const {
    errors: agenceFormErrors,
    setErrors: setAgenceFormErrors,
    clearError: clearAgenceFormError,
    resetErrors: resetAgenceFormErrors,
  } = useFieldErrors<AgenceFormField>();
  const {
    errors: caisseFormErrors,
    setErrors: setCaisseFormErrors,
    clearError: clearCaisseFormError,
    resetErrors: resetCaisseFormErrors,
  } = useFieldErrors<CaisseFormField>();

  useEffect(() => {
    resetAgenceFormErrors();
  }, [agenceDialogOpen, resetAgenceFormErrors]);

  useEffect(() => {
    resetCaisseFormErrors();
  }, [caisseDialogOpen, resetCaisseFormErrors]);

  // Form state
  const [form, setForm] = useState<DistributeurForm>(emptyDistributeurForm);
  const {
    errors: formErrors,
    setErrors: setFormErrors,
    clearError: clearFormError,
    resetErrors: resetFormErrors,
  } = useFieldErrors<DistributeurFormField>();

  // Utilisateur form dialog (dialogue dédié à la gestion d'un utilisateur, sans onglets)
  const [userDialogOpen, setUserDialogOpenState] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Keycloak users sub-hook
  const userManager = useDistributeurUsers(editDialogOpen || userDialogOpen || activeTab === "utilisateurs");
  const { resetUserState, loadUsersForDistributor, savePendingUsers, setUserFormErrors, resetUserFormErrors } =
    userManager;

  // Ouverture/fermeture des formulaires : les erreurs de validation repartent de zéro
  const setEditDialogOpen = useCallback(
    (open: boolean) => {
      resetFormErrors();
      resetUserFormErrors();
      setEditDialogOpenState(open);
    },
    [resetFormErrors, resetUserFormErrors],
  );

  const setUserDialogOpen = useCallback(
    (open: boolean) => {
      resetUserFormErrors();
      setUserDialogOpenState(open);
    },
    [resetUserFormErrors],
  );

  // Permissions
  const { currentActorRole, currentPermissions } = useCurrentActor();
  const permissions = useMemo(
    () => ({
      canRead: can(currentActorRole, "read", "Distributeur", currentPermissions),
      canUpdate: can(currentActorRole, "update", "Distributeur", currentPermissions),
      canDelete: can(currentActorRole, "delete", "Distributeur", currentPermissions),
      canCreateAgence: can(currentActorRole, "create", "Agence", currentPermissions),
      canUpdateAgence: can(currentActorRole, "update", "Agence", currentPermissions),
      canDeleteAgence: can(currentActorRole, "delete", "Agence", currentPermissions),
      canCreateCaisse: can(currentActorRole, "create", "Caisse", currentPermissions),
      canUpdateCaisse: can(currentActorRole, "update", "Caisse", currentPermissions),
      canDeleteCaisse: can(currentActorRole, "delete", "Caisse", currentPermissions),
    }),
    [currentActorRole, currentPermissions],
  );

  // Structure name resolution
  const structureCatalog = useStructureCatalogStore((state) => state.items);
  const structureName = useMemo(() => {
    if (!distributeur?.structure_id && !distributeur?.structureId) return "—";
    const sId = distributeur.structure_id || distributeur.structureId;
    const found = structureCatalog.find((s) => s.id === sId);
    return found?.nom || sId || "—";
  }, [distributeur, structureCatalog]);

  // Load distributor detail
  const loadDetail = useCallback(async () => {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDistributeurById(id);
      setDistributeur(data);
    } catch (err) {
      console.error("[useDistributeurDetail] Erreur chargement détail:", err);
      setError(err instanceof Error ? err.message : "Impossible de charger le distributeur");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load agencies with backend filters
  const loadAgencies = useCallback(
    async (paramsOverride?: { search?: string; city?: string; status?: string }) => {
      if (!id.trim()) return;
      const searchVal = paramsOverride?.search !== undefined ? paramsOverride.search : agencySearch;
      const cityVal = paramsOverride?.city !== undefined ? paramsOverride.city : agencyCity;
      const statusVal = paramsOverride?.status !== undefined ? paramsOverride.status : agencyStatus;
      setAgencesLoading(true);
      try {
        const isActiveParam =
          statusVal === "active" ? true : statusVal === "inactive" ? false : undefined;
        const data = await fetchDistributorAgencies(id, {
          skip: 0,
          limit: 100,
          search: searchVal.trim() || undefined,
          city: cityVal.trim() || undefined,
          is_active: isActiveParam,
        });
        setAgences(data);
        setAgencesLoaded(true);
      } catch (err) {
        console.error("[useDistributeurDetail] Erreur chargement agences:", err);
      } finally {
        setAgencesLoading(false);
      }
    },
    [id, agencySearch, agencyCity, agencyStatus],
  );

  // Load caisses with backend filters
  const loadCaisses = useCallback(
    async (paramsOverride?: { search?: string; status?: string }) => {
      if (!id.trim()) return;
      const searchVal = paramsOverride?.search !== undefined ? paramsOverride.search : caisseSearch;
      const statusVal = paramsOverride?.status !== undefined ? paramsOverride.status : caisseStatus;
      setCaissesLoading(true);
      try {
        const isActiveParam =
          statusVal === "active" ? true : statusVal === "inactive" ? false : undefined;
        const data = await fetchDistributorCaisses(id, {
          skip: 0,
          limit: 100,
          search: searchVal.trim() || undefined,
          is_active: isActiveParam,
        });
        setCaisses(data);
        setCaissesLoaded(true);
      } catch (err) {
        console.error("[useDistributeurDetail] Erreur chargement caisses:", err);
      } finally {
        setCaissesLoading(false);
      }
    },
    [id, caisseSearch, caisseStatus],
  );

  // Load users (backend filters: username, email, profile, status)
  const loadUsers = useCallback(async () => {
    if (!id.trim()) return;
    setUsersLoading(true);
    try {
      const filters: HierarchyMembersFilters = {};
      if (userUsername.trim()) filters.username = userUsername.trim();
      if (userEmail.trim()) filters.email = userEmail.trim();
      if (userProfile.trim() && userProfile !== "all" && userProfile !== "__all__") {
        filters.profile = userProfile.trim();
      }
      if (userStatus === "active" || userStatus === "inactive") {
        filters.status = userStatus;
      }

      await loadUsersForDistributor(id, Object.keys(filters).length > 0 ? filters : undefined);
      setUsersLoaded(true);
    } catch (err) {
      console.error("[useDistributeurDetail] Erreur chargement utilisateurs:", err);
    } finally {
      setUsersLoading(false);
    }
  }, [id, userUsername, userEmail, userProfile, userStatus, loadUsersForDistributor]);

  // Initial load
  useEffect(() => {
    if (!id.trim()) return;
    setAgences([]);
    setCaisses([]);
    setAgencesLoaded(false);
    setCaissesLoaded(false);
    setUsersLoaded(false);
    setAgencySearch("");
    setAgencyCity("");
    setAgencyStatus("all");
    setCaisseSearch("");
    setCaisseStatus("all");
    setUserUsername("");
    setUserEmail("");
    setUserProfile("all");
    setUserStatus("all");
    void loadDetail();
  }, [id, loadDetail]);

  // Tab change: lazy load sub-resources only when their respective tab is clicked
  useEffect(() => {
    if (!id.trim()) return;
    if (activeTab === "agences" && !agencesLoaded) {
      void loadAgencies();
    } else if (activeTab === "caisses") {
      if (!caissesLoaded) {
        void loadCaisses();
      }
      if (!agencesLoaded) {
        void loadAgencies();
      }
    } else if (activeTab === "utilisateurs" && !usersLoaded) {
      void loadUsers();
    }
  }, [activeTab, id, agencesLoaded, caissesLoaded, usersLoaded, loadAgencies, loadCaisses, loadUsers]);

  // Debounce for agency filters
  const prevAgencyFiltersRef = useRef({ search: agencySearch, city: agencyCity, status: agencyStatus });
  useEffect(() => {
    if (activeTab !== "agences" || !id.trim() || !agencesLoaded) return;
    const changed =
      prevAgencyFiltersRef.current.search !== agencySearch ||
      prevAgencyFiltersRef.current.city !== agencyCity ||
      prevAgencyFiltersRef.current.status !== agencyStatus;
    prevAgencyFiltersRef.current = { search: agencySearch, city: agencyCity, status: agencyStatus };
    if (!changed) return;
    const timer = setTimeout(() => {
      void loadAgencies();
    }, 300);
    return () => clearTimeout(timer);
  }, [agencySearch, agencyCity, agencyStatus, activeTab, id, agencesLoaded, loadAgencies]);

  // Debounce for caisse filters
  const prevCaisseFiltersRef = useRef({ search: caisseSearch, status: caisseStatus });
  useEffect(() => {
    if (activeTab !== "caisses" || !id.trim() || !caissesLoaded) return;
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

  // Debounce for user filters
  const prevUserFiltersRef = useRef({
    username: userUsername,
    email: userEmail,
    profile: userProfile,
    status: userStatus,
  });
  useEffect(() => {
    if (activeTab !== "utilisateurs" || !id.trim() || !usersLoaded) return;
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
  }, [userUsername, userEmail, userProfile, userStatus, activeTab, id, usersLoaded, loadUsers]);

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

  // Open edit dialog
  const openEdit = useCallback(() => {
    if (!distributeur) return;
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
    resetUserState();
    void loadUsersForDistributor(distributeur.id);
    setEditDialogOpen(true);
  }, [distributeur, resetUserState, loadUsersForDistributor, setEditDialogOpen]);

  // Save edit
  const handleSave = useCallback(async () => {
    if (!distributeur) return;
    // La structure est figée sur la fiche du distributeur : seul le nom est exigé ici
    const validationErrors = validateDistributeurForm(form, { requireStructure: false });
    setFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    setIsSaving(true);
    try {
      const payload: DistributorUpdate = {
        name: form.nom.trim(),
        structure_id: form.structureId.trim() || undefined,
        address: form.address?.trim() || null,
        contact_email: form.contact_email?.trim() || null,
        contact_phone: form.contact_phone?.trim() || null,
        file: form.file,
      };

      const updated = await updateDistributeur(distributeur.id, payload, form.file);
      await savePendingUsers(distributeur.id, form.structureId.trim());
      setDistributeur(updated);
      setEditDialogOpen(false);
      toast.success("Distributeur mis à jour avec succès");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    } finally {
      setIsSaving(false);
    }
  }, [distributeur, form, savePendingUsers, setFormErrors, setEditDialogOpen]);

  // Toggle status
  const handleToggleStatut = useCallback(async () => {
    if (!distributeur) return;
    try {
      const updated = distributeur.is_active
        ? await deactivateDistributeur(distributeur.id)
        : await activateDistributeur(distributeur.id);

      setDistributeur(updated);
      setStatusDialogOpen(false);
      toast.success(`Distributeur ${updated.is_active ? "activé" : "désactivé"} avec succès`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du changement de statut");
    }
  }, [distributeur]);

  // Delete
  const handleDelete = useCallback(async () => {
    if (!distributeur) return;
    try {
      await deleteDistributeur(distributeur.id);
      toast.success("Distributeur supprimé avec succès");
      navigate("/dashboard/distributeurs");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  }, [distributeur, navigate]);

  // Agence form dialog handlers
  const distributorFormOptions = useMemo(
    () => (distributeur ? [{ id: distributeur.id, nom: distributeur.name || distributeur.nom }] : []),
    [distributeur],
  );

  const structureFormOptions = useMemo(() => {
    const sId = distributeur?.structure_id || distributeur?.structureId;
    return sId ? [{ id: sId, nom: structureName }] : [];
  }, [distributeur, structureName]);

  const openAddAgence = useCallback(() => {
    if (!distributeur) return;
    setEditingAgence(null);
    setAgenceForm({
      ...emptyAgenceForm,
      parent_type: "DISTRIBUTOR",
      parent_id: distributeur.id,
      structureId: distributeur.id,
    });
    setAgenceDialogOpen(true);
  }, [distributeur]);

  const openEditAgence = useCallback(
    async (a: AgenceRead) => {
      if (!permissions.canUpdateAgence) {
        toast.error("Vous n'avez pas l'habilitation pour modifier une agence");
        return;
      }

      let agencyCaisses: CaisseRead[] = [];
      try {
        agencyCaisses = await fetchAgencyCaisses(a.id);
      } catch (error) {
        console.error("[useDistributeurDetail] Erreur chargement caisses agence:", error);
      }

      const caissesLines: AgenceCaisseFormLine[] = agencyCaisses
        .filter((item) => !item.is_deleted)
        .map((item) => ({
          existing_id: item.id,
          name: item.name,
          code: item.code,
        }));

      setEditingAgence(a);
      setAgenceForm({
        name: a.name || "",
        code: a.code || "",
        parent_id: a.parent_id || distributeur?.id || "",
        structureId: a.parent_id || distributeur?.id || "",
        parent_type: (a.parent_type as AgencyParentType) || "DISTRIBUTOR",
        city: a.city || "",
        region: a.region || "",
        country: a.country || "Sénégal",
        address: a.address || "",
        contact_phone: a.contact_phone || "",
        contact_email: a.contact_email || "",
        is_active: a.is_active,
        caisses: caissesLines,
      });
      setAgenceDialogOpen(true);
    },
    [distributeur, permissions.canUpdateAgence],
  );

  const confirmToggleAgenceStatus = useCallback(
    (agence: AgenceRead) => {
      if (!permissions.canUpdateAgence) {
        toast.error("Vous n'avez pas l'habilitation pour modifier le statut d'une agence");
        return;
      }
      setTogglingAgence(agence);
      setAgenceStatusDialogOpen(true);
    },
    [permissions.canUpdateAgence],
  );

  const handleToggleAgenceStatus = useCallback(async () => {
    if (!togglingAgence) return;
    try {
      const nextActive = !togglingAgence.is_active;
      const updated = await toggleAgenceStatus(togglingAgence.id, nextActive);
      toast.success(
        updated.is_active
          ? "Agence activée avec succès"
          : "Agence désactivée avec succès",
      );
      setAgenceStatusDialogOpen(false);
      setTogglingAgence(null);
      await loadAgencies();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de modifier le statut de l'agence";
      toast.error(message);
    }
  }, [togglingAgence, loadAgencies]);

  const confirmDeleteAgence = useCallback(
    (agence: AgenceRead) => {
      if (!permissions.canDeleteAgence) {
        toast.error("Vous n'avez pas l'habilitation pour supprimer une agence");
        return;
      }
      setDeletingAgence(agence);
      setAgenceDeleteDialogOpen(true);
    },
    [permissions.canDeleteAgence],
  );

  const handleDeleteAgence = useCallback(async () => {
    if (!deletingAgence) return;
    try {
      await deleteAgence(deletingAgence.id);
      toast.success("Agence supprimée avec succès");
      setAgenceDeleteDialogOpen(false);
      setDeletingAgence(null);
      await loadAgencies();
      await loadCaisses();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de supprimer l'agence";
      toast.error(message);
    }
  }, [deletingAgence, loadAgencies, loadCaisses]);

  const handleAgenceDialogOpenChange = useCallback((open: boolean) => {
    setAgenceDialogOpen(open);
    if (!open) {
      setEditingAgence(null);
    }
  }, []);

  const handleCaisseDialogOpenChange = useCallback((open: boolean) => {
    setCaisseDialogOpen(open);
    if (!open) {
      setEditingCaisse(null);
    }
  }, []);

  // Ensure first agency is auto-selected when caisse dialog is opened and agencies load
  useEffect(() => {
    if (caisseDialogOpen && !editingCaisse && !caisseForm.agency_id && agences.length > 0) {
      setCaisseForm((prev) => ({
        ...prev,
        agency_id: agences[0].id,
      }));
    }
  }, [caisseDialogOpen, editingCaisse, caisseForm.agency_id, agences]);

  const openAddCaisse = useCallback(async () => {
    if (!permissions.canCreateCaisse) {
      toast.error("Vous n'avez pas l'habilitation pour ajouter une caisse");
      return;
    }

    let currentAgencies = agences;
    if (!agencesLoaded || agences.length === 0) {
      try {
        const data = await fetchDistributorAgencies(id, {
          skip: 0,
          limit: 100,
        });
        setAgences(data);
        setAgencesLoaded(true);
        currentAgencies = data;
      } catch (err) {
        console.error("[useDistributeurDetail] Erreur chargement agences pour nouvelle caisse:", err);
      }
    }

    setEditingCaisse(null);
    setCaisseForm({
      name: "",
      code: "",
      agency_id: currentAgencies[0]?.id || "",
    });
    setCaisseDialogOpen(true);
  }, [permissions.canCreateCaisse, agences, agencesLoaded, id]);

  const openEditCaisse = useCallback(
    async (c: CaisseRead) => {
      if (!permissions.canUpdateCaisse) {
        toast.error("Vous n'avez pas l'habilitation pour modifier une caisse");
        return;
      }
      if (!agencesLoaded || agences.length === 0) {
        try {
          const data = await fetchDistributorAgencies(id, {
            skip: 0,
            limit: 100,
          });
          setAgences(data);
          setAgencesLoaded(true);
        } catch (err) {
          console.error("[useDistributeurDetail] Erreur chargement agences:", err);
        }
      }
      setEditingCaisse(c);
      setCaisseForm({
        name: c.name,
        code: c.code || "",
        agency_id: c.agency_id,
      });
      setCaisseDialogOpen(true);
    },
    [permissions.canUpdateCaisse, agencesLoaded, agences.length, id],
  );

  const handleSaveCaisse = useCallback(async () => {
    if (editingCaisse && !permissions.canUpdateCaisse) {
      toast.error("Vous n'avez pas l'habilitation pour modifier une caisse");
      return;
    }
    if (!editingCaisse && !permissions.canCreateCaisse) {
      toast.error("Vous n'avez pas l'habilitation pour ajouter une caisse");
      return;
    }
    const validationErrors = validateDistributeurCaisseForm(caisseForm);
    setCaisseFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    setIsSavingCaisse(true);
    try {
      if (editingCaisse) {
        await updateCaisse(editingCaisse.id, {
          name: caisseForm.name.trim(),
          code: caisseForm.code?.trim() || null,
          agency_id: caisseForm.agency_id,
          parent_id: distributeur?.id,
          parent_type: "DISTRIBUTOR",
        });
        toast.success("Caisse modifiée avec succès");
      } else {
        await createCaisse({
          name: caisseForm.name.trim(),
          code: caisseForm.code?.trim() || "",
          agency_id: caisseForm.agency_id,
          parent_id: distributeur?.id,
          parent_type: "DISTRIBUTOR",
        });
        toast.success("Caisse créée avec succès");
      }
      setCaisseDialogOpen(false);
      setEditingCaisse(null);
      await loadCaisses();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : editingCaisse
            ? "Impossible de modifier la caisse"
            : "Impossible de créer la caisse";
      toast.error(message);
    } finally {
      setIsSavingCaisse(false);
    }
  }, [editingCaisse, permissions.canUpdateCaisse, permissions.canCreateCaisse, caisseForm, distributeur, loadCaisses, setCaisseFormErrors]);

  const confirmToggleCaisseStatus = useCallback(
    (caisse: CaisseRead) => {
      if (!permissions.canUpdateCaisse) {
        toast.error("Vous n'avez pas l'habilitation pour modifier le statut d'une caisse");
        return;
      }
      setTogglingCaisse(caisse);
      setCaisseStatusDialogOpen(true);
    },
    [permissions.canUpdateCaisse],
  );

  const handleToggleCaisseStatus = useCallback(async () => {
    if (!togglingCaisse) return;
    try {
      const updated = togglingCaisse.is_active
        ? await deactivateCaisse(togglingCaisse.id)
        : await activateCaisse(togglingCaisse.id);
      toast.success(
        updated.is_active
          ? "Caisse activée avec succès"
          : "Caisse désactivée avec succès",
      );
      setCaisseStatusDialogOpen(false);
      setTogglingCaisse(null);
      await loadCaisses();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de modifier le statut de la caisse";
      toast.error(message);
    }
  }, [togglingCaisse, loadCaisses]);

  const confirmDeleteCaisse = useCallback(
    (caisse: CaisseRead) => {
      if (!permissions.canDeleteCaisse) {
        toast.error("Vous n'avez pas l'habilitation pour supprimer une caisse");
        return;
      }
      setDeletingCaisse(caisse);
      setCaisseDeleteDialogOpen(true);
    },
    [permissions.canDeleteCaisse],
  );

  const handleDeleteCaisse = useCallback(async () => {
    if (!deletingCaisse) return;
    try {
      await deleteCaisse(deletingCaisse.id);
      toast.success("Caisse supprimée avec succès");
      setCaisseDeleteDialogOpen(false);
      setDeletingCaisse(null);
      await loadCaisses();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de supprimer la caisse";
      toast.error(message);
    }
  }, [deletingCaisse, loadCaisses]);

  const addCaisseLine = useCallback(() => {
    setAgenceForm((prev) => ({
      ...prev,
      caisses: [
        ...prev.caisses,
        {
          name: "",
          code: "",
        },
      ],
    }));
  }, []);

  const updateCaisseLine = useCallback((index: number, patch: Partial<AgenceCaisseFormLine>) => {
    setAgenceForm((prev) => ({
      ...prev,
      caisses: prev.caisses.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }, []);

  const removeCaisseLine = useCallback((index: number) => {
    setAgenceForm((prev) => ({
      ...prev,
      caisses: prev.caisses.filter((_, itemIndex) => itemIndex !== index),
    }));
  }, []);

  const selectParent = useCallback((parentId: string, parentType?: AgencyParentType) => {
    setAgenceForm((prev) => ({
      ...prev,
      parent_id: parentId,
      structureId: parentId,
      ...(parentType ? { parent_type: parentType } : {}),
    }));
  }, []);

  const selectParentType = useCallback((parentType: AgencyParentType) => {
    const defaultId = distributeur?.id || "";
    setAgenceForm((prev) => ({
      ...prev,
      parent_type: parentType,
      parent_id: defaultId,
      structureId: defaultId,
    }));
  }, [distributeur]);

  const selectStructure = useCallback((structureId: string) => {
    selectParent(structureId, "STRUCTURE");
  }, [selectParent]);

  const handleSaveAgence = useCallback(async () => {
    if (!distributeur) return;
    const validationErrors = validateDistributeurAgenceForm(agenceForm);
    setAgenceFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    if (editingAgence && !permissions.canUpdateAgence) {
      toast.error("Vous n'avez pas l'habilitation pour modifier une agence");
      return;
    }

    if (!editingAgence && !permissions.canCreateAgence) {
      toast.error("Vous n'avez pas l'habilitation pour ajouter une agence");
      return;
    }

    setIsSavingAgence(true);
    try {
      if (editingAgence) {
        const updatePayload: AgenceUpdate = {
          name: agenceForm.name.trim(),
          code: agenceForm.code?.trim() || null,
          address: agenceForm.address?.trim() || null,
          city: agenceForm.city?.trim() || null,
          region: agenceForm.region?.trim() || null,
          country: agenceForm.country?.trim() || null,
          contact_email: agenceForm.contact_email?.trim() || null,
          contact_phone: agenceForm.contact_phone?.trim() || null,
        };

        const updated = await updateAgence(editingAgence.id, updatePayload);

        // Synchronisation des caisses
        if (agenceForm.caisses && agenceForm.caisses.length > 0) {
          const createLines = agenceForm.caisses
            .filter((c) => !c.existing_id && (c.name.trim() || c.code.trim()))
            .map((c) => ({ name: c.name.trim(), code: c.code.trim() }));

          const updateLines = agenceForm.caisses
            .filter((c) => Boolean(c.existing_id))
            .map((c) => ({
              id: c.existing_id!,
              payload: {
                name: c.name.trim(),
                code: c.code.trim(),
              },
            }));

          if (updateLines.length > 0) {
            await Promise.all(
              updateLines.map(async (line) => {
                try {
                  await updateCaisse(line.id, {
                    ...line.payload,
                    parent_id: updated.parent_id,
                    parent_type: updated.parent_type,
                  });
                } catch (e) {
                  console.error("Erreur mise à jour caisse", e);
                }
              }),
            );
          }

          if (createLines.length > 0) {
            const syncRes = await createCaissesForAgency({
              agency_id: updated.id,
              parent_id: updated.parent_id,
              parent_type: updated.parent_type,
              caisses: createLines,
            });
            if (syncRes.errors.length > 0) {
              toast.error(syncRes.errors.map((e) => e.message).join(" | "));
            }
          }
        }

        useAgencyCatalogStore.getState().upsert({ id: updated.id, nom: updated.name });
        toast.success("Agence modifiée avec succès");
        setAgenceDialogOpen(false);
        setEditingAgence(null);

        await loadAgencies();
        await loadCaisses();
        return;
      }

      const payload: AgenceCreate = {
        name: agenceForm.name.trim(),
        code: agenceForm.code?.trim() || null,
        parent_id: distributeur.id,
        parent_type: "DISTRIBUTOR",
        address: agenceForm.address?.trim() || null,
        city: agenceForm.city?.trim() || null,
        region: agenceForm.region?.trim() || null,
        country: agenceForm.country?.trim() || null,
        contact_email: agenceForm.contact_email?.trim() || null,
        contact_phone: agenceForm.contact_phone?.trim() || null,
      };

      const created = await createAgence(payload);

      let caisseSyncResult: {
        created: unknown[];
        skippedDuplicates: string[];
        errors: Array<{ code: string; message: string }>;
      } | null = null;

      if (agenceForm.caisses && agenceForm.caisses.length > 0) {
        const validCaisses = agenceForm.caisses
          .map((c) => ({ name: c.name.trim(), code: c.code.trim() }))
          .filter((c) => c.name || c.code);

        if (validCaisses.length > 0) {
          caisseSyncResult = await createCaissesForAgency({
            agency_id: created.id,
            parent_id: created.parent_id,
            parent_type: created.parent_type,
            caisses: validCaisses,
          });
        }
      }

      useAgencyCatalogStore.getState().upsert({ id: created.id, nom: created.name });

      if (caisseSyncResult && caisseSyncResult.errors.length > 0) {
        const errorMessages = caisseSyncResult.errors
          .map((e) => e.message)
          .join(" | ");
        toast.error(errorMessages);
      } else {
        toast.success("Agence ajoutée avec succès");
      }

      setAgenceDialogOpen(false);
      setEditingAgence(null);

      await loadAgencies();
      if (agenceForm.caisses && agenceForm.caisses.length > 0) {
        await loadCaisses();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'enregistrer l'agence";
      toast.error(message);
    } finally {
      setIsSavingAgence(false);
    }
  }, [distributeur, editingAgence, agenceForm, permissions, loadAgencies, loadCaisses, setAgenceFormErrors]);

  const existingUsernames = useMemo(
    () => userManager.users.map((u) => u.username).filter(Boolean),
    [userManager.users]
  );

  const openAddUser = useCallback(() => {
    userManager.openAddUserForm();
    setUserDialogOpen(true);
  }, [userManager, setUserDialogOpen]);

  const openEditUser = useCallback(
    (userId: string) => {
      userManager.editUser(userId);
      setUserDialogOpen(true);
    },
    [userManager, setUserDialogOpen]
  );

  const handleSaveUser = useCallback(async () => {
    if (!distributeur?.id) return;
    const { nom, prenom, username, email, profil, matricule } = userManager.userForm;
    const validationErrors = validateDistributeurUserForm({ nom, prenom, username, email, profil });
    setUserFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    setIsSavingUser(true);
    try {
      if (userManager.selectedUserId) {
        await updateAccessSecurityUser(userManager.selectedUserId, {
          login: username.trim(),
          profiles: [profil],
          profile_client_id: "backoffice-web",
          first_name: prenom.trim(),
          last_name: nom.trim(),
          email: email.trim().toLowerCase(),
          matricule: matricule?.trim() || null,
        });
        toast.success("Utilisateur modifié avec succès");
      } else {
        const target_scope: TargetScopeRef[] = [];
        const sId = distributeur.structure_id || distributeur.structureId;
        if (sId && sId.trim()) {
          target_scope.push({ ref_type: "STRUCTURE", ref_id: sId.trim() });
        }
        target_scope.push({ ref_type: "DISTRIBUTOR", ref_id: distributeur.id });

        await createBackofficeUser({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          first_name: prenom.trim(),
          last_name: nom.trim(),
          matricule: matricule?.trim() || null,
          profiles: [profil],
          target_scope,
        });
        toast.success("Utilisateur créé avec succès");
      }

      setUserDialogOpen(false);
      await loadUsers();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Erreur lors de l'enregistrement de l'utilisateur"
      );
    } finally {
      setIsSavingUser(false);
    }
  }, [distributeur, userManager.userForm, userManager.selectedUserId, loadUsers, setUserFormErrors, setUserDialogOpen]);

  return {
    distributeur,
    agences,
    caisses,
    loading,
    error,
    agencesLoading,
    caissesLoading,
    usersLoading,
    activeTab,
    setActiveTab,
    permissions,
    structureName,
    // Filtres Agences
    agencySearch,
    setAgencySearch,
    agencyCity,
    setAgencyCity,
    agencyStatus,
    setAgencyStatus,
    loadAgencies,
    // Filtres Caisses
    caisseSearch,
    setCaisseSearch,
    caisseStatus,
    setCaisseStatus,
    loadCaisses,
    // Edit
    editDialogOpen,
    setEditDialogOpen,
    form,
    setForm,
    formErrors,
    clearFormError,
    isSaving,
    openEdit,
    handleSave,
    onFileSelected,
    onLogoFileSelected,
    // Status
    statusDialogOpen,
    setStatusDialogOpen,
    handleToggleStatut,
    // Delete
    deleteDialogOpen,
    setDeleteDialogOpen,
    handleDelete,
    refreshAgencies: loadAgencies,
    refreshCaisses: loadCaisses,
    refresh: loadDetail,
    // Agence dialog & actions
    agenceDialogOpen,
    setAgenceDialogOpen: handleAgenceDialogOpenChange,
    agenceFormErrors,
    clearAgenceFormError,
    editingAgence,
    setEditingAgence,
    agenceForm,
    setAgenceForm,
    isSavingAgence,
    distributorFormOptions,
    structureFormOptions,
    openAddAgence,
    openEditAgence,
    togglingAgence,
    setTogglingAgence,
    agenceStatusDialogOpen,
    setAgenceStatusDialogOpen,
    confirmToggleAgenceStatus,
    handleToggleAgenceStatus,
    deletingAgence,
    setDeletingAgence,
    agenceDeleteDialogOpen,
    setAgenceDeleteDialogOpen,
    confirmDeleteAgence,
    handleDeleteAgence,
    addCaisseLine,
    updateCaisseLine,
    removeCaisseLine,
    selectStructure,
    selectParent,
    selectParentType,
    handleSaveAgence,
    // Caisse dialog & actions
    caisseDialogOpen,
    setCaisseDialogOpen: handleCaisseDialogOpenChange,
    caisseFormErrors,
    clearCaisseFormError,
    editingCaisse,
    setEditingCaisse,
    caisseForm,
    setCaisseForm,
    isSavingCaisse,
    openAddCaisse,
    openEditCaisse,
    handleSaveCaisse,
    togglingCaisse,
    setTogglingCaisse,
    caisseStatusDialogOpen,
    setCaisseStatusDialogOpen,
    confirmToggleCaisseStatus,
    handleToggleCaisseStatus,
    deletingCaisse,
    setDeletingCaisse,
    caisseDeleteDialogOpen,
    setCaisseDeleteDialogOpen,
    confirmDeleteCaisse,
    handleDeleteCaisse,
    // Utilisateurs tab
    users: userManager.users,
    userUsername,
    setUserUsername,
    userEmail,
    setUserEmail,
    userProfile,
    setUserProfile,
    userStatus,
    setUserStatus,
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
    toggleUserStatut: userManager.toggleStatut,
    resetUserPassword: userManager.resetPassword,
    validateUserPassword: (user: DistributeurUser) =>
      userManager.validatePassword(user, (url) => navigate(url)),
    // Dialogue dédié utilisateur (sans onglets)
    userDialogOpen,
    setUserDialogOpen,
    isSavingUser,
    openAddUser,
    openEditUser,
    handleSaveUser,
    existingUsernames,
  };
};

