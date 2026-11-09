import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useDashboard } from "./useDashboard";
import * as dashboardService from "../services/dashboardService";
import * as structuresService from "@/features/structures/services/structuresService";
import * as agencesService from "@/features/agences/services/agencesService";
import * as produitsService from "@/features/produits/services/produitsService";
import * as distributeursService from "@/features/distributeurs/services/distributeursService";
import * as paymentMethodsService from "@/features/payment-methods/services/paymentMethodsService";
import { useAuthStore } from "@/core/security/authStore";

vi.mock("../services/dashboardService", () => ({
  fetchDashboardSummary: vi.fn(),
}));

vi.mock("@/features/structures/services/structuresService", () => ({
  fetchStructures: vi.fn(),
}));

vi.mock("@/features/agences/services/agencesService", () => ({
  fetchAgences: vi.fn(),
}));

vi.mock("@/features/produits/services/produitsService", () => ({
  fetchProduits: vi.fn(),
}));

vi.mock("@/features/distributeurs/services/distributeursService", () => ({
  fetchDistributeurs: vi.fn(),
}));

vi.mock("@/features/payment-methods/services/paymentMethodsService", () => ({
  fetchPaymentMethods: vi.fn(),
}));

describe("useDashboard", () => {
  const mockSummary = {
    nombre_transactions: 200,
    volume_total: 10000000,
    en_cours: { nombre: 10, volume: 500000 },
    service: {
      TRANSFERT: { nombre: 150, volume: 8000000 },
      PAIEMENT: { nombre: 50, volume: 2000000 },
    },
    sens: {
      DEBIT: { nombre: 120, volume: 6000000 },
      CREDIT: { nombre: 80, volume: 4000000 },
    },
    moyen_paiement: {
      ORANGE_MONEY: { nombre: 110, volume: 5500000 },
      WAVE: { nombre: 90, volume: 4500000 },
    },
    produit: {
      PROD_A: { nombre: 140, volume: 7000000 },
    },
    distributeur: {
      DISTRIB_1: { nombre: 200, volume: 10000000 },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null });
    vi.mocked(dashboardService.fetchDashboardSummary).mockResolvedValue(mockSummary);
    vi.mocked(structuresService.fetchStructures).mockResolvedValue({
      structures: [{ id: "s1", nom: "Structure 1", code: "S1" }],
    } as never);
    vi.mocked(agencesService.fetchAgences).mockResolvedValue({
      items: [{ id: "a1", name: "Agence Principale", code: "A1" }],
    } as never);
    vi.mocked(produitsService.fetchProduits).mockResolvedValue({
      produits: [{ code: "P1", nom: "Produit 1" }],
    } as never);
    vi.mocked(distributeursService.fetchDistributeurs).mockResolvedValue({
      distributeurs: [{ id: "d1", nom: "Distributeur 1", code: "D1" }],
    } as never);
    vi.mocked(paymentMethodsService.fetchPaymentMethods).mockResolvedValue([
      { id: "pm1", code: "WALLET", label: "Wallet" },
    ] as never);
  });

  it("loads summary data without forced local date restrictions", async () => {
    const { result } = renderHook(() => useDashboard());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.summary).toEqual(mockSummary);
    expect(result.current.structures).toHaveLength(1);
    expect(result.current.agences).toHaveLength(1);
    expect(result.current.produits).toHaveLength(1);
    expect(result.current.distributeurs).toHaveLength(1);
    expect(result.current.moyensPaiement).toHaveLength(1);
    // Verified: no forced local date_from / date_to
    expect(result.current.filters.date_from).toBeUndefined();
    expect(result.current.filters.date_to).toBeUndefined();
  });

  it("updates filter and calls loadSummary directly matching OpenAPI params", async () => {
    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      result.current.updateFilter("sens", "CREDIT");
    });

    expect(result.current.filters.sens).toBe("CREDIT");

    await waitFor(() => {
      expect(dashboardService.fetchDashboardSummary).toHaveBeenCalledWith(
        expect.objectContaining({ sens: "CREDIT" })
      );
    });

    // Clear filter
    await act(async () => {
      result.current.updateFilter("sens", undefined);
    });
    expect(result.current.filters.sens).toBeUndefined();
  });

  it("handles fetch errors gracefully", async () => {
    vi.mocked(dashboardService.fetchDashboardSummary).mockRejectedValueOnce(
      new Error("Erreur serveur réseau")
    );

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Erreur serveur réseau");
    expect(result.current.summary).toBeNull();
  });

  it("enforces perimeter for a Structure user in dashboard summary call", async () => {
    useAuthStore.setState({
      user: {
        userId: "u-structure",
        email: "structure@bank.sn",
        role: "Administrateur",
        entityContext: "Structure",
        institutionId: "struct-alpha",
        institutionLabel: "Banque Alpha",
      },
    });

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.perimeter.isStructureUser).toBe(true);
    expect(result.current.filters.structure_id).toBe("struct-alpha");
    expect(dashboardService.fetchDashboardSummary).toHaveBeenCalledWith(
      expect.objectContaining({ structure_id: "struct-alpha" })
    );

    // Structure dropdown has only the user's structure
    expect(result.current.structures).toHaveLength(1);
    expect(result.current.structures[0].id).toBe("struct-alpha");

    // Cannot overwrite structure_id
    await act(async () => {
      result.current.updateFilter("structure_id", "other-structure");
    });
    expect(result.current.filters.structure_id).toBe("struct-alpha");
  });

  it("enforces perimeter for an Agency user in dashboard summary call", async () => {
    useAuthStore.setState({
      user: {
        userId: "u-agency",
        email: "agency@bank.sn",
        role: "Agent",
        entityContext: "Agence",
        agencyId: "agency-gamma",
        agencyLabel: "Agence Gamma",
      },
    });

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.perimeter.isAgencyUser).toBe(true);
    expect(result.current.filters.agence_id).toBe("agency-gamma");
    expect(dashboardService.fetchDashboardSummary).toHaveBeenCalledWith(
      expect.objectContaining({ agence_id: "agency-gamma" })
    );

    // Agence dropdown has only the user's agency
    expect(result.current.agences).toHaveLength(1);
    expect(result.current.agences[0].id).toBe("agency-gamma");
  });

  it("restricts a cashier's dashboard to his caisse (caisse_id, plus d'agent_id)", async () => {
    useAuthStore.setState({
      user: {
        userId: "8106df8e-4c56-4735-ba64-d70bb8584c5c",
        email: "agentcaissier@example.com",
        role: "Agent",
        entityContext: "Agence",
        institutionId: "d9e56eab-12c9-4cfa-bd83-fdecf931c46f",
        agencyId: "722a9882-afa7-43c6-be61-df714abf4388",
        caisseId: "ea135124-3277-4cce-9084-78236c1ca48a",
      },
    });

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(dashboardService.fetchDashboardSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        agence_id: "722a9882-afa7-43c6-be61-df714abf4388",
        caisse_id: "ea135124-3277-4cce-9084-78236c1ca48a",
      })
    );
    expect(vi.mocked(dashboardService.fetchDashboardSummary).mock.calls[0][0]).not.toHaveProperty("agent_id");
  });

  it("enforces perimeter for a Product user in dashboard summary call", async () => {
    useAuthStore.setState({
      user: {
        userId: "u-prod",
        email: "product@example.com",
        role: "Profil central",
        entityContext: "Produit",
        productId: "prod-demopay-uuid",
        productLabel: "DEMOPAY",
      },
    });

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.perimeter.isProductUser).toBe(true);
    expect(result.current.filters.produit_id).toBe("prod-demopay-uuid");
    expect(dashboardService.fetchDashboardSummary).toHaveBeenCalledWith(
      expect.objectContaining({ produit_id: "prod-demopay-uuid" })
    );

    // Cannot overwrite produit_id or produit
    await act(async () => {
      result.current.updateFilter("produit_id", "other-prod");
    });
    expect(result.current.filters.produit_id).toBe("prod-demopay-uuid");

    await act(async () => {
      result.current.updateFilter("produit", "BMONEY");
    });
    expect(result.current.filters.produit_id).toBe("prod-demopay-uuid");
  });
});
