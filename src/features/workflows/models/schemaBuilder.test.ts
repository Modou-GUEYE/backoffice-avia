import { describe, expect, it } from "vitest";
import {
  parseDataSourceModel,
  parseSchemaModel,
  serializeDataSourceModel,
  serializeSchemaModel,
} from "./schemaBuilder";

const textUiSchema = {
  title: "Text UI configuration",
  description: "Renderer options accepted by the Text field type.",
  type: "object",
  properties: {
    transform: {
      title: "Transform",
      description: "Text transformation applied by the renderer.",
      type: "string",
      enum: ["none", "uppercase", "lowercase", "capitalize"],
      examples: ["uppercase"],
      default: "none",
    },
    autocomplete: { title: "Autocomplete", type: "string", examples: ["name"] },
  },
  additionalProperties: false,
  examples: [{}],
  default: { transform: "none" },
};

const selectUiSchema = {
  type: "object",
  properties: {
    multiple: { type: "boolean", default: false },
    display: {
      type: "object",
      additionalProperties: false,
      properties: { columns: { type: "integer", enum: [1, 2], default: 1 }, show_icon: { type: "boolean", default: true } },
    },
  },
  additionalProperties: false,
  default: { multiple: false },
};

const roundTrip = (schema: unknown) => {
  const model = parseSchemaModel(JSON.stringify(schema));
  expect(model).not.toBeNull();
  return JSON.parse(serializeSchemaModel(model!));
};

describe("parseSchemaModel / serializeSchemaModel", () => {
  it("relit puis réécrit un schéma réel sans rien perdre", () => {
    expect(roundTrip(textUiSchema)).toEqual(textUiSchema);
  });

  it("gère un groupe imbriqué et un choix d'entiers", () => {
    const model = parseSchemaModel(JSON.stringify(selectUiSchema))!;
    const display = model.properties[1];
    expect(display.kind).toBe("object");
    expect(display.children[0]).toMatchObject({ key: "columns", kind: "enum", enumType: "integer", enumValues: "1, 2" });
    expect(JSON.parse(serializeSchemaModel(model)).properties.display.properties.columns.enum).toEqual([1, 2]);
  });

  it("construit un schéma depuis des propriétés saisies, et recalcule le défaut racine", () => {
    const model = parseSchemaModel("")!;
    model.strict = true;
    model.properties = [
      { ...parseSchemaModel('{"properties":{"x":{"type":"integer"}}}')!.properties[0], key: "decimal_places", min: "0", max: "6", defaultValue: "2" },
    ];
    expect(JSON.parse(serializeSchemaModel(model))).toEqual({
      type: "object",
      properties: { decimal_places: { type: "integer", minimum: 0, maximum: 6, default: 2 } },
      additionalProperties: false,
      default: { decimal_places: 2 },
    });
  });

  it("ignore les propriétés sans clé et renvoie un texte vide pour un modèle vide", () => {
    const model = parseSchemaModel("")!;
    expect(serializeSchemaModel(model)).toBe("");
  });

  it("renvoie null pour un schéma qu'il ne sait pas représenter", () => {
    expect(parseSchemaModel('{"type":"object","properties":{"a":{"oneOf":[{"type":"string"}]}}}')).toBeNull();
    expect(parseSchemaModel("{pas du json")).toBeNull();
    expect(parseSchemaModel('{"type":"array"}')).toBeNull();
  });
});

describe("source de données", () => {
  it("reconnaît un type qui accepte une liste fixe ou une API", () => {
    const schema = {
      oneOf: [
        { type: "object", required: ["type", "options"], properties: { type: { const: "static" }, options: { type: "array" } } },
        {
          type: "object",
          required: ["type", "url", "value_key", "label_key"],
          properties: { type: { const: "api" }, url: {}, value_key: {}, label_key: {} },
          additionalProperties: false,
        },
      ],
    };
    expect(parseDataSourceModel(JSON.stringify(schema))).toEqual({
      allowStatic: true,
      allowApi: true,
      search: "none",
      display: "label_key",
    });
  });

  it("reconnaît le sélecteur de bénéficiaire (recherche et display_fields)", () => {
    const schema = {
      type: "object",
      required: ["type", "url", "search_param", "value_key", "display_fields"],
      properties: { type: { const: "api" }, url: {}, search_param: {}, value_key: {}, display_fields: {} },
    };
    expect(parseDataSourceModel(JSON.stringify(schema))).toMatchObject({
      allowStatic: false,
      allowApi: true,
      search: "required",
      display: "display_fields",
    });
  });

  it("régénère des schémas qui exigent les bonnes propriétés", () => {
    const text = serializeDataSourceModel({ allowStatic: false, allowApi: true, search: "required", display: "display_fields" });
    expect(JSON.parse(text).required).toEqual(["type", "url", "search_param", "value_key", "display_fields"]);
    expect(serializeDataSourceModel({ allowStatic: false, allowApi: false, search: "none", display: "label_key" })).toBe("");
  });

  it("renvoie null pour une forme inconnue", () => {
    expect(parseDataSourceModel('{"type":"object","properties":{"type":{"const":"graphql"}}}')).toBeNull();
  });
});
