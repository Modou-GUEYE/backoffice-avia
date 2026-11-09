import { beforeEach, describe, expect, it, vi } from "vitest";
import { rulesHttpClient } from "./feesService";
import {
  fetchCommissions,
  createCommission,
  updateCommission,
  deleteCommission,
  toggleCommissionStatus,
  fetchCommissionDetail,
  fetchCommissionsConsolidated,
} from "./commissionsService";

vi.mock("./feesService", () => ({
  rulesHttpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("commissionsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchCommissions calls GET /commissions with params", async () => {
    const mockData = [
      {
        id: "comm-1",
        service_type: "VERSEMENT",
        tenant_level: "GLOBAL",
        rate_structure: 40,
        rate_distributeur: 30,
        rate_groupement: 15,
        rate_partenaire_technique: 15,
      },
    ];
    vi.mocked(rulesHttpClient.get).mockResolvedValueOnce({ data: { data: mockData } });

    const res = await fetchCommissions({ tenant_level: "GLOBAL", service_type: "VERSEMENT" });

    expect(rulesHttpClient.get).toHaveBeenCalledWith("/commissions", {
      params: { tenant_level: "GLOBAL", service_type: "VERSEMENT" },
    });
    expect(res).toEqual(mockData);
  });

  it("createCommission calls POST /commissions", async () => {
    const payload = {
      tenant_level: "GLOBAL" as const,
      service_type: "VERSEMENT" as const,
      phase: "UNIQUE" as const,
      rate_structure: 40,
      rate_tca_structure: 17,
      rate_distributeur: 30,
      rate_groupement: 15,
      rate_partenaire_technique: 15,
    };
    const mockCreated = { id: "comm-new", ...payload, is_active: true };
    vi.mocked(rulesHttpClient.post).mockResolvedValueOnce({ data: { data: mockCreated } });

    const res = await createCommission(payload);

    expect(rulesHttpClient.post).toHaveBeenCalledWith("/commissions", payload);
    expect(res).toEqual(mockCreated);
  });

  it("updateCommission calls PUT /commissions/:id", async () => {
    const payload = {
      rate_structure: 50,
      rate_tca_structure: 17,
      rate_distributeur: 25,
      rate_groupement: 15,
      rate_partenaire_technique: 10,
    };
    const mockUpdated = { id: "comm-1", ...payload };
    vi.mocked(rulesHttpClient.put).mockResolvedValueOnce({ data: { data: mockUpdated } });

    const res = await updateCommission("comm-1", payload);

    expect(rulesHttpClient.put).toHaveBeenCalledWith("/commissions/comm-1", payload);
    expect(res).toEqual(mockUpdated);
  });

  it("deleteCommission calls DELETE /commissions/:id", async () => {
    vi.mocked(rulesHttpClient.delete).mockResolvedValueOnce({ data: {} });

    await deleteCommission("comm-1");

    expect(rulesHttpClient.delete).toHaveBeenCalledWith("/commissions/comm-1");
  });

  it("toggleCommissionStatus calls PATCH /commissions/:id/status", async () => {
    vi.mocked(rulesHttpClient.patch).mockResolvedValueOnce({ data: {} });

    await toggleCommissionStatus("comm-1", true);

    expect(rulesHttpClient.patch).toHaveBeenCalledWith("/commissions/comm-1/status", { is_active: true });
  });

  it("fetchCommissionsConsolidated calls GET /commissions/consolidated", async () => {
    vi.mocked(rulesHttpClient.get).mockResolvedValueOnce({ data: { data: [] } });

    const res = await fetchCommissionsConsolidated();

    expect(rulesHttpClient.get).toHaveBeenCalledWith("/commissions/consolidated");
    expect(res).toEqual([]);
  });

  it("fetchCommissionDetail calls GET /commissions/:id", async () => {
    const mockItem = { id: "comm-1", rate_structure: 40 };
    vi.mocked(rulesHttpClient.get).mockResolvedValueOnce({ data: { data: mockItem } });

    const res = await fetchCommissionDetail("comm-1");

    expect(rulesHttpClient.get).toHaveBeenCalledWith("/commissions/comm-1");
    expect(res).toEqual(mockItem);
  });
});
