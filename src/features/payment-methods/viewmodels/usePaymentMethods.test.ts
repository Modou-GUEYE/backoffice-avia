import { describe, expect, it } from "vitest";
import { validatePaymentMethodForm } from "./usePaymentMethods";
import { PaymentMethodFormState } from "../models/types";

const baseForm: PaymentMethodFormState = {
  code: "CARD_VISA",
  label: "Carte Visa",
  description: "",
  backend: "CORE_BANKING",
  kind: "BANK_ACCOUNT",
  is_active: true,
  currencies: "",
  loop_type: "",
  min_kyc_tier: 0,
  settlement_account_ref: "",
  supported_operations: "",
  logo_media_id: "",
  logo_file: null,
  logo_preview_url: "",
};

describe("validatePaymentMethodForm", () => {
  it("ne renvoie aucune erreur pour un formulaire complet", () => {
    expect(validatePaymentMethodForm(baseForm)).toEqual({});
  });

  it("renvoie toutes les erreurs des champs obligatoires manquants", () => {
    expect(
      validatePaymentMethodForm({
        ...baseForm,
        code: " ",
        label: "",
        backend: "" as PaymentMethodFormState["backend"],
        kind: "" as PaymentMethodFormState["kind"],
      }),
    ).toEqual({
      code: "Le code est obligatoire",
      label: "Le libellé est obligatoire",
      backend: "Le backend technique est obligatoire",
      kind: "Le type de moyen de paiement (Kind) est obligatoire",
    });
  });
});
