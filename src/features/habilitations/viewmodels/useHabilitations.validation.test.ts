import { describe, it, expect } from "vitest";
import { validatePermissionForm, validateProfileForm } from "./useHabilitations";

describe("validateProfileForm", () => {
  const form = { name: "Superviseur", code: "profile.bo.superviseur", description: "", enabled: true, permissionIds: [] };

  it("accepte un profil complet", () => {
    expect(validateProfileForm(form)).toEqual({});
  });

  it("signale le nom et le code manquants à la fois", () => {
    expect(validateProfileForm({ ...form, name: " ", code: "" })).toEqual({
      name: "Le nom du profil est obligatoire",
      code: "Le code technique du profil est obligatoire",
    });
  });
});

describe("validatePermissionForm", () => {
  const form = {
    code: "perm.bo.user.list",
    name: "Lister les utilisateurs",
    clientId: "backoffice-web" as const,
    description: "",
    enabled: true,
  };

  it("accepte une permission complète", () => {
    expect(validatePermissionForm(form)).toEqual({});
  });

  it("signale le code et le libellé manquants à la fois", () => {
    expect(validatePermissionForm({ ...form, code: "", name: "  " })).toEqual({
      code: "Le code de la permission est obligatoire",
      name: "Le libellé de la permission est obligatoire",
    });
  });
});
