import { describe, expect, it } from "vitest";
import { validateAdministrationForm } from "./useAdministration";

describe("validateAdministrationForm", () => {
  it("exige le nom de l'administration", () => {
    expect(validateAdministrationForm({ name: "  ", contact_email: "", contact_phone: "" })).toEqual({
      name: "Le nom de l'administration est obligatoire",
    });
  });

  it("ne renvoie aucune erreur quand le nom est renseigné", () => {
    expect(validateAdministrationForm({ name: "Admin", contact_email: "", contact_phone: "" })).toEqual({});
  });
});
