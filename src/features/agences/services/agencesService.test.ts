import { describe, it, expect, vi, beforeEach } from "vitest";
import httpClient from "@/core/network/httpClient";
import {
  fetchAgences,
  fetchAgenceById,
  createAgence,
  updateAgence,
  toggleAgenceStatus,
  deleteAgence,
  fetchAgencyCaisses,
} from "./agencesService";

vi.mock("@/core/network/httpClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("agencesService - OpenAPI contract alignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchAgences", () => {
    it("calls GET /api/v1/organisation/agencies/ with default parameters", async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          items: [{ id: "ag-1", name: "Agence 1", is_active: true }],
          total: 1,
          summary: { total: 1, actifs: 1, inactifs: 0 },
        },
      });

      const res = await fetchAgences();

      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/organisation/agencies/", {
        params: {
          include_inactive: true,
        },
      });
      expect(res.items).toHaveLength(1);
      expect(res.total).toBe(1);
    });

    it("passes search, city, and parent filters correctly", async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          items: [{ id: "ag-2", name: "Agence Dakar", is_active: true }],
          total: 1,
          summary: { total: 1, actifs: 1, inactifs: 0 },
        },
      });

      const res = await fetchAgences({
        skip: 0,
        limit: 20,
        search: "Dakar",
        city: "Dakar",
        parent_id: "struct-123",
        parent_type: "STRUCTURE",
      });

      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/organisation/agencies/", {
        params: {
          skip: 0,
          limit: 20,
          search: "Dakar",
          city: "Dakar",
          parent_id: "struct-123",
          parent_type: "STRUCTURE",
          include_inactive: true,
        },
      });
      expect(res.total).toBe(1);
    });
  });

  describe("fetchAgenceById", () => {
    it("calls GET /api/v1/organisation/agencies/{id}", async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: { id: "ag-123", name: "Agence Test", parent_type: "STRUCTURE", parent_id: "struct-1" },
      });

      const res = await fetchAgenceById("ag-123");

      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/organisation/agencies/ag-123");
      expect(res.name).toBe("Agence Test");
    });
  });

  describe("createAgence", () => {
    it("calls POST /api/v1/organisation/agencies/ with JSON payload", async () => {
      const payload = {
        name: "Nouvelle Agence",
        code: "AGC-01",
        parent_id: "struct-1",
        parent_type: "STRUCTURE" as const,
        city: "Dakar",
        country: "Sénégal",
      };

      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: { id: "new-ag-1", ...payload, is_active: true },
      });

      const res = await createAgence(payload);

      expect(httpClient.post).toHaveBeenCalledWith("/api/v1/organisation/agencies/", payload);
      expect(res.id).toBe("new-ag-1");
    });
  });

  describe("updateAgence", () => {
    it("calls PATCH /api/v1/organisation/agencies/{id} with JSON payload", async () => {
      const payload = { name: "Nom Mis A Jour" };
      vi.mocked(httpClient.patch).mockResolvedValueOnce({
        data: { id: "ag-1", name: "Nom Mis A Jour" },
      });

      const res = await updateAgence("ag-1", payload);

      expect(httpClient.patch).toHaveBeenCalledWith("/api/v1/organisation/agencies/ag-1", payload);
      expect(res.name).toBe("Nom Mis A Jour");
    });
  });

  describe("toggleAgenceStatus", () => {
    it("calls /activate when activate is true", async () => {
      const mockData = { id: "ag-1", is_active: true };
      vi.mocked(httpClient.post).mockResolvedValueOnce({ data: mockData });

      const result = await toggleAgenceStatus("ag-1", true);

      expect(httpClient.post).toHaveBeenCalledWith(
        "/api/v1/organisation/agencies/ag-1/activate"
      );
      expect(result).toEqual(mockData);
    });

    it("calls /deactivate when activate is false", async () => {
      const mockData = { id: "ag-1", is_active: false };
      vi.mocked(httpClient.post).mockResolvedValueOnce({ data: mockData });

      const result = await toggleAgenceStatus("ag-1", false);

      expect(httpClient.post).toHaveBeenCalledWith(
        "/api/v1/organisation/agencies/ag-1/deactivate"
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("deleteAgence", () => {
    it("calls DELETE /api/v1/organisation/agencies/{id}", async () => {
      vi.mocked(httpClient.delete).mockResolvedValueOnce({ data: null });

      await deleteAgence("ag-99");

      expect(httpClient.delete).toHaveBeenCalledWith("/api/v1/organisation/agencies/ag-99");
    });
  });

  describe("fetchAgencyCaisses", () => {
    it("calls GET /api/v1/organisation/agencies/{id}/caisses", async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: [{ id: "caisse-1", name: "Caisse 1", code: "C1" }],
      });

      const res = await fetchAgencyCaisses("ag-1", { search: "C1" });

      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/organisation/agencies/ag-1/caisses", {
        params: { search: "C1" },
      });
      expect(res).toHaveLength(1);
    });
  });
});
