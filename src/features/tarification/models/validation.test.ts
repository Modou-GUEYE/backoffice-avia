import { describe, expect, it } from "vitest";
import { CapCreateForm, CommissionForm, FeeForm, PromoForm, TaxForm } from "./types";
import {
  computeCommissionTotalRate,
  validateCapForm,
  validateCapLimits,
  validateClientCapOverride,
  validateClientCapUsageLookup,
  validateCommissionForm,
  validateFeeForm,
  validatePromoForm,
  validateTaxForm,
} from "./validation";

const validCommission: CommissionForm = {
  tenantLevel: "PRODUCT",
  tenantId: "prod-1",
  serviceType: "VERSEMENT",
  phase: "UNIQUE",
  rateStructure: "40",
  rateTcaStructure: "10",
  rateDistributeur: "5",
  rateGroupement: "30",
  ratePartenaireTechnique: "20",
  overrideReason: "",
};

describe("validateCommissionForm", () => {
  it("accepte un formulaire complet dont les quatre taux font 100 %", () => {
    expect(validateCommissionForm(validCommission)).toEqual({});
    expect(computeCommissionTotalRate(validCommission)).toBe(100);
  });

  it("signale tous les champs invalides à la fois", () => {
    const errors = validateCommissionForm({
      ...validCommission,
      tenantId: "",
      serviceType: "",
      phase: "",
      rateStructure: "",
      rateDistributeur: "",
    });
    expect(errors.tenantId).toBe("Veuillez sélectionner l'entité cible pour ce niveau.");
    expect(errors.serviceType).toBe("Le type de service est obligatoire.");
    expect(errors.phase).toBe("La phase est obligatoire.");
    expect(errors.rateStructure).toBe("Le taux est obligatoire.");
    expect(errors.rateDistributeur).toBe("Le taux est obligatoire.");
    expect(errors.totalRate).toContain("actuellement: 60%");
  });

  it("n'exige pas d'entité cible au niveau GLOBAL", () => {
    expect(validateCommissionForm({ ...validCommission, tenantLevel: "GLOBAL", tenantId: "" }).tenantId).toBeUndefined();
  });

  it("signale une somme des taux différente de 100 %", () => {
    const errors = validateCommissionForm({ ...validCommission, rateStructure: "45" });
    expect(Object.keys(errors)).toEqual(["totalRate"]);
  });
});

const validFee: FeeForm = {
  tenantLevel: "STRUCTURE",
  tenantId: "str-1",
  serviceType: "VERSEMENT",
  minBound: "0",
  maxBound: "50000",
  fixedFee: "100",
  rateFee: "",
  overrideReason: "",
};

describe("validateFeeForm", () => {
  it("accepte un formulaire valide", () => {
    expect(validateFeeForm(validFee, true)).toEqual({});
  });

  it("signale borne max, service et entité manquants ensemble", () => {
    const errors = validateFeeForm({ ...validFee, maxBound: "", serviceType: "" as FeeForm["serviceType"] }, false);
    expect(errors.maxBound).toBe("La borne maximale est obligatoire.");
    expect(errors.serviceType).toBe("Le type de service est obligatoire.");
    expect(errors.tenantId).toContain("Veuillez sélectionner l'entité cible");
  });

  it("n'exige pas d'entité au niveau GLOBAL", () => {
    expect(validateFeeForm({ ...validFee, tenantLevel: "GLOBAL", tenantId: "" }, false)).toEqual({});
  });

  it("signale les valeurs négatives par champ", () => {
    const errors = validateFeeForm({ ...validFee, minBound: "-1", fixedFee: "-5", rateFee: "-2", maxBound: "0" }, true);
    expect(errors.minBound).toBe("La borne minimale doit être une valeur positive.");
    expect(errors.maxBound).toBe("La borne maximale doit être une valeur strictement positive.");
    expect(errors.fixedFee).toBe("Le frais fixe doit être une valeur positive.");
    expect(errors.rateFee).toBe("Le frais variable doit être une valeur positive.");
  });

  it("affiche la règle min < max sous la borne maximale", () => {
    const errors = validateFeeForm({ ...validFee, minBound: "1000", maxBound: "1000" }, true);
    expect(errors).toEqual({
      maxBound: "La borne maximale doit être strictement supérieure à la borne minimale.",
    });
  });
});

const validTax: TaxForm = {
  tenantLevel: "GLOBAL",
  tenantId: "",
  serviceType: "VERSEMENT",
  clientType: "PARTICULIER",
  taxType: "TVA",
  taxRate: "18",
  taxAmount: "",
  overrideReason: "",
};

describe("validateTaxForm", () => {
  it("accepte un formulaire valide", () => {
    expect(validateTaxForm(validTax)).toEqual({});
  });

  it("signale tous les champs invalides à la fois", () => {
    const errors = validateTaxForm({
      ...validTax,
      tenantLevel: "AGENCY",
      tenantId: "",
      taxType: " ",
      taxRate: "150",
      taxAmount: "-3",
    });
    expect(errors.tenantId).toBe("L'entité cible est obligatoire pour ce niveau.");
    expect(errors.taxType).toBe("Le type de taxe est obligatoire.");
    expect(errors.taxRate).toBe("Le taux de taxe ne peut pas dépasser 100%.");
    expect(errors.taxAmount).toBe("Le montant doit être une valeur positive ou nulle.");
  });
});

const validPromo: PromoForm = {
  code: "PROMO",
  serviceType: "VERSEMENT",
  tenantLevel: "GLOBAL",
  tenantId: "",
  feeGridId: "",
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  rateAmount: "",
  fixedAmount: "50",
  overrideReason: "",
};

describe("validatePromoForm", () => {
  it("accepte un formulaire valide", () => {
    expect(validatePromoForm(validPromo, false)).toEqual({});
  });

  it("signale code, dates et service manquants ensemble", () => {
    const errors = validatePromoForm(
      { ...validPromo, code: "", startDate: "", endDate: "", serviceType: "" as PromoForm["serviceType"] },
      false
    );
    expect(errors.code).toBe("Le code promotionnel est obligatoire.");
    expect(errors.startDate).toBe("La date de début est obligatoire.");
    expect(errors.endDate).toBe("La date de fin est obligatoire.");
    expect(errors.serviceType).toBe("Le type de service est obligatoire.");
  });

  it("ne contrôle pas service ni entité en modification", () => {
    const form = { ...validPromo, serviceType: "" as PromoForm["serviceType"], tenantLevel: "AGENCY" as const };
    expect(validatePromoForm(form, true)).toEqual({});
    expect(validatePromoForm(form, false).tenantId).toBe("L'entité cible est obligatoire pour ce niveau.");
  });

  it("affiche la règle des dates sous la date de fin", () => {
    expect(validatePromoForm({ ...validPromo, startDate: "2026-10-01" }, false)).toEqual({
      endDate: "La date de fin doit être postérieure ou égale à la date de début.",
    });
  });

  it("exige au moins une remise et refuse les remises négatives", () => {
    expect(validatePromoForm({ ...validPromo, fixedAmount: "0", rateAmount: "0" }, false).discount).toContain(
      "Veuillez renseigner au moins une remise fixe"
    );
    const errors = validatePromoForm({ ...validPromo, fixedAmount: "-1", rateAmount: "-2" }, false);
    expect(errors.fixedAmount).toBe("La remise fixe doit être un nombre positif ou nul.");
    expect(errors.rateAmount).toBe("Le taux de réduction doit être un nombre positif ou nul.");
    expect(errors.discount).toBeUndefined();
  });
});

const validCap: CapCreateForm = {
  service_type: "VERSEMENT",
  tenant_level: "STRUCTURE",
  tenant_id: "str-1",
  min_per_transaction: "100",
  max_per_transaction: "1000",
  daily_cumulative: "5000",
  monthly_cumulative: "",
};

describe("validateCapForm", () => {
  it("accepte un formulaire valide (vide = illimité)", () => {
    expect(validateCapForm(validCap)).toEqual({});
  });

  it("signale entité manquante et incohérences de plafonds ensemble", () => {
    const errors = validateCapForm({
      ...validCap,
      tenant_id: "",
      max_per_transaction: "50",
      daily_cumulative: "80",
      monthly_cumulative: "60",
    });
    expect(errors.tenant_id).toBe("L'entité cible est obligatoire pour ce niveau.");
    expect(errors.max_per_transaction).toBe("Le montant max doit être supérieur ou égal au montant min.");
    expect(errors.daily_cumulative).toContain("Le cumul journalier");
    expect(errors.monthly_cumulative).toContain("Le cumul mensuel");
  });

  it("n'exige pas d'entité au niveau GLOBAL", () => {
    expect(validateCapForm({ ...validCap, tenant_level: "GLOBAL", tenant_id: "" })).toEqual({});
  });

  it("validateCapLimits ignore les plafonds vides", () => {
    expect(
      validateCapLimits({ min_per_transaction: "", max_per_transaction: "", daily_cumulative: "", monthly_cumulative: "" })
    ).toEqual({});
  });
});

describe("validateClientCapOverride", () => {
  it("signale tous les champs manquants", () => {
    expect(validateClientCapOverride({ clientId: " ", structureId: "", newLimit: "", comment: "" })).toEqual({
      clientId: "L'identifiant du client est obligatoire.",
      structureId: "Veuillez sélectionner une structure concernée.",
      newLimit: "Le nouveau plafond est obligatoire.",
      comment: "Le motif de la dérogation est obligatoire.",
    });
  });

  it("refuse un plafond nul ou négatif", () => {
    expect(
      validateClientCapOverride({ clientId: "c1", structureId: "s1", newLimit: "0", comment: "ok" }).newLimit
    ).toBe("Veuillez renseigner une limite de plafond valide et positive (FCFA).");
  });

  it("accepte une saisie valide", () => {
    expect(validateClientCapOverride({ clientId: "c1", structureId: "s1", newLimit: "5000", comment: "ok" })).toEqual({});
  });
});

describe("validateClientCapUsageLookup", () => {
  it("signale client et structure manquants", () => {
    expect(validateClientCapUsageLookup({ clientId: "", structureId: "" })).toEqual({
      clientId: "Veuillez saisir l'identifiant du client.",
      structureId: "Veuillez sélectionner une structure.",
    });
    expect(validateClientCapUsageLookup({ clientId: "c1", structureId: "s1" })).toEqual({});
  });
});
