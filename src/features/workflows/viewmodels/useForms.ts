import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  FormResponse,
  FormFieldResponse,
  CreateFormRequest,
  CreateFormFieldRequest,
} from "../models/formsTypes";
import {
  fetchForms,
  createForm,
  updateForm,
  deleteForm,
  fetchFormFields,
  createFormField,
  updateFormField,
  deleteFormField,
  reorderFormFields,
} from "../services/formsService";
import { FieldErrors, hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import { FieldTypeResponse } from "../models/fieldsTypes";
import { INVALID_JSON_MESSAGE, firstErrorKey, isInvalidJson, schemaErrorMessage } from "./formValidation";

export type FormFormField = "code" | "title";

/** Valide le formulaire de création / modification d'un formulaire et renvoie toutes les erreurs, par champ. */
export const validateFormForm = (form: { code: string; title: string }): FieldErrors<FormFormField> => {
  const errors: FieldErrors<FormFormField> = {};
  if (!form.code.trim()) errors.code = "Le code est obligatoire";
  if (!form.title.trim()) errors.title = "Le titre est obligatoire";
  return errors;
};

export type FormFieldFormField =
  | "field_key"
  | "label"
  | "type"
  | "validation_rules_str"
  | "visibility_rules_str"
  | "readonly_rules_str"
  | "data_source_str"
  | "ui_config_str";

export type FormFieldDialogTab = "general" | "rules";

/** Valide le formulaire d'un champ de formulaire et renvoie toutes les erreurs, par champ (dans l'ordre des onglets). */
export const validateFormFieldForm = (form: {
  field_key: string;
  label: string;
  type: string;
  validation_rules_str: string;
  visibility_rules_str: string;
  readonly_rules_str: string;
  data_source_str: string;
  ui_config_str?: string;
},
  fieldType?: FieldTypeResponse
): FieldErrors<FormFieldFormField> => {
  const errors: FieldErrors<FormFieldFormField> = {};
  if (!form.field_key.trim()) errors.field_key = "La clé technique est obligatoire";
  if (!form.label.trim()) errors.label = "Le libellé est obligatoire";
  if (!form.type.trim()) errors.type = "Le type de champ est obligatoire";
  if (isInvalidJson(form.validation_rules_str)) errors.validation_rules_str = INVALID_JSON_MESSAGE;
  if (isInvalidJson(form.visibility_rules_str)) errors.visibility_rules_str = INVALID_JSON_MESSAGE;
  if (isInvalidJson(form.readonly_rules_str)) errors.readonly_rules_str = INVALID_JSON_MESSAGE;
  if (isInvalidJson(form.data_source_str)) errors.data_source_str = INVALID_JSON_MESSAGE;
  if (isInvalidJson(form.ui_config_str ?? "")) errors.ui_config_str = INVALID_JSON_MESSAGE;
  // Conformité aux schémas du type de champ (les messages JSON invalide restent prioritaires)
  const check = (key: FormFieldFormField, value: string, schema?: Record<string, unknown> | null) => {
    if (!errors[key]) {
      const message = schemaErrorMessage(value, schema);
      if (message) errors[key] = message;
    }
  };
  check("validation_rules_str", form.validation_rules_str, fieldType?.validation_schema);
  check("data_source_str", form.data_source_str, fieldType?.supports_data_source ? fieldType.data_source_schema : null);
  check("ui_config_str", form.ui_config_str ?? "", fieldType?.ui_schema);
  return errors;
};

/** Onglet du dialogue de champ qui contient le premier champ en erreur. */
export const getFormFieldErrorTab = (errors: FieldErrors<FormFieldFormField>): FormFieldDialogTab | undefined => {
  const key = firstErrorKey(errors);
  if (!key) return undefined;
  return key === "field_key" || key === "label" || key === "type" ? "general" : "rules";
};

export const useForms = (options?: { enabled?: boolean }) => {
  const enabled = options?.enabled ?? true;
  // Forms list state
  const [forms, setForms] = useState<FormResponse[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Selection state
  const [selectedForm, setSelectedForm] = useState<FormResponse | null>(null);
  const [formFields, setFormFields] = useState<FormFieldResponse[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);

  // Form creation/edition state
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingForm, setEditingForm] = useState<FormResponse | null>(null);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [formFormData, setFormFormData] = useState({
    code: "",
    title: "",
    description: "",
  });

  // Field creation/edition state
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [editingField, setEditingField] = useState<FormFieldResponse | null>(null);
  const [isSavingField, setIsSavingField] = useState(false);
  const [fieldFormData, setFieldFormData] = useState({
    field_definition_id: "",
    field_key: "",
    label: "",
    type: "text",
    placeholder: "",
    default_value: "",
    required: false,
    validation_rules_str: "",
    visibility_rules_str: "",
    readonly_rules_str: "",
    data_source_str: "",
    ui_config_str: "",
  });

  const {
    errors: formFormErrors,
    setErrors: setFormFormErrors,
    clearError: clearFormFormError,
    resetErrors: resetFormFormErrors,
  } = useFieldErrors<FormFormField>();
  const {
    errors: fieldFormErrors,
    setErrors: setFieldFormErrors,
    clearError: clearFieldFormError,
    resetErrors: resetFieldFormErrors,
  } = useFieldErrors<FormFieldFormField>();

  // Chaque ouverture ou fermeture d'un dialogue repart d'un formulaire sans erreur affichée
  const setShowFormDialogWithReset = (open: boolean) => {
    resetFormFormErrors();
    setShowFormDialog(open);
  };
  const setShowFieldDialogWithReset = (open: boolean) => {
    resetFieldFormErrors();
    setShowFieldDialog(open);
  };

  // Deletion confirmation state
  const [formToDelete, setFormToDelete] = useState<string | null>(null);
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null);

  // Load all forms
  const loadForms = useCallback(async () => {
    try {
      setIsLoadingForms(true);
      const data = await fetchForms();
      setForms(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du chargement des formulaires");
    } finally {
      setIsLoadingForms(false);
    }
  }, []);

  // Load fields for a form
  const loadFields = useCallback(async (formId: string) => {
    try {
      setIsLoadingFields(true);
      const data = await fetchFormFields(formId);
      // Sort fields by field_order ascending
      const sorted = [...data].sort((a, b) => a.field_order - b.field_order);
      setFormFields(sorted);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du chargement des champs");
    } finally {
      setIsLoadingFields(false);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    if (!enabled) return;
    void loadForms();
  }, [enabled, loadForms]);

  // Handle form selection
  const handleSelectForm = (form: FormResponse | null) => {
    setSelectedForm(form);
    if (form) {
      void loadFields(form.id);
    } else {
      setFormFields([]);
    }
  };

  // Filtered forms list
  const filteredForms = useMemo(() => {
    if (!searchTerm.trim()) return forms;
    const term = searchTerm.toLowerCase();
    return forms.filter(
      (f) =>
        f.code.toLowerCase().includes(term) ||
        f.title.toLowerCase().includes(term) ||
        (f.description && f.description.toLowerCase().includes(term))
    );
  }, [forms, searchTerm]);

  // Open dialog for new form
  const handleOpenNewForm = () => {
    setEditingForm(null);
    setFormFormData({
      code: "",
      title: "",
      description: "",
    });
    setShowFormDialogWithReset(true);
  };

  // Open dialog for editing form
  const handleOpenEditForm = (form: FormResponse) => {
    setEditingForm(form);
    setFormFormData({
      code: form.code,
      title: form.title,
      description: form.description || "",
    });
    setShowFormDialogWithReset(true);
  };

  // Create or Update Form
  const handleCreateOrUpdateForm = async () => {
    const validationErrors = validateFormForm(formFormData);
    setFormFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    try {
      setIsSavingForm(true);
      const payload: CreateFormRequest = {
        code: formFormData.code.trim(),
        title: formFormData.title.trim(),
        description: formFormData.description.trim() || null,
      };

      if (editingForm) {
        const updated = await updateForm(editingForm.id, payload);
        setForms((prev) => prev.map((f) => (f.id === editingForm.id ? updated : f)));
        if (selectedForm?.id === editingForm.id) {
          setSelectedForm(updated);
        }
        toast.success("Formulaire modifié avec succès");
      } else {
        const created = await createForm(payload);
        setForms((prev) => [created, ...prev]);
        handleSelectForm(created);
        toast.success("Formulaire créé avec succès");
      }
      setShowFormDialogWithReset(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la sauvegarde du formulaire");
    } finally {
      setIsSavingForm(false);
    }
  };

  // Delete Form
  const handleDeleteForm = (formId: string) => {
    setFormToDelete(formId);
  };

  const handleConfirmDeleteForm = async () => {
    if (!formToDelete) return;
    try {
      setIsLoadingForms(true);
      await deleteForm(formToDelete);
      setForms((prev) => prev.filter((f) => f.id !== formToDelete));
      if (selectedForm?.id === formToDelete) {
        setSelectedForm(null);
        setFormFields([]);
      }
      toast.success("Formulaire supprimé avec succès");
      setFormToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression");
    } finally {
      setIsLoadingForms(false);
    }
  };

  // Open dialog for new field
  const handleOpenNewField = () => {
    if (!selectedForm) return;
    setEditingField(null);
    setFieldFormData({
      field_definition_id: "",
      field_key: "",
      label: "",
      type: "text",
      placeholder: "",
      default_value: "",
      required: false,
      validation_rules_str: "",
      visibility_rules_str: "",
      readonly_rules_str: "",
      data_source_str: "",
      ui_config_str: "",
    });
    setShowFieldDialogWithReset(true);
  };

  // Open dialog for editing field
  const handleOpenEditField = (field: FormFieldResponse) => {
    setEditingField(field);
    setFieldFormData({
      field_definition_id: field.field_definition_id ?? "",
      field_key: field.field_key,
      label: field.label,
      type: field.type,
      placeholder: field.placeholder || "",
      default_value: field.default_value || "",
      required: field.required ?? false,
      validation_rules_str: field.validation_rules ? JSON.stringify(field.validation_rules, null, 2) : "",
      visibility_rules_str: field.visibility_rules ? JSON.stringify(field.visibility_rules, null, 2) : "",
      readonly_rules_str: field.readonly_rules ? JSON.stringify(field.readonly_rules, null, 2) : "",
      data_source_str: field.data_source ? JSON.stringify(field.data_source, null, 2) : "",
      ui_config_str: field.ui_config ? JSON.stringify(field.ui_config, null, 2) : "",
    });
    setShowFieldDialogWithReset(true);
  };

  // Helper to parse JSON safely
  const parseJsonField = (val: string, name: string): Record<string, unknown> | null => {
    const trimmed = val.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      throw new Error(`Format JSON invalide pour le champ '${name}'`);
    }
  };

  // Create or Update Field
  /** Enregistre le champ ; renvoie les erreurs de validation (vide si le formulaire est valide). */
  const handleCreateOrUpdateField = async (fieldType?: FieldTypeResponse): Promise<FieldErrors<FormFieldFormField>> => {
    if (!selectedForm) return {};
    const validationErrors = validateFormFieldForm(fieldFormData, fieldType);
    setFieldFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return validationErrors;

    try {
      setIsSavingField(true);

      // Parse JSON configs
      const validation_rules = parseJsonField(fieldFormData.validation_rules_str, "Règles de validation");
      const visibility_rules = parseJsonField(fieldFormData.visibility_rules_str, "Règles de visibilité");
      const readonly_rules = parseJsonField(fieldFormData.readonly_rules_str, "Règles de lecture seule");
      const data_source = parseJsonField(fieldFormData.data_source_str, "Source de données");
      const ui_config = parseJsonField(fieldFormData.ui_config_str, "Configuration UI");

      const order = editingField
        ? editingField.field_order
        : formFields.length > 0
        ? Math.max(...formFields.map((f) => f.field_order)) + 1
        : 0;

      const payload: CreateFormFieldRequest = {
        field_definition_id: fieldFormData.field_definition_id || null,
        field_key: fieldFormData.field_key.trim(),
        label: fieldFormData.label.trim(),
        type: fieldFormData.type,
        placeholder: fieldFormData.placeholder.trim() || null,
        default_value: fieldFormData.default_value.trim() || null,
        required: fieldFormData.required,
        validation_rules,
        visibility_rules,
        readonly_rules,
        data_source,
        ui_config,
        field_order: order,
      };

      if (editingField) {
        const updated = await updateFormField(selectedForm.id, editingField.id, payload);
        setFormFields((prev) =>
          prev.map((f) => (f.id === editingField.id ? updated : f)).sort((a, b) => a.field_order - b.field_order)
        );
        toast.success("Champ modifié avec succès");
      } else {
        const created = await createFormField(selectedForm.id, payload);
        setFormFields((prev) => [...prev, created].sort((a, b) => a.field_order - b.field_order));
        toast.success("Champ ajouté avec succès");
      }
      setShowFieldDialogWithReset(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la sauvegarde du champ");
    } finally {
      setIsSavingField(false);
    }
    return {};
  };

  // Delete Field
  const handleDeleteField = (fieldId: string) => {
    setFieldToDelete(fieldId);
  };

  const handleConfirmDeleteField = async () => {
    if (!selectedForm || !fieldToDelete) return;
    try {
      setIsLoadingFields(true);
      await deleteFormField(selectedForm.id, fieldToDelete);
      setFormFields((prev) => prev.filter((f) => f.id !== fieldToDelete));
      toast.success("Champ supprimé avec succès");
      setFieldToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression");
    } finally {
      setIsLoadingFields(false);
    }
  };

  // Reorder fields (Move Up or Down)
  const handleMoveField = async (field: FormFieldResponse, direction: "up" | "down") => {
    if (!selectedForm) return;
    const index = formFields.findIndex((f) => f.id === field.id);
    if (index === -1) return;

    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === formFields.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newFields = [...formFields];

    // Swap fields in array
    const temp = newFields[index];
    newFields[index] = newFields[targetIndex];
    newFields[targetIndex] = temp;

    // Recalculate orders
    const updatedFields = newFields.map((f, idx) => ({
      ...f,
      field_order: idx,
    }));

    setFormFields(updatedFields);

    try {
      const orderedIds = updatedFields.map((f) => f.id);
      await reorderFormFields(selectedForm.id, orderedIds);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la réorganisation");
      // Rollback
      void loadFields(selectedForm.id);
    }
  };

  return {
    forms: filteredForms,
    isLoadingForms,
    searchTerm,
    setSearchTerm,
    selectedForm,
    handleSelectForm,
    formFields,
    isLoadingFields,
    showFormDialog,
    setShowFormDialog: setShowFormDialogWithReset,
    formFormErrors,
    clearFormFormError,
    editingForm,
    isSavingForm,
    formFormData,
    setFormFormData,
    handleOpenNewForm,
    handleOpenEditForm,
    handleCreateOrUpdateForm,
    handleDeleteForm,
    formToDelete,
    setFormToDelete,
    handleConfirmDeleteForm,
    showFieldDialog,
    setShowFieldDialog: setShowFieldDialogWithReset,
    fieldFormErrors,
    clearFieldFormError,
    editingField,
    isSavingField,
    fieldFormData,
    setFieldFormData,
    handleOpenNewField,
    handleOpenEditField,
    handleCreateOrUpdateField,
    handleDeleteField,
    fieldToDelete,
    setFieldToDelete,
    handleConfirmDeleteField,
    handleMoveField,
    refreshForms: loadForms,
  };
};
