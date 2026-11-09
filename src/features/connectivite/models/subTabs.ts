import type { SubTabsDefinition } from "@/shared/navigation/subTabs";
import { buildConnectivitePermissions } from "./permissions";

/** Règle d'accès de l'écran Connectivité : l'administrateur global a tous les droits, sinon permission exacte. */
export const createConnectiviteHasPerm = (
  role: string | undefined,
  entityContext: string | undefined,
  permissions: readonly string[] | null | undefined,
) => {
  const isGlobalAdmin =
    (role === "Administrateur" && entityContext === "Administration") ||
    Boolean(permissions?.some((p) => p === "profile.bo-admin" || p === "profile.bo.admin" || p === "*" || p === "all"));
  return (perm: string) => {
    if (!permissions) return false;
    if (isGlobalAdmin) return true;
    return permissions.some((p) => p.toLowerCase() === perm.toLowerCase());
  };
};

/** Sous-onglets de la Connectivité visibles selon les permissions (même règle que l'écran). */
export const getConnectiviteSubTabs = (
  role: string | undefined,
  entityContext: string | undefined,
  permissions: readonly string[] | null | undefined,
): SubTabsDefinition => {
  const perms = buildConnectivitePermissions(createConnectiviteHasPerm(role, entityContext, permissions));
  const items = [
    perms.connection.view && { value: "connection", label: "Config. de Connexion" },
    perms.operation.view && { value: "catalogue", label: "Catalogue d'Opérations" },
    perms.endpoint.view && { value: "endpoints", label: "Endpoints d'Opérations" },
  ].filter((item): item is { value: string; label: string } => Boolean(item));
  return { items, defaultValue: items[0]?.value ?? "connection" };
};
