import { describe, expect, it } from "vitest";
import { validateAgainstSchema } from "./schemaValidation";
import { UI_CONTRACT, resolveConfigProperties } from "./fieldConfigContract";

const amountValidation = {
  type: "object",
  properties: {
    min: { type: "number" },
    decimal_places: { type: "integer", minimum: 0, maximum: 6 },
  },
  additionalProperties: false,
};

const selectDataSource = {
  oneOf: [
    {
      type: "object",
      required: ["type", "options"],
      properties: { type: { const: "static" }, options: { type: "array", minItems: 1 } },
      additionalProperties: false,
    },
    {
      type: "object",
      required: ["type", "url", "value_key", "label_key"],
      properties: {
        type: { const: "api" },
        url: { type: "string" },
        value_key: { type: "string" },
        label_key: { type: "string" },
      },
      additionalProperties: false,
    },
  ],
};

describe("validateAgainstSchema", () => {
  it("accepte une configuration conforme", () => {
    expect(validateAgainstSchema({ min: 1, decimal_places: 2 }, amountValidation)).toEqual([]);
  });

  it("refuse une propriété inconnue, un mauvais type et une borne dépassée", () => {
    expect(validateAgainstSchema({ foo: 1 }, amountValidation)).toEqual(["« foo » n'existe pas pour ce type"]);
    expect(validateAgainstSchema({ min: "1" }, amountValidation)).toEqual(["min doit être de type number"]);
    expect(validateAgainstSchema({ decimal_places: 7 }, amountValidation)).toEqual(["decimal_places doit être ≤ 6"]);
  });

  it("signale la propriété obligatoire manquante de la branche désignée par type", () => {
    expect(validateAgainstSchema({ type: "api", url: "/x", value_key: "id" }, selectDataSource)).toEqual([
      "« label_key » est obligatoire",
    ]);
    expect(validateAgainstSchema({ type: "static", options: [] }, selectDataSource)).toEqual([
      "options doit contenir au moins 1 élément(s)",
    ]);
  });

  it("accepte chaque forme de source de données valide", () => {
    expect(validateAgainstSchema({ type: "static", options: [{ value: "A", label: "A" }] }, selectDataSource)).toEqual([]);
    expect(validateAgainstSchema({ type: "api", url: "/x", value_key: "id", label_key: "l" }, selectDataSource)).toEqual([]);
  });

  it("ne valide rien sans schéma", () => {
    expect(validateAgainstSchema({ anything: true }, null)).toEqual([]);
  });
});

describe("resolveConfigProperties", () => {
  it("préfère le schéma de l'API et garde les libellés du guide", () => {
    const props = resolveConfigProperties(UI_CONTRACT, "amount", {
      properties: { currency: { type: "string", default: "XOF" }, extra: { type: "boolean", title: "Extra" } },
    });
    expect(props?.map((p) => [p.key, p.label, p.kind, p.default])).toEqual([
      ["currency", "Devise", "string", "XOF"],
      ["extra", "Extra", "boolean", undefined],
    ]);
  });

  it("un schéma sans propriété l'emporte sur le guide", () => {
    expect(resolveConfigProperties(UI_CONTRACT, "text", { properties: {} })).toEqual([]);
  });

  it("traite un tableau sans type d'éléments comme une liste de valeurs", () => {
    const props = resolveConfigProperties({}, "select", { properties: { allowed_values: { type: "array", items: {} } } });
    expect(props?.[0].kind).toBe("string-list");
  });

  it("retombe sur le guide sans schéma, et sur null pour un type inconnu", () => {
    expect(resolveConfigProperties(UI_CONTRACT, "toggle", null)?.length).toBe(2);
    expect(resolveConfigProperties(UI_CONTRACT, "bank_account", null)).toBeNull();
  });
});

describe("propriétés imbriquées", () => {
  const uiSchema = {
    properties: {
      columns: { type: "integer", enum: [1, 2], default: 1 },
      display: {
        type: "object",
        title: "Display",
        properties: { show_icon: { type: "boolean", default: true }, columns: { type: "integer", enum: [1, 2] } },
      },
    },
  };

  it("expose un objet imbriqué et conserve le type des valeurs d'une énumération", () => {
    const props = resolveConfigProperties({}, "select", uiSchema);
    expect(props?.[0].optionValues).toEqual([1, 2]);
    expect(props?.[1].kind).toBe("object");
    expect(props?.[1].children?.map((c) => c.key)).toEqual(["show_icon", "columns"]);
  });
});
