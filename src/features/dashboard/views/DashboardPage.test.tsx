import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "./DashboardPage";
import * as dashboardHook from "../viewmodels/useDashboard";

// Mock the hook
vi.mock("../viewmodels/useDashboard", () => ({
  useDashboard: vi.fn(),
}));

type DashboardHookResult = ReturnType<typeof dashboardHook.useDashboard>;

describe("DashboardPage", () => {
  const mockDashboardData = {
    summary: {
      nombre_transactions: 1500,
      volume_total: 45000000,
      en_cours: { nombre: 25, volume: 750000 },
      service: {
        CASHIN: { nombre: 1000, volume: 30000000 },
        CASHOUT: { nombre: 500, volume: 15000000 },
      },
      sens: {
        CREDIT: { nombre: 1000, volume: 30000000 },
        DEBIT: { nombre: 500, volume: 15000000 },
      },
      moyen_paiement: {
        CASH: { nombre: 1200, volume: 36000000 },
      },
      produit: {
        ORANGE_MONEY: { nombre: 800, volume: 24000000 },
      },
      distributeur: {
        PARTENAIRE_A: { nombre: 1500, volume: 45000000 },
      },
    },
    loading: false,
    error: null,
    filters: {},
    structures: [{ id: "s1", label: "Direction Générale", code: "DG" }],
    agences: [{ id: "a1", label: "Agence Plateau", code: "AP" }],
    produits: [{ id: "p1", label: "Orange Money", code: "OM" }],
    distributeurs: [{ id: "d1", label: "Distributeur 1", code: "D1" }],
    moyensPaiement: [{ id: "pm1", label: "Wallet", code: "WALLET" }],
    updateFilter: vi.fn(),
    refetch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the title and metrics correctly", () => {
    vi.mocked(dashboardHook.useDashboard).mockReturnValue(mockDashboardData as unknown as DashboardHookResult);

    render(<DashboardPage />);

    expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
    expect(screen.getByText("1 500")).toBeInTheDocument();
    expect(screen.getAllByText(/45\s000\s000\sFCFA/).length).toBeGreaterThanOrEqual(1);
  });

  it("displays loading skeletons when loading is true", () => {
    vi.mocked(dashboardHook.useDashboard).mockReturnValue({
      ...mockDashboardData,
      loading: true,
      summary: null,
    } as unknown as DashboardHookResult);

    render(<DashboardPage />);
    expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
  });

  it("displays error alert when error occurs", () => {
    vi.mocked(dashboardHook.useDashboard).mockReturnValue({
      ...mockDashboardData,
      error: "Erreur réseau de test",
    } as unknown as DashboardHookResult);

    render(<DashboardPage />);
    expect(screen.getByText("Erreur de chargement")).toBeInTheDocument();
    expect(screen.getByText("Erreur réseau de test")).toBeInTheDocument();
  });
});
