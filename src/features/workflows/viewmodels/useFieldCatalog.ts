import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  FieldTypeResponse,
  FieldDefinitionResponse,
  CreateFieldTypeRequest,
  UpdateFieldTypeRequest,
  CreateFieldDefinitionRequest,
  UpdateFieldDefinitionRequest,
} from "../models/fieldsTypes";
import {
  fetchFieldTypes,
  fetchFieldTypeDetails,
  createFieldType,
  updateFieldType,
  deleteFieldType,
  fetchFieldDefinitions,
  createFieldDefinition,
  updateFieldDefinition,
  deleteFieldDefinition,
} from "../services/fieldTypesService";
import { FieldErrors, hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import { INVALID_JSON_MESSAGE, firstErrorKey, isInvalidJson, schemaErrorMessage } from "./formValidation";

/** Onglets des dialogues du catalogue de champs (type et définition). */
export type FieldCatalogDialogTab = "general" | "json";

export type FieldTypeFormField =
  | "code"
  | "label"
  | "renderer_key"
  | "value_type"
  | "validation_schema_str"
  | "ui_schema_str"
  | "data_source_schema_str"
  | "default_ui_config_str";

/**
 * Valide le formulaire d'un type de champ et renvoie toutes les erreurs, par champ (dans l'ordre des onglets).
 * Le code n'est exigé qu'à la création (il n'est pas modifiable ensuite).
 */
export const validateFieldTypeForm = (
  form: {
    code: string;
    label: string;
    renderer_key: string;
    value_type: string;
    validation_schema_str: string;
    ui_schema_str: string;
    data_source_schema_str: string;
    default_ui_config_str: string;
  },
  isEditing: boolean
): FieldErrors<FieldTypeFormField> => {
  const errors: FieldErrors<FieldTypeFormField> = {};
  if (!isEditing && !form.code.trim()) errors.code = "Le code est obligatoire";
  if (!form.label.trim()) errors.label = "Le libellé est obligatoire";
  if (!form.renderer_key.trim()) errors.renderer_key = "La clé est obligatoire";
  if (!form.value_type.trim()) errors.value_type = "Le type de valeur est obligatoire";
  if (isInvalidJson(form.validation_schema_str)) errors.validation_schema_str = INVALID_JSON_MESSAGE;
  if (isInvalidJson(form.ui_schema_str)) errors.ui_schema_str = INVALID_JSON_MESSAGE;
  if (isInvalidJson(form.data_source_schema_str)) errors.data_source_schema_str = INVALID_JSON_MESSAGE;
  if (isInvalidJson(form.default_ui_config_str)) errors.default_ui_config_str = INVALID_JSON_MESSAGE;
  return errors;
};

/** Onglet du dialogue de type de champ qui contient le premier champ en erreur. */
export const getFieldTypeErrorTab = (errors: FieldErrors<FieldTypeFormField>): FieldCatalogDialogTab | undefined => {
  const key = firstErrorKey(errors);
  if (!key) return undefined;
  return key.endsWith("_str") ? "json" : "general";
};

export type FieldDefinitionFormField =
  | "field_key"
  | "label"
  | "field_type_id"
  | "validation_rules_str"
  | "data_source_str"
  | "ui_config_str";

/** Valide le formulaire d'une définition de champ et renvoie toutes les erreurs, par champ (dans l'ordre des onglets). */
export const validateFieldDefinitionForm = (form: {
  field_key: string;
  label: string;
  field_type_id: string;
  validation_rules_str: string;
  data_source_str: string;
  ui_config_str: string;
},
  fieldType?: FieldTypeResponse
): FieldErrors<FieldDefinitionFormField> => {
  const errors: FieldErrors<FieldDefinitionFormField> = {};
  if (!form.field_key.trim()) errors.field_key = "La clé technique est obligatoire";
  if (!form.label.trim()) errors.label = "Le libellé est obligatoire";
  if (!form.field_type_id.trim()) errors.field_type_id = "Le type de champ est obligatoire";
  if (isInvalidJson(form.validation_rules_str)) errors.validation_rules_str = INVALID_JSON_MESSAGE;
  if (isInvalidJson(form.data_source_str)) errors.data_source_str = INVALID_JSON_MESSAGE;
  if (isInvalidJson(form.ui_config_str)) errors.ui_config_str = INVALID_JSON_MESSAGE;
  // Conformité aux schémas du type de champ (les messages JSON invalide restent prioritaires)
  const check = (key: FieldDefinitionFormField, value: string, schema?: Record<string, unknown> | null) => {
    if (!errors[key]) {
      const message = schemaErrorMessage(value, schema);
      if (message) errors[key] = message;
    }
  };
  check("validation_rules_str", form.validation_rules_str, fieldType?.validation_schema);
  check("data_source_str", form.data_source_str, fieldType?.supports_data_source ? fieldType.data_source_schema : null);
  check("ui_config_str", form.ui_config_str, fieldType?.ui_schema);
  return errors;
};

/** Onglet du dialogue de définition de champ qui contient le premier champ en erreur. */
export const getFieldDefinitionErrorTab = (
  errors: FieldErrors<FieldDefinitionFormField>
): FieldCatalogDialogTab | undefined => {
  const key = firstErrorKey(errors);
  if (!key) return undefined;
  return key.endsWith("_str") ? "json" : "general";
};

export const useFieldCatalog = (options?: { enabled?: boolean }) => {
  const enabled = options?.enabled ?? true;

  // Active sub-tab state for catalog: "types" | "definitions"
  const [catalogSubTab, setCatalogSubTab] = useState<"types" | "definitions">("types");

  // ==========================================
  // FIELD TYPES STATE
  // ==========================================
  const [fieldTypes, setFieldTypes] = useState<FieldTypeResponse[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [typeSearchTerm, setTypeSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<FieldTypeResponse | null>(null);

  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [editingType, setEditingType] = useState<FieldTypeResponse | null>(null);
  const [isSavingType, setIsSavingType] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<string | null>(null);

  const [typeFormData, setTypeFormData] = useState({
    code: "",
    label: "",
    description: "",
    renderer_key: "TEXT_INPUT",
    value_type: "STRING",
    supports_data_source: false,
    active: true,
    validation_schema_str: "",
    ui_schema_str: "",
    data_source_schema_str: "",
    default_ui_config_str: "",
  });

  // ==========================================
  // FIELD DEFINITIONS STATE
  // ==========================================
  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinitionResponse[]>([]);
  const [isLoadingDefinitions, setIsLoadingDefinitions] = useState(false);
  const [definitionSearchTerm, setDefinitionSearchTerm] = useState("");
  const [selectedDefinition, setSelectedDefinition] = useState<FieldDefinitionResponse | null>(null);

  const [showDefinitionDialog, setShowDefinitionDialog] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<FieldDefinitionResponse | null>(null);
  const [isSavingDefinition, setIsSavingDefinition] = useState(false);
  const [definitionToDelete, setDefinitionToDelete] = useState<string | null>(null);

  const [definitionFormData, setDefinitionFormData] = useState({
    field_key: "",
    label: "",
    field_type_id: "",
    placeholder: "",
    default_value: "",
    required: false,
    validation_rules_str: "",
    data_source_str: "",
    ui_config_str: "",
  });

  const {
    errors: typeFormErrors,
    setErrors: setTypeFormErrors,
    clearError: clearTypeFormError,
    resetErrors: resetTypeFormErrors,
  } = useFieldErrors<FieldTypeFormField>();
  const {
    errors: definitionFormErrors,
    setErrors: setDefinitionFormErrors,
    clearError: clearDefinitionFormError,
    resetErrors: resetDefinitionFormErrors,
  } = useFieldErrors<FieldDefinitionFormField>();

  // Chaque ouverture ou fermeture d'un dialogue repart d'un formulaire sans erreur affichée
  const setShowTypeDialogWithReset = (open: boolean) => {
    resetTypeFormErrors();
    setShowTypeDialog(open);
  };
  const setShowDefinitionDialogWithReset = (open: boolean) => {
    resetDefinitionFormErrors();
    setShowDefinitionDialog(open);
  };

  // Load Field Types
  const loadTypes = useCallback(async () => {
    try {
      setIsLoadingTypes(true);
      const data = await fetchFieldTypes();
      setFieldTypes(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du chargement des types de champs");
    } finally {
      setIsLoadingTypes(false);
    }
  }, []);

  // Load Field Definitions
  const loadDefinitions = useCallback(async () => {
    try {
      setIsLoadingDefinitions(true);
      const data = await fetchFieldDefinitions();
      setFieldDefinitions(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du chargement des définitions de champs");
    } finally {
      setIsLoadingDefinitions(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void loadTypes();
    void loadDefinitions();
  }, [enabled, loadTypes, loadDefinitions]);

  // Filtered Field Types
  const filteredTypes = useMemo(() => {
    if (!typeSearchTerm.trim()) return fieldTypes;
    const term = typeSearchTerm.toLowerCase();
    return fieldTypes.filter(
      (t) =>
        t.code.toLowerCase().includes(term) ||
        t.label.toLowerCase().includes(term) ||
        t.renderer_key.toLowerCase().includes(term) ||
        t.value_type.toLowerCase().includes(term)
    );
  }, [fieldTypes, typeSearchTerm]);

  // Filtered Field Definitions
  const filteredDefinitions = useMemo(() => {
    if (!definitionSearchTerm.trim()) return fieldDefinitions;
    const term = definitionSearchTerm.toLowerCase();
    return fieldDefinitions.filter(
      (d) =>
        d.field_key.toLowerCase().includes(term) ||
        d.label.toLowerCase().includes(term)
    );
  }, [fieldDefinitions, definitionSearchTerm]);

  // Helper for parsing JSON fields safely
  const parseJsonField = (val: string, name: string): Record<string, unknown> | null => {
    const trimmed = val.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      throw new Error(`Format JSON invalide pour le champ '${name}'`);
    }
  };

  // Open New Type Dialog
  const handleOpenNewType = () => {
    setEditingType(null);
    setTypeFormData({
      code: "",
      label: "",
      description: "",
      renderer_key: "TEXT_INPUT",
      value_type: "STRING",
      supports_data_source: false,
      active: true,
      validation_schema_str: "",
      ui_schema_str: "",
      data_source_schema_str: "",
      default_ui_config_str: "",
    });
    setShowTypeDialogWithReset(true);
  };

  // Open Edit Type Dialog
  const handleOpenEditType = (typeItem: FieldTypeResponse) => {
    setEditingType(typeItem);
    setTypeFormData({
      code: typeItem.code,
      label: typeItem.label,
      description: typeItem.description || "",
      renderer_key: typeItem.renderer_key,
      value_type: typeItem.value_type,
      supports_data_source: typeItem.supports_data_source ?? false,
      active: typeItem.active ?? true,
      validation_schema_str: typeItem.validation_schema ? JSON.stringify(typeItem.validation_schema, null, 2) : "",
      ui_schema_str: typeItem.ui_schema ? JSON.stringify(typeItem.ui_schema, null, 2) : "",
      data_source_schema_str: typeItem.data_source_schema ? JSON.stringify(typeItem.data_source_schema, null, 2) : "",
      default_ui_config_str: typeItem.default_ui_config ? JSON.stringify(typeItem.default_ui_config, null, 2) : "",
    });
    setShowTypeDialogWithReset(true);
  };

  // Create or Update Field Type
  /** Enregistre le type de champ ; renvoie les erreurs de validation (vide si le formulaire est valide). */
  const handleCreateOrUpdateType = async (): Promise<FieldErrors<FieldTypeFormField>> => {
    const validationErrors = validateFieldTypeForm(typeFormData, Boolean(editingType));
    setTypeFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return validationErrors;

    try {
      setIsSavingType(true);
      const validation_schema = parseJsonField(typeFormData.validation_schema_str, "Schéma de validation");
      const ui_schema = parseJsonField(typeFormData.ui_schema_str, "Schéma UI");
      const data_source_schema = parseJsonField(typeFormData.data_source_schema_str, "Schéma source de données");
      const default_ui_config = parseJsonField(typeFormData.default_ui_config_str, "Configuration UI par défaut");

      if (editingType) {
        const payload: UpdateFieldTypeRequest = {
          label: typeFormData.label.trim(),
          description: typeFormData.description.trim() || null,
          renderer_key: typeFormData.renderer_key.trim(),
          value_type: typeFormData.value_type.trim(),
          supports_data_source: typeFormData.supports_data_source,
          active: typeFormData.active,
          validation_schema,
          ui_schema,
          data_source_schema,
          default_ui_config,
        };
        const updated = await updateFieldType(editingType.id, payload);
        setFieldTypes((prev) => prev.map((t) => (t.id === editingType.id ? updated : t)));
        toast.success("Type de champ modifié avec succès");
      } else {
        const payload: CreateFieldTypeRequest = {
          code: typeFormData.code.trim(),
          label: typeFormData.label.trim(),
          description: typeFormData.description.trim() || null,
          renderer_key: typeFormData.renderer_key.trim(),
          value_type: typeFormData.value_type.trim(),
          supports_data_source: typeFormData.supports_data_source,
          active: typeFormData.active,
          validation_schema,
          ui_schema,
          data_source_schema,
          default_ui_config,
        };
        const created = await createFieldType(payload);
        setFieldTypes((prev) => [created, ...prev]);
        toast.success("Type de champ créé avec succès");
      }
      setShowTypeDialogWithReset(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la sauvegarde du type de champ");
    } finally {
      setIsSavingType(false);
    }
    return {};
  };

  // Select Field Type (fetches fresh details)
  const handleSelectType = async (typeItem: FieldTypeResponse | null) => {
    if (!typeItem) {
      setSelectedType(null);
      return;
    }
    try {
      const details = await fetchFieldTypeDetails(typeItem.id);
      setSelectedType(details);
    } catch {
      setSelectedType(typeItem);
    }
  };

  // Delete Field Type
  const handleDeleteType = (typeId: string) => {
    setTypeToDelete(typeId);
  };

  const handleConfirmDeleteType = async () => {
    if (!typeToDelete) return;
    try {
      setIsLoadingTypes(true);
      await deleteFieldType(typeToDelete);
      setFieldTypes((prev) => prev.filter((t) => t.id !== typeToDelete));
      toast.success("Type de champ supprimé avec succès");
      setTypeToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression");
    } finally {
      setIsLoadingTypes(false);
    }
  };

  // Open New Definition Dialog
  const handleOpenNewDefinition = () => {
    setEditingDefinition(null);
    setDefinitionFormData({
      field_key: "",
      label: "",
      field_type_id: fieldTypes.length > 0 ? fieldTypes[0].id : "",
      placeholder: "",
      default_value: "",
      required: false,
      validation_rules_str: "",
      data_source_str: "",
      ui_config_str: "",
    });
    setShowDefinitionDialogWithReset(true);
  };

  // Open Edit Definition Dialog
  const handleOpenEditDefinition = (defItem: FieldDefinitionResponse) => {
    setEditingDefinition(defItem);
    setDefinitionFormData({
      field_key: defItem.field_key,
      label: defItem.label,
      field_type_id: defItem.field_type_id,
      placeholder: defItem.placeholder || "",
      default_value: defItem.default_value || "",
      required: defItem.required ?? false,
      validation_rules_str: defItem.validation_rules ? JSON.stringify(defItem.validation_rules, null, 2) : "",
      data_source_str: defItem.data_source ? JSON.stringify(defItem.data_source, null, 2) : "",
      ui_config_str: defItem.ui_config ? JSON.stringify(defItem.ui_config, null, 2) : "",
    });
    setShowDefinitionDialogWithReset(true);
  };

  // Create or Update Field Definition
  /** Enregistre la définition de champ ; renvoie les erreurs de validation (vide si le formulaire est valide). */
  const handleCreateOrUpdateDefinition = async (): Promise<FieldErrors<FieldDefinitionFormField>> => {
    const validationErrors = validateFieldDefinitionForm(
      definitionFormData,
      fieldTypes.find((t) => t.id === definitionFormData.field_type_id)
    );
    setDefinitionFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return validationErrors;

    try {
      setIsSavingDefinition(true);
      const validation_rules = parseJsonField(definitionFormData.validation_rules_str, "Règles de validation");
      const data_source = parseJsonField(definitionFormData.data_source_str, "Source de données");
      const ui_config = parseJsonField(definitionFormData.ui_config_str, "Configuration UI");

      const payload: CreateFieldDefinitionRequest = {
        field_key: definitionFormData.field_key.trim(),
        label: definitionFormData.label.trim(),
        field_type_id: definitionFormData.field_type_id.trim(),
        placeholder: definitionFormData.placeholder.trim() || null,
        default_value: definitionFormData.default_value.trim() || null,
        required: definitionFormData.required,
        validation_rules,
        data_source,
        ui_config,
      };

      if (editingDefinition) {
        const updated = await updateFieldDefinition(editingDefinition.id, payload as UpdateFieldDefinitionRequest);
        setFieldDefinitions((prev) => prev.map((d) => (d.id === editingDefinition.id ? updated : d)));
        toast.success("Définition de champ modifiée avec succès");
      } else {
        const created = await createFieldDefinition(payload);
        setFieldDefinitions((prev) => [created, ...prev]);
        toast.success("Définition de champ créée avec succès");
      }
      setShowDefinitionDialogWithReset(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la sauvegarde de la définition");
    } finally {
      setIsSavingDefinition(false);
    }
    return {};
  };

  // Delete Field Definition
  const handleDeleteDefinition = (defId: string) => {
    setDefinitionToDelete(defId);
  };

  const handleConfirmDeleteDefinition = async () => {
    if (!definitionToDelete) return;
    try {
      setIsLoadingDefinitions(true);
      await deleteFieldDefinition(definitionToDelete);
      setFieldDefinitions((prev) => prev.filter((d) => d.id !== definitionToDelete));
      toast.success("Définition de champ supprimée avec succès");
      setDefinitionToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression");
    } finally {
      setIsLoadingDefinitions(false);
    }
  };

  return {
    catalogSubTab,
    setCatalogSubTab,
    fieldTypes: filteredTypes,
    rawFieldTypes: fieldTypes,
    isLoadingTypes,
    isLoadingCatalog: isLoadingTypes || isLoadingDefinitions,
    typeSearchTerm,
    setTypeSearchTerm,
    selectedType,
    setSelectedType,
    handleSelectType,
    showTypeDialog,
    setShowTypeDialog: setShowTypeDialogWithReset,
    typeFormErrors,
    clearTypeFormError,
    editingType,
    isSavingType,
    typeFormData,
    setTypeFormData,
    handleOpenNewType,
    handleOpenEditType,
    handleCreateOrUpdateType,
    handleDeleteType,
    typeToDelete,
    setTypeToDelete,
    handleConfirmDeleteType,
    fieldDefinitions: filteredDefinitions,
    isLoadingDefinitions,
    definitionSearchTerm,
    setDefinitionSearchTerm,
    selectedDefinition,
    setSelectedDefinition,
    showDefinitionDialog,
    setShowDefinitionDialog: setShowDefinitionDialogWithReset,
    definitionFormErrors,
    clearDefinitionFormError,
    editingDefinition,
    isSavingDefinition,
    definitionFormData,
    setDefinitionFormData,
    handleOpenNewDefinition,
    handleOpenEditDefinition,
    handleCreateOrUpdateDefinition,
    handleDeleteDefinition,
    definitionToDelete,
    setDefinitionToDelete,
    handleConfirmDeleteDefinition,
    refreshTypes: loadTypes,
    refreshDefinitions: loadDefinitions,
  };
};
