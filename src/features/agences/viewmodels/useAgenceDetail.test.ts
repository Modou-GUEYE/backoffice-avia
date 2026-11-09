import { describe, expect, it } from "vitest";
import { validateCaisseDialogForm } from "./useAgenceDetail";

describe("validateCaisseDialogForm", () => {
  it("returns no error for a complete form", () => {
    expect(validateCaisseDialogForm({ name: "Caisse 1", code: "CSS001" })).toEqual({});
  });

  it("returns every missing required field at once", () => {
    expect(validateCaisseDialogForm({ name: "  ", code: "" })).toEqual({
      name: "Le nom de la caisse est obligatoire",
      code: "Le code de la caisse est obligatoire",
    });
  });

  it("checks name and code lengths", () => {
    expect(validateCaisseDialogForm({ name: "A", code: "C".repeat(51) })).toEqual({
      name: "Le nom de la caisse doit contenir entre 2 et 255 caractères",
      code: "Le code de la caisse doit contenir entre 2 et 50 caractères",
    });
  });
});
