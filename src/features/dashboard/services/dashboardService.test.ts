import { describe, expect, it, vi, beforeEach } from "vitest";
import httpClient from "@/core/network/httpClient";
import { fetchDashboardSummary } from "./dashboardService";

vi.mock("@/core/network/httpClient", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("dashboardService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchDashboardSummary calls /api/v1/reporting/dashboard/summary with empty params and no context header when no filters passed", async () => {
    const mockResponse = {
      nombre_transactions: 120,
      volume_total: 4500000,
      en_cours: { nombre: 5, volume: 150000 },
      service: { CASHIN: { nombre: 80, volume: 3000000 } },
      sens: { CREDIT: { nombre: 80, volume: 3000000 } },
      moyen_paiement: { CASH: { nombre: 80, volume: 3000000 } },
      produit: { RIA: { nombre: 50, volume: 2000000 } },
      distributeur: { ORANGE: { nombre: 70, volume: 2500000 } },
    };

    vi.mocked(httpClient.get).mockResolvedValueOnce({ data: mockResponse });

    const result = await fetchDashboardSummary();

    expect(httpClient.get).toHaveBeenCalledWith("/api/v1/reporting/dashboard/summary", {
      params: {},
    });
    expect(result).toEqual(mockResponse);
  });

  it("fetchDashboardSummary filters out undefined and 'all' query parameters, preserving perimeter IDs", async () => {
    const mockResponse = {
      nombre_transactions: 10,
      volume_total: 100000,
      en_cours: { nombre: 0, volume: 0 },
    };

    vi.mocked(httpClient.get).mockResolvedValueOnce({ data: mockResponse });

    const result = await fetchDashboardSummary({
      structure: "all",
      structure_id: "struct-123",
      agence: "all",
      agence_id: "agency-456",
      distributeur_id: "dist-789",
      produit_id: "prod-999",
      sens: "CREDIT",
      produit: "WAVE",
      date_from: "2026-09-01",
      date_to: "2026-09-17",
      distributeur: undefined,
    });

    expect(httpClient.get).toHaveBeenCalledWith("/api/v1/reporting/dashboard/summary", {
      params: {
        structure_id: "struct-123",
        agence_id: "agency-456",
        distributeur_id: "dist-789",
        produit_id: "prod-999",
        sens: "CREDIT",
        produit: "WAVE",
        date_from: "2026-09-01",
        date_to: "2026-09-17",
      },
    });
    expect(result.nombre_transactions).toBe(10);
  });

  it("fetchDashboardSummary throws error when API call fails", async () => {
    vi.mocked(httpClient.get).mockRejectedValueOnce({
      response: {
        data: {
          detail: "Accès refusé ou service indisponible",
        },
      },
    });

    await expect(fetchDashboardSummary()).rejects.toThrow(
      "Accès refusé ou service indisponible"
    );
  });
});
