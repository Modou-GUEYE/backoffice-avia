type Schema = Record<string, unknown>;

const typeOf = (value: unknown): string =>
  value === null ? "null" : Array.isArray(value) ? "array" : Number.isInteger(value) ? "integer" : typeof value;

const matchesType = (value: unknown, type: string): boolean =>
  typeOf(value) === type || (type === "number" && typeof value === "number");

/**
 * Valide une valeur contre le sous-ensemble de JSON Schema utilisé par le catalogue des types
 * (type, enum, const, minimum / maximum, minItems, required, properties, additionalProperties,
 * items, oneOf). Renvoie les messages d'erreur, vide si la valeur est conforme.
 */
export const validateAgainstSchema = (value: unknown, schema: Schema | null | undefined, path = ""): string[] => {
  if (!schema) return [];
  const where = path || "la configuration";
  const errors: string[] = [];

  if (Array.isArray(schema.oneOf)) {
    const branches = schema.oneOf as Schema[];
    const results = branches.map((branch) => validateAgainstSchema(value, branch, path));
    if (results.some((r) => r.length === 0)) return [];
    // Branche désignée par le discriminant `type` quand il existe : ses erreurs sont les plus parlantes
    const discriminant = (value as Record<string, unknown> | null)?.type;
    const chosen = branches.findIndex((b) => (b.properties as Record<string, Schema> | undefined)?.type?.const === discriminant);
    return chosen >= 0 ? results[chosen] : [`${where} ne correspond à aucune forme autorisée`];
  }
  if ("const" in schema && value !== schema.const) return [`${where} doit valoir « ${String(schema.const)} »`];
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    return [`${where} doit être l'une des valeurs : ${schema.enum.join(", ")}`];
  }
  const types = schema.type === undefined ? [] : Array.isArray(schema.type) ? (schema.type as string[]) : [schema.type as string];
  if (types.length > 0 && !types.some((t) => matchesType(value, t))) return [`${where} doit être de type ${types.join(" ou ")}`];

  if (typeof value === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum) errors.push(`${where} doit être ≥ ${schema.minimum}`);
    if (typeof schema.maximum === "number" && value > schema.maximum) errors.push(`${where} doit être ≤ ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      errors.push(`${where} doit contenir au moins ${schema.minItems} élément(s)`);
    }
    if (schema.items && typeof schema.items === "object") {
      value.forEach((item, i) => errors.push(...validateAgainstSchema(item, schema.items as Schema, `${path}[${i}]`)));
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    const properties = (schema.properties ?? {}) as Record<string, Schema>;
    for (const key of (schema.required as string[] | undefined) ?? []) {
      if (object[key] === undefined) errors.push(`« ${path ? `${path}.` : ""}${key} » est obligatoire`);
    }
    for (const [key, item] of Object.entries(object)) {
      const child = path ? `${path}.${key}` : key;
      if (properties[key]) errors.push(...validateAgainstSchema(item, properties[key], child));
      else if (schema.additionalProperties === false) errors.push(`« ${child} » n'existe pas pour ce type`);
    }
  }
  return errors;
};
