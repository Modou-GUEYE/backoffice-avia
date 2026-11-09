import { describe, expect, it } from "vitest";
import { buildPaymentMethodFormData } from "./paymentMethodsService";
import type { UpsertPaymentMethodPayload } from "../models/types";

describe("buildPaymentMethodFormData", () => {
  it("serializes arrays to json strings and ignores empty values", () => {
    const payload: UpsertPaymentMethodPayload = {
      code: "CARD",
      label: "Carte Bancaire",
      backend: "CARD_PROCESSOR",
      kind: "CARD",
      description: "",
      is_active: true,
      currencies: ["EUR", "XOF"],
      supported_operations: ["PAY", "REFUND"],
      logo_media_id: null,
    };

    const logo = new File(["dummy"], "logo.png", { type: "image/png" });
    const formData = buildPaymentMethodFormData(payload, logo);

    expect(formData.get("code")).toBe("CARD");
    expect(formData.get("label")).toBe("Carte Bancaire");
    expect(formData.get("backend")).toBe("CARD_PROCESSOR");
    expect(formData.get("kind")).toBe("CARD");
    expect(formData.get("is_active")).toBe("true");
    expect(formData.get("currencies")).toBe(JSON.stringify(["EUR", "XOF"]));
    expect(formData.get("supported_operations")).toBe(JSON.stringify(["PAY", "REFUND"]));
    expect(formData.get("description")).toBeNull();
    expect(formData.get("logo_media_id")).toBeNull();
    expect(formData.get("logo")).toBe(logo);
  });
});
