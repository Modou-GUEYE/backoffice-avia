import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useAuthStore, getCurrentInstitutionId } from "@/core/security/authStore";
import { fetchStructures } from "@/features/structures/services/structuresService";
import { StructureRead } from "@/features/structures/models/types";
import {
  BankingConfig,
  BankingEndpoint,
  BankingOperationDef,
  UpsertBankingConfigRequest,
  UpsertBankingEndpointRequest,
  CreateBankingOperationRequest,
  UpdateBankingOperationRequest,
  BankingOperationForm,
  BankingBackend,
  Protocol,
  RetryPolicy,
} from "../models/types";
import {
  fetchDefaultBankingConfig,
  updateDefaultBankingConfig,
  fetchStructureBankingConfig,
  updateStructureBankingConfig,
  deleteStructureBankingConfig,
  fetchDefaultEndpoints,
  updateDefaultEndpoint,
  deleteDefaultEndpoint,
  fetchStructureEndpoints,
  updateStructureEndpoint,
  deleteStructureEndpointOverride,
  testStructureEndpoint,
  fetchBankingOperations,
  fetchBankingOperation,
  createBankingOperation,
  updateBankingOperation,
  toggleBankingOperationStatus,
  deleteBankingOperation,
  ConfigApiError,
} from "../services/bankingService";
import { fetchPaymentMethods } from "@/features/payment-methods/services/paymentMethodsService";
import type { PaymentMethodResponse } from "@/features/payment-methods/models/types";
import { FieldErrors, hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";

const isValidJson = (raw: string): boolean => {
  try {
    JSON.parse(raw);
    return true;
  } catch {
    return false;
  }
};

/** Mapping JSON optionnel : vide ou "{}" accepté, sinon un objet JSON est attendu. */
const isValidOptionalJsonObject = (value: string | undefined): boolean => {
  const raw = value?.trim() || "";
  if (!raw || raw === "{}") return true;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
};

export type ConnectionConfigField = "auth_secret_ref" | "headers" | "driver_options";

/** Valide la configuration de connexion et renvoie toutes les erreurs, par champ. */
export const validateConnectionConfig = (
  form: Pick<UpsertBankingConfigRequest, "protocol" | "auth_type" | "auth_secret_ref">,
  headersString: string,
  driverOptionsString: string,
): FieldErrors<ConnectionConfigField> => {
  const errors: FieldErrors<ConnectionConfigField> = {};
  const isDbProc = form.protocol === "DB_PROC";

  if (form.auth_type && form.auth_type !== "NONE" && !form.auth_secret_ref?.trim()) {
    errors.auth_secret_ref = "La référence du secret est obligatoire pour ce type d'authentification";
  }
  if (!isDbProc && !isValidJson(headersString.trim() || "{}")) {
    errors.headers = "Le format JSON des en-têtes HTTP est invalide";
  }
  if (isDbProc && !isValidJson(driverOptionsString.trim() || "{}")) {
    errors.driver_options = "Le format JSON des options pilote est invalide";
  }
  return errors;
};

export type EndpointFormField = "path" | "procedure" | "field_mapping" | "response_field_mapping";

/** Valide le formulaire d'endpoint et renvoie toutes les erreurs, par champ. */
export const validateEndpointForm = (form: {
  protocol?: Protocol;
  path: string;
  procedure: string;
  field_mapping_string: string;
  response_field_mapping_string?: string;
}): FieldErrors<EndpointFormField> => {
  const errors: FieldErrors<EndpointFormField> = {};
  if (form.protocol === "DB_PROC") {
    if (!form.procedure.trim()) errors.procedure = "Le nom de la procédure est obligatoire";
  } else if (!form.path.trim()) {
    errors.path = "Le chemin de l'endpoint est obligatoire";
  }
  if (!isValidOptionalJsonObject(form.field_mapping_string)) {
    errors.field_mapping = "Le field mapping de requête doit être un objet JSON valide";
  }
  if (!isValidOptionalJsonObject(form.response_field_mapping_string)) {
    errors.response_field_mapping = "Le response field mapping doit être un objet JSON valide";
  }
  return errors;
};

export type OperationFormField = "backend" | "code" | "label" | "direction" | "request_contract";

/** Valide le formulaire d'opération du catalogue et renvoie toutes les erreurs, par champ. */
export const validateOperationForm = (
  form: BankingOperationForm,
  isCreating: boolean,
): FieldErrors<OperationFormField> => {
  const errors: FieldErrors<OperationFormField> = {};
  if (!form.backend) errors.backend = "Le backend de l'opération est obligatoire";
  if (isCreating && !form.code.trim()) errors.code = "Le code de l'opération est obligatoire";
  if (!form.label.trim()) errors.label = "Le libellé de l'opération est obligatoire";
  if (!form.direction) errors.direction = "La direction de l'opération est obligatoire";

  let contractValid = false;
  try {
    const parsed = JSON.parse(form.request_contract.trim() || "{}");
    contractValid = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  } catch {
    contractValid = false;
  }
  if (!contractValid) errors.request_contract = "Le contrat de requête doit être un objet JSON valide";
  return errors;
};

export interface CombinedEndpointRow {
  operationCode: string;
  /** Moyen de paiement du câblage (vide si l'opération n'en dépend pas) */
  paymentMethodCode: string;
  operationName: string;
  protocol: Protocol;
  httpMethod: string;
  pathPattern: string;
  procedure?: string;
  parameters?: string[];
  retryPolicy?: RetryPolicy;
  timeoutMs: number;
  isActive: boolean;
  isOverridden: boolean;
  isConfigured: boolean;
}

/** Politique de rejeu (connexion ou endpoint) : absente quand le nombre de tentatives vaut 0. */
const buildRetryPolicy = (maxAttempts: number, backoffMs: number, retryOn: string): RetryPolicy | undefined =>
  maxAttempts > 0
    ? {
        max_attempts: maxAttempts,
        backoff_ms: backoffMs || 1000,
        on: retryOn
          ? retryOn
              .split(",")
              .map((c) => parseInt(c.trim(), 10))
              .filter((n) => !isNaN(n))
          : undefined,
      }
    : undefined;

/** Un câblage est identifié par son opération et son moyen de paiement (facultatif). */
const wiringKey = (e: BankingEndpoint) => `${e.operation_code}|${e.payment_method_code || ""}`;
const rowKey = (r: Pick<CombinedEndpointRow, "operationCode" | "paymentMethodCode">) =>
  `${r.operationCode}|${r.paymentMethodCode}`;

export type EndpointWiringOrigin = "STRUCTURE" | "DEFAULT" | "NONE";

export const useConnectivite = (options?: { enabled?: boolean; activeSubTab?: string }) => {
  const enabled = options?.enabled ?? true;
  const activeSubTab = options?.activeSubTab || "connection";

  const currentUser = useAuthStore((state) => state.user);
  const isStructureAdmin = currentUser?.entityContext === "Structure";
  const resolvedInstitutionId = currentUser?.institutionId || getCurrentInstitutionId() || "";

  // ===== STRUCTURES STATE =====
  const [structuresState, setStructuresState] = useState({
    items: [] as StructureRead[],
    isLoading: false,
    selectedId: isStructureAdmin ? resolvedInstitutionId : "GLOBAL_DEFAULTS",
  });

  // ===== CONFIG STATE =====
  const [configState, setConfigState] = useState({
    data: null as BankingConfig | null,
    isLoading: false,
    isSaving: false,
    form: {
      protocol: "HTTP" as Protocol,
      base_url: "",
      auth_type: "NONE",
      auth_secret_ref: "",
      default_headers: {},
      timeout_ms: 5000,
      environment: "SANDBOX",
      is_active: false,
    } as UpsertBankingConfigRequest,
    headersString: "{}",
    driverOptionsString: "{}",
    /** Codes HTTP de rejeu saisis (séparés par des virgules) */
    retryOnString: "",
    /** Message de l'API quand la connexion n'a pas pu être lue (404 aucune connexion, 409 désactivée…) */
    loadError: null as string | null,
    /** Code métier de cette erreur (CONN_002 : la connexion résolue est désactivée) */
    loadErrorCode: null as string | null,
    isConfirmingDelete: false,
  });
  /** Backend de la connexion affichée : le contrat prévoit une connexion par backend */
  const [selectedBackend, setSelectedBackend] = useState<BankingBackend>("CORE_BANKING");

  // ===== ENDPOINTS STATE =====
  const [endpointsState, setEndpointsState] = useState({
    items: [] as BankingEndpoint[],
    operations: [] as BankingOperationDef[],
    isLoading: false,
    isSaving: false,
    searchQuery: "",
    /** Connexion du niveau affiché pour chaque backend des opérations (null : aucune) */
    connections: {} as Partial<Record<BankingBackend, BankingConfig | null>>,
    /** Moyens de paiement du catalogue, pour le câblage par moyen */
    paymentMethods: [] as PaymentMethodResponse[],
    /** Moyen de paiement dont on affiche le câblage ; vide si l'opération n'en dépend pas */
    paymentMethodCode: "",
  });

  // ===== ENDPOINT MODAL STATE =====
  const [endpointModalState, setEndpointModalState] = useState({
    editingRow: null as CombinedEndpointRow | null,
    /** Moyen de paiement du câblage édité ; vide si l'opération n'en dépend pas */
    paymentMethodCode: "",
    isLoadingWiring: false,
    /** Origine des valeurs affichées : surcharge de la structure, endpoint par défaut, ou aucun câblage */
    wiringOrigin: "NONE" as EndpointWiringOrigin,
    form: {
      protocol: "HTTP" as Protocol,
      // HTTP fields
      http_method: "GET",
      path: "",
      // DB_PROC fields
      procedure: "",
      parameters: [] as string[],
      // Retry Policy (optionnel)
      retry_max_attempts: 0,
      retry_backoff_ms: 1000,
      retry_on: "",
      // Common
      field_mapping: {} as Record<string, string>,
      field_mapping_string: "{}",
      response_field_mapping: {} as Record<string, string>,
      response_field_mapping_string: "{}",
      timeout_ms: 5000,
      is_active: true,
      supports_commission_split: true,
      op_label: "",
      op_is_active: true,
    },
  });

  // ===== OPERATION CATALOG STATE =====
  const [operationCatalogState, setOperationCatalogState] = useState({
    editingOperation: null as BankingOperationDef | null,
    detailOperation: null as BankingOperationDef | null,
    isLoadingDetail: false,
    isCreating: false,
    isSaving: false,
    isDeleting: false,
    operationToDelete: null as BankingOperationDef | null,
    form: {
      code: "",
      backend: "CORE_BANKING" as BankingBackend,
      label: "",
      direction: "CONTROL" as const,
      is_idempotent: true,
      compensating_code: "",
      request_contract: "{}",
      is_active: true,
    } as BankingOperationForm,
  });

  const {
    errors: configErrors,
    setErrors: setConfigErrors,
    clearError: clearConfigError,
    resetErrors: resetConfigErrors,
  } = useFieldErrors<ConnectionConfigField>();
  const {
    errors: endpointErrors,
    setErrors: setEndpointErrors,
    clearError: clearEndpointError,
    resetErrors: resetEndpointErrors,
  } = useFieldErrors<EndpointFormField>();
  const {
    errors: operationErrors,
    setErrors: setOperationErrors,
    clearError: clearOperationError,
    resetErrors: resetOperationErrors,
  } = useFieldErrors<OperationFormField>();

  // Load structures list
  const loadStructures = useCallback(async () => {
    if (isStructureAdmin) return;
    try {
      setStructuresState((prev) => ({ ...prev, isLoading: true }));
      const data = await fetchStructures();
      const activeStructures = data.filter((s) => !s.is_deleted && s.is_active);
      setStructuresState((prev) => ({ ...prev, items: activeStructures }));
    } catch (err) {
      console.error("Erreur chargement structures pour Connectivité:", err);
    } finally {
      setStructuresState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [isStructureAdmin]);

  // Load banking configuration
  const loadConfig = useCallback(async (structureId: string, backend: BankingBackend) => {
    if (!structureId) return;
    resetConfigErrors();
    try {
      setConfigState((prev) => ({ ...prev, isLoading: true }));
      const config =
        structureId === "GLOBAL_DEFAULTS"
          ? await fetchDefaultBankingConfig(backend)
          : await fetchStructureBankingConfig(structureId, backend);

      setConfigState((prev) => ({
        ...prev,
        data: config,
        loadError: null,
        loadErrorCode: null,
        form: {
          protocol: config.protocol ?? "HTTP",
          base_url: config.base_url || "",
          auth_type: config.auth_type || "NONE",
          auth_secret_ref: config.auth_secret_ref || "",
          default_headers: config.default_headers || {},
          dbms_version: config.dbms_version || "",
          driver_options: config.driver_options || {},
          timeout_ms: config.timeout_ms ?? 5000,
          environment: config.environment ?? "SANDBOX",
          is_active: config.is_active ?? false,
          retry_policy: config.retry_policy,
        },
        headersString: JSON.stringify(config.default_headers || {}, null, 2),
        driverOptionsString: JSON.stringify(config.driver_options || {}, null, 2),
        retryOnString: (config.retry_policy?.on || []).join(", "),
      }));
    } catch (err) {
      console.error("Erreur chargement config bancaire:", err);
      setConfigState((prev) => ({
        ...prev,
        data: null,
        loadError: err instanceof Error ? err.message : "Connexion introuvable",
        loadErrorCode: err instanceof ConfigApiError ? err.code ?? null : null,
        form: {
          protocol: "HTTP",
          base_url: "",
          auth_type: "NONE",
          auth_secret_ref: "",
          default_headers: {},
          timeout_ms: 5000,
          environment: "SANDBOX",
          is_active: false,
        },
        headersString: "{}",
        driverOptionsString: "{}",
        retryOnString: "",
      }));
    } finally {
      setConfigState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [resetConfigErrors]);

  // Load endpoints and operations
  const loadEndpointsAndOperations = useCallback(async (structureId: string, paymentMethodCode = "") => {
    if (!structureId) return;
    try {
      setEndpointsState((prev) => ({ ...prev, isLoading: true }));
      // Le filtre est celui de l'API : payment_method envoyé s'il est choisi, sinon tous les câblages
      const paymentMethod = paymentMethodCode || undefined;
      const [defaults, operationsData] = await Promise.all([
        fetchDefaultEndpoints(paymentMethod),
        fetchBankingOperations(),
      ]);

      // Connexion de chaque backend du catalogue au niveau affiché : le protocole d'un endpoint en dépend
      const backends = [...new Set(operationsData.map((op) => op.backend).filter(Boolean))] as BankingBackend[];
      const connectionEntries = await Promise.all(
        backends.map(async (backend) => {
          const connection = await (structureId === "GLOBAL_DEFAULTS"
            ? fetchDefaultBankingConfig(backend)
            : fetchStructureBankingConfig(structureId, backend)
          ).catch(() => null);
          return [backend, connection] as const;
        }),
      );

      let endpointsData: BankingEndpoint[] = [];
      if (structureId === "GLOBAL_DEFAULTS") {
        endpointsData = defaults;
      } else {
        const overrides = await fetchStructureEndpoints(structureId, paymentMethod);
        // Un câblage = opération + moyen de paiement : la surcharge prime, le défaut complète (hérité)
        const overrideKeys = new Set(overrides.map(wiringKey));
        endpointsData = [...overrides, ...defaults.filter((d) => !overrideKeys.has(wiringKey(d)))];
      }

      setEndpointsState((prev) => ({
        ...prev,
        items: endpointsData,
        operations: operationsData,
        connections: Object.fromEntries(connectionEntries),
      }));
    } catch (err) {
      console.error("Erreur chargement endpoints/opérations:", err);
      setEndpointsState((prev) => ({ ...prev, items: [], operations: [] }));
    } finally {
      setEndpointsState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Initialize page data
  useEffect(() => {
    if (!enabled) return;
    void loadStructures();
  }, [enabled, loadStructures]);

  // Auto load configurations when selected structure changes or sub-tab is active
  useEffect(() => {
    if (!enabled) return;
    const targetId = isStructureAdmin ? resolvedInstitutionId : structuresState.selectedId;
    if (targetId) {
      void loadConfig(targetId, selectedBackend);
    }
  }, [enabled, isStructureAdmin, resolvedInstitutionId, structuresState.selectedId, selectedBackend, loadConfig]);

  useEffect(() => {
    if (!enabled) return;
    const targetId = isStructureAdmin ? resolvedInstitutionId : structuresState.selectedId;
    if (targetId) {
      void loadEndpointsAndOperations(targetId, endpointsState.paymentMethodCode);
    }
  }, [enabled, isStructureAdmin, resolvedInstitutionId, structuresState.selectedId, endpointsState.paymentMethodCode, loadEndpointsAndOperations]);

  useEffect(() => {
    if (!enabled) return;
    fetchPaymentMethods(true)
      .then((items) => setEndpointsState((prev) => ({ ...prev, paymentMethods: items })))
      .catch((err) => console.error("Erreur chargement moyens de paiement pour Connectivité:", err));
  }, [enabled]);

  /**
   * Connexion dont dépend une opération : celle de son backend au niveau affiché.
   * Le protocole d'un endpoint vient de cette connexion (HTTP par défaut selon le contrat).
   */
  const getOperationConnection = useCallback(
    (operationCode: string) => {
      const backend = endpointsState.operations.find((o) => o.code === operationCode)?.backend;
      const connection = backend ? endpointsState.connections[backend] ?? null : null;
      return { backend, connection, protocol: (connection?.protocol ?? "HTTP") as Protocol };
    },
    [endpointsState.operations, endpointsState.connections],
  );

  // Save general connection configuration
  const handleSaveConfig = async () => {
    const targetId = isStructureAdmin ? resolvedInstitutionId : structuresState.selectedId;
    if (!targetId) return;

    const validationErrors = validateConnectionConfig(
      configState.form,
      configState.headersString,
      configState.driverOptionsString,
    );
    setConfigErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    const isDbProcConfig = configState.form.protocol === "DB_PROC";
    const parsedHeaders: Record<string, string> = isDbProcConfig
      ? {}
      : JSON.parse(configState.headersString.trim() || "{}");
    const parsedDriverOptions: Record<string, string> = isDbProcConfig
      ? JSON.parse(configState.driverOptionsString.trim() || "{}")
      : {};

    const payload: UpsertBankingConfigRequest = {
      protocol: configState.form.protocol,
      base_url: configState.form.base_url,
      auth_type: configState.form.auth_type,
      auth_secret_ref: configState.form.auth_secret_ref || undefined,
      default_headers: configState.form.protocol === "HTTP" ? parsedHeaders : undefined,
      dbms_version: configState.form.protocol === "DB_PROC" ? (configState.form.dbms_version || undefined) : undefined,
      driver_options: configState.form.protocol === "DB_PROC" ? parsedDriverOptions : undefined,
      timeout_ms: configState.form.timeout_ms,
      environment: configState.form.environment,
      is_active: configState.form.is_active,
      retry_policy: buildRetryPolicy(
        configState.form.retry_policy?.max_attempts ?? 0,
        configState.form.retry_policy?.backoff_ms ?? 1000,
        configState.retryOnString,
      ),
    };

    try {
      setConfigState((prev) => ({ ...prev, isSaving: true }));
      const res =
        targetId === "GLOBAL_DEFAULTS"
          ? await updateDefaultBankingConfig(selectedBackend, payload)
          : await updateStructureBankingConfig(targetId, selectedBackend, payload);

      setConfigState((prev) => ({ ...prev, data: res }));
      void loadEndpointsAndOperations(targetId, endpointsState.paymentMethodCode);
      toast.success("Configuration de connectivité enregistrée avec succès");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setConfigState((prev) => ({ ...prev, isSaving: false }));
    }
  };

  const handleDeleteConnection = async () => {
    const targetId = isStructureAdmin ? resolvedInstitutionId : structuresState.selectedId;
    if (!targetId || targetId === "GLOBAL_DEFAULTS") return;

    try {
      setConfigState((prev) => ({ ...prev, isSaving: true, isConfirmingDelete: false }));
      await deleteStructureBankingConfig(targetId, selectedBackend);
      toast.success("Connexion de la structure supprimée");
      await loadConfig(targetId, selectedBackend);
      void loadEndpointsAndOperations(targetId, endpointsState.paymentMethodCode);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression de la connexion");
    } finally {
      setConfigState((prev) => ({ ...prev, isSaving: false }));
    }
  };

  // Une ligne par câblage renvoyé par l'API ; une ligne « non configurée » pour une opération sans câblage
  const combinedEndpoints = useMemo((): CombinedEndpointRow[] => {
    const toRow = (op: BankingOperationDef, endpoint?: BankingEndpoint): CombinedEndpointRow => {
      const isOverridden =
        structuresState.selectedId !== "GLOBAL_DEFAULTS" &&
        !!endpoint &&
        (endpoint.tenant_level === "STRUCTURE" || endpoint.structure_id === structuresState.selectedId);

      const isConfigured = !!endpoint && (!!endpoint.path || !!endpoint.procedure);
      const endpointProtocol: Protocol = endpoint?.procedure
        ? "DB_PROC"
        : endpoint?.http_method
        ? "HTTP"
        : getOperationConnection(op.code).protocol;

      return {
        operationCode: op.code,
        paymentMethodCode: endpoint ? endpoint.payment_method_code || "" : endpointsState.paymentMethodCode,
        operationName: op.label || op.code,
        protocol: endpointProtocol,
        httpMethod: endpoint?.http_method || (endpoint?.procedure ? "PROC" : "—"),
        pathPattern: endpoint?.path || endpoint?.procedure || "—",
        procedure: endpoint?.procedure,
        parameters: endpoint?.parameters,
        retryPolicy: endpoint?.retry_policy,
        timeoutMs: endpoint?.timeout_ms ?? 5000,
        isActive: endpoint?.is_active ?? false,
        isOverridden,
        isConfigured,
      };
    };

    return endpointsState.operations.flatMap((op) => {
      const opEndpoints = endpointsState.items.filter((e) => e.operation_code === op.code);
      return opEndpoints.length > 0 ? opEndpoints.map((e) => toRow(op, e)) : [toRow(op)];
    });
  }, [
    endpointsState.operations,
    endpointsState.items,
    endpointsState.paymentMethodCode,
    structuresState.selectedId,
    getOperationConnection,
  ]);

  // Filter combined endpoints based on search query
  const filteredEndpoints = useMemo(() => {
    if (!endpointsState.searchQuery.trim()) return combinedEndpoints;
    const query = endpointsState.searchQuery.toLowerCase();
    return combinedEndpoints.filter(
      (e) =>
        (e.operationCode && e.operationCode.toLowerCase().includes(query)) ||
        (e.operationName && e.operationName.toLowerCase().includes(query)) ||
        (e.pathPattern && e.pathPattern.toLowerCase().includes(query)) ||
        (e.procedure && e.procedure.toLowerCase().includes(query))
    );
  }, [combinedEndpoints, endpointsState.searchQuery]);

  // Formulaire de la boîte d'endpoint, pré-rempli depuis le câblage existant
  const buildEndpointForm = (operationCode: string, existingEndpoint?: BankingEndpoint) => {
    const opDef = endpointsState.operations.find((o) => o.code === operationCode);
    return {
      // Pas de champ protocol dans UpsertEndpointRequest : il est celui de la connexion
      protocol: getOperationConnection(operationCode).protocol,
      // HTTP fields
      http_method: existingEndpoint?.http_method || "GET",
      path: existingEndpoint?.procedure ? "" : existingEndpoint?.path || "",
      // DB_PROC fields
      procedure: existingEndpoint?.procedure || "",
      parameters: existingEndpoint?.parameters || [],
      // Retry Policy
      retry_max_attempts: existingEndpoint?.retry_policy?.max_attempts ?? 0,
      retry_backoff_ms: existingEndpoint?.retry_policy?.backoff_ms ?? 1000,
      retry_on: (existingEndpoint?.retry_policy?.on || []).join(", "),
      // Common
      field_mapping: existingEndpoint?.field_mapping || {},
      field_mapping_string: JSON.stringify(existingEndpoint?.field_mapping || {}, null, 2),
      response_field_mapping: existingEndpoint?.response_field_mapping || {},
      response_field_mapping_string: JSON.stringify(existingEndpoint?.response_field_mapping || {}, null, 2),
      timeout_ms: existingEndpoint?.timeout_ms ?? 5000,
      is_active: existingEndpoint?.is_active ?? true,
      // Contrat : omis, il vaut true ; on le renvoie toujours pour ne pas écraser un false enregistré
      supports_commission_split: existingEndpoint?.supports_commission_split ?? true,
      op_label: opDef?.label || operationCode,
      op_is_active: opDef?.is_active ?? true,
    };
  };

  // Open modal to edit/surcharge endpoint
  const handleStartEditEndpoint = (row: CombinedEndpointRow) => {
    const existingEndpoint = endpointsState.items.find((e) => wiringKey(e) === rowKey(row));
    resetEndpointErrors();
    setEndpointModalState({
      editingRow: row,
      paymentMethodCode: row.paymentMethodCode,
      isLoadingWiring: false,
      wiringOrigin: row.isOverridden ? "STRUCTURE" : row.isConfigured ? "DEFAULT" : "NONE",
      form: buildEndpointForm(row.operationCode, existingEndpoint),
    });
  };

  /**
   * Charge dans la boîte le câblage d'une opération pour un moyen de paiement (facultatif) :
   * surcharge de la structure si elle existe, sinon endpoint par défaut, comme dans la liste.
   * Sans câblage enregistré, `keepFormIfMissing` conserve la saisie en cours au lieu de vider le formulaire.
   */
  const loadEndpointWiring = async (
    operationCode: string,
    paymentMethodCode: string,
    { keepFormIfMissing = false } = {},
  ) => {
    const targetId = isStructureAdmin ? resolvedInstitutionId : structuresState.selectedId;
    const opRow = combinedEndpoints.find((r) => r.operationCode === operationCode);
    if (!targetId || !opRow) return;
    const row = { ...opRow, paymentMethodCode };

    resetEndpointErrors();
    setEndpointModalState((prev) => ({ ...prev, editingRow: row, paymentMethodCode, isLoadingWiring: true }));
    try {
      const paymentMethod = paymentMethodCode || undefined;
      // Câblage édité : celui de ce couple opération + moyen parmi ceux renvoyés
      const key = rowKey(row);
      const findIn = (items: BankingEndpoint[]) => items.find((e) => wiringKey(e) === key);
      let existingEndpoint: BankingEndpoint | undefined;
      let wiringOrigin: EndpointWiringOrigin = "NONE";
      if (targetId !== "GLOBAL_DEFAULTS") {
        existingEndpoint = findIn(await fetchStructureEndpoints(targetId, paymentMethod));
        if (existingEndpoint) wiringOrigin = "STRUCTURE";
      }
      if (!existingEndpoint) {
        existingEndpoint = findIn(await fetchDefaultEndpoints(paymentMethod));
        if (existingEndpoint) wiringOrigin = "DEFAULT";
      }
      setEndpointModalState((prev) => ({
        ...prev,
        wiringOrigin,
        form: !existingEndpoint && keepFormIfMissing ? prev.form : buildEndpointForm(operationCode, existingEndpoint),
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de charger le câblage de l'opération");
    } finally {
      setEndpointModalState((prev) => ({ ...prev, isLoadingWiring: false }));
    }
  };

  const handleSelectEndpointPaymentMethod = (paymentMethodCode: string) => {
    const operationCode = endpointModalState.editingRow?.operationCode;
    // Ignore un choix identique à l'actuel : pas de rechargement inutile
    if (paymentMethodCode === endpointModalState.paymentMethodCode) return;
    if (operationCode) void loadEndpointWiring(operationCode, paymentMethodCode, { keepFormIfMissing: true });
  };

  // Close modal
  const handleCancelEditEndpoint = () => {
    resetEndpointErrors();
    setEndpointModalState((prev) => ({ ...prev, editingRow: null }));
  };

  // Save endpoint surcharge or default
  const handleSaveEndpoint = async () => {
    const targetId = isStructureAdmin ? resolvedInstitutionId : structuresState.selectedId;
    const { editingRow, form, paymentMethodCode } = endpointModalState;
    if (!targetId || !editingRow) return;

    // Validation selon le protocole sélectionné dans le formulaire
    const validationErrors = validateEndpointForm(form);
    setEndpointErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;
    const isDbProcSelected = form.protocol === "DB_PROC";

    // Mappings déjà validés : contrat AVIA -> SI, puis réponse SI -> contrat AVIA
    const parseMapping = (value: string | undefined): Record<string, string> => {
      const raw = value?.trim() || "";
      return raw && raw !== "{}" ? JSON.parse(raw) : {};
    };
    const parsedFieldMapping = parseMapping(form.field_mapping_string);
    const parsedResponseFieldMapping = parseMapping(form.response_field_mapping_string);

    // Parsing retry_policy (optionnel)
    const retryPolicy = buildRetryPolicy(form.retry_max_attempts, form.retry_backoff_ms, form.retry_on);

    const hasFieldMapping = Object.keys(parsedFieldMapping).length > 0;
    const hasResponseFieldMapping = Object.keys(parsedResponseFieldMapping).length > 0;

    // Construire le payload selon le protocole choisi — le backend refuse le mauvais couple
    const payload: UpsertBankingEndpointRequest =
      isDbProcSelected
        ? {
            procedure: form.procedure.trim(),
            parameters: form.parameters.length > 0 ? form.parameters : undefined,
            field_mapping: hasFieldMapping ? parsedFieldMapping : undefined,
            response_field_mapping: hasResponseFieldMapping ? parsedResponseFieldMapping : undefined,
            timeout_ms: form.timeout_ms,
            is_active: form.is_active,
            supports_commission_split: form.supports_commission_split,
            retry_policy: retryPolicy,
          }
        : {
            http_method: form.http_method,
            path: form.path.trim(),
            field_mapping: hasFieldMapping ? parsedFieldMapping : undefined,
            response_field_mapping: hasResponseFieldMapping ? parsedResponseFieldMapping : undefined,
            timeout_ms: form.timeout_ms,
            is_active: form.is_active,
            supports_commission_split: form.supports_commission_split,
            retry_policy: retryPolicy,
          };

    try {
      setEndpointsState((prev) => ({ ...prev, isSaving: true }));
      if (targetId === "GLOBAL_DEFAULTS") {
        await updateDefaultEndpoint(editingRow.operationCode, payload, paymentMethodCode || undefined);
      } else {
        await updateStructureEndpoint(
          targetId,
          editingRow.operationCode,
          payload,
          paymentMethodCode || undefined,
        );
      }
      toast.success("Enregistré avec succès");
      setEndpointModalState((prev) => ({ ...prev, editingRow: null }));
      void loadEndpointsAndOperations(targetId, endpointsState.paymentMethodCode);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setEndpointsState((prev) => ({ ...prev, isSaving: false }));
    }
  };

  // Delete structure override (revert to defaults)
  const handleDeleteOverride = async (row: CombinedEndpointRow) => {
    const targetId = isStructureAdmin ? resolvedInstitutionId : structuresState.selectedId;
    if (!targetId || targetId === "GLOBAL_DEFAULTS") return;

    try {
      setEndpointsState((prev) => ({ ...prev, isSaving: true }));
      await deleteStructureEndpointOverride(targetId, row.operationCode, row.paymentMethodCode || undefined);
      toast.success(`Surcharge supprimée. L'opération réhérite de l'endpoint par défaut.`);
      void loadEndpointsAndOperations(targetId, endpointsState.paymentMethodCode);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setEndpointsState((prev) => ({ ...prev, isSaving: false }));
    }
  };

  const handleDeleteDefaultEndpoint = async (row: CombinedEndpointRow) => {
    if (structuresState.selectedId !== "GLOBAL_DEFAULTS") return;

    try {
      setEndpointsState((prev) => ({ ...prev, isSaving: true }));
      await deleteDefaultEndpoint(row.operationCode, row.paymentMethodCode || undefined);
      toast.success("Endpoint par défaut supprimé");
      await loadEndpointsAndOperations("GLOBAL_DEFAULTS", endpointsState.paymentMethodCode);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression de l'endpoint");
    } finally {
      setEndpointsState((prev) => ({ ...prev, isSaving: false }));
    }
  };

  const handleTestEndpoint = async (row: CombinedEndpointRow) => {
    const targetId = isStructureAdmin ? resolvedInstitutionId : structuresState.selectedId;
    if (!targetId || targetId === "GLOBAL_DEFAULTS" || !row.isConfigured) return;

    try {
      setEndpointsState((prev) => ({ ...prev, isSaving: true }));
      const result = await testStructureEndpoint(targetId, row.operationCode, row.paymentMethodCode || undefined);
      const latencyStr = result.latency_ms !== undefined ? ` - ${result.latency_ms} ms` : "";

      if (result.reachable) {
        if (result.http_status && result.http_status >= 200 && result.http_status < 400) {
          toast.success(`Connexion établie avec succès (HTTP ${result.http_status}${latencyStr})`);
        } else if (result.http_status) {
          toast.info(
            `Serveur cible joignable sur le réseau (sonde HTTP ${result.http_status}${latencyStr})`,
            {
              description: "L'hôte a répondu à la sonde réseau sans exécuter l'opération métier.",
            },
          );
        } else {
          toast.success(`Serveur cible joignable avec succès${latencyStr}`);
        }
      } else {
        toast.error(
          result.error || `Serveur cible injoignable${result.http_status ? ` (HTTP ${result.http_status})` : ""}`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du test de l'endpoint");
    } finally {
      setEndpointsState((prev) => ({ ...prev, isSaving: false }));
    }
  };

  // Catalogue Actions
  const handleStartCreateOperation = () => {
    resetOperationErrors();
    setOperationCatalogState((prev) => ({
      ...prev,
      isCreating: true,
      editingOperation: null,
      form: {
        code: "",
        backend: "CORE_BANKING" as BankingBackend,
        label: "",
        direction: "CONTROL",
        is_idempotent: true,
        compensating_code: "",
        request_contract: "{}",
        is_active: true,
      },
    }));
  };

  const handleStartEditOperation = async (op: BankingOperationDef) => {
    resetOperationErrors();
    setOperationCatalogState((prev) => ({
      ...prev,
      isCreating: false,
      editingOperation: op,
      form: {
        code: op.code,
        backend: op.backend || "CORE_BANKING",
        label: op.label,
        direction: op.direction || "CONTROL",
        is_idempotent: op.is_idempotent ?? true,
        compensating_code: op.compensating_code || "",
        request_contract: JSON.stringify(op.request_contract || {}, null, 2),
        is_active: op.is_active,
      },
    }));

    try {
      const operation = await fetchBankingOperation(op.code);
      setOperationCatalogState((prev) => ({
        ...prev,
        editingOperation: operation,
        form: {
          code: operation.code,
          backend: operation.backend || "CORE_BANKING",
          label: operation.label,
          direction: operation.direction || "CONTROL",
          is_idempotent: operation.is_idempotent ?? true,
          compensating_code: operation.compensating_code || "",
          request_contract: JSON.stringify(operation.request_contract || {}, null, 2),
          is_active: operation.is_active,
        },
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger le détail de l'opération");
    }
  };

  const handleOpenOperationDetail = async (op: BankingOperationDef) => {
    setOperationCatalogState((prev) => ({
      ...prev,
      detailOperation: op,
      isLoadingDetail: true,
    }));

    try {
      const operation = await fetchBankingOperation(op.code);
      setOperationCatalogState((prev) => ({ ...prev, detailOperation: operation }));
    } catch (error) {
      setOperationCatalogState((prev) => ({ ...prev, detailOperation: null }));
      toast.error(error instanceof Error ? error.message : "Impossible de charger le détail de l'opération");
    } finally {
      setOperationCatalogState((prev) => ({ ...prev, isLoadingDetail: false }));
    }
  };

  const handleCancelEditOperation = () => {
    resetOperationErrors();
    setOperationCatalogState((prev) => ({
      ...prev,
      isCreating: false,
      editingOperation: null,
    }));
  };

  const handleSaveOperation = async () => {
    const { isCreating, editingOperation, form } = operationCatalogState;
    const validationErrors = validateOperationForm(form, isCreating);
    setOperationErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    const requestContract: Record<string, string> = JSON.parse(form.request_contract.trim() || "{}");

    try {
      setOperationCatalogState((prev) => ({ ...prev, isSaving: true }));
      if (isCreating) {
        await createBankingOperation({
          code: form.code.trim().toUpperCase(),
          backend: form.backend,
          label: form.label.trim(),
          is_active: form.is_active,
          direction: form.direction,
          is_idempotent: form.is_idempotent,
          compensating_code: form.compensating_code.trim() || undefined,
          request_contract: requestContract,
        });
        toast.success("Opération ajoutée avec succès au catalogue");
      } else if (editingOperation) {
        await updateBankingOperation(editingOperation.code, {
          backend: form.backend,
          label: form.label.trim(),
          is_active: form.is_active,
          direction: form.direction,
          is_idempotent: form.is_idempotent,
          compensating_code: form.compensating_code.trim() || undefined,
          request_contract: requestContract,
        });
        toast.success("Opération modifiée avec succès");
      }
      setOperationCatalogState((prev) => ({
        ...prev,
        isCreating: false,
        editingOperation: null,
      }));
      const targetId = isStructureAdmin ? resolvedInstitutionId : structuresState.selectedId;
      if (targetId) {
        void loadEndpointsAndOperations(targetId, endpointsState.paymentMethodCode);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setOperationCatalogState((prev) => ({ ...prev, isSaving: false }));
    }
  };

  const handleDeleteOperation = async () => {
    const { operationToDelete } = operationCatalogState;
    if (!operationToDelete) return;
    try {
      setOperationCatalogState((prev) => ({ ...prev, isDeleting: true }));
      await deleteBankingOperation(operationToDelete.code);
      toast.success("Opération retirée du catalogue avec succès");
      setOperationCatalogState((prev) => ({ ...prev, operationToDelete: null }));
      const targetId = isStructureAdmin ? resolvedInstitutionId : structuresState.selectedId;
      if (targetId) {
        void loadEndpointsAndOperations(targetId, endpointsState.paymentMethodCode);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du retrait");
    } finally {
      setOperationCatalogState((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const handleToggleOperationStatus = async (operation: BankingOperationDef, isActive: boolean) => {
    try {
      const updated = await toggleBankingOperationStatus(operation.code, isActive);
      setEndpointsState((prev) => ({
        ...prev,
        operations: prev.operations.map((item) => (item.code === updated.code ? updated : item)),
      }));
      toast.success(isActive ? "Opération activée" : "Opération désactivée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du changement de statut");
    }
  };

  const handleSelectOperationForEdit = (operationCode: string) => {
    // Ignore une valeur vide ou identique (le Select peut renotifier sa valeur courante)
    if (!operationCode || operationCode === endpointModalState.editingRow?.operationCode) return;
    void loadEndpointWiring(operationCode, endpointModalState.paymentMethodCode);
  };

  return {
    isStructureAdmin,
    structures: structuresState.items,
    isLoadingStructures: structuresState.isLoading,
    selectedStructureId: structuresState.selectedId,
    setSelectedStructureId: (id: string) =>
      setStructuresState((prev) => ({ ...prev, selectedId: id })),
    isLoadingConfig: configState.isLoading,
    isLoadingEndpoints: endpointsState.isLoading,
    isSavingConfig: configState.isSaving,
    isSavingEndpoint: endpointsState.isSaving,
    bankingConfig: configState.data,
    configLoadError: configState.loadError,
    configLoadErrorCode: configState.loadErrorCode,
    isConfirmingDeleteConnection: configState.isConfirmingDelete,
    setConfirmingDeleteConnection: (open: boolean) =>
      setConfigState((prev) => ({ ...prev, isConfirmingDelete: open })),
    selectedBackend,
    setSelectedBackend,
    retryOnString: configState.retryOnString,
    setRetryOnString: (val: string) =>
      setConfigState((prev) => ({ ...prev, retryOnString: val })),
    getOperationConnection,
    configForm: configState.form,
    setConfigForm: (updater: UpsertBankingConfigRequest | ((prev: UpsertBankingConfigRequest) => UpsertBankingConfigRequest)) =>
      setConfigState((prev) => ({
        ...prev,
        form: typeof updater === "function" ? updater(prev.form) : updater,
      })),
    headersString: configState.headersString,
    setHeadersString: (val: string) =>
      setConfigState((prev) => ({ ...prev, headersString: val })),
    driverOptionsString: configState.driverOptionsString,
    setDriverOptionsString: (val: string) =>
      setConfigState((prev) => ({ ...prev, driverOptionsString: val })),
    searchQuery: endpointsState.searchQuery,
    setSearchQuery: (q: string) =>
      setEndpointsState((prev) => ({ ...prev, searchQuery: q })),
    filteredEndpoints,
    paymentMethods: endpointsState.paymentMethods,
    selectedPaymentMethodCode: endpointsState.paymentMethodCode,
    setSelectedPaymentMethodCode: (code: string) =>
      setEndpointsState((prev) => ({ ...prev, paymentMethodCode: code })),
    editingEndpoint: endpointModalState.editingRow,
    endpointPaymentMethodCode: endpointModalState.paymentMethodCode,
    isLoadingEndpointWiring: endpointModalState.isLoadingWiring,
    endpointWiringOrigin: endpointModalState.wiringOrigin,
    handleSelectEndpointPaymentMethod,
    endpointForm: endpointModalState.form,
    setEndpointForm: (updater: typeof endpointModalState.form | ((prev: typeof endpointModalState.form) => typeof endpointModalState.form)) =>
      setEndpointModalState((prev) => ({
        ...prev,
        form: typeof updater === "function" ? updater(prev.form) : updater,
      })),
    handleSaveConfig,
    configErrors,
    clearConfigError,
    endpointErrors,
    clearEndpointError,
    operationErrors,
    clearOperationError,
    handleDeleteConnection,
    handleStartEditEndpoint,
    handleCancelEditEndpoint,
    handleSaveEndpoint,
    handleDeleteOverride,
    handleDeleteDefaultEndpoint,
    handleTestEndpoint,
    operations: endpointsState.operations,
    detailOperation: operationCatalogState.detailOperation,
    isLoadingOperationDetail: operationCatalogState.isLoadingDetail,
    handleOpenOperationDetail,
    setDetailOperation: (operation: BankingOperationDef | null) =>
      setOperationCatalogState((prev) => ({ ...prev, detailOperation: operation })),
    editingOperation: operationCatalogState.editingOperation,
    isCreatingOperation: operationCatalogState.isCreating,
    isSavingOperation: operationCatalogState.isSaving,
    isDeletingOperation: operationCatalogState.isDeleting,
    operationToDelete: operationCatalogState.operationToDelete,
    setOperationToDelete: (op: BankingOperationDef | null) =>
      setOperationCatalogState((prev) => ({ ...prev, operationToDelete: op })),
    operationForm: operationCatalogState.form,
    setOperationForm: (updater: typeof operationCatalogState.form | ((prev: typeof operationCatalogState.form) => typeof operationCatalogState.form)) =>
      setOperationCatalogState((prev) => ({
        ...prev,
        form: typeof updater === "function" ? updater(prev.form) : updater,
      })),
    handleStartCreateOperation,
    handleStartEditOperation,
    handleCancelEditOperation,
    handleSaveOperation,
    handleDeleteOperation,
    handleToggleOperationStatus,
    handleSelectOperationForEdit,
  };
};
