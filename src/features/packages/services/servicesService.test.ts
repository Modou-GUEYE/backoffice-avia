import { describe, it, expect, vi, beforeEach } from "vitest";
import httpClient from "@/core/network/httpClient";
import {
  fetchServices,
  toggleServiceStatus,
  deleteService,
  createService,
  isTechnicalUser,
  fetchStructureServicePaymentFlow,
  createStructureServicePaymentFlow,
  updateStructureServicePaymentFlow,
  deleteStructureServicePaymentFlow,
  enableStructureServicePaymentFlow,
  disableStructureServicePaymentFlow,
} from "./servicesService";
import { useAuthStore } from "@/core/security/authStore";

type AuthState = ReturnType<typeof useAuthStore.getState>;

vi.mock("@/core/network/httpClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/core/security/authStore", () => ({
  useAuthStore: {
    getState: vi.fn(),
  },
}));

describe("servicesService - Dual Routing (Execution Engine Contracts vs Packages Services Engine)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isTechnicalUser", () => {
    it("returns true when role is Profil Technique", () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        user: { id: "1", role: "Profil Technique", permissions: [] },
      } as unknown as AuthState);
      expect(isTechnicalUser()).toBe(true);
    });

    it("returns true when permissions contain profil-technique", () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        user: { id: "1", role: "Admin", permissions: ["profile.bo-profil-technique"] },
      } as unknown as AuthState);
      expect(isTechnicalUser()).toBe(true);
    });

    it("returns false for standard business user", () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        user: { id: "1", role: "Gestionnaire", permissions: ["perm.bo.service.list"] },
      } as unknown as AuthState);
      expect(isTechnicalUser()).toBe(false);
    });
  });

  describe("fetchServices", () => {
    it("calls Gateway Execution Engine contracts endpoint for technical profile", async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        user: { id: "1", role: "Profil Technique", permissions: [] },
      } as unknown as AuthState);

      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          contracts: [
            {
              id: "c-1",
              service_type: "TRANSFER",
              version: "1.0",
              label: "Virement Bancaire",
              description: "Service de virement",
              source_format: "yaml",
              is_active: true,
              definition: { preconditions: [], execution_steps: [] },
            },
          ],
          total: 1,
        },
      });

      const result = await fetchServices();

      expect(httpClient.get).toHaveBeenCalledWith(
        "/api/v1/operation/contracts/",
        { params: { active_only: false } }
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: "c-1",
          code: "TRANSFER",
          label: "Virement Bancaire",
          status: "active",
          is_contract: true,
          version: "1.0",
        })
      );
    });

    it("calls Packages Services Engine endpoint for standard profile", async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        user: { id: "1", role: "Gestionnaire", permissions: ["perm.bo.service.list"] },
      } as unknown as AuthState);

      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          items: [
            {
              id: "srv-standard-1",
              code: "DEPOSIT",
              label: "Dépôt d'espèces",
              description: "Dépôt en agence",
              status: "active",
            },
          ],
          page: 1,
          page_size: 100,
          total: 1,
          total_pages: 1,
        },
      });

      const result = await fetchServices();

      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/packages-services/services?page=1&page_size=100");
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("DEPOSIT");
      expect(result[0].is_contract).toBeUndefined();
    });
    it("handles ServiceListResponse with items array from 8004", async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        user: { id: "1", role: "Gestionnaire", permissions: ["perm.bo.service.list"] },
      } as unknown as AuthState);

      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          items: [
            {
              id: "50bc3dbb-e829-41c3-9efd-0b5ec6114d14",
              code: "code-001",
              label: "virement",
              description: null,
              category_id: null,
              status: "ACTIVE",
              partner_id: "a15b5ba8-553b-4068-8306-f3d9a90c8c6f",
            },
          ],
          page: 1,
          page_size: 20,
          total: 1,
          total_pages: 1,
        },
      });

      const result = await fetchServices();

      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/packages-services/services?page=1&page_size=100");
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("code-001");
      expect(result[0].label).toBe("virement");
      expect(result[0].status).toBe("active");
    });
  });

  describe("toggleServiceStatus", () => {
    it("calls Gateway Execution Engine activate endpoint when technical user", async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        user: { id: "1", role: "Profil Technique", permissions: [] },
      } as unknown as AuthState);

      vi.mocked(httpClient.patch).mockResolvedValueOnce({
        data: {
          id: "c-1",
          service_type: "TRANSFER",
          version: "1.0",
          description: "desc",
          source_format: "yaml",
          is_active: true,
          definition: {},
        },
      });

      const result = await toggleServiceStatus("TRANSFER", true);

      expect(httpClient.patch).toHaveBeenCalledWith(
        "/api/v1/operation/contracts/TRANSFER/activate",
        { is_active: true }
      );
      expect(result.status).toBe("active");
    });

    it("calls POST /api/v1/packages-services/services/{id}/deactivate for standard profile", async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        user: { id: "1", role: "Gestionnaire", permissions: ["perm.bo.service.list"] },
      } as unknown as AuthState);

      const uuid = "bdff9271-3a0d-4599-832f-9bba2902bea7";
      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: {
          id: uuid,
          code: "service-03",
          label: "Paiements",
          status: "INACTIVE",
        },
      });

      const result = await toggleServiceStatus(uuid, false);

      expect(httpClient.post).toHaveBeenCalledWith(`/api/v1/packages-services/services/${uuid}/deactivate`);
      expect(result.status).toBe("inactive");
    });
  });

  describe("deleteService", () => {
    it("calls Gateway Execution Engine contract delete when technical user", async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        user: { id: "1", role: "Profil Technique", permissions: [] },
      } as unknown as AuthState);
      vi.mocked(httpClient.delete).mockResolvedValueOnce({ data: null });

      await deleteService("TRANSFER");

      expect(httpClient.delete).toHaveBeenCalledWith("/api/v1/operation/contracts/TRANSFER");
    });

    it("calls DELETE /api/v1/packages-services/services/{id} for standard profile", async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        user: { id: "1", role: "Gestionnaire", permissions: ["perm.bo.service.list"] },
      } as unknown as AuthState);
      const uuid = "bdff9271-3a0d-4599-832f-9bba2902bea7";
      vi.mocked(httpClient.delete).mockResolvedValueOnce({ data: null });

      await deleteService(uuid);

      expect(httpClient.delete).toHaveBeenCalledWith(`/api/v1/packages-services/services/${uuid}`);
    });
  });

  describe("createService", () => {
    it("calls Gateway Execution Engine raw create when contract YAML is supplied", async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        user: { id: "1", role: "Profil Technique", permissions: [] },
      } as unknown as AuthState);

      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: {
          id: "c-new",
          service_type: "BILL_PAYMENT",
          version: "1.0",
          description: "Bill payment",
          source_format: "yaml",
          is_active: true,
          definition: {},
        },
      });

      const rawYaml = 'service_type: "BILL_PAYMENT"\nversion: "1.0"';
      const result = await createService({
        code: "BILL_PAYMENT",
        label: "Paiement facture",
        description: "Test",
        rawContractYaml: rawYaml,
      });

      expect(httpClient.post).toHaveBeenCalledWith(
        "/api/v1/operation/contracts/raw",
        rawYaml,
        {
          headers: { "Content-Type": "application/x-yaml" },
        }
      );
      expect(result.code).toBe("BILL_PAYMENT");
      expect(result.is_contract).toBe(true);
    });

    it("calls POST /api/v1/packages-services/services for standard profile", async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        user: { id: "1", role: "Gestionnaire", permissions: ["perm.bo.service.list"] },
      } as unknown as AuthState);

      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: {
          id: "new-srv-uuid",
          code: "TEST",
          label: "Test Service",
          description: null,
          category_id: null,
          status: "ACTIVE",
        },
      });

      const result = await createService({
        code: "TEST",
        label: "Test Service",
        description: null,
      });

      expect(httpClient.post).toHaveBeenCalledWith("/api/v1/packages-services/services", {
        code: "TEST",
        label: "Test Service",
        description: null,
        category_id: null,
      });
      expect(result.id).toBe("new-srv-uuid");
      expect(result.status).toBe("active");
    });
  });

  describe("fetchServiceDetail", () => {
    it("calls Gateway Execution Engine GET /api/v1/operation/contracts/:id for technical profile", async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        user: { id: "1", role: "Profil Technique", permissions: [] },
      } as unknown as AuthState);

      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          id: "c-100",
          service_type: "TRANSFER",
          version: "1.0",
          label: "Virement Bancaire",
          description: "Contrat de virement",
          source_format: "yaml",
          is_active: true,
          definition: { steps: ["DEBIT"] },
        },
      });

      const { fetchServiceDetail } = await import("./servicesService");
      const result = await fetchServiceDetail("TRANSFER");

      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/operation/contracts/TRANSFER");
      expect(result.code).toBe("TRANSFER");
      expect(result.is_contract).toBe(true);
      expect(result.definition).toEqual({ steps: ["DEBIT"] });
    });

    it("calls Gateway Packages Services Engine GET /api/v1/packages-services/services/:id for standard profile", async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        user: { id: "1", role: "Gestionnaire", permissions: ["perm.bo.service.list"] },
      } as unknown as AuthState);

      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          id: "srv-standard-200",
          code: "BILL_PAY",
          label: "Paiement facture",
          description: "Description",
          status: "active",
        },
      });

      const { fetchServiceDetail } = await import("./servicesService");
      const result = await fetchServiceDetail("srv-standard-200");

      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/packages-services/services/srv-standard-200");
      expect(result.code).toBe("BILL_PAY");
      expect(result.is_contract).toBeUndefined();
    });
  });

  describe("Structure Payment Flows (Surcharge par Structure)", () => {
    const structId = "struct-4444";
    const srvId = "srv-5555";

    it("fetchStructureServicePaymentFlow returns flow formatted", async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          id: "flow-3333",
          structure_id: structId,
          service_id: srvId,
          source_payment_method_ids: ["pm-1"],
          destination_payment_method_ids: ["pm-2"],
          is_enabled: true,
          scope: "STRUCTURE",
          inherited: false,
        },
      });

      const flow = await fetchStructureServicePaymentFlow(structId, srvId);
      expect(httpClient.get).toHaveBeenCalledWith(
        `/api/v1/packages-services/structures/${structId}/services/${srvId}/payment-flow`
      );
      expect(flow?.id).toBe("flow-3333");
      expect(flow?.scope).toBe("STRUCTURE");
      expect(flow?.inherited).toBe(false);
    });

    it("fetchStructureServicePaymentFlow returns null on 404", async () => {
      vi.mocked(httpClient.get).mockRejectedValueOnce({
        response: { status: 404 },
      });

      const flow = await fetchStructureServicePaymentFlow(structId, srvId);
      expect(flow).toBeNull();
    });

    it("createStructureServicePaymentFlow posts formatted payload", async () => {
      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: {
          id: "flow-new",
          structure_id: structId,
          service_id: srvId,
          is_enabled: true,
        },
      });

      const result = await createStructureServicePaymentFlow(structId, srvId, {
        source_payment_method_ids: ["pm-1"],
        destination_payment_method_ids: ["pm-2"],
      });

      expect(httpClient.post).toHaveBeenCalledWith(
        `/api/v1/packages-services/structures/${structId}/services/${srvId}/payment-flow`,
        {
          source_payment_method_ids: ["pm-1"],
          destination_payment_method_ids: ["pm-2"],
          constraints: null,
        }
      );
      expect(result.id).toBe("flow-new");
    });

    it("updateStructureServicePaymentFlow puts formatted payload", async () => {
      vi.mocked(httpClient.put).mockResolvedValueOnce({
        data: {
          id: "flow-3333",
          structure_id: structId,
          service_id: srvId,
          is_enabled: true,
        },
      });

      const result = await updateStructureServicePaymentFlow(structId, srvId, {
        source_payment_method_ids: ["pm-1"],
        destination_payment_method_ids: ["pm-2"],
      });

      expect(httpClient.put).toHaveBeenCalledWith(
        `/api/v1/packages-services/structures/${structId}/services/${srvId}/payment-flow`,
        {
          source_payment_method_ids: ["pm-1"],
          destination_payment_method_ids: ["pm-2"],
          constraints: null,
        }
      );
      expect(result.id).toBe("flow-3333");
    });

    it("deleteStructureServicePaymentFlow deletes surcharge to revert to inheritance", async () => {
      vi.mocked(httpClient.delete).mockResolvedValueOnce({ data: null });

      await deleteStructureServicePaymentFlow(structId, srvId);

      expect(httpClient.delete).toHaveBeenCalledWith(
        `/api/v1/packages-services/structures/${structId}/services/${srvId}/payment-flow`
      );
    });

    it("enableStructureServicePaymentFlow enables structure flow", async () => {
      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: { id: "flow-3333", is_enabled: true },
      });

      const result = await enableStructureServicePaymentFlow(structId, srvId);

      expect(httpClient.post).toHaveBeenCalledWith(
        `/api/v1/packages-services/structures/${structId}/services/${srvId}/payment-flow/enable`
      );
      expect(result.is_enabled).toBe(true);
    });

    it("disableStructureServicePaymentFlow disables structure flow", async () => {
      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: { id: "flow-3333", is_enabled: false },
      });

      const result = await disableStructureServicePaymentFlow(structId, srvId);

      expect(httpClient.post).toHaveBeenCalledWith(
        `/api/v1/packages-services/structures/${structId}/services/${srvId}/payment-flow/disable`
      );
      expect(result.is_enabled).toBe(false);
    });
  });
});

