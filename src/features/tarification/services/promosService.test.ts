import { beforeEach, describe, expect, it, vi } from "vitest";
import { rulesHttpClient } from "./feesService";
import {
  fetchPromos,
  createPromo,
  updatePromo,
  deletePromo,
  togglePromoStatus,
  fetchPromoDetail,
} from "./promosService";

vi.mock("./feesService", () => ({
  rulesHttpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("promosService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchPromos calls GET /promos with params", async () => {
    const mockData = [
      {
        id: "promo-1",
        code: "SUMMER",
        rate_amount: 15,
        is_active: true,
      },
    ];
    vi.mocked(rulesHttpClient.get).mockResolvedValueOnce({ data: { data: mockData } });

    const res = await fetchPromos({ tenant_level: "GLOBAL" });

    expect(rulesHttpClient.get).toHaveBeenCalledWith("/promos", {
      params: { tenant_level: "GLOBAL" },
    });
    expect(res).toEqual(mockData);
  });

  it("createPromo calls POST /promos", async () => {
    const payload = {
      code: "PROMO2026",
      tenant_level: "GLOBAL" as const,
      start_date: "2026-06-01T00:00:00.000Z",
      end_date: "2026-06-30T23:59:59.000Z",
      rate_amount: 20,
    };
    const mockCreated = { id: "promo-new", ...payload, is_active: true };
    vi.mocked(rulesHttpClient.post).mockResolvedValueOnce({ data: { data: mockCreated } });

    const res = await createPromo(payload);

    expect(rulesHttpClient.post).toHaveBeenCalledWith("/promos", payload);
    expect(res).toEqual(mockCreated);
  });

  it("updatePromo calls PUT /promos/:id", async () => {
    const payload = {
      code: "PROMO2026_UPDATED",
      rate_amount: 25,
    };
    const mockUpdated = { id: "promo-1", ...payload };
    vi.mocked(rulesHttpClient.put).mockResolvedValueOnce({ data: { data: mockUpdated } });

    const res = await updatePromo("promo-1", payload);

    expect(rulesHttpClient.put).toHaveBeenCalledWith("/promos/promo-1", payload);
    expect(res).toEqual(mockUpdated);
  });

  it("deletePromo calls DELETE /promos/:id", async () => {
    vi.mocked(rulesHttpClient.delete).mockResolvedValueOnce({ data: {} });

    await deletePromo("promo-1");

    expect(rulesHttpClient.delete).toHaveBeenCalledWith("/promos/promo-1");
  });

  it("togglePromoStatus calls PATCH /promos/:id/status", async () => {
    vi.mocked(rulesHttpClient.patch).mockResolvedValueOnce({ data: {} });

    await togglePromoStatus("promo-1", false);

    expect(rulesHttpClient.patch).toHaveBeenCalledWith("/promos/promo-1/status", { is_active: false });
  });


  it("fetchPromoDetail calls GET /promos/:id", async () => {
    const mockItem = { id: "promo-1", code: "PROMO2026" };
    vi.mocked(rulesHttpClient.get).mockResolvedValueOnce({ data: { data: mockItem } });

    const res = await fetchPromoDetail("promo-1");

    expect(rulesHttpClient.get).toHaveBeenCalledWith("/promos/promo-1");
    expect(res).toEqual(mockItem);
  });
});
