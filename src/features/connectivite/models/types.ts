// ===========================================================================
// Types conformes au contrat API — AVIA Configuration Service
// Source : /swagger/doc.json — section Connectivité
// ===========================================================================

// ─── Enums ──────────────────────────────────────────────────────────────────

export type Protocol = "HTTP" | "DB_PROC";

export type TenantLevel = "GLOBAL" | "PRODUCT" | "STRUCTURE" | "DISTRIBUTEUR" | "AGENCY";

export type Environment = "SANDBOX" | "PRODUCTION";

/** AuthType — DB_CREDENTIALS est utilisé pour les connexions DB_PROC */
export type BankingAuthType = "NONE" | "API_KEY" | "OAUTH2" | "MTLS" | "DB_CREDENTIALS";

export type BankingBackend =
  | "CORE_BANKING"
  | "PI_SPI"
  | "WALLET_ENGINE"
  | "CARD_PROCESSOR"
  | "BILLER_HUB"
  | "KYC";

/** Backends du contrat (model.Backend), dans l'ordre du Swagger */
export const BANKING_BACKENDS: BankingBackend[] = [
  "CORE_BANKING",
  "PI_SPI",
  "WALLET_ENGINE",
  "CARD_PROCESSOR",
  "BILLER_HUB",
  "KYC",
];

export type BankingOperationDirection = "READ" | "DEBIT" | "CREDIT" | "CONTROL";

export type Dbms = "ORACLE" | "SQLSERVER" | "POSTGRES" | "MYSQL" | "DB2" | "FIREBIRD";

// ─── Shared sub-models ───────────────────────────────────────────────────────

export interface RetryPolicy {
  max_attempts?: number;
  backoff_ms?: number;
  /** Codes HTTP déclenchant le retry */
  on?: number[];
}

// ─── Connection (modèle retourné par GET/PUT connexion) ──────────────────────
// Conforme à : model.Connection

export interface BankingConfig {
  id: string;
  structure_id: string;
  tenant_id: string;
  tenant_level: TenantLevel;
  backend?: BankingBackend;
  /** HTTP (défaut) ou DB_PROC (procédures stockées) */
  protocol?: Protocol;
  /** En HTTP : URL de base. En DB_PROC : descripteur de connexion (ex: oracle://host:1521/SVC) */
  base_url: string;
  auth_type: BankingAuthType;
  auth_secret_ref: string;
  /** En-têtes HTTP par défaut — HTTP uniquement */
  default_headers: Record<string, string>;
  /** Version du moteur DB — DB_PROC uniquement, descriptive */
  dbms_version?: string;
  /** Options transmises au pilote DB — DB_PROC uniquement */
  driver_options?: Record<string, string>;
  timeout_ms: number;
  environment: Environment;
  is_active: boolean;
  retry_policy?: RetryPolicy;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
  /**
   * Connexion d'une structure (dto.ConnectionResolvedResponse) : niveau d'origine de chaque champ,
   * STRUCTURE ou GLOBAL quand la structure hérite de la connexion par défaut.
   */
  resolved_from?: Record<string, TenantLevel>;
}

/** Niveaux d'origine distincts d'une connexion résolue (vide si l'API ne renvoie pas resolved_from). */
export const connectionOriginLevels = (config: BankingConfig): TenantLevel[] =>
  [...new Set(Object.values(config.resolved_from ?? {}))];

// ─── UpsertConnectionRequest (body PUT connexion) ────────────────────────────
// Conforme à : dto.UpsertConnectionRequest

export interface UpsertBankingConfigRequest {
  /** HTTP (défaut) ou DB_PROC */
  protocol?: Protocol;
  /** En HTTP : URL de base. En DB_PROC : descripteur sans identifiants */
  base_url: string;
  auth_type: BankingAuthType;
  /** Référence opaque vers le vault (secret, credential) */
  auth_secret_ref?: string;
  default_headers?: Record<string, string>;
  /** Version moteur DB — DB_PROC uniquement */
  dbms_version?: string;
  /** Options pilote — DB_PROC uniquement */
  driver_options?: Record<string, string>;
  timeout_ms?: number;
  environment?: Environment;
  is_active?: boolean;
  retry_policy?: RetryPolicy;
}

// ─── Endpoint (modèle retourné par GET/PUT endpoint) ─────────────────────────
// Conforme à : model.Endpoint

export interface BankingEndpoint {
  id: string;
  operation_code: string;
  backend?: BankingBackend;
  structure_id?: string;
  tenant_id?: string;
  tenant_level?: TenantLevel;
  /** HTTP uniquement */
  http_method?: string;
  /** HTTP uniquement */
  path?: string;
  /** DB_PROC uniquement */
  procedure?: string;
  /** DB_PROC uniquement — paramètres positionnels de la procédure */
  parameters?: string[];
  /** Mapping des champs de la requête vers le SI (contrat AVIA -> backend) */
  field_mapping?: Record<string, string>;
  /** Mapping des champs de la réponse du SI vers le contrat AVIA */
  response_field_mapping?: Record<string, string>;
  /** Moyen de paiement lié (si l'opération en dépend) */
  payment_method_code?: string;
  /** Le SI accepte-t-il les quoteparts de commission ? */
  supports_commission_split?: boolean;
  timeout_ms?: number;
  is_active: boolean;
  retry_policy?: RetryPolicy;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
}

// ─── UpsertEndpointRequest (body PUT endpoint) ───────────────────────────────
// Conforme à : dto.UpsertEndpointRequest
// Le backend refuse le couple qui ne correspond pas au protocole résolu :
//   - HTTP    → fournir http_method + path (pas procedure/parameters)
//   - DB_PROC → fournir procedure + parameters (pas http_method/path)

export interface UpsertBankingEndpointRequest {
  /** HTTP uniquement */
  http_method?: string;
  /** HTTP uniquement */
  path?: string;
  /** DB_PROC uniquement */
  procedure?: string;
  /** DB_PROC uniquement */
  parameters?: string[];
  /** Mapping de champs requête (contrat AVIA -> SI/backend) */
  field_mapping?: Record<string, string>;
  /** Mapping de champs réponse (SI/backend -> contrat AVIA) */
  response_field_mapping?: Record<string, string>;
  /** Le SI accepte-t-il les quoteparts de commission ? */
  supports_commission_split?: boolean;
  timeout_ms?: number;
  is_active?: boolean;
  retry_policy?: RetryPolicy;
}

// ─── Résolution d'appel (réponse test endpoint) ───────────────────────────────
// Conforme à : model.ResolvedCall (union discriminée par protocol)

export interface ResolvedCall {
  operation_code?: string;
  payment_method_code?: string;
  backend?: BankingBackend;
  protocol?: Protocol;
  environment?: Environment;
  /** HTTP uniquement */
  url?: string;
  /** HTTP uniquement */
  http_method?: string;
  /** HTTP uniquement */
  headers?: Record<string, string>;
  /** DB_PROC uniquement */
  target?: string;
  /** DB_PROC uniquement */
  procedure?: string;
  /** DB_PROC uniquement */
  parameters?: string[];
  /** DB_PROC uniquement — moteur dérivé de la cible */
  dbms?: Dbms;
  /** DB_PROC uniquement */
  dbms_version?: string;
  /** DB_PROC uniquement */
  driver_options?: Record<string, string>;
  field_mapping?: Record<string, string>;
  response_field_mapping?: Record<string, string>;
  supports_commission_split?: boolean;
  timeout_ms?: number;
  retry_policy?: RetryPolicy;
  auth?: { type?: BankingAuthType; secret_ref?: string };
  /** Origine de la résolution : niveau de chaque champ de connexion, et niveau de l'endpoint */
  resolved_from?: { connection?: Record<string, TenantLevel>; endpoint?: TenantLevel };
  contract_version?: string;
}

// ─── ProbeResult (réponse POST /test) ────────────────────────────────────────
// Conforme à : service.ProbeResult

export interface BankingProbeResult {
  reachable: boolean;
  probe?: string;
  http_status?: number;
  latency_ms?: number;
  error?: string;
  /** Appel complet résolu lors du test */
  resolved?: ResolvedCall;
}

// ─── Operation catalog ────────────────────────────────────────────────────────

export interface BankingOperationForm {
  backend: BankingBackend;
  code: string;
  label: string;
  direction: BankingOperationDirection;
  is_idempotent: boolean;
  compensating_code: string;
  request_contract: string;
  is_active: boolean;
}

export interface BankingOperationDef {
  id: string;
  code: string;
  label: string;
  is_active: boolean;
  backend?: BankingBackend;
  direction?: BankingOperationDirection;
  is_idempotent?: boolean;
  compensating_code?: string;
  request_contract?: Record<string, string>;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBankingOperationRequest {
  backend: BankingBackend;
  code: string;
  label: string;
  is_active?: boolean;
  direction: BankingOperationDirection;
  is_idempotent?: boolean;
  compensating_code?: string;
  request_contract?: Record<string, string>;
}

export interface UpdateBankingOperationRequest {
  backend: BankingBackend;
  label: string;
  is_active?: boolean;
  direction: BankingOperationDirection;
  is_idempotent?: boolean;
  compensating_code?: string;
  request_contract?: Record<string, string>;
}
