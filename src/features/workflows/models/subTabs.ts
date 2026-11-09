import type { SubTabsDefinition } from "@/shared/navigation/subTabs";

/** Administrateur back-office au sens de l'écran Workflows (rôle, profil ou joker). */
export const isWorkflowsBackofficeAdmin = (
  role: string | undefined,
  entityContext: string | undefined,
  permissions: readonly string[] | null | undefined,
): boolean =>
  (role === "Administrateur" && entityContext === "Administration") ||
  Boolean(
    permissions?.some(
      (p) =>
        p === "profile.bo-admin" ||
        p === "profile.bo.admin" ||
        p === "*" ||
        p === "all" ||
        p.toLowerCase().includes("bo-admin") ||
        p.toLowerCase().includes("bo.admin"),
    ),
  );

/**
 * Sous-onglets de Workflows visibles selon les permissions (même règle que l'écran) :
 * administrateur back-office, ou au moins une permission perm.bo.<module>.*.
 */
export const getWorkflowsSubTabs = (
  role: string | undefined,
  entityContext: string | undefined,
  permissions: readonly string[] | null | undefined,
): SubTabsDefinition => {
  const isAdmin = isWorkflowsBackofficeAdmin(role, entityContext, permissions);
  const hasModule = (prefix: string) =>
    isAdmin || Boolean(permissions?.some((p) => p.toLowerCase().startsWith(`perm.bo.${prefix}.`)));

  const items = [
    hasModule("workflow") && { value: "workflows", label: "Workflows" },
    hasModule("integration") && { value: "integrations", label: "Intégrations" },
    hasModule("form") && { value: "forms", label: "Formulaires" },
    hasModule("field") && { value: "fields", label: "Catalogue de Champs" },
  ].filter((item): item is { value: string; label: string } => Boolean(item));
  return { items, defaultValue: items[0]?.value ?? "workflows" };
};
