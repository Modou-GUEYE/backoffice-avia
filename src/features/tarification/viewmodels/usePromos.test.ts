import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { usePromos } from "./usePromos";
import * as promosService from "../services/promosService";
import { formatPromoDiscount } from "../views/components/promoFormatters";

vi.mock("../services/promosService", () => ({
  fetchPromos: vi.fn(),
  createPromo: vi.fn(),
  updatePromo: vi.fn(),
  deletePromo: vi.fn(),
  togglePromoStatus: vi.fn(),
  fetchPromoDetail: vi.fn(),
}));

const { mockAuthStore } = vi.hoisted(() => {
  const store = Object.assign(
    <T>(selector: (state: { user: { entityContext: string } }) => T) =>
      selector({ user: { entityContext: "Administration" } }),
    { getState: () => ({ token: "mock-token" }) }
  );
  return { mockAuthStore: store };
});

vi.mock("@/core/security/authStore", () => ({
  useAuthStore: mockAuthStore,
  getCurrentInstitutionId: () => "",
  parseDistributorIdFromToken: () => "",
}));

vi.mock("@/features/agences/services/agencesService", () => ({
  fetchAgences: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/distributeurs/services/distributeursService", () => ({
  fetchDistributeurs: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/structures/services/structuresService", () => ({
  fetchStructures: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock("../services/commissionsService", () => ({
  fetchCatalogServices: vi.fn().mockResolvedValue([
    { id: "srv-1", code: "VERSEMENT", label: "Versement" },
    { id: "srv-2", code: "RETRAIT", label: "Retrait" },
  ]),
}));

vi.mock("../services/feesService", () => ({
  fetchFees: vi.fn().mockResolvedValue([
    {
      id: "fee-grid-1",
      min_bound: 0,
      max_bound: 50000,
      fixed_fee: 500,
      rate_fee: 1,
      service_type: "VERSEMENT",
      tenant_level: "GLOBAL",
      tenant_id: null,
      is_active: true,
    },
  ]),
}));

describe("usePromos and cumulative discounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(promosService.fetchPromos).mockResolvedValue([]);
  });

  describe("formatPromoDiscount", () => {
    it("formats cumulative fixed and rate discounts correctly", () => {
      expect(formatPromoDiscount(50, 1)).toBe("-50 FCFA + 1%");
    });

    it("formats percentage only discount", () => {
      expect(formatPromoDiscount(0, 15)).toBe("-15%");
    });

    it("formats fixed only discount", () => {
      expect(formatPromoDiscount(500, 0)).toBe("-500 FCFA");
    });

    it("formats zero discount", () => {
      expect(formatPromoDiscount(0, 0)).toBe("0 FCFA");
    });
  });

  it("creates a promo with both fixed amount and percentage rate (cumulative)", async () => {
    const { result } = renderHook(() => usePromos());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.openCreateDialog();
    });

    act(() => {
      result.current.setFormState({
        ...result.current.formState,
        code: "CUMUL50_1",
        fixedAmount: "50",
        rateAmount: "1",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
      });
    });

    vi.mocked(promosService.createPromo).mockResolvedValueOnce({
      id: "promo-cumul-1",
      code: "CUMUL50_1",
      service_type: "VERSEMENT",
      tenant_level: "GLOBAL",
      tenant_id: null,
      start_date: "2026-09-01T00:00:00.000Z",
      end_date: "2026-09-30T00:00:00.000Z",
      fixed_amount: 50,
      rate_amount: 1,
      is_active: true,
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.submitError).toBeNull();
    expect(result.current.formErrors).toEqual({});
    expect(promosService.createPromo).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "CUMUL50_1",
        fixed_amount: 50,
        rate_amount: 1,
      })
    );
  });

  it("blocks creation when neither fixed amount nor rate amount is provided", async () => {
    const { result } = renderHook(() => usePromos());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.openCreateDialog();
    });

    act(() => {
      result.current.setFormState({
        ...result.current.formState,
        code: "INVALID_PROMO",
        fixedAmount: "0",
        rateAmount: "0",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
      });
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.formErrors.discount).toContain("Veuillez renseigner au moins une remise fixe");
    expect(promosService.createPromo).not.toHaveBeenCalled();
  });

  it("pre-populates both fixed and percentage amounts when opening edit dialog", async () => {
    const { result } = renderHook(() => usePromos());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const mockItem = {
      id: "promo-existing",
      code: "COMBO",
      service_type: "VERSEMENT",
      tenant_level: "GLOBAL" as const,
      tenant_id: null,
      start_date: "2026-09-01T00:00:00.000Z",
      end_date: "2026-09-30T00:00:00.000Z",
      fixed_amount: 50,
      rate_amount: 1,
      is_active: true,
    };

    act(() => {
      result.current.openEditDialog(mockItem);
    });

    expect(result.current.formState.fixedAmount).toBe("50");
    expect(result.current.formState.rateAmount).toBe("1");
    expect(result.current.isFormOpen).toBe(true);
  });

  it("loads catalog services dynamically and uses the first code as default on create", async () => {
    const customServices = [
      { id: "s-transfer", code: "TRANSFERT_P2P", label: "Transfert d'argent" },
      { id: "s-marchand", code: "PAIEMENT_MARCHAND", label: "Paiement Marchand" },
    ];

    const { result } = renderHook(() =>
      usePromos({
        catalogServices: customServices,
      })
    );

    await waitFor(() => {
      expect(result.current.catalogServices.length).toBe(2);
    });

    expect(result.current.catalogServices[0].code).toBe("TRANSFERT_P2P");

    act(() => {
      result.current.openCreateDialog();
    });

    expect(result.current.formState.serviceType).toBe("TRANSFERT_P2P");
    expect(result.current.isFormOpen).toBe(true);
  });

  it("blocks promo creation when serviceType is empty", async () => {
    const { result } = renderHook(() => usePromos());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.openCreateDialog();
    });

    act(() => {
      result.current.setFormState({
        ...result.current.formState,
        code: "NO_SERVICE",
        serviceType: "",
        fixedAmount: "500",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
      });
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.formErrors.serviceType).toContain("Le type de service est obligatoire.");
    expect(promosService.createPromo).not.toHaveBeenCalled();
  });

  it("includes fee_grid_id in create payload when specified", async () => {
    const { result } = renderHook(() => usePromos());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.openCreateDialog();
    });

    act(() => {
      result.current.setFormState({
        ...result.current.formState,
        code: "GRID_PROMO",
        serviceType: "VERSEMENT",
        feeGridId: "fee-grid-1",
        fixedAmount: "500",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
      });
    });

    vi.mocked(promosService.createPromo).mockResolvedValueOnce({
      id: "promo-grid-1",
      code: "GRID_PROMO",
      service_type: "VERSEMENT",
      tenant_level: "GLOBAL",
      tenant_id: null,
      fee_grid_id: "fee-grid-1",
      start_date: "2026-09-01T00:00:00.000Z",
      end_date: "2026-09-30T00:00:00.000Z",
      fixed_amount: 500,
      rate_amount: 0,
      is_active: true,
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(promosService.createPromo).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "GRID_PROMO",
        fee_grid_id: "fee-grid-1",
      })
    );
  });
});
