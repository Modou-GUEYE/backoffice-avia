import { describe, it, expect, vi, beforeEach } from "vitest";
import httpClient from "@/core/network/httpClient";
import {
  fetchCatalogServices,
  replacePartnerServices,
  fetchPartnerServices,
  fetchServicePartner,
  fetchPointsDeVente,
  createPointDeVente,
  updatePointDeVente,
  deletePointDeVente,
  togglePointDeVenteStatus,
} from "./partenairesService";

vi.mock("@/core/network/httpClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("partenairesService - Services assignment & catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchCatalogServices", () => {
    it("returns array directly when data is array", async () => {
      const mockServices = [
        {
          id: "srv-1",
          code: "SRV_1",
          label: "Service 1",
          name: undefined,
          description: null,
          status: "active",
          owner_code: null,
          partner_id: null,
        },
        {
          id: "srv-2",
          code: "SRV_2",
          label: "Service 2",
          name: undefined,
          description: null,
          status: "active",
          owner_code: null,
          partner_id: null,
        },
      ];
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data: mockServices });

      const result = await fetchCatalogServices();

      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/packages-services/services");
      expect(result).toEqual(mockServices);
    });

    it("returns items when response is ServiceListResponse with items array", async () => {
      const apiResponse = {
        items: [
          {
            id: "srv-1",
            code: "SRV_1",
            label: "Service 1",
            owner_code: "PART_01",
            partner_id: "p-1",
            status: "active",
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
      };
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data: apiResponse });

      const result = await fetchCatalogServices({ owner_code: "PART_01", page: 1, page_size: 20 });
      expect(httpClient.get).toHaveBeenCalledWith(
        "/api/v1/packages-services/services?owner_code=PART_01&page=1&page_size=20"
      );
      expect(result).toEqual([
        {
          id: "srv-1",
          code: "SRV_1",
          label: "Service 1",
          name: undefined,
          description: null,
          status: "active",
          owner_code: "PART_01",
          partner_id: "p-1",
        },
      ]);
    });

    it("filters with owner_code passed as string", async () => {
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: { items: [] },
      });

      await fetchCatalogServices("OWNER123");
      expect(httpClient.get).toHaveBeenCalledWith(
        "/api/v1/packages-services/services?owner_code=OWNER123"
      );
    });

    it("returns data.data when response is wrapped in an object", async () => {
      const mockServices = [
        {
          id: "srv-1",
          code: "SRV_1",
          label: "Service 1",
          name: undefined,
          description: null,
          status: "active",
          owner_code: null,
          partner_id: null,
        },
      ];
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data: { data: mockServices } });

      const result = await fetchCatalogServices();
      expect(result).toEqual(mockServices);
    });

    it("returns empty array on network error without throwing", async () => {
      vi.mocked(httpClient.get).mockRejectedValueOnce(new Error("Network failure"));

      const result = await fetchCatalogServices();
      expect(result).toEqual([]);
    });
  });

  describe("replacePartnerServices", () => {
    it("calls PUT /api/v1/packages-services/partners/{id}/services with service_ids", async () => {
      const partnerId = "part-123";
      const serviceIds = ["srv-1", "srv-2"];
      const responsePayload = { partner_id: partnerId, service_ids: serviceIds };

      vi.mocked(httpClient.put).mockResolvedValueOnce({ data: responsePayload });

      const result = await replacePartnerServices(partnerId, serviceIds);

      expect(httpClient.put).toHaveBeenCalledWith(
        `/api/v1/packages-services/partners/${partnerId}/services`,
        { service_ids: serviceIds }
      );
      expect(result).toEqual(responsePayload);
    });

    it("throws a readable error message on failure", async () => {
      vi.mocked(httpClient.put).mockRejectedValueOnce({
        response: {
          data: {
            detail: "Partner not found",
          },
        },
      });

      await expect(replacePartnerServices("invalid-id", ["srv-1"])).rejects.toThrow(
        "Partner not found"
      );
    });
  });

  describe("fetchPartnerServices", () => {
    it("returns mapped services when endpoint returns array", async () => {
      const rawServices = [
        {
          id: "srv-1",
          libelle: "Service A",
          code: "SRV_A",
          canal: "WALLET",
          is_active: true,
          partner_id: "part-1",
        },
      ];
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data: rawServices });

      const result = await fetchPartnerServices("part-1");

      expect(httpClient.get).toHaveBeenCalledWith(
        "/api/v1/packages-services/partners/part-1/services"
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("srv-1");
      expect(result[0].libelle).toBe("Service A");
      expect(result[0].statut).toBe("actif");
    });

    it("handles backend ServiceResponse with label, status: ACTIVE and creation_date", async () => {
      const backendServices = [
        {
          id: "srv-2",
          label: "Virement Bancaire",
          code: "VIR_01",
          status: "ACTIVE",
          creation_date: "2026-09-17T16:13:11.730305Z",
          partner_id: "part-1",
        },
      ];
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data: backendServices });

      const result = await fetchPartnerServices("part-1");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("srv-2");
      expect(result[0].libelle).toBe("Virement Bancaire");
      expect(result[0].name).toBe("Virement Bancaire");
      expect(result[0].statut).toBe("actif");
      expect(result[0].activatedAt).toBe("2026-09-17T16:13:11.730305Z");
    });

    it("returns empty array on 404/501 error gracefully", async () => {
      vi.mocked(httpClient.get).mockRejectedValueOnce(new Error("Not implemented"));

      const result = await fetchPartnerServices("part-1");
      expect(result).toEqual([]);
    });
  });

  describe("fetchServicePartner", () => {
    it("calls GET /api/v1/packages-services/services/{id}/partner and returns PartnerResponse", async () => {
      const mockPartner = {
        id: "part-123",
        label: "Entreprise Partenaire",
        status: "ACTIVE",
        parent_ref_id: null,
        parent_ref_type: null,
        event_timestamp: "2026-09-17T12:29:30.424007Z",
      };
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data: mockPartner });

      const result = await fetchServicePartner("srv-abc");

      expect(httpClient.get).toHaveBeenCalledWith(
        "/api/v1/packages-services/services/srv-abc/partner"
      );
      expect(result).toEqual(mockPartner);
    });

    it("throws a formatted error message on failure", async () => {
      vi.mocked(httpClient.get).mockRejectedValueOnce({
        response: {
          data: {
            detail: "Service not found",
          },
        },
      });

      await expect(fetchServicePartner("unknown-srv")).rejects.toThrow("Service not found");
    });
  });

  describe("Points de Vente CRUD", () => {
    const partnerId = "part-123";

    it("fetchPointsDeVente calls GET /api/v1/organisation/partners/{id}/points-de-vente", async () => {
      const mockPdvs = [
        {
          id: "pdv-1",
          libelle: "Agence Centrale",
          name: "Agence Centrale",
          code: "PDV-01",
          adresse: "123 Rue Principale",
          telephone: "770000000",
          is_active: true,
          partner_id: partnerId,
        },
      ];
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data: mockPdvs });

      const result = await fetchPointsDeVente(partnerId);

      expect(httpClient.get).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/organisation/partners/${partnerId}/points-de-vente`)
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("pdv-1");
      expect(result[0].libelle).toBe("Agence Centrale");
      expect(result[0].statut).toBe("actif");
    });

    it("createPointDeVente calls POST /api/v1/organisation/partners/{id}/points-de-vente", async () => {
      const newPdv = {
        name: "Point Test",
        libelle: "Point Test",
        code: "TEST-01",
      };
      vi.mocked(httpClient.post).mockResolvedValueOnce({
        data: {
          id: "pdv-new",
          ...newPdv,
          is_active: true,
          partner_id: partnerId,
        },
      });

      const result = await createPointDeVente(partnerId, newPdv);

      expect(httpClient.post).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/organisation/partners/${partnerId}/points-de-vente`),
        expect.objectContaining({ name: "Point Test", libelle: "Point Test", partner_id: partnerId })
      );
      expect(result.id).toBe("pdv-new");
      expect(result.statut).toBe("actif");
    });

    it("updatePointDeVente calls PATCH /api/v1/organisation/partners/{id}/points-de-vente/{pdv_id}", async () => {
      const pdvId = "pdv-1";
      vi.mocked(httpClient.patch).mockResolvedValueOnce({
        data: {
          id: pdvId,
          libelle: "Agence Modifiée",
          name: "Agence Modifiée",
          is_active: false,
          partner_id: partnerId,
        },
      });

      const result = await updatePointDeVente(partnerId, pdvId, { libelle: "Agence Modifiée", is_active: false });

      expect(httpClient.patch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/organisation/partners/${partnerId}/points-de-vente/${pdvId}`),
        expect.objectContaining({ libelle: "Agence Modifiée", is_active: false })
      );
      expect(result.statut).toBe("inactif");
    });

    it("deletePointDeVente calls DELETE /api/v1/organisation/partners/{id}/points-de-vente/{pdv_id}", async () => {
      const pdvId = "pdv-1";
      vi.mocked(httpClient.delete).mockResolvedValueOnce({ data: null });

      await deletePointDeVente(partnerId, pdvId);

      expect(httpClient.delete).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/organisation/partners/${partnerId}/points-de-vente/${pdvId}`)
      );
    });
  });

  describe("togglePointDeVenteStatus", () => {
    it("appelle les endpoints dédiés activate / deactivate sans corps", async () => {
      vi.mocked(httpClient.post).mockResolvedValue({ data: { id: "pdv-1", name: "Boutique", is_active: true } });

      await togglePointDeVenteStatus("partner-1", "pdv-1", true);
      await togglePointDeVenteStatus("partner-1", "pdv-1", false);

      const urls = vi.mocked(httpClient.post).mock.calls.map(([url, body]) => [url, body]);
      expect(urls[0][0]).toEqual(expect.stringContaining("/api/v1/organisation/partners/partner-1/points-de-vente/pdv-1/activate"));
      expect(urls[1][0]).toEqual(expect.stringContaining("/api/v1/organisation/partners/partner-1/points-de-vente/pdv-1/deactivate"));
      expect(urls.every(([, body]) => body === undefined)).toBe(true);
      expect(httpClient.patch).not.toHaveBeenCalled();
    });
  });
});
