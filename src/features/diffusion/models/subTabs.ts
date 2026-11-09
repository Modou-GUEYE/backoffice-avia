import type { SubTabsDefinition } from "@/shared/navigation/subTabs";

/** Sous-onglets de la Diffusion : toujours visibles (l'accès au module est contrôlé par Paramètres). */
export const getDiffusionSubTabs = (): SubTabsDefinition => ({
  items: [
    { value: "notificationsList", label: "Gestion notifications" },
    { value: "campaignsList", label: "Publicités & Informations" },
  ],
  defaultValue: "notificationsList",
});
