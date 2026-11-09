import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { fetchCaisseById, fetchCaisses } from "@/features/caisses/services/caissesService";
import { useCaisseFilterOptions } from "./useCaisseFilterOptions";

vi.mock("@/features/caisses/services/caissesService", () => ({
  fetchCaisses: vi.fn(),
  fetchCaisseById: vi.fn(),
}));

describe("useCaisseFilterOptions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sans agence choisie ni agence de rattachement : liste vide, il faut choisir une agence", async () => {
    const { result } = renderHook(() =>
      useCaisseFilterOptions({ enforcedAgencyIds: [], enforcedCaisseId: null, enforcedCaisseLabel: null }),
    );
    await waitFor(() => expect(result.current.needsAgency).toBe(true));
    expect(result.current.options).toEqual([]);
    expect(fetchCaisses).not.toHaveBeenCalled();
  });

  it("propose les caisses de l'agence choisie", async () => {
    vi.mocked(fetchCaisses).mockResolvedValue([{ id: "c-2", name: "Caisse B" }, { id: "c-1", name: "Caisse A" }] as never);
    const { result } = renderHook(() =>
      useCaisseFilterOptions({ agenceId: "ag-1", enforcedAgencyIds: [], enforcedCaisseId: null, enforcedCaisseLabel: null }),
    );
    await waitFor(() => expect(result.current.options).toHaveLength(2));
    expect(fetchCaisses).toHaveBeenCalledWith({ agency_id: "ag-1", limit: 100 });
    expect(result.current.options.map((o) => o.label)).toEqual(["Caisse A", "Caisse B"]);
  });

  it("caissier : uniquement sa caisse, avec son nom retrouvé par identifiant", async () => {
    vi.mocked(fetchCaisseById).mockResolvedValue({ id: "c-9", name: "CAISSE AGENCE BCI" } as never);
    const { result } = renderHook(() =>
      useCaisseFilterOptions({ enforcedAgencyIds: ["ag-1"], enforcedCaisseId: "c-9", enforcedCaisseLabel: null }),
    );
    await waitFor(() => expect(result.current.options).toEqual([{ id: "c-9", label: "CAISSE AGENCE BCI" }]));
    expect(fetchCaisses).not.toHaveBeenCalled();
    expect(result.current.needsAgency).toBe(false);
  });
});
