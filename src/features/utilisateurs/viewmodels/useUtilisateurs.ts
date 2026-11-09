import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { can } from "@/core/permissions/permissions";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import { useAuthStore, parseJwtPayload } from "@/core/security/authStore";
import {
  AccessSecurityRefType,
  HierarchyMembersFilters,
  HierarchyMembersResponse,
  TargetScopeRef,
  activateAccessSecurityUser,
  createBackofficeUser,
  deactivateAccessSecurityUser,
  deleteAccessSecurityUser,
  importBackofficeUsers,
  listClientCompositeRoles,
  listHierarchyMembers,
  requestAccessSecurityPasswordReset,
  updateAccessSecurityUser,
} from "@/core/security/accessSecurityService";
import { fetchStructures } from "@/features/structures/services/structuresService";
import { StructureRead } from "@/features/structures/models/types";
import { Distributeur } from "@/features/distributeurs/models/types";
import { fetchDistributeurs } from "@/features/distributeurs/services/distributeursService";
import { emptyUtilisateurForm } from "../models/data";
import { getDefaultProfileRoles, getProfileDisplayName, isProfileRole, isProfileRoleForEntityContext, requiresAgence, requiresCaisse, requiresDistributor } from "../models/profileLabels";
import { Utilisateur, UtilisateurForm } from "../models/types";
import { FieldErrors, hasFieldErrors, isValidEmail, useFieldErrors } from "@/shared/forms/fieldErrors";
import { AgenceRead } from "@/features/agences/models/types";
import { fetchAgences } from "@/features/agences/services/agencesService";
import { CaisseRead } from "@/features/caisses/models/types";
import { fetchCaisses } from "@/features/caisses/services/caissesService";

const ACCESS_SECURITY_CLIENT_ID = import.meta.env.VITE_ACCESS_SECURITY_CLIENT_ID ?? "backoffice-web";
const ACCESS_SECURITY_SCOPE_REF_ID = import.meta.env.VITE_ACCESS_SECURITY_SCOPE_REF_ID?.trim();

/**
 * Filtre les profils selon le rôle actuel de l'utilisateur connecté.
 */
const BO_ADMIN_ALLOWED_ROLES = new Set([
  "profile.bo-admin",
  "profile.bo-controller",
  "profile.bo-profil-technique",
]);

/** Périmètre d'une structure : ses propres profils, ceux de ses agences et de ses distributeurs. */
const STRUCTURE_PERIMETER_CONTEXTS = ["Structure", "Agence", "Distributeur"] as const;

export const filterRolesByActorPermissions = (
  roles: string[],
  currentActorRole: string | undefined,
  entityContext: string | undefined,
  currentPermissions: readonly string[] | undefined,
): string[] => {
  if (!currentActorRole && !entityContext && (!currentPermissions || currentPermissions.length === 0)) {
    return roles;
  }

  const perms = new Set((currentPermissions ?? []).map((p) => p.trim().toLowerCase()));
  const actor = currentActorRole?.trim().toLowerCase() ?? "";
  const ctx = entityContext?.trim().toLowerCase() ?? "";

  const isBOAdmin = perms.has("profile.bo-admin");
  const isStructAdmin = perms.has("profile.bo.structure-admin") || (actor === "administrateur" && ctx === "structure");
  const isAutoAdmin = perms.has("profile.bo.autonome-set-admin") || (actor === "administrateur" && ctx === "distributeur");
  const isPartAdmin = perms.has("profile.bo.partenaire-admin") || perms.has("profile.bo-partenaire-admin") || (actor === "administrateur" && ctx === "partenaire");

  if (isBOAdmin) {
    return roles.filter((role) => BO_ADMIN_ALLOWED_ROLES.has(role.trim().toLowerCase()));
  }

  if (isStructAdmin) {
    // Inclusion stricte : les profils hors périmètre (administration, produit, partenaire, profils
    // personnalisés d'une autre famille) ne sont jamais proposés
    return roles.filter((role) =>
      STRUCTURE_PERIMETER_CONTEXTS.some((context) => isProfileRoleForEntityContext(role, context)),
    );
  }

  if (isAutoAdmin) {
    return roles.filter((role) => isProfileRoleForEntityContext(role, "Distributeur"));
  }

  if (isPartAdmin) {
    return roles.filter((role) => isProfileRoleForEntityContext(role, "Partenaire"));
  }

  return roles;
};

const ADMINISTRATION_SCOPE_ROLES = new Set<string>([
  "profile.bo-admin",
  "profile.bo-controller",
  "profile.bo-profil-technique",
]);

export const getScopeRefIdFromToken = (
  token: string | null,
  refType: AccessSecurityRefType,
): string | null => {
  const payload = parseJwtPayload<{ groups?: unknown }>(token);
  if (!payload || !Array.isArray(payload.groups)) {
    return null;
  }

  const matcher = new RegExp(`(?:^|/)${refType}:([a-f0-9-]+)(?:$|/)`, "i");
  for (let index = payload.groups.length - 1; index >= 0; index--) {
    const group = payload.groups[index];
    if (typeof group !== "string") {
      continue;
    }

    const match = matcher.exec(group);
    if (match?.[1]) {
      return match[1].toLowerCase();
    }
  }

  return null;
};

export const resolveHierarchyScopeFromToken = (
  token: string | null,
): { refType: AccessSecurityRefType; refId: string } | null => {
  const payload = parseJwtPayload<{
    groups?: unknown;
    resource_access?: Record<string, { roles?: unknown }>;
  }>(token);

  if (!payload || !Array.isArray(payload.groups)) {
    return null;
  }

    const clientRoles = payload.resource_access?.["backoffice-web"]?.roles;
    const roles = Array.isArray(clientRoles)
      ? clientRoles.filter((r): r is string => typeof r === "string")
      : [];

    let refType: AccessSecurityRefType | null = null;
    if (roles.some((r) => r === "profile.bo-admin" || r === "profile.bo-controller" || r === "profile.bo-profil-technique")) {
      refType = "ADMIN";
    } else if (roles.some((r) => r.startsWith("profile.bo.autonome-set-"))) {
      refType = "DISTRIBUTOR";
    } else if (roles.some((r) => r.startsWith("profile.bo.partenaire-") || r.startsWith("profile.bo-partenaire-"))) {
      refType = "PARTNER";
    } else if (roles.some((r) => r.startsWith("profile.bo.produit-"))) {
      refType = "PRODUCT";
    } else if (roles.some((r) => r.startsWith("profile.bo.agence-"))) {
      refType = "AGENCE";
    } else if (roles.some((r) => r.startsWith("profile.bo.structure-"))) {
      refType = "STRUCTURE";
    }

    if (!refType) {
      return null;
    }

    const refId = getScopeRefIdFromToken(token, refType);
    if (refId) {
      return { refType, refId };
    }

    return null;
  };



const AGENCE_SCOPED_PROFILES = new Set<string>([
  "profile.bo.agence-agent",
  "profile.bo.agence-superviseur",
]);

const STRUCTURE_FIN_PROFILES = new Set<string>([
  "profile.bo.structure-agent-fin",
  "profile.bo.structure-superviseur-fin",
]);

const resolveDistributorScope = (
  parentRefType: AccessSecurityRefType,
  parentRefId: string,
  distributorId?: string,
  structureId?: string,
): TargetScopeRef[] => {
  const resolvedDistId = distributorId?.trim() || (parentRefType === "DISTRIBUTOR" ? parentRefId : undefined);
  if (!resolvedDistId) {
    throw new Error("Le champ « Distributeur » est obligatoire pour ce profil");
  }
  const resolvedStructId = structureId?.trim() || (parentRefType === "STRUCTURE" ? parentRefId : undefined);
  const scopes: TargetScopeRef[] = [];
  if (resolvedStructId) {
    scopes.push({ ref_type: "STRUCTURE", ref_id: resolvedStructId });
  }
  scopes.push({ ref_type: "DISTRIBUTOR", ref_id: resolvedDistId });
  return scopes;
};

const resolveAdministrationScope = (
  role: string,
  administrationRefId: string | null,
): TargetScopeRef[] => {
  if (!administrationRefId?.trim()) {
    throw new Error("Administration introuvable pour ce profil");
  }
  return [{ ref_type: "ADMIN", ref_id: administrationRefId.trim() }];
};

const resolveResolvedRef = (
  parentRefType: AccessSecurityRefType,
  parentRefId: string,
  role: string,
  structureId?: string,
): { refType: AccessSecurityRefType; refId: string } => {
  const trimmedRole = role.trim();
  const isStructureRole = trimmedRole.startsWith("profile.bo.structure-");
  const isAgenceRole = trimmedRole.startsWith("profile.bo.agence-");
  const requiresStructureScope = isStructureRole || isAgenceRole;

  if (parentRefType === "ADMIN" && requiresStructureScope && structureId?.trim()) {
    return { refType: "STRUCTURE", refId: structureId.trim() };
  }
  return { refType: parentRefType, refId: parentRefId };
};

const buildHierarchyScope = (
  resolvedRefType: AccessSecurityRefType,
  resolvedRefId: string,
  caisseId?: string,
  agenceIds: string[] = [],
  distributorId?: string,
): TargetScopeRef[] => {
  const scopes: TargetScopeRef[] = [];

  if (resolvedRefId?.trim() && resolvedRefType !== "ADMIN") {
    scopes.push({ ref_type: resolvedRefType, ref_id: resolvedRefId.trim() });
  }

  if (distributorId?.trim() && resolvedRefType !== "DISTRIBUTOR") {
    scopes.push({ ref_type: "DISTRIBUTOR", ref_id: distributorId.trim() });
  }

  // Une entrée par agence de rattachement (plusieurs agences possibles)
  [...new Set(agenceIds.map((id) => id.trim()).filter(Boolean))].forEach((id) => {
    scopes.push({ ref_type: "AGENCE", ref_id: id });
  });

  if (caisseId?.trim()) {
    scopes.push({ ref_type: "CAISSE", ref_id: caisseId.trim() });
  }

  if (scopes.length === 0 && resolvedRefId?.trim()) {
    scopes.push({ ref_type: resolvedRefType, ref_id: resolvedRefId.trim() });
  }

  return scopes;
};

export type ResolveCreateTargetScopeOptions = {
  parentRefType: AccessSecurityRefType;
  parentRefId: string;
  role: string;
  administrationRefId?: string | null;
  agenceId?: string;
  /** Plusieurs agences de rattachement ; prioritaire sur agenceId. */
  agenceIds?: string[];
  caisseId?: string;
  structureId?: string;
  distributorId?: string;
};

export const resolveCreateTargetScope = (
  options: ResolveCreateTargetScopeOptions,
): TargetScopeRef[] => {
  const {
    parentRefType,
    parentRefId,
    role,
    administrationRefId,
    agenceId,
    agenceIds,
    caisseId,
    structureId,
    distributorId,
  } = options;
  const selectedAgenceIds = agenceIds?.length ? agenceIds : agenceId ? [agenceId] : [];

  const safeRole = role?.trim() ?? "";

  if (requiresDistributor(safeRole)) {
    return resolveDistributorScope(parentRefType, parentRefId, distributorId, structureId);
  }

  if (ADMINISTRATION_SCOPE_ROLES.has(safeRole)) {
    return resolveAdministrationScope(safeRole, administrationRefId);
  }

  const { refType: resolvedRefType, refId: resolvedRefId } = resolveResolvedRef(
    parentRefType,
    parentRefId,
    safeRole,
    structureId,
  );

  if (STRUCTURE_FIN_PROFILES.has(safeRole) || AGENCE_SCOPED_PROFILES.has(safeRole)) {
    return buildHierarchyScope(resolvedRefType, resolvedRefId, caisseId, selectedAgenceIds, distributorId);
  }

  return [{ ref_type: resolvedRefType, ref_id: (resolvedRefId ?? "").trim() }];
};

/**
 * Filtre des agences proposées dans le formulaire utilisateur.
 * L'API des agences filtre par parent_id/parent_type : un structure_id serait ignoré et renverrait toutes les agences.
 */
export const buildAgencesFilter = (refType: string, refId: string) =>
  refType === "STRUCTURE" ? { parent_id: refId, parent_type: "STRUCTURE" } : undefined;

export const buildUsersFromHierarchyMembers = (
  structureMembers: HierarchyMembersResponse,
  hierarchyRefId: string,
): Utilisateur[] => {
  const usersById = new Map<string, Utilisateur>();

  for (const user of structureMembers.users ?? []) {
    if (usersById.has(user.user_id)) {
      continue;
    }

    const prenom = user.first_name?.trim() || "-";
    const nom = user.last_name?.trim() || "-";
    const profile = user.profiles?.find(isProfileRole) ?? "";

    usersById.set(user.user_id, {
      id: user.user_id,
      code: user.user_id,
      username: user.username,
      nom,
      prenom,
      email: user.email ?? "",
      telephone: user.telephone ?? "",
      matricule: user.matricule ?? "",
      role: profile,
      structure: hierarchyRefId,
      agence: user.agence,
      caisse: user.caisse,
      // Identifiants lus par le formulaire de modification : sans eux, l'enregistrement renverrait agence/caisse vides
      agenceId: user.agence ?? undefined,
      caisseId: user.caisse ?? undefined,
      statut: user.active !== false ? "Actif" : "Inactif",
      dateCreation: new Date().toISOString().split("T")[0],
    });
  }

  return Array.from(usersById.values());
};

const normalizeLoginPart = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

const getUserLogin = (user: Pick<Utilisateur, "username">): string => user.username ?? "";

export const deriveLogin = (
  prenom = "",
  nom = "",
  existingUsernames?: string[],
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
        .map((u) => u.toLowerCase()),
    );
    while (existingSet.has(candidate)) {
      candidate = `${base}${counter}`;
      counter++;
    }
  }

  return candidate;
};



export type UtilisateurFormField = "prenom" | "nom" | "email" | "role" | "structure" | "distributorId";

/** Valide le formulaire utilisateur et renvoie toutes les erreurs, par champ. */
export const validateUtilisateurForm = (
  form: UtilisateurForm,
  availableRoles: string[],
  isCreatorAdmin?: boolean,
): FieldErrors<UtilisateurFormField> => {
  const errors: FieldErrors<UtilisateurFormField> = {};

  if (!form.prenom.trim()) errors.prenom = "Le prénom est obligatoire";
  if (!form.nom.trim()) errors.nom = "Le nom est obligatoire";
  if (!form.email.trim()) errors.email = "L'e-mail est obligatoire";
  else if (!isValidEmail(form.email)) errors.email = "L'adresse e-mail n'est pas valide";

  if (!form.role) errors.role = "Le profil est obligatoire";
  else if (!availableRoles.includes(form.role)) {
    errors.role = "Ce profil n'est pas autorisé pour votre contexte utilisateur";
  }

  const isStructureRole = form.role.trim().startsWith("profile.bo.structure-");
  const isAgenceRole = form.role.trim().startsWith("profile.bo.agence-");
  if (isCreatorAdmin && (isStructureRole || isAgenceRole) && !form.structure) {
    errors.structure = "La structure est obligatoire pour ce profil";
  }

  if (requiresDistributor(form.role) && !form.distributorId) {
    errors.distributorId = "Le distributeur est obligatoire pour ce profil";
  }

  return errors;
};

const getCreateUserErrorMessage = (error: unknown, username?: string): string => {
  const message = error instanceof Error ? error.message : "Impossible d'ajouter l'utilisateur";
  const lowered = message.toLowerCase();

  if (lowered.includes("already exist") || lowered.includes("déjà") || lowered.includes("conflict")) {
    const loginText = username ? `Le login '${username}'` : "Ce login (nom d'utilisateur)";
    return `${loginText} ou l'adresse e-mail est déjà réservé(e) par un autre utilisateur dans Keycloak. Veuillez le modifier.`;
  }

  if (lowered.includes("invalid target scope") || lowered.includes("scope reference")) {
    return "Scope cible invalide: la structure/agence/caisse sélectionnée n'est pas enregistrée dans Access Security.";
  }

  return message;
};

const getUpdateUserErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : "Impossible de modifier l'utilisateur";
  const lowered = message.toLowerCase();

  if (lowered.includes("already exist") || lowered.includes("déjà") || lowered.includes("conflict")) {
    return "L'utilisateur existe déjà!";
  }

  return message;
};

type UsersCacheEntry = {
  key: string;
  data: Utilisateur[];
  timestamp: number;
};

let usersMemoryCache: UsersCacheEntry | null = null;
const USERS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes de validité pour navigation instantanée

export const invalidateUsersCache = (): void => {
  usersMemoryCache = null;
};

const buildUsersCacheKey = (refType?: string, refId?: string, filters?: HierarchyMembersFilters): string => {
  return `${refType ?? ""}:${refId ?? ""}:${JSON.stringify(filters ?? {})}`;
};

export const useUtilisateurs = () => {
  const navigate = useNavigate();
  const isInitialMount = useRef(true);
  const hasLoadedRemoteRolesRef = useRef(false);

  const { currentActorRole, entityContext: connectedEntityContext, currentPermissions } = useCurrentActor();
  const entityContext = "Utilisateurs" as const;

  const permissions = {
    canRead: can(currentActorRole, "read", entityContext, currentPermissions),
    canCreate: can(currentActorRole, "create", entityContext, currentPermissions),
    canUpdate: can(currentActorRole, "update", entityContext, currentPermissions),
    canDelete: can(currentActorRole, "delete", entityContext, currentPermissions),
  };

  const initialDefaultRoles = useMemo(() => {
    return filterRolesByActorPermissions(
      getDefaultProfileRoles(connectedEntityContext),
      currentActorRole,
      connectedEntityContext,
      currentPermissions,
    );
  }, [connectedEntityContext, currentActorRole, currentPermissions]);

  // Initialisation instantanée depuis le cache mémoire si disponible
  const cachedUsers = usersMemoryCache && Date.now() - usersMemoryCache.timestamp < USERS_CACHE_TTL_MS
    ? usersMemoryCache.data
    : null;

  const [listState, setListState] = useState({
    utilisateurs: cachedUsers ?? ([] as Utilisateur[]),
    isLoading: cachedUsers === null,
  });

  const [filtersState, setFiltersState] = useState({
    filterEmail: "",
    filterLogin: "",
    filterRole: "",
    filterStatut: "",
  });

  const [dialogState, setDialogState] = useState({
    dialogOpen: false,
    editingUtilisateur: null as Utilisateur | null,
  });
  const [isSaving, setIsSaving] = useState(false);

  const [formState, setFormState] = useState({
    form: emptyUtilisateurForm,
    availableRoles: initialDefaultRoles,
    agences: [] as AgenceRead[],
    caisses: [] as CaisseRead[],
    structures: [] as StructureRead[],
    distributors: [] as Distributeur[],
    structureSearch: "",
    isStructuresLoading: false,
  });

  const { utilisateurs, isLoading } = listState;
  const {
    filterEmail,
    filterLogin,
    filterRole,
    filterStatut,
  } = filtersState;
  const { dialogOpen, editingUtilisateur } = dialogState;
  const {
    form,
    availableRoles,
    agences,
    caisses,
    structures,
    distributors,
    structureSearch,
    isStructuresLoading,
  } = formState;

  const setUtilisateurs = (next: Utilisateur[] | ((prev: Utilisateur[]) => Utilisateur[])) =>
    setListState((prev) => ({
      ...prev,
      utilisateurs: typeof next === "function" ? next(prev.utilisateurs) : next,
    }));

  const setIsLoading = (value: boolean) =>
    setListState((prev) => ({ ...prev, isLoading: value }));

  const setFilterEmail = (value: string) =>
    setFiltersState((prev) => ({ ...prev, filterEmail: value }));

  const setFilterLogin = (value: string) =>
    setFiltersState((prev) => ({ ...prev, filterLogin: value }));

  const setFilterRole = (value: string) =>
    setFiltersState((prev) => ({ ...prev, filterRole: value }));

  const setFilterStatut = (value: string) =>
    setFiltersState((prev) => ({ ...prev, filterStatut: value }));

  const {
    errors: formErrors,
    setErrors: setFormErrors,
    clearError: clearFormError,
    resetErrors: resetFormErrors,
  } = useFieldErrors<UtilisateurFormField>();

  const setDialogOpen = (open: boolean) => {
    // Chaque ouverture ou fermeture repart d'un formulaire sans erreur affichée
    resetFormErrors();
    setDialogState((prev) => ({ ...prev, dialogOpen: open }));
  };

  const setEditingUtilisateur = (utilisateur: Utilisateur | null) =>
    setDialogState((prev) => ({ ...prev, editingUtilisateur: utilisateur }));

  const setForm = (nextForm: UtilisateurForm | ((prev: UtilisateurForm) => UtilisateurForm)) =>
    setFormState((prev) => ({
      ...prev,
      form: typeof nextForm === "function" ? nextForm(prev.form) : nextForm,
    }));

  const setAvailableRoles = (next: string[] | ((prev: string[]) => string[])) =>
    setFormState((prev) => ({
      ...prev,
      availableRoles: typeof next === "function" ? next(prev.availableRoles) : next,
    }));

  const setAgences = (next: AgenceRead[] | ((prev: AgenceRead[]) => AgenceRead[])) =>
    setFormState((prev) => ({
      ...prev,
      agences: typeof next === "function" ? next(prev.agences) : next,
    }));

  const setCaisses = (next: CaisseRead[] | ((prev: CaisseRead[]) => CaisseRead[])) =>
    setFormState((prev) => ({
      ...prev,
      caisses: typeof next === "function" ? next(prev.caisses) : next,
    }));

  const setStructures = (next: StructureRead[] | ((prev: StructureRead[]) => StructureRead[])) =>
    setFormState((prev) => ({
      ...prev,
      structures: typeof next === "function" ? next(prev.structures) : next,
    }));

  const setDistributors = (next: Distributeur[] | ((prev: Distributeur[]) => Distributeur[])) =>
    setFormState((prev) => ({
      ...prev,
      distributors: typeof next === "function" ? next(prev.distributors) : next,
    }));

  const setStructureSearch = (value: string) =>
    setFormState((prev) => ({ ...prev, structureSearch: value }));

  const setIsStructuresLoading = (value: boolean) =>
    setFormState((prev) => ({ ...prev, isStructuresLoading: value }));

  const authToken = useAuthStore((state) => state.token);

  const resolvedHierarchyScope = useMemo(
    () => resolveHierarchyScopeFromToken(authToken),
    [authToken],
  );
  const hierarchyRefType = resolvedHierarchyScope?.refType;
  const administrationScopeRefId = connectedEntityContext === "Administration"
    ? (ACCESS_SECURITY_SCOPE_REF_ID || resolvedHierarchyScope?.refId || null)
    : null;

  const [debouncedFilterLogin, setDebouncedFilterLogin] = useState(filterLogin);
  const [debouncedFilterEmail, setDebouncedFilterEmail] = useState(filterEmail);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilterLogin(filterLogin);
    }, 300);
    return () => clearTimeout(timer);
  }, [filterLogin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilterEmail(filterEmail);
    }, 300);
    return () => clearTimeout(timer);
  }, [filterEmail]);

  const memberFilters = useMemo<HierarchyMembersFilters>(() => {
    const username = debouncedFilterLogin.trim();
    let status: HierarchyMembersFilters["status"];
    if (filterStatut === "Actif") {
      status = "active";
    } else if (filterStatut === "Inactif") {
      status = "inactive";
    }

    return {
      ...(username ? { username } : {}),
      ...(debouncedFilterEmail.trim() ? { email: debouncedFilterEmail.trim() } : {}),
      ...(filterRole.trim() && filterRole !== "__all__" ? { profile: filterRole } : {}),
      ...(status ? { status } : {}),
    };
  }, [debouncedFilterEmail, debouncedFilterLogin, filterRole, filterStatut]);

  // Synchroniser les rôles par défaut tant que les rôles distants ne sont pas chargés
  useEffect(() => {
    if (hasLoadedRemoteRolesRef.current) return;
    if (initialDefaultRoles.length > 0) {
      setAvailableRoles((prev) => (prev.length === 0 ? initialDefaultRoles : prev));
    }
  }, [initialDefaultRoles]);

  // 1. Charger les profils/rôles pour le filtre "Tous les profils" et le modal
  useEffect(() => {
    let active = true;
    const resolvedScope = resolvedHierarchyScope;
    if (!resolvedScope?.refId) return;

    const loadRoles = async () => {
      try {
        const rawRoles = await listClientCompositeRoles(ACCESS_SECURITY_CLIENT_ID);
        if (!active) return;
        const normalizedRoles = (rawRoles ?? []).filter(isProfileRole);
        const finalRoles = filterRolesByActorPermissions(
          normalizedRoles,
          currentActorRole,
          connectedEntityContext,
          currentPermissions,
        );
        hasLoadedRemoteRolesRef.current = true;
        if (finalRoles.length > 0) {
          setAvailableRoles(finalRoles);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des rôles:", err);
      }
    };

    loadRoles();
    return () => {
      active = false;
    };
  }, [resolvedHierarchyScope?.refType, resolvedHierarchyScope?.refId, currentActorRole, connectedEntityContext, currentPermissions]);

  // 2. Lazy loading des options du modal (agences, caisses, distributeurs) uniquement à l'ouverture du dialog
  useEffect(() => {
    if (!dialogOpen) return;
    let active = true;
    const resolvedScope = resolvedHierarchyScope;
    if (!resolvedScope?.refId) return;

    const effectiveHierarchyRefType = resolvedScope.refType;
    const hierarchyRefId = resolvedScope.refId;

    const agencesParams = buildAgencesFilter(effectiveHierarchyRefType, hierarchyRefId);
    const caissesParams =
      effectiveHierarchyRefType === "STRUCTURE"
        ? { structure_id: hierarchyRefId }
        : effectiveHierarchyRefType === "AGENCE"
          ? { agency_id: hierarchyRefId }
          : undefined;

    const loadModalOptions = async () => {
      try {
        const [agencesRes, caissesRes, distRes] = await Promise.allSettled([
          fetchAgences(agencesParams),
          fetchCaisses(caissesParams),
          effectiveHierarchyRefType === "STRUCTURE" || effectiveHierarchyRefType === "ADMIN"
            ? fetchDistributeurs(effectiveHierarchyRefType === "STRUCTURE" ? { structure_id: hierarchyRefId } : undefined)
            : Promise.resolve({ items: [] }),
        ]);

        if (!active) return;

        if (agencesRes.status === "fulfilled") {
          const list = agencesRes.value?.items ?? (Array.isArray(agencesRes.value) ? agencesRes.value : []);
          const filteredAgences = effectiveHierarchyRefType === "AGENCE"
            ? (list as AgenceRead[]).filter((a) => a.id === hierarchyRefId)
            : (list as AgenceRead[]);
          setAgences(filteredAgences);
        }

        if (caissesRes.status === "fulfilled") {
          const list = caissesRes.value?.items ?? (Array.isArray(caissesRes.value) ? caissesRes.value : []);
          setCaisses(list as CaisseRead[]);
        }

        if (distRes.status === "fulfilled") {
          const distItems = (distRes.value as { items?: Distributeur[] })?.items ?? (Array.isArray(distRes.value) ? distRes.value : []);
          setDistributors(distItems as Distributeur[]);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des options du modal:", err);
      }
    };

    loadModalOptions();

    return () => {
      active = false;
    };
  }, [dialogOpen, resolvedHierarchyScope?.refType, resolvedHierarchyScope?.refId]);

  const refreshUsers = async (options?: { background?: boolean }) => {
    const resolvedScope = resolvedHierarchyScope;
    if (!resolvedScope?.refId) return;

    const isBackground = options?.background ?? false;
    if (!isBackground) {
      setIsLoading(true);
    }

    const effectiveHierarchyRefType = resolvedScope.refType;
    const hierarchyRefId = resolvedScope.refId;
    const currentKey = buildUsersCacheKey(effectiveHierarchyRefType, hierarchyRefId, memberFilters);

    try {
      const members = await listHierarchyMembers(
        effectiveHierarchyRefType === "AGENCE" ? "AGENCE" : effectiveHierarchyRefType,
        hierarchyRefId,
        ACCESS_SECURITY_CLIENT_ID,
        memberFilters,
      );
      const mapped = buildUsersFromHierarchyMembers(members, hierarchyRefId);
      setUtilisateurs(mapped);
      usersMemoryCache = {
        key: currentKey,
        data: mapped,
        timestamp: Date.now(),
      };
    } catch (error) {
      if (!isBackground) {
        setUtilisateurs([]);
        const message = error instanceof Error ? error.message : "Impossible de charger les utilisateurs";
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // 3. Charger la liste des utilisateurs de la hiérarchie pour le tableau
  useEffect(() => {
    let active = true;

    // Si la session n'est pas encore initialisée ou en cours d'hydratation, attendre
    if (!isAuthenticated || !authToken) {
      return () => {
        active = false;
      };
    }

    const resolvedScope = resolvedHierarchyScope;

    if (!resolvedScope) {
      const backendScopeError = hierarchyRefType
        ? `Scope Access Security manquant pour ${hierarchyRefType} dans le token. Merci de contacter l'équipe backend.`
        : "Scope Access Security introuvable dans le token de session. Merci de contacter l'équipe backend.";

      setUtilisateurs([]);
      setIsLoading(false);
      toast.error(backendScopeError);
      return () => { active = false; };
    }

    const currentKey = buildUsersCacheKey(resolvedScope.refType, resolvedScope.refId, memberFilters);
    const hasFreshCache = Boolean(
      usersMemoryCache &&
      usersMemoryCache.key === currentKey &&
      Date.now() - usersMemoryCache.timestamp < USERS_CACHE_TTL_MS,
    );

    // Si on dispose déjà d'un cache valide au montage, faire un rafraîchissement silencieux en tâche de fond
    const isBackground = isInitialMount.current && hasFreshCache;
    isInitialMount.current = false;

    refreshUsers({ background: isBackground });

    return () => {
      active = false;
    };
  }, [isAuthenticated, authToken, connectedEntityContext, hierarchyRefType, memberFilters, resolvedHierarchyScope]);

  // 4. Charger les structures (Administration) uniquement à l'ouverture du modal
  useEffect(() => {
    if (!dialogOpen || connectedEntityContext !== "Administration") {
      return;
    }

    let active = true;
    setIsStructuresLoading(true);

    const timer = setTimeout(() => {
      fetchStructures(structureSearch)
        .then((data) => {
          if (active) {
            setStructures(data);
          }
        })
        .catch((err) => {
          console.error("Error fetching structures:", err);
        })
        .finally(() => {
          if (active) {
            setIsStructuresLoading(false);
          }
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [dialogOpen, connectedEntityContext, structureSearch]);

  useEffect(() => {
    if (availableRoles.length === 0) {
      return;
    }

    setForm((previous) => {
      if (availableRoles.includes(previous.role)) {
        return previous;
      }

      return {
        ...previous,
        role: availableRoles[0],
        agenceId: "",
        agenceIds: [],
        caisseId: "",
        distributorId: "",
      };
    });
  }, [availableRoles]);

  const hasActiveFilters = Boolean(
    filterEmail.trim() ||
    filterLogin.trim() ||
    (filterRole.trim() && filterRole !== "__all__") ||
    (filterStatut.trim() && filterStatut !== "__all__")
  );
  const resetFilters = () => {
    setFilterEmail("");
    setFilterLogin("");
    setFilterRole("");
    setFilterStatut("");
  };

  const openAdd = () => {
    if (!permissions.canCreate) {
      toast.error("Vous n'avez pas l'habilitation pour ajouter un utilisateur");
      return;
    }

    let rolesForAdd = availableRoles;
    if (rolesForAdd.length === 0) {
      rolesForAdd = filterRolesByActorPermissions(
        getDefaultProfileRoles(connectedEntityContext),
        currentActorRole,
        connectedEntityContext,
        currentPermissions,
      );
      if (rolesForAdd.length > 0) {
        setAvailableRoles(rolesForAdd);
      }
    }

    if (rolesForAdd.length === 0) {
      toast.error("Aucun profil n'est disponible pour votre contexte utilisateur");
      return;
    }

    setEditingUtilisateur(null);
    setForm({
      ...emptyUtilisateurForm,
      role: rolesForAdd[0] ?? emptyUtilisateurForm.role,
      agenceId: "",
      agenceIds: [],
      caisseId: "",
      distributorId: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (utilisateur: Utilisateur) => {
    if (!permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour modifier un utilisateur");
      return;
    }

    setEditingUtilisateur(utilisateur);
    setForm({
      username: getUserLogin(utilisateur),
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      email: utilisateur.email,
      telephone: utilisateur.telephone,
      matricule: utilisateur.matricule ?? "",
      role: utilisateur.role,
      structure: utilisateur.structure,
      agenceId: "",
      agenceIds: utilisateur.agenceId ? [utilisateur.agenceId] : [],
      caisseId: utilisateur.caisseId ?? "",
      distributorId: utilisateur.distributorId ?? "",
      statut: utilisateur.statut,
    });
    setDialogOpen(true);
  };

  // Agence unique sélectionnée (création et modification) : une caisse n'est proposée que dans ce cas (elle appartient à une agence).
  const singleSelectedAgenceId = form.agenceIds?.length === 1 ? form.agenceIds[0] : "";
  const caissesForSelectedAgence = singleSelectedAgenceId
    ? caisses.filter((c) => c.agency_id === singleSelectedAgenceId)
    : [];

  const updateExistingUtilisateur = async (editingUtilisateurToUpdate: Utilisateur, emailTrimmed: string) => {
    // Le rattachement agence/caisse est porté par le scope : sans lui, le champ texte « agence » seul n'est pas relu par la liste
    const selectedAgenceIds = form.agenceIds ?? [];
    const initialAgenceIds = editingUtilisateurToUpdate.agenceId ? [editingUtilisateurToUpdate.agenceId] : [];
    const placementChanged =
      selectedAgenceIds.length !== initialAgenceIds.length ||
      selectedAgenceIds.some((id) => !initialAgenceIds.includes(id)) ||
      (form.caisseId || "") !== (editingUtilisateurToUpdate.caisseId ?? "");
    let targetScope: TargetScopeRef[] | undefined;
    if (placementChanged && resolvedHierarchyScope) {
      try {
        targetScope = resolveCreateTargetScope({
          parentRefType: resolvedHierarchyScope.refType,
          parentRefId: resolvedHierarchyScope.refId,
          role: form.role,
          administrationRefId: administrationScopeRefId,
          agenceIds: selectedAgenceIds,
          caisseId: singleSelectedAgenceId ? form.caisseId : "",
          structureId: form.structure,
          distributorId: form.distributorId,
        });
      } catch (scopeError) {
        toast.error(scopeError instanceof Error ? scopeError.message : "Scope cible invalide");
        return false;
      }
    }

    try {
      await updateAccessSecurityUser(editingUtilisateurToUpdate.id, {
        login: form.username || getUserLogin(editingUtilisateurToUpdate),
        profiles: [form.role],
        profile_client_id: "backoffice-web",
        first_name: form.prenom.trim() || null,
        last_name: form.nom.trim() || null,
        telephone: form.telephone.trim() || null,
        email: emailTrimmed,
        matricule: form.matricule?.trim() || null,
        // Champs texte du contrat (une seule valeur) : renseignés quand une seule agence est choisie
        agence: singleSelectedAgenceId || null,
        caisse: singleSelectedAgenceId ? form.caisseId || null : null,
        ...(targetScope ? { target_scope: targetScope } : {}),
      });

      invalidateUsersCache();
      await refreshUsers();
      const userFullName = [form.prenom, form.nom].filter((p) => p && p.trim() !== "" && p !== "-").join(" ");
      toast.success(userFullName ? `Utilisateur ${userFullName} modifié avec succès` : "Utilisateur modifié avec succès");
      return true;
    } catch (error) {
      toast.error(getUpdateUserErrorMessage(error));
      return false;
    }
  };

  const createUtilisateurFromForm = async (emailTrimmed: string) => {
    if (!resolvedHierarchyScope) {
      toast.error("Scope cible introuvable dans la session backend");
      return false;
    }

    const username = (form.username.trim() || deriveLogin(form.prenom.trim(), form.nom.trim(), utilisateurs.map((u) => u.username))).trim();
    if (!username) {
      toast.error("Le login n'a pas pu etre genere depuis le prenom et le nom");
      return false;
    }

    let targetScope: TargetScopeRef[];
    try {
      targetScope = resolveCreateTargetScope({
        parentRefType: resolvedHierarchyScope.refType,
        parentRefId: resolvedHierarchyScope.refId,
        role: form.role,
        administrationRefId: administrationScopeRefId,
        agenceIds: form.agenceIds ?? [],
        caisseId: singleSelectedAgenceId ? form.caisseId : "",
        structureId: form.structure,
        distributorId: form.distributorId,
      });
    } catch (scopeError) {
      toast.error(scopeError instanceof Error ? scopeError.message : "Scope cible invalide");
      return false;
    }

    try {
      const created = await createBackofficeUser({
        username,
        email: emailTrimmed,
        target_scope: targetScope,
        profiles: [form.role],
        telephone: form.telephone.trim() || null,
        matricule: form.matricule?.trim() || null,
        first_name: form.prenom.trim() || null,
        last_name: form.nom.trim() || null,
        // Champs texte du contrat (une seule valeur) : renseignés quand une seule agence est choisie
        agence: singleSelectedAgenceId || null,
        caisse: singleSelectedAgenceId ? form.caisseId || null : null,
      });

      invalidateUsersCache();
      await refreshUsers();

      const userFullName = [form.prenom, form.nom].filter((p) => p && p.trim() !== "" && p !== "-").join(" ") || created.account_username;
      toast.success(`Utilisateur ${userFullName} créé avec succès.`);
      return true;
    } catch (error) {
      toast.error(getCreateUserErrorMessage(error, username));
      return false;
    }
  };

  const save = async () => {
    if (editingUtilisateur && !permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour modifier un utilisateur");
      return;
    }

    if (!editingUtilisateur && !permissions.canCreate) {
      toast.error("Vous n'avez pas l'habilitation pour ajouter un utilisateur");
      return;
    }

    const validationErrors = validateUtilisateurForm(
      form,
      availableRoles,
      connectedEntityContext === "Administration",
    );
    setFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) {
      return;
    }

    const emailTrimmed = form.email.trim().toLowerCase();

    setIsSaving(true);
    try {
      if (editingUtilisateur) {
        const updated = await updateExistingUtilisateur(editingUtilisateur, emailTrimmed);
        if (!updated) {
          return;
        }
      } else {
        const created = await createUtilisateurFromForm(emailTrimmed);
        if (!created) {
          return;
        }
      }

      setDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!permissions.canDelete) {
      toast.error("Vous n'avez pas l'habilitation pour supprimer un utilisateur");
      return;
    }

    const current = utilisateurs.find((utilisateur) => utilisateur.id === id);
    const currentUserEmail = useAuthStore.getState().user?.email?.trim().toLowerCase();
    if (
      current &&
      currentUserEmail &&
      (current.email?.trim().toLowerCase() === currentUserEmail ||
       current.username?.trim().toLowerCase() === currentUserEmail)
    ) {
      toast.error("Vous ne pouvez pas supprimer votre propre compte");
      return;
    }

    try {
      await deleteAccessSecurityUser(id);
      invalidateUsersCache();
      await refreshUsers();
      const userFullName = current ? [current.prenom, current.nom].filter((p) => p && p.trim() !== "" && p !== "-").join(" ") : "";
      toast.success(userFullName ? `Utilisateur ${userFullName} supprimé avec succès` : "Utilisateur supprimé");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Impossible de supprimer l'utilisateur";
      toast.error(msg);
    }
  };

  const toggleStatut = async (id: string) => {
    if (!permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour modifier le statut");
      return;
    }

    const current = utilisateurs.find((utilisateur) => utilisateur.id === id);
    if (!current) {
      toast.error("Utilisateur introuvable");
      return;
    }

    const currentUserEmail = useAuthStore.getState().user?.email?.trim().toLowerCase();
    if (
      currentUserEmail &&
      current.statut === "Actif" &&
      (current.email?.trim().toLowerCase() === currentUserEmail ||
       current.username?.trim().toLowerCase() === currentUserEmail)
    ) {
      toast.error("Vous ne pouvez pas désactiver votre propre compte");
      return;
    }

    const request = current.statut === "Actif"
      ? deactivateAccessSecurityUser(id)
      : activateAccessSecurityUser(id);

    try {
      await request;
      invalidateUsersCache();
      await refreshUsers();
      const userFullName = [current.prenom, current.nom].filter((p) => p && p.trim() !== "" && p !== "-").join(" ") || current.username;
      toast.success(`Statut de ${userFullName} mis à jour`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Impossible de modifier le statut";
      toast.error(msg);
    }
  };

  const resetPassword = async (user: Utilisateur) => {
    if (!permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour réinitialiser le mot de passe");
      return;
    }

    const username = user.username?.trim() || "";
    const email = user.email?.trim() || "";
    const identifier = email || username;

    if (!identifier) {
      toast.error("Aucun identifiant ou email valide pour cet utilisateur");
      return;
    }

    const fullName = [user.prenom, user.nom].filter((p) => p && p.trim() !== "" && p !== "-").join(" ") || identifier;

    try {
      await requestAccessSecurityPasswordReset(identifier, email);
      toast.success(`Demande de réinitialisation du mot de passe envoyée pour ${fullName}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la réinitialisation du mot de passe";
      toast.error(msg);
    }
  };

  const validatePassword = (user: Utilisateur) => {
    if (!permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour valider le mot de passe");
      return;
    }

    const identifier = user.username?.trim() || user.email?.trim();
    if (!identifier) {
      toast.error("Aucun identifiant ou email valide pour cet utilisateur");
      return;
    }

    navigate(`/set-password?username=${encodeURIComponent(identifier)}`);
  };

  const importUsersFromFile = async (file: File) => {
    if (!resolvedHierarchyScope) {
      toast.error("Scope cible introuvable dans la session backend");
      return;
    }

    try {
      const targetScope = [{ ref_type: resolvedHierarchyScope.refType, ref_id: resolvedHierarchyScope.refId }];
      const response = await importBackofficeUsers(file, targetScope);
      
      if (response.failures > 0) {
        const translateReason = (reason: string) => {
          if (reason.includes("Resource already exists") || reason.includes("already exists")) {
            return "Ce login ou e-mail existe déjà";
          }
          return reason;
        };

        const errorDetails = response.failure_details.slice(0, 3).map(d => `- Ligne ${d.row_number} (${d.username}): ${translateReason(d.reason)}`).join("\n");

        if (response.successful_imports === 0) {
          toast.error(`Import échoué: 0 importé, ${response.failures} erreur(s).\n${errorDetails}`, { style: { whiteSpace: 'pre-line' } });
          return;
        } else {
          toast.warning(`Import partiel: ${response.successful_imports} importé(s), ${response.failures} erreur(s).\n${errorDetails}`, { style: { whiteSpace: 'pre-line' } });
          await refreshUsers();
        }
      } else {
        invalidateUsersCache();
        toast.success(`${response.successful_imports} utilisateur(s) importé(s) avec succès`);
        await refreshUsers();
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error(`Erreur lors de l'import: ${msg}`);
    }
  };

  // Filter agences by selected structure if connected as Admin
  const filteredAgencesByStructure = useMemo(() => {
    if (connectedEntityContext === "Administration" && form.structure) {
      return agences.filter((agence) => agence.parent_id === form.structure);
    }
    return agences;
  }, [agences, connectedEntityContext, form.structure]);

  const filteredDistributorsByStructure = useMemo(() => {
    if (connectedEntityContext === "Administration" && form.structure) {
      return distributors.filter((distributor) => distributor.structureId === form.structure);
    }
    return distributors;
  }, [distributors, connectedEntityContext, form.structure]);

  return {
    utilisateurs,
    hasActiveFilters: Boolean(hasActiveFilters),
    currentActorRole,
    connectedEntityContext,
    entityContext,
    permissions,
    // Filtres combinés
    filterEmail,
    setFilterEmail,
    filterLogin,
    setFilterLogin,
    filterRole,
    setFilterRole,
    filterStatut,
    setFilterStatut,
    resetFilters,
    dialogOpen,
    setDialogOpen,
    editingUtilisateur,
    form,
    setForm,
    formErrors,
    clearFormError,
    availableRoles,
    agences: filteredAgencesByStructure,
    distributors: filteredDistributorsByStructure,
    structures,
    structureSearch,
    setStructureSearch,
    isStructuresLoading,
    caisses,
    caissesForSelectedAgence,
    singleSelectedAgenceId,
    isLoading,
    isSaving,
    openAdd,
    openEdit,
    save,
    remove,
    toggleStatut,
    resetPassword,
    validatePassword,
    deriveLogin,
    refreshUsers,
    importUsersFromFile,
  };
};
