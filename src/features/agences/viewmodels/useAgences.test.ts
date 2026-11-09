import { describe, expect, it } from "vitest";
import { filterAgencesForContext, validateAgenceForm } from "./useAgences";
import { AgenceForm, AgenceRead } from "../models/types";
import { emptyForm } from "../models/data";

describe("filterAgencesForContext", () => {
  it("filters agencies by parent_id for Structure context", () => {
    const agencies: AgenceRead[] = [
      {
        id: "agency-1",
        name: "Agence 1",
        code: "A1",
        parent_id: "9aef8151-56b1-4703-b336-a164bb06a39e",
        parent_type: "STRUCTURE",
        is_active: true,
        is_deleted: false,
        city: "",
      },
      {
        id: "agency-2",
        name: "Agence 2",
        code: "A2",
        parent_id: "another-structure",
        parent_type: "STRUCTURE",
        is_active: true,
        is_deleted: false,
        city: "",
      },
    ];

    const result = filterAgencesForContext(agencies, {
      connectedEntityContext: "Structure",
      institutionId: "9aef8151-56b1-4703-b336-a164bb06a39e",
    });

    expect(result.map((agency) => agency.id)).toEqual(["agency-1"]);
  });

  it("filters agencies by parent_id for Distributor context", () => {
    const agencies: AgenceRead[] = [
      {
        id: "agency-1",
        name: "Agence 1",
        code: "A1",
        parent_id: "distributor-1",
        parent_type: "DISTRIBUTOR",
        is_active: true,
        is_deleted: false,
        city: "",
      },
      {
        id: "agency-2",
        name: "Agence 2",
        code: "A2",
        parent_id: "distributor-2",
        parent_type: "DISTRIBUTOR",
        is_active: true,
        is_deleted: false,
        city: "",
      },
    ];

    const result = filterAgencesForContext(agencies, {
      connectedEntityContext: "Distributeur",
      distributorId: "distributor-1",
    });

    expect(result.map((agency) => agency.id)).toEqual(["agency-1"]);
  });
});

describe("resolveDefaultStructureId", () => {
  it("returns the single structure id when only one option exists", async () => {
    const { resolveDefaultStructureId } = await import("./useAgences");
    const options = [{ id: "struct-1", nom: "Banque Centrale" }];
    expect(resolveDefaultStructureId(options, "fallback-id")).toBe("struct-1");
  });

  it("returns currentInstitutionId when multiple options exist", async () => {
    const { resolveDefaultStructureId } = await import("./useAgences");
    const options = [
      { id: "struct-1", nom: "Banque 1" },
      { id: "struct-2", nom: "Banque 2" },
    ];
    expect(resolveDefaultStructureId(options, "struct-2")).toBe("struct-2");
  });
});

describe("validateAgenceForm", () => {
  const validForm: AgenceForm = {
    ...emptyForm,
    name: "Agence Principale",
    code: "AGC001",
    parent_type: "STRUCTURE",
    parent_id: "structure-1",
    structureId: "structure-1",
  };

  it("returns no error for a complete form", () => {
    expect(validateAgenceForm(validForm)).toEqual({});
  });

  it("returns every missing required field at once", () => {
    expect(
      validateAgenceForm({ ...emptyForm, parent_type: "" as AgenceForm["parent_type"] }),
    ).toEqual({
      name: "Le nom de l'agence est obligatoire",
      code: "Le code de l'agence est obligatoire",
      parent_type: "Le type d'entité parente est obligatoire",
      parent_id: "L'entité de rattachement est obligatoire",
    });
  });

  it("treats whitespace-only name and code as empty", () => {
    const errors = validateAgenceForm({ ...validForm, name: "   ", code: "  " });
    expect(errors.name).toBe("Le nom de l'agence est obligatoire");
    expect(errors.code).toBe("Le code de l'agence est obligatoire");
    expect(errors.parent_id).toBeUndefined();
  });

  it("accepts the parent from structureId when parent_id is empty", () => {
    expect(validateAgenceForm({ ...validForm, parent_id: "", structureId: "structure-1" })).toEqual({});
  });

  it("requires a parent entity for a distributor parent type", () => {
    const errors = validateAgenceForm({ ...validForm, parent_type: "DISTRIBUTOR", parent_id: "", structureId: "" });
    expect(errors).toEqual({ parent_id: "L'entité de rattachement est obligatoire" });
  });
});
