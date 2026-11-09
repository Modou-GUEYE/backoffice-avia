import type { SubTabsDefinition } from "@/shared/navigation/subTabs";
import { buildHabilitationAccess } from "./permissions";

/** Sous-onglets des Habilitations visibles selon les permissions (même règle que l'écran). */
export const getHabilitationsSubTabs = (
  permissions: string[] | null | undefined,
  isBackofficeAdmin: boolean,
): SubTabsDefinition => {
  const access = buildHabilitationAccess(permissions, isBackofficeAdmin);
  const items = [
    access.profile.view && { value: "profiles", label: "Profils d'habilitation" },
    access.permission.view && { value: "permissions", label: "Catalogue des permissions" },
  ].filter((item): item is { value: string; label: string } => Boolean(item));
  return { items, defaultValue: items[0]?.value ?? "profiles" };
};
