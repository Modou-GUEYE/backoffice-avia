import { beforeEach, describe, expect, it, vi } from "vitest";
import httpClient from "@/core/network/httpClient";
import {
  fetchCaps,
  upsertCap,
  deleteCap,
  overrideClientCap,
  fetchClientCapUsage,
} from "./capsService";

vi.mock("@/core/network/httpClient", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("capsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchCaps calls GET /api/v1/settings/caps with cleaned params", async () => {
    const mockData = [{ id: "cap-1", service_type: "VERSEMENT" }];
    vi.mocked(httpClient.get).mockResolvedValueOnce({ data: { data: mockData } });

    const res = await fetchCaps({ tenant_level: "GLOBAL", tenant_id: "" });

    expect(httpClient.get).toHaveBeenCalledWith("/api/v1/settings/caps", {
      params: { tenant_level: "GLOBAL" },
    });
    expect(res).toEqual(mockData);
  });

  it("upsertCap calls PUT /api/v1/settings/caps with tenant_id null when GLOBAL", async () => {
    const payload = {
      service_type: "VERSEMENT" as const,
      tenant_level: "GLOBAL" as const,
      max_per_transaction: 1000000,
    };
    const mockResult = { id: "cap-1", ...payload };
    vi.mocked(httpClient.put).mockResolvedValueOnce({ data: { data: mockResult } });

    const res = await upsertCap(payload);

    expect(httpClient.put).toHaveBeenCalledWith("/api/v1/settings/caps", {
      ...payload,
      tenant_id: null,
    });
    expect(res).toEqual(mockResult);
  });

  it("deleteCap calls DELETE /api/v1/settings/caps/:id", async () => {
    vi.mocked(httpClient.delete).mockResolvedValueOnce({ data: {} });

    await deleteCap("cap-1");

    expect(httpClient.delete).toHaveBeenCalledWith("/api/v1/settings/caps/cap-1");
  });

  it("overrideClientCap calls POST /api/v1/settings/caps/client/:id/override", async () => {
    const payload = {
      client_id: "client-123",
      structure_id: "struct-1",
      new_limit: 5000000,
      comment: "Dérogation VIP",
    };
    vi.mocked(httpClient.post).mockResolvedValueOnce({ data: {} });

    await overrideClientCap("client-123", payload);

    expect(httpClient.post).toHaveBeenCalledWith("/api/v1/settings/caps/client/client-123/override", payload);
  });

  it("fetchClientCapUsage calls GET /api/v1/settings/caps/client/:id/usage with structure_id param", async () => {
    const mockUsage = [
      {
        id: "usage-1",
        client_id: "client-123",
        structure_id: "struct-1",
        service_type: "TRANSFER",
        daily_total: 150000,
        monthly_total: 450000,
        reference_date: "2026-09-13",
      },
    ];
    vi.mocked(httpClient.get).mockResolvedValueOnce({ data: { data: mockUsage } });

    const res = await fetchClientCapUsage("client-123", "struct-1");

    expect(httpClient.get).toHaveBeenCalledWith("/api/v1/settings/caps/client/client-123/usage", {
      params: { structure_id: "struct-1" },
    });
    expect(res).toEqual(mockUsage);
  });
});

