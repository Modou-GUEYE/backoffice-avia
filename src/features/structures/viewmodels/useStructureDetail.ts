import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { can } from "@/core/permissions/permissions";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import {
  HierarchyMemberUser,
  HierarchyMembersFilters,
  HierarchyMembersResponse,
  listHierarchyMembers,
} from "@/core/security/accessSecurityService";
import {
  fetchStructureById,
  updateStructure,
  fetchStructureAgencies,
  fetchStructureCaisses,
  fetchStructureDistributors,
} from "../services/structuresService";
import httpClient from "@/core/network/httpClient";
import {
  fetchPackages,
  fetchPackageById,
  assignPackageToStructure,
  changeStructurePackage,
  fetchStructureActivePackage,
  suspendStructurePackage,
  resumeStructurePackage,
  terminateStructurePackage,
  StructurePackageAssignmentResponse,
  PackageResponse,
} from "@/features/parametres/services/packagesService";
import { useTheme } from "@/core/theme/ThemeContext";
import { StructureRead, StructureForm, StructureType } from "../models/types";

import { AgenceRead } from "@/features/agences/models/types";
import { CaisseRead } from "@/features/caisses/models/types";
import { Distributeur } from "@/features/distributeurs/models/types";
import { mapApiToDistributeur as mapDistributeurToUi } from "@/features/distributeurs/services/distributeursService";
import { getProfileDisplayName } from "@/features/utilisateurs/models/profileLabels";
import { emptyForm, DEFAULT_BRANDING_COLORS } from "../models/data";

const ACCESS_SECURITY_CLIENT_ID = import.meta.env.VITE_ACCESS_SECURITY_CLIENT_ID ?? "backoffice-web";

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const parseNameParts = (username?: string): { prenom: string; nom: string } => {
  if (!username) return { prenom: "-", nom: "-" };
  const parts = username.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) {
    return { prenom: "-", nom: "-" };
  }

  const [first, ...rest] = parts;
  const last = rest.join(" ") || "-";
  return {
    prenom: first.charAt(0).toUpperCase() + first.slice(1),
    nom: last.toUpperCase(),
  };
};

const getValidLogoUrl = (urlOrPath: string | null | undefined): string => {
  return urlOrPath || "";
};

export const useStructureDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [structure, setStructure] = useState<StructureRead | null>(null);
  const [agences, setAgences] = useState<AgenceRead[]>([]);
  const [caisses, setCaisses] = useState<CaisseRead[]>([]);
  const [ensembles, setEnsembles] = useState<Distributeur[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<HierarchyMemberUser[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; nom: string }>>([]);
  const [packages, setPackages] = useState<Array<{ id: string; nom: string }>>([]);
  const [activeAssignment, setActiveAssignment] = useState<StructurePackageAssignmentResponse | null>(null);
  const [associatedPackage, setAssociatedPackage] = useState<PackageResponse | null>(null);
  const [packageLoading, setPackageLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [activeTab, setActiveTab] = useState<string>("details");

  // Flags de chargement à la demande par onglet (lazy loading)
  const [agencesLoaded, setAgencesLoaded] = useState<boolean>(false);
  const [caissesLoaded, setCaissesLoaded] = useState<boolean>(false);
  const [ensemblesLoaded, setEnsemblesLoaded] = useState<boolean>(false);
  const [utilisateursLoaded, setUtilisateursLoaded] = useState<boolean>(false);
  const [configsLoaded, setConfigsLoaded] = useState<boolean>(false);

  // Filtres et chargement par sous-ressource
  const [agencySearch, setAgencySearch] = useState<string>("");
  const [agencyStatus, setAgencyStatus] = useState<string>("all");
  const [agenciesLoading, setAgenciesLoading] = useState<boolean>(false);

  const [caisseSearch, setCaisseSearch] = useState<string>("");
  const [caisseStatus, setCaisseStatus] = useState<string>("all");
  const [caissesLoading, setCaissesLoading] = useState<boolean>(false);

  const [ensembleSearch, setEnsembleSearch] = useState<string>("");
  const [ensembleStatus, setEnsembleStatus] = useState<string>("all");
  const [ensemblesLoading, setEnsemblesLoading] = useState<boolean>(false);

  const [userUsername, setUserUsername] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userProfile, setUserProfile] = useState<string>("");
  const [userStatus, setUserStatus] = useState<string>("all");
  const [usersLoading, setUsersLoading] = useState<boolean>(false);

  const availableProfiles = useMemo(() => {
    const set = new Set<string>();
    for (const u of utilisateurs) {
      if (Array.isArray(u.profiles)) {
        for (const p of u.profiles) {
          if (p) set.add(p);
        }
      }
    }
    return Array.from(set);
  }, [utilisateurs]);

  // Edit States for direct inline form
  const [form, setForm] = useState<StructureForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);

  const handleLogoFileChange = (file: File | null) => {
    setPendingLogoFile(file);
    if (!file) {
      setForm((prev) => ({ ...prev, logoUrl: "", logoFile: null }));
      return;
    }
    const previewUrl = typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : "";
    setForm((prev) => ({ ...prev, logoUrl: previewUrl, logoFile: file }));
  };

  const { allBrandings, saveBranding } = useTheme();
  const { currentActorRole, currentPermissions } = useCurrentActor();
  const entityContext = "Structure" as const;

  const permissions = {
    canRead: can(currentActorRole, "read", entityContext, currentPermissions),
    canUpdate: can(currentActorRole, "update", entityContext, currentPermissions),
  };

  const structureBranding = allBrandings.find((b) => b.id === id);

  // 1. Chargement initial : Uniquement la structure et la liste des produits pour l'onglet Détails
  useEffect(() => {
    let active = true;
    if (!id) {
      setStructure(null);
      setAgences([]);
      setCaisses([]);
      setEnsembles([]);
      setUtilisateurs([]);
      setAgencesLoaded(false);
      setCaissesLoaded(false);
      setEnsemblesLoaded(false);
      setUtilisateursLoaded(false);
      setConfigsLoaded(false);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const loadData = async () => {
      setLoading(true);
      // Réinitialiser les états des sous-ressources au changement de structure
      setAgences([]);
      setAgencesLoaded(false);
      setCaisses([]);
      setCaissesLoaded(false);
      setEnsembles([]);
      setEnsemblesLoaded(false);
      setUtilisateurs([]);
      setUtilisateursLoaded(false);
      setConfigsLoaded(false);

      try {
        console.log(`[useStructureDetail] Chargement de la structure via GET /api/v1/organisation/structures/${id}`);
        const structData = await fetchStructureById(id);

        if (!active || !structData) return;

        // Définir la structure principale pour un affichage instantané
        const branding = (structData.branding_config || {}) as Record<string, unknown>;

        setStructure(structData);
        setForm({
          code: structData.code || "",
          name: structData.name || "",
          type: structData.type || "",
          description: structData.description || "",
          legal_name: structData.legal_name || "",
          registration_number: structData.registration_number || "",
          address: structData.address || "",
          contact_email: structData.contact_email || "",
          contact_phone: structData.contact_phone || "",
          is_active: structData.is_active,
          logoUrl: structData.media_url || "",
          libelleExpediteurSMS: structData.sender_label || "",
          packageId: "",
          ajouterProduit: !!structData.product_id,
          produitId: structData.product_id || "",
          primaryColor: (branding.primaryColor as string) || DEFAULT_BRANDING_COLORS.primaryColor,
          secondaryColor: (branding.secondaryColor as string) || DEFAULT_BRANDING_COLORS.secondaryColor,
          accentColor: (branding.accentColor as string) || DEFAULT_BRANDING_COLORS.accentColor,
          sidebarColor: (branding.sidebarColor as string) || DEFAULT_BRANDING_COLORS.sidebarColor,
          borderColor: (branding.borderColor as string) || DEFAULT_BRANDING_COLORS.borderColor,
        });

        // Charger les produits pour la résolution du nom du produit rattaché dans l'onglet Détails
        try {
          const productsRes = await httpClient.get<unknown>("/api/v1/organisation/products/").then((r) => r.data).catch(() => []);
          if (active) {
            const rawProducts = Array.isArray(productsRes) ? productsRes : (productsRes as { items?: unknown } | null | undefined)?.items || [];
            setProducts(
              (Array.isArray(rawProducts) ? rawProducts : [])
                .filter((p?: { id?: string | number; nom?: string; name?: string }) => p?.id && (p.nom || p.name))
                .map((p: { id?: string | number; nom?: string; name?: string }) => ({ id: String(p.id), nom: String(p.nom || p.name) }))
            );
          }
        } catch (prodErr) {
          console.warn("[useStructureDetail] Erreur lors du chargement des produits:", prodErr);
        }

        // Résolution du package associé dans l'onglet Détails via GET /api/v1/packages-services/packages/{package_id}
        try {
          if (active) setPackageLoading(true);
          const activeAss = id ? await fetchStructureActivePackage(id).catch(() => null) : null;
          if (active) {
            setActiveAssignment(activeAss);
            const activePkgId =
              activeAss && activeAss.status !== "TERMINATED"
                ? activeAss.package_id
                : (!activeAss && structData.package ? structData.package : "");

            setForm((prev) => ({ ...prev, packageId: activePkgId }));

            if (activePkgId) {
              const pkgData = await fetchPackageById(activePkgId).catch(() => null);
              if (active) {
                setAssociatedPackage(pkgData);
              }
            } else {
              setAssociatedPackage(null);
            }
          }
        } catch (pkgErr) {
          console.warn("[useStructureDetail] Erreur lors de la résolution du package associé:", pkgErr);
        } finally {
          if (active) setPackageLoading(false);
        }
      } catch (error) {
        console.error("Unexpected error in loadData", error);
        setStructure(null);
        toast.error("Impossible de charger les détails de la structure");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [id, refreshTrigger]);

  // Handlers de chargement filtré pour chaque sous-ressource
  const loadAgencies = useCallback(
    async (paramsOverride?: { search?: string; status?: string }) => {
      if (!id) return;
      const searchVal = paramsOverride?.search !== undefined ? paramsOverride.search : agencySearch;
      const statusVal = paramsOverride?.status !== undefined ? paramsOverride.status : agencyStatus;
      setAgenciesLoading(true);
      try {
        const isActiveParam = statusVal === "active" ? true : statusVal === "inactive" ? false : undefined;
        const data = await fetchStructureAgencies(id, {
          skip: 0,
          limit: 100,
          search: searchVal.trim() || undefined,
          is_active: isActiveParam,
        });
        setAgences(Array.isArray(data) ? data : []);
        setAgencesLoaded(true);
      } catch (error) {
        console.error("Error loading structure agencies:", error);
        toast.error("Impossible de charger les agences de la structure");
      } finally {
        setAgenciesLoading(false);
      }
    },
    [id, agencySearch, agencyStatus]
  );

  const loadCaisses = useCallback(
    async (paramsOverride?: { search?: string; status?: string }) => {
      if (!id) return;
      const searchVal = paramsOverride?.search !== undefined ? paramsOverride.search : caisseSearch;
      const statusVal = paramsOverride?.status !== undefined ? paramsOverride.status : caisseStatus;
      setCaissesLoading(true);
      try {
        const isActiveParam = statusVal === "active" ? true : statusVal === "inactive" ? false : undefined;
        const data = await fetchStructureCaisses(id, {
          skip: 0,
          limit: 100,
          search: searchVal.trim() || undefined,
          is_active: isActiveParam,
        });
        setCaisses(Array.isArray(data) ? data : []);
        setCaissesLoaded(true);
      } catch (error) {
        console.error("Error loading structure caisses:", error);
        toast.error("Impossible de charger les caisses de la structure");
      } finally {
        setCaissesLoading(false);
      }
    },
    [id, caisseSearch, caisseStatus]
  );

  const loadEnsembles = useCallback(
    async (paramsOverride?: { search?: string; status?: string }) => {
      if (!id) return;
      const searchVal = paramsOverride?.search !== undefined ? paramsOverride.search : ensembleSearch;
      const statusVal = paramsOverride?.status !== undefined ? paramsOverride.status : ensembleStatus;
      setEnsemblesLoading(true);
      try {
        const isActiveParam = statusVal === "active" ? true : statusVal === "inactive" ? false : undefined;
        const data = await fetchStructureDistributors(id, {
          skip: 0,
          limit: 100,
          search: searchVal.trim() || undefined,
          is_active: isActiveParam,
        });
        const rawList = Array.isArray(data) ? data : [];
        setEnsembles(rawList.map((d) => mapDistributeurToUi(d)));
        setEnsemblesLoaded(true);
      } catch (error) {
        console.error("Error loading structure distributors:", error);
        toast.error("Impossible de charger les distributeurs de la structure");
      } finally {
        setEnsemblesLoading(false);
      }
    },
    [id, ensembleSearch, ensembleStatus]
  );

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
          ? await listHierarchyMembers("STRUCTURE", id, ACCESS_SECURITY_CLIENT_ID, filters)
          : await listHierarchyMembers("STRUCTURE", id, ACCESS_SECURITY_CLIENT_ID);
        setUtilisateurs(res?.users || []);
        setUtilisateursLoaded(true);
      } catch (error) {
        console.error("Error loading structure users:", error);
        toast.error("Impossible de charger les utilisateurs de la structure");
      } finally {
        setUsersLoading(false);
      }
    },
    [id, userUsername, userEmail, userProfile, userStatus]
  );

  const loadConfigs = useCallback(async () => {
    if (!id) return;
    try {
      const [pkgsRes, activePkgAss] = await Promise.allSettled([
        fetchPackages().catch(() => []),
        fetchStructureActivePackage(id).catch(() => null),
      ]);
      const pkgsData = pkgsRes.status === "fulfilled" && Array.isArray(pkgsRes.value) ? pkgsRes.value : [];
      const activeAssignmentData = activePkgAss.status === "fulfilled" ? activePkgAss.value : null;

      setPackages(
        pkgsData
          .filter((pkg) => pkg && typeof pkg === "object" && pkg.status === "active")
          .map((pkg) => ({ id: String(pkg.id), nom: pkg.label }))
      );

      setActiveAssignment(activeAssignmentData);
      if (activeAssignmentData && activeAssignmentData.status !== "TERMINATED" && activeAssignmentData.package_id) {
        setForm((prev) => ({ ...prev, packageId: activeAssignmentData.package_id }));
        const found = pkgsData.find((p) => String(p.id) === String(activeAssignmentData.package_id));
        if (found) {
          setAssociatedPackage(found);
        }
      } else {
        setForm((prev) => ({ ...prev, packageId: "" }));
        setAssociatedPackage(null);
      }
      setConfigsLoaded(true);
    } catch (error) {
      console.error("Error loading structure packages/configs:", error);
    }
  }, [id]);

  // Synchronisation automatique des packages lorsque l'onglet configs est actif ou rafraîchi
  useEffect(() => {
    if (activeTab === "configs" && id) {
      loadConfigs();
    }
  }, [activeTab, id, refreshTrigger, loadConfigs]);

  // Déclenchement à la demande lors du changement d'onglet
  const handleTabChange = useCallback(
    (newTab: string) => {
      setActiveTab(newTab);
      if (newTab === "agences") {
        if (!agencesLoaded) {
          loadAgencies();
        }
      } else if (newTab === "caisses") {
        if (!caissesLoaded) {
          loadCaisses();
        }
      } else if (newTab === "ensembles") {
        if (!ensemblesLoaded) {
          loadEnsembles();
        }
      } else if (newTab === "utilisateurs") {
        if (!utilisateursLoaded) {
          loadUsers();
        }
      } else if (newTab === "configs") {
        if (!configsLoaded) {
          loadConfigs();
        }
      }
    },
    [agencesLoaded, caissesLoaded, ensemblesLoaded, utilisateursLoaded, configsLoaded, loadAgencies, loadCaisses, loadEnsembles, loadUsers, loadConfigs]
  );

  // Debounces pour chaque onglet actif
  const prevAgencyFiltersRef = useRef({ search: agencySearch, status: agencyStatus });
  useEffect(() => {
    if (activeTab !== "agences" || !id) return;
    const changed = prevAgencyFiltersRef.current.search !== agencySearch || prevAgencyFiltersRef.current.status !== agencyStatus;
    prevAgencyFiltersRef.current = { search: agencySearch, status: agencyStatus };
    if (!changed) return;
    const timer = setTimeout(() => { loadAgencies(); }, 300);
    return () => clearTimeout(timer);
  }, [agencySearch, agencyStatus, activeTab, id, loadAgencies]);

  const prevCaisseFiltersRef = useRef({ search: caisseSearch, status: caisseStatus });
  useEffect(() => {
    if (activeTab !== "caisses" || !id) return;
    const changed = prevCaisseFiltersRef.current.search !== caisseSearch || prevCaisseFiltersRef.current.status !== caisseStatus;
    prevCaisseFiltersRef.current = { search: caisseSearch, status: caisseStatus };
    if (!changed) return;
    const timer = setTimeout(() => { loadCaisses(); }, 300);
    return () => clearTimeout(timer);
  }, [caisseSearch, caisseStatus, activeTab, id, loadCaisses]);

  const prevEnsembleFiltersRef = useRef({ search: ensembleSearch, status: ensembleStatus });
  useEffect(() => {
    if (activeTab !== "ensembles" || !id) return;
    const changed = prevEnsembleFiltersRef.current.search !== ensembleSearch || prevEnsembleFiltersRef.current.status !== ensembleStatus;
    prevEnsembleFiltersRef.current = { search: ensembleSearch, status: ensembleStatus };
    if (!changed) return;
    const timer = setTimeout(() => { loadEnsembles(); }, 300);
    return () => clearTimeout(timer);
  }, [ensembleSearch, ensembleStatus, activeTab, id, loadEnsembles]);

  const prevUserFiltersRef = useRef({ username: userUsername, email: userEmail, profile: userProfile, status: userStatus });
  useEffect(() => {
    if (activeTab !== "utilisateurs" || !id) return;
    const changed =
      prevUserFiltersRef.current.username !== userUsername ||
      prevUserFiltersRef.current.email !== userEmail ||
      prevUserFiltersRef.current.profile !== userProfile ||
      prevUserFiltersRef.current.status !== userStatus;
    prevUserFiltersRef.current = { username: userUsername, email: userEmail, profile: userProfile, status: userStatus };
    if (!changed) return;
    const timer = setTimeout(() => { loadUsers(); }, 300);
    return () => clearTimeout(timer);
  }, [userUsername, userEmail, userProfile, userStatus, activeTab, id, loadUsers]);

  const resolveProductName = (productId?: string) => {
    if (!productId) return "Aucun";
    return products.find((p) => p.id === productId)?.nom || productId;
  };

  const resolvePackageName = (packageId?: string | null) => {
    if (!packageId) return "Aucun package";
    if (associatedPackage && (associatedPackage.id === packageId || !associatedPackage.id)) {
      return associatedPackage.label || associatedPackage.code || packageId;
    }
    const found = packages.find((p) => p.id === packageId);
    return found ? found.nom : (associatedPackage?.label || packageId);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!id || !structure) return;

    setIsSaving(true);
    try {
      const fileToUpload = form.logoFile || pendingLogoFile;

      const payload = {
        name: form.name.trim(),
        type: form.type as StructureType,
        description: form.description.trim() || null,
        legal_name: form.legal_name.trim() || null,
        registration_number: form.registration_number.trim() || null,
        address: form.address.trim(),
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        product_id: form.produitId || undefined,
        sender_label: form.libelleExpediteurSMS.trim() || null,
        package: form.packageId || null,
        file: fileToUpload || undefined,
        branding_config: {
          primaryColor: form.primaryColor || DEFAULT_BRANDING_COLORS.primaryColor,
          secondaryColor: form.secondaryColor || DEFAULT_BRANDING_COLORS.secondaryColor,
          accentColor: form.accentColor || DEFAULT_BRANDING_COLORS.accentColor,
          sidebarColor: form.sidebarColor || DEFAULT_BRANDING_COLORS.sidebarColor,
          borderColor: form.borderColor || DEFAULT_BRANDING_COLORS.borderColor,
        },
      };

      const updated = await updateStructure(id, payload, fileToUpload);
      setPendingLogoFile(null);

      setStructure(updated);

      const finalMediaUrl = updated?.media_url ?? "";
      const finalBrandingData = {
        ...payload.branding_config,
        entityName: updated?.name || form.name.trim() || structure.name,
        mediaUrl: finalMediaUrl,
        logoUrl: finalMediaUrl,
      };

      // Met à jour la charte graphique locale immédiatement
      saveBranding({
        id,
        entityName: finalBrandingData.entityName,
        logoUrl: finalMediaUrl,
        faviconUrl: "",
        primaryColor: finalBrandingData.primaryColor,
        secondaryColor: finalBrandingData.secondaryColor,
        accentColor: finalBrandingData.accentColor,
        sidebarColor: finalBrandingData.sidebarColor,
        borderColor: finalBrandingData.borderColor,
        fontFamily: "Inter",
        loginBgUrl: "",
        tagline: "",
      });

      toast.success("Configuration enregistrée avec succès");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur lors de la modification de la structure";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignOrChangePackage = async () => {
    if (!id || !structure) return;
    const selectedPkgId = form.packageId;
    if (!selectedPkgId) {
      toast.error("Veuillez sélectionner un package");
      return;
    }
    const currentPkgId = activeAssignment?.package_id;
    const isTerminated = activeAssignment?.status === "TERMINATED";
    if (selectedPkgId === currentPkgId && !isTerminated) {
      toast.info("Ce package est déjà assigné à cette structure");
      return;
    }
    try {
      setIsSaving(true);
      const isTerminated = activeAssignment?.status === "TERMINATED";
      let result: StructurePackageAssignmentResponse;
      if (!currentPkgId || isTerminated) {
        result = await assignPackageToStructure(id, selectedPkgId);
      } else {
        result = await changeStructurePackage(id, selectedPkgId);
      }
      setActiveAssignment(result);
      setStructure((prev) => prev ? { ...prev, package: selectedPkgId } : prev);
      setForm((prev) => ({ ...prev, packageId: selectedPkgId }));
      const pkgInfo = await fetchPackageById(selectedPkgId).catch(() => null);
      if (pkgInfo) {
        setAssociatedPackage(pkgInfo);
      }
      toast.success("Package assigné avec succès");
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur lors de l'assignation du package";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuspendPackage = async () => {
    if (!id) return;
    try {
      setIsSaving(true);
      const res = await suspendStructurePackage(id);
      setActiveAssignment(res);
      toast.success("Package suspendu temporairement avec succès");
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur lors de la suspension du package";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResumePackage = async () => {
    if (!id) return;
    try {
      setIsSaving(true);
      const res = await resumeStructurePackage(id);
      setActiveAssignment(res);
      toast.success("Package réactivé avec succès");
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur lors de la réactivation du package";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTerminatePackage = async () => {
    if (!id) return;
    try {
      setIsSaving(true);
      const res = await terminateStructurePackage(id);
      setActiveAssignment(res);
      setAssociatedPackage(null);
      setStructure((prev) => prev ? { ...prev, package: null } : prev);
      setForm((prev) => ({ ...prev, packageId: "" }));
      toast.success("Package résilié définitivement avec succès");
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur lors de la résiliation du package";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    structure,
    agences,
    caisses,
    ensembles,
    utilisateurs,
    setUtilisateurs,
    loading,
    permissions,
    structureBranding,
    resolveProductName,
    resolvePackageName,
    associatedPackage,
    packageLoading,
    form,
    setForm,
    isSaving,
    handleSave,
    produitOptions: products,
    packages,
    activeAssignment,
    handleAssignOrChangePackage,
    handleSuspendPackage,
    handleResumePackage,
    handleTerminatePackage,
    handleLogoFileChange,
    formatDate,
    parseNameParts,
    getValidLogoUrl,
    getProfileDisplayName,
    activeTab,
    handleTabChange,
    agencySearch,
    setAgencySearch,
    agencyStatus,
    setAgencyStatus,
    agenciesLoading,
    agencesLoaded,
    loadAgencies,
    caisseSearch,
    setCaisseSearch,
    caisseStatus,
    setCaisseStatus,
    caissesLoading,
    caissesLoaded,
    loadCaisses,
    ensembleSearch,
    setEnsembleSearch,
    ensembleStatus,
    setEnsembleStatus,
    ensemblesLoading,
    ensemblesLoaded,
    loadEnsembles,
    userUsername,
    setUserUsername,
    userEmail,
    setUserEmail,
    userProfile,
    setUserProfile,
    userStatus,
    setUserStatus,
    usersLoading,
    utilisateursLoaded,
    loadUsers,
    availableProfiles,
    configsLoaded,
    loadConfigs,
  };
};
