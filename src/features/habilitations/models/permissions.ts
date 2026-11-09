export const HABILITATION_PERMISSION_PREFIX = "perm.bo.habilitation.";

export const HabilitationPermissions = {
  profileList: "perm.bo.habilitation.profile.list",
  profileCreate: "perm.bo.habilitation.profile.create",
  profileUpdate: "perm.bo.habilitation.profile.update",
  profileAssign: "perm.bo.habilitation.profile.assign",
  profileDelete: "perm.bo.habilitation.profile.delete",
  permissionList: "perm.bo.habilitation.permission.list",
  permissionCreate: "perm.bo.habilitation.permission.create",
  permissionUpdate: "perm.bo.habilitation.permission.update",
  permissionDelete: "perm.bo.habilitation.permission.delete",
  mobile: "perm.bo.habilitation.mobile",
} as const;

/** Profils administrateurs : seuls les administrateurs back-office peuvent les modifier ou les supprimer. */
export const ADMIN_PROFILE_CODES = ["profile.bo-admin", "profile.bo.admin"];

export interface HabilitationAccess {
  isBackofficeAdmin: boolean;
  profile: { view: boolean; create: boolean; update: boolean; assign: boolean; delete: boolean };
  permission: { view: boolean; create: boolean; update: boolean; delete: boolean };
  mobile: boolean;
  view: boolean;
}

const normalize = (permissions: string[] | null | undefined) =>
  new Set((permissions ?? []).map((p) => p.toLowerCase()));

/** Accès à l'onglet Habilitations : administrateur back-office ou n'importe quelle permission perm.bo.habilitation.* */
export const hasHabilitationAccess = (
  permissions: string[] | null | undefined,
  isBackofficeAdmin: boolean,
): boolean =>
  isBackofficeAdmin ||
  Boolean(permissions?.some((p) => p.toLowerCase().startsWith(HABILITATION_PERMISSION_PREFIX)));

export const buildHabilitationAccess = (
  permissions: string[] | null | undefined,
  isBackofficeAdmin: boolean,
): HabilitationAccess => {
  const owned = normalize(permissions);
  const has = (perm: string) => isBackofficeAdmin || owned.has(perm.toLowerCase());

  const profileActions = {
    create: has(HabilitationPermissions.profileCreate),
    update: has(HabilitationPermissions.profileUpdate),
    assign: has(HabilitationPermissions.profileAssign),
    delete: has(HabilitationPermissions.profileDelete),
  };
  const permissionActions = {
    create: has(HabilitationPermissions.permissionCreate),
    update: has(HabilitationPermissions.permissionUpdate),
    delete: has(HabilitationPermissions.permissionDelete),
  };

  const profile = {
    ...profileActions,
    view: has(HabilitationPermissions.profileList) || Object.values(profileActions).some(Boolean),
  };
  const permission = {
    ...permissionActions,
    view: has(HabilitationPermissions.permissionList) || Object.values(permissionActions).some(Boolean),
  };

  return {
    isBackofficeAdmin,
    profile,
    permission,
    mobile: has(HabilitationPermissions.mobile),
    view: profile.view || permission.view,
  };
};

const isAdminProfile = (code: string) => ADMIN_PROFILE_CODES.includes(code.toLowerCase());

/** Profil attribué à l'utilisateur connecté (les codes de profil figurent dans ses permissions). */
export const isOwnProfile = (code: string, permissions: string[] | null | undefined) =>
  normalize(permissions).has(code.toLowerCase());

export interface ProfileRowRights {
  /** Ouvrir l'écran de modification. */
  edit: boolean;
  /** Modifier nom, code, description, statut. */
  updateDetails: boolean;
  /** Cocher / décocher les permissions. */
  assign: boolean;
  delete: boolean;
}

/**
 * Garde-fous par profil :
 * - un profil administrateur n'est modifiable et supprimable que par un administrateur back-office ;
 * - personne (hors administrateur back-office) ne modifie les permissions ni ne supprime ses propres profils.
 */
export const getProfileRowRights = (
  access: HabilitationAccess,
  profileCode: string,
  permissions: string[] | null | undefined,
): ProfileRowRights => {
  if (access.isBackofficeAdmin) {
    return { edit: true, updateDetails: true, assign: true, delete: true };
  }
  if (isAdminProfile(profileCode)) {
    return { edit: false, updateDetails: false, assign: false, delete: false };
  }
  const own = isOwnProfile(profileCode, permissions);
  const updateDetails = access.profile.update;
  const assign = access.profile.assign && !own;
  return {
    edit: updateDetails || assign,
    updateDetails,
    assign,
    delete: access.profile.delete && !own,
  };
};
