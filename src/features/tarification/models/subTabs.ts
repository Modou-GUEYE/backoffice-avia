import type { SubTabsDefinition } from "@/shared/navigation/subTabs";

/** Sous-onglets de la Tarification visibles selon les permissions (même règle que l'écran). */
export const getTarificationSubTabs = (permissions: readonly string[] | null | undefined): SubTabsDefinition => {
  const list = permissions ?? [];
  const has = (perm: string) => list.includes(perm);
  const isAdmin = list.some((p) => p.includes("admin"));

  const access = {
    frais: has("perm.bo.rule.list") || isAdmin,
    plafonds: has("perm.bo.cap.list") || isAdmin,
    taxes: has("perm.bo.taxe.list") || isAdmin,
    commissions: has("perm.bo.commission.list") || has("perm.bo.rule.list") || isAdmin,
    promos: has("perm.bo.promo.list") || has("perm.bo.rule.list") || isAdmin,
  };

  const items = [
    { value: "frais", label: "Frais" },
    { value: "plafonds", label: "Plafonds" },
    { value: "taxes", label: "Taxes" },
    { value: "commissions", label: "Commissions" },
    { value: "promos", label: "Promotions" },
  ].filter((item) => access[item.value as keyof typeof access]);

  return { items, defaultValue: items[0]?.value ?? "frais" };
};
