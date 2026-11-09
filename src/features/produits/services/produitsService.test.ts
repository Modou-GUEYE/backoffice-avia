import { describe, it, expect, vi, beforeEach } from "vitest";
import httpClient from "@/core/network/httpClient";
import {
  fetchProduits,
  fetchProduitById,
  fetchProductStructures,
  createProduit,
  updateProduit,
  toggleProduitStatus,
  archiveProduit,
  mapApiProductToUi,
} from "./produitsService";
import { ApiProductRead } from "../models/types";

vi.mock("@/core/network/httpClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/core/network/apiGateway", () => ({
  gatewayApiBaseUrl: "http://mock-gateway",
}));

describe("produitsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockApiProduct: ApiProductRead = {
    id: "prod-uuid-1",
    name: "DEMOPAY",
    code: "DEMOPAY",
    short_code: "SUNU",
    description: "Description test",
    settings: {
      structuresAssociees: ["struct-1"],
      logo: "data:image/png;base64,mock",
      users: [],
    },
    branding_config: { theme: "dark" },
    logo_url: "/api/v1/organisation/products/prod-uuid-1/logo",
    logo_media_id: "media-logo-1",
    media_id: "media-1",
    media_url: "/api/v1/media/1",
    administration_id: "admin-uuid-1",
    is_active: true,
    activated_at: "2026-05-01T10:00:00Z",
    deactivated_at: null,
    is_deleted: false,
  };

  describe("mapApiProductToUi", () => {
    it("maps all fields correctly using exclusively media_url", () => {
      const ui = mapApiProductToUi(mockApiProduct);
      expect(ui.id).toBe("prod-uuid-1");
      expect(ui.nom).toBe("DEMOPAY");
      expect(ui.code).toBe("DEMOPAY");
      expect(ui.shortCode).toBe("SUNU");
      expect(ui.description).toBe("Description test");
      expect(ui.logo).toBe("/api/v1/media/1");
      expect(ui.mediaUrl).toBe("/api/v1/media/1");
      expect(ui.statut).toBe("active");
      expect(ui.brandingConfig).toEqual({ theme: "dark" });
      expect(ui.administrationId).toBe("admin-uuid-1");
    });

    it("returns undefined when media_url is null", () => {
      const productWithoutMediaUrl: ApiProductRead = {
        ...mockApiProduct,
        media_url: null,
      };
      const ui = mapApiProductToUi(productWithoutMediaUrl);
      expect(ui.logo).toBeUndefined();
      expect(ui.mediaUrl).toBeUndefined();
    });
  });

  describe("fetchProduits", () => {
    it("calls GET /api/v1/organisation/products/ with params and returns mapped products with items, total, and summary", async () => {
      vi.mocked(httpClient.get).mockResolvedValue({
        data: {
          items: [mockApiProduct],
          total: 1,
          summary: { total: 1, actifs: 1, inactifs: 0 },
        },
      });

      const result = await fetchProduits({ skip: 0, limit: 50, include_inactive: true });

      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/organisation/products/", {
        params: { skip: 0, limit: 50, include_inactive: true },
      });
      expect(result).toHaveLength(1);
      expect(result[0].nom).toBe("DEMOPAY");
      expect(result.items).toHaveLength(1);
      expect(result.items[0].nom).toBe("DEMOPAY");
      expect(result.total).toBe(1);
      expect(result.summary).toEqual({ total: 1, actifs: 1, inactifs: 0 });
    });
  });

  describe("fetchProduitById", () => {
    it("calls GET /api/v1/organisation/products/{id} and returns mapped product", async () => {
      vi.mocked(httpClient.get).mockResolvedValue({ data: mockApiProduct });

      const result = await fetchProduitById("prod-uuid-1");

      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/organisation/products/prod-uuid-1");
      expect(result.nom).toBe("DEMOPAY");
    });
  });

  describe("fetchProductStructures", () => {
    it("calls GET /api/v1/organisation/products/{id}/structures with query params and returns structures", async () => {
      const mockStructures = [
        {
          id: "struct-uuid-1",
          name: "Banque Atlantique",
          code: "BA01",
          type: "BANQUE",
          is_active: true,
          product_id: "prod-uuid-1",
        },
      ];

      vi.mocked(httpClient.get).mockResolvedValue({ data: mockStructures });

      const result = await fetchProductStructures("prod-uuid-1", { skip: 0, limit: 50, search: "Atlantique" });

      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/organisation/products/prod-uuid-1/structures", {
        params: { skip: 0, limit: 50, search: "Atlantique" },
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Banque Atlantique");
    });
  });

  describe("createProduit", () => {
    it("calls POST /api/v1/products/ with full payload", async () => {
      vi.mocked(httpClient.get).mockResolvedValue({
        data: [{ id: "admin-uuid-1", name: "Admin", code: "ADM" }],
      });
      vi.mocked(httpClient.post).mockResolvedValue({ data: mockApiProduct });

      const result = await createProduit({
        nom: "NOUVEAU",
        code: "NOUV",
        libelleExpediteur: "NOUV",
        structuresAssociees: ["struct-1"],
        statut: "active",
        utilisateurs: [],
      });

      expect(httpClient.post).toHaveBeenCalledWith(
        "/api/v1/organisation/products/",
        expect.objectContaining({
          name: "NOUVEAU",
          code: "NOUV",
          short_code: "NOUV",
          administration_id: "admin-uuid-1",
        }),
      );
      // Les commissions passent par le service de commissions, pas par le produit
      expect(vi.mocked(httpClient.post).mock.calls[0][1]).not.toHaveProperty("commission_config");
      expect(result.id).toBe("prod-uuid-1");
    });

    it("sends FormData with binary file when file or logoFile is provided", async () => {
      vi.mocked(httpClient.get).mockResolvedValue({
        data: [{ id: "admin-uuid-1", name: "Admin", code: "ADM" }],
      });
      vi.mocked(httpClient.post).mockResolvedValue({ data: mockApiProduct });

      const mockFile = new File(["dummy content"], "logo.png", { type: "image/png" });

      const result = await createProduit({
        nom: "PRODUIT AVEC LOGO",
        code: "PLOGO",
        libelleExpediteur: "PLOGO",
        structuresAssociees: [],
        statut: "active",
        utilisateurs: [],
        file: mockFile,
      });

      expect(httpClient.post).toHaveBeenCalledWith(
        "/api/v1/organisation/products/",
        expect.any(FormData),
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      const calledFormData = vi.mocked(httpClient.post).mock.calls[0][1] as FormData;
      expect(calledFormData.get("name")).toBe("PRODUIT AVEC LOGO");
      expect(calledFormData.get("code")).toBe("PLOGO");
      expect(calledFormData.get("file")).toBe(mockFile);
      expect(result.id).toBe("prod-uuid-1");
    });
  });

  describe("updateProduit", () => {
    it("calls PATCH /api/v1/organisation/products/{id} with updated fields", async () => {
      vi.mocked(httpClient.patch).mockResolvedValue({ data: mockApiProduct });

      const result = await updateProduit("prod-uuid-1", {
        nom: "DEMOPAY MOD",
        libelleExpediteur: "SUNUMOD",
      });

      expect(httpClient.patch).toHaveBeenCalledWith(
        "/api/v1/organisation/products/prod-uuid-1",
        expect.objectContaining({
          name: "DEMOPAY MOD",
          short_code: "SUNUMOD",
        }),
      );
      expect(result.id).toBe("prod-uuid-1");
    });

    it("sends FormData with multipart/form-data when file or logoFile is provided", async () => {
      vi.mocked(httpClient.patch).mockResolvedValue({ data: mockApiProduct });

      const mockFile = new File(["dummy update"], "new-logo.png", { type: "image/png" });

      const result = await updateProduit("prod-uuid-1", {
        nom: "DEMOPAY NEW LOGO",
        file: mockFile,
      });

      expect(httpClient.patch).toHaveBeenCalledWith(
        "/api/v1/organisation/products/prod-uuid-1",
        expect.any(FormData),
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      const calledFormData = vi.mocked(httpClient.patch).mock.calls[0][1] as FormData;
      expect(calledFormData.get("name")).toBe("DEMOPAY NEW LOGO");
      expect(calledFormData.get("file")).toBe(mockFile);
      expect(result.id).toBe("prod-uuid-1");
    });
  });

  describe("toggleProduitStatus", () => {
    it("calls activate endpoint when activate is true", async () => {
      vi.mocked(httpClient.post).mockResolvedValue({ data: mockApiProduct });

      await toggleProduitStatus("prod-uuid-1", true);

      expect(httpClient.post).toHaveBeenCalledWith("/api/v1/organisation/products/prod-uuid-1/activate");
    });

    it("calls deactivate endpoint when activate is false", async () => {
      vi.mocked(httpClient.post).mockResolvedValue({ data: { ...mockApiProduct, is_active: false } });

      await toggleProduitStatus("prod-uuid-1", false);

      expect(httpClient.post).toHaveBeenCalledWith("/api/v1/organisation/products/prod-uuid-1/deactivate");
    });
  });

  describe("archiveProduit", () => {
    it("calls DELETE /api/v1/organisation/products/{id}", async () => {
      vi.mocked(httpClient.delete).mockResolvedValue({ data: null });

      await archiveProduit("prod-uuid-1");

      expect(httpClient.delete).toHaveBeenCalledWith("/api/v1/organisation/products/prod-uuid-1");
    });

    it("displays the exact message from backend on 409 Conflict has_structures", async () => {
      const conflictError = {
        name: "AxiosError",
        message: "Request failed with status code 409",
        response: {
          status: 409,
          data: {
            error: "has_structures",
            message: "Impossible de supprimer le produit : des structures y sont rattachées.",
            details: {
              product_id: "a412de68-c447-493d-a798-bee0fbb0ae1f",
            },
          },
        },
      };
      vi.mocked(httpClient.delete).mockRejectedValue(conflictError);

      await expect(archiveProduit("a412de68-c447-493d-a798-bee0fbb0ae1f")).rejects.toThrow(
        "Impossible de supprimer le produit : des structures y sont rattachées."
      );
    });
  });
});
