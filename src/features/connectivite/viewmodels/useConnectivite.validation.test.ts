import { describe, it, expect } from "vitest";
import { validateConnectionConfig, validateEndpointForm, validateOperationForm } from "./useConnectivite";
import { BankingOperationForm } from "../models/types";

describe("validateConnectionConfig", () => {
  it("accepte une configuration HTTP valide", () => {
    expect(validateConnectionConfig({ protocol: "HTTP", auth_type: "NONE" }, '{"Accept":"json"}', "")).toEqual({});
  });

  it("signale des en-têtes JSON invalides et une référence de secret manquante", () => {
    expect(validateConnectionConfig({ protocol: "HTTP", auth_type: "API_KEY", auth_secret_ref: "" }, "{oops", "{}")).toEqual({
      auth_secret_ref: "La référence du secret est obligatoire pour ce type d'authentification",
      headers: "Le format JSON des en-têtes HTTP est invalide",
    });
  });

  it("valide les options pilote en mode procédure (et ignore les en-têtes masqués)", () => {
    expect(validateConnectionConfig({ protocol: "DB_PROC", auth_type: "NONE" }, "{oops", "{bad")).toEqual({
      driver_options: "Le format JSON des options pilote est invalide",
    });
  });
});

describe("validateEndpointForm", () => {
  const base = { protocol: "HTTP" as const, path: "/api/x", procedure: "", field_mapping_string: "{}", response_field_mapping_string: "{}" };

  it("accepte un endpoint HTTP valide", () => {
    expect(validateEndpointForm(base)).toEqual({});
  });

  it("exige le chemin en HTTP et la procédure en mode procédure", () => {
    expect(validateEndpointForm({ ...base, path: "" })).toEqual({ path: "Le chemin de l'endpoint est obligatoire" });
    expect(validateEndpointForm({ ...base, protocol: "DB_PROC" })).toEqual({
      procedure: "Le nom de la procédure est obligatoire",
    });
  });

  it("signale les mappings JSON invalides en même temps que le champ obligatoire", () => {
    expect(
      validateEndpointForm({ ...base, path: "", field_mapping_string: "[1]", response_field_mapping_string: "{x" }),
    ).toEqual({
      path: "Le chemin de l'endpoint est obligatoire",
      field_mapping: "Le field mapping de requête doit être un objet JSON valide",
      response_field_mapping: "Le response field mapping doit être un objet JSON valide",
    });
  });
});

describe("validateOperationForm", () => {
  const form: BankingOperationForm = {
    code: "TRANSFER_STATUS",
    backend: "CORE_BANKING",
    label: "Statut",
    direction: "READ",
    is_idempotent: true,
    compensating_code: "",
    request_contract: "{}",
    is_active: true,
  };

  it("accepte une opération complète", () => {
    expect(validateOperationForm(form, true)).toEqual({});
  });

  it("signale tous les champs invalides à la fois", () => {
    const errors = validateOperationForm(
      {
        ...form,
        code: "",
        backend: "" as BankingOperationForm["backend"],
        label: "",
        direction: "" as BankingOperationForm["direction"],
        request_contract: "[]",
      },
      true,
    );
    expect(Object.keys(errors).sort()).toEqual(["backend", "code", "direction", "label", "request_contract"]);
  });

  it("n'exige pas le code en modification", () => {
    expect(validateOperationForm({ ...form, code: "" }, false)).toEqual({});
  });
});
