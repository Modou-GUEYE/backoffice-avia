import { describe, it, expect } from "vitest";
import { firstErrorKey, isInvalidJson, INVALID_JSON_MESSAGE } from "./formValidation";
import {
  StepFormData,
  getStepErrorTab,
  validateDuplicateWorkflowForm,
  validateStepForm,
  validateWorkflowForm,
} from "./useWorkflows";
import { getFormFieldErrorTab, validateFormFieldForm, validateFormForm } from "./useForms";
import {
  getFieldDefinitionErrorTab,
  getFieldTypeErrorTab,
  validateFieldDefinitionForm,
  validateFieldTypeForm,
} from "./useFieldCatalog";
import {
  OperationFormData,
  getOperationErrorTab,
  validateImportSelection,
  validateIntegrationForm,
  validateOperationForm,
} from "./useIntegrations";
import { ImportOperationCandidate } from "../models/workflowsTypes";

describe("formValidation helpers", () => {
  it("isInvalidJson accepte une zone vide ou un JSON valide", () => {
    expect(isInvalidJson("")).toBe(false);
    expect(isInvalidJson("   ")).toBe(false);
    expect(isInvalidJson('{ "a": 1 }')).toBe(false);
    expect(isInvalidJson("{ a: 1 }")).toBe(true);
  });

  it("firstErrorKey renvoie le premier champ en erreur dans l'ordre d'insertion", () => {
    expect(firstErrorKey({})).toBeUndefined();
    expect(firstErrorKey({ b: "x", a: "y" })).toBe("b");
    expect(firstErrorKey({ a: undefined, b: "x" })).toBe("b");
  });
});

describe("validateWorkflowForm", () => {
  it("signale tous les champs obligatoires manquants à la création", () => {
    expect(validateWorkflowForm({ name: " ", service_version_id: "" }, { isEditing: false, serviceId: "" })).toEqual({
      name: "Le nom du workflow est obligatoire.",
      service: "Le service concerné est obligatoire.",
      service_version_id: "La version de service est obligatoire.",
    });
  });

  it("n'exige que le nom en modification", () => {
    expect(validateWorkflowForm({ name: "", service_version_id: "" }, { isEditing: true, serviceId: "" })).toEqual({
      name: "Le nom du workflow est obligatoire.",
    });
  });

  it("ne contrôle pas le service quand il n'est pas fourni", () => {
    expect(validateWorkflowForm({ name: "Wf", service_version_id: "v1" }, { isEditing: false })).toEqual({});
  });
});

describe("validateDuplicateWorkflowForm", () => {
  it("signale tous les champs obligatoires manquants", () => {
    expect(validateDuplicateWorkflowForm({ name: "", serviceId: "", serviceVersionId: " " })).toEqual({
      name: "Le nom de la copie du workflow est obligatoire.",
      service: "Le service concerné est obligatoire.",
      service_version_id: "La version de service cible est obligatoire.",
    });
  });

  it("ne renvoie aucune erreur pour un formulaire complet", () => {
    expect(validateDuplicateWorkflowForm({ name: "Copie", serviceId: "srv", serviceVersionId: "v1" })).toEqual({});
  });
});

describe("validateStepForm — valeurs techniques", () => {
  const base = { id: "a", key: "device_id", value_type: "string" as const, required: true };
  const step = {
    step_key: "s", step_type: "FORM", responsibility: "MOBILE", execution_mode: "INLINE", integration_id: "",
    integration_operation_id: "", title: "T", form_id: "f", runtime_outputs: [base], request_mapping: {},
    output_mapping: {}, output_mapping_entries: [], info_message: "", info_display_fields: [],
    confirmation_message: "", confirmation_summary_fields: [], config_str: "", condition_str: "", next_step_rules_str: "",
  } as StepFormData;

  it("accepte des clés snake_case uniques", () => {
    expect(validateStepForm({ ...step, runtime_outputs: [base, { ...base, id: "b", key: "app_version_2" }] })).toEqual({});
  });

  it("refuse une clé vide, mal formée ou en double", () => {
    const errors = validateStepForm({
      ...step,
      runtime_outputs: [{ ...base, key: "" }, { ...base, id: "b", key: "DeviceId" }, base, { ...base, id: "d" }],
    });
    expect(errors).toEqual({
      "runtime_outputs.0.key": "La clé est obligatoire",
      "runtime_outputs.1.key": "Clé en snake_case (minuscules, chiffres et _), ex. device_id",
      "runtime_outputs.3.key": "Cette clé est déjà utilisée",
    });
  });

  it("ignore les valeurs techniques des étapes qui ne sont pas FORM", () => {
    expect(validateStepForm({ ...step, step_type: "INFO", runtime_outputs: [{ ...base, key: "" }] })).toEqual({});
  });
});

describe("validateStepForm", () => {
  const baseStep: StepFormData = {
    step_key: "step_1",
    step_type: "FORM",
    responsibility: "MOBILE",
    execution_mode: "INLINE",
    integration_id: "",
    integration_operation_id: "",
    title: "Étape",
    form_id: "form-1",
    runtime_outputs: [],
    request_mapping: {},
    output_mapping: {},
    output_mapping_entries: [],
    info_message: "",
    info_display_fields: [],
    confirmation_message: "",
    confirmation_summary_fields: [],
    config_str: "",
    condition_str: "",
    next_step_rules_str: "",
  };

  it("signale la clé, le titre et le formulaire d'une étape FORM incomplète", () => {
    const errors = validateStepForm({ ...baseStep, step_key: "", title: " ", form_id: "" });
    expect(errors).toEqual({
      step_key: "La clé de l'étape est obligatoire",
      title: "Le titre est obligatoire",
      form_id: "Le formulaire associé est obligatoire",
    });
    expect(getStepErrorTab(errors)).toBe("general");
  });

  it("exige l'opération et le mode d'exécution d'une étape API", () => {
    expect(validateStepForm({ ...baseStep, step_type: "API", execution_mode: "", integration_operation_id: "" })).toEqual({
      execution_mode: "Le mode d'exécution est obligatoire",
      integration_operation_id: "L'opération est obligatoire",
    });
  });

  it("exige la source et le label de chaque champ récapitulatif et cible l'onglet Mapping", () => {
    const errors = validateStepForm({
      ...baseStep,
      step_type: "CONFIRMATION",
      form_id: "",
      confirmation_summary_fields: [
        { label: "Montant", from: "collected_data.amount", format: "", currency: "" },
        { label: "", from: "", format: "", currency: "" },
      ],
    });
    expect(errors).toEqual({
      "summary_fields.1.from": "La source est obligatoire",
      "summary_fields.1.label": "Le label est obligatoire",
    });
    expect(getStepErrorTab(errors)).toBe("mapping");
  });

  it("utilise les champs d'affichage pour une étape INFO", () => {
    const errors = validateStepForm({
      ...baseStep,
      step_type: "INFO",
      info_display_fields: [{ label: "Frais", from: "", format: "", currency: "" }],
    });
    expect(errors).toEqual({ "summary_fields.0.from": "La source est obligatoire" });
  });

  it("signale les JSON invalides et cible l'onglet Configurations JSON", () => {
    const errors = validateStepForm({
      ...baseStep,
      step_type: "API",
      integration_operation_id: "op-1",
      config_str: "{",
      condition_str: "nope",
      next_step_rules_str: '{"default_next": "x"}',
    });
    expect(errors).toEqual({ config_str: INVALID_JSON_MESSAGE, condition_str: INVALID_JSON_MESSAGE });
    expect(getStepErrorTab(errors)).toBe("json");
  });

  it("ignore la configuration JSON d'une étape FORM (générée à partir du formulaire)", () => {
    expect(validateStepForm({ ...baseStep, config_str: "{" })).toEqual({});
  });

  it("privilégie l'onglet Général quand plusieurs onglets ont des erreurs", () => {
    const errors = validateStepForm({ ...baseStep, title: "", condition_str: "{" });
    expect(getStepErrorTab(errors)).toBe("general");
    expect(getStepErrorTab({})).toBeUndefined();
  });
});

describe("validateFormForm / validateFormFieldForm", () => {
  it("exige le code et le titre du formulaire", () => {
    expect(validateFormForm({ code: "", title: "" })).toEqual({
      code: "Le code est obligatoire",
      title: "Le titre est obligatoire",
    });
    expect(validateFormForm({ code: "C", title: "T" })).toEqual({});
  });

  const baseField = {
    field_key: "ninea",
    label: "NINEA",
    type: "text",
    validation_rules_str: "",
    visibility_rules_str: "",
    readonly_rules_str: "",
    data_source_str: "",
  };

  it("exige la clé, le libellé et le type du champ", () => {
    const errors = validateFormFieldForm({ ...baseField, field_key: "", label: "", type: "" });
    expect(errors).toEqual({
      field_key: "La clé technique est obligatoire",
      label: "Le libellé est obligatoire",
      type: "Le type de champ est obligatoire",
    });
    expect(getFormFieldErrorTab(errors)).toBe("general");
  });

  it("signale les règles JSON invalides et cible l'onglet Règles JSON", () => {
    const errors = validateFormFieldForm({ ...baseField, visibility_rules_str: "{", data_source_str: "[1," });
    expect(errors).toEqual({
      visibility_rules_str: INVALID_JSON_MESSAGE,
      data_source_str: INVALID_JSON_MESSAGE,
    });
    expect(getFormFieldErrorTab(errors)).toBe("rules");
  });
});

describe("validateFieldTypeForm / validateFieldDefinitionForm", () => {
  const baseType = {
    code: "TEXT",
    label: "Texte",
    renderer_key: "TEXT_INPUT",
    value_type: "STRING",
    validation_schema_str: "",
    ui_schema_str: "",
    data_source_schema_str: "",
    default_ui_config_str: "",
  };

  it("exige le code (à la création), le libellé, la clé et le type de valeur", () => {
    const empty = { ...baseType, code: "", label: "", renderer_key: "", value_type: "" };
    expect(validateFieldTypeForm(empty, false)).toEqual({
      code: "Le code est obligatoire",
      label: "Le libellé est obligatoire",
      renderer_key: "La clé est obligatoire",
      value_type: "Le type de valeur est obligatoire",
    });
    expect(validateFieldTypeForm(empty, true)).not.toHaveProperty("code");
  });

  it("signale les schémas JSON invalides et cible l'onglet Schémas JSON", () => {
    const errors = validateFieldTypeForm({ ...baseType, ui_schema_str: "{", default_ui_config_str: "x" }, false);
    expect(errors).toEqual({ ui_schema_str: INVALID_JSON_MESSAGE, default_ui_config_str: INVALID_JSON_MESSAGE });
    expect(getFieldTypeErrorTab(errors)).toBe("json");
    expect(getFieldTypeErrorTab({ label: "x", ui_schema_str: "y" })).toBe("general");
  });

  const baseDefinition = {
    field_key: "ninea",
    label: "NINEA",
    field_type_id: "type-1",
    validation_rules_str: "",
    data_source_str: "",
    ui_config_str: "",
  };

  it("exige la clé, le libellé et le type de la définition", () => {
    expect(validateFieldDefinitionForm({ ...baseDefinition, field_key: "", label: "", field_type_id: "" })).toEqual({
      field_key: "La clé technique est obligatoire",
      label: "Le libellé est obligatoire",
      field_type_id: "Le type de champ est obligatoire",
    });
  });

  it("signale les règles JSON invalides de la définition", () => {
    const errors = validateFieldDefinitionForm({ ...baseDefinition, validation_rules_str: "{", ui_config_str: "{}" });
    expect(errors).toEqual({ validation_rules_str: INVALID_JSON_MESSAGE });
    expect(getFieldDefinitionErrorTab(errors)).toBe("json");
  });
});

describe("validateIntegrationForm / validateOperationForm / validateImportSelection", () => {
  it("exige la clé (à la création), le libellé et l'URL de base de l'intégration", () => {
    expect(validateIntegrationForm({ key: "", label: "", base_url: " " }, false)).toEqual({
      key: "La clé unique est obligatoire",
      label: "Le libellé est obligatoire",
      base_url: "L'URL de base est obligatoire",
    });
    expect(validateIntegrationForm({ key: "", label: "L", base_url: "http://x" }, true)).toEqual({});
  });

  const baseOperation: OperationFormData = {
    key: "calc",
    label: "Calcul",
    method: "POST",
    relative_path: "/v1/calc",
    completion_mode: "IMMEDIATE",
    authorization_mode: "NONE",
    operation_id_field: "",
    status_path: "",
    status_field: "status",
    result_field: "",
    error_code_field: "",
    error_message_field: "",
    event_topic: "",
    timeout_seconds: 10,
    poll_interval_seconds: 5,
    completion_timeout_seconds: 300,
    request_schema_str: "",
    response_schema_str: "",
    active: true,
  };

  it("exige tous les champs obligatoires de l'opération", () => {
    const errors = validateOperationForm(
      { ...baseOperation, key: "", label: "", method: "", relative_path: "", completion_mode: "", authorization_mode: "" },
      false
    );
    expect(errors).toEqual({
      key: "La clé unique est obligatoire",
      label: "Le libellé est obligatoire",
      method: "La méthode est obligatoire",
      relative_path: "Le chemin relatif est obligatoire",
      completion_mode: "Le mode de complétion est obligatoire",
      authorization_mode: "Le mode d'autorisation est obligatoire",
    });
    expect(getOperationErrorTab(errors)).toBe("general");
  });

  it("signale les schémas JSON invalides et cible l'onglet Schémas JSON", () => {
    const errors = validateOperationForm({ ...baseOperation, request_schema_str: "{", response_schema_str: "x" }, true);
    expect(errors).toEqual({
      request_schema_str: "Schéma de requête invalide (JSON)",
      response_schema_str: "Schéma de réponse invalide (JSON)",
    });
    expect(getOperationErrorTab(errors)).toBe("schemas");
  });

  it("exige une opération puis, si demandé, un code de réponse pour l'import", () => {
    const candidate = {
      key: "op",
      label: "Op",
      method: "GET",
      relative_path: "/op",
      requires_response_selection: true,
      response_options: [{ status_code: "200", response_schema: null }],
    } as unknown as ImportOperationCandidate;

    expect(validateImportSelection(null, null)).toEqual({
      candidate: "Veuillez sélectionner une opération à importer.",
    });
    expect(validateImportSelection(candidate, null)).toEqual({
      response_code: "Veuillez sélectionner un code de réponse avant de continuer.",
    });
    expect(validateImportSelection(candidate, "200")).toEqual({});
    expect(validateImportSelection({ ...candidate, requires_response_selection: false }, null)).toEqual({});
  });
});
