import type { SubTabsDefinition } from "@/shared/navigation/subTabs";

/** Actions sur packages et services : toujours soumises à la permission exacte, même pour un administrateur. */
const PACKAGE_ACTION_PREFIXES = [
  "perm.bo.package.create",
  "perm.bo.package.update",
  "perm.bo.package.delete",
  "perm.bo.package.activate",
  "perm.bo.package.deactivate",
  "perm.bo.package.duplicate",
  "perm.bo.package.archive",
  "perm.bo.service.create",
  "perm.bo.service.update",
  "perm.bo.service.delete",
  "perm.bo.service.activate",
  "perm.bo.service.deactivate",
  "perm.bo.service.version",
];

export const isPackagesTechnicalProfile = (
  role: string | undefined,
  permissions: readonly string[] | null | undefined,
): boolean =>
  role === "Profil Technique" ||
  role?.toLowerCase() === "technique" ||
  Boolean(permissions?.some((p) => p.toLowerCase().includes("technique")));

/** Règle d'accès de l'écran Packages (joker, administrateur global, profil technique, permission exacte). */
export const createPackagesHasPerm = (
  role: string | undefined,
  permissions: readonly string[] | null | undefined,
) => {
  const isTechnicalProfile = isPackagesTechnicalProfile(role, permissions);
  return (perm: string): boolean => {
    if (!permissions) return false;
    if (permissions.some((p) => p === "*" || p === "all")) return true;

    const isActionPerm = PACKAGE_ACTION_PREFIXES.some((prefix) => perm.startsWith(prefix));
    if (!isActionPerm) {
      if (permissions.some((p) => p === "profile.bo-admin" || p === "profile.bo.admin")) return true;
      if (isTechnicalProfile && (perm.includes("payment-method") || perm.includes("service"))) return true;
    }
    return permissions.some((p) => p.toLowerCase() === perm.toLowerCase());
  };
};

/** Sous-onglets de Packages visibles selon les permissions (même règle que l'écran). */
export const getPackagesSubTabs = (
  role: string | undefined,
  permissions: readonly string[] | null | undefined,
): SubTabsDefinition => {
  const hasPerm = createPackagesHasPerm(role, permissions);
  const items = [
    hasPerm("perm.bo.package.list") && { value: "listPackages", label: "Packages" },
    hasPerm("perm.bo.service.list") && { value: "listServices", label: "Services" },
    (hasPerm("perm.bo.payment-method.list") || hasPerm("profile.bo-controller")) && {
      value: "listPaymentMethods",
      label: "Moyens de paiement",
    },
    hasPerm("perm.bo.subscription.list") && { value: "listAbonnements", label: "Abonnements" },
  ].filter((item): item is { value: string; label: string } => Boolean(item));

  let defaultValue = "listPackages";
  if (isPackagesTechnicalProfile(role, permissions)) defaultValue = "listPaymentMethods";
  else if (hasPerm("perm.bo.package.list")) defaultValue = "listPackages";
  else if (hasPerm("perm.bo.service.list")) defaultValue = "listServices";
  else if (hasPerm("perm.bo.payment-method.list")) defaultValue = "listPaymentMethods";
  else if (hasPerm("perm.bo.subscription.list")) defaultValue = "listAbonnements";

  return { items, defaultValue };
};
