import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  fetchProduitById,
  fetchProductStructures,
} from "../services/produitsService";
import { ProduitRead } from "../models/types";
import { StructureRead } from "@/features/structures/models/types";
import {
  HierarchyMemberUser,
  HierarchyMembersFilters,
  listHierarchyMembers,
} from "@/core/security/accessSecurityService";

const ACCESS_SECURITY_CLIENT_ID = import.meta.env.VITE_ACCESS_SECURITY_CLIENT_ID ?? "backoffice-web";

export const useProduitDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [produit, setProduit] = useState<ProduitRead | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<string>("details");

  // Structures state & filters
  const [structures, setStructures] = useState<StructureRead[]>([]);
  const [structuresLoading, setStructuresLoading] = useState(false);
  const [structuresLoaded, setStructuresLoaded] = useState(false);
  const [structureSearch, setStructureSearch] = useState<string>("");
  const [structureStatusFilter, setStructureStatusFilter] = useState<string>("all");

  // Utilisateurs state & filters
  const [utilisateurs, setUtilisateurs] = useState<HierarchyMemberUser[]>([]);
  const [utilisateursLoading, setUtilisateursLoading] = useState(false);
  const [utilisateursLoaded, setUtilisateursLoaded] = useState(false);
  const [utilisateurUsername, setUtilisateurUsername] = useState<string>("");
  const [utilisateurEmail, setUtilisateurEmail] = useState<string>("");
  const [utilisateurProfile, setUtilisateurProfile] = useState<string>("");
  const [utilisateurStatus, setUtilisateurStatus] = useState<string>("all");

  // 1. Initial load: Load ONLY the product detail via GET /api/v1/organisation/products/{id}
  useEffect(() => {
    let active = true;
    if (!id) {
      setProduit(null);
      setStructures([]);
      setUtilisateurs([]);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);

    const loadProduct = async () => {
      try {
        const prodData = await fetchProduitById(id);
        if (!active) return;
        setProduit(prodData);
      } catch (error) {
        console.error("Unexpected error in loadProduct", error);
        if (active) {
          setProduit(null);
          const message = error instanceof Error ? error.message : "Impossible de charger les détails du produit";
          toast.error(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      active = false;
    };
  }, [id]);

  // 2. Structures: Called ONLY when structures tab is active or filtered
  // GET /api/v1/organisation/products/{id}/structures?search=...&is_active=...
  const loadStructures = useCallback(
    async (paramsOverride?: { search?: string; status?: string }) => {
      if (!id) return;

      const searchVal = paramsOverride?.search !== undefined ? paramsOverride.search : structureSearch;
      const statusVal = paramsOverride?.status !== undefined ? paramsOverride.status : structureStatusFilter;

      setStructuresLoading(true);
      try {
        const isActiveParam =
          statusVal === "active" ? true : statusVal === "inactive" ? false : undefined;

        const data = await fetchProductStructures(id, {
          skip: 0,
          limit: 100,
          search: searchVal.trim() || undefined,
          is_active: isActiveParam,
        });
        setStructures(data);
        setStructuresLoaded(true);
      } catch (error) {
        console.error("Error loading product structures:", error);
        toast.error("Impossible de charger les structures du produit");
      } finally {
        setStructuresLoading(false);
      }
    },
    [id, structureSearch, structureStatusFilter],
  );

  // Debounce search and status filter changes when structures tab is active
  const prevStructureFiltersRef = useRef({ search: structureSearch, status: structureStatusFilter });
  useEffect(() => {
    if (activeTab !== "structures" || !id) return;

    const filtersChanged =
      prevStructureFiltersRef.current.search !== structureSearch ||
      prevStructureFiltersRef.current.status !== structureStatusFilter;

    prevStructureFiltersRef.current = { search: structureSearch, status: structureStatusFilter };

    if (!filtersChanged) return;

    const timer = setTimeout(() => {
      loadStructures();
    }, 300);

    return () => clearTimeout(timer);
  }, [structureSearch, structureStatusFilter, activeTab, id, loadStructures]);

  // 3. Utilisateurs: Called ONLY when the utilisateurs tab is active or filtered
  // GET /api/v1/security/users/hierarchy/{ref_type}/{ref_id}/members?username=...&email=...&profile=...&status=...
  const loadUtilisateurs = useCallback(
    async (paramsOverride?: {
      username?: string;
      email?: string;
      profile?: string;
      status?: string;
    }) => {
      if (!id) return;

      const usernameVal = paramsOverride?.username !== undefined ? paramsOverride.username : utilisateurUsername;
      const emailVal = paramsOverride?.email !== undefined ? paramsOverride.email : utilisateurEmail;
      const profileVal = paramsOverride?.profile !== undefined ? paramsOverride.profile : utilisateurProfile;
      const statusVal = paramsOverride?.status !== undefined ? paramsOverride.status : utilisateurStatus;

      setUtilisateursLoading(true);
      try {
        const filters: HierarchyMembersFilters = {};
        if (usernameVal.trim()) {
          filters.username = usernameVal.trim();
        }
        if (emailVal.trim()) {
          filters.email = emailVal.trim();
        }
        if (profileVal.trim() && profileVal !== "all" && profileVal !== "__all__") {
          filters.profile = profileVal.trim();
        }
        if (statusVal === "active" || statusVal === "inactive") {
          filters.status = statusVal;
        }

        const hasFilters = Object.keys(filters).length > 0;
        const res = hasFilters
          ? await listHierarchyMembers("PRODUCT", id, ACCESS_SECURITY_CLIENT_ID, filters)
          : await listHierarchyMembers("PRODUCT", id, ACCESS_SECURITY_CLIENT_ID);

        setUtilisateurs(res?.users || []);
        setUtilisateursLoaded(true);
      } catch (error) {
        console.error("Error loading product users:", error);
        toast.error("Impossible de charger les utilisateurs du produit");
      } finally {
        setUtilisateursLoading(false);
      }
    },
    [id, utilisateurUsername, utilisateurEmail, utilisateurProfile, utilisateurStatus],
  );

  // Debounce filter changes when utilisateurs tab is active
  const prevUtilisateurFiltersRef = useRef({
    username: utilisateurUsername,
    email: utilisateurEmail,
    profile: utilisateurProfile,
    status: utilisateurStatus,
  });

  useEffect(() => {
    if (activeTab !== "utilisateurs" || !id) return;

    const filtersChanged =
      prevUtilisateurFiltersRef.current.username !== utilisateurUsername ||
      prevUtilisateurFiltersRef.current.email !== utilisateurEmail ||
      prevUtilisateurFiltersRef.current.profile !== utilisateurProfile ||
      prevUtilisateurFiltersRef.current.status !== utilisateurStatus;

    prevUtilisateurFiltersRef.current = {
      username: utilisateurUsername,
      email: utilisateurEmail,
      profile: utilisateurProfile,
      status: utilisateurStatus,
    };

    if (!filtersChanged) return;

    const timer = setTimeout(() => {
      loadUtilisateurs();
    }, 300);

    return () => clearTimeout(timer);
  }, [
    utilisateurUsername,
    utilisateurEmail,
    utilisateurProfile,
    utilisateurStatus,
    activeTab,
    id,
    loadUtilisateurs,
  ]);

  const availableProfiles = useMemo(() => {
    const defaultProfiles = [
      "profile.bo.produit-central",
      "profile.bo-admin",
      "profile.bo-controller",
    ];
    const userProfiles = utilisateurs.flatMap((u) => u.profiles || []);
    const set = new Set([...defaultProfiles, ...userProfiles]);
    return Array.from(set).filter(Boolean);
  }, [utilisateurs]);

  // Handle tab change
  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
    if (newTab === "structures") {
      if (!structuresLoaded) {
        loadStructures();
      }
    } else if (newTab === "utilisateurs") {
      if (!utilisateursLoaded) {
        loadUtilisateurs();
      }
    }
  }, [structuresLoaded, utilisateursLoaded, loadStructures, loadUtilisateurs]);

  return {
    produit,
    structures,
    structuresLoading,
    structuresLoaded,
    structureSearch,
    setStructureSearch,
    structureStatusFilter,
    setStructureStatusFilter,
    loadStructures,
    utilisateurs,
    setUtilisateurs,
    utilisateursLoading,
    utilisateursLoaded,
    utilisateurUsername,
    setUtilisateurUsername,
    utilisateurEmail,
    setUtilisateurEmail,
    utilisateurProfile,
    setUtilisateurProfile,
    utilisateurStatus,
    setUtilisateurStatus,
    availableProfiles,
    loadUtilisateurs,
    loading,
    activeTab,
    setActiveTab,
    handleTabChange,
  };
};

