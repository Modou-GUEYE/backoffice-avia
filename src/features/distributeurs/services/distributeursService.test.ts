import { beforeEach, describe, expect, it, vi } from "vitest";
import httpClient from "@/core/network/httpClient";
import {
  fetchDistributeurs,
  fetchDistributeurById,
  createDistributeur,
  updateDistributeur,
  deleteDistributeur,
  activateDistributeur,
  deactivateDistributeur,
  fetchDistributorAgencies,
  fetchDistributorCaisses,
} from "./distributeursService";

vi.mock("@/core/network/httpClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("distributeursService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches distributors from /api/v1/organisation/distributors/", async () => {
    const mockResponse = {
      data: {
        items: [
          {
            id: "dist-1",
            name: "Distributeur Alpha",
            structure_id: "struct-1",
            is_active: true,
          },
        ],
        total: 1,
        summary: { total: 1, actifs: 1, inactifs: 0 },
      },
    };
    vi.mocked(httpClient.get).mockResolvedValueOnce(mockResponse);

    const result = await fetchDistributeurs({ search: "Alpha" });
    expect(httpClient.get).toHaveBeenCalledWith(
      "/api/v1/organisation/distributors/",
      { params: { include_inactive: true, search: "Alpha" } },
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Distributeur Alpha");
    expect(result.items[0].nom).toBe("Distributeur Alpha");
    expect(result.summary.total).toBe(1);
  });

  it("fetches distributor by id", async () => {
    const mockDist = {
      id: "dist-1",
      name: "Distributeur Alpha",
      structure_id: "struct-1",
      is_active: true,
    };
    vi.mocked(httpClient.get).mockResolvedValueOnce({ data: mockDist });

    const result = await fetchDistributeurById("dist-1");
    expect(httpClient.get).toHaveBeenCalledWith("/api/v1/organisation/distributors/dist-1");
    expect(result.id).toBe("dist-1");
    expect(result.name).toBe("Distributeur Alpha");
  });

  it("activates distributor via POST /api/v1/organisation/distributors/{id}/activate", async () => {
    const mockDist = {
      id: "dist-1",
      name: "Distributeur Alpha",
      structure_id: "struct-1",
      is_active: true,
    };
    vi.mocked(httpClient.post).mockResolvedValueOnce({ data: mockDist });

    const result = await activateDistributeur("dist-1");
    expect(httpClient.post).toHaveBeenCalledWith("/api/v1/organisation/distributors/dist-1/activate");
    expect(result.is_active).toBe(true);
  });

  it("deactivates distributor via POST /api/v1/organisation/distributors/{id}/deactivate", async () => {
    const mockDist = {
      id: "dist-1",
      name: "Distributeur Alpha",
      structure_id: "struct-1",
      is_active: false,
    };
    vi.mocked(httpClient.post).mockResolvedValueOnce({ data: mockDist });

    const result = await deactivateDistributeur("dist-1");
    expect(httpClient.post).toHaveBeenCalledWith("/api/v1/organisation/distributors/dist-1/deactivate");
    expect(result.is_active).toBe(false);
  });

  it("deletes distributor via DELETE /api/v1/organisation/distributors/{id}", async () => {
    vi.mocked(httpClient.delete).mockResolvedValueOnce({ data: undefined });

    await deleteDistributeur("dist-1");
    expect(httpClient.delete).toHaveBeenCalledWith("/api/v1/organisation/distributors/dist-1");
  });

  it("fetches direct agencies for distributor", async () => {
    const mockAgencies = [
      { id: "agency-1", name: "Agence Centre", code: "AGC01", is_active: true },
    ];
    vi.mocked(httpClient.get).mockResolvedValueOnce({ data: mockAgencies });

    const result = await fetchDistributorAgencies("dist-1");
    expect(httpClient.get).toHaveBeenCalledWith(
      "/api/v1/organisation/distributors/dist-1/agencies",
      { params: undefined },
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Agence Centre");
  });

  it("fetches direct caisses for distributor", async () => {
    const mockCaisses = [
      { id: "caisse-1", name: "Caisse 1", code: "CS01", is_active: true },
    ];
    vi.mocked(httpClient.get).mockResolvedValueOnce({ data: mockCaisses });

    const result = await fetchDistributorCaisses("dist-1");
    expect(httpClient.get).toHaveBeenCalledWith(
      "/api/v1/organisation/distributors/dist-1/caisses",
      { params: undefined },
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Caisse 1");
  });

  it("creates distributor with file as multipart/form-data and receives media_url", async () => {
    const mockFile = new File(["dummy content"], "logo.png", { type: "image/png" });
    const mockCreated = {
      id: "dist-new",
      name: "Distributeur Nouveau",
      structure_id: "struct-1",
      media_id: "media-123",
      media_url: "https://storage.example.test/logos/logo.png",
      is_active: true,
    };
    vi.mocked(httpClient.post).mockResolvedValueOnce({ data: mockCreated });

    const result = await createDistributeur({
      name: "Distributeur Nouveau",
      structure_id: "struct-1",
      file: mockFile,
    });

    expect(httpClient.post).toHaveBeenCalledWith(
      "/api/v1/organisation/distributors/",
      expect.any(FormData),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    expect(result.media_id).toBe("media-123");
    expect(result.media_url).toBe("https://storage.example.test/logos/logo.png");
  });

  it("updates distributor with file as multipart/form-data and receives updated media_url", async () => {
    const mockFile = new File(["dummy content"], "new-logo.png", { type: "image/png" });
    const mockUpdated = {
      id: "dist-1",
      name: "Distributeur Modifie",
      structure_id: "struct-1",
      media_id: "media-456",
      media_url: "https://storage.example.test/logos/new-logo.png",
      is_active: true,
    };
    vi.mocked(httpClient.patch).mockResolvedValueOnce({ data: mockUpdated });

    const result = await updateDistributeur("dist-1", {
      name: "Distributeur Modifie",
      file: mockFile,
    });

    expect(httpClient.patch).toHaveBeenCalledWith(
      "/api/v1/organisation/distributors/dist-1",
      expect.any(FormData),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    expect(result.media_url).toBe("https://storage.example.test/logos/new-logo.png");
  });
});
