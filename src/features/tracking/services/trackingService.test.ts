import { describe, it, expect, vi, beforeEach } from "vitest";
import httpClient from "@/core/network/httpClient";
import { useAuthStore } from "@/core/security/authStore";
import { fetchTrackingEventDetail, fetchTrackingEvents, fetchTrackingSources } from "./trackingService";

vi.mock("@/core/network/httpClient", () => ({ default: { get: vi.fn() } }));

describe("trackingService - en-têtes de contexte", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(httpClient.get).mockResolvedValue({ data: [] });
    useAuthStore.setState({
      user: {
        email: "admin.structure@example.com",
        role: "Administrateur",
        entityContext: "Structure",
        institutionId: "d9e56eab-12c9-4cfa-bd83-fdecf931c46f",
        institutionLabel: "Structure Test",
      },
    });
  });

  it("envoie le périmètre sur la liste, les sources et le détail", async () => {
    await fetchTrackingEvents({});
    await fetchTrackingSources();
    await fetchTrackingEventDetail("evt-1");

    for (const call of vi.mocked(httpClient.get).mock.calls) {
      expect(call[1]?.headers).toEqual(
        expect.objectContaining({
          "X-Structure-Id": "d9e56eab-12c9-4cfa-bd83-fdecf931c46f",
          "X-User-Role": "Administrateur",
        }),
      );
    }
  });
});
