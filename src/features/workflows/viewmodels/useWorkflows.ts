import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { FieldErrors, hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import { INVALID_JSON_MESSAGE, firstErrorKey, isInvalidJson } from "./formValidation";
import {
  WorkflowResponse,
  WorkflowStepResponse,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  DuplicateWorkflowRequest,
  CreateWorkflowStepRequest,
  UpdateWorkflowStepRequest,
  WorkflowMappingContextResponse,
  IntegrationItem,
  IntegrationOperationItem,
  StepType,
  RuntimeOutput,
  KNOWN_RUNTIME_OUTPUT_KEYS,
  RuntimeOutputValueType,
  StepResponsibility,
  StepExecutionMode,
  InfoDisplayField,
  InfoStepConfig,
  ConfirmationSummaryField,
  ConfirmationStepConfig,
  FormStepConfig,
} from "../models/workflowsTypes";
import { FormResponse } from "../models/formsTypes";
import { fetchForms } from "../services/formsService";
import {
  fetchWorkflows,
  fetchWorkflowDetails,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  activateWorkflow,
  deactivateWorkflow,
  setDefaultWorkflow,
  duplicateWorkflow,
  assignWorkflowPaymentFlow,
  unassignWorkflowPaymentFlow,
  fetchWorkflowSteps,
  createWorkflowStep,
  updateWorkflowStep,
  deleteWorkflowStep,
  reorderWorkflowSteps,
  fetchStepMappingContext,
  previewStepMappingContext,
  fetchActiveIntegrations,
  fetchIntegrationOperations,
} from "../services/workflowsService";

// Élément brut de summary_fields / display_fields tel que renvoyé dans la config de l'étape
interface RawSummaryFieldConfig {
  label?: unknown;
  name?: string;
  key?: string;
  from?: unknown;
  path?: string;
  source?: string;
  format?: unknown;
  currency?: unknown;
}

export interface OutputMappingEntry {
  id: string;
  targetKey: string;
  from: string;
}

export interface RuntimeOutputEntry {
  id: string;
  key: string;
  value_type: RuntimeOutputValueType;
  required: boolean;
  /** Saisie libre de la clé (hors liste connue) ; non envoyé au backend. */
  custom?: boolean;
}

/** Format imposé par le backend pour la clé d'une valeur technique (snake_case). */
export const RUNTIME_OUTPUT_KEY_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;

export interface StepFormData {
  step_key: string;
  step_type: StepType;
  responsibility: StepResponsibility;
  execution_mode: StepExecutionMode;
  integration_id: string;
  integration_operation_id: string;
  title: string;
  form_id: string;
  runtime_outputs: RuntimeOutputEntry[];
  request_mapping: Record<string, { from?: string; value?: unknown }>;
  output_mapping: Record<string, { from?: string }>;
  output_mapping_entries: OutputMappingEntry[];
  info_message: string;
  info_display_fields: InfoDisplayField[];
  confirmation_message: string;
  confirmation_summary_fields: ConfirmationSummaryField[];
  config_str: string;
  condition_str: string;
  next_step_rules_str: string;
}

export type WorkflowFormField = "name" | "service" | "service_version_id";

/**
 * Valide le formulaire de création / modification d'un workflow et renvoie toutes les erreurs, par champ.
 * Le service et la version ne sont exigés qu'à la création ; le service n'est contrôlé que s'il est fourni.
 */
export const validateWorkflowForm = (
  form: { name: string; service_version_id: string },
  options: { isEditing: boolean; serviceId?: string }
): FieldErrors<WorkflowFormField> => {
  const errors: FieldErrors<WorkflowFormField> = {};
  if (!form.name.trim()) errors.name = "Le nom du workflow est obligatoire.";
  if (!options.isEditing) {
    if (options.serviceId !== undefined && !options.serviceId.trim()) {
      errors.service = "Le service concerné est obligatoire.";
    }
    if (!form.service_version_id.trim()) {
      errors.service_version_id = "La version de service est obligatoire.";
    }
  }
  return errors;
};

export type DuplicateWorkflowFormField = "name" | "service" | "service_version_id";

/** Valide le formulaire de duplication d'un workflow et renvoie toutes les erreurs, par champ. */
export const validateDuplicateWorkflowForm = (form: {
  name: string;
  serviceId: string;
  serviceVersionId: string;
}): FieldErrors<DuplicateWorkflowFormField> => {
  const errors: FieldErrors<DuplicateWorkflowFormField> = {};
  if (!form.name.trim()) errors.name = "Le nom de la copie du workflow est obligatoire.";
  if (!form.serviceId.trim()) errors.service = "Le service concerné est obligatoire.";
  if (!form.serviceVersionId.trim()) {
    errors.service_version_id = "La version de service cible est obligatoire.";
  }
  return errors;
};

export type StepSummaryFieldError = `summary_fields.${number}.${"from" | "label"}`;

export type RuntimeOutputError = `runtime_outputs.${number}.key`;

/** Clé d'erreur de la clé d'une valeur technique (étape FORM). */
export const runtimeOutputErrorKey = (index: number): RuntimeOutputError => `runtime_outputs.${index}.key`;

export type StepFormField =
  | "step_key"
  | "step_type"
  | "title"
  | "form_id"
  | RuntimeOutputError
  | "execution_mode"
  | "integration_operation_id"
  | StepSummaryFieldError
  | "config_str"
  | "condition_str"
  | "next_step_rules_str";

export type StepDialogTab = "general" | "mapping" | "json";

/** Clé d'erreur d'une ligne de champ récapitulatif (étapes INFO / CONFIRMATION). */
export const stepSummaryFieldErrorKey = (index: number, field: "from" | "label"): StepSummaryFieldError =>
  `summary_fields.${index}.${field}`;

const isStepSummaryFieldError = (key: string): key is StepSummaryFieldError => key.startsWith("summary_fields.");

/** Valide le formulaire d'étape de workflow et renvoie toutes les erreurs, par champ (dans l'ordre des onglets). */
export const validateStepForm = (form: StepFormData): FieldErrors<StepFormField> => {
  const errors: FieldErrors<StepFormField> = {};
  const isApi = form.step_type === "API";
  const isForm = form.step_type === "FORM";
  const isInfo = form.step_type === "INFO";
  const isConfirmation = form.step_type === "CONFIRMATION";

  // Onglet Général
  if (!form.step_key.trim()) errors.step_key = "La clé de l'étape est obligatoire";
  if (!form.step_type.trim()) errors.step_type = "Le type d'étape est obligatoire";
  if (!form.title.trim()) errors.title = "Le titre est obligatoire";
  if (isForm && !form.form_id?.trim()) errors.form_id = "Le formulaire associé est obligatoire";
  if (isForm) {
    const seen = new Set<string>();
    (form.runtime_outputs || []).forEach((output, index) => {
      const key = output.key.trim();
      if (!key) errors[runtimeOutputErrorKey(index)] = "La clé est obligatoire";
      else if (!RUNTIME_OUTPUT_KEY_PATTERN.test(key)) {
        errors[runtimeOutputErrorKey(index)] = "Clé en snake_case (minuscules, chiffres et _), ex. device_id";
      } else if (seen.has(key)) errors[runtimeOutputErrorKey(index)] = "Cette clé est déjà utilisée";
      seen.add(key);
    });
  }
  if (isApi) {
    if (!form.execution_mode) errors.execution_mode = "Le mode d'exécution est obligatoire";
    if (!form.integration_operation_id) {
      errors.integration_operation_id = "L'opération est obligatoire";
    }
  }

  // Onglet Mapping des données (champs récapitulatifs)
  if (isInfo || isConfirmation) {
    const rows = isInfo ? form.info_display_fields : form.confirmation_summary_fields;
    (rows || []).forEach((row, index) => {
      if (!row.from?.trim()) errors[stepSummaryFieldErrorKey(index, "from")] = "La source est obligatoire";
      if (!row.label?.trim()) errors[stepSummaryFieldErrorKey(index, "label")] = "Le label est obligatoire";
    });
  }

  // Onglet Configurations JSON
  if (!isForm && isInvalidJson(form.config_str)) errors.config_str = INVALID_JSON_MESSAGE;
  if (isInvalidJson(form.condition_str)) errors.condition_str = INVALID_JSON_MESSAGE;
  if (isInvalidJson(form.next_step_rules_str)) errors.next_step_rules_str = INVALID_JSON_MESSAGE;

  return errors;
};

/** Onglet du dialogue d'étape qui contient le premier champ en erreur. */
export const getStepErrorTab = (errors: FieldErrors<StepFormField>): StepDialogTab | undefined => {
  const key = firstErrorKey(errors);
  if (!key) return undefined;
  if (isStepSummaryFieldError(key)) return "mapping";
  if (key === "config_str" || key === "condition_str" || key === "next_step_rules_str") return "json";
  return "general";
};

export const useWorkflows = (options?: {
  enabled?: boolean;
  serviceVersionId?: string;
  structureId?: string;
}) => {
  const enabled = options?.enabled ?? true;
  const initialVersionId = options?.serviceVersionId;
  const initialStructureId = options?.structureId;

  // Workflows list state
  const [workflows, setWorkflows] = useState<WorkflowResponse[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVersionId, setFilterVersionId] = useState<string>(initialVersionId || "");
  const [filterStructureId, setFilterStructureId] = useState<string>(initialStructureId || "");

  // Update filterVersionId when options change
  useEffect(() => {
    if (options?.serviceVersionId !== undefined) {
      setFilterVersionId(options.serviceVersionId);
    }
  }, [options?.serviceVersionId]);

  // Update filterStructureId when options change
  useEffect(() => {
    if (options?.structureId !== undefined) {
      setFilterStructureId(options.structureId);
    }
  }, [options?.structureId]);

  // Selection state
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowResponse | null>(null);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStepResponse[]>([]);
  const [isLoadingSteps, setIsLoadingSteps] = useState(false);
  const [stepResponsibilityFilter, setStepResponsibilityFilter] = useState<"ALL" | "MOBILE" | "SYSTEM">("ALL");

  // Effective structure ID: scoped to selected workflow or current filter
  const currentStructureId = useMemo(() => {
    return selectedWorkflow?.structure_id || filterStructureId || undefined;
  }, [selectedWorkflow?.structure_id, filterStructureId]);

  // Workflow creation/edition state
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowResponse | null>(null);
  const [isSavingWorkflow, setIsSavingWorkflow] = useState(false);
  const [workflowFormData, setWorkflowFormData] = useState({
    name: "",
    service_version_id: "",
    workflow_type: "STANDARD",
    structure_id: initialStructureId || "",
    definition_kind: (initialStructureId ? "WORKFLOW" : "TEMPLATE") as "WORKFLOW" | "TEMPLATE" | string,
  });

  // Step creation/edition state
  const [showStepDialog, setShowStepDialog] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStepResponse | null>(null);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [stepFormData, setStepFormData] = useState<StepFormData>({
    step_key: "",
    step_type: "FORM",
    responsibility: "MOBILE",
    execution_mode: "INLINE",
    integration_id: "",
    integration_operation_id: "",
    title: "",
    form_id: "",
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
  });

  const {
    errors: stepFormErrors,
    setErrors: setStepFormErrors,
    clearError: clearStepFormError,
    resetErrors: resetStepFormErrors,
  } = useFieldErrors<StepFormField>();

  /** Efface les erreurs d'étape dont la clé vérifie le prédicat (ex. lignes de champs récapitulatifs). */
  const clearStepFormErrorsWhere = useCallback(
    (predicate: (key: StepFormField) => boolean) => {
      setStepFormErrors((prev) => {
        const keys = Object.keys(prev) as StepFormField[];
        if (!keys.some(predicate)) return prev;
        const next: FieldErrors<StepFormField> = {};
        keys.forEach((key) => {
          if (!predicate(key)) next[key] = prev[key];
        });
        return next;
      });
    },
    [setStepFormErrors]
  );

  /** Les erreurs des valeurs techniques sont indexées par ligne : elles ne suivent pas une ligne supprimée. */
  const clearStepRuntimeOutputErrors = useCallback(
    () => clearStepFormErrorsWhere((key) => key.startsWith("runtime_outputs.")),
    [clearStepFormErrorsWhere]
  );

  const clearStepSummaryFieldErrors = useCallback(
    () => clearStepFormErrorsWhere(isStepSummaryFieldError),
    [clearStepFormErrorsWhere]
  );

  const setShowStepDialogWithReset = (open: boolean) => {
    // Chaque ouverture ou fermeture repart d'un formulaire sans erreur affichée
    resetStepFormErrors();
    setShowStepDialog(open);
  };

  // Forms for FORM steps
  const [forms, setForms] = useState<FormResponse[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);

  // Integrations & Operations for API steps
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);
  const [operations, setOperations] = useState<IntegrationOperationItem[]>([]);
  const [isLoadingOperations, setIsLoadingOperations] = useState(false);

  // Mapping context
  const [mappingContext, setMappingContext] = useState<WorkflowMappingContextResponse | null>(null);
  const [isLoadingMappingContext, setIsLoadingMappingContext] = useState(false);

  // Deletion confirmation state
  const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);
  const [stepToDelete, setStepToDelete] = useState<string | null>(null);

  // Load forms for FORM steps
  const loadForms = useCallback(async () => {
    try {
      setIsLoadingForms(true);
      const data = await fetchForms();
      setForms(data);
      return data;
    } catch (error) {
      console.error("[useWorkflows] Erreur chargement formulaires:", error);
      toast.error("Impossible de charger les formulaires");
      return [];
    } finally {
      setIsLoadingForms(false);
    }
  }, []);

  // Load active integrations
  const loadIntegrations = useCallback(async () => {
    try {
      setIsLoadingIntegrations(true);
      const data = await fetchActiveIntegrations();
      setIntegrations(data);
      return data;
    } catch {
      // Ignorer silencieusement si la table n'a pas encore de données
      return [];
    } finally {
      setIsLoadingIntegrations(false);
    }
  }, []);

  // Load operations for an integration
  const loadOperations = useCallback(async (integrationId: string) => {
    if (!integrationId) {
      setOperations([]);
      return;
    }
    try {
      setIsLoadingOperations(true);
      const data = await fetchIntegrationOperations(integrationId);
      setOperations(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur chargement opérations");
      setOperations([]);
    } finally {
      setIsLoadingOperations(false);
    }
  }, []);

  // Load mapping context for a step
  const loadMappingContext = useCallback(
    async (workflowId: string, stepId: string, structId?: string) => {
      try {
        setIsLoadingMappingContext(true);
        const effectiveStructId = structId !== undefined ? structId : currentStructureId;
        const data = effectiveStructId
          ? await fetchStepMappingContext(workflowId, stepId, effectiveStructId)
          : await fetchStepMappingContext(workflowId, stepId);
        setMappingContext(data);
        return data;
      } catch (err) {
        console.warn("Impossible de charger le contexte de mapping:", err);
        setMappingContext(null);
        return null;
      } finally {
        setIsLoadingMappingContext(false);
      }
    },
    [currentStructureId]
  );

  // Preview mapping context for a step (e.g. before creation or with new operation)
  const loadPreviewMappingContext = useCallback(
    async (
      workflowId: string,
      stepOrder: number,
      stepType: StepType,
      operationId?: string | null,
      structId?: string
    ) => {
      try {
        setIsLoadingMappingContext(true);
        const effectiveStructId = structId !== undefined ? structId : currentStructureId;
        const payload = {
          step_order: stepOrder,
          step_type: stepType,
          integration_operation_id: stepType === "API" ? (operationId || null) : null,
        };
        const data = effectiveStructId
          ? await previewStepMappingContext(workflowId, payload, effectiveStructId)
          : await previewStepMappingContext(workflowId, payload);
        setMappingContext(data);
        return data;
      } catch (err) {
        console.warn("Impossible de prévisualiser le contexte de mapping:", err);
        setMappingContext(null);
        return null;
      } finally {
        setIsLoadingMappingContext(false);
      }
    },
    [currentStructureId]
  );

  // Load context for current step (either existing step mapping context or preview for new step)
  const loadStepContext = useCallback(
    async (stepType?: StepType, operationId?: string | null) => {
      if (!selectedWorkflow) return null;

      const type = (stepType || stepFormData.step_type) as StepType;
      const opId = operationId !== undefined ? operationId : stepFormData.integration_operation_id;
      const structId = selectedWorkflow.structure_id || currentStructureId;

      if (
        editingStep &&
        (!stepType || stepType === editingStep.step_type) &&
        (operationId === undefined || operationId === editingStep.integration_operation_id)
      ) {
        return await loadMappingContext(selectedWorkflow.id, editingStep.id, structId);
      }

      const stepOrder = editingStep
        ? editingStep.step_order
        : workflowSteps.length > 0
        ? Math.max(...workflowSteps.map((s) => s.step_order)) + 1
        : 1;

      return await loadPreviewMappingContext(selectedWorkflow.id, stepOrder, type, opId, structId);
    },
    [
      selectedWorkflow,
      editingStep,
      stepFormData.step_type,
      stepFormData.integration_operation_id,
      workflowSteps,
      currentStructureId,
      loadMappingContext,
      loadPreviewMappingContext,
    ]
  );


  // Load workflows for a specific service version or current filter
  const loadWorkflows = useCallback(
    async (vId?: string, sId?: string) => {
      const versionIdToUse = vId !== undefined ? vId : filterVersionId;
      const structureIdToUse = sId !== undefined ? sId : filterStructureId;
      try {
        setIsLoadingWorkflows(true);
        // Filtres facultatifs dans le contrat : sans version, l'API renvoie tous les workflows
        const data = await fetchWorkflows(versionIdToUse || undefined, structureIdToUse || undefined);
        setWorkflows(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erreur lors du chargement des workflows");
      } finally {
        setIsLoadingWorkflows(false);
      }
    },
    [filterVersionId, filterStructureId]
  );

  // Load steps for a workflow
  const loadSteps = useCallback(
    async (workflowId: string, resp?: "ALL" | "MOBILE" | "SYSTEM", structId?: string) => {
      try {
        setIsLoadingSteps(true);
        const targetResp = resp ?? stepResponsibilityFilter;
        const targetStructId = structId !== undefined ? structId : currentStructureId;
        const data = targetStructId
          ? await fetchWorkflowSteps(workflowId, targetResp, targetStructId)
          : await fetchWorkflowSteps(workflowId, targetResp);
        // Sort steps by step_order ascending
        const sorted = [...data].sort((a, b) => a.step_order - b.step_order);
        setWorkflowSteps(sorted);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erreur lors du chargement des étapes");
      } finally {
        setIsLoadingSteps(false);
      }
    },
    [stepResponsibilityFilter, currentStructureId]
  );

  // Filter steps by responsibility
  const handleFilterResponsibility = (resp: "ALL" | "MOBILE" | "SYSTEM") => {
    setStepResponsibilityFilter(resp);
    if (selectedWorkflow) {
      void loadSteps(selectedWorkflow.id, resp, selectedWorkflow.structure_id || currentStructureId);
    }
  };

  // Load initial data
  useEffect(() => {
    if (!enabled) return;
    void loadWorkflows(filterVersionId, filterStructureId);
  }, [enabled, filterVersionId, filterStructureId, loadWorkflows]);

  // Handle workflow selection
  const handleSelectWorkflow = async (wf: WorkflowResponse | null) => {
    if (!wf) {
      setSelectedWorkflow(null);
      setWorkflowSteps([]);
      return;
    }
    const structId = wf.structure_id || filterStructureId || undefined;
    try {
      const details = await fetchWorkflowDetails(wf.id, structId);
      setSelectedWorkflow(details);
      void loadSteps(details.id, undefined, details.structure_id || structId);
    } catch {
      setSelectedWorkflow(wf);
      void loadSteps(wf.id, undefined, structId);
    }
  };

  // Filtered workflows list
  const filteredWorkflows = useMemo(() => {
    if (!searchTerm.trim()) return workflows;
    const term = searchTerm.toLowerCase();
    return workflows.filter(
      (w) =>
        w.name.toLowerCase().includes(term) ||
        w.workflow_type.toLowerCase().includes(term) ||
        w.status.toLowerCase().includes(term) ||
        w.service_version_id.toLowerCase().includes(term)
    );
  }, [workflows, searchTerm]);

  // Open dialog for new workflow
  const handleOpenNewWorkflow = () => {
    setEditingWorkflow(null);
    setWorkflowFormData({
      name: "",
      service_version_id: "",
      workflow_type: "STANDARD",
      structure_id: filterStructureId || "",
      definition_kind: filterStructureId ? "WORKFLOW" : "TEMPLATE",
    });
    setShowWorkflowDialog(true);
  };

  // Open dialog for editing workflow
  const handleOpenEditWorkflow = (wf: WorkflowResponse) => {
    setEditingWorkflow(wf);
    setWorkflowFormData({
      name: wf.name,
      service_version_id: wf.service_version_id,
      workflow_type: wf.workflow_type || "STANDARD",
      structure_id: wf.structure_id || "",
      definition_kind: wf.definition_kind || (wf.structure_id ? "WORKFLOW" : "TEMPLATE"),
    });
    setShowWorkflowDialog(true);
  };

  // Create or Update Workflow
  const handleCreateOrUpdateWorkflow = async () => {
    // Garde-fou : les erreurs par champ sont affichées par le dialogue avant l'appel
    if (hasFieldErrors(validateWorkflowForm(workflowFormData, { isEditing: Boolean(editingWorkflow) }))) {
      return;
    }

    try {
      setIsSavingWorkflow(true);

      if (editingWorkflow) {
        const payload: UpdateWorkflowRequest = {
          name: workflowFormData.name.trim(),
          workflow_type: workflowFormData.workflow_type.trim() || null,
        };
        const structId = editingWorkflow.structure_id || undefined;
        const updated = await updateWorkflow(editingWorkflow.id, payload, structId);

        setWorkflows((prev) => prev.map((w) => (w.id === editingWorkflow.id ? updated : w)));
        if (selectedWorkflow?.id === editingWorkflow.id) {
          setSelectedWorkflow(updated);
        }
        toast.success("Workflow modifié avec succès");
      } else {
        const targetStructureId = (workflowFormData.structure_id || "").trim() || null;
        const payload: CreateWorkflowRequest = {
          name: workflowFormData.name.trim(),
          service_version_id: workflowFormData.service_version_id.trim(),
          structure_id: targetStructureId,
          definition_kind: targetStructureId ? "WORKFLOW" : "TEMPLATE",
          workflow_type: workflowFormData.workflow_type.trim() || "STANDARD",
        };
        const created = await createWorkflow(payload);

        if (targetStructureId) {
          setFilterStructureId(targetStructureId);
        }
        setWorkflows((prev) => [created, ...prev]);
        handleSelectWorkflow(created);
        toast.success("Workflow créé avec succès");
      }
      setShowWorkflowDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la sauvegarde du workflow");
    } finally {
      setIsSavingWorkflow(false);
    }
  };

  // Duplicate Workflow
  const handleDuplicateWorkflow = async (
    sourceWorkflowId: string,
    payload: DuplicateWorkflowRequest,
    sourceStructureId?: string
  ): Promise<WorkflowResponse> => {
    try {
      setIsSavingWorkflow(true);
      const targetSourceStructId =
        sourceStructureId !== undefined
          ? sourceStructureId
          : workflows.find((w) => w.id === sourceWorkflowId)?.structure_id || currentStructureId;
      const duplicated = await duplicateWorkflow(sourceWorkflowId, payload, targetSourceStructId);
      setWorkflows((prev) => [duplicated, ...prev]);
      toast.success("Workflow dupliqué avec succès");
      return duplicated;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la duplication du workflow");
      throw error;
    } finally {
      setIsSavingWorkflow(false);
    }
  };

  // Delete Workflow
  const handleDeleteWorkflow = (workflowId: string) => {
    setWorkflowToDelete(workflowId);
  };

  const handleConfirmDeleteWorkflow = async () => {
    if (!workflowToDelete) return;
    try {
      setIsLoadingWorkflows(true);
      const targetWf = workflows.find((w) => w.id === workflowToDelete);
      await deleteWorkflow(workflowToDelete, targetWf?.structure_id || currentStructureId);
      setWorkflows((prev) => prev.filter((w) => w.id !== workflowToDelete));
      if (selectedWorkflow?.id === workflowToDelete) {
        setSelectedWorkflow(null);
        setWorkflowSteps([]);
      }
      toast.success("Workflow supprimé avec succès");
      setWorkflowToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression du workflow");
    } finally {
      setIsLoadingWorkflows(false);
    }
  };

  // Activate Workflow
  const handleActivateWorkflow = async (workflowId: string) => {
    try {
      const targetWf = workflows.find((w) => w.id === workflowId);
      const updated = await activateWorkflow(workflowId, targetWf?.structure_id || currentStructureId);
      setWorkflows((prev) => prev.map((w) => (w.id === workflowId ? updated : w)));
      if (selectedWorkflow?.id === workflowId) {
        setSelectedWorkflow(updated);
      }
      toast.success("Workflow activé avec succès");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'activation du workflow");
    }
  };

  // Deactivate Workflow
  const handleDeactivateWorkflow = async (workflowId: string) => {
    try {
      const targetWf = workflows.find((w) => w.id === workflowId);
      const updated = await deactivateWorkflow(workflowId, targetWf?.structure_id || currentStructureId);
      setWorkflows((prev) => prev.map((w) => (w.id === workflowId ? updated : w)));
      if (selectedWorkflow?.id === workflowId) {
        setSelectedWorkflow(updated);
      }
      toast.success("Workflow désactivé avec succès");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la désactivation du workflow");
    }
  };

  // Set Default Workflow
  const handleSetDefaultWorkflow = async (workflowId: string) => {
    try {
      const targetWf = workflows.find((w) => w.id === workflowId);
      const updated = await setDefaultWorkflow(workflowId, targetWf?.structure_id || currentStructureId);
      // Refresh workflows list as default status may shift across same version
      void loadWorkflows(undefined, filterStructureId);
      if (selectedWorkflow?.id === workflowId) {
        setSelectedWorkflow(updated);
      }
      toast.success("Workflow défini comme workflow par défaut");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du changement du workflow par défaut");
    }
  };

  // Assign Payment Flow directly
  const handleAssignPaymentFlow = async (workflowId: string, paymentFlowId: string) => {
    try {
      const updated = await assignWorkflowPaymentFlow(workflowId, paymentFlowId);
      setWorkflows((prev) => prev.map((w) => (w.id === workflowId ? updated : w)));
      if (selectedWorkflow?.id === workflowId) {
        setSelectedWorkflow(updated);
      }
      toast.success("Flux de paiement assigné au workflow");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'assignation du flux de paiement");
    }
  };

  // Unassign Payment Flow
  const handleUnassignPaymentFlow = async (workflowId: string) => {
    try {
      const updated = await unassignWorkflowPaymentFlow(workflowId);
      setWorkflows((prev) => prev.map((w) => (w.id === workflowId ? updated : w)));
      if (selectedWorkflow?.id === workflowId) {
        setSelectedWorkflow(updated);
      }
      toast.success("Flux de paiement dissocié du workflow");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la dissociation du flux de paiement");
    }
  };

  // Open dialog for new step
  const handleOpenNewStep = () => {
    if (!selectedWorkflow) return;
    setEditingStep(null);
    setMappingContext(null);
    setOperations([]);
    setStepFormData({
      step_key: "",
      step_type: "FORM",
      responsibility: "MOBILE",
      execution_mode: "INLINE",
      integration_id: "",
      integration_operation_id: "",
      title: "",
      form_id: "",
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
    });
    void loadForms();
    void loadIntegrations();
    setShowStepDialogWithReset(true);
  };

  // Open dialog for editing step
  const handleOpenEditStep = async (step: WorkflowStepResponse) => {
    setEditingStep(step);
    setMappingContext(null);

    const isApi = step.step_type === "API";
    const isInfo = step.step_type === "INFO";
    const isConfirmation = step.step_type === "CONFIRMATION";
    const isForm = step.step_type === "FORM";
    const cfg = (step.config && typeof step.config === "object") ? (step.config as Record<string, unknown>) : {};
    const formId = typeof cfg.form_id === "string" ? cfg.form_id : "";
    // Valeurs techniques : propres aux étapes FORM, les autres étapes gardent leur config telle quelle
    const runtimeOutputs: RuntimeOutputEntry[] =
      isForm && Array.isArray(cfg.runtime_outputs)
        ? (cfg.runtime_outputs as Partial<RuntimeOutput>[]).map((o, idx) => ({
            id: `rt_${idx}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            key: o.key ?? "",
            value_type: o.value_type ?? "string",
            required: o.required ?? true,
            custom: !KNOWN_RUNTIME_OUTPUT_KEYS.some((k) => k.key === o.key),
          }))
        : [];
    const reqMap = (cfg.request_mapping && typeof cfg.request_mapping === "object")
      ? (cfg.request_mapping as Record<string, { from?: string; value?: unknown }>)
      : {};
    const outMap = (cfg.output_mapping && typeof cfg.output_mapping === "object")
      ? (cfg.output_mapping as Record<string, { from?: string }>)
      : {};

    const outEntries: OutputMappingEntry[] = Object.entries(outMap).map(([k, v], idx) => ({
      id: `out_${idx}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      targetKey: k,
      from: v?.from || "",
    }));

    const infoMsg = typeof cfg.message === "string" ? cfg.message : "";
    const rawInfoFields = Array.isArray(cfg.summary_fields)
      ? cfg.summary_fields
      : Array.isArray(cfg.display_fields)
      ? cfg.display_fields
      : [];
    const infoFields: InfoDisplayField[] = rawInfoFields.length > 0
      ? (rawInfoFields as RawSummaryFieldConfig[])
          .filter((f) => typeof f === "object" && f !== null && (f.from || f.path || f.source))
          .map((f) => ({
            label: typeof f?.label === "string" ? f.label : (f?.name || f?.key || ""),
            from: typeof f?.from === "string" ? f.from : (f?.path || f?.source || ""),
            format: typeof f?.format === "string" ? f.format : "",
            currency: typeof f?.currency === "string" ? f.currency : "",
          }))
      : [];

    const confMsg = typeof cfg.message === "string" ? cfg.message : "";
    const rawConfFields = Array.isArray(cfg.summary_fields)
      ? cfg.summary_fields
      : Array.isArray(cfg.display_fields)
      ? cfg.display_fields
      : [];
    const confFields: ConfirmationSummaryField[] = rawConfFields.length > 0
      ? (rawConfFields as RawSummaryFieldConfig[])
          .filter((f) => typeof f === "object" && f !== null && (f.from || f.path || f.source))
          .map((f) => ({
            label: typeof f?.label === "string" ? f.label : (f?.name || f?.key || ""),
            from: typeof f?.from === "string" ? f.from : (f?.path || f?.source || ""),
            format: typeof f?.format === "string" ? f.format : "",
            currency: typeof f?.currency === "string" ? f.currency : "",
          }))
      : [];

    const availableIntegrations = await loadIntegrations();
    if (isForm) {
      void loadForms();
    }

    let resolvedIntegrationId = "";
    if (isApi && step.integration_operation_id && availableIntegrations.length > 0) {
      // Find which integration owns this operation
      for (const integ of availableIntegrations) {
        try {
          const ops = await fetchIntegrationOperations(integ.id);
          if (ops.some((o) => o.id === step.integration_operation_id)) {
            resolvedIntegrationId = integ.id;
            setOperations(ops);
            break;
          }
        } catch {
          // ignore
        }
      }
    }

    setStepFormData({
      step_key: step.step_key,
      step_type: step.step_type || "FORM",
      responsibility: step.responsibility || (isApi ? "SYSTEM" : "MOBILE"),
      execution_mode: (step.execution_mode as StepExecutionMode) || "INLINE",
      integration_id: resolvedIntegrationId,
      integration_operation_id: step.integration_operation_id || "",
      title: step.title,
      form_id: formId,
      runtime_outputs: runtimeOutputs,
      request_mapping: reqMap,
      output_mapping: outMap,
      output_mapping_entries: outEntries,
      info_message: infoMsg,
      info_display_fields: infoFields,
      confirmation_message: confMsg,
      confirmation_summary_fields: confFields,
      config_str: step.config ? JSON.stringify(step.config, null, 2) : "",
      condition_str: step.condition ? JSON.stringify(step.condition, null, 2) : "",
      next_step_rules_str: step.next_step_rules ? JSON.stringify(step.next_step_rules, null, 2) : "",
    });

    setShowStepDialogWithReset(true);

    if (selectedWorkflow && step.id && (isApi || isInfo || isConfirmation)) {
      void loadMappingContext(selectedWorkflow.id, step.id);
    }
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

  const clearEditedSummaryFieldErrors = (index: number, field: { from?: string; label?: string }) => {
    // Seule une valeur renseignée efface l'erreur (la source peut réécrire le label sans le remplir)
    if (field.from?.trim()) clearStepFormError(stepSummaryFieldErrorKey(index, "from"));
    if (field.label?.trim()) clearStepFormError(stepSummaryFieldErrorKey(index, "label"));
  };

  // Helper to add an info display field
  const handleAddInfoDisplayField = () => {
    setStepFormData((prev) => ({
      ...prev,
      info_display_fields: [
        ...prev.info_display_fields,
        { label: "", from: "", format: "", currency: "" },
      ],
    }));
  };

  // Helper to update an info display field
  const handleUpdateInfoDisplayField = (
    index: number,
    field: Partial<InfoDisplayField>
  ) => {
    clearEditedSummaryFieldErrors(index, field);
    setStepFormData((prev) => {
      const next = [...prev.info_display_fields];
      if (next[index]) {
        next[index] = { ...next[index], ...field };
      }
      return { ...prev, info_display_fields: next };
    });
  };

  // Helper to remove an info display field
  const handleRemoveInfoDisplayField = (index: number) => {
    // Les lignes suivantes changent d'index : leurs erreurs seront recalculées au prochain enregistrement
    clearStepSummaryFieldErrors();
    setStepFormData((prev) => {
      const nextFields = prev.info_display_fields.filter((_, i) => i !== index);
      let nextConfigStr = prev.config_str;
      try {
        if (prev.config_str.trim()) {
          const parsed = JSON.parse(prev.config_str) as Record<string, unknown>;
          delete parsed.summary_fields;
          if (nextFields.length > 0) {
            parsed.display_fields = nextFields;
          } else {
            delete parsed.display_fields;
          }
          nextConfigStr = JSON.stringify(parsed, null, 2);
        }
      } catch {
        // ignore parse error
      }
      return {
        ...prev,
        info_display_fields: nextFields,
        config_str: nextConfigStr,
      };
    });
  };

  // Helper to add a confirmation summary field
  const handleAddConfirmationSummaryField = () => {
    setStepFormData((prev) => ({
      ...prev,
      confirmation_summary_fields: [
        ...prev.confirmation_summary_fields,
        { label: "", from: "", format: "", currency: "" },
      ],
    }));
  };

  // Helper to update a confirmation summary field
  const handleUpdateConfirmationSummaryField = (
    index: number,
    field: Partial<ConfirmationSummaryField>
  ) => {
    clearEditedSummaryFieldErrors(index, field);
    setStepFormData((prev) => {
      const next = [...prev.confirmation_summary_fields];
      if (next[index]) {
        next[index] = { ...next[index], ...field };
      }
      return { ...prev, confirmation_summary_fields: next };
    });
  };

  // Helper to remove a confirmation summary field
  const handleRemoveConfirmationSummaryField = (index: number) => {
    // Les lignes suivantes changent d'index : leurs erreurs seront recalculées au prochain enregistrement
    clearStepSummaryFieldErrors();
    setStepFormData((prev) => {
      const nextFields = prev.confirmation_summary_fields.filter((_, i) => i !== index);
      let nextConfigStr = prev.config_str;
      try {
        if (prev.config_str.trim()) {
          const parsed = JSON.parse(prev.config_str) as Record<string, unknown>;
          delete parsed.display_fields;
          if (nextFields.length > 0) {
            parsed.summary_fields = nextFields;
          } else {
            delete parsed.summary_fields;
          }
          nextConfigStr = JSON.stringify(parsed, null, 2);
        }
      } catch {
        // ignore parse error
      }
      return {
        ...prev,
        confirmation_summary_fields: nextFields,
        config_str: nextConfigStr,
      };
    });
  };

  // Helper to add an output mapping entry
  const handleAddOutputMappingEntry = (targetKey = "", from = "") => {
    const count = stepFormData.output_mapping_entries.length + 1;
    const defaultKey = targetKey || `output_${count}`;
    const newEntry: OutputMappingEntry = {
      id: `out_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      targetKey: defaultKey,
      from: from,
    };
    setStepFormData((prev) => ({
      ...prev,
      output_mapping_entries: [...prev.output_mapping_entries, newEntry],
    }));
  };

  // Helper to update an output mapping entry
  const handleUpdateOutputMappingEntry = (
    id: string,
    partial: { targetKey?: string; from?: string }
  ) => {
    setStepFormData((prev) => ({
      ...prev,
      output_mapping_entries: prev.output_mapping_entries.map((e) =>
        e.id === id ? { ...e, ...partial } : e
      ),
    }));
  };

  // Helper to remove an output mapping entry
  const handleRemoveOutputMappingEntry = (id: string) => {
    setStepFormData((prev) => ({
      ...prev,
      output_mapping_entries: prev.output_mapping_entries.filter((e) => e.id !== id),
    }));
  };

  // Create or Update Step
  /** Enregistre l'étape ; renvoie les erreurs de validation (vide si le formulaire est valide). */
  const handleCreateOrUpdateStep = async (): Promise<FieldErrors<StepFormField>> => {
    if (!selectedWorkflow) return {};

    const validationErrors = validateStepForm(stepFormData);
    setStepFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) {
      return validationErrors;
    }

    const isApi = stepFormData.step_type === "API";
    const isInfo = stepFormData.step_type === "INFO";
    const isConfirmation = stepFormData.step_type === "CONFIRMATION";
    const isForm = stepFormData.step_type === "FORM";

    try {
      setIsSavingStep(true);

      const condition = parseJsonField(stepFormData.condition_str, "Condition");
      const next_step_rules = parseJsonField(stepFormData.next_step_rules_str, "Règles étape suivante");

      // Construire la config
      let config: Record<string, unknown> | null = null;
      if (isForm) {
        // Conforme strict à la demande: { "form_id": "uuid" }, ignorer form_code et additionalProperties
        config = { form_id: stepFormData.form_id.trim() };
        const hadRuntimeOutputs =
          Array.isArray(editingStep?.config?.runtime_outputs) && editingStep.config.runtime_outputs.length > 0;
        // Liste vidée sur une étape qui en avait : envoyée vide pour ne pas conserver les anciennes valeurs
        if (stepFormData.runtime_outputs.length > 0 || hadRuntimeOutputs) {
          config.runtime_outputs = stepFormData.runtime_outputs.map(({ key, value_type, required }) => ({
            key: key.trim(),
            value_type,
            required,
          }));
        }
      } else {
        if (stepFormData.config_str.trim()) {
          config = parseJsonField(stepFormData.config_str, "Configuration");
          // Propre aux étapes FORM : une étape changée de type ne doit pas la conserver
          if (config) delete config.runtime_outputs;
        }
        if (isApi) {
          config = config || {};
          // Nettoyer et injecter le request_mapping visuel
          const cleanReq: Record<string, { from?: string; value?: unknown }> = {};
          for (const [k, v] of Object.entries(stepFormData.request_mapping || {})) {
            if (v && (v.from || (v.value !== undefined && v.value !== ""))) {
              cleanReq[k] = v;
            }
          }
          if (Object.keys(cleanReq).length > 0) {
            config.request_mapping = cleanReq;
          } else {
            delete config.request_mapping;
          }

        // Nettoyer et injecter l'output_mapping visuel
        const cleanOut: Record<string, { from?: string }> = {};
        if (Array.isArray(stepFormData.output_mapping_entries) && stepFormData.output_mapping_entries.length > 0) {
          for (const entry of stepFormData.output_mapping_entries) {
            if (entry.targetKey && entry.targetKey.trim() && entry.from && entry.from.trim()) {
              cleanOut[entry.targetKey.trim()] = { from: entry.from.trim() };
            }
          }
        } else {
          for (const [k, v] of Object.entries(stepFormData.output_mapping || {})) {
            if (k && k.trim() && v && v.from && v.from.trim()) {
              cleanOut[k.trim()] = { from: v.from.trim() };
            }
          }
        }
        if (Object.keys(cleanOut).length > 0) {
          config.output_mapping = cleanOut;
        } else {
          delete config.output_mapping;
        }
      } else if (isInfo) {
        config = config || {};
        if (stepFormData.info_message.trim()) {
          config.message = stepFormData.info_message.trim();
        } else {
          delete config.message;
        }

        const validFields = (stepFormData.info_display_fields || [])
          .filter((f) => f.label.trim() && f.from.trim())
          .map((f) => {
            const fieldObj: Record<string, unknown> = {
              label: f.label.trim(),
              from: f.from.trim(),
            };
            if (f.format) fieldObj.format = f.format;
            if (f.format === "amount" && f.currency && f.currency.trim()) {
              fieldObj.currency = f.currency.trim();
            }
            return fieldObj;
          });

        // Supprimer summary_fields résiduel pour l'étape INFO (qui utilise display_fields)
        delete config.summary_fields;

        if (validFields.length > 0) {
          config.display_fields = validFields;
        } else {
          delete config.display_fields;
        }
      } else if (isConfirmation) {
        config = config || {};
        if (stepFormData.confirmation_message.trim()) {
          config.message = stepFormData.confirmation_message.trim();
        } else {
          delete config.message;
        }

        // Supprimer display_fields résiduel pour éviter de conserver d'anciens champs obsolètes
        delete config.display_fields;

        const validFields = (stepFormData.confirmation_summary_fields || [])
          .filter((f) => f.label.trim() && f.from.trim())
          .map((f) => {
            const fieldObj: Record<string, unknown> = {
              label: f.label.trim(),
              from: f.from.trim(),
            };
            if (f.format) fieldObj.format = f.format;
            if (f.format === "amount" && f.currency && f.currency.trim()) {
              fieldObj.currency = f.currency.trim();
            }
            return fieldObj;
          });

        if (validFields.length > 0) {
          config.summary_fields = validFields;
        } else {
          delete config.summary_fields;
        }
      }
    }

      const order = editingStep
        ? editingStep.step_order
        : workflowSteps.length > 0
        ? Math.max(...workflowSteps.map((s) => s.step_order)) + 1
        : 1;

        const structId = selectedWorkflow.structure_id || currentStructureId;
        if (editingStep) {
          const payload: UpdateWorkflowStepRequest = {
            step_key: stepFormData.step_key.trim(),
            step_type: stepFormData.step_type,
            responsibility: isApi ? "SYSTEM" : (stepFormData.responsibility || "MOBILE"),
            execution_mode: isApi ? stepFormData.execution_mode : null,
            integration_operation_id: isApi ? stepFormData.integration_operation_id : null,
            title: stepFormData.title.trim(),
            config,
            condition,
            next_step_rules,
          };
          const updated = structId
            ? await updateWorkflowStep(selectedWorkflow.id, editingStep.id, payload, structId)
            : await updateWorkflowStep(selectedWorkflow.id, editingStep.id, payload);
          setWorkflowSteps((prev) =>
            prev.map((s) => (s.id === editingStep.id ? updated : s)).sort((a, b) => a.step_order - b.step_order)
          );
          toast.success("Étape modifiée avec succès");
        } else {
          const payload: CreateWorkflowStepRequest = {
            step_order: order,
            step_key: stepFormData.step_key.trim(),
            step_type: stepFormData.step_type,
            responsibility: isApi ? "SYSTEM" : (stepFormData.responsibility || "MOBILE"),
            execution_mode: isApi ? stepFormData.execution_mode : null,
            integration_operation_id: isApi ? stepFormData.integration_operation_id : null,
            title: stepFormData.title.trim(),
            config,
            condition,
            next_step_rules,
          };
          const created = structId
            ? await createWorkflowStep(selectedWorkflow.id, payload, structId)
            : await createWorkflowStep(selectedWorkflow.id, payload);
          setWorkflowSteps((prev) => [...prev, created].sort((a, b) => a.step_order - b.step_order));
          toast.success("Étape ajoutée avec succès");
        }
        setShowStepDialogWithReset(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erreur lors de la sauvegarde de l'étape");
      } finally {
        setIsSavingStep(false);
      }
      return {};
    };

  // Delete Step
  const handleDeleteStep = (stepId: string) => {
    setStepToDelete(stepId);
  };

  const handleConfirmDeleteStep = async () => {
    if (!selectedWorkflow || !stepToDelete) return;
    try {
      setIsLoadingSteps(true);
      const structId = selectedWorkflow.structure_id || currentStructureId;
      if (structId) {
        await deleteWorkflowStep(selectedWorkflow.id, stepToDelete, structId);
      } else {
        await deleteWorkflowStep(selectedWorkflow.id, stepToDelete);
      }
      setWorkflowSteps((prev) => prev.filter((s) => s.id !== stepToDelete));
      toast.success("Étape supprimée avec succès");
      setStepToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression de l'étape");
    } finally {
      setIsLoadingSteps(false);
    }
  };

  // Reorder steps (Move Up or Down)
  const handleMoveStep = async (step: WorkflowStepResponse, direction: "up" | "down") => {
    if (!selectedWorkflow) return;
    const index = workflowSteps.findIndex((s) => s.id === step.id);
    if (index === -1) return;

    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === workflowSteps.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newSteps = [...workflowSteps];

    // Swap steps
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;

    // Recalculate orders
    const updatedSteps = newSteps.map((s, idx) => ({
      ...s,
      step_order: idx + 1,
    }));

    setWorkflowSteps(updatedSteps);

    const structId = selectedWorkflow.structure_id || currentStructureId;
    try {
      const orderedIds = updatedSteps.map((s) => s.id);
      const reordered = structId
        ? await reorderWorkflowSteps(selectedWorkflow.id, orderedIds, structId)
        : await reorderWorkflowSteps(selectedWorkflow.id, orderedIds);
      if (Array.isArray(reordered) && reordered.length > 0) {
        setWorkflowSteps(reordered.sort((a, b) => a.step_order - b.step_order));
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("uuid_parsing") || msg.includes("step_id") || msg.includes("reorder")) {
        toast.error("Erreur Backend FastAPI: La route /reorder est en conflit avec /{step_id} sur le serveur.");
      } else {
        toast.error(msg || "Erreur lors de la réorganisation");
      }
      // Rollback to server state
      void loadSteps(selectedWorkflow.id, undefined, structId);
    }
  };

  return {
    workflows: filteredWorkflows,
    isLoadingWorkflows,
    searchTerm,
    setSearchTerm,
    selectedWorkflow,
    handleSelectWorkflow,
    workflowSteps,
    isLoadingSteps,
    showWorkflowDialog,
    setShowWorkflowDialog,
    editingWorkflow,
    isSavingWorkflow,
    workflowFormData,
    setWorkflowFormData,
    handleOpenNewWorkflow,
    handleOpenEditWorkflow,
    handleCreateOrUpdateWorkflow,
    handleDuplicateWorkflow,
    handleDeleteWorkflow,
    workflowToDelete,
    setWorkflowToDelete,
    handleConfirmDeleteWorkflow,
    handleActivateWorkflow,
    handleDeactivateWorkflow,
    handleSetDefaultWorkflow,
    handleAssignPaymentFlow,
    handleUnassignPaymentFlow,
    showStepDialog,
    setShowStepDialog: setShowStepDialogWithReset,
    stepFormErrors,
    clearStepFormError,
    clearStepRuntimeOutputErrors,
    clearStepFormErrorsWhere,
    editingStep,
    isSavingStep,
    stepFormData,
    setStepFormData,
    handleOpenNewStep,
    handleOpenEditStep,
    handleCreateOrUpdateStep,
    handleDeleteStep,
    stepToDelete,
    setStepToDelete,
    handleConfirmDeleteStep,
    handleMoveStep,
    forms,
    isLoadingForms,
    loadForms,
    integrations,
    isLoadingIntegrations,
    loadIntegrations,
    operations,
    isLoadingOperations,
    loadOperations,
    mappingContext,
    setMappingContext,
    isLoadingMappingContext,
    loadMappingContext,
    loadPreviewMappingContext,
    loadStepContext,
    handleAddInfoDisplayField,
    handleUpdateInfoDisplayField,
    handleRemoveInfoDisplayField,
    handleAddConfirmationSummaryField,
    handleUpdateConfirmationSummaryField,
    handleRemoveConfirmationSummaryField,
    handleAddOutputMappingEntry,
    handleUpdateOutputMappingEntry,
    handleRemoveOutputMappingEntry,
    stepResponsibilityFilter,
    setStepResponsibilityFilter,
    handleFilterResponsibility,
    refreshWorkflows: loadWorkflows,
    loadWorkflows,
    filterStructureId,
    setFilterStructureId,
    currentStructureId,
  };
};
