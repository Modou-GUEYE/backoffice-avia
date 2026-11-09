import { describe, expect, it } from "vitest";
import { computeParametresAccess } from "./parametresAccess";

describe("computeParametresAccess", () => {
  it("masque Paramètres quand aucun onglet n'est accessible (ex. Admin Partenaire)", () => {
    const access = computeParametresAccess("Administrateur", "Partenaire", [
      "profile.bo.partenaire-admin",
      "perm.bo.user.list",
      "perm.bo.user.add",
    ]);
    expect(access.hasAny).toBe(false);
    expect(access.defaultTab).toBe("");
  });

  it("donne tous les onglets à un administrateur back-office", () => {
    const access = computeParametresAccess("Administrateur", "Administration", ["profile.bo-admin"]);
    expect(Object.values(access.tabs).every(Boolean)).toBe(true);
    expect(access.defaultTab).toBe("administrations");
  });

  it("ouvre les Packages par défaut pour le profil technique", () => {
    const access = computeParametresAccess("Profil Technique", "Administration", ["profile.bo-profil-technique"]);
    expect(access.tabs.packages).toBe(true);
    expect(access.defaultTab).toBe("packages");
  });

  it("n'affiche que les onglets autorisés à un administrateur de structure", () => {
    const access = computeParametresAccess("Administrateur", "Structure", [
      "profile.bo.structure-admin",
      "perm.bo.rule.list",
      "perm.bo.habilitation.profile.list",
    ]);
    expect(access.tabs).toEqual({
      administrations: false,
      packages: false,
      workflows: false,
      diffusion: false,
      tarification: true,
      habilitations: true,
      structureParams: false,
      banking: false,
    });
    expect(access.defaultTab).toBe("tarification");
    expect(access.hasAny).toBe(true);
  });

  it("ne donne rien sans permissions", () => {
    expect(computeParametresAccess(undefined, undefined, undefined).hasAny).toBe(false);
  });
});
