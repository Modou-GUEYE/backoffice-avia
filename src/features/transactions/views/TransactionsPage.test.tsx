import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import TransactionsPage from "./TransactionsPage";
import * as transactionsHook from "../viewmodels/useTransactions";

type TransactionsVm = ReturnType<typeof transactionsHook.useTransactions>;

vi.mock("../viewmodels/useTransactions", () => ({
  useTransactions: vi.fn(),
}));

describe("TransactionsPage", () => {
  const mockTransactionsData = {
    transactions: [
      {
        id: "tx-123",
        reference: "REF-2026-001",
        type_transaction: "VERSEMENT",
        statut: "validee",
        date_initiation: "2026-09-18T10:00:00Z",
        date_finalisation: "2026-09-18T10:01:00Z",
        montant: 50000,
        frais: 500,
        structure: "ALPHA",
        initiateur: "Moussa Diop",
        moyen_paiement: "CASH",
        sens: "CREDIT",
        produit: "ORANGE_MONEY",
        distributeur: "DIST-1",
        quoteparts: null,
        receveur: "Fatou Sow",
        agent: "Agent-01",
        agence: "Agence Plateau",
        canal: "agence",
        motif_rejet: null,
        anomalie_ordre: false,
        anomalie_detail: null,
        updated_at: "2026-09-18T10:01:00Z",
      },
    ],
    total: 1,
    loading: false,
    error: null,
    page: 1,
    pageSize: 50,
    totalPages: 1,
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    filters: {},
    updateFilter: vi.fn(),
    refresh: vi.fn(),
    selectedTransactionId: null,
    selectedTransaction: null,
    detailLoading: false,
    detailError: null,
    openDetail: vi.fn(),
    closeDetail: vi.fn(),
    exportLoading: false,
    exportTransactions: vi.fn(),
    structures: [{ id: "s1", label: "ALPHA" }],
    agences: [{ id: "a1", label: "Agence Plateau" }],
    produits: [{ id: "p1", label: "Orange Money" }],
    distributeurs: [{ id: "d1", label: "Distributeur 1" }],
    moyensPaiement: [{ id: "pm1", label: "CASH" }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page title and transactions table", () => {
    vi.mocked(transactionsHook.useTransactions).mockReturnValue(mockTransactionsData as unknown as TransactionsVm);

    render(<TransactionsPage />);

    expect(screen.getByText("Journal des transactions")).toBeInTheDocument();
    expect(screen.getByText("VERSEMENT")).toBeInTheDocument();
    expect(screen.getByText("Moussa Diop")).toBeInTheDocument();
    expect(screen.getByText("50 000 FCFA")).toBeInTheDocument();
  });

  it("renders empty state when there are no transactions", () => {
    vi.mocked(transactionsHook.useTransactions).mockReturnValue({
      ...mockTransactionsData,
      transactions: [],
      total: 0,
    } as unknown as TransactionsVm);

    render(<TransactionsPage />);

    expect(screen.getByText("Aucune transaction trouvée")).toBeInTheDocument();
  });

  it("renders error banner when error is present", () => {
    vi.mocked(transactionsHook.useTransactions).mockReturnValue({
      ...mockTransactionsData,
      error: "Erreur serveur 500",
    } as unknown as TransactionsVm);

    render(<TransactionsPage />);

    expect(screen.getByText("Erreur serveur 500")).toBeInTheDocument();
  });
});
