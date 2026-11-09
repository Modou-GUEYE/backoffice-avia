import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ActorRole, EntityContext } from "@/core/permissions/permissions";

interface AuthUser {
  userId?: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: ActorRole;
  entityContext: EntityContext;
  institutionId?: string;
  institutionLabel?: string;
  distributorId?: string;
  distributorLabel?: string;
  agencyId?: string;
  /** Toutes les agences de rattachement (un groupe AGENCE par agence dans le jeton). */
  agencyIds?: string[];
  agencyLabel?: string;
  caisseId?: string;
  caisseLabel?: string;
  productId?: string;
  productLabel?: string;
  permissions?: string[];
  media_url?: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  login: (payload: {
    email: string;
    token?: string;
    refreshToken?: string;
    role?: ActorRole;
    entityContext?: EntityContext;
    institutionId?: string;
    institutionLabel?: string;
    distributorId?: string;
    agencyId?: string;
    agencyLabel?: string;
    caisseId?: string;
    caisseLabel?: string;
    productId?: string;
    productLabel?: string;
    permissions?: string[];
  }) => void;
  updateAccessToken: (payload: {
    token: string;
    expiresIn?: number;
    tokenType?: string;
    permissions?: string[];
  }) => void;
  setCurrentActor: (payload: { role: ActorRole; entityContext: EntityContext }) => void;
  updateResolvedEntities: (payload: {
    institutionId?: string;
    institutionLabel?: string;
    distributorId?: string;
    distributorLabel?: string;
    agencyId?: string;
    agencyLabel?: string;
    caisseId?: string;
    caisseLabel?: string;
    productId?: string;
    productLabel?: string;
  }) => void;
  updateUserMediaUrl: (media_url: string | null) => void;
  logout: () => void;
}

type PersistedAuthState = Pick<AuthState, "isAuthenticated" | "user" | "token" | "refreshToken">;

export const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : normalized + "=".repeat(4 - padding);
  return atob(padded);
};

export const parseJwtPayload = <T = Record<string, unknown>>(token?: string | null): T | null => {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    return JSON.parse(decodeBase64Url(parts[1])) as T;
  } catch {
    return null;
  }
};

const extractIdFromGroupTag = (groups: unknown, tag: string): string | null => {
  if (!Array.isArray(groups)) return null;

  const regex = new RegExp(`(?:^|\\/)\\s*${tag}:([a-f0-9-]+)`, "i");
  for (const group of groups) {
    if (typeof group !== "string") continue;
    const match = regex.exec(group);
    if (match?.[1]) {
      return match[1].toLowerCase();
    }
  }

  return null;
};

export const parseDistributorIdFromToken = (token?: string): string | null => {
  const payload = parseJwtPayload(token);
  if (!payload) return null;

  const directId = payload.distributor_id ?? payload.distributorId;
  if (typeof directId === "string" && directId.trim()) {
    return directId.trim();
  }

  return extractIdFromGroupTag(payload.groups, "DISTRIBUTOR");
};

export const parseEntityContextFromToken = (token?: string): EntityContext | null => {
  const payload = parseJwtPayload<{ groups?: unknown }>(token);
  if (!payload || !Array.isArray(payload.groups)) return null;

  const stringGroups = payload.groups.filter((g): g is string => typeof g === "string");

  // Identification depuis les groupes du token (hiérarchique du plus spécifique au plus global)
  if (stringGroups.some((g) => /(?:^|\/)\s*DISTRIBUTOR:/i.test(g))) {
    return "Distributeur";
  }
  if (stringGroups.some((g) => /(?:^|\/)\s*CAISSE:/i.test(g))) {
    return "Caisse";
  }
  if (stringGroups.some((g) => /(?:^|\/)\s*AGENCE:/i.test(g))) {
    return "Agence";
  }
  if (stringGroups.some((g) => /(?:^|\/)\s*PARTNER:/i.test(g))) {
    return "Partenaire";
  }
  if (stringGroups.some((g) => /(?:^|\/)\s*STRUCTURE:/i.test(g))) {
    return "Structure";
  }
  if (stringGroups.some((g) => /(?:^|\/)\s*ADMIN:/i.test(g))) {
    return "Administration";
  }
  if (stringGroups.some((g) => /(?:^|\/)\s*PRODUCT:/i.test(g))) {
    return "Produit";
  }

  return null;
};

export const parseInstitutionIdFromToken = (token?: string): string | null => {
  const payload = parseJwtPayload(token);
  if (!payload) return null;

  const directId = payload.institution_id ?? payload.institutionId;
  if (typeof directId === "string" && directId.trim()) {
    return directId.trim();
  }

  return (
    extractIdFromGroupTag(payload.groups, "STRUCTURE") ??
    extractIdFromGroupTag(payload.groups, "PARTNER")
  );
};

export const parseAgencyIdFromToken = (token?: string): string | null => {
  const payload = parseJwtPayload(token);
  if (!payload) return null;

  const directId =
    payload.agency_id ??
    payload.agencyId ??
    payload.agence_id ??
    payload.agenceId;
  if (typeof directId === "string" && directId.trim()) {
    return directId.trim();
  }

  return extractIdFromGroupTag(payload.groups, "AGENCE");
};

/** Identifiants de toutes les agences présentes dans les groupes du jeton (/…/AGENCE:<id>), sans doublon. */
export const parseAgencyIdsFromToken = (token?: string): string[] => {
  const payload = parseJwtPayload<{ groups?: unknown }>(token);
  if (!payload || !Array.isArray(payload.groups)) return [];
  const ids = new Set<string>();
  for (const group of payload.groups) {
    if (typeof group !== "string") continue;
    const match = /(?:^|\/)\s*AGENCE:([a-f0-9-]+)/i.exec(group);
    if (match?.[1]) ids.add(match[1].toLowerCase());
  }
  return [...ids];
};

export const parseCaisseIdFromToken = (token?: string): string | null => {
  const payload = parseJwtPayload(token);
  if (!payload) return null;

  const directId = payload.caisse_id ?? payload.caisseId;
  if (typeof directId === "string" && directId.trim()) {
    return directId.trim();
  }

  return extractIdFromGroupTag(payload.groups, "CAISSE");
};

export const parseProductIdFromToken = (token?: string): string | null => {
  const payload = parseJwtPayload(token);
  if (!payload) return null;

  const directId = payload.product_id ?? payload.productId;
  if (typeof directId === "string" && directId.trim()) {
    return directId.trim();
  }

  return extractIdFromGroupTag(payload.groups, "PRODUCT");
};

export interface TokenUserInfo {
  userId?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export const parseUserInfoFromToken = (token?: string): TokenUserInfo => {
  const payload = parseJwtPayload(token);
  if (!payload) return {};

  const getString = (...keys: string[]) => {
    const value = keys.map((key) => payload[key]).find((candidate) => typeof candidate === "string");
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };

  return {
    userId: getString("sub", "user_id", "userId"),
    username: getString("preferred_username", "username"),
    email: getString("email"),
    firstName: getString("given_name", "first_name", "firstName"),
    lastName: getString("family_name", "last_name", "lastName"),
  };
};

export const getRequestedPartnerId = (): string | null => {
  const fromEnv = import.meta.env.VITE_PARTNER_ID?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  if (globalThis.window !== undefined) {
    const fromQuery = new URLSearchParams(globalThis.window.location.search).get("partner")?.trim();
    if (fromQuery) {
      return fromQuery;
    }
  }

  return null;
};

export const extractTokenPermissions = (accessToken?: string | null): string[] => {
  const payload = parseJwtPayload<{
    resource_access?: Record<string, { roles?: unknown }>;
    permissions?: unknown;
    scope_permissions?: unknown;
  }>(accessToken);
  if (!payload) return [];

  const roles = payload.resource_access?.["backoffice-web"]?.roles;
  const directPerms = Array.isArray(payload.permissions) ? payload.permissions : [];
  const scopePerms = Array.isArray(payload.scope_permissions) ? payload.scope_permissions : [];

  const combined = [
    ...(Array.isArray(roles) ? roles : []),
    ...directPerms,
    ...scopePerms,
  ];

  return Array.from(
    new Set(
      combined.filter((role): role is string => typeof role === "string" && role.trim().length > 0)
    )
  );
};

export const hasBackofficeAccess = (token?: string | null): boolean => {
  const payload = parseJwtPayload<{
    aud?: string | string[];
  }>(token);
  if (!payload) return false;

  const aud = payload.aud;
  if (Array.isArray(aud)) {
    return aud.includes("backoffice-web");
  }
  return aud === "backoffice-web";
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
      login: ({
        email,
        token,
        refreshToken,
        role,
        entityContext,
        institutionId,
        institutionLabel,
        distributorId,
        agencyId,
        agencyLabel,
        caisseId,
        caisseLabel,
        productId,
        productLabel,
        permissions,
      }) => {
        if (token && !hasBackofficeAccess(token)) {
          console.warn("[AuthStore] Connexion refusée : Le token ne dispose pas d'accès au backoffice.");
          return;
        }

        const tokenUser = parseUserInfoFromToken(token);
        const currentRole = role ?? "Administrateur";
        const currentEntityContext = entityContext ?? parseEntityContextFromToken(token) ?? "Administration";
        const currentInstitutionId = institutionId ?? parseInstitutionIdFromToken(token) ?? undefined;
        const currentInstitutionLabel = institutionLabel?.trim() || undefined;
        const currentDistributorId = distributorId ?? parseDistributorIdFromToken(token) ?? undefined;
        const currentAgencyId = agencyId ?? parseAgencyIdFromToken(token) ?? undefined;
        const currentAgencyLabel = agencyLabel?.trim() || undefined;
        const currentCaisseId = caisseId ?? parseCaisseIdFromToken(token) ?? undefined;
        const currentCaisseLabel = caisseLabel?.trim() || undefined;
        const currentProductId = productId ?? parseProductIdFromToken(token) ?? undefined;
        const currentProductLabel = productLabel?.trim() || undefined;

        set({
          isAuthenticated: true,
          user: {
            userId: tokenUser.userId,
            email,
            username: tokenUser.username ?? email,
            firstName: tokenUser.firstName,
            lastName: tokenUser.lastName,
            role: currentRole,
            entityContext: currentEntityContext,
            institutionId: currentInstitutionId,
            institutionLabel: currentInstitutionLabel,
            distributorId: currentDistributorId,
            agencyId: currentAgencyId,
            agencyIds: parseAgencyIdsFromToken(token),
            agencyLabel: currentAgencyLabel,
            caisseId: currentCaisseId,
            caisseLabel: currentCaisseLabel,
            productId: currentProductId,
            productLabel: currentProductLabel,
            permissions,
          },
          token: token ?? null,
          refreshToken: refreshToken ?? null,
        });
      },
      updateAccessToken: ({ token, permissions }) => {
        set((state) => {
          if (!state.isAuthenticated) {
            return state;
          }

          const extractedPermissions = extractTokenPermissions(token);
          const nextPermissions =
            permissions && permissions.length > 0
              ? permissions
              : extractedPermissions.length > 0
                ? extractedPermissions
                : state.user?.permissions;

          return {
            token,
            user: state.user
              ? {
                ...state.user,
                permissions: nextPermissions,
                institutionId: state.user.institutionId ?? parseInstitutionIdFromToken(token) ?? undefined,
                distributorId: state.user.distributorId ?? parseDistributorIdFromToken(token) ?? undefined,
                agencyId: state.user.agencyId ?? parseAgencyIdFromToken(token) ?? undefined,
                agencyIds: parseAgencyIdsFromToken(token),
                caisseId: state.user.caisseId ?? parseCaisseIdFromToken(token) ?? undefined,
                productId: state.user.productId ?? parseProductIdFromToken(token) ?? undefined,
              }
              : state.user,
          };
        });
      },
      setCurrentActor: ({ role, entityContext }) => {
        set((state) => {
          if (!state.user) {
            return state;
          }

          return {
            user: {
              ...state.user,
              role,
              entityContext,
            },
          };
        });
      },
      updateResolvedEntities: ({
        institutionId,
        institutionLabel,
        distributorId,
        distributorLabel,
        agencyId,
        agencyLabel,
        caisseId,
        caisseLabel,
        productId,
        productLabel,
      }) => {
        set((state) => {
          if (!state.user) return state;
          return {
            user: {
              ...state.user,
              institutionId: institutionId ?? state.user.institutionId,
              institutionLabel: institutionLabel ?? state.user.institutionLabel,
              distributorId: distributorId ?? state.user.distributorId,
              distributorLabel: distributorLabel ?? state.user.distributorLabel,
              agencyId: agencyId ?? state.user.agencyId,
              agencyLabel: agencyLabel ?? state.user.agencyLabel,
              caisseId: caisseId ?? state.user.caisseId,
              caisseLabel: caisseLabel ?? state.user.caisseLabel,
              productId: productId ?? state.user.productId,
              productLabel: productLabel ?? state.user.productLabel,
            },
          };
        });
      },
      updateUserMediaUrl: (media_url) => {
        set((state) => {
          if (!state.user) return state;
          return {
            user: {
              ...state.user,
              media_url,
            },
          };
        });
      },
      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          refreshToken: null,
        });
      },
    }),
    {
      name: "avia_auth_store",
      onRehydrateStorage: () => (state) => {
        const hydratedState = state as PersistedAuthState | undefined;
        if (!hydratedState) {
          return;
        }

        const token = hydratedState.token?.trim();
        if (!token || !hasBackofficeAccess(token)) {
          useAuthStore.setState({
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null,
          });
        }
      },
    },
  ),
);

export const getCurrentInstitutionId = (): string | null => {
  const state = useAuthStore.getState();

  const fromUser = state.user?.institutionId?.trim();
  if (fromUser) {
    return fromUser;
  }

  return parseInstitutionIdFromToken(state.token);
};

export const getCurrentInstitutionLabel = (): string | null => {
  const state = useAuthStore.getState();

  const fromUser = state.user?.institutionLabel?.trim();
  if (fromUser) {
    return fromUser;
  }

  return null;
};

export const getCurrentDistributorId = (): string | null => {
  const state = useAuthStore.getState();

  const fromUser = state.user?.distributorId?.trim();
  if (fromUser) {
    return fromUser;
  }

  return parseDistributorIdFromToken(state.token || undefined);
};

export const getCurrentAgencyId = (): string | null => {
  const state = useAuthStore.getState();

  const fromUser = state.user?.agencyId?.trim();
  if (fromUser) {
    return fromUser;
  }

  return parseAgencyIdFromToken(state.token || undefined);
};

export const getCurrentCaisseId = (): string | null => {
  const state = useAuthStore.getState();

  const fromUser = state.user?.caisseId?.trim();
  if (fromUser) {
    return fromUser;
  }

  return parseCaisseIdFromToken(state.token || undefined);
};
