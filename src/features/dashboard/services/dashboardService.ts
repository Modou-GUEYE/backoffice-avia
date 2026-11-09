import httpClient from "@/core/network/httpClient";
import { DashboardFilters, DashboardSummaryResponse } from "../models/types";

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

export const fetchDashboardSummary = async (
  filters?: DashboardFilters
): Promise<DashboardSummaryResponse> => {
  try {
    const params: Record<string, string> = {};

    if (filters) {
      if (filters.date_from?.trim()) params.date_from = filters.date_from.trim();
      if (filters.date_to?.trim()) params.date_to = filters.date_to.trim();
      if (filters.structure_id?.trim() && filters.structure_id !== "all") {
        params.structure_id = filters.structure_id.trim();
      }
      if (filters.entite_id?.trim() && filters.entite_id !== "all") {
        params.entite_id = filters.entite_id.trim();
      }
      if (filters.structure?.trim() && filters.structure !== "all") params.structure = filters.structure.trim();
      if (filters.agence_id?.trim() && filters.agence_id !== "all") {
        params.agence_id = filters.agence_id.trim();
      }
      if (filters.agence?.trim() && filters.agence !== "all") params.agence = filters.agence.trim();
      if (filters.caisse_id?.trim() && filters.caisse_id !== "all") params.caisse_id = filters.caisse_id.trim();
      if (filters.type_transaction?.trim() && filters.type_transaction !== "all") {
        params.type_transaction = filters.type_transaction.trim();
      }
      if (filters.sens?.trim() && filters.sens !== "all") params.sens = filters.sens.trim();
      if (filters.moyen_paiement?.trim() && filters.moyen_paiement !== "all") {
        params.moyen_paiement = filters.moyen_paiement.trim();
      }
      if (filters.produit_id?.trim() && filters.produit_id !== "all") {
        params.produit_id = filters.produit_id.trim();
      }
      if (filters.produit?.trim() && filters.produit !== "all") params.produit = filters.produit.trim();
      if (filters.distributeur_id?.trim() && filters.distributeur_id !== "all") {
        params.distributeur_id = filters.distributeur_id.trim();
      }
      if (filters.distributeur?.trim() && filters.distributeur !== "all") {
        params.distributeur = filters.distributeur.trim();
      }
      if (filters.agent_id?.trim()) params.agent_id = filters.agent_id.trim();
    }

    // Le Reporting applique le périmètre du jeton (Bearer) : aucun en-tête de contexte
    const { data } = await httpClient.get<DashboardSummaryResponse>("/api/v1/reporting/dashboard/summary", { params });

    return {
      nombre_transactions: Number(data?.nombre_transactions ?? 0),
      volume_total: Number(data?.volume_total ?? 0),
      en_cours: {
        nombre: Number(data?.en_cours?.nombre ?? 0),
        volume: Number(data?.en_cours?.volume ?? 0),
      },
      service: data?.service ?? {},
      sens: data?.sens ?? {},
      moyen_paiement: data?.moyen_paiement ?? {},
      produit: data?.produit ?? {},
      distributeur: data?.distributeur ?? {},
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible de charger la synthèse du tableau de bord"));
  }
};
