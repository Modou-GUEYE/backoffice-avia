import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useProfileEntities } from "./useProfileEntities";

vi.mock("@/features/structures/services/structuresService", () => ({
  fetchStructureById: vi.fn().mockResolvedValue({ id: "s-1", name: "AVIA" }),
}));
vi.mock("@/features/agences/services/agencesService", () => ({
  fetchAgenceById: vi.fn((id: string) =>
    id === "ag-1" ? Promise.resolve({ id, name: "AGENCEDETEST" }) : Promise.reject(new Error("404")),
  ),
}));
vi.mock("@/features/caisses/services/caissesService", () => ({ fetchCaisseById: vi.fn() }));
vi.mock("@/features/distributeurs/services/distributeursService", () => ({ fetchDistributeurById: vi.fn() }));
vi.mock("@/features/partenaires/services/partenairesService", () => ({
  fetchPartenaireById: vi.fn().mockResolvedValue({ id: "pa-1", name: "GUEYE MODOU" }),
}));
vi.mock("@/features/produits/services/produitsService", () => ({
  fetchProduitById: vi.fn().mockResolvedValue({ id: "p-1", nom: "ALPHA" }),
}));

describe("useProfileEntities", () => {
  it("retrouve les noms par identifiant et garde l'identifiant d'une entité introuvable", async () => {
    const { result } = renderHook(() =>
      useProfileEntities({ productId: "p-1", institutionId: "s-1", agencyIds: ["ag-1", "ag-inconnue"] }),
    );

    await waitFor(() => expect(result.current.structure).toEqual({ id: "s-1", name: "AVIA" }));
    expect(result.current.product).toEqual({ id: "p-1", name: "ALPHA" });
    expect(result.current.agencies).toEqual([
      { id: "ag-1", name: "AGENCEDETEST" },
      { id: "ag-inconnue", name: null },
    ]);
    expect(result.current.distributor).toBeNull();
    expect(result.current.caisse).toBeNull();
  });

  it("affiche le partenaire par son nom", async () => {
    const { result } = renderHook(() => useProfileEntities({ partnerId: "pa-1" }));
    await waitFor(() => expect(result.current.partner).toEqual({ id: "pa-1", name: "GUEYE MODOU" }));
    expect(result.current.structure).toBeNull();
  });
});
