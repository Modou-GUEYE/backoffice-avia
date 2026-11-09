import { describe, it, expect, vi, beforeEach } from "vitest";
import httpClient from "@/core/network/httpClient";
import {
  activateCaisse,
  deactivateCaisse,
  fetchCaisses,
  fetchCaisseById,
  createCaisse,
  updateCaisse,
  deleteCaisse,
  hasCaisseDuplicate,
} from "./caissesService";

vi.mock("@/core/network/httpClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("caissesService - OpenAPI contract alignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchCaisses", () => {
    it("calls GET /api/v1/organisation/caisses/ with query parameters", async () => {
      const mockResponse = {
        items: [
          { id: "c1", name: "Caisse 1", is_active: true },
          { id: "c2", name: "Caisse 2", is_active: false },
        ],
        total: 2,
        summary: { total: 2, actifs: 1, inactifs: 1 },
      };
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await fetchCaisses({ search: "caisse", is_active: true });

      expect(httpClient.get).toHaveBeenCalledWith(
        "/api/v1/organisation/caisses/",
        {
          params: {
            include_inactive: true,
            search: "caisse",
            is_active: true,
          },
        }
      );
      expect(result.length).toBe(2);
      expect(result.summary).toEqual({ total: 2, actifs: 1, inactifs: 1 });
      expect(result.total).toBe(2);
    });
  });

  describe("fetchCaisseById", () => {
    it("calls GET /api/v1/organisation/caisses/{id}", async () => {
      const mockData = { id: "cai-1", name: "Caisse Centrale" };
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data: mockData });

      const result = await fetchCaisseById("cai-1");

      expect(httpClient.get).toHaveBeenCalledWith(
        "/api/v1/organisation/caisses/cai-1"
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("createCaisse", () => {
    it("calls POST /api/v1/organisation/caisses/ with JSON payload", async () => {
      const payload = {
        name: "Caisse Principale",
        code: "CSS-01",
        agency_id: "agency-123",
        parent_id: "struct-123",
        parent_type: "STRUCTURE" as const,
      };
      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: { id: "new-cai-1", ...payload, is_active: true },
      });

      const result = await createCaisse(payload);

      expect(httpClient.post).toHaveBeenCalledWith(
        "/api/v1/organisation/caisses/",
        payload
      );
      expect(result.id).toBe("new-cai-1");
    });
  });

  describe("updateCaisse", () => {
    it("calls PATCH /api/v1/organisation/caisses/{id} with JSON payload", async () => {
      const payload = { name: "Caisse Rénovée" };
      vi.mocked(httpClient.patch).mockResolvedValueOnce({
        data: { id: "cai-1", name: "Caisse Rénovée" },
      });

      const result = await updateCaisse("cai-1", payload);

      expect(httpClient.patch).toHaveBeenCalledWith(
        "/api/v1/organisation/caisses/cai-1",
        payload
      );
      expect(result.name).toBe("Caisse Rénovée");
    });
  });

  describe("deleteCaisse", () => {
    it("calls DELETE /api/v1/organisation/caisses/{id}", async () => {
      vi.mocked(httpClient.delete).mockResolvedValueOnce({ data: null });

      await deleteCaisse("cai-99");

      expect(httpClient.delete).toHaveBeenCalledWith(
        "/api/v1/organisation/caisses/cai-99"
      );
    });
  });

  describe("activateCaisse", () => {
    it("calls POST /api/v1/organisation/caisses/{id}/activate", async () => {
      const mockData = { id: "cai-1", is_active: true };
      vi.mocked(httpClient.post).mockResolvedValueOnce({ data: mockData });

      const result = await activateCaisse("cai-1");

      expect(httpClient.post).toHaveBeenCalledWith(
        "/api/v1/organisation/caisses/cai-1/activate"
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("deactivateCaisse", () => {
    it("calls POST /api/v1/organisation/caisses/{id}/deactivate", async () => {
      const mockData = { id: "cai-1", is_active: false };
      vi.mocked(httpClient.post).mockResolvedValueOnce({ data: mockData });

      const result = await deactivateCaisse("cai-1");

      expect(httpClient.post).toHaveBeenCalledWith(
        "/api/v1/organisation/caisses/cai-1/deactivate"
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("hasCaisseDuplicate", () => {
    it("detects existing duplicate code within the same agency", async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          items: [
            { id: "c1", code: "CSS01", agency_id: "ag-1", is_deleted: false },
          ],
          total: 1,
        },
      });

      const isDup = await hasCaisseDuplicate("CSS01", "ag-1");
      expect(isDup).toBe(true);
    });

    it("ignores duplicate when id matches excludeId", async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          items: [
            { id: "c1", code: "CSS01", agency_id: "ag-1", is_deleted: false },
          ],
          total: 1,
        },
      });

      const isDup = await hasCaisseDuplicate("CSS01", "ag-1", "c1");
      expect(isDup).toBe(false);
    });
  });
});
