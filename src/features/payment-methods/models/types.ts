export type MethodKind = "CASH" | "BANK_ACCOUNT" | "WALLET" | "CARD";
export type LoopType = "OPEN" | "CLOSED";
export type BankingBackendType =
  | "CORE_BANKING"
  | "PI_SPI"
  | "WALLET_ENGINE"
  | "CARD_PROCESSOR"
  | "BILLER_HUB"
  | "KYC";

export interface PaymentMethodResponse {
  id: string;
  code: string;
  label: string;
  description: string | null;
  status: "active" | "inactive";
  is_active?: boolean;
  backend?: BankingBackendType;
  kind?: MethodKind;
  loop_type?: LoopType;
  currencies?: string[];
  min_kyc_tier?: number;
  settlement_account_ref?: string;
  supported_operations?: string[];
  logo_media_id?: string | null;
  logo_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UpsertPaymentMethodPayload {
  code: string;
  label: string;
  backend: BankingBackendType;
  kind: MethodKind;
  description?: string | null;
  is_active?: boolean;
  currencies?: string[];
  loop_type?: LoopType;
  min_kyc_tier?: number;
  settlement_account_ref?: string;
  supported_operations?: string[];
  logo_media_id?: string | null;
}

export interface PaymentMethodFormState {
  code: string;
  label: string;
  description: string;
  backend: BankingBackendType;
  kind: MethodKind;
  is_active: boolean;
  currencies: string;
  loop_type: LoopType | "";
  min_kyc_tier: number;
  settlement_account_ref: string;
  supported_operations: string;
  logo_media_id: string;
  logo_file: File | null;
  logo_preview_url: string;
}
