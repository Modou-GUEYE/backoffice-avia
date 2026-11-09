export const BANKING_PERMISSION_PREFIX = "perm.bo.banking.";

export const BankingPermissions = {
  list: "perm.bo.banking.list",
  read: "perm.bo.banking.read",
  connectionRead: "perm.bo.banking.connection.read",
  connectionUpdate: "perm.bo.banking.connection.update",
  connectionDelete: "perm.bo.banking.connection.delete",
  operationList: "perm.bo.banking.operation.list",
  operationRead: "perm.bo.banking.operation.read",
  operationCreate: "perm.bo.banking.operation.create",
  operationUpdate: "perm.bo.banking.operation.update",
  operationActivate: "perm.bo.banking.operation.activate",
  operationDeactivate: "perm.bo.banking.operation.deactivate",
  operationDelete: "perm.bo.banking.operation.delete",
  endpointList: "perm.bo.banking.endpoint.list",
  endpointUpdate: "perm.bo.banking.endpoint.update",
  endpointTest: "perm.bo.banking.endpoint.test",
  endpointDelete: "perm.bo.banking.endpoint.delete",
  defaultsUpdate: "perm.bo.banking.defaults.update",
} as const;

export interface ConnectivitePermissions {
  connection: { view: boolean; update: boolean; delete: boolean };
  operation: {
    view: boolean;
    read: boolean;
    create: boolean;
    update: boolean;
    activate: boolean;
    deactivate: boolean;
    delete: boolean;
  };
  endpoint: { view: boolean; update: boolean; test: boolean; delete: boolean };
  /** Modifier les valeurs globales par défaut (connexion et endpoints de toutes les structures). */
  defaults: { update: boolean };
}

/** Accès à l'onglet Connectivité : permission historique list/read ou n'importe quelle permission perm.bo.banking.* */
export const hasBankingAccess = (permissions: string[] | null | undefined): boolean =>
  Boolean(permissions?.some((p) => p.toLowerCase().startsWith(BANKING_PERMISSION_PREFIX)));

export const buildConnectivitePermissions = (
  hasPerm: (perm: string) => boolean,
): ConnectivitePermissions => {
  const connection = {
    update: hasPerm(BankingPermissions.connectionUpdate),
    delete: hasPerm(BankingPermissions.connectionDelete),
  };
  const operation = {
    read: hasPerm(BankingPermissions.operationRead),
    create: hasPerm(BankingPermissions.operationCreate),
    update: hasPerm(BankingPermissions.operationUpdate),
    activate: hasPerm(BankingPermissions.operationActivate),
    deactivate: hasPerm(BankingPermissions.operationDeactivate),
    delete: hasPerm(BankingPermissions.operationDelete),
  };
  const endpoint = {
    update: hasPerm(BankingPermissions.endpointUpdate),
    test: hasPerm(BankingPermissions.endpointTest),
    delete: hasPerm(BankingPermissions.endpointDelete),
  };

  return {
    connection: {
      ...connection,
      view: hasPerm(BankingPermissions.connectionRead) || connection.update || connection.delete,
    },
    operation: {
      ...operation,
      view:
        hasPerm(BankingPermissions.operationList) ||
        Object.values(operation).some(Boolean),
    },
    endpoint: {
      ...endpoint,
      view: hasPerm(BankingPermissions.endpointList) || Object.values(endpoint).some(Boolean),
    },
    defaults: { update: hasPerm(BankingPermissions.defaultsUpdate) },
  };
};

/**
 * Sur les valeurs globales par défaut, les modifications exigent en plus perm.bo.banking.defaults.update.
 * La visibilité et le test des endpoints ne changent pas.
 */
export const scopeConnectivitePermissions = (
  perms: ConnectivitePermissions,
  isGlobalDefaults: boolean,
): ConnectivitePermissions => {
  if (!isGlobalDefaults || perms.defaults.update) return perms;
  return {
    ...perms,
    connection: { ...perms.connection, update: false, delete: false },
    endpoint: { ...perms.endpoint, update: false, delete: false },
  };
};
