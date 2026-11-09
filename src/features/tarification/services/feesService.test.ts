import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  rulesHttpClient,
  fetchFees,
  createFee,
  updateFee,
  deleteFee,
  toggleFeeStatus,
  fetchFeeDetail,
  fetchFeesConsolidated,
} from "./feesService";

vi.mock("@/core/network/httpClient", () => ({
  attachAuthorizationHeader: vi.fn(),
  attachAuthResponseInterceptor: vi.fn(),
}));

describe("feesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchFees calls GET /fees with params", async () => {
    const mockData = [
      {
        id: "fee-1",
        min_bound: 0,
        max_bound: 10000,
        fixed_fee: 100,
        rate_fee: 1.5,
        service_type: "VERSEMENT",
        tenant_level: "GLOBAL",
        tenant_id: null,
        is_active: true,
      },
    ];
    vi.spyOn(rulesHttpClient, "get").mockResolvedValueOnce({ data: { data: mockData } });

    const res = await fetchFees({ tenant_level: "GLOBAL", service_type: "VERSEMENT" });

    expect(rulesHttpClient.get).toHaveBeenCalledWith("/fees", {
      params: { tenant_level: "GLOBAL", service_type: "VERSEMENT" },
    });
    expect(res).toEqual(mockData);
  });

  it("createFee calls POST /fees", async () => {
    const payload = {
      tenant_level: "GLOBAL" as const,
      service_type: "VERSEMENT" as const,
      min_bound: 0,
      max_bound: 50000,
      fixed_fee: 200,
      rate_fee: 2,
    };
    const mockCreated = { id: "fee-2", ...payload, tenant_id: null, is_active: true };
    vi.spyOn(rulesHttpClient, "post").mockResolvedValueOnce({ data: { data: mockCreated } });

    const res = await createFee(payload);

    expect(rulesHttpClient.post).toHaveBeenCalledWith("/fees", payload);
    expect(res).toEqual(mockCreated);
  });

  it("updateFee calls PUT /fees/:id", async () => {
    const payload = {
      min_bound: 500,
      max_bound: 25000,
      fixed_fee: 150,
      rate_fee: 1.8,
    };
    const mockUpdated = { id: "fee-1", ...payload };
    vi.spyOn(rulesHttpClient, "put").mockResolvedValueOnce({ data: { data: mockUpdated } });

    const res = await updateFee("fee-1", payload);

    expect(rulesHttpClient.put).toHaveBeenCalledWith("/fees/fee-1", payload);
    expect(res).toEqual(mockUpdated);
  });

  it("deleteFee calls DELETE /fees/:id", async () => {
    vi.spyOn(rulesHttpClient, "delete").mockResolvedValueOnce({ data: {} });

    await deleteFee("fee-1");

    expect(rulesHttpClient.delete).toHaveBeenCalledWith("/fees/fee-1");
  });

  it("toggleFeeStatus calls PATCH /fees/:id/status", async () => {
    vi.spyOn(rulesHttpClient, "patch").mockResolvedValueOnce({ data: {} });

    await toggleFeeStatus("fee-1", false);

    expect(rulesHttpClient.patch).toHaveBeenCalledWith("/fees/fee-1/status", { is_active: false });
  });

  it("fetchFeeDetail calls GET /fees/:id", async () => {
    const mockItem = {
      id: "fee-1",
      min_bound: 0,
      max_bound: 10000,
      fixed_fee: 100,
      rate_fee: 1.5,
      service_type: "VERSEMENT",
      tenant_level: "GLOBAL",
      tenant_id: null,
      is_active: true,
    };
    vi.spyOn(rulesHttpClient, "get").mockResolvedValueOnce({ data: { data: mockItem } });

    const res = await fetchFeeDetail("fee-1");

    expect(rulesHttpClient.get).toHaveBeenCalledWith("/fees/fee-1");
    expect(res).toEqual(mockItem);
  });

  it("fetchFeesConsolidated calls GET /fees/consolidated", async () => {
    vi.spyOn(rulesHttpClient, "get").mockResolvedValueOnce({ data: { data: [] } });

    const res = await fetchFeesConsolidated();

    expect(rulesHttpClient.get).toHaveBeenCalledWith("/fees/consolidated");
    expect(res).toEqual([]);
  });
});
