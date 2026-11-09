import { describe, it, expect, vi, beforeEach } from "vitest";
import httpClient from "@/core/network/httpClient";
import {
  deletePackage,
  fetchPackageById,
  removeServiceFromPackage,
  removeServicesFromPackage,
  fetchPackagePaymentMethods,
  addPaymentMethodToPackage,
  addPaymentMethodsToPackage,
  setPackagePaymentMethodStatus,
  removePaymentMethodFromPackage,
} from "./packagesService";

vi.mock("@/core/network/httpClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("packagesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("deletePackage", () => {
    it("deletes the package directly via DELETE /api/v1/packages-services/packages/{id}", async () => {
      const pkgId = "pkg-123";
      vi.mocked(httpClient.delete).mockResolvedValue({ data: null });

      await deletePackage(pkgId);

      expect(httpClient.delete).toHaveBeenCalledWith(
        `/api/v1/packages-services/packages/${pkgId}`
      );
    });

    it("handles assignment error gracefully when deleting package", async () => {
      vi.mocked(httpClient.delete).mockRejectedValue(
        new Error("Package cannot be deleted because it has existing assignments")
      );

      await expect(deletePackage("pkg-assigned")).rejects.toThrow(
        "Ce package ne peut pas être supprimé car il est actuellement affecté à une ou plusieurs structures."
      );
    });
  });

  describe("services management", () => {
    it("removes single service with DELETE /api/v1/packages-services/packages/{package_id}/services and service_ids in body", async () => {
      vi.mocked(httpClient.delete).mockResolvedValue({ data: null });

      await removeServiceFromPackage("pkg-1", "srv-1");

      expect(httpClient.delete).toHaveBeenCalledWith(
        "/api/v1/packages-services/packages/pkg-1/services",
        { data: { service_ids: ["srv-1"] } }
      );
    });

    it("removes multiple services using the batch DELETE endpoint", async () => {
      vi.mocked(httpClient.delete).mockResolvedValue({ data: null });

      await removeServicesFromPackage("pkg-1", ["srv-1", "srv-2"]);

      expect(httpClient.delete).toHaveBeenCalledWith(
        "/api/v1/packages-services/packages/pkg-1/services",
        { data: { service_ids: ["srv-1", "srv-2"] } }
      );
    });
  });

  describe("package payment methods", () => {
    it("fetches package payment methods via GET /packages/{package_id}/payment-methods", async () => {
      const mockMethods = [
        { id: "ppm-1", package_id: "pkg-1", payment_method_id: "pm-1", is_enabled: true },
        { id: "ppm-2", package_id: "pkg-1", payment_method_id: "pm-2", is_enabled: false },
      ];
      vi.mocked(httpClient.get).mockResolvedValue({ data: mockMethods });

      const result = await fetchPackagePaymentMethods("pkg-1");

      expect(httpClient.get).toHaveBeenCalledWith(
        "/api/v1/packages-services/packages/pkg-1/payment-methods"
      );
      expect(result).toHaveLength(2);
      expect(result[0].payment_method_id).toBe("pm-1");
    });

    it("adds multiple payment methods to package via POST /packages/{package_id}/payment-methods with payment_method_ids", async () => {
      const mockCreated = [
        { id: "ppm-1", package_id: "pkg-1", payment_method_id: "pm-1", is_enabled: true },
        { id: "ppm-2", package_id: "pkg-1", payment_method_id: "pm-2", is_enabled: true },
      ];
      vi.mocked(httpClient.post).mockResolvedValue({ data: mockCreated });

      const result = await addPaymentMethodsToPackage("pkg-1", ["pm-1", "pm-2"]);

      expect(httpClient.post).toHaveBeenCalledWith(
        "/api/v1/packages-services/packages/pkg-1/payment-methods",
        { payment_method_ids: ["pm-1", "pm-2"] }
      );
      expect(result).toEqual(mockCreated);
    });

    it("adds single payment method to package via addPaymentMethodToPackage wrapper", async () => {
      const mockCreated = [{ id: "ppm-1", package_id: "pkg-1", payment_method_id: "pm-1", is_enabled: true }];
      vi.mocked(httpClient.post).mockResolvedValue({ data: mockCreated });

      const result = await addPaymentMethodToPackage("pkg-1", "pm-1");

      expect(httpClient.post).toHaveBeenCalledWith(
        "/api/v1/packages-services/packages/pkg-1/payment-methods",
        { payment_method_ids: ["pm-1"] }
      );
      expect(result).toEqual(mockCreated);
    });

    it("updates payment method status via PATCH /packages/{package_id}/payment-methods/{method_id}", async () => {
      const mockUpdated = { id: "ppm-1", package_id: "pkg-1", payment_method_id: "pm-1", is_enabled: false };
      vi.mocked(httpClient.patch).mockResolvedValue({ data: mockUpdated });

      const result = await setPackagePaymentMethodStatus("pkg-1", "pm-1", false);

      expect(httpClient.patch).toHaveBeenCalledWith(
        "/api/v1/packages-services/packages/pkg-1/payment-methods/pm-1",
        { is_enabled: false }
      );
      expect(result.is_enabled).toBe(false);
    });

    it("removes payment method from package via DELETE /packages/{package_id}/payment-methods/{method_id}", async () => {
      vi.mocked(httpClient.delete).mockResolvedValue({ data: null });

      await removePaymentMethodFromPackage("pkg-1", "pm-1");

      expect(httpClient.delete).toHaveBeenCalledWith(
        "/api/v1/packages-services/packages/pkg-1/payment-methods/pm-1"
      );
    });
  });

  describe("package queries", () => {
    it("fetches package by id with GET /api/v1/packages-services/packages/{id}", async () => {
      const mockPackage = {
        id: "pkg-123",
        code: "PKG-010",
        label: "Pack BCI",
        description: "Test BCI",
        client_types: ["PARTICULIER"],
        status: "ACTIVE",
      };
      vi.mocked(httpClient.get).mockResolvedValue({ data: mockPackage });

      const result = await fetchPackageById("pkg-123");

      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/packages-services/packages/pkg-123");
      expect(result.code).toBe("PKG-010");
      expect(result.label).toBe("Pack BCI");
      expect(result.status).toBe("active");
    });
  });
});
