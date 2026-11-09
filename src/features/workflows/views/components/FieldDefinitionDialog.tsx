import React, { useEffect, useState } from "react";
import { BookOpen, Code, Tag, TextCursorInput, ShieldCheck, Database, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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
  FieldDefinitionFormField,
  getFieldDefinitionErrorTab,
  useFieldCatalog,
} from "../../viewmodels/useFieldCatalog";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { FormSection, SwitchRow } from "./FormSection";
import { DataSourceEditor, JsonConfigField } from "./FieldConfigEditors";
import { UI_CONTRACT, VALIDATION_CONTRACT, resolveConfigProperties } from "../../models/fieldConfigContract";
import LoadingOverlay from "@/shared/components/LoadingOverlay";

interface FieldDefinitionDialogProps {
  fieldCatalogVm: ReturnType<typeof useFieldCatalog>;
}

type DefinitionFormData = ReturnType<typeof useFieldCatalog>["definitionFormData"];

export const FieldDefinitionDialog: React.FC<FieldDefinitionDialogProps> = ({
  fieldCatalogVm,
}) => {
  const formData = fieldCatalogVm.definitionFormData;
  const isEditing = Boolean(fieldCatalogVm.editingDefinition);

  const errors = fieldCatalogVm.definitionFormErrors;
  const [activeTab, setActiveTab] = useState<FieldCatalogDialogTab>("general");

  // Chaque ouverture du dialogue repart sur l'onglet Général
  useEffect(() => {
    if (fieldCatalogVm.showDefinitionDialog) setActiveTab("general");
  }, [fieldCatalogVm.showDefinitionDialog]);

  const updateField = <K extends keyof DefinitionFormData>(field: K, value: DefinitionFormData[K]) => {
    fieldCatalogVm.setDefinitionFormData({ ...formData, [field]: value });
    fieldCatalogVm.clearDefinitionFormError(field as FieldDefinitionFormField);
  };

  const selectedType = fieldCatalogVm.rawFieldTypes.find((t) => t.id === formData.field_type_id);
  const typeCode = selectedType?.code;
  const supportsDataSource = selectedType?.supports_data_source ?? false;

  // La configuration dépend du type : un changement de type repart d'une configuration vide
  const changeType = (typeId: string) => {
    fieldCatalogVm.setDefinitionFormData({
      ...formData,
      field_type_id: typeId,
      validation_rules_str: "",
      data_source_str: "",
      ui_config_str: "",
    });
    fieldCatalogVm.clearDefinitionFormError("field_type_id");
  };

  const handleSave = async () => {
    const validationErrors = await fieldCatalogVm.handleCreateOrUpdateDefinition();
    // Affiche l'onglet qui contient le premier champ en erreur
    const errorTab = getFieldDefinitionErrorTab(validationErrors);
    if (errorTab) setActiveTab(errorTab);
  };

  return (
    <Dialog
      open={fieldCatalogVm.showDefinitionDialog}
      onOpenChange={fieldCatalogVm.setShowDefinitionDialog}
    >
      <DialogContent className="sm:max-w-2xl bg-background border border-border/50 rounded-2xl shadow-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {fieldCatalogVm.isSavingDefinition && (
          <LoadingOverlay
            title={isEditing ? "Modification de la définition de champ" : "Création de la définition de champ"}
            description="Veuillez patienter pendant l'enregistrement de la définition de champ..."
          />
        )}
        <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-muted/10 flex flex-row items-center gap-3 space-y-0">
          <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base font-bold text-foreground">
              {isEditing ? "Modifier la définition de champ" : "Nouvelle définition de champ"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {isEditing
                ? "Modifiez les paramètres de cette définition de champ."
                : "Créez une nouvelle définition de champ réutilisable dans les formulaires."}
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
                <Code className="h-3.5 w-3.5 text-accent" /> Configuration
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            <TabsContent value="general" className="space-y-4 m-0">
              {/* Identification */}
              <FormSection icon={<Tag className="h-3.5 w-3.5 text-accent" />} title="Identification">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="defKey" className="text-xs font-semibold">
                      Clé technique unique <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="defKey"
                      {...invalidFieldProps(errors.field_key, "h-9 text-xs bg-background font-mono")}
                      placeholder="Ex. customer_ninea"
                      value={formData.field_key}
                      onChange={(e) => updateField("field_key", e.target.value)}
                    />
                    <FieldError message={errors.field_key} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="defLabel" className="text-xs font-semibold">
                      Libellé <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="defLabel"
                      {...invalidFieldProps(errors.label, "h-9 text-xs bg-background")}
                      placeholder="Ex. Numéro NINEA"
                      value={formData.label}
                      onChange={(e) => updateField("label", e.target.value)}
                    />
                    <FieldError message={errors.label} />
                  </div>
                </div>
              </FormSection>

              {/* Saisie */}
              <FormSection icon={<TextCursorInput className="h-3.5 w-3.5 text-accent" />} title="Saisie">
                <div className="space-y-1.5">
                  <Label htmlFor="defTypeId" className="text-xs font-semibold">
                    Type de champ <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.field_type_id} onValueChange={changeType}>
                    <SelectTrigger id="defTypeId" {...invalidFieldProps(errors.field_type_id, "h-9 text-xs bg-background")}>
                      <SelectValue placeholder="Sélectionner le type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldCatalogVm.rawFieldTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={errors.field_type_id} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="defPlaceholder" className="text-xs font-semibold">
                      Texte indicatif
                    </Label>
                    <Input
                      id="defPlaceholder"
                      className="h-9 text-xs bg-background"
                      placeholder="Ex. Saisir votre numéro NINEA..."
                      value={formData.placeholder}
                      onChange={(e) => updateField("placeholder", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="defDefaultVal" className="text-xs font-semibold">
                      Valeur par défaut
                    </Label>
                    <Input
                      id="defDefaultVal"
                      className="h-9 text-xs bg-background"
                      placeholder="Optionnel..."
                      value={formData.default_value}
                      onChange={(e) => updateField("default_value", e.target.value)}
                    />
                  </div>
                </div>
              </FormSection>

              <SwitchRow
                id="defRequired"
                icon={<ShieldCheck className="h-3.5 w-3.5 text-accent" />}
                title="Champ obligatoire"
                description="Exigé par défaut lors de l'ajout dans un formulaire."
                control={
                  <Switch
                    id="defRequired"
                    checked={formData.required}
                    onCheckedChange={(checked) => updateField("required", checked)}
                  />
                }
              />
            </TabsContent>

            <TabsContent value="json" className="space-y-4 m-0">
              <FormSection
                icon={<ShieldCheck className="h-3.5 w-3.5 text-accent" />}
                title="Règles de validation"
                description="Contraintes appliquées à la valeur saisie."
                optional
              >
                <JsonConfigField
                  id="valRules"
                  value={formData.validation_rules_str}
                  onChange={(val) => updateField("validation_rules_str", val)}
                  properties={resolveConfigProperties(VALIDATION_CONTRACT, typeCode, selectedType?.validation_schema)}
                  error={errors.validation_rules_str}
                  jsonPlaceholder={'{\n  "min_length": 5\n}'}
                />
              </FormSection>
              {supportsDataSource && (
                <FormSection
                  icon={<Database className="h-3.5 w-3.5 text-accent" />}
                  title="Source de données"
                  description="Origine des options proposées (menus déroulants, listes)."
                  optional
                >
                  <DataSourceEditor
                    id="defDataSource"
                    value={formData.data_source_str}
                    onChange={(val) => updateField("data_source_str", val)}
                    typeCode={typeCode}
                    error={errors.data_source_str}
                  />
                </FormSection>
              )}

              <FormSection
                icon={<Palette className="h-3.5 w-3.5 text-accent" />}
                title="Configuration UI"
                description="Options d'affichage du champ."
                optional
              >
                <JsonConfigField
                  id="defUiConf"
                  value={formData.ui_config_str}
                  onChange={(val) => updateField("ui_config_str", val)}
                  properties={resolveConfigProperties(UI_CONTRACT, typeCode, selectedType?.ui_schema)}
                  error={errors.ui_config_str}
                  jsonPlaceholder={'{\n  "currency": "XOF"\n}'}
                />
              </FormSection>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="p-4 px-6 border-t border-border/40 bg-muted/10 gap-2">
          <Button
            variant="ghost"
            onClick={() => fieldCatalogVm.setShowDefinitionDialog(false)}
            className="text-xs h-9"
          >
            Annuler
          </Button>
          <Button
            disabled={fieldCatalogVm.isSavingDefinition}
            onClick={() => void handleSave()}
            className="gradient-accent text-accent-foreground text-xs h-9"
          >
            Enregistrer la définition de champ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
