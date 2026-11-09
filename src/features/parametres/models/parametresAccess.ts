import { isBackofficeAdminActor } from "@/core/security/backofficeAdmin";
import { hasBankingAccess } from "@/features/connectivite/models/permissions";
import { buildStructureParamsAccess } from "@/features/structure-params/models/permissions";
import { hasHabilitationAccess } from "@/features/habilitations/models/permissions";

export type ParametresTab =
  | "administrations"
  | "packages"
  | "workflows"
  | "diffusion"
  | "tarification"
  | "habilitations"
  | "structureParams"
  | "banking";

export interface ParametresAccess {
  tabs: Record<ParametresTab, boolean>;
  /** Onglet ouvert par défaut ; vide si aucun onglet n'est accessible. */
  defaultTab: ParametresTab | "";
  /** Au moins un onglet accessible : conditionne l'affichage du menu Paramètres. */
  hasAny: boolean;
}

/**
 * Onglets de la page Paramètres accessibles à l'utilisateur.
 * Source unique pour la page, le menu latéral et la route.
 */
export const computeParametresAccess = (
  role: string | undefined,
  entityContext: string | undefined,
  permissions: string[] | null | undefined,
): ParametresAccess => {
  const list = permissions ?? [];
  const lower = list.map((p) => p.toLowerCase());
  const isBackofficeAdmin = isBackofficeAdminActor(role, entityContext, list);
  const isTechnicalProfile =
    role === "Profil Technique" || lower.some((p) => p.includes("profil-technique"));

  const hasPerm = (perm: string) => {
    if (list.length === 0) return false;
    if (isBackofficeAdmin) return true;
    // Profil Technique : accès aux services et moyens de paiement
    if (isTechnicalProfile && (perm.includes("payment-method") || perm.includes("service"))) return true;
    return lower.includes(perm.toLowerCase());
  };

  const tabs: Record<ParametresTab, boolean> = {
    administrations: hasPerm("profile.bo-admin") || hasPerm("profile.bo.admin"),
    packages:
      hasPerm("perm.bo.package.list") ||
      hasPerm("perm.bo.service.list") ||
      hasPerm("perm.bo.payment-method.list") ||
      hasPerm("perm.bo.subscription.list"),
    workflows:
      isBackofficeAdmin ||
      lower.some(
        (p) =>
          p.startsWith("perm.bo.workflow.") ||
          p.startsWith("perm.bo.integration.") ||
          p.startsWith("perm.bo.form.") ||
          p.startsWith("perm.bo.field."),
      ),
    diffusion: hasPerm("perm.bo.campaign.list"),
    tarification: hasPerm("perm.bo.rule.list") || hasPerm("perm.bo.cap.list") || hasPerm("perm.bo.taxe.list"),
    habilitations: hasHabilitationAccess(list, isBackofficeAdmin),
    structureParams: buildStructureParamsAccess(list, isBackofficeAdmin).view,
    banking: isBackofficeAdmin || hasBankingAccess(list),
  };

  const order: ParametresTab[] = [
    "administrations",
    "packages",
    "workflows",
    "diffusion",
    "tarification",
    "banking",
    "habilitations",
    "structureParams",
  ];
  const defaultTab: ParametresTab | "" =
    isTechnicalProfile && tabs.packages ? "packages" : order.find((tab) => tabs[tab]) ?? "";

  return { tabs, defaultTab, hasAny: defaultTab !== "" };
};
