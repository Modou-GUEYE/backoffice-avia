import { describe, expect, it } from "vitest";
import {
  validatePackageForm,
  validateServiceForm,
  validateServicePaymentFlowForm,
  validateServiceVersionForm,
} from "./packageValidation";
import { PackageForm, ServiceForm } from "../models/types";

const emptyPackage: PackageForm = {
  code: "",
  label: "",
  description: "",
  client_types: [],
  services: [],
  payment_methods: [],
};

const emptyService: ServiceForm = {
  code: "",
  label: "",
  description: "",
  category_id: null,
  rawContractYaml: "",
  contractFile: null,
};

describe("validatePackageForm", () => {
  it("renvoie toutes les erreurs quand le formulaire est vide", () => {
    expect(validatePackageForm(emptyPackage)).toEqual({
      label: "Le libellé du package est obligatoire",
      code: "Le code du package est obligatoire",
      client_types: "Sélectionnez au moins un type de client",
      services: "Sélectionnez au moins un service",
      payment_methods: "Sélectionnez au moins un moyen de paiement",
    });
  });

  it("considère les champs blancs et les types de client absents comme manquants", () => {
    const errors = validatePackageForm({ ...emptyPackage, label: "  ", code: " ", client_types: undefined });
    expect(errors.label).toBeDefined();
    expect(errors.code).toBeDefined();
    expect(errors.client_types).toBeDefined();
  });

  it("ne renvoie aucune erreur pour un formulaire complet", () => {
    expect(
      validatePackageForm({
        code: "PKG-1",
        label: "Pack",
        description: "",
        client_types: ["PARTICULIER"],
        services: ["s1"],
        payment_methods: ["pm1"],
      }),
    ).toEqual({});
  });
});

describe("validateServiceForm", () => {
  it("exige une définition ou un fichier en création", () => {
    expect(validateServiceForm(emptyService, false)).toEqual({
      contract: "Veuillez renseigner la définition YAML/JSON ou sélectionner un fichier de contrat",
    });
  });

  it("accepte une définition YAML ou un fichier", () => {
    expect(validateServiceForm({ ...emptyService, rawContractYaml: "code: X" }, false)).toEqual({});
    const file = new File(["x"], "c.yaml");
    expect(validateServiceForm({ ...emptyService, contractFile: file }, true)).toEqual({});
  });

  it("conserve la règle existante : code et libellé suffisent en création", () => {
    expect(validateServiceForm({ ...emptyService, code: "C", label: "L" }, false)).toEqual({});
  });

  it("exige un nouveau fichier ou une nouvelle définition en modification", () => {
    expect(validateServiceForm({ ...emptyService, code: "C", label: "L", rawContractYaml: "  " }, true)).toEqual({
      contract: "Veuillez sélectionner un fichier ou renseigner la nouvelle définition",
    });
  });
});

describe("validateServiceVersionForm", () => {
  it("exige le numéro de version", () => {
    expect(validateServiceVersionForm({ version: "  " })).toEqual({
      version: "Le numéro de version est requis",
    });
    expect(validateServiceVersionForm({ version: "v1.0.0" })).toEqual({});
  });
});

describe("validateServicePaymentFlowForm", () => {
  it("exige au moins une source et une destination", () => {
    expect(validateServicePaymentFlowForm([], [])).toEqual({
      source: "Veuillez sélectionner au moins un moyen de paiement source (débit).",
      destination: "Veuillez sélectionner au moins un moyen de paiement destinataire (crédit).",
    });
    expect(validateServicePaymentFlowForm(["a"], [])).toEqual({
      destination: "Veuillez sélectionner au moins un moyen de paiement destinataire (crédit).",
    });
    expect(validateServicePaymentFlowForm(["a"], ["b"])).toEqual({});
  });
});
