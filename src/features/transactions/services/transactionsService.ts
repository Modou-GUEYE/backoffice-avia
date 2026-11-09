import httpClient from "@/core/network/httpClient";
import {
  TransactionDetailOut,
  TransactionExportFormat,
  TransactionFilters,
  TransactionListResponse,
} from "../models/types";


const getErrorMessage = (error: unknown, fallback: string): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: unknown } }).response?.data === "object"
  ) {
    const data = (error as { response?: { data?: Record<string, unknown> } }).response?.data ?? {};
    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export const buildTransactionParams = (
  filters?: TransactionFilters
): Record<string, string | number | boolean> => {
  const params: Record<string, string | number | boolean> = {};
  if (!filters) return params;

  if (typeof filters.skip === "number" && filters.skip >= 0) params.skip = filters.skip;
  if (typeof filters.limit === "number" && filters.limit > 0) params.limit = filters.limit;

  if (filters.type_transaction?.trim() && filters.type_transaction !== "all") {
    params.type_transaction = filters.type_transaction.trim();
  }
  if (filters.structure_id?.trim() && filters.structure_id !== "all") {
    params.structure_id = filters.structure_id.trim();
  }
  if (filters.entite_id?.trim() && filters.entite_id !== "all") {
    params.entite_id = filters.entite_id.trim();
  }
  if (filters.structure?.trim() && filters.structure !== "all") {
    params.structure = filters.structure.trim();
  }
  if (filters.reference?.trim()) {
    params.reference = filters.reference.trim();
  }
  if (filters.statut?.trim() && filters.statut !== "all") {
    params.statut = filters.statut.trim();
  }
  if (filters.agence_id?.trim() && filters.agence_id !== "all") {
    params.agence_id = filters.agence_id.trim();
  }
  if (filters.agence?.trim() && filters.agence !== "all") {
    params.agence = filters.agence.trim();
  }
  if (filters.caisse_id?.trim() && filters.caisse_id !== "all") {
    params.caisse_id = filters.caisse_id.trim();
  }
  if (filters.agent_id?.trim() && filters.agent_id !== "all") {
    params.agent_id = filters.agent_id.trim();
  }
  if (filters.agent?.trim()) {
    params.agent = filters.agent.trim();
  }
  if (typeof filters.anomalie_ordre === "boolean") {
    params.anomalie_ordre = filters.anomalie_ordre;
  }
  if (filters.sens?.trim() && filters.sens !== "all") {
    params.sens = filters.sens.trim();
  }
  if (filters.moyen_paiement?.trim() && filters.moyen_paiement !== "all") {
    params.moyen_paiement = filters.moyen_paiement.trim();
  }
  if (filters.produit_id?.trim() && filters.produit_id !== "all") {
    params.produit_id = filters.produit_id.trim();
  }
  if (filters.produit?.trim() && filters.produit !== "all") {
    params.produit = filters.produit.trim();
  }
  if (filters.distributeur_id?.trim() && filters.distributeur_id !== "all") {
    params.distributeur_id = filters.distributeur_id.trim();
  }
  if (filters.distributeur?.trim() && filters.distributeur !== "all") {
    params.distributeur = filters.distributeur.trim();
  }
  if (typeof filters.montant_min === "number" && !Number.isNaN(filters.montant_min)) {
    params.montant_min = filters.montant_min;
  }
  if (typeof filters.montant_max === "number" && !Number.isNaN(filters.montant_max)) {
    params.montant_max = filters.montant_max;
  }
  if (filters.date_from?.trim()) {
    params.date_from = filters.date_from.trim();
  }
  if (filters.date_to?.trim()) {
    params.date_to = filters.date_to.trim();
  }

  return params;
};

/**
 * Récupère la liste paginée et filtrée des transactions
 * GET /api/v1/reporting/transactions
 */
export const fetchTransactions = async (
  filters?: TransactionFilters
): Promise<TransactionListResponse> => {
  try {
    const params = buildTransactionParams(filters);
    // Le Reporting applique le périmètre du jeton (Bearer) : aucun en-tête de contexte
    const { data } = await httpClient.get<TransactionListResponse>("/api/v1/reporting/transactions", { params });
    return {
      total: Number(data?.total ?? 0),
      skip: Number(data?.skip ?? 0),
      limit: Number(data?.limit ?? 20),
      items: Array.isArray(data?.items) ? data.items : [],
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger le journal des transactions."));
  }
};

/**
 * Récupère les détails complets d'une transaction avec ses payloads bruts
 * GET /api/v1/reporting/transactions/{transaction_id}
 */
export const fetchTransactionDetail = async (
  transactionId: string
): Promise<TransactionDetailOut> => {
  try {
    const { data } = await httpClient.get<TransactionDetailOut>(
      `/api/v1/reporting/transactions/${encodeURIComponent(transactionId)}`,
    );
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger les détails de la transaction."));
  }
};

/**
 * Télécharge l'export des transactions (CSV, XLSX, PDF)
 * GET /api/v1/reporting/transactions/export?format=...
 */
export const downloadTransactionsExport = async (
  filters: TransactionFilters = {},
  format: TransactionExportFormat = "csv"
): Promise<void> => {
  const params = buildTransactionParams(filters);
  delete params.skip;
  delete params.limit;
  params.format = format;

  const mimeTypes: Record<TransactionExportFormat, string> = {
    csv: "text/csv",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pdf: "application/pdf",
  };

  try {
    const headers = { Accept: mimeTypes[format] || "*/*" };
    const response = await httpClient.get<Blob>(
      "/api/v1/reporting/transactions/export",
      {
        params,
        responseType: "blob",
        headers,
      }
    );

    const contentDisposition = response.headers["content-disposition"] as string | undefined;
    const filenameMatch = contentDisposition
      ? /filename\*?=(?:UTF-8'')?([^";]+)/i.exec(contentDisposition)
      : null;
    const filename = filenameMatch?.[1]
      ? decodeURIComponent(filenameMatch[1].replace(/["']/g, ""))
      : `transactions_${new Date().toISOString().slice(0, 10)}.${format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : "csv"}`;

    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    throw new Error(getErrorMessage(error, `Échec de l'export ${format.toUpperCase()} des transactions.`));
  }
};
