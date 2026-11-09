import { beforeEach, describe, expect, it, vi } from "vitest";
import httpClient from "@/core/network/httpClient";
import {
  fetchStructures,
  createStructure,
  updateStructure,
  toggleStructureStatus,
  deleteStructure,
  fetchStructureById,
  fetchStructureAgencies,
  fetchStructureCaisses,
  fetchStructureDistributors,
} from "./structuresService";

vi.mock("@/core/network/httpClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("structuresService - OpenAPI contract alignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchStructures", () => {
    it("calls GET /api/v1/organisation/structures/ with default parameters", async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          items: [{ id: "struct-1", name: "Structure 1", is_active: true }],
          total: 1,
          summary: { total: 1, actifs: 1, inactifs: 0 },
        },
      });

      const res = await fetchStructures();

      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/organisation/structures/", {
        params: {
          skip: 0,
          limit: 100,
          include_inactive: true,
        },
      });
      expect(res.items).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(res.summary).toEqual({ total: 1, actifs: 1, inactifs: 0 });
    });

    it("passes search, is_active and pagination filters correctly", async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          items: [{ id: "struct-2", name: "Alpha", is_active: true }],
          total: 10,
          summary: { total: 10, actifs: 8, inactifs: 2 },
        },
      });

      const res = await fetchStructures({
        skip: 10,
        limit: 20,
        search: "Alpha",
        is_active: true,
        include_inactive: false,
      });

      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/organisation/structures/", {
        params: {
          skip: 10,
          limit: 20,
          search: "Alpha",
          is_active: true,
          include_inactive: false,
        },
      });
      expect(res.total).toBe(10);
      expect(res.summary.inactifs).toBe(2);
    });
  });

  describe("fetchStructureById", () => {
    it("calls GET /api/v1/organisation/structures/{id}", async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: { id: "struct-123", name: "Test Struct" },
      });

      const res = await fetchStructureById("struct-123");

      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/organisation/structures/struct-123");
      expect(res.name).toBe("Test Struct");
    });
  });

  describe("createStructure", () => {
    it("posts JSON when no file is present", async () => {
      const payload = { name: "Nouvelle Structure", type: "IMF" as const, address: "Abidjan" };
      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: { id: "new-1", ...payload },
      });

      const res = await createStructure(payload);

      expect(httpClient.post).toHaveBeenCalledWith(
        "/api/v1/organisation/structures/",
        payload,
        expect.anything()
      );
      expect(res.id).toBe("new-1");
    });

    it("posts FormData when a file is provided", async () => {
      const file = new File(["dummy"], "logo.png", { type: "image/png" });
      const payload = { name: "Nouvelle Structure", type: "IMF" as const, address: "Abidjan" };

      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: { id: "new-2", ...payload, media_url: "http://storage/logo.png" },
      });

      const res = await createStructure(payload, file);

      expect(httpClient.post).toHaveBeenCalledWith(
        "/api/v1/organisation/structures/",
        expect.any(FormData),
        expect.objectContaining({
          headers: { "Content-Type": "multipart/form-data" },
        })
      );
      expect(res.id).toBe("new-2");
    });

    it("posts FormData when logoFile is provided in payload (matching Produit)", async () => {
      const mockFile = new File(["dummy"], "logo.png", { type: "image/png" });
      const payload = {
        name: "Structure Avec LogoFile",
        type: "IMF" as const,
        address: "Dakar",
        logoFile: mockFile,
        media_url: "blob:http://localhost:5173/preview-1",
      };

      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: { id: "new-logo-1", name: payload.name, media_url: "http://storage/logo.png" },
      });

      const res = await createStructure(payload);

      expect(httpClient.post).toHaveBeenCalledWith(
        "/api/v1/organisation/structures/",
        expect.any(FormData),
        expect.objectContaining({
          headers: { "Content-Type": "multipart/form-data" },
        })
      );
      const call = vi.mocked(httpClient.post).mock.calls[0];
      const sentFormData = call[1] as FormData;
      expect(sentFormData.get("file")).toBe(mockFile);
      expect(sentFormData.get("media_url")).toBeNull();
      expect(res.id).toBe("new-logo-1");
    });
  });

  describe("updateStructure", () => {
    it("patches JSON when no file is present", async () => {
      const payload = { name: "Nom Modifié" };
      vi.mocked(httpClient.patch).mockResolvedValueOnce({
        data: { id: "struct-1", name: "Nom Modifié" },
      });

      const res = await updateStructure("struct-1", payload);

      expect(httpClient.patch).toHaveBeenCalledWith(
        "/api/v1/organisation/structures/struct-1",
        payload,
        expect.anything()
      );
      expect(res.name).toBe("Nom Modifié");
    });

    it("patches FormData when a file is provided", async () => {
      const file = new File(["dummy"], "updated-logo.png", { type: "image/png" });
      const payload = { name: "Nom Modifié" };
      vi.mocked(httpClient.patch).mockResolvedValueOnce({
        data: { id: "struct-1", name: "Nom Modifié", media_url: "http://storage/updated-logo.png" },
      });

      const res = await updateStructure("struct-1", payload, file);

      expect(httpClient.patch).toHaveBeenCalledWith(
        "/api/v1/organisation/structures/struct-1",
        expect.any(FormData),
        expect.objectContaining({
          headers: { "Content-Type": "multipart/form-data" },
        })
      );
      expect(res.name).toBe("Nom Modifié");
    });
  });

  describe("toggleStructureStatus", () => {
    it("calls /activate when activate is true", async () => {
      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: { id: "struct-1", is_active: true },
      });

      await toggleStructureStatus("struct-1", true);

      expect(httpClient.post).toHaveBeenCalledWith(
        "/api/v1/organisation/structures/struct-1/activate"
      );
    });

    it("calls /deactivate when activate is false", async () => {
      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: { id: "struct-1", is_active: false },
      });

      await toggleStructureStatus("struct-1", false);

      expect(httpClient.post).toHaveBeenCalledWith(
        "/api/v1/organisation/structures/struct-1/deactivate"
      );
    });
  });

  describe("deleteStructure", () => {
    it("calls DELETE /api/v1/organisation/structures/{id}", async () => {
      vi.mocked(httpClient.delete).mockResolvedValueOnce({ data: null });

      await deleteStructure("struct-99");

      expect(httpClient.delete).toHaveBeenCalledWith(
        "/api/v1/organisation/structures/struct-99"
      );
    });
  });

  describe("subresources", () => {
    it("fetches structure agencies from /api/v1/organisation/structures/{id}/agencies", async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: [{ id: "agence-1", name: "Agence Centre" }],
      });

      const agencies = await fetchStructureAgencies("struct-1");
      expect(httpClient.get).toHaveBeenCalledWith(
        "/api/v1/organisation/structures/struct-1/agencies",
        { params: undefined }
      );
      expect(agencies).toHaveLength(1);
    });

    it("fetches structure caisses from /api/v1/organisation/structures/{id}/caisses", async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: [{ id: "caisse-1", name: "Caisse Principale" }],
      });

      const caisses = await fetchStructureCaisses("struct-1");
      expect(httpClient.get).toHaveBeenCalledWith(
        "/api/v1/organisation/structures/struct-1/caisses",
        { params: undefined }
      );
      expect(caisses).toHaveLength(1);
    });

    it("fetches structure distributors from /api/v1/organisation/structures/{id}/distributors", async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: [{ id: "dist-1", name: "Distributeur Nord" }],
      });

      const distributors = await fetchStructureDistributors("struct-1");
      expect(httpClient.get).toHaveBeenCalledWith(
        "/api/v1/organisation/structures/struct-1/distributors",
        { params: undefined }
      );
      expect(distributors).toHaveLength(1);
    });
  });
});

