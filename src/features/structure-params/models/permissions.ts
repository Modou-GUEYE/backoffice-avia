export const STRUCTURE_PARAMS_PERMISSION_PREFIX = "perm.bo.structure-params.";

export const StructureParamsPermissions = {
  read: "perm.bo.structure-params.read",
  update: "perm.bo.structure-params.update",
  reset: "perm.bo.structure-params.reset",
  defaultsUpdate: "perm.bo.structure-params.defaults.update",
} as const;

export interface StructureParamsAccess {
  view: boolean;
  update: boolean;
  reset: boolean;
  defaultsUpdate: boolean;
}

const hasExact = (permissions: string[] | null | undefined, perm: string) =>
  Boolean(permissions?.some((p) => p.toLowerCase() === perm.toLowerCase()));

/**
 * Droits sur l'onglet P. Structure.
 * - Administrateur back-office : tous les droits.
 * - Sinon (y compris profile.bo.structure-admin) : permissions perm.bo.structure-params.* uniquement.
 */
export const buildStructureParamsAccess = (
  permissions: string[] | null | undefined,
  isBackofficeAdmin: boolean,
): StructureParamsAccess => {
  if (isBackofficeAdmin) {
    return { view: true, update: true, reset: true, defaultsUpdate: true };
  }

  const update = hasExact(permissions, StructureParamsPermissions.update);
  const reset = hasExact(permissions, StructureParamsPermissions.reset);
  const defaultsUpdate = hasExact(permissions, StructureParamsPermissions.defaultsUpdate);

  return {
    view:
      hasExact(permissions, StructureParamsPermissions.read) ||
      update ||
      reset ||
      defaultsUpdate,
    update,
    reset,
    defaultsUpdate,
  };
};

/** Peut enregistrer pour la cible sélectionnée (valeurs globales ou structure). */
export const canSaveStructureParams = (access: StructureParamsAccess, isGlobalDefaults: boolean) =>
  isGlobalDefaults ? access.defaultsUpdate : access.update;
