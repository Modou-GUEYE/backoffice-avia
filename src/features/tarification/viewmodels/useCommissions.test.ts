import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useCommissions, type CommissionScope } from "./useCommissions";
import * as commissionsService from "../services/commissionsService";
import type { CommissionSplitResponse } from "../models/types";

vi.mock("../services/commissionsService", () => ({
  fetchCommissions: vi.fn(),
  createCommission: vi.fn(),
  updateCommission: vi.fn(),
  deleteCommission: vi.fn(),
  toggleCommissionStatus: vi.fn(),
  fetchCommissionsConsolidated: vi.fn(),
  fetchCommissionDetail: vi.fn(),
  fetchCatalogServices: vi.fn(),
}));

vi.mock("@/features/agences/services/agencesService", () => ({ fetchAgences: vi.fn() }));
vi.mock("@/features/produits/services/produitsService", () => ({ fetchProduits: vi.fn() }));
vi.mock("@/features/distributeurs/services/distributeursService", () => ({ fetchDistributeurs: vi.fn() }));
vi.mock("@/features/structures/services/structuresService", () => ({ fetchStructures: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { mockAuthStore } = vi.hoisted(() => {
  const store = Object.assign(
    <T>(selector: (state: { user: { entityContext: string } }) => T) =>
      selector({ user: { entityContext: "Administration" } }),
    { getState: () => ({ token: "mock-token" }) },
  );
  return { mockAuthStore: store };
});

vi.mock("@/core/security/authStore", () => ({
  useAuthStore: mockAuthStore,
  getCurrentInstitutionId: () => "",
  parseDistributorIdFromToken: () => "",
}));

const split = (overrides: Partial<CommissionSplitResponse> = {}): CommissionSplitResponse => ({
  id: "split-1",
  service_type: "VERSEMENT",
  tenant_level: "PRODUCT",
  tenant_id: "prod-1",
  phase: "UNIQUE",
  rate_structure: 40,
  rate_tca_structure: 10,
  rate_distributeur: 0,
  rate_groupement: 20,
  rate_partenaire_technique: 30,
  is_active: true,
  ...overrides,
});

const fillValidRates = (result: { current: ReturnType<typeof useCommissions> }) =>
  act(() =>
    result.current.setFormState((prev) => ({
      ...prev,
      rateStructure: "40",
      rateTcaStructure: "10",
      rateDistributeur: "0",
      rateGroupement: "20",
      ratePartenaireTechnique: "30",
    })),
  );

describe("useCommissions avec un périmètre produit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(commissionsService.fetchCatalogServices).mockResolvedValue([{ code: "VERSEMENT", label: "Versement" }] as never);
    vi.mocked(commissionsService.fetchCommissions).mockResolvedValue([split()]);
    vi.mocked(commissionsService.createCommission).mockResolvedValue(split() as never);
    vi.mocked(commissionsService.toggleCommissionStatus).mockResolvedValue(undefined as never);
  });

  it("charge les répartitions du produit existant au niveau PRODUCT", async () => {
    const scope: CommissionScope = { tenantLevel: "PRODUCT", tenantId: "prod-1" };
    const { result } = renderHook(() => useCommissions({ scope }));

    await waitFor(() => expect(result.current.commissions).toHaveLength(1));
    expect(commissionsService.fetchCommissions).toHaveBeenCalledWith({ tenant_level: "PRODUCT", tenant_id: "prod-1" });
    expect(result.current.isStaging).toBe(false);
  });

  it("crée la répartition immédiatement pour un produit existant, avec le produit comme cible", async () => {
    const scope: CommissionScope = { tenantLevel: "PRODUCT", tenantId: "prod-1" };
    const { result } = renderHook(() => useCommissions({ scope }));
    await waitFor(() => expect(result.current.catalogServices).toHaveLength(1));

    act(() => result.current.openCreateDialog());
    expect(result.current.formState).toMatchObject({ tenantLevel: "PRODUCT", tenantId: "prod-1" });
    fillValidRates(result);
    await act(async () => {
      await result.current.handleSave();
    });

    expect(commissionsService.createCommission).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_level: "PRODUCT", tenant_id: "prod-1", service_type: "VERSEMENT" }),
    );
  });

  it("met en attente les répartitions d'un nouveau produit sans appeler l'API", async () => {
    const scope: CommissionScope = { tenantLevel: "PRODUCT", tenantId: null };
    const { result } = renderHook(() => useCommissions({ scope }));
    await waitFor(() => expect(result.current.catalogServices).toHaveLength(1));

    expect(result.current.isStaging).toBe(true);
    expect(commissionsService.fetchCommissions).not.toHaveBeenCalled();

    act(() => result.current.openCreateDialog());
    fillValidRates(result);
    await act(async () => {
      await result.current.handleSave();
    });

    expect(commissionsService.createCommission).not.toHaveBeenCalled();
    expect(result.current.commissions).toHaveLength(1);
    expect(result.current.commissions[0].id.startsWith("pending-")).toBe(true);
    expect(result.current.isFormOpen).toBe(false);
  });

  it("garde la validation du dialogue en attente (somme des taux à 100)", async () => {
    const scope: CommissionScope = { tenantLevel: "PRODUCT", tenantId: null };
    const { result } = renderHook(() => useCommissions({ scope }));
    await waitFor(() => expect(result.current.catalogServices).toHaveLength(1));

    act(() => result.current.openCreateDialog());
    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.commissions).toHaveLength(0);
    expect(result.current.formErrors.tenantId).toBeUndefined();
    expect(result.current.formErrors.totalRate).toBeDefined();
  });

  it("crée les répartitions en attente une fois le produit enregistré et applique le statut inactif", async () => {
    const scope: CommissionScope = { tenantLevel: "PRODUCT", tenantId: null };
    const { result } = renderHook(() => useCommissions({ scope }));
    await waitFor(() => expect(result.current.catalogServices).toHaveLength(1));

    act(() => result.current.openCreateDialog());
    fillValidRates(result);
    await act(async () => {
      await result.current.handleSave();
    });
    await act(async () => {
      await result.current.handleToggleStatus(result.current.commissions[0]);
    });
    expect(result.current.commissions[0].is_active).toBe(false);
    expect(commissionsService.toggleCommissionStatus).not.toHaveBeenCalled();

    vi.mocked(commissionsService.fetchCommissions).mockResolvedValue([split({ id: "created-1", tenant_id: "prod-new" })]);
    let failures: CommissionSplitResponse[] = [];
    await act(async () => {
      failures = await result.current.flushPendingCommissions("prod-new");
    });

    expect(failures).toEqual([]);
    expect(commissionsService.createCommission).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_level: "PRODUCT", tenant_id: "prod-new", rate_structure: 40 }),
    );
    expect(commissionsService.toggleCommissionStatus).toHaveBeenCalledWith("created-1", false);
    expect(result.current.commissions).toHaveLength(0);
  });

  it("renvoie les répartitions dont la création a échoué", async () => {
    const scope: CommissionScope = { tenantLevel: "PRODUCT", tenantId: null };
    const { result } = renderHook(() => useCommissions({ scope }));
    await waitFor(() => expect(result.current.catalogServices).toHaveLength(1));

    act(() => result.current.openCreateDialog());
    fillValidRates(result);
    await act(async () => {
      await result.current.handleSave();
    });

    vi.mocked(commissionsService.createCommission).mockRejectedValue(new Error("409"));
    let failures: CommissionSplitResponse[] = [];
    await act(async () => {
      failures = await result.current.flushPendingCommissions("prod-new");
    });
    expect(failures).toHaveLength(1);
  });

  it("supprime localement une répartition en attente", async () => {
    const scope: CommissionScope = { tenantLevel: "PRODUCT", tenantId: null };
    const { result } = renderHook(() => useCommissions({ scope }));
    await waitFor(() => expect(result.current.catalogServices).toHaveLength(1));

    act(() => result.current.openCreateDialog());
    fillValidRates(result);
    await act(async () => {
      await result.current.handleSave();
    });
    await act(async () => {
      await result.current.handleDelete(result.current.commissions[0].id);
    });

    expect(result.current.commissions).toHaveLength(0);
    expect(commissionsService.deleteCommission).not.toHaveBeenCalled();
  });
});
