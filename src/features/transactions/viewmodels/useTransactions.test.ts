import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTransactions } from "./useTransactions";
import * as transactionsService from "../services/transactionsService";
import { useAuthStore } from "@/core/security/authStore";

vi.mock("../services/transactionsService", () => ({
  fetchTransactions: vi.fn(),
  fetchTransactionDetail: vi.fn(),
  downloadTransactionsExport: vi.fn(),
}));

vi.mock("@/features/structures/services/structuresService", () => ({
  fetchStructures: vi.fn().mockResolvedValue({ items: [{ id: "struct-1", name: "Structure 1" }] }),
}));

vi.mock("@/features/agences/services/agencesService", () => ({
  fetchAgences: vi.fn().mockResolvedValue({ items: [{ id: "agence-1", name: "Agence 1" }] }),
}));

vi.mock("@/features/produits/services/produitsService", () => ({
  fetchProduits: vi.fn().mockResolvedValue({ items: [{ id: "prod-1", name: "Produit 1" }] }),
}));

vi.mock("@/features/distributeurs/services/distributeursService", () => ({
  fetchDistributeurs: vi.fn().mockResolvedValue({ items: [{ id: "dist-1", name: "Distributeur 1" }] }),
}));

vi.mock("@/features/payment-methods/services/paymentMethodsService", () => ({
  fetchPaymentMethods: vi.fn().mockResolvedValue([{ code: "WAVE", name: "Wave" }]),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("useTransactions hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null });
  });

  it("loads transactions on mount without local filter restrictions", async () => {
    const mockData = {
      total: 100,
      skip: 0,
      limit: 50,
      items: [
        {
          id: "tx-1",
          reference: "TX-REF-1",
          type_transaction: "VERSEMENT",
          statut: "validee",
          montant: 50000,
          structure: "Structure 1",
          initiateur: "Client A",
          updated_at: "2026-09-18T12:00:00Z",
        },
      ],
    };

    vi.mocked(transactionsService.fetchTransactions).mockResolvedValueOnce(mockData as never);

    const { result } = renderHook(() => useTransactions());

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.total).toBe(100);
    expect(result.current.totalPages).toBe(2);
    // Verified: no local date_from/date_to is forced
    expect(result.current.filters.date_from).toBeUndefined();
    expect(result.current.filters.date_to).toBeUndefined();
  });

  it("handles filter changes directly matching OpenAPI parameters", async () => {
    vi.mocked(transactionsService.fetchTransactions).mockResolvedValue({
      total: 0,
      skip: 0,
      limit: 50,
      items: [],
    });

    const { result } = renderHook(() => useTransactions());
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setPage(3);
    });
    expect(result.current.page).toBe(3);

    act(() => {
      result.current.updateFilter("type_transaction", "RETRAIT");
    });

    expect(result.current.page).toBe(1);
    expect(result.current.filters.type_transaction).toBe("RETRAIT");

    // Clear filter
    act(() => {
      result.current.updateFilter("type_transaction", "");
    });
    expect(result.current.filters.type_transaction).toBeUndefined();
  });

  it("handles opening and closing transaction detail", async () => {
    vi.mocked(transactionsService.fetchTransactions).mockResolvedValue({
      total: 0,
      skip: 0,
      limit: 50,
      items: [],
    });

    const mockDetail = {
      id: "tx-1",
      reference: "TX-REF-1",
      type_transaction: "VERSEMENT",
      statut: "validee",
      montant: 50000,
      structure: "Structure 1",
      initiateur: "Client A",
      updated_at: "2026-09-18T12:00:00Z",
      created_at: "2026-09-18T11:59:00Z",
      raw_payloads: [],
    };

    vi.mocked(transactionsService.fetchTransactionDetail).mockResolvedValueOnce(mockDetail as never);

    const { result } = renderHook(() => useTransactions());
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.openDetail("tx-1");
    });

    expect(result.current.selectedTransactionId).toBe("tx-1");
    expect(result.current.selectedTransaction).toEqual(mockDetail);

    act(() => {
      result.current.closeDetail();
    });

    expect(result.current.selectedTransactionId).toBeNull();
    expect(result.current.selectedTransaction).toBeNull();
  });

  it("handles export download trigger with active OpenAPI filters", async () => {
    vi.mocked(transactionsService.fetchTransactions).mockResolvedValue({
      total: 0,
      skip: 0,
      limit: 50,
      items: [],
    });
    vi.mocked(transactionsService.downloadTransactionsExport).mockResolvedValueOnce();

    const { result } = renderHook(() => useTransactions());
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.exportTransactions("csv");
    });

    expect(transactionsService.downloadTransactionsExport).toHaveBeenCalledWith(
      result.current.filters,
      "csv"
    );
  });

  it("enforces perimeter for a Structure user (locks structure_id and loads structure-scoped distributors)", async () => {
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

    vi.mocked(transactionsService.fetchTransactions).mockResolvedValue({
      total: 10,
      skip: 0,
      limit: 50,
      items: [],
    });

    const { result } = renderHook(() => useTransactions());
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.perimeter.isStructureUser).toBe(true);
    expect(result.current.perimeter.enforcedStructureId).toBe("struct-alpha");
    expect(result.current.filters.structure_id).toBe("struct-alpha");

    // Attempting to overwrite structure_id should be ignored
    act(() => {
      result.current.updateFilter("structure_id", "other-structure");
    });
    expect(result.current.filters.structure_id).toBe("struct-alpha");

    // But filtering by a distributor of its structure is permitted
    act(() => {
      result.current.updateFilter("distributeur_id", "dist-1");
    });
    expect(result.current.filters.distributeur_id).toBe("dist-1");
    expect(result.current.filters.structure_id).toBe("struct-alpha");
  });

  it("enforces perimeter for an Agency user (locks agence_id)", async () => {
    useAuthStore.setState({
      user: {
        userId: "u-agency",
        email: "agency@bank.sn",
        role: "Agent",
        entityContext: "Agence",
        agencyId: "agency-beta",
        agencyLabel: "Agence Beta",
      },
    });

    vi.mocked(transactionsService.fetchTransactions).mockResolvedValue({
      total: 5,
      skip: 0,
      limit: 50,
      items: [],
    });

    const { result } = renderHook(() => useTransactions());
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.perimeter.isAgencyUser).toBe(true);
    expect(result.current.perimeter.enforcedAgencyId).toBe("agency-beta");
    expect(result.current.filters.agence_id).toBe("agency-beta");

    // Cannot change agence_id
    act(() => {
      result.current.updateFilter("agence_id", "agency-other");
    });
    expect(result.current.filters.agence_id).toBe("agency-beta");
  });

  it("restricts a cashier to his caisse (caisse_id, plus d'agent_id)", async () => {
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

    vi.mocked(transactionsService.fetchTransactions).mockResolvedValue({
      total: 0,
      skip: 0,
      limit: 50,
      items: [],
    });

    const { result } = renderHook(() => useTransactions());
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.perimeter.isCashier).toBe(true);
    expect(transactionsService.fetchTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ caisse_id: "ea135124-3277-4cce-9084-78236c1ca48a" }),
    );
    expect(vi.mocked(transactionsService.fetchTransactions).mock.calls[0][0]).not.toHaveProperty("agent_id");
  });

  it("enforces perimeter for a Product user (locks produit_id)", async () => {
    useAuthStore.setState({
      user: {
        userId: "u-product",
        email: "product@example.com",
        role: "Profil central",
        entityContext: "Produit",
        productId: "prod-demopay-uuid",
        productLabel: "DEMOPAY",
      },
    });

    vi.mocked(transactionsService.fetchTransactions).mockResolvedValue({
      total: 3,
      skip: 0,
      limit: 50,
      items: [],
    });

    const { result } = renderHook(() => useTransactions());
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.perimeter.isProductUser).toBe(true);
    expect(result.current.perimeter.enforcedProductId).toBe("prod-demopay-uuid");
    expect(result.current.filters.produit_id).toBe("prod-demopay-uuid");

    // Cannot change produit_id
    act(() => {
      result.current.updateFilter("produit_id", "prod-other");
    });
    expect(result.current.filters.produit_id).toBe("prod-demopay-uuid");

    // Attempting to change produit is also ignored
    act(() => {
      result.current.updateFilter("produit", "BMONEY");
    });
    expect(result.current.filters.produit_id).toBe("prod-demopay-uuid");
  });
});
