/**
 * Conversion entre un JSON Schema de configuration (validation_schema, ui_schema, data_source_schema)
 * et un modèle simple éditable par champs. Tout schéma que le modèle ne sait pas représenter renvoie `null` :
 * l'écran garde alors la saisie JSON, sans rien perdre.
 */

type Json = Record<string, unknown>;

export type BuilderKind = "string" | "integer" | "number" | "boolean" | "enum" | "string-list" | "object";

export interface BuilderProperty {
  id: string;
  key: string;
  kind: BuilderKind;
  title: string;
  description: string;
  /** Valeur par défaut saisie en texte (vide = aucune). */
  defaultValue: string;
  min: string;
  max: string;
  /** Valeurs d'un choix, séparées par des virgules. */
  enumValues: string;
  /** Type des valeurs d'un choix. */
  enumType: "string" | "integer";
  children: BuilderProperty[];
  /** Mots-clés non éditables conservés tels quels (examples, items, additionalProperties…). */
  extra: Json;
}

export interface SchemaModel {
  properties: BuilderProperty[];
  /** Refuse les propriétés inconnues (`additionalProperties: false`). */
  strict: boolean;
  /** Mots-clés du schéma racine conservés tels quels (title, description, examples…). */
  extra: Json;
}

export const BUILDER_KIND_LABELS: Record<BuilderKind, string> = {
  string: "Texte",
  integer: "Entier",
  number: "Nombre",
  boolean: "Oui / non",
  enum: "Choix dans une liste",
  "string-list": "Liste de textes",
  object: "Groupe de propriétés",
};

let counter = 0;
const newId = () => `sp_${Date.now()}_${counter++}`;

export const emptyProperty = (): BuilderProperty => ({
  id: newId(),
  key: "",
  kind: "string",
  title: "",
  description: "",
  defaultValue: "",
  min: "",
  max: "",
  enumValues: "",
  enumType: "string",
  children: [],
  extra: {},
});

const isObject = (value: unknown): value is Json => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const PROPERTY_KEYS = new Set(["type", "title", "description", "default", "minimum", "maximum", "enum", "properties"]);

const parseProperty = (key: string, def: unknown): BuilderProperty | null => {
  if (!isObject(def)) return null;
  const base = emptyProperty();
  base.key = key;
  base.title = typeof def.title === "string" ? def.title : "";
  base.description = typeof def.description === "string" ? def.description : "";
  base.defaultValue = def.default === undefined ? "" : String(def.default);
  base.min = typeof def.minimum === "number" ? String(def.minimum) : "";
  base.max = typeof def.maximum === "number" ? String(def.maximum) : "";
  const extra: Json = {};
  for (const [k, v] of Object.entries(def)) if (!PROPERTY_KEYS.has(k)) extra[k] = v;

  if (Array.isArray(def.enum)) {
    const allStrings = def.enum.every((v) => typeof v === "string");
    const allIntegers = def.enum.every((v) => Number.isInteger(v));
    if (!allStrings && !allIntegers) return null;
    return { ...base, kind: "enum", enumType: allStrings ? "string" : "integer", enumValues: def.enum.join(", "), extra };
  }
  switch (def.type) {
    case "string":
    case "integer":
    case "number":
    case "boolean":
      return { ...base, kind: def.type, extra };
    case "array":
      return { ...base, kind: "string-list", extra };
    case "object": {
      const children = isObject(def.properties) ? parseProperties(def.properties) : [];
      return children ? { ...base, kind: "object", children, extra } : null;
    }
    default:
      return null;
  }
};

const parseProperties = (properties: Json): BuilderProperty[] | null => {
  const rows: BuilderProperty[] = [];
  for (const [key, def] of Object.entries(properties)) {
    const row = parseProperty(key, def);
    if (!row) return null;
    rows.push(row);
  }
  return rows;
};

/** Modèle d'un schéma d'objet ; `null` si le schéma n'est pas représentable (saisie JSON conservée). */
export const parseSchemaModel = (text: string): SchemaModel | null => {
  const trimmed = text.trim();
  if (!trimmed) return { properties: [], strict: false, extra: {} };
  let schema: unknown;
  try {
    schema = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!isObject(schema) || (schema.type !== undefined && schema.type !== "object")) return null;
  const properties = isObject(schema.properties) ? parseProperties(schema.properties) : [];
  if (!properties) return null;
  const extra: Json = {};
  for (const [k, v] of Object.entries(schema)) {
    if (!["type", "properties", "additionalProperties"].includes(k)) extra[k] = v;
  }
  return { properties, strict: schema.additionalProperties === false, extra };
};

const typedValue = (raw: string, kind: BuilderKind, enumType: "string" | "integer"): unknown => {
  const value = raw.trim();
  if (!value) return undefined;
  if (kind === "boolean") return value === "true";
  if (kind === "integer" || kind === "number" || (kind === "enum" && enumType === "integer")) {
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
  }
  return value;
};

const serializeProperty = (row: BuilderProperty): Json => {
  const out: Json = {};
  if (row.title.trim()) out.title = row.title.trim();
  if (row.description.trim()) out.description = row.description.trim();
  switch (row.kind) {
    case "enum": {
      out.type = row.enumType === "integer" ? "integer" : "string";
      out.enum = row.enumValues
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => (row.enumType === "integer" ? Number(v) : v));
      break;
    }
    case "string-list":
      out.type = "array";
      out.items = { type: "string" };
      break;
    case "object":
      out.type = "object";
      out.properties = serializeProperties(row.children);
      out.additionalProperties = false;
      break;
    default:
      out.type = row.kind;
  }
  if (row.kind === "integer" || row.kind === "number") {
    const min = typedValue(row.min, row.kind, row.enumType);
    const max = typedValue(row.max, row.kind, row.enumType);
    if (min !== undefined) out.minimum = min;
    if (max !== undefined) out.maximum = max;
  }
  const def = row.kind === "object" || row.kind === "string-list" ? undefined : typedValue(row.defaultValue, row.kind, row.enumType);
  if (def !== undefined) out.default = def;
  return { ...out, ...row.extra };
};

const serializeProperties = (rows: BuilderProperty[]): Json =>
  Object.fromEntries(rows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), serializeProperty(r)]));

/** Schéma JSON (texte) du modèle ; vide quand le modèle n'exprime rien. */
export const serializeSchemaModel = (model: SchemaModel): string => {
  const properties = serializeProperties(model.properties);
  if (Object.keys(properties).length === 0 && !model.strict && Object.keys(model.extra).length === 0) return "";
  const schema: Json = { ...model.extra, type: "object" };
  if (Object.keys(properties).length > 0 || model.strict) schema.properties = properties;
  if (model.strict) schema.additionalProperties = false;
  // Le schéma racine répète les valeurs par défaut des propriétés
  const defaults = Object.fromEntries(
    Object.entries(properties).flatMap(([k, v]) => (isObject(v) && v.default !== undefined ? [[k, v.default]] : []))
  );
  if (Object.keys(defaults).length > 0) schema.default = defaults;
  else if ("default" in schema && Object.keys(properties).length > 0) delete schema.default;
  return JSON.stringify(schema, null, 2);
};

// ---------------------------------------------------------------------------------------------
// Source de données : formes autorisées par le type
// ---------------------------------------------------------------------------------------------

export interface DataSourceModel {
  allowStatic: boolean;
  allowApi: boolean;
  /** Paramètre de recherche : absent, ou obligatoire. */
  search: "none" | "required";
  /** Affichage des options d'une API : une propriété (label_key) ou plusieurs (display_fields). */
  display: "label_key" | "display_fields";
}

const staticBranch = (): Json => ({
  type: "object",
  required: ["type", "options"],
  properties: {
    type: { const: "static" },
    options: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["value", "label"],
        properties: { value: {}, label: { type: "string" } },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
});

const apiBranch = (model: DataSourceModel): Json => {
  const required = ["type", "url", ...(model.search === "required" ? ["search_param"] : []), "value_key", model.display];
  const properties: Json = {
    type: { const: "api" },
    url: { type: "string" },
    ...(model.search === "required" ? { search_param: { type: "string" } } : {}),
    value_key: { type: "string" },
    ...(model.display === "label_key"
      ? { label_key: { type: "string" } }
      : { display_fields: { type: "array", minItems: 1, items: { type: "string" } } }),
  };
  return { type: "object", required, properties, additionalProperties: false };
};

const constOf = (branch: unknown): unknown =>
  isObject(branch) && isObject(branch.properties) && isObject(branch.properties.type) ? branch.properties.type.const : undefined;

/** Modèle d'un schéma de source de données ; `null` si sa forme n'est pas l'une de celles que l'éditeur sait produire. */
export const parseDataSourceModel = (text: string): DataSourceModel | null => {
  const base: DataSourceModel = { allowStatic: false, allowApi: false, search: "none", display: "label_key" };
  const trimmed = text.trim();
  if (!trimmed) return base;
  let schema: unknown;
  try {
    schema = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!isObject(schema)) return null;
  const branches = Array.isArray(schema.oneOf) ? schema.oneOf : [schema];
  if (branches.length === 0 || branches.length > 2) return null;

  const model = { ...base };
  for (const branch of branches) {
    if (!isObject(branch) || !isObject(branch.properties)) return null;
    const kind = constOf(branch);
    const keys = Object.keys(branch.properties);
    const required = Array.isArray(branch.required) ? (branch.required as string[]) : [];
    if (kind === "static") {
      if (model.allowStatic || keys.some((k) => !["type", "options"].includes(k))) return null;
      model.allowStatic = true;
    } else if (kind === "api") {
      const allowed = ["type", "url", "value_key", "label_key", "search_param", "display_fields"];
      if (model.allowApi || keys.some((k) => !allowed.includes(k)) || !required.includes("url") || !required.includes("value_key")) {
        return null;
      }
      model.allowApi = true;
      model.search = keys.includes("search_param") ? "required" : "none";
      model.display = keys.includes("display_fields") ? "display_fields" : "label_key";
    } else {
      return null;
    }
  }
  return model;
};

const buildDataSource = (model: DataSourceModel): Json | null => {
  const branches = [...(model.allowStatic ? [staticBranch()] : []), ...(model.allowApi ? [apiBranch(model)] : [])];
  if (branches.length === 0) return null;
  return branches.length === 1 ? branches[0] : { oneOf: branches };
};

export const serializeDataSourceModel = (model: DataSourceModel): string => {
  const schema = buildDataSource(model);
  return schema ? JSON.stringify(schema, null, 2) : "";
};
