import { bankingHttpClient } from "@/features/connectivite/services/bankingService";
import httpClient from "@/core/network/httpClient";
import { useAuthStore } from "@/core/security/authStore";
import { getErrorMessage } from "@/core/network/errorUtils";
import type {
  PaymentMethodResponse,
  UpsertPaymentMethodPayload,
} from "../models/types";
export type {
  PaymentMethodResponse,
  UpsertPaymentMethodPayload,
};

export const isTechnicalUser = (): boolean => {
  const user = useAuthStore.getState().user;
  if (!user) return false;
  if (
    user.role === "Profil Technique" ||
    user.role?.toLowerCase().includes("technique")
  ) {
    return true;
  }
  const permissions = user.permissions || [];
  return permissions.some(
    (p) =>
      p === "profile.bo-profil-technique" ||
      p === "profile.bo.profil-technique" ||
      p.toLowerCase().includes("profil-technique") ||
      p.toLowerCase().includes("technique")
  );
};

const mapStatus = (status?: string | boolean | null): "active" | "inactive" => {
  if (status === undefined || status === null) return "inactive";
  const s = String(status).trim().toLowerCase();
  return s === "active" || s === "true" || s === "enabled" ? "active" : "inactive";
};

const mapPaymentMethod = (
  item: PaymentMethodResponse & { is_active?: boolean },
): PaymentMethodResponse => {
  let computedStatus: "active" | "inactive" = "inactive";
  if (item.is_active !== undefined && item.is_active !== null) {
    computedStatus = item.is_active ? "active" : "inactive";
  } else if (item.status) {
    computedStatus = mapStatus(item.status);
  }

  return {
    ...item,
    status: computedStatus,
  };
};

export const fetchPaymentMethods = async (isTechnical?: boolean): Promise<PaymentMethodResponse[]> => {
  try {
    const isTech = isTechnical !== undefined ? isTechnical : isTechnicalUser();
    const { data } = isTech
      ? await bankingHttpClient.get<(PaymentMethodResponse & { is_active?: boolean })[]>("/payment-methods")
      : await httpClient.get<(PaymentMethodResponse & { is_active?: boolean })[]>("/api/v1/packages-services/payment-methods");
    return data.map(mapPaymentMethod);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les moyens de paiement"));
  }
};

export const fetchPaymentMethod = async (
  identifier: string | { code?: string; id?: string },
  isTechnical?: boolean,
): Promise<PaymentMethodResponse> => {
  try {
    const isTech = isTechnical !== undefined ? isTechnical : isTechnicalUser();
    let code = "";
    let paymentMethodId = "";

    if (typeof identifier === "object") {
      code = identifier.code || identifier.id || "";
      paymentMethodId = identifier.id || identifier.code || "";
    } else {
      code = identifier;
      paymentMethodId = identifier;
    }

    const { data } = isTech
      ? await bankingHttpClient.get<PaymentMethodResponse & { is_active?: boolean }>(
          `/payment-methods/${encodeURIComponent(code)}`,
        )
      : await httpClient.get<PaymentMethodResponse & { is_active?: boolean }>(
          `/api/v1/packages-services/payment-methods/${encodeURIComponent(paymentMethodId)}`,
        );
    return mapPaymentMethod(data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger le moyen de paiement"));
  }
};

export const togglePaymentMethodStatus = async (
  code: string,
  activate: boolean,
): Promise<PaymentMethodResponse> => {
  try {
    const { data } = await bankingHttpClient.patch<PaymentMethodResponse & { is_active?: boolean }>(
      `/payment-methods/${encodeURIComponent(code)}/status`,
      { is_active: activate },
    );
    return mapPaymentMethod(data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier le statut du moyen de paiement"));
  }
};

export const buildPaymentMethodFormData = (
  payload: UpsertPaymentMethodPayload,
  logoFile?: File | Blob | null,
): FormData => {
  const formData = new FormData();

  const appendField = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;

    if (Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
      return;
    }

    formData.append(key, String(value));
  };

  appendField("code", payload.code);
  appendField("label", payload.label);
  appendField("backend", payload.backend);
  appendField("kind", payload.kind);
  appendField("description", payload.description);
  appendField("is_active", payload.is_active);
  appendField("currencies", payload.currencies);
  appendField("loop_type", payload.loop_type);
  appendField("min_kyc_tier", payload.min_kyc_tier);
  appendField("settlement_account_ref", payload.settlement_account_ref);
  appendField("supported_operations", payload.supported_operations);
  appendField("logo_media_id", payload.logo_media_id);

  if (logoFile) {
    formData.append("logo", logoFile);
  }

  return formData;
};

export const createPaymentMethod = async (
  payload: UpsertPaymentMethodPayload,
  logoFile?: File | Blob | null,
): Promise<PaymentMethodResponse> => {
  try {
    const request = logoFile ? buildPaymentMethodFormData(payload, logoFile) : payload;

    const { data } = await bankingHttpClient.post<PaymentMethodResponse & { is_active?: boolean }>(
      "/payment-methods",
      request,
      logoFile
        ? {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        : undefined,
    );
    return mapPaymentMethod(data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de créer le moyen de paiement"));
  }
};

export const updatePaymentMethod = async (
  code: string,
  payload: UpsertPaymentMethodPayload,
  logoFile?: File | Blob | null,
): Promise<PaymentMethodResponse> => {
  try {
    const request = logoFile
      ? buildPaymentMethodFormData({ ...payload, code }, logoFile)
      : { ...payload, code };

    const { data } = await bankingHttpClient.post<PaymentMethodResponse & { is_active?: boolean }>(
      "/payment-methods",
      request,
      logoFile
        ? {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        : undefined,
    );
    return mapPaymentMethod(data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de modifier le moyen de paiement"));
  }
};

export const deletePaymentMethod = async (code: string): Promise<void> => {
  try {
    await bankingHttpClient.delete(`/payment-methods/${encodeURIComponent(code)}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de supprimer le moyen de paiement"));
  }
};
