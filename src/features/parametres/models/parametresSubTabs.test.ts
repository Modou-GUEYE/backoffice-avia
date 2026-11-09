import { describe, it, expect } from "vitest";
import { getPackagesSubTabs } from "@/features/packages/models/subTabs";
import { getWorkflowsSubTabs } from "@/features/workflows/models/subTabs";
import { getDiffusionSubTabs } from "@/features/diffusion/models/subTabs";
import { getTarificationSubTabs } from "@/features/tarification/models/subTabs";
import { getHabilitationsSubTabs } from "@/features/habilitations/models/subTabs";
import { getConnectiviteSubTabs } from "@/features/connectivite/models/subTabs";

const values = (definition: { items: Array<{ value: string }> }) => definition.items.map((item) => item.value);

describe("Sous-sections de Paramètres (mêmes règles que les modules)", () => {
  const admin = ["profile.bo-admin"];

  it("administrateur back-office : toutes les sous-sections", () => {
    expect(values(getPackagesSubTabs("Administrateur", admin))).toEqual([
      "listPackages",
      "listServices",
      "listPaymentMethods",
      "listAbonnements",
    ]);
    expect(values(getWorkflowsSubTabs("Administrateur", "Administration", admin))).toEqual([
      "workflows",
      "integrations",
      "forms",
      "fields",
    ]);
    expect(values(getTarificationSubTabs(admin))).toEqual(["frais", "plafonds", "taxes", "commissions", "promos"]);
    expect(values(getHabilitationsSubTabs(admin, true))).toEqual(["profiles", "permissions"]);
    expect(values(getConnectiviteSubTabs("Administrateur", "Administration", admin))).toEqual([
      "connection",
      "catalogue",
      "endpoints",
    ]);
    expect(values(getDiffusionSubTabs())).toEqual(["notificationsList", "campaignsList"]);
  });

  it("limite les sous-sections aux permissions détenues", () => {
    expect(values(getTarificationSubTabs(["perm.bo.cap.list", "perm.bo.taxe.list"]))).toEqual(["plafonds", "taxes"]);
    expect(values(getWorkflowsSubTabs("Agent", "Structure", ["perm.bo.form.list"]))).toEqual(["forms"]);
    expect(values(getPackagesSubTabs("Agent", ["perm.bo.subscription.list"]))).toEqual(["listAbonnements"]);
    expect(values(getConnectiviteSubTabs("Agent", "Structure", ["perm.bo.banking.endpoint.list"]))).toEqual([
      "endpoints",
    ]);
  });

  it("une permission d'action packages n'ouvre pas la liste sans permission exacte", () => {
    expect(values(getPackagesSubTabs("Agent", ["perm.bo.package.create"]))).toEqual([]);
  });

  it("profil technique : moyens de paiement par défaut", () => {
    const technical = getPackagesSubTabs("Profil Technique", ["profile.bo-profil-technique"]);
    expect(technical.defaultValue).toBe("listPaymentMethods");
    expect(values(technical)).toEqual(["listServices", "listPaymentMethods"]);
  });
});
