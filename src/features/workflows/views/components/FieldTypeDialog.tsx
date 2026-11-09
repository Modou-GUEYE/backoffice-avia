import React, { useEffect, useState } from "react";
import { FileCode, Code, Tag, Settings2, Database, Power, ShieldCheck, LayoutTemplate, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FieldCatalogDialogTab,
  FieldTypeFormField,
  getFieldTypeErrorTab,
  useFieldCatalog,
} from "../../viewmodels/useFieldCatalog";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { FormSection, SwitchRow } from "./FormSection";
import { JsonConfigField } from "./FieldConfigEditors";
import { DataSourceSchemaEditor, SchemaPropertiesEditor } from "./SchemaBuilderEditors";
import { UI_CONTRACT, resolveConfigProperties } from "../../models/fieldConfigContract";
import LoadingOverlay from "@/shared/components/LoadingOverlay";

interface FieldTypeDialogProps {
  fieldCatalogVm: ReturnType<typeof useFieldCatalog>;
}

type TypeFormData = ReturnType<typeof useFieldCatalog>["typeFormData"];

export const FieldTypeDialog: React.FC<FieldTypeDialogProps> = ({ fieldCatalogVm }) => {
  const formData = fieldCatalogVm.typeFormData;
  const isEditing = Boolean(fieldCatalogVm.editingType);

  const errors = fieldCatalogVm.typeFormErrors;
  const [activeTab, setActiveTab] = useState<FieldCatalogDialogTab>("general");

  // Chaque ouverture du dialogue repart sur l'onglet Général
  useEffect(() => {
    if (fieldCatalogVm.showTypeDialog) setActiveTab("general");
  }, [fieldCatalogVm.showTypeDialog]);

  const updateField = <K extends keyof TypeFormData>(field: K, value: TypeFormData[K]) => {
    fieldCatalogVm.setTypeFormData({ ...formData, [field]: value });
    fieldCatalogVm.clearTypeFormError(field as FieldTypeFormField);
  };

  // Valeurs déjà utilisées par les types du catalogue, proposées pour éviter les fautes de frappe
  const rendererKeys = [...new Set(fieldCatalogVm.rawFieldTypes.map((t) => t.renderer_key))];
  const valueTypes = [...new Set(fieldCatalogVm.rawFieldTypes.map((t) => t.value_type))];

  // La configuration UI par défaut se saisit par champs, d'après le schéma UI en cours d'édition
  const uiSchema = (() => {
    try {
      return formData.ui_schema_str.trim() ? (JSON.parse(formData.ui_schema_str) as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  })();

  const handleSave = async () => {
    const validationErrors = await fieldCatalogVm.handleCreateOrUpdateType();
    // Affiche l'onglet qui contient le premier champ en erreur
    const errorTab = getFieldTypeErrorTab(validationErrors);
    if (errorTab) setActiveTab(errorTab);
  };

  return (
    <Dialog open={fieldCatalogVm.showTypeDialog} onOpenChange={fieldCatalogVm.setShowTypeDialog}>
      <DialogContent className="sm:max-w-2xl bg-background border border-border/50 rounded-2xl shadow-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {fieldCatalogVm.isSavingType && (
          <LoadingOverlay
            title={isEditing ? "Modification du type de champ" : "Création du type de champ"}
            description="Veuillez patienter pendant l'enregistrement du type de champ..."
          />
        )}
        <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-muted/10 flex flex-row items-center gap-3 space-y-0">
          <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent shrink-0">
            <FileCode className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base font-bold text-foreground">
              {isEditing ? "Modifier le type de champ" : "Nouveau type de champ"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {isEditing
                ? "Modifiez les paramètres de ce type de champ."
                : "Créez un nouveau type de champ pour le catalogue."}
            </DialogDescription>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as FieldCatalogDialogTab)}
          className="w-full flex-1 flex flex-col min-h-0"
        >
          <div className="px-6 pt-3 border-b border-border/30 bg-muted/5">
            <TabsList className="grid w-full grid-cols-2 h-9 p-1 bg-muted/40 rounded-lg">
              <TabsTrigger value="general" className="text-xs font-semibold rounded-md">
                Général
              </TabsTrigger>
              <TabsTrigger value="json" className="text-xs font-semibold rounded-md flex items-center gap-1.5">
                <Code className="h-3.5 w-3.5 text-accent" /> Schémas
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            <TabsContent value="general" className="space-y-4 m-0">
              {/* Identification */}
              <FormSection icon={<Tag className="h-3.5 w-3.5 text-accent" />} title="Identification">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="typeCode" className="text-xs font-semibold">
                      Code unique <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="typeCode"
                      {...invalidFieldProps(errors.code, "h-9 text-xs bg-background font-mono")}
                      placeholder="Ex. text, select"
                      value={formData.code}
                      disabled={isEditing}
                      onChange={(e) => updateField("code", e.target.value)}
                    />
                    <FieldError message={errors.code} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="typeLabel" className="text-xs font-semibold">
                      Libellé <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="typeLabel"
                      {...invalidFieldProps(errors.label, "h-9 text-xs bg-background")}
                      placeholder="Ex. Champ texte simple"
                      value={formData.label}
                      onChange={(e) => updateField("label", e.target.value)}
                    />
                    <FieldError message={errors.label} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="typeDescription" className="text-xs font-semibold">
                    Description
                  </Label>
                  <Textarea
                    id="typeDescription"
                    rows={2}
                    className="text-xs bg-background resize-none"
                    placeholder="Description courte de l'usage du type..."
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                  />
                </div>
              </FormSection>

              {/* Rendu */}
              <FormSection icon={<Settings2 className="h-3.5 w-3.5 text-accent" />} title="Rendu et valeur">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="typeRenderer" className="text-xs font-semibold">
                      Clé <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="typeRenderer"
                      {...invalidFieldProps(errors.renderer_key, "h-9 text-xs bg-background font-mono")}
                      placeholder="Ex. text_input"
                      list="typeRendererKeys"
                      value={formData.renderer_key}
                      onChange={(e) => updateField("renderer_key", e.target.value)}
                    />
                    <datalist id="typeRendererKeys">
                      {rendererKeys.map((k) => (
                        <option key={k} value={k} />
                      ))}
                    </datalist>
                    <FieldError message={errors.renderer_key} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="typeValueType" className="text-xs font-semibold">
                      Type de valeur <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="typeValueType"
                      {...invalidFieldProps(errors.value_type, "h-9 text-xs bg-background font-mono")}
                      placeholder="Ex. string, number, boolean"
                      list="typeValueTypes"
                      value={formData.value_type}
                      onChange={(e) => updateField("value_type", e.target.value)}
                    />
                    <datalist id="typeValueTypes">
                      {valueTypes.map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                    <FieldError message={errors.value_type} />
                  </div>
                </div>
              </FormSection>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SwitchRow
                  id="typeSupportsDataSource"
                  icon={<Database className="h-3.5 w-3.5 text-accent" />}
                  title="Source de données"
                  description="Permet de rattacher une API distante."
                  control={
                    <Switch
                      id="typeSupportsDataSource"
                      checked={formData.supports_data_source}
                      onCheckedChange={(checked) => updateField("supports_data_source", checked)}
                    />
                  }
                />
                <SwitchRow
                  id="typeActive"
                  icon={<Power className="h-3.5 w-3.5 text-accent" />}
                  title="Type actif"
                  description="Rend ce type utilisable."
                  control={
                    <Switch
                      id="typeActive"
                      checked={formData.active}
                      onCheckedChange={(checked) => updateField("active", checked)}
                    />
                  }
                />
              </div>
            </TabsContent>

            <TabsContent value="json" className="space-y-4 m-0">
              <FormSection
                icon={<ShieldCheck className="h-3.5 w-3.5 text-accent" />}
                title="Règles de validation acceptées"
                description="Propriétés que les champs de ce type peuvent configurer dans leurs règles de validation."
                optional
              >
                <SchemaPropertiesEditor
                  id="valSchema"
                  value={formData.validation_schema_str}
                  onChange={(val) => updateField("validation_schema_str", val)}
                  error={errors.validation_schema_str}
                  placeholder={'{\n  "type": "object",\n  "properties": {\n    "min_length": { "type": "integer" }\n  }\n}'}
                />
              </FormSection>

              <FormSection
                icon={<LayoutTemplate className="h-3.5 w-3.5 text-accent" />}
                title="Options d'affichage acceptées"
                description="Propriétés que les champs de ce type peuvent configurer dans leur configuration UI."
                optional
              >
                <SchemaPropertiesEditor
                  id="uiSchema"
                  value={formData.ui_schema_str}
                  onChange={(val) => updateField("ui_schema_str", val)}
                  error={errors.ui_schema_str}
                  placeholder={'{\n  "type": "object",\n  "properties": {\n    "currency": { "type": "string" }\n  }\n}'}
                />
              </FormSection>

              {formData.supports_data_source && (
                <FormSection
                  icon={<Database className="h-3.5 w-3.5 text-accent" />}
                  title="Sources de données acceptées"
                  description="Formes de source de données que les champs de ce type peuvent utiliser."
                  optional
                >
                  <DataSourceSchemaEditor
                    id="dsSchema"
                    value={formData.data_source_schema_str}
                    onChange={(val) => updateField("data_source_schema_str", val)}
                    error={errors.data_source_schema_str}
                  />
                </FormSection>
              )}

              <FormSection
                icon={<Palette className="h-3.5 w-3.5 text-accent" />}
                title="Configuration UI par défaut"
                description="Valeurs d'affichage appliquées aux champs de ce type."
                optional
              >
                <JsonConfigField
                  id="defUiConfig"
                  value={formData.default_ui_config_str}
                  onChange={(val) => updateField("default_ui_config_str", val)}
                  properties={resolveConfigProperties(UI_CONTRACT, formData.code, uiSchema)}
                  error={errors.default_ui_config_str}
                  jsonPlaceholder={'{\n  "currency": "XOF"\n}'}
                />
              </FormSection>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="p-4 px-6 border-t border-border/40 bg-muted/10 gap-2">
          <Button
            variant="ghost"
            onClick={() => fieldCatalogVm.setShowTypeDialog(false)}
            className="text-xs h-9"
          >
            Annuler
          </Button>
          <Button
            disabled={fieldCatalogVm.isSavingType}
            onClick={() => void handleSave()}
            className="gradient-accent text-accent-foreground text-xs h-9"
          >
            Enregistrer le type de champ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
