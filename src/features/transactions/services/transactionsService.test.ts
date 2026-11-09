import { describe, it, expect, vi, beforeEach } from "vitest";
import httpClient from "@/core/network/httpClient";
import {
  fetchTransactions,
  fetchTransactionDetail,
  downloadTransactionsExport,
  buildTransactionParams,
} from "./transactionsService";

vi.mock("@/core/network/httpClient", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("transactionsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildTransactionParams", () => {
    it("should correctly serialize defined filters and skip 'all' values", () => {
      const params = buildTransactionParams({
        skip: 10,
        limit: 20,
        type_transaction: "RETRAIT",
        structure: "all",
        structure_id: "struct-123",
        reference: "TX-1234",
        statut: "TERMINEE",
        agence_id: "agency-456",
        agence: "Agence A",
        caisse_id: "caisse-321",
        agent_id: "agent-789",
        agent: "agent007",
        distributeur_id: "dist-001",
        produit_id: "prod-999",
        anomalie_ordre: true,
        montant_min: 1000,
        montant_max: 50000,
        date_from: "2026-09-01T00:00:00Z",
        date_to: "2026-09-18T23:59:59Z",
      });

      expect(params).toEqual({
        skip: 10,
        limit: 20,
        type_transaction: "RETRAIT",
        structure_id: "struct-123",
        reference: "TX-1234",
        statut: "TERMINEE",
        agence_id: "agency-456",
        agence: "Agence A",
        caisse_id: "caisse-321",
        agent_id: "agent-789",
        agent: "agent007",
        distributeur_id: "dist-001",
        produit_id: "prod-999",
        anomalie_ordre: true,
        montant_min: 1000,
        montant_max: 50000,
        date_from: "2026-09-01T00:00:00Z",
        date_to: "2026-09-18T23:59:59Z",
      });
      expect(params.structure).toBeUndefined();
    });
  });

  describe("fetchTransactions", () => {
    it("should call GET /api/v1/reporting/transactions and return list response without context header", async () => {
      const mockResponse = {
        data: {
          total: 1,
          skip: 0,
          limit: 20,
          items: [
            {
              id: "tx-uuid-1",
              reference: "REF-001",
              type_transaction: "VERSEMENT",
              statut: "TERMINEE",
              montant: 25000,
              structure: "ALPHA",
              initiateur: "Client Alpha",
              updated_at: "2026-09-18T10:00:00Z",
            },
          ],
        },
      };

      vi.mocked(httpClient.get).mockResolvedValueOnce(mockResponse);

      const res = await fetchTransactions({ limit: 20, skip: 0 });

      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/reporting/transactions", {
        params: { limit: 20, skip: 0 },
      });
      expect(res.total).toBe(1);
      expect(res.items).toHaveLength(1);
      expect(res.items[0].reference).toBe("REF-001");
    });

    it("should throw a user-friendly error on failure", async () => {
      vi.mocked(httpClient.get).mockRejectedValueOnce({
        response: { data: { detail: "Accès refusé" } },
      });

      await expect(fetchTransactions()).rejects.toThrow("Accès refusé");
    });
  });

  describe("fetchTransactionDetail", () => {
    it("should fetch transaction by ID without context header", async () => {
      const mockDetail = {
        id: "tx-uuid-1",
        reference: "REF-001",
        type_transaction: "VERSEMENT",
        statut: "TERMINEE",
        montant: 25000,
        structure: "ALPHA",
        initiateur: "Client Alpha",
        updated_at: "2026-09-18T10:00:00Z",
        created_at: "2026-09-18T09:59:00Z",
        raw_payloads: [{ step: "init", payload: {} }],
      };

      vi.mocked(httpClient.get).mockResolvedValueOnce({ data: mockDetail });

      const res = await fetchTransactionDetail("tx-uuid-1");

      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/reporting/transactions/tx-uuid-1");
      expect(res.reference).toBe("REF-001");
      expect(res.raw_payloads).toHaveLength(1);
    });
  });

  describe("downloadTransactionsExport", () => {
    it("should request blob and trigger browser download with context headers", async () => {
      const mockBlob = new Blob(["test-csv"], { type: "text/csv" });
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: mockBlob,
        headers: { "content-disposition": 'attachment; filename="transactions_custom.csv"' },
      });

      // Mock DOM createObjectURL and click
      const createObjectURLMock = vi.fn().mockReturnValue("blob:http://localhost/dummy");
      const revokeObjectURLMock = vi.fn();
      window.URL.createObjectURL = createObjectURLMock;
      window.URL.revokeObjectURL = revokeObjectURLMock;

      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

      await downloadTransactionsExport({ type_transaction: "RETRAIT" }, "csv");

      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/reporting/transactions/export", {
        params: { format: "csv", type_transaction: "RETRAIT" },
        responseType: "blob",
        headers: { Accept: "text/csv" },
      });
      expect(clickSpy).toHaveBeenCalled();

      clickSpy.mockRestore();
    });
  });
});
