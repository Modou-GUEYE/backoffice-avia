// ===== TYPES DE PERMISSIONS =====

export type Action = "read" | "create" | "update" | "delete" | "validate" | "export";

const ALL_ACTIONS: Action[] = ["read", "create", "update", "delete", "validate", "export"];
const CRUD_ACTIONS: Action[] = ["read", "create", "update", "delete"];

// ===== MATRICE DE PERMISSIONS PAR ENTITÉ =====

export const PermissionMatrix = {
  Administration: {
    Administrateur: ALL_ACTIONS,
    Contrôleur: ["read"] as Action[],
    "Profil Technique": ALL_ACTIONS,
  },
  Structure: {
    Administrateur: ALL_ACTIONS,
    Contrôleur: ["read"] as Action[],
    "Initiateur financier": ["read", "create"] as Action[],
    "Validateur financier": ["read", "validate"] as Action[],
  },
  Agence: {
    Agent: ["read", "create"] as Action[],
    Superviseur: ["read", "update"] as Action[],
  },
  Produit: {
    "Profil central": ["read"] as Action[],
  },
  Distributeur: {
    Administrateur: ALL_ACTIONS,
    Agent: ["read", "create"] as Action[],
    Superviseur: ["read", "update"] as Action[],
    "Initiateur financier": ["read", "create"] as Action[],
    "Validateur financier": ["read", "validate"] as Action[],
  },
  Caisse: {
    Administrateur: CRUD_ACTIONS,
    Superviseur: ["read", "update"] as Action[],
  },
  Utilisateurs: {
    Administrateur: CRUD_ACTIONS,
    Superviseur: ["read", "update"] as Action[],
  },
  Partenaire: {
    Administrateur: ALL_ACTIONS,
    Agent: ["read", "create"] as Action[],
    Superviseur: ["read", "update"] as Action[],
  },
} as const;

export type PermissionsByEntity = typeof PermissionMatrix;
export type EntityContext = keyof typeof PermissionMatrix;
export type ActorRole = {
  [Entity in EntityContext]: keyof PermissionsByEntity[Entity]
}[EntityContext];

// ===== ALIASES PARTAGÉS ET CONFIGURATION =====

const CommonAliases = {
  Administration: ["administration", "admin"],
  Structure: ["structure", "institution"],
  Agence: ["agence", "agency"],
  Produit: ["produit", "product"],
  Distributeur: ["distributeur", "autonome-set"],
  Caisse: ["caisse", "cash", "treasury"],
  Utilisateurs: ["utilisateurs", "users", "user"],
  Partenaire: ["partenaire", "partenaires", "partner", "partners"],
} as const;

const EntityActionAliases: Record<EntityContext, readonly string[]> = CommonAliases;

export type FrontFeatureKey =
  | "dashboard"
  | "partenaires"
  | "produits"
  | "structures"
  | "agences"
  | "caisses"
  | "utilisateurs"
  | "clients"
  | "distributeurs"
  | "packages"
  | "parametres"
  | "tracking"
  | "releves";

const FrontFeatureAliases: Record<Exclude<FrontFeatureKey, "dashboard">, readonly string[]> = {
  partenaires: CommonAliases.Partenaire,
  produits: CommonAliases.Produit,
  structures: CommonAliases.Structure,
  agences: CommonAliases.Agence,
  caisses: CommonAliases.Caisse,
  utilisateurs: CommonAliases.Utilisateurs,
  distributeurs: CommonAliases.Distributeur,
  clients: ["enrollment"],
  packages: ["package", "packages"],
  parametres: ["parametre", "parametres", "setting", "settings", "config", "configuration"],
  tracking: ["tracking", "audit", "trace", "traces", "events", "logs"],
  releves: ["releve", "releves"],
};

const actionMap: Record<string, Action> = {
  list: "read",
  read: "read",
  view: "read",
  add: "create",
  create: "create",
  update: "update",
  edit: "update",
  deactivate: "update",
  delete: "delete",
  validate: "validate",
  export: "export",
};

// ===== NORMALISATION ET VÉRIFICATION DES PERMISSIONS BACKEND =====

const normalizePermissions = (
  backendPermissions: readonly string[] | undefined,
): { list: string[]; set: Set<string> } => {
  if (!backendPermissions || !Array.isArray(backendPermissions) || backendPermissions.length === 0) {
    return { list: [], set: new Set<string>() };
  }

  const list = backendPermissions.map((value) => value.trim().toLowerCase()).filter(Boolean);
  return { list, set: new Set(list) };
};

/**
 * Décompose une permission backend au format perm.bo.<resource>.<action>
 */
const parsePermBo = (
  permission: string,
): { resource: string; action: string } | null => {
  if (!permission.startsWith("perm.bo.")) {
    return null;
  }
  const parts = permission.substring(8).split(".");
  if (parts.length < 2) {
    return null;
  }
  return {
    resource: parts.slice(0, -1).join("."),
    action: parts[parts.length - 1],
  };
};

const matchesBackendPermission = (
  permission: string,
  targetAction: string,
  aliases: Set<string>,
): boolean => {
  const parsed = parsePermBo(permission);
  if (!parsed) {
    return false;
  }
  return aliases.has(parsed.resource) && actionMap[parsed.action] === targetAction;
};

const canFromBackendAliases = (
  normalizedPermissions: readonly string[],
  action: Action,
  aliases?: readonly string[],
): boolean => {
  if (normalizedPermissions.length === 0) {
    return false;
  }

  if (normalizedPermissions.includes("all") || normalizedPermissions.includes("*")) {
    return true;
  }

  const targetAction = action.toLowerCase();
  const aliasSet = new Set((aliases ?? []).map((value) => value.toLowerCase()));

  return normalizedPermissions.some((permission) => {
    if (permission === targetAction) {
      return true;
    }
    return matchesBackendPermission(permission, targetAction, aliasSet);
  });
};

const hasAnyBackendPermissionForAliases = (
  normalizedPermissions: readonly string[],
  aliases: readonly string[],
): boolean => {
  if (normalizedPermissions.length === 0) {
    return false;
  }

  const aliasSet = new Set(aliases.map((value) => value.toLowerCase()));

  return normalizedPermissions.some((permission) => {
    if (permission === "all" || permission === "*") {
      return true;
    }

    if (permission.startsWith("profile.bo.")) {
      return false;
    }

    const parsed = parsePermBo(permission);
    return parsed ? aliasSet.has(parsed.resource) : aliasSet.has(permission);
  });
};

const checkDistributorAdmin = (set: Set<string>): boolean =>
  set.has("profile.bo.autonome-set-admin");

export const isDistributorAdmin = (backendPermissions: readonly string[] | undefined): boolean => {
  const { set } = normalizePermissions(backendPermissions);
  return checkDistributorAdmin(set);
};

/** Permissions dédiées du module Tracking & Audit. */
export const TrackingPermissions = {
  list: "perm.bo.tracking.list",
  export: "perm.bo.tracking.export",
} as const;

export const RelevePermissions = {
  list: "perm.bo.releve.list",
  read: "perm.bo.releve.read",
  generate: "perm.bo.releve.generate",
  freeze: "perm.bo.releve.freeze",
  correct: "perm.bo.releve.correct",
  export: "perm.bo.releve.export",
  notify: "perm.bo.releve.notify",
} as const;

export type RelevePermission = (typeof RelevePermissions)[keyof typeof RelevePermissions];

/** Permission relevés : l'administrateur back-office a tous les droits, les autres profils la permission dédiée. */
export const hasRelevePermission = (
  backendPermissions: readonly string[] | undefined,
  permission: RelevePermission,
): boolean => {
  const { set } = normalizePermissions(backendPermissions);
  return set.has("profile.bo-admin") || set.has("all") || set.has("*") || set.has(permission);
};

// visibilite des modules front
export const hasFrontFeatureAccess = (
  feature: FrontFeatureKey,
  backendPermissions: readonly string[] | undefined,
): boolean => {
  const { list, set } = normalizePermissions(backendPermissions);
  if (list.length === 0) {
    return false;
  }

  const isAdmin = set.has("profile.bo-admin");
  const isTechnical = set.has("profile.bo-profil-technique");
  const isStructureAdmin = set.has("profile.bo.structure-admin");
  const isCentralProduct = set.has("profile.bo.produit-central");
  const isDistributorAdminRole = checkDistributorAdmin(set);

  switch (feature) {
    case "dashboard":
      return list.some((permission) => permission.startsWith("perm.bo."));
    case "partenaires":
      return isAdmin || hasAnyBackendPermissionForAliases(list, FrontFeatureAliases.partenaires);
    case "produits":
      return hasAnyBackendPermissionForAliases(list, FrontFeatureAliases.produits);
    case "structures":
      return hasAnyBackendPermissionForAliases(list, FrontFeatureAliases.structures);
    case "agences":
      return hasAnyBackendPermissionForAliases(list, FrontFeatureAliases.agences);
    case "caisses":
      return hasAnyBackendPermissionForAliases(list, FrontFeatureAliases.caisses);
    case "utilisateurs":
      return hasAnyBackendPermissionForAliases(list, FrontFeatureAliases.utilisateurs);
    case "clients":
      return hasAnyBackendPermissionForAliases(list, FrontFeatureAliases.clients);
    case "distributeurs":
      return hasAnyBackendPermissionForAliases(list, FrontFeatureAliases.distributeurs);
    case "packages":
      return (
        isAdmin ||
        isTechnical ||
        hasAnyBackendPermissionForAliases(list, FrontFeatureAliases.packages)
      );
    case "parametres":
      return (
        isAdmin ||
        isTechnical ||
        isStructureAdmin ||
        isCentralProduct ||
        isDistributorAdminRole ||
        hasAnyBackendPermissionForAliases(list, FrontFeatureAliases.parametres)
      );
    case "tracking":
      // Permission dédiée : perm.bo.tracking.list (l'export seul ne donne pas accès au module)
      return isAdmin || set.has("all") || set.has("*") || set.has(TrackingPermissions.list);
    case "releves":
      return hasRelevePermission(list, RelevePermissions.list);
    default:
      return false;
  }
};

// ===== HELPER DE VÉRIFICATION DE PERMISSIONS =====

export function can(
  _role: string,
  action: Action,
  entity: keyof typeof PermissionMatrix,
  backendPermissions?: readonly string[],
): boolean {
  const { list } = normalizePermissions(backendPermissions);
  return canFromBackendAliases(list, action, EntityActionAliases[entity]);
}
