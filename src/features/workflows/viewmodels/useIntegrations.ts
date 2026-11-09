import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  IntegrationItem,
  CreateIntegrationRequest,
  PatchIntegrationRequest,
  IntegrationOperationItem,
  CreateIntegrationOperationRequest,
  PatchIntegrationOperationRequest,
  ImportOperationCandidate,
} from "../models/workflowsTypes";
import {
  fetchIntegrations,
  createIntegration,
  patchIntegration,
  deleteIntegration,
  fetchIntegrationOperations,
  createIntegrationOperation,
  patchIntegrationOperation,
  deleteIntegrationOperation,
  importOperationPreview,
} from "../services/integrationsService";
import { FieldErrors, hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import { firstErrorKey, isInvalidJson } from "./formValidation";

export interface UseIntegrationsOptions {
  enabled?: boolean;
}

export interface OperationFormData {
  key: string;
  label: string;
  method: string;
  relative_path: string;
  completion_mode: string;
  authorization_mode: string;
  operation_id_field: string;
  status_path: string;
  status_field: string;
  result_field: string;
  error_code_field: string;
  error_message_field: string;
  event_topic: string;
  timeout_seconds: number;
  poll_interval_seconds: number;
  completion_timeout_seconds: number;
  request_schema_str: string;
  response_schema_str: string;
  active: boolean;
}

export type IntegrationFormField = "key" | "label" | "base_url";

/**
 * Valide le formulaire d'intégration et renvoie toutes les erreurs, par champ.
 * La clé n'est exigée qu'à la création (elle n'est pas modifiable ensuite).
 */
export const validateIntegrationForm = (
  form: { key: string; label: string; base_url: string },
  isEditing: boolean
): FieldErrors<IntegrationFormField> => {
  const errors: FieldErrors<IntegrationFormField> = {};
  if (!isEditing && !form.key.trim()) errors.key = "La clé unique est obligatoire";
  if (!form.label.trim()) errors.label = "Le libellé est obligatoire";
  if (!form.base_url.trim()) errors.base_url = "L'URL de base est obligatoire";
  return errors;
};

export type OperationFormField =
  | "key"
  | "label"
  | "method"
  | "relative_path"
  | "completion_mode"
  | "authorization_mode"
  | "request_schema_str"
  | "response_schema_str";

export type OperationDialogTab = "general" | "schemas";

/**
 * Valide le formulaire d'opération et renvoie toutes les erreurs, par champ (dans l'ordre des onglets).
 * La clé n'est exigée qu'à la création (elle n'est pas modifiable ensuite).
 */
export const validateOperationForm = (
  form: OperationFormData,
  isEditing: boolean
): FieldErrors<OperationFormField> => {
  const errors: FieldErrors<OperationFormField> = {};
  if (!isEditing && !form.key.trim()) errors.key = "La clé unique est obligatoire";
  if (!form.label.trim()) errors.label = "Le libellé est obligatoire";
  if (!form.method.trim()) errors.method = "La méthode est obligatoire";
  if (!form.relative_path.trim()) errors.relative_path = "Le chemin relatif est obligatoire";
  if (!form.completion_mode.trim()) errors.completion_mode = "Le mode de complétion est obligatoire";
  if (!form.authorization_mode.trim()) errors.authorization_mode = "Le mode d'autorisation est obligatoire";
  if (isInvalidJson(form.request_schema_str)) errors.request_schema_str = "Schéma de requête invalide (JSON)";
  if (isInvalidJson(form.response_schema_str)) errors.response_schema_str = "Schéma de réponse invalide (JSON)";
  return errors;
};

/** Onglet du dialogue d'opération qui contient le premier champ en erreur. */
export const getOperationErrorTab = (errors: FieldErrors<OperationFormField>): OperationDialogTab | undefined => {
  const key = firstErrorKey(errors);
  if (!key) return undefined;
  return key === "request_schema_str" || key === "response_schema_str" ? "schemas" : "general";
};

export type ImportOperationFormField = "candidate" | "response_code";

/** Valide la sélection d'import OpenAPI (opération et, si demandé, code de réponse). */
export const validateImportSelection = (
  candidate: ImportOperationCandidate | null,
  responseCode: string | null
): FieldErrors<ImportOperationFormField> => {
  const errors: FieldErrors<ImportOperationFormField> = {};
  if (!candidate) {
    errors.candidate = "Veuillez sélectionner une opération à importer.";
  } else if (candidate.requires_response_selection && !responseCode) {
    errors.response_code = "Veuillez sélectionner un code de réponse avant de continuer.";
  }
  return errors;
};

export const useIntegrations = (options?: UseIntegrationsOptions) => {
  const enabled = options?.enabled ?? true;

  // Integrations state
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Operations state
  const [operations, setOperations] = useState<IntegrationOperationItem[]>([]);
  const [isLoadingOperations, setIsLoadingOperations] = useState(false);

  // Integration dialog
  const [showIntegrationDialog, setShowIntegrationDialog] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<IntegrationItem | null>(null);
  const [isSavingIntegration, setIsSavingIntegration] = useState(false);
  const [integrationFormData, setIntegrationFormData] = useState({
    key: "",
    label: "",
    base_url: "",
    active: true,
  });

  // Deletion confirmation state
  const [integrationToDelete, setIntegrationToDelete] = useState<string | null>(null);
  const [operationToDelete, setOperationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Operation dialog
  const [showOperationDialog, setShowOperationDialog] = useState(false);
  const [editingOperation, setEditingOperation] = useState<IntegrationOperationItem | null>(null);
  const [isSavingOperation, setIsSavingOperation] = useState(false);
  const [operationFormData, setOperationFormData] = useState<OperationFormData>({
    key: "",
    label: "",
    method: "POST",
    relative_path: "",
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
  });

  const {
    errors: integrationFormErrors,
    setErrors: setIntegrationFormErrors,
    clearError: clearIntegrationFormError,
    resetErrors: resetIntegrationFormErrors,
  } = useFieldErrors<IntegrationFormField>();
  const {
    errors: operationFormErrors,
    setErrors: setOperationFormErrors,
    clearError: clearOperationFormError,
    resetErrors: resetOperationFormErrors,
  } = useFieldErrors<OperationFormField>();
  const {
    errors: importFormErrors,
    setErrors: setImportFormErrors,
    clearError: clearImportFormError,
    resetErrors: resetImportFormErrors,
  } = useFieldErrors<ImportOperationFormField>();

  // Chaque ouverture ou fermeture d'un dialogue repart d'un formulaire sans erreur affichée
  const setShowIntegrationDialogWithReset = (open: boolean) => {
    resetIntegrationFormErrors();
    setShowIntegrationDialog(open);
  };
  const setShowOperationDialogWithReset = (open: boolean) => {
    resetOperationFormErrors();
    setShowOperationDialog(open);
  };

  // OpenAPI Import state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
  const [importAnalysisError, setImportAnalysisError] = useState<string | null>(null);
  const [importCandidates, setImportCandidates] = useState<ImportOperationCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<ImportOperationCandidate | null>(null);
  const [selectedResponseCode, setSelectedResponseCode] = useState<string | null>(null);
  const [isImportingOperation, setIsImportingOperation] = useState(false);

  // Invalidate import preview when integration changes
  const prevIntegrationIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevIntegrationIdRef.current !== null && prevIntegrationIdRef.current !== (selectedIntegration?.id ?? null)) {
      setImportFile(null);
      setImportCandidates([]);
      setSelectedCandidate(null);
      setSelectedResponseCode(null);
      setImportAnalysisError(null);
    }
    prevIntegrationIdRef.current = selectedIntegration?.id ?? null;
  }, [selectedIntegration?.id]);

  // Load integrations
  const loadIntegrations = useCallback(async () => {
    try {
      setIsLoadingIntegrations(true);
      const data = await fetchIntegrations();
      setIntegrations(data);
      setSelectedIntegration((prev) => {
        if (!prev) return null;
        const exists = data.find((i) => i.id === prev.id);
        return exists || null;
      });
      if (data.length === 0) {
        setOperations([]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du chargement des intégrations");
    } finally {
      setIsLoadingIntegrations(false);
    }
  }, []);

  // Load operations for selected integration
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
      toast.error(error instanceof Error ? error.message : "Erreur lors du chargement des opérations");
    } finally {
      setIsLoadingOperations(false);
    }
  }, []);


  useEffect(() => {
    if (enabled) {
      void loadIntegrations();
    }
  }, [enabled, loadIntegrations]);

  useEffect(() => {
    if (selectedIntegration?.id) {
      void loadOperations(selectedIntegration.id);
    }
  }, [selectedIntegration?.id, loadOperations]);

  // Filtered integrations list
  const filteredIntegrations = useMemo(() => {
    if (!searchTerm.trim()) return integrations;
    const term = searchTerm.toLowerCase();
    return integrations.filter(
      (i) => i.label.toLowerCase().includes(term) || i.key.toLowerCase().includes(term) || i.base_url.toLowerCase().includes(term)
    );
  }, [integrations, searchTerm]);

  // Integration Handlers
  const handleSelectIntegration = (integration: IntegrationItem | null) => {
    setSelectedIntegration(integration);
  };

  const handleOpenNewIntegration = () => {
    setEditingIntegration(null);
    setIntegrationFormData({
      key: "",
      label: "",
      base_url: "",
      active: true,
    });
    setShowIntegrationDialogWithReset(true);
  };

  const handleOpenEditIntegration = (integration: IntegrationItem) => {
    setEditingIntegration(integration);
    setIntegrationFormData({
      key: integration.key,
      label: integration.label,
      base_url: integration.base_url,
      active: integration.active,
    });
    setShowIntegrationDialogWithReset(true);
  };

  const handleSaveIntegration = async () => {
    const validationErrors = validateIntegrationForm(integrationFormData, Boolean(editingIntegration));
    setIntegrationFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    try {
      setIsSavingIntegration(true);
      if (editingIntegration) {
        const payload: PatchIntegrationRequest = {
          label: integrationFormData.label.trim(),
          base_url: integrationFormData.base_url.trim(),
          active: integrationFormData.active,
        };
        const updated = await patchIntegration(editingIntegration.id, payload);
        setIntegrations((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        if (selectedIntegration?.id === updated.id) {
          setSelectedIntegration(updated);
        }
        toast.success("Intégration mise à jour");
      } else {
        const payload: CreateIntegrationRequest = {
          key: integrationFormData.key.trim(),
          label: integrationFormData.label.trim(),
          base_url: integrationFormData.base_url.trim(),
          active: integrationFormData.active,
        };
        const created = await createIntegration(payload);
        setIntegrations((prev) => [created, ...prev]);
        setSelectedIntegration(created);
        toast.success("Intégration créée avec succès");
      }
      setShowIntegrationDialogWithReset(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'enregistrement de l'intégration");
    } finally {
      setIsSavingIntegration(false);
    }
  };

  const handleToggleIntegrationActive = async (integration: IntegrationItem) => {
    try {
      const nextActive = !integration.active;
      const updated = await patchIntegration(integration.id, { active: nextActive });
      setIntegrations((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      if (selectedIntegration?.id === updated.id) {
        setSelectedIntegration(updated);
      }
      toast.success(nextActive ? "Intégration activée" : "Intégration désactivée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du changement de statut");
    }
  };

  const handleDeleteIntegration = (integrationId: string) => {
    setIntegrationToDelete(integrationId);
  };

  const handleConfirmDeleteIntegration = async () => {
    if (!integrationToDelete) return;
    try {
      setIsDeleting(true);
      await deleteIntegration(integrationToDelete);
      setIntegrations((prev) => prev.filter((i) => i.id !== integrationToDelete));
      if (selectedIntegration?.id === integrationToDelete) {
        setSelectedIntegration(null);
        setOperations([]);
      }
      toast.success("Intégration supprimée avec succès");
      setIntegrationToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression de l'intégration");
    } finally {
      setIsDeleting(false);
    }
  };

  // Operation Handlers
  const handleOpenNewOperation = () => {
    setEditingOperation(null);
    setOperationFormData({
      key: "",
      label: "",
      method: "POST",
      relative_path: "",
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
    });
    setShowOperationDialogWithReset(true);
  };

  const handleOpenEditOperation = (operation: IntegrationOperationItem) => {
    setEditingOperation(operation);
    setOperationFormData({
      key: operation.key,
      label: operation.label,
      method: operation.method,
      relative_path: operation.relative_path,
      completion_mode: operation.completion_mode || "IMMEDIATE",
      authorization_mode: operation.authorization_mode || "NONE",
      operation_id_field: operation.operation_id_field || "",
      status_path: operation.status_path || "",
      status_field: operation.status_field || "status",
      result_field: operation.result_field || "",
      error_code_field: operation.error_code_field || "",
      error_message_field: operation.error_message_field || "",
      event_topic: operation.event_topic || "",
      timeout_seconds: operation.timeout_seconds ?? 10,
      poll_interval_seconds: operation.poll_interval_seconds ?? 5,
      completion_timeout_seconds: operation.completion_timeout_seconds ?? 300,
      request_schema_str: operation.request_schema ? JSON.stringify(operation.request_schema, null, 2) : "",
      response_schema_str: operation.response_schema ? JSON.stringify(operation.response_schema, null, 2) : "",
      active: operation.active !== false,
    });
    setShowOperationDialogWithReset(true);
  };

  /** Enregistre l'opération ; renvoie les erreurs de validation (vide si le formulaire est valide). */
  const handleSaveOperation = async (): Promise<FieldErrors<OperationFormField>> => {
    if (!selectedIntegration) return {};

    const validationErrors = validateOperationForm(operationFormData, Boolean(editingOperation));
    setOperationFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return validationErrors;

    // Les schémas ont été validés ci-dessus : une zone vide donne null
    const parsedRequestSchema: Record<string, unknown> | null = operationFormData.request_schema_str.trim()
      ? JSON.parse(operationFormData.request_schema_str.trim())
      : null;
    const parsedResponseSchema: Record<string, unknown> | null = operationFormData.response_schema_str.trim()
      ? JSON.parse(operationFormData.response_schema_str.trim())
      : null;

    try {
      setIsSavingOperation(true);
      const cleanPath = operationFormData.relative_path.trim().startsWith("/")
        ? operationFormData.relative_path.trim()
        : `/${operationFormData.relative_path.trim()}`;

      if (editingOperation) {
        const payload: PatchIntegrationOperationRequest = {
          label: operationFormData.label.trim(),
          method: operationFormData.method,
          relative_path: cleanPath,
          completion_mode: operationFormData.completion_mode,
          authorization_mode: operationFormData.authorization_mode,
          operation_id_field: operationFormData.operation_id_field.trim() || null,
          status_path: operationFormData.status_path.trim() || null,
          status_field: operationFormData.status_field.trim() || null,
          result_field: operationFormData.result_field.trim() || null,
          error_code_field: operationFormData.error_code_field.trim() || null,
          error_message_field: operationFormData.error_message_field.trim() || null,
          event_topic: operationFormData.event_topic.trim() || null,
          timeout_seconds: Number(operationFormData.timeout_seconds) || 10,
          poll_interval_seconds: Number(operationFormData.poll_interval_seconds) || 5,
          completion_timeout_seconds: Number(operationFormData.completion_timeout_seconds) || 300,
          request_schema: parsedRequestSchema,
          response_schema: parsedResponseSchema,
          active: operationFormData.active,
        };
        const updated = await patchIntegrationOperation(selectedIntegration.id, editingOperation.id, payload);
        setOperations((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        toast.success("Opération mise à jour");
      } else {
        const payload: CreateIntegrationOperationRequest = {
          key: operationFormData.key.trim(),
          label: operationFormData.label.trim(),
          method: operationFormData.method,
          relative_path: cleanPath,
          completion_mode: operationFormData.completion_mode,
          authorization_mode: operationFormData.authorization_mode,
          operation_id_field: operationFormData.operation_id_field.trim() || null,
          status_path: operationFormData.status_path.trim() || null,
          status_field: operationFormData.status_field.trim() || "status",
          result_field: operationFormData.result_field.trim() || null,
          error_code_field: operationFormData.error_code_field.trim() || null,
          error_message_field: operationFormData.error_message_field.trim() || null,
          event_topic: operationFormData.event_topic.trim() || null,
          timeout_seconds: Number(operationFormData.timeout_seconds) || 10,
          poll_interval_seconds: Number(operationFormData.poll_interval_seconds) || 5,
          completion_timeout_seconds: Number(operationFormData.completion_timeout_seconds) || 300,
          request_schema: parsedRequestSchema,
          response_schema: parsedResponseSchema,
          active: operationFormData.active,
        };
        const created = await createIntegrationOperation(selectedIntegration.id, payload);
        setOperations((prev) => [created, ...prev]);
        toast.success("Opération créée avec succès");
      }
      setShowOperationDialogWithReset(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'enregistrement de l'opération");
    } finally {
      setIsSavingOperation(false);
    }
    return {};
  };

  const handleToggleOperationActive = async (operation: IntegrationOperationItem) => {
    if (!selectedIntegration) return;
    try {
      const nextActive = !operation.active;
      const updated = await patchIntegrationOperation(selectedIntegration.id, operation.id, { active: nextActive });
      setOperations((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      toast.success(nextActive ? "Opération activée" : "Opération désactivée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du changement de statut de l'opération");
    }
  };

  const handleDeleteOperation = (operationId: string) => {
    setOperationToDelete(operationId);
  };

  const handleConfirmDeleteOperation = async () => {
    if (!selectedIntegration || !operationToDelete) return;
    try {
      setIsDeleting(true);
      await deleteIntegrationOperation(selectedIntegration.id, operationToDelete);
      setOperations((prev) => prev.filter((o) => o.id !== operationToDelete));
      toast.success("Opération supprimée avec succès");
      setOperationToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression de l'opération");
    } finally {
      setIsDeleting(false);
    }
  };

  // ==========================================
  // IMPORT HANDLERS
  // ==========================================
  const handleOpenImportOperation = () => {
    if (!selectedIntegration) return;
    setImportFile(null);
    setIsAnalyzingFile(false);
    setImportAnalysisError(null);
    setImportCandidates([]);
    setSelectedCandidate(null);
    setSelectedResponseCode(null);
    resetImportFormErrors();
    setShowImportDialog(true);
  };

  const analyzeImportFile = async (file: File, integrationId: string) => {
    if (file.size === 0) {
      setImportAnalysisError("Le fichier sélectionné est vide.");
      return;
    }
    if (file.size > 2097152) {
      setImportAnalysisError("La taille du fichier dépasse la limite autorisée de 2 MiB (2 097 152 octets).");
      return;
    }

    try {
      setIsAnalyzingFile(true);
      setImportAnalysisError(null);
      const res = await importOperationPreview(integrationId, file);
      const ops = res.operations || [];
      setImportCandidates(ops);
      if (ops.length === 0) {
        setImportAnalysisError("Aucune opération trouvée dans ce fichier.");
      }
      setSelectedCandidate(null);
      setSelectedResponseCode(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur lors de l'analyse du fichier OpenAPI";
      setImportAnalysisError(msg);
      toast.error(msg);
    } finally {
      setIsAnalyzingFile(false);
    }
  };

  const handleSelectImportFile = async (file: File | null) => {
    setImportFile(file);
    resetImportFormErrors();
    setImportAnalysisError(null);
    setImportCandidates([]);
    setSelectedCandidate(null);
    setSelectedResponseCode(null);

    if (file && selectedIntegration) {
      await analyzeImportFile(file, selectedIntegration.id);
    }
  };

  const selectImportResponseCode = (code: string | null) => {
    setSelectedResponseCode(code);
    if (code) clearImportFormError("response_code");
  };

  const handleAnalyzeImportFile = async () => {
    if (!selectedIntegration) {
      toast.error("Aucune intégration sélectionnée.");
      return;
    }
    if (!importFile) {
      setImportAnalysisError("Veuillez sélectionner un fichier OpenAPI.");
      return;
    }
    await analyzeImportFile(importFile, selectedIntegration.id);
  };

  const handleSelectCandidate = (candidate: ImportOperationCandidate) => {
    setSelectedCandidate(candidate);
    resetImportFormErrors();
    if (candidate.requires_response_selection && candidate.response_options.length > 0) {
      setSelectedResponseCode(null);
    } else {
      setSelectedResponseCode(candidate.response_options[0]?.status_code ?? null);
    }
  };

  const handleConfirmUseCandidate = async () => {
    if (!selectedIntegration) return;

    const validationErrors = validateImportSelection(selectedCandidate, selectedResponseCode);
    setImportFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors) || !selectedCandidate) return;

    if (selectedCandidate.errors && selectedCandidate.errors.length > 0) {
      toast.error("Cette opération contient des erreurs et ne peut pas être importée.");
      return;
    }

    let chosenResponseSchema = selectedCandidate.response_schema;
    if (selectedCandidate.requires_response_selection && selectedResponseCode) {
      const match = selectedCandidate.response_options.find((opt) => opt.status_code === selectedResponseCode);
      if (match) {
        chosenResponseSchema = match.response_schema;
      }
    }

    const relativePath = selectedCandidate.relative_path.trim();
    const payload: CreateIntegrationOperationRequest = {
      key: selectedCandidate.key.trim(),
      label: selectedCandidate.label.trim(),
      method: selectedCandidate.method,
      relative_path: relativePath.startsWith("/") ? relativePath : `/${relativePath}`,
      completion_mode: "IMMEDIATE",
      authorization_mode: "NONE",
      operation_id_field: null,
      status_path: null,
      status_field: "status",
      result_field: null,
      error_code_field: null,
      error_message_field: null,
      event_topic: null,
      timeout_seconds: 10,
      poll_interval_seconds: 5,
      completion_timeout_seconds: 300,
      request_schema: selectedCandidate.request_schema,
      response_schema: chosenResponseSchema,
      active: true,
    };

    try {
      setIsImportingOperation(true);
      const created = await createIntegrationOperation(selectedIntegration.id, payload);
      setOperations((prev) => [created, ...prev]);
      setShowImportDialog(false);
      toast.success("Opération importée avec succès");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'import de l'opération");
    } finally {
      setIsImportingOperation(false);
    }
  };

  return {
    integrations: filteredIntegrations,
    filteredIntegrations,
    isLoadingIntegrations,
    selectedIntegration,
    handleSelectIntegration,
    searchTerm,
    setSearchTerm,
    loadIntegrations,
    operations,
    isLoadingOperations,
    loadOperations,
    showIntegrationDialog,
    setShowIntegrationDialog: setShowIntegrationDialogWithReset,
    integrationFormErrors,
    clearIntegrationFormError,
    editingIntegration,
    isSavingIntegration,
    integrationFormData,
    setIntegrationFormData,
    handleOpenNewIntegration,
    handleOpenEditIntegration,
    handleSaveIntegration,
    handleToggleIntegrationActive,
    handleDeleteIntegration,
    handleConfirmDeleteIntegration,
    integrationToDelete,
    setIntegrationToDelete,
    showOperationDialog,
    setShowOperationDialog: setShowOperationDialogWithReset,
    operationFormErrors,
    clearOperationFormError,
    editingOperation,
    isSavingOperation,
    operationFormData,
    setOperationFormData,
    handleOpenNewOperation,
    handleOpenEditOperation,
    handleSaveOperation,
    handleToggleOperationActive,
    handleDeleteOperation,
    handleConfirmDeleteOperation,
    operationToDelete,
    setOperationToDelete,
    isDeleting,
    //Import
    showImportDialog,
    setShowImportDialog: (open: boolean) => {
      resetImportFormErrors();
      setShowImportDialog(open);
    },
    importFile,
    isAnalyzingFile,
    importAnalysisError,
    importCandidates,
    selectedCandidate,
    selectedResponseCode,
    setSelectedResponseCode: selectImportResponseCode,
    importFormErrors,
    isImportingOperation,
    handleOpenImportOperation,
    handleSelectImportFile,
    handleAnalyzeImportFile,
    handleSelectCandidate,
    handleConfirmUseCandidate,
  };
};
