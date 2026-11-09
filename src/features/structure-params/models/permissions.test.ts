import { describe, expect, it } from "vitest";
import { buildStructureParamsAccess, canSaveStructureParams } from "./permissions";

describe("buildStructureParamsAccess", () => {
  it("refuse l'accès sans profil ni permission", () => {
    expect(buildStructureParamsAccess(["perm.bo.workflow.list"], false).view).toBe(false);
    expect(buildStructureParamsAccess(undefined, false).view).toBe(false);
  });

  it("donne tous les droits à un administrateur back-office", () => {
    expect(buildStructureParamsAccess([], true)).toEqual({
      view: true,
      update: true,
      reset: true,
      defaultsUpdate: true,
    });
  });

  it("ne donne aucun accès automatique au profil administrateur de structure", () => {
    expect(buildStructureParamsAccess(["profile.bo.structure-admin"], false).view).toBe(false);
  });

  it("donne au profil administrateur de structure les droits de ses permissions", () => {
    expect(
      buildStructureParamsAccess(["profile.bo.structure-admin", "perm.bo.structure-params.read"], false),
    ).toEqual({ view: true, update: false, reset: false, defaultsUpdate: false });
  });

  it("accorde la consultation seule avec perm.bo.structure-params.read", () => {
    expect(buildStructureParamsAccess(["perm.bo.structure-params.read"], false)).toEqual({
      view: true,
      update: false,
      reset: false,
      defaultsUpdate: false,
    });
  });
});

describe("canSaveStructureParams", () => {
  const access = buildStructureParamsAccess(["perm.bo.structure-params.update"], false);

  it("autorise l'enregistrement d'une structure avec update", () => {
    expect(canSaveStructureParams(access, false)).toBe(true);
  });

  it("exige defaults.update pour les valeurs globales", () => {
    expect(canSaveStructureParams(access, true)).toBe(false);
    const withDefaults = buildStructureParamsAccess(["perm.bo.structure-params.defaults.update"], false);
    expect(canSaveStructureParams(withDefaults, true)).toBe(true);
  });
});
