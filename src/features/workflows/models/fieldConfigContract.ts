/**
 * Contrat de configuration des champs de formulaire, tel que défini dans le « Guide frontend de
 * configuration des champs de formulaire » de l'équipe backend (§3, §4 et §5 à §9).
 *
 * Les schémas renvoyés par l'API (`validation_schema`, `ui_schema`) restent la source de vérité :
 * ce tableau ne sert que tant que le catalogue ne décrit pas les propriétés d'un type.
 */

export type ConfigPropertyKind = "string" | "integer" | "number" | "boolean" | "enum" | "string-list" | "object";

export interface ConfigProperty {
  key: string;
  kind: ConfigPropertyKind;
  label: string;
  /** Valeurs permises (kind « enum »). */
  options?: string[];
  /** Valeurs d'origine des options quand elles ne sont pas des chaînes (ex. 1, 2). */
  optionValues?: unknown[];
  /** Sous-propriétés (kind « object »). */
  children?: ConfigProperty[];
  min?: number;
  max?: number;
  placeholder?: string;
  /** Valeur appliquée par le backend quand la propriété est absente. */
  default?: unknown;
  /** Explication fournie par le schéma de l'API (info-bulle). */
  description?: string;
}

const str = (key: string, label: string, placeholder?: string): ConfigProperty => ({ key, kind: "string", label, placeholder });
const int = (key: string, label: string, min?: number, max?: number): ConfigProperty => ({ key, kind: "integer", label, min, max });
const num = (key: string, label: string, min?: number, max?: number): ConfigProperty => ({ key, kind: "number", label, min, max });
const bool = (key: string, label: string): ConfigProperty => ({ key, kind: "boolean", label });
const list = (key: string, label: string, placeholder?: string): ConfigProperty => ({ key, kind: "string-list", label, placeholder });
const oneOf = (key: string, label: string, options: string[]): ConfigProperty => ({ key, kind: "enum", label, options });

const minLength = int("min_length", "Longueur minimale", 0);
const maxLength = int("max_length", "Longueur maximale", 0);
const pattern = str("pattern", "Expression régulière", "^[0-9]+$");
const allowedValues = list("allowed_values", "Valeurs autorisées", "VALEUR_1, VALEUR_2");

/** Propriétés acceptées par `validation_rules`, par code de type (§3). */
export const VALIDATION_CONTRACT: Record<string, ConfigProperty[]> = {
  text: [minLength, maxLength, pattern, allowedValues],
  phone: [minLength, maxLength, pattern, list("allowed_countries", "Pays autorisés", "SN, CI")],
  password: [
    minLength,
    maxLength,
    bool("require_uppercase", "Majuscule obligatoire"),
    bool("require_lowercase", "Minuscule obligatoire"),
    bool("require_digit", "Chiffre obligatoire"),
    bool("require_symbol", "Symbole obligatoire"),
  ],
  date: [
    str("min_date", "Date minimale", "2026-01-01"),
    str("max_date", "Date maximale", "2026-12-31"),
    bool("disable_past", "Interdire les dates passées"),
    bool("disable_future", "Interdire les dates futures"),
  ],
  amount: [num("min", "Montant minimal"), num("max", "Montant maximal"), int("decimal_places", "Décimales", 0, 6)],
  textarea: [minLength, maxLength, pattern],
  account_number: [minLength, maxLength, pattern, bool("checksum_enabled", "Contrôle de clé")],
  otp_pin: [int("length", "Longueur", 4, 12), pattern],
  select: [allowedValues],
  searchable_select: [],
  beneficiary_picker: [list("allowed_account_types", "Types de compte autorisés", "BANK_ACCOUNT, WALLET")],
  checkbox_consent: [bool("must_be_true", "Doit être cochée")],
  toggle: [],
  file_upload: [
    list("allowed_mime_types", "Types MIME autorisés", "image/png, application/pdf"),
    num("max_size_mb", "Taille maximale (Mo)", 0),
    int("max_files", "Nombre maximal de fichiers", 1),
  ],
  signature: [int("min_strokes", "Nombre minimal de traits", 0)],
  readonly_display: [],
  radio_group: [allowedValues],
};

/** Propriétés acceptées par `ui_config`, par code de type (§4). */
export const UI_CONTRACT: Record<string, ConfigProperty[]> = {
  text: [oneOf("transform", "Transformation", ["none", "uppercase", "lowercase", "capitalize"]), str("autocomplete", "Autocomplétion")],
  phone: [str("country_code", "Indicatif pays", "SN"), oneOf("format", "Format", ["national", "international"])],
  password: [bool("show_strength", "Afficher la robustesse"), bool("allow_visibility_toggle", "Afficher / masquer la saisie")],
  date: [str("format", "Format", "DD/MM/YYYY")],
  amount: [str("currency", "Devise", "XOF"), bool("thousand_separator", "Séparateur de milliers")],
  textarea: [int("rows", "Nombre de lignes", 1), bool("auto_resize", "Hauteur automatique")],
  account_number: [str("mask", "Masque"), int("group_size", "Taille des groupes", 1), str("bank_code", "Code banque")],
  otp_pin: [bool("masked", "Saisie masquée"), int("expires_in_seconds", "Expiration (secondes)", 1), bool("auto_submit", "Envoi automatique")],
  select: [bool("allow_empty", "Autoriser la valeur vide"), bool("multiple", "Sélection multiple")],
  searchable_select: [int("min_search_chars", "Caractères minimum", 0), int("debounce_ms", "Délai de saisie (ms)", 0), bool("multiple", "Sélection multiple")],
  beneficiary_picker: [bool("allow_create", "Autoriser la création"), int("min_search_chars", "Caractères minimum", 0)],
  checkbox_consent: [str("consent_text", "Texte du consentement"), str("version", "Version"), str("link_url", "Lien du document")],
  toggle: [str("true_label", "Libellé « activé »"), str("false_label", "Libellé « désactivé »")],
  file_upload: [oneOf("capture", "Capture", ["none", "camera", "gallery", "document"]), bool("show_preview", "Afficher l'aperçu")],
  signature: [oneOf("mode", "Mode", ["draw", "upload"]), int("canvas_width", "Largeur du cadre", 1), int("canvas_height", "Hauteur du cadre", 1)],
  readonly_display: [oneOf("format", "Format", ["text", "number", "currency", "date"]), str("currency", "Devise", "XOF"), bool("copyable", "Valeur copiable")],
  radio_group: [oneOf("layout", "Disposition", ["horizontal", "vertical"]), bool("allow_empty", "Autoriser la valeur vide")],
};

/** Libellés français des propriétés d'affichage ajoutées par le backend (sélecteurs), absentes du guide. */
const DISPLAY_LABELS: Record<string, string> = {
  schema_version: "Version du contrat d'affichage",
  variant: "Variante du sélecteur",
  fallback_variant: "Variante de repli",
  presentation: "Présentation",
  commit: "Validation du choix",
  search: "Recherche locale",
  enabled: "Activée",
  placeholder: "Texte d'invite",
  display: "Détails des options",
  show_description: "Afficher la description",
  show_icon: "Afficher l'icône",
  show_meta: "Afficher les métadonnées",
  group_by: "Regrouper par",
  columns: "Colonnes",
  empty_state: "Aucune option disponible",
  title: "Titre",
  message: "Message",
  payment_destination: "Destination de paiement",
  list: "Choix proposés",
  allow_beneficiary: "Autoriser un bénéficiaire",
  allow_manual_entry: "Autoriser la saisie manuelle",
  min_selections: "Sélections minimum",
  max_selections: "Sélections maximum",
};

/** Types dont la source de données est décrite par le guide (§5 à §9). */
export const DATA_SOURCE_TYPES = ["select", "radio_group", "searchable_select", "beneficiary_picker"];

export const PAYMENT_METHODS_URL = "/api/v1/packages-services/workflow-instances/{instance_id}/payment-methods";

type SchemaProperty = {
  properties?: Record<string, SchemaProperty>;
  type?: string | string[];
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  items?: { type?: string };
  title?: string;
  description?: string;
  default?: unknown;
};

const propertiesFromSchema = (
  properties: Record<string, SchemaProperty>,
  contract: ConfigProperty[] | undefined
): ConfigProperty[] =>
  Object.entries(properties).flatMap(([key, def]): ConfigProperty[] => {
    // Libellé français du guide quand la propriété y figure, sinon titre du schéma
    const label = contract?.find((p) => p.key === key)?.label ?? DISPLAY_LABELS[key] ?? def.title ?? key;
    const base = { key, label, default: def.default, description: def.description };
    const type = Array.isArray(def.type) ? def.type.find((t) => t !== "null") : def.type;
    if (Array.isArray(def.enum)) {
      return [{ ...base, kind: "enum", options: def.enum.map(String), optionValues: def.enum }];
    }
    if (type === "boolean") return [{ ...base, kind: "boolean" }];
    if (type === "integer" || type === "number") return [{ ...base, kind: type, min: def.minimum, max: def.maximum }];
    if (type === "string") return [{ ...base, kind: "string" }];
    if (type === "array") return [{ ...base, kind: "string-list" }];
    if (type === "object" && def.properties) {
      return [{ ...base, kind: "object", children: propertiesFromSchema(def.properties, undefined) }];
    }
    return [];
  });

/** Propriétés décrites par un schéma de l'API ; `null` si le schéma ne décrit pas de `properties`. */
const fromSchema = (
  schema: Record<string, unknown> | null | undefined,
  contract: ConfigProperty[] | undefined
): ConfigProperty[] | null => {
  const properties = schema?.properties;
  if (!properties || typeof properties !== "object") return null;
  return propertiesFromSchema(properties as Record<string, SchemaProperty>, contract);
};

/**
 * Propriétés à proposer pour un type : celles du schéma de l'API dès qu'il décrit `properties`
 * (même vide), sinon celles du guide. `null` quand le type est inconnu (saisie JSON libre).
 */
export const resolveConfigProperties = (
  contract: Record<string, ConfigProperty[]>,
  typeCode: string | undefined,
  schema: Record<string, unknown> | null | undefined
): ConfigProperty[] | null => {
  const known = typeCode ? contract[typeCode.toLowerCase()] : undefined;
  return fromSchema(schema, known) ?? known ?? null;
};
