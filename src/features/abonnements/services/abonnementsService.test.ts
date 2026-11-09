import { describe, it, expect, vi, beforeEach } from "vitest";
import httpClient from "@/core/network/httpClient";
import { fetchServices, fetchSubscriptions, fetchSubscriptionById } from "./abonnementsService";

vi.mock("@/core/network/httpClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("abonnementsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchServices", () => {
    it("returns items from ServicesListResponse", async () => {
      const mockList = [{ id: "srv-2", label: "Service 2", code: "S2", description: null, category_id: null, status: "ACTIVE" }];
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        data: {
          items: mockList,
          page: 1,
          page_size: 100,
          total: 1,
          total_pages: 1,
        },
      });

      const result = await fetchServices();
      expect(result).toEqual(mockList);
    });
  });

  describe("fetchSubscriptions", () => {
    it("returns subscriptions list from endpoint", async () => {
      const mockSubs = [{ id: "sub-1", label: "Sub 1", amount: "100", periodicity: "MONTHLY", status: "ACTIVE", service_ids: [] }];
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data: mockSubs });

      const result = await fetchSubscriptions();
      expect(result).toEqual(mockSubs);
    });
  });

  describe("fetchSubscriptionById", () => {
    it("returns single subscription from endpoint with id", async () => {
      const mockSub = { id: "sub-1", label: "Sub 1", amount: "100", periodicity: "MONTHLY", status: "ACTIVE", service_ids: [] };
      vi.mocked(httpClient.get).mockResolvedValueOnce({ data: mockSub });

      const result = await fetchSubscriptionById("sub-1");
      expect(httpClient.get).toHaveBeenCalledWith("/api/v1/packages-services/subscriptions/sub-1");
      expect(result).toEqual(mockSub);
    });
  });
});
