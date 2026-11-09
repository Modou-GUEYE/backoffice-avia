import React, { useEffect, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Code,
  FileText,
  Tag,
  TextCursorInput,
  ShieldCheck,
  Database,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { FormFieldDialogTab, FormFieldFormField, getFormFieldErrorTab, useForms } from "../../viewmodels/useForms";
import { useFieldCatalog } from "../../viewmodels/useFieldCatalog";
import { FormSection } from "./FormSection";
import { DataSourceEditor, JsonConfigField } from "./FieldConfigEditors";
import { UI_CONTRACT, VALIDATION_CONTRACT, resolveConfigProperties } from "../../models/fieldConfigContract";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";

interface FormFieldDialogProps {
  formsVm: ReturnType<typeof useForms>;
  fieldCatalogVm: ReturnType<typeof useFieldCatalog>;
}

type FieldFormData = ReturnType<typeof useForms>["fieldFormData"];

export const FormFieldDialog: React.FC<FormFieldDialogProps> = ({
  formsVm,
  fieldCatalogVm,
}) => {
  const formData = formsVm.fieldFormData;
  const isEditing = Boolean(formsVm.editingField);

  const errors = formsVm.fieldFormErrors;
  const [activeTab, setActiveTab] = useState<FormFieldDialogTab>("general");

  // Chaque ouverture du dialogue repart sur l'onglet Général
  useEffect(() => {
    if (formsVm.showFieldDialog) setActiveTab("general");
  }, [formsVm.showFieldDialog]);

  const updateField = <K extends keyof FieldFormData>(field: K, value: FieldFormData[K]) => {
    formsVm.setFieldFormData({ ...formData, [field]: value });
    formsVm.clearFieldFormError(field as FormFieldFormField);
  };

  const selectedType = fieldCatalogVm.rawFieldTypes.find((t) => t.code.toLowerCase() === formData.type);
  const supportsDataSource = selectedType?.supports_data_source ?? false;

  // La configuration dépend du type : un changement de type repart d'une configuration vide
  const changeType = (type: string) => {
    formsVm.setFieldFormData({
      ...formData,
      type,
      validation_rules_str: "",
      data_source_str: "",
      ui_config_str: "",
    });
    formsVm.clearFieldFormError("type");
  };

  const handleSave = async () => {
    const validationErrors = await formsVm.handleCreateOrUpdateField(selectedType);
    // Affiche l'onglet qui contient le premier champ en erreur
    const errorTab = getFormFieldErrorTab(validationErrors);
    if (errorTab) setActiveTab(errorTab);
  };

  const handleApplyDefinition = (defId: string) => {
    const def = fieldCatalogVm.fieldDefinitions.find((d) => d.id === defId);
    if (!def) return;
    const matchingType = fieldCatalogVm.rawFieldTypes.find((t) => t.id === def.field_type_id);
    formsVm.setFieldFormData({
      ...formData,
      field_definition_id: def.id,
      field_key: def.field_key,
      label: def.label,
      type: matchingType ? matchingType.code.toLowerCase() : formData.type,
      placeholder: def.placeholder || "",
      default_value: def.default_value || "",
      required: def.required ?? false,
      validation_rules_str: def.validation_rules ? JSON.stringify(def.validation_rules, null, 2) : "",
      data_source_str: def.data_source ? JSON.stringify(def.data_source, null, 2) : "",
      ui_config_str: def.ui_config ? JSON.stringify(def.ui_config, null, 2) : "",
    });
    (["field_key", "label", "type", "validation_rules_str", "data_source_str"] as const).forEach(
      formsVm.clearFieldFormError
    );
    toast.info(`Champ pré-rempli avec "${def.label}"`);
  };

  return (
    <Dialog open={formsVm.showFieldDialog} onOpenChange={formsVm.setShowFieldDialog}>
      <DialogContent className="sm:max-w-3xl bg-background border border-border/50 rounded-2xl shadow-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {formsVm.isSavingField && (
          <LoadingOverlay
            title={isEditing ? "Modification du champ" : "Création du champ"}
            description="Veuillez patienter pendant l'enregistrement du champ..."
          />
        )}
        <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-muted/10 flex flex-row items-center gap-3 space-y-0">
          <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-base font-bold text-foreground">
                {isEditing ? "Modifier le champ" : "Nouveau champ"}
              </DialogTitle>
              {formsVm.selectedForm && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono bg-accent/10 text-accent border-accent/25"
                >
                  {formsVm.selectedForm.title}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {isEditing
                ? "Modifiez les paramètres de ce champ."
                : "Créez un nouveau champ pour ce formulaire."}
            </DialogDescription>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as FormFieldDialogTab)}
          className="w-full flex-1 flex flex-col min-h-0"
        >
          <div className="px-6 pt-3 border-b border-border/30 bg-muted/5">
            <TabsList className="grid w-full grid-cols-2 h-9 p-1 bg-muted/40 rounded-lg">
              <TabsTrigger value="general" className="text-xs font-semibold rounded-md">
                Général
              </TabsTrigger>
              <TabsTrigger value="rules" className="text-xs font-semibold rounded-md flex items-center gap-1.5">
                <Code className="h-3.5 w-3.5 text-accent" /> Configuration
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            <TabsContent value="general" className="space-y-4 m-0">
              {/* Dictionnaire de champs */}
              {!isEditing && (
                <section className="rounded-xl border border-accent/30 bg-accent/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-accent/15 text-accent shrink-0">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground">Partir d'une définition</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Préremplissez le champ depuis le dictionnaire de champs réutilisables.
                      </p>
                    </div>
                  </div>
                  <Select onValueChange={handleApplyDefinition}>
                    <SelectTrigger className="h-9 text-xs bg-background w-full sm:w-60 border-border/50 shrink-0">
                      <SelectValue
                        placeholder={fieldCatalogVm.isLoadingCatalog ? "Chargement..." : "Choisir une définition..."}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldCatalogVm.fieldDefinitions.length > 0 ? (
                        fieldCatalogVm.fieldDefinitions.map((d) => (
                          <SelectItem key={d.id} value={d.id} className="text-xs">
                            {d.label} ({d.field_key})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled className="text-xs">
                          {fieldCatalogVm.isLoadingCatalog ? "Chargement..." : "Aucune définition trouvée"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </section>
              )}

              {/* Identification */}
              <FormSection icon={<Tag className="h-3.5 w-3.5 text-accent" />} title="Identification">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fieldKey" className="text-xs font-semibold">
                      Clé technique unique <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="fieldKey"
                      {...invalidFieldProps(errors.field_key, "h-9 text-xs bg-background font-mono")}
                      placeholder="Ex. numero_ninea"
                      value={formData.field_key}
                      onChange={(e) => updateField("field_key", e.target.value)}
                    />
                    <FieldError message={errors.field_key} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fieldLabel" className="text-xs font-semibold">
                      Libellé <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="fieldLabel"
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
                  <Label htmlFor="fieldType" className="text-xs font-semibold">
                    Type de champ <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.type} onValueChange={changeType}>
                    <SelectTrigger
                      id="fieldType"
                      {...invalidFieldProps(errors.type, "h-9 text-xs bg-background font-mono")}
                    >
                      <SelectValue placeholder="Sélectionner le type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldCatalogVm.rawFieldTypes.length > 0 ? (
                        fieldCatalogVm.rawFieldTypes.map((ft) => (
                          <SelectItem key={ft.id} value={ft.code.toLowerCase()} className="text-xs font-mono">
                            {ft.label} ({ft.code})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled className="text-xs">
                          {fieldCatalogVm.isLoadingCatalog ? "Chargement..." : "Aucun type de champ disponible"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FieldError message={errors.type} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fieldPlaceholder" className="text-xs font-semibold">
                      Texte indicatif
                    </Label>
                    <Input
                      id="fieldPlaceholder"
                      className="h-9 text-xs bg-background"
                      placeholder="Ex. Saisir votre NINEA..."
                      value={formData.placeholder}
                      onChange={(e) => updateField("placeholder", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fieldDefaultVal" className="text-xs font-semibold">
                      Valeur par défaut
                    </Label>
                    <Input
                      id="fieldDefaultVal"
                      className="h-9 text-xs bg-background"
                      placeholder="Optionnel..."
                      value={formData.default_value}
                      onChange={(e) => updateField("default_value", e.target.value)}
                    />
                  </div>
                </div>
              </FormSection>

              {/* Obligatoire */}
              <div className="rounded-xl border border-border/40 bg-card/50 p-4 flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="fieldRequired" className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                    <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                    Champ obligatoire
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Bloque la validation du formulaire si le champ est vide.
                  </p>
                </div>
                <Switch
                  id="fieldRequired"
                  checked={formData.required}
                  onCheckedChange={(checked) => updateField("required", checked)}
                />
              </div>
            </TabsContent>

            <TabsContent value="rules" className="space-y-4 m-0">
              <FormSection
                icon={<ShieldCheck className="h-3.5 w-3.5 text-accent" />}
                title="Règles de validation"
                description="Contraintes appliquées à la valeur saisie."
                optional
              >
                <JsonConfigField
                  id="fieldRules"
                  value={formData.validation_rules_str}
                  onChange={(val) => updateField("validation_rules_str", val)}
                  properties={resolveConfigProperties(VALIDATION_CONTRACT, selectedType?.code, selectedType?.validation_schema)}
                  error={errors.validation_rules_str}
                  jsonPlaceholder={'{\n  "min_length": 5\n}'}
                />
              </FormSection>

              <FormSection
                icon={<Palette className="h-3.5 w-3.5 text-accent" />}
                title="Configuration UI"
                description="Options d'affichage du champ."
                optional
              >
                <JsonConfigField
                  id="fieldUiConfig"
                  value={formData.ui_config_str}
                  onChange={(val) => updateField("ui_config_str", val)}
                  properties={resolveConfigProperties(UI_CONTRACT, selectedType?.code, selectedType?.ui_schema)}
                  error={errors.ui_config_str}
                  jsonPlaceholder={'{\n  "currency": "XOF"\n}'}
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
                    id="fieldDataSource"
                    value={formData.data_source_str}
                    onChange={(val) => updateField("data_source_str", val)}
                    typeCode={selectedType?.code}
                    error={errors.data_source_str}
                  />
                </FormSection>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="p-4 px-6 border-t border-border/40 bg-muted/10 gap-2">
          <Button
            variant="ghost"
            onClick={() => formsVm.setShowFieldDialog(false)}
            className="text-xs h-9"
            disabled={formsVm.isSavingField}
          >
            Annuler
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={formsVm.isSavingField}
            className="gradient-accent text-accent-foreground text-xs h-9"
          >
            Enregistrer le champ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
