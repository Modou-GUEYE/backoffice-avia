import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useDistributeurs } from "./useDistributeurs";
import * as distributeursService from "../services/distributeursService";
import * as structuresService from "@/features/structures/services/structuresService";
import type { Distributeur } from "../models/types";

vi.mock("../services/distributeursService", () => ({
  fetchDistributeurs: vi.fn(),
  createDistributeur: vi.fn(),
  updateDistributeur: vi.fn(),
  deleteDistributeur: vi.fn(),
  activateDistributeur: vi.fn(),
  deactivateDistributeur: vi.fn(),
}));

vi.mock("@/features/structures/services/structuresService", () => ({
  fetchStructures: vi.fn(),
}));

vi.mock("@/core/security/useCurrentActor", () => ({
  useCurrentActor: () => ({
    currentActorRole: "Admin",
    entityContext: "Administration",
    currentPermissions: [],
  }),
}));

describe("useDistributeurs", () => {
  const mockDistributeurs = {
    items: [
      {
        id: "d1",
        name: "Distributeur 1",
        nom: "Distributeur 1",
        structure_id: "s1",
        is_active: true,
        deposit_validated: true,
        deposit_required: "100000.00",
        current_deposit: "100000.00",
        currency: "XOF",
        seuilMin: 1000,
        seuilMax: 50000,
        activatedAt: "2026-01-01T00:00:00Z",
        nombreAgences: 2,
        nombreCaisses: 4,
      },
      {
        id: "d2",
        name: "Distributeur 2",
        nom: "Distributeur 2",
        structure_id: "s2",
        is_active: false,
        deposit_validated: false,
        deposit_required: "200000.00",
        current_deposit: "0.00",
        currency: "XOF",
        seuilMin: 2000,
        seuilMax: 60000,
        activatedAt: "",
        nombreAgences: 0,
        nombreCaisses: 0,
      },
    ],
    total: 2,
    summary: { total: 2, actifs: 1, inactifs: 1 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(distributeursService.fetchDistributeurs).mockResolvedValue(
      mockDistributeurs as unknown as Awaited<ReturnType<typeof distributeursService.fetchDistributeurs>>,
    );
    vi.mocked(structuresService.fetchStructures).mockResolvedValue([
      { id: "s1", name: "Structure 1" },
      { id: "s2", name: "Structure 2" },
    ] as unknown as Awaited<ReturnType<typeof structuresService.fetchStructures>>);
  });

  it("loads distributeurs and sets KPIs summary on mount", async () => {
    const { result } = renderHook(() => useDistributeurs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.distributeurs).toHaveLength(2);
    expect(result.current.summary?.total).toBe(2);
    expect(result.current.summary?.actifs).toBe(1);
    expect(result.current.summary?.inactifs).toBe(1);
  });

  it("toggles distributor status", async () => {
    const updatedDist = {
      ...mockDistributeurs.items[0],
      is_active: false,
      statut: "inactif",
    };
    vi.mocked(distributeursService.deactivateDistributeur).mockResolvedValue(updatedDist as unknown as Distributeur);

    const { result } = renderHook(() => useDistributeurs());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.requestToggleStatut(mockDistributeurs.items[0] as unknown as Distributeur);
    });

    expect(result.current.statusDialogOpen).toBe(true);
    expect(result.current.statusNextAction).toBe("deactivate");

    await act(async () => {
      await result.current.handleToggleStatut();
    });

    expect(distributeursService.deactivateDistributeur).toHaveBeenCalledWith("d1");
    expect(result.current.statusDialogOpen).toBe(false);
  });
});
