import { describe, it, expect, vi, beforeEach } from "vitest";
import httpClient from "@/core/network/httpClient";
import { createCorrection, fetchReleves, figerReleve, generateReleve, notifierReleve } from "./relevesService";

vi.mock("@/core/network/httpClient", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("@/core/network/apiGateway", () => ({ gatewayApiBaseUrl: "https://gateway.example.test" }));

describe("relevesService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("liste les relevés avec les seuls filtres renseignés, sans en-tête de contexte", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: { total: 0, skip: 0, limit: 20, items: [] } });
    await fetchReleves({ structure: "ALPHA", annee: 2026, mois: undefined, statut: "", skip: 0, limit: 20 });
    expect(httpClient.get).toHaveBeenCalledWith("/api/v1/reporting/releves", {
      params: { structure: "ALPHA", annee: 2026, skip: 0, limit: 20 },
    });
  });

  it("appelle les endpoints de génération, figement et correction du contrat", async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: {} });
    await generateReleve({ structure_id: "9aef8151-56b1-4703-b336-a164bb06a39e", annee: 2026, mois: 9 });
    await figerReleve("rel-1", "omar.thiam");
    await createCorrection("rel-1", { motif: "m", montant: -30, beneficiaire_type: "structure", cree_par: "omar.thiam" });

    const calls = vi.mocked(httpClient.post).mock.calls.map(([url, body]) => [url, body]);
    expect(calls).toEqual([
      ["/api/v1/reporting/releves/generer", { structure_id: "9aef8151-56b1-4703-b336-a164bb06a39e", annee: 2026, mois: 9 }],
      ["/api/v1/reporting/releves/rel-1/figer", { fige_par: "omar.thiam" }],
      ["/api/v1/reporting/releves/rel-1/corrections", { motif: "m", montant: -30, beneficiaire_type: "structure", cree_par: "omar.thiam" }],
    ]);
  });

  it("prépare la notification avec la base publique de la Gateway", async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: { objet: "Relevé" } });
    await notifierReleve("rel-1");
    expect(httpClient.post).toHaveBeenCalledWith("/api/v1/reporting/releves/rel-1/notifier", undefined, {
      params: { base_url: "https://gateway.example.test" },
    });
  });


  it("complète VITE_GATEWAY_BASE_URL relative (« / » en dev) avec l'origine de l'application", async () => {
    vi.resetModules();
    vi.doMock("@/core/network/apiGateway", () => ({ gatewayApiBaseUrl: "/" }));
    const { getPublicGatewayBaseUrl } = await import("./relevesService");
    expect(getPublicGatewayBaseUrl()).toBe(window.location.origin);
    vi.doUnmock("@/core/network/apiGateway");
  });
});
