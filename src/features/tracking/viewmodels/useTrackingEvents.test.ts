import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { getAllowedTrackingLevels, useTrackingEvents } from "./useTrackingEvents";
import * as trackingService from "../services/trackingService";
import { useAuthStore } from "@/core/security/authStore";
import { fetchDistributeurs } from "@/features/distributeurs/services/distributeursService";
import { fetchAgences } from "@/features/agences/services/agencesService";
import { fetchCaisses } from "@/features/caisses/services/caissesService";

vi.mock("../services/trackingService", () => ({
  fetchTrackingEvents: vi.fn(),
  fetchTrackingSources: vi.fn(),
  fetchTrackingEventDetail: vi.fn(),
  downloadTrackingExport: vi.fn(),
}));
vi.mock("@/features/produits/services/produitsService", () => ({ fetchProduits: vi.fn().mockResolvedValue([]) }));
vi.mock("@/features/structures/services/structuresService", () => ({ fetchStructures: vi.fn().mockResolvedValue([]) }));
vi.mock("@/features/agences/services/agencesService", () => ({ fetchAgences: vi.fn().mockResolvedValue([]) }));
vi.mock("@/features/caisses/services/caissesService", () => ({ fetchCaisses: vi.fn().mockResolvedValue([]) }));
vi.mock("@/features/distributeurs/services/distributeursService", () => ({
  fetchDistributeurs: vi.fn().mockResolvedValue({ items: [], total: 0, summary: { total: 0, actifs: 0, inactifs: 0 } }),
}));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

const emptyResponse = {
  total: 0,
  skip: 0,
  limit: 50,
  items: [],
  summary: { total_events: 0, distinct_users: 0, active_sources: 0, success_operations: 0, failed_operations: 0 },
};

// Valeurs du jeton réel de l'agent caissier (groupes STRUCTURE / AGENCE / CAISSE)
const cashier = {
  userId: "8106df8e-4c56-4735-ba64-d70bb8584c5c",
  email: "agentcaissier@example.com",
  role: "Agent" as const,
  entityContext: "Agence" as const,
  institutionId: "d9e56eab-12c9-4cfa-bd83-fdecf931c46f",
  agencyId: "722a9882-afa7-43c6-be61-df714abf4388",
  caisseId: "ea135124-3277-4cce-9084-78236c1ca48a",
};

describe("useTrackingEvents - périmètre utilisateur", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.mocked(trackingService.fetchTrackingEvents).mockResolvedValue(emptyResponse);
    vi.mocked(trackingService.fetchTrackingSources).mockResolvedValue([]);
  });

  it("n'impose aucun filtre à un administrateur", async () => {
    useAuthStore.setState({
      user: { email: "admin@example.com", role: "Administrateur", entityContext: "Administration" },
    });

    renderHook(() => useTrackingEvents());

    await waitFor(() => expect(trackingService.fetchTrackingEvents).toHaveBeenCalled());
    const sent = vi.mocked(trackingService.fetchTrackingEvents).mock.calls[0][0];
    expect(sent?.structure_id).toBe("");
    expect(sent?.caisse_id).toBe("");
  });

  it("limite un caissier à sa structure, son agence et sa caisse", async () => {
    useAuthStore.setState({ user: cashier });

    const { result } = renderHook(() => useTrackingEvents());

    await waitFor(() =>
      expect(trackingService.fetchTrackingEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          structure_id: cashier.institutionId,
          agence_id: cashier.agencyId,
          caisse_id: cashier.caisseId,
        }),
      ),
    );

    // Les filtres imposés ne peuvent pas être modifiés
    act(() => {
      result.current.updateFilters({ agence_id: "autre-agence", caisse_id: "autre-caisse" });
    });
    expect(result.current.filters.agence_id).toBe(cashier.agencyId);
    expect(result.current.filters.caisse_id).toBe(cashier.caisseId);
  });

  it("applique le périmètre à l'export", async () => {
    useAuthStore.setState({ user: cashier });

    const { result } = renderHook(() => useTrackingEvents());
    await waitFor(() => expect(trackingService.fetchTrackingEvents).toHaveBeenCalled());

    await act(async () => {
      await result.current.handleExport("csv");
    });

    expect(trackingService.downloadTrackingExport).toHaveBeenCalledWith(
      expect.objectContaining({ structure_id: cashier.institutionId, caisse_id: cashier.caisseId }),
      "csv",
    );
  });

  it("propose l'entité imposée dans les listes même si le référentiel est inaccessible", async () => {
    useAuthStore.setState({ user: { ...cashier, agencyLabel: "Agence Centrale" } });

    const { result } = renderHook(() => useTrackingEvents());
    await waitFor(() => expect(trackingService.fetchTrackingEvents).toHaveBeenCalled());

    expect(result.current.agenceOptions).toContainEqual({ value: cashier.agencyId, label: "Agence Centrale" });
  });
});

describe("useTrackingEvents - catalogues", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(trackingService.fetchTrackingEvents).mockResolvedValue(emptyResponse);
    vi.mocked(trackingService.fetchTrackingSources).mockResolvedValue([]);
  });

  it("alimente le filtre distributeur depuis la réponse paginée du service", async () => {
    useAuthStore.setState({
      user: { email: "admin@example.com", role: "Administrateur", entityContext: "Administration" },
    });
    vi.mocked(fetchDistributeurs).mockResolvedValueOnce({
      items: [{ id: "dist-1", name: "Wave", nom: "Wave" }],
      total: 1,
      summary: { total: 1, actifs: 1, inactifs: 0 },
    } as unknown as Awaited<ReturnType<typeof fetchDistributeurs>>);

    const { result } = renderHook(() => useTrackingEvents());

    await waitFor(() =>
      expect(result.current.distributeurOptions).toEqual([
        { value: "", label: "Tous les distributeurs" },
        { value: "dist-1", label: "Wave" },
      ]),
    );
  });

  it("limite distributeurs, agences et caisses à la structure d'un administrateur de structure", async () => {
    useAuthStore.setState({
      user: { email: "admin@bci.sn", role: "Administrateur", entityContext: "Structure", institutionId: "struct-A" },
    });
    vi.mocked(fetchDistributeurs).mockResolvedValueOnce({
      items: [
        { id: "dist-A", name: "Distributeur A", nom: "Distributeur A", structureId: "struct-A" },
        { id: "dist-B", name: "Distributeur B", nom: "Distributeur B", structureId: "struct-B" },
      ],
      total: 2,
      summary: { total: 2, actifs: 2, inactifs: 0 },
    } as unknown as Awaited<ReturnType<typeof fetchDistributeurs>>);
    vi.mocked(fetchAgences).mockResolvedValueOnce([
      { id: "ag-struct-A", name: "Agence A", parent_id: "struct-A", parent_type: "STRUCTURE" },
      { id: "ag-dist-A", name: "Agence du distributeur A", parent_id: "dist-A", parent_type: "DISTRIBUTOR" },
      { id: "ag-struct-B", name: "Agence B", parent_id: "struct-B", parent_type: "STRUCTURE" },
    ] as unknown as Awaited<ReturnType<typeof fetchAgences>>);
    vi.mocked(fetchCaisses).mockResolvedValueOnce([
      { id: "caisse-dist-A", name: "Caisse distributeur A", agency_id: "ag-dist-A" },
      { id: "caisse-B", name: "Caisse B", agency_id: "ag-struct-B" },
    ] as unknown as Awaited<ReturnType<typeof fetchCaisses>>);

    const { result } = renderHook(() => useTrackingEvents());

    await waitFor(() => expect(result.current.distributeurOptions.map((o) => o.value)).toEqual(["", "dist-A"]));
    await waitFor(() =>
      expect(result.current.agenceOptions.map((o) => o.value)).toEqual(["", "ag-struct-A", "ag-dist-A"]),
    );
    expect(result.current.caisseOptions.map((o) => o.value)).toEqual(["", "caisse-dist-A"]);

    // Un distributeur choisi restreint les agences aux siennes
    act(() => result.current.updateFilters({ distributor_id: "dist-A" }));
    expect(result.current.agenceOptions.map((o) => o.value)).toEqual(["", "ag-dist-A"]);
  });
});

describe("getAllowedTrackingLevels", () => {
  const none = {
    isGlobalAdmin: false,
    isProductUser: false,
    isStructureUser: false,
    isDistributorUser: false,
    isAgencyUser: false,
    isCaisseUser: false,
    isCashier: false,
  };

  it("propose tous les niveaux à l'administrateur back-office", () => {
    expect(getAllowedTrackingLevels({ ...none, isGlobalAdmin: true })).toBeNull();
  });

  it("limite chaque profil à son niveau et aux niveaux inférieurs", () => {
    expect(getAllowedTrackingLevels({ ...none, isProductUser: true })).toEqual([
      "PRODUCT",
      "STRUCTURE",
      "DISTRIBUTOR",
      "AGENCE",
      "CAISSE",
    ]);
    expect(getAllowedTrackingLevels({ ...none, isStructureUser: true })).toEqual([
      "STRUCTURE",
      "DISTRIBUTOR",
      "AGENCE",
      "CAISSE",
    ]);
    expect(getAllowedTrackingLevels({ ...none, isDistributorUser: true })).toEqual(["DISTRIBUTOR", "AGENCE", "CAISSE"]);
    expect(getAllowedTrackingLevels({ ...none, isAgencyUser: true })).toEqual(["AGENCE", "CAISSE"]);
  });

  it("réduit un agent d'agence rattaché à une caisse au niveau Caisse", () => {
    expect(getAllowedTrackingLevels({ ...none, isAgencyUser: true, isCashier: true })).toEqual(["CAISSE"]);
  });
});

describe("useTrackingEvents - filtre niveau", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(trackingService.fetchTrackingEvents).mockResolvedValue(emptyResponse);
    vi.mocked(trackingService.fetchTrackingSources).mockResolvedValue([]);
  });

  it("n'envoie pas un niveau hors périmètre choisi par un administrateur de structure", async () => {
    useAuthStore.setState({
      user: { email: "admin@bci.sn", role: "Administrateur", entityContext: "Structure", institutionId: "struct-A" },
    });

    const { result } = renderHook(() => useTrackingEvents());

    expect(result.current.entiteOptions.map((o) => o.value)).toEqual(["", "STRUCTURE", "DISTRIBUTOR", "AGENCE", "CAISSE"]);
    act(() => result.current.updateFilters({ entite: "ADMIN" }));
    expect(result.current.filters.entite).toBe("");
    act(() => result.current.updateFilters({ entite: "AGENCE" }));
    expect(result.current.filters.entite).toBe("AGENCE");
  });
});
