import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight } from "lucide-react";
import { useTransactions } from "../viewmodels/useTransactions";
import { TransactionsFiltersBar } from "./components/TransactionsFiltersBar";
import { TransactionsTable } from "./components/TransactionsTable";
import { TransactionDetailDialog } from "./components/TransactionDetailDialog";
import { TransactionsExportMenu } from "./components/TransactionsExportMenu";

const TransactionsPage: React.FC = () => {
  const {
    transactions,
    total,
    loading,
    error,
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
    filters,
    updateFilter,
    refresh,
    perimeter,
    // Detail modal
    selectedTransactionId,
    selectedTransaction,
    detailLoading,
    detailError,
    openDetail,
    closeDetail,
    // Export
    exportLoading,
    exportTransactions,
    // Filter options
    structures,
    agences,
    caisses,
    caissesNeedAgency,
    produits,
    distributeurs,
    moyensPaiement,
  } = useTransactions();

  return (
    <div className="space-y-5 p-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
            <ArrowLeftRight className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Journal des transactions
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Suivi en temps réel des opérations clients et agents.
            </p>
          </div>
        </div>

        {/* Actions header */}
        <div className="flex items-center gap-2">
          <TransactionsExportMenu
            loading={exportLoading}
            onExport={exportTransactions}
          />
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-xs text-destructive flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={refresh} className="h-6 text-xs px-2">
            Réessayer
          </Button>
        </div>
      )}

      {/* Filters Bar - 100% aligné sur le contrat OpenAPI */}
      <TransactionsFiltersBar
        filters={filters}
        onFilterChange={updateFilter}
        structures={structures}
        agences={agences}
        caisses={caisses}
        caissesNeedAgency={caissesNeedAgency}
        produits={produits}
        distributeurs={distributeurs}
        moyensPaiement={moyensPaiement}
        perimeter={perimeter}
      />

      {/* Transactions Data Table */}
      <TransactionsTable
        transactions={transactions}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSelectTransaction={openDetail}
      />

      {/* Detail Dialog */}
      <TransactionDetailDialog
        open={Boolean(selectedTransactionId)}
        transaction={selectedTransaction}
        loading={detailLoading}
        error={detailError}
        onClose={closeDetail}
      />
    </div>
  );
};

export default TransactionsPage;
