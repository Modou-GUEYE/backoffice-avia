import type { UserEntityContext } from "./types";

export const DEFAULT_PROFILE_ROLES: string[] = [
  "profile.bo.structure-admin",
  "profile.bo.structure-superviseur-fin",
  "profile.bo.structure-agent-fin",
  "profile.bo.agence-superviseur",
  "profile.bo.agence-agent",
];

export const DEFAULT_PROFILES_BY_CONTEXT: Record<UserEntityContext, string[]> = {
  Structure: [
    "profile.bo.structure-admin",
    "profile.bo.structure-superviseur-fin",
    "profile.bo.structure-agent-fin",
    "profile.bo.agence-superviseur",
    "profile.bo.agence-agent",
  ],
  Agence: [
    "profile.bo.agence-superviseur",
    "profile.bo.agence-agent",
  ],
  Administration: [
    "profile.bo-admin",
    "profile.bo-controller",
    "profile.bo-profil-technique",
  ],
  Distributeur: [
    "profile.bo.autonome-set-admin",
    "profile.bo.autonome-set-superviseur",
    "profile.bo.autonome-set-agent",
  ],
  Partenaire: [
    "profile.bo.partenaire-admin",
    "profile.bo.partenaire-facturier",
    "profile.bo.partenaire-marchand",
  ],
  Produit: [
    "profile.bo.produit-central",
  ],
};

export const getDefaultProfileRoles = (entityContext?: string): string[] => {
  if (!entityContext) {
    return DEFAULT_PROFILE_ROLES;
  }
  const key = Object.keys(DEFAULT_PROFILES_BY_CONTEXT).find(
    (k) => k.toLowerCase() === entityContext.trim().toLowerCase(),
  ) as UserEntityContext | undefined;

  return (key && DEFAULT_PROFILES_BY_CONTEXT[key]) ?? DEFAULT_PROFILE_ROLES;
};

const CONTEXT_PROFILE_PATTERNS: Record<UserEntityContext, RegExp[]> = {
  Administration: [
    /^profile\.bo-admin(?:$|[.-])/i,
    /^profile\.bo-controller(?:$|[.-])/i,
    /^profile\.bo-profil-technique(?:$|[.-])/i,
  ],
  Structure: [
    /^profile\.bo\.structure-/i,
    /^profile\.mobile-/i,
  ],
  Agence: [/^profile\.bo\.agence-/i],
  Produit: [/^profile\.bo\.produit-/i],
  Distributeur: [/^profile\.bo\.autonome-set-/i],
  Partenaire: [/^profile\.bo\.partenaire-/i],
};

export const isProfileRole = (role?: string): boolean =>
  typeof role === "string" && role.startsWith("profile.");

export const isProfileRoleForEntityContext = (role: string, entityContext: string): boolean => {
  if (!isProfileRole(role)) {
    return false;
  }

  const normalized = role.trim();
  const patterns = CONTEXT_PROFILE_PATTERNS[entityContext as UserEntityContext] ?? [];
  return patterns.some((pattern) => pattern.test(normalized));
};

export const isAgentProfile = (profile?: string): boolean =>
  typeof profile === "string" && profile.toLowerCase().includes("agent");

export const isSuperviseurProfile = (profile?: string): boolean =>
  typeof profile === "string" && profile.toLowerCase().includes("superviseur");

const PROFILES_SUPPORTING_AGENCE = new Set<string>([
  "profile.bo.agence-agent",
  "profile.bo.agence-superviseur",
  "profile.bo.structure-agent-fin",
  "profile.bo.structure-superviseur-fin",
]);

const PROFILES_SUPPORTING_CAISSE = new Set<string>([
  "profile.bo.agence-agent",
  "profile.bo.structure-agent-fin",
]);

/**
 * Profils éligibles au filtre de périmètre agence.
 * Note : Ce champ est optionnel (vide = accès global à toutes les agences).
 */
export const supportsAgence = (profile?: string): boolean =>
  typeof profile === "string" && PROFILES_SUPPORTING_AGENCE.has(profile.trim());

/**
 * Profils éligibles à l'assignation d'une caisse.
 * Note : Ce champ est optionnel.
 */
export const supportsCaisse = (profile?: string): boolean =>
  typeof profile === "string" && PROFILES_SUPPORTING_CAISSE.has(profile.trim());

// Alias de rétrocompatibilité
export const requiresAgence = supportsAgence;
export const requiresCaisse = supportsCaisse;

export const requiresDistributor = (profile?: string): boolean =>
  typeof profile === "string" && profile.trim().startsWith("profile.bo.autonome-set-");

const PROFILE_LABELS: Record<string, string> = {
  // Administration
  "profile.bo-admin": "Administrateur Backoffice",
  "profile.bo-controller": "Contrôleur Backoffice",
  "profile.bo-profil-technique": "Profil Technique",

  // Structure
  "profile.bo.structure-admin": "Administrateur Structure",
  "profile.bo.structure-controller": "Contrôleur Structure",
  "profile.bo.structure-agent-fin": "Agent Financier Structure",
  "profile.bo.structure-superviseur-fin": "Superviseur Financier Structure",

  // Agence
  "profile.bo.agence-agent": "Agent Agence",
  "profile.bo.agence-superviseur": "Superviseur Agence",

  // Distributeur
  "profile.bo.autonome-set-admin": "Administrateur Distributeur",
  "profile.bo.autonome-set-agent": "Agent Distributeur",
  "profile.bo.autonome-set-superviseur": "Superviseur Distributeur",

  // Produit
  "profile.bo.produit-central": "Gestionnaire Produits",

  // Partenaire
  "profile.bo.partenaire-admin": "Admin Partenaire",
  "profile.bo.partenaire-facturier": "Facturier",
  "profile.bo.partenaire-marchand": "Marchand",

  // Mobile
  "profile.mobile-default": "Enduser",
};

const UUID_SUFFIX_REGEX = /-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const cleanProfileCode = (code: string): string => {
  if (!code) return "";
  return code.replace(UUID_SUFFIX_REGEX, "");
};

export const getProfileDisplayName = (role: string): string => {
  if (!role) return "Profil inconnu";
  if (PROFILE_LABELS[role]) return PROFILE_LABELS[role];

  if (isProfileRole(role)) {
    let cleanRole = role.replace(UUID_SUFFIX_REGEX, "");

    const isCopy = /-copie$/i.test(cleanRole);
    if (isCopy) {
      cleanRole = cleanRole.replace(/-copie$/i, "");
    }

    const displayName = PROFILE_LABELS[cleanRole];
    if (displayName) {
      return isCopy ? `${displayName} Copie` : displayName;
    }
  }

  return role;
};

export const getProfileRoleDisplayLabel = (
  user?: { role?: string; entityContext?: string; permissions?: string[] } | null
): string => {
  if (!user) return "UTILISATEUR";

  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  const profileRole = perms.find((p) => typeof p === "string" && isProfileRole(p));
  if (profileRole) {
    return getProfileDisplayName(profileRole).toUpperCase();
  }

  if (user.role && isProfileRole(user.role)) {
    return getProfileDisplayName(user.role).toUpperCase();
  }

  return (user.role || "UTILISATEUR").toUpperCase();
};
