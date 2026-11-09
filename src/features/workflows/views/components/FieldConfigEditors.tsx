import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { jsonTextareaClassName } from "./FormSection";
import { ConfigProperty, PAYMENT_METHODS_URL } from "../../models/fieldConfigContract";

type JsonObject = Record<string, unknown>;

/** Objet JSON décrit par la saisie ; `null` si elle n'est pas un objet valide (vide = objet vide). */
const parseObject = (text: string): JsonObject | null => {
  const trimmed = text.trim();
  if (!trimmed) return {};
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as JsonObject) : null;
  } catch {
    return null;
  }
};

const serialize = (value: JsonObject): string => (Object.keys(value).length > 0 ? JSON.stringify(value, null, 2) : "");

const DEFAULT_OPTION = "__default__";
const labelClass = "text-xs font-semibold";
const inputClass = "h-9 text-xs bg-background";

/** Liste de valeurs saisies séparées par des virgules. */
const StringListInput: React.FC<{
  id: string;
  value: string[];
  placeholder?: string;
  onChange: (value: string[] | undefined) => void;
}> = ({ id, value, placeholder, onChange }) => {
  const [text, setText] = useState(value.join(", "));
  const parse = (raw: string) => raw.split(",").map((s) => s.trim()).filter(Boolean);

  // Resynchronise la saisie quand la valeur change depuis l'extérieur (changement de type, mode JSON)
  useEffect(() => {
    if (JSON.stringify(parse(text)) !== JSON.stringify(value)) setText(value.join(", "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      id={id}
      className={inputClass}
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const items = parse(e.target.value);
        onChange(items.length > 0 ? items : undefined);
      }}
    />
  );
};

const PropertyInput: React.FC<{
  idPrefix: string;
  property: ConfigProperty;
  value: unknown;
  onChange: (value: unknown) => void;
}> = ({ idPrefix, property, value, onChange }) => {
  const id = `${idPrefix}-${property.key}`;
  switch (property.kind) {
    case "boolean":
    case "enum": {
      const options =
        property.kind === "boolean"
          ? [
              { value: "true", label: "Oui" },
              { value: "false", label: "Non" },
            ]
          : (property.options ?? []).map((o) => ({ value: o, label: o }));
      return (
        <Select
          value={value === undefined ? DEFAULT_OPTION : String(value)}
          onValueChange={(v) => onChange(v === DEFAULT_OPTION ? undefined : property.kind === "boolean" ? v === "true" : (property.optionValues?.find((o) => String(o) === v) ?? v))}
        >
          <SelectTrigger id={id} className={inputClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_OPTION} className="text-xs">
              {property.default === undefined ? "Par défaut" : `Par défaut (${String(property.default)})`}
            </SelectItem>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    case "integer":
    case "number":
      return (
        <Input
          id={id}
          type="number"
          min={property.min}
          max={property.max}
          step={property.kind === "integer" ? 1 : "any"}
          className={inputClass}
          placeholder={property.default === undefined ? undefined : `Par défaut (${String(property.default)})`}
          value={typeof value === "number" ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      );
    case "object": {
      const current = value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
      const setChild = (key: string, next: unknown) => {
        const copy = { ...current };
        if (next === undefined) delete copy[key];
        else copy[key] = next;
        onChange(Object.keys(copy).length > 0 ? copy : undefined);
      };
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-border/40 p-3 sm:col-span-2">
          {(property.children ?? []).map((child) => (
            <div key={child.key} className="space-y-1.5">
              <Label htmlFor={`${id}-${child.key}`} className={labelClass} title={child.description}>
                {child.label}
              </Label>
              <PropertyInput idPrefix={id} property={child} value={current[child.key]} onChange={(next) => setChild(child.key, next)} />
            </div>
          ))}
        </div>
      );
    }
    case "string-list":
      return (
        <StringListInput
          id={id}
          value={Array.isArray(value) ? value.map(String) : []}
          placeholder={property.placeholder}
          onChange={onChange}
        />
      );
    default:
      return (
        <Input
          id={id}
          className={inputClass}
          placeholder={
            property.default === undefined ? property.placeholder : `Par défaut (${String(property.default)})`
          }
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
        />
      );
  }
};

interface JsonConfigFieldProps {
  id: string;
  /** Saisie JSON stockée par le formulaire. */
  value: string;
  onChange: (value: string) => void;
  /** Propriétés à proposer ; `null` quand le type n'est pas décrit (saisie JSON libre). */
  properties: ConfigProperty[] | null;
  error?: string;
  jsonPlaceholder?: string;
}

/** Saisie d'un objet de configuration par champs, avec repli sur le JSON brut. */
export const JsonConfigField: React.FC<JsonConfigFieldProps> = ({
  id,
  value,
  onChange,
  properties,
  error,
  jsonPlaceholder,
}) => {
  const [rawMode, setRawMode] = useState(false);
  const parsed = parseObject(value);
  const showRaw = rawMode || properties === null || parsed === null;

  if (showRaw) {
    return (
      <div className="space-y-2">
        <textarea
          id={id}
          rows={4}
          {...invalidFieldProps(error, jsonTextareaClassName)}
          placeholder={jsonPlaceholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <FieldError message={error} />
        {properties !== null && parsed !== null && (
          <Button type="button" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setRawMode(false)}>
            Revenir à la saisie guidée
          </Button>
        )}
      </div>
    );
  }

  const setKey = (key: string, next: unknown) => {
    const copy = { ...parsed };
    if (next === undefined) delete copy[key];
    else copy[key] = next;
    onChange(serialize(copy));
  };

  const known = new Set(properties.map((p) => p.key));
  const extraKeys = Object.keys(parsed).filter((k) => !known.has(k));

  return (
    <div className="space-y-3">
      {properties.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">Aucune propriété configurable pour ce type.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {properties.map((property) => (
            <div key={property.key} className={`space-y-1.5 ${property.kind === "object" ? "sm:col-span-2" : ""}`}>
              <Label htmlFor={`${id}-${property.key}`} className={labelClass} title={property.description}>
                {property.label}
              </Label>
              <PropertyInput
                idPrefix={id}
                property={property}
                value={parsed[property.key]}
                onChange={(next) => setKey(property.key, next)}
              />
            </div>
          ))}
        </div>
      )}
      {extraKeys.length > 0 && (
        <p className="text-[11px] text-amber-600">
          Propriétés hors contrat conservées telles quelles : {extraKeys.join(", ")}.
        </p>
      )}
      <FieldError message={error} />
      <Button type="button" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setRawMode(true)}>
        Modifier en JSON
      </Button>
    </div>
  );
};

type DataSourceMode = "none" | "static" | "api" | "payment";

const MODE_LABELS: Record<DataSourceMode, string> = {
  none: "Aucune",
  static: "Liste fixe",
  api: "Appel d'API",
  payment: "Moyens de paiement du workflow",
};

const MODES_BY_TYPE: Record<string, DataSourceMode[]> = {
  select: ["none", "static", "api", "payment"],
  radio_group: ["none", "static"],
  searchable_select: ["none", "api"],
  beneficiary_picker: ["none", "api"],
};

const detectMode = (value: JsonObject): DataSourceMode => {
  if (value.type === "static") return "static";
  if (value.type === "api") return String(value.url ?? "").startsWith(PAYMENT_METHODS_URL) ? "payment" : "api";
  return "none";
};

const templateFor = (mode: DataSourceMode, typeCode: string): JsonObject => {
  switch (mode) {
    case "static":
      return { type: "static", options: [{ value: "", label: "" }] };
    case "api":
      // Propriétés obligatoires du data_source_schema de chaque type
      if (typeCode === "beneficiary_picker") {
        return { type: "api", url: "", search_param: "", value_key: "", display_fields: [] };
      }
      return typeCode === "searchable_select"
        ? { type: "api", url: "", search_param: "", value_key: "", label_key: "" }
        : { type: "api", url: "", value_key: "", label_key: "" };
    case "payment":
      return { type: "api", url: `${PAYMENT_METHODS_URL}?direction=SOURCE`, value_key: "code", label_key: "label" };
    default:
      return {};
  }
};

const directionOf = (url: unknown): string => {
  const match = /[?&]direction=([A-Z]+)/.exec(String(url ?? ""));
  return match ? match[1] : "SOURCE";
};

interface DataSourceEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  typeCode: string | undefined;
  error?: string;
}

/** Saisie de la source de données d'un champ (listes fixes, API, moyens de paiement), selon le guide backend. */
export const DataSourceEditor: React.FC<DataSourceEditorProps> = ({ id, value, onChange, typeCode, error }) => {
  const [rawMode, setRawMode] = useState(false);
  const modes = MODES_BY_TYPE[typeCode?.toLowerCase() ?? ""];
  const parsed = parseObject(value);

  if (!modes || rawMode || parsed === null) {
    return (
      <div className="space-y-2">
        <textarea
          id={id}
          rows={4}
          {...invalidFieldProps(error, jsonTextareaClassName)}
          placeholder={'{\n  "type": "api",\n  "url": "/api/v1/..."\n}'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <FieldError message={error} />
        {modes && parsed !== null && (
          <Button type="button" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setRawMode(false)}>
            Revenir à la saisie guidée
          </Button>
        )}
      </div>
    );
  }

  const type = typeCode?.toLowerCase() ?? "";
  const mode = detectMode(parsed);
  const set = (patch: JsonObject) => {
    const next = { ...parsed, ...patch };
    for (const key of Object.keys(next)) if (next[key] === undefined || next[key] === "") delete next[key];
    onChange(serialize(next));
  };
  const text = (key: string, label: string, placeholder?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`${id}-${key}`} className={labelClass}>
        {label}
      </Label>
      <Input
        id={`${id}-${key}`}
        className={inputClass}
        placeholder={placeholder}
        value={typeof parsed[key] === "string" ? (parsed[key] as string) : ""}
        onChange={(e) => set({ [key]: e.target.value })}
      />
    </div>
  );

  const options = Array.isArray(parsed.options) ? (parsed.options as { value?: string; label?: string }[]) : [];
  const setOptions = (next: { value?: string; label?: string }[]) => onChange(serialize({ ...parsed, options: next }));

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-mode`} className={labelClass}>
          Origine des options
        </Label>
        <Select
          value={mode}
          onValueChange={(next) => onChange(serialize(templateFor(next as DataSourceMode, type)))}
        >
          <SelectTrigger id={`${id}-mode`} className={inputClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {modes.map((m) => (
              <SelectItem key={m} value={m} className="text-xs">
                {MODE_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {mode === "static" && (
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                aria-label="Valeur soumise"
                className={`${inputClass} font-mono`}
                placeholder="Valeur"
                value={option.value ?? ""}
                onChange={(e) => setOptions(options.map((o, i) => (i === index ? { ...o, value: e.target.value } : o)))}
              />
              <Input
                aria-label="Libellé affiché"
                className={inputClass}
                placeholder="Libellé"
                value={option.label ?? ""}
                onChange={(e) => setOptions(options.map((o, i) => (i === index ? { ...o, label: e.target.value } : o)))}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                aria-label="Supprimer l'option"
                onClick={() => setOptions(options.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => setOptions([...options, { value: "", label: "" }])}
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter une option
          </Button>
        </div>
      )}

      {mode === "api" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">{text("url", "URL", "/api/v1/referential/countries")}</div>
          {text("value_key", "Propriété soumise (value_key)", "code")}
          {type === "beneficiary_picker" ? (
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-display_fields`} className={labelClass}>
                Propriétés affichées (display_fields)
              </Label>
              <StringListInput
                id={`${id}-display_fields`}
                value={Array.isArray(parsed.display_fields) ? parsed.display_fields.map(String) : []}
                placeholder="full_name, account_number"
                onChange={(next) => set({ display_fields: next })}
              />
            </div>
          ) : (
            text("label_key", "Propriété affichée (label_key)", "label")
          )}
          {(type === "searchable_select" || type === "beneficiary_picker") &&
            text("search_param", "Paramètre de recherche (search_param)", "q")}
        </div>
      )}

      {mode === "payment" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-direction`} className={labelClass}>
              Sens du moyen de paiement
            </Label>
            <Select
              value={directionOf(parsed.url)}
              onValueChange={(direction) => set({ url: `${PAYMENT_METHODS_URL}?direction=${direction}` })}
            >
              <SelectTrigger id={`${id}-direction`} className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SOURCE" className="text-xs">
                  Source (SOURCE)
                </SelectItem>
                <SelectItem value="DESTINATION" className="text-xs">
                  Destination (DESTINATION)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-value_key`} className={labelClass}>
              Valeur soumise
            </Label>
            <Select value={String(parsed.value_key ?? "code")} onValueChange={(next) => set({ value_key: next })}>
              <SelectTrigger id={`${id}-value_key`} className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="code" className="text-xs">
                  Code métier (code)
                </SelectItem>
                <SelectItem value="id" className="text-xs">
                  Identifiant (id)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <FieldError message={error} />
      <Button type="button" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setRawMode(true)}>
        Modifier en JSON
      </Button>
    </div>
  );
};
