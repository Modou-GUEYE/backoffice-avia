import { describe, expect, it, vi, beforeEach } from "vitest";
import { httpClient } from "@/core/network/httpClient";
import {
  fetchIntegrations,
  fetchActiveIntegrations,
  getIntegration,
  createIntegration,
  patchIntegration,
  deleteIntegration,
  fetchIntegrationOperations,
  getIntegrationOperation,
  createIntegrationOperation,
  patchIntegrationOperation,
  deleteIntegrationOperation,
  importOperationPreview,
} from "./integrationsService";

vi.mock("@/core/network/httpClient", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("integrationsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("integrations CRUD", () => {
    it("fetchIntegrations appelle l'URL Packages Services correcte", async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: [{ id: "int-1", key: "fin-service", label: "Finance", base_url: "http://api", active: true }],
      });

      const res = await fetchIntegrations();
      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/packages-services/integrations");
      expect(res).toHaveLength(1);
    });

    it("fetchActiveIntegrations filtre les inactifs", async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: [
          { id: "1", active: true },
          { id: "2", active: false },
        ],
      });

      const res = await fetchActiveIntegrations();
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe("1");
    });

    it("createIntegration appelle POST /api/v1/packages-services/integrations", async () => {
      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: { id: "new-1", key: "k", label: "l", base_url: "u", active: true },
      });

      const res = await createIntegration({ key: "k", label: "l", base_url: "u" });
      expect(httpClient.post).toHaveBeenCalledWith("/api/v1/packages-services/integrations", {
        key: "k",
        label: "l",
        base_url: "u",
      });
      expect(res.id).toBe("new-1");
    });
  });

  describe("operations CRUD", () => {
    it("fetchIntegrationOperations appelle GET /api/v1/packages-services/integrations/{id}/operations", async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: [{ id: "op-1", key: "calc" }],
      });

      const res = await fetchIntegrationOperations("integ-123");
      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/packages-services/integrations/integ-123/operations");
      expect(res).toHaveLength(1);
    });

    it("createIntegrationOperation appelle POST avec le payload", async () => {
      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: { id: "op-new", key: "calc-fee" },
      });

      const payload = {
        key: "calc-fee",
        label: "Calculer",
        method: "GET",
        relative_path: "/fees",
      };

      const res = await createIntegrationOperation("integ-123", payload);
      expect(httpClient.post).toHaveBeenCalledWith(
        "/api/v1/packages-services/integrations/integ-123/operations",
        payload
      );
      expect(res.id).toBe("op-new");
    });
  });

  describe("importOperationPreview", () => {
    it("appelle import-preview avec un FormData et les headers multipart", async () => {
      const mockPreviewResponse = {
        operations: [
          {
            key: "calculate_fee",
            label: "Calculer les frais",
            method: "GET",
            relative_path: "/fees/calculate",
            request_schema: { type: "object" },
            response_schema: { type: "object" },
            response_options: [{ status_code: "200", response_schema: { type: "object" } }],
            requires_response_selection: false,
            warnings: [],
            errors: [],
          },
        ],
      };

      vi.mocked(httpClient.post).mockResolvedValueOnce({ data: mockPreviewResponse });

      const file = new File(['{"openapi": "3.0.0"}'], "spec.json", { type: "application/json" });
      const res = await importOperationPreview("integ-abc", file);

      expect(httpClient.post).toHaveBeenCalledWith(
        "/api/v1/packages-services/integrations/integ-abc/operations/import-preview",
        expect.any(FormData),
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      expect(res.operations).toHaveLength(1);
      expect(res.operations[0].key).toBe("calculate_fee");
    });

    it("gère l'erreur réseau ou HTTP avec un message d'erreur", async () => {
      vi.mocked(httpClient.post).mockRejectedValueOnce(new Error("Network Error"));
      const file = new File(["dummy"], "spec.yaml", { type: "text/yaml" });

      await expect(importOperationPreview("integ-abc", file)).rejects.toThrow(
        "Network Error"
      );
    });
  });
});
