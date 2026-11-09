import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAuthStore } from "@/core/security/authStore";
import * as produitsService from "../services/produitsService";
import { fetchStructures, updateStructure } from "@/features/structures/services/structuresService";
import type { ProduitRead } from "../models/types";
import { useProduits } from "./useProduits";

vi.mock("../services/produitsService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/produitsService")>();
  return {
    ...actual,
    fetchProduits: vi.fn().mockResolvedValue({ items: [], total: 0, summary: { total: 0, actifs: 0, inactifs: 0 } }),
    fetchProductStructures: vi.fn(),
    updateProduit: vi.fn(),
    createProduit: vi.fn(),
    archiveProduit: vi.fn(),
    toggleProduitStatus: vi.fn(),
  };
});
vi.mock("@/features/structures/services/structuresService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/structures/services/structuresService")>();
  return { ...actual, fetchStructures: vi.fn().mockResolvedValue([]), updateStructure: vi.fn() };
});
vi.mock("@/core/security/accessSecurityService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/core/security/accessSecurityService")>();
  return {
    ...actual,
    listClientCompositeRoles: vi.fn().mockResolvedValue([]),
    listHierarchyMembers: vi.fn().mockResolvedValue({ users: [] }),
  };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

// Produit ALPHA : ses paramètres ne citent que 2 structures, alors que 3 lui sont réellement rattachées
const produit = {
  id: "prod-alpha",
  nom: "ALPHA",
  libelleExpediteur: "ALPHA",
  structuresAssociees: ["s-beta", "s-alpha"],
  statut: "active",
  utilisateurs: [],
  brandingConfig: {},
} as unknown as ProduitRead;

describe("useProduits - structures du produit en modification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { email: "admin@example.com", role: "Administrateur", entityContext: "Administration", permissions: ["profile.bo-admin", "perm.bo.produit.list", "perm.bo.produit.update"] },
    });
  });

  it("pré-remplit les structures réellement rattachées (comme la fiche détail), pas la copie des paramètres", async () => {
    vi.mocked(produitsService.fetchProductStructures).mockResolvedValue([
      { id: "s-bci", name: "BCI" },
      { id: "s-avia", name: "AVIA" },
      { id: "s-beta", name: "BETA" },
    ] as never);
    const { result } = renderHook(() => useProduits());

    act(() => result.current.openEdit(produit));

    await waitFor(() => expect(result.current.form.structuresAssociees).toEqual(["s-bci", "s-avia", "s-beta"]));
    expect(produitsService.fetchProductStructures).toHaveBeenCalledWith("prod-alpha");
  });

  it("sans liste réelle chargée, l'enregistrement ne délie aucune structure", async () => {
    vi.mocked(produitsService.fetchProductStructures).mockRejectedValue(new Error("500"));
    vi.mocked(produitsService.updateProduit).mockResolvedValue(produit);
    vi.mocked(fetchStructures).mockResolvedValue([{ id: "s-bci", name: "BCI", product_id: "prod-alpha" }] as never);
    const { result } = renderHook(() => useProduits());

    act(() => result.current.openEdit(produit));
    await waitFor(() => expect(produitsService.fetchProductStructures).toHaveBeenCalled());
    await act(async () => {
      await result.current.confirmUpdateSave();
    });

    expect(updateStructure).not.toHaveBeenCalled();
  });
});
