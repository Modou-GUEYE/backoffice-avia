import { beforeEach, describe, expect, it, vi } from "vitest";
import { rulesHttpClient } from "./feesService";
import {
  fetchTaxes,
  createTax,
  updateTax,
  deleteTax,
  toggleTaxStatus,
  fetchTaxDetail,
} from "./taxesService";
import { CreateTaxRequest, UpdateTaxRequest } from "../models/types";

vi.mock("@/core/network/httpClient", () => ({
  attachAuthorizationHeader: vi.fn(),
  attachAuthResponseInterceptor: vi.fn(),
}));

describe("taxesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchTaxes calls GET /taxes with query params", async () => {
    const mockData = [
      {
        id: "tax-1",
        tax_type: "TVA",
        client_type: "ENTREPRISE" as const,
        tax_rate: 18,
        tax_amount: 100,
        service_type: "RETRAIT" as const,
        tenant_level: "GLOBAL" as const,
        tenant_id: null,
        is_active: true,
      },
    ];
    vi.spyOn(rulesHttpClient, "get").mockResolvedValueOnce({ data: { data: mockData } });

    const res = await fetchTaxes({ tenant_level: "GLOBAL", service_type: "RETRAIT" });

    expect(rulesHttpClient.get).toHaveBeenCalledWith("/taxes", {
      params: { tenant_level: "GLOBAL", service_type: "RETRAIT" },
    });
    expect(res).toEqual(mockData);
  });

  it("createTax calls POST /taxes with body payload", async () => {
    const payload: CreateTaxRequest = {
      tax_type: "TIMBRE_FISCAL",
      client_type: "PARTICULIER",
      tax_rate: 0,
      tax_amount: 50,
      service_type: "VERSEMENT",
      tenant_level: "STRUCTURE",
      tenant_id: "struct-1",
      override_reason: "Test",
    };
    const mockCreated = { id: "tax-created", ...payload, is_active: true };
    vi.spyOn(rulesHttpClient, "post").mockResolvedValueOnce({ data: { data: mockCreated } });

    const res = await createTax(payload);

    expect(rulesHttpClient.post).toHaveBeenCalledWith("/taxes", payload);
    expect(res).toEqual(mockCreated);
  });

  it("updateTax calls PUT /taxes/:id with body payload", async () => {
    const payload: UpdateTaxRequest = {
      tax_rate: 10,
      tax_amount: 0,
      override_reason: "Ajustement fiscal",
    };
    const mockUpdated = { id: "tax-1", ...payload };
    vi.spyOn(rulesHttpClient, "put").mockResolvedValueOnce({ data: { data: mockUpdated } });

    const res = await updateTax("tax-1", payload);

    expect(rulesHttpClient.put).toHaveBeenCalledWith("/taxes/tax-1", payload);
    expect(res).toEqual(mockUpdated);
  });

  it("deleteTax calls DELETE /taxes/:id", async () => {
    vi.spyOn(rulesHttpClient, "delete").mockResolvedValueOnce({ data: {} });

    await deleteTax("tax-1");

    expect(rulesHttpClient.delete).toHaveBeenCalledWith("/taxes/tax-1");
  });

  it("toggleTaxStatus calls PATCH /taxes/:id/status with is_active boolean", async () => {
    vi.spyOn(rulesHttpClient, "patch").mockResolvedValueOnce({ data: {} });

    await toggleTaxStatus("tax-1", true);

    expect(rulesHttpClient.patch).toHaveBeenCalledWith("/taxes/tax-1/status", { is_active: true });
  });

  it("fetchTaxDetail calls GET /taxes/:id", async () => {
    const mockDetail = {
      id: "tax-1",
      tax_type: "TVA",
      client_type: "ENTREPRISE" as const,
      tax_rate: 18,
      tax_amount: 0,
      service_type: "RETRAIT" as const,
      tenant_level: "GLOBAL" as const,
      tenant_id: null,
      is_active: true,
      created_at: "2026-08-12T12:40:51.934982Z",
    };
    vi.spyOn(rulesHttpClient, "get").mockResolvedValueOnce({ data: { data: mockDetail } });

    const res = await fetchTaxDetail("tax-1");

    expect(rulesHttpClient.get).toHaveBeenCalledWith("/taxes/tax-1");
    expect(res).toEqual(mockDetail);
  });
});
