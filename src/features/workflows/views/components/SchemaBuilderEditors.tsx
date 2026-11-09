import React, { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { jsonTextareaClassName } from "./FormSection";
import {
  BUILDER_KIND_LABELS,
  BuilderKind,
  BuilderProperty,
  DataSourceModel,
  SchemaModel,
  emptyProperty,
  parseDataSourceModel,
  parseSchemaModel,
  serializeDataSourceModel,
  serializeSchemaModel,
} from "../../models/schemaBuilder";

const inputClass = "h-9 text-xs bg-background";
const selectClass =
  "h-9 text-xs rounded-lg border border-border/50 bg-background px-2 focus:outline-none focus:ring-1 focus:ring-accent";
const labelClass = "text-xs font-semibold";

/**
 * Garde un modèle local (les lignes en cours de saisie, encore sans clé, n'existent pas dans le JSON)
 * et le resynchronise quand le texte change depuis l'extérieur.
 */
function useModelState<M>(value: string, parse: (text: string) => M | null, serialize: (model: M) => string) {
  const [model, setModel] = useState<M | null>(() => parse(value));
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setModel(parse(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const update = (next: M, emit: (text: string) => void) => {
    setModel(next);
    const text = serialize(next);
    lastEmitted.current = text;
    emit(text);
  };
  return { model, update };
}

interface EditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const RawJson: React.FC<EditorProps & { placeholder?: string; onGuided?: () => void }> = ({
  id,
  value,
  onChange,
  error,
  placeholder,
  onGuided,
}) => (
  <div className="space-y-2">
    <textarea
      id={id}
      rows={6}
      {...invalidFieldProps(error, jsonTextareaClassName)}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    <FieldError message={error} />
    {onGuided && (
      <Button type="button" variant="ghost" className="h-7 px-2 text-[11px]" onClick={onGuided}>
        Revenir à la saisie guidée
      </Button>
    )}
  </div>
);

const PropertyRow: React.FC<{
  property: BuilderProperty;
  onChange: (next: BuilderProperty) => void;
  onRemove: () => void;
  depth: number;
}> = ({ property, onChange, onRemove, depth }) => {
  const set = (patch: Partial<BuilderProperty>) => onChange({ ...property, ...patch });
  const hasBounds = property.kind === "integer" || property.kind === "number";
  const hasDefault = property.kind !== "object" && property.kind !== "string-list";

  return (
    <div className={`rounded-lg border border-border/40 bg-background/60 p-3 space-y-2 ${depth > 0 ? "ml-4" : ""}`}>
      <div className="flex items-center gap-2">
        <Input
          aria-label="Nom de la propriété"
          className={`${inputClass} font-mono flex-1`}
          placeholder="nom_de_la_propriete"
          value={property.key}
          onChange={(e) => set({ key: e.target.value })}
        />
        <select
          aria-label="Type de la propriété"
          className={selectClass}
          value={property.kind}
          onChange={(e) => set({ kind: e.target.value as BuilderKind })}
        >
          {(Object.keys(BUILDER_KIND_LABELS) as BuilderKind[]).map((kind) => (
            <option key={kind} value={kind}>
              {BUILDER_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label="Supprimer la propriété"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          aria-label="Titre"
          className={inputClass}
          placeholder="Titre affiché"
          value={property.title}
          onChange={(e) => set({ title: e.target.value })}
        />
        <Input
          aria-label="Description"
          className={inputClass}
          placeholder="Description"
          value={property.description}
          onChange={(e) => set({ description: e.target.value })}
        />
        {hasBounds && (
          <>
            <Input
              aria-label="Valeur minimale"
              type="number"
              className={inputClass}
              placeholder="Minimum"
              value={property.min}
              onChange={(e) => set({ min: e.target.value })}
            />
            <Input
              aria-label="Valeur maximale"
              type="number"
              className={inputClass}
              placeholder="Maximum"
              value={property.max}
              onChange={(e) => set({ max: e.target.value })}
            />
          </>
        )}
        {property.kind === "enum" && (
          <>
            <Input
              aria-label="Valeurs du choix"
              className={`${inputClass} font-mono`}
              placeholder="valeur_1, valeur_2"
              value={property.enumValues}
              onChange={(e) => set({ enumValues: e.target.value })}
            />
            <select
              aria-label="Type des valeurs"
              className={selectClass}
              value={property.enumType}
              onChange={(e) => set({ enumType: e.target.value as "string" | "integer" })}
            >
              <option value="string">Valeurs texte</option>
              <option value="integer">Valeurs entières</option>
            </select>
          </>
        )}
        {hasDefault &&
          (property.kind === "boolean" ? (
            <select
              aria-label="Valeur par défaut"
              className={selectClass}
              value={property.defaultValue}
              onChange={(e) => set({ defaultValue: e.target.value })}
            >
              <option value="">Aucune valeur par défaut</option>
              <option value="true">Par défaut : oui</option>
              <option value="false">Par défaut : non</option>
            </select>
          ) : (
            <Input
              aria-label="Valeur par défaut"
              className={inputClass}
              placeholder="Valeur par défaut"
              value={property.defaultValue}
              onChange={(e) => set({ defaultValue: e.target.value })}
            />
          ))}
      </div>

      {property.kind === "object" && (
        <PropertyList
          rows={property.children}
          onChange={(children) => set({ children })}
          depth={depth + 1}
          addLabel="Ajouter une sous-propriété"
        />
      )}
    </div>
  );
};

const PropertyList: React.FC<{
  rows: BuilderProperty[];
  onChange: (rows: BuilderProperty[]) => void;
  depth: number;
  addLabel: string;
}> = ({ rows, onChange, depth, addLabel }) => (
  <div className="space-y-2">
    {rows.map((row) => (
      <PropertyRow
        key={row.id}
        property={row}
        depth={depth}
        onChange={(next) => onChange(rows.map((r) => (r.id === row.id ? next : r)))}
        onRemove={() => onChange(rows.filter((r) => r.id !== row.id))}
      />
    ))}
    <Button
      type="button"
      variant="outline"
      className={`h-8 text-xs gap-1.5 ${depth > 0 ? "ml-4" : ""}`}
      onClick={() => onChange([...rows, emptyProperty()])}
    >
      <Plus className="h-3.5 w-3.5" /> {addLabel}
    </Button>
  </div>
);

/** Édition par champs d'un schéma de configuration (propriétés acceptées, bornes, choix, valeurs par défaut). */
export const SchemaPropertiesEditor: React.FC<EditorProps & { placeholder?: string }> = (props) => {
  const { id, value, onChange, error, placeholder } = props;
  const [raw, setRaw] = useState(false);
  const { model, update } = useModelState<SchemaModel>(value, parseSchemaModel, serializeSchemaModel);

  if (raw || !model) {
    return (
      <RawJson {...props} placeholder={placeholder} onGuided={model ? () => setRaw(false) : undefined} />
    );
  }

  return (
    <div className="space-y-3" id={id}>
      <PropertyList
        rows={model.properties}
        depth={0}
        addLabel="Ajouter une propriété"
        onChange={(properties) => update({ ...model, properties }, onChange)}
      />
      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
        <input
          type="checkbox"
          checked={model.strict}
          onChange={(e) => update({ ...model, strict: e.target.checked }, onChange)}
        />
        Refuser les propriétés qui ne sont pas listées ici
      </label>
      <FieldError message={error} />
      <Button type="button" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setRaw(true)}>
        Modifier en JSON
      </Button>
    </div>
  );
};

/** Édition par cases à cocher des formes de source de données qu'un type accepte. */
export const DataSourceSchemaEditor: React.FC<EditorProps> = (props) => {
  const { id, value, onChange, error } = props;
  const [raw, setRaw] = useState(false);
  const { model, update } = useModelState<DataSourceModel>(value, parseDataSourceModel, serializeDataSourceModel);

  if (raw || !model) {
    return <RawJson {...props} onGuided={model ? () => setRaw(false) : undefined} />;
  }

  const set = (patch: Partial<DataSourceModel>) => update({ ...model, ...patch }, onChange);

  return (
    <div className="space-y-3" id={id}>
      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
        <input type="checkbox" checked={model.allowStatic} onChange={(e) => set({ allowStatic: e.target.checked })} />
        Liste fixe d'options (valeur et libellé)
      </label>
      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
        <input type="checkbox" checked={model.allowApi} onChange={(e) => set({ allowApi: e.target.checked })} />
        Options chargées depuis une API
      </label>
      {model.allowApi && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-display`} className={labelClass}>
              Affichage d'une option
            </Label>
            <select
              id={`${id}-display`}
              className={`${selectClass} w-full`}
              value={model.display}
              onChange={(e) => set({ display: e.target.value as DataSourceModel["display"] })}
            >
              <option value="label_key">Une propriété (label_key)</option>
              <option value="display_fields">Plusieurs propriétés (display_fields)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-search`} className={labelClass}>
              Recherche
            </Label>
            <select
              id={`${id}-search`}
              className={`${selectClass} w-full`}
              value={model.search}
              onChange={(e) => set({ search: e.target.value as DataSourceModel["search"] })}
            >
              <option value="none">Sans recherche</option>
              <option value="required">Paramètre de recherche obligatoire (search_param)</option>
            </select>
          </div>
        </div>
      )}
      <FieldError message={error} />
      <Button type="button" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setRaw(true)}>
        Modifier en JSON
      </Button>
    </div>
  );
};
