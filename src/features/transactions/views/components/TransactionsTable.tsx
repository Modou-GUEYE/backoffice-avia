import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
} from "lucide-react";
import { TransactionOut } from "../../models/types";

interface TransactionsTableProps {
  transactions: TransactionOut[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSelectTransaction: (id: string) => void;
}

const formatCurrency = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return "-";
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    maximumFractionDigits: 2,
  }).format(val) + " FCFA";
};

const formatDate = (isoString: string | null | undefined): string => {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
};

const renderStatutBadge = (statut: string) => {
  const norm = statut.toUpperCase();
  if (norm === "TERMINEE" || norm === "VALIDEE" || norm === "SUCCESS") {
    return (
      <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[11px] font-medium">
        Succès
      </Badge>
    );
  }
  if (norm === "EN_ATTENTE" || norm === "EN_COURS" || norm === "PENDING") {
    return (
      <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[11px] font-medium">
        En cours
      </Badge>
    );
  }
  if (norm === "ECHOUEE" || norm === "REJETEE" || norm === "FAILED" || norm === "ANNULEE") {
    return (
      <Badge variant="outline" className="border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 text-[11px] font-medium">
        Échouée
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground text-[11px]">
      {statut}
    </Badge>
  );
};



export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  loading,
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onSelectTransaction,
}) => {
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  return (
    <div className="rounded-lg border border-border/60 bg-card shadow-xs overflow-hidden">
      {/* Table Container */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40 text-muted-foreground">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[140px] text-xs font-semibold">Date & Heure</TableHead>
              <TableHead className="text-xs font-semibold">Opération</TableHead>
              <TableHead className="text-right text-xs font-semibold">Montant</TableHead>
              <TableHead className="text-right text-xs font-semibold">Frais</TableHead>
              <TableHead className="text-xs font-semibold">Moyen</TableHead>
              <TableHead className="text-xs font-semibold">Initiateur</TableHead>
              <TableHead className="text-xs font-semibold">Receveur</TableHead>
              <TableHead className="text-center text-xs font-semibold">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading Skeleton Rows
              Array.from({ length: 6 }).map((_, idx) => (
                <TableRow key={`skeleton-${idx}`}>
                  {Array.from({ length: 8 }).map((__, cIdx) => (
                    <TableCell key={`skeleton-cell-${idx}-${cIdx}`}>
                      <div className="h-4 w-full bg-muted/60 animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : transactions.length === 0 ? (
              // Empty State
              <TableRow>
                <TableCell colSpan={8} className="h-56 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                    <ArrowLeftRight className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-foreground">Aucune transaction trouvée</p>
                    <p className="text-xs text-muted-foreground text-center">
                      Aucune opération ne correspond aux filtres actuels ou à la période sélectionnée.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              // Real Data Rows
              transactions.map((tx) => (
                <TableRow
                  key={tx.id}
                  className="hover:bg-muted/30 cursor-pointer text-xs transition-colors"
                  onClick={() => onSelectTransaction(tx.id)}
                >
                  <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                    {formatDate(tx.date_initiation || tx.updated_at)}
                  </TableCell>

                  <TableCell className="font-medium whitespace-nowrap">
                    {tx.type_transaction}
                  </TableCell>

                  <TableCell className="text-right font-medium font-mono text-foreground whitespace-nowrap">
                    {formatCurrency(tx.montant)}
                  </TableCell>

                  <TableCell className="text-right font-mono text-muted-foreground whitespace-nowrap">
                    {tx.frais ? formatCurrency(tx.frais) : "0 FCFA"}
                  </TableCell>

                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {tx.moyen_paiement || "-"}
                  </TableCell>

                  <TableCell className="max-w-[120px] truncate text-foreground/80" title={tx.initiateur}>
                    {tx.initiateur || "-"}
                  </TableCell>

                  <TableCell className="max-w-[120px] truncate text-muted-foreground" title={tx.receveur || ""}>
                    {tx.receveur || "-"}
                  </TableCell>

                  <TableCell className="text-center whitespace-nowrap">
                    {renderStatutBadge(tx.statut)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      {!loading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border/60 bg-muted/20 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-muted-foreground">Lignes :</span>
              <select
                className="h-7 rounded border border-border bg-background px-1.5 text-xs focus:outline-hidden"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              title="Page précédente"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            <span className="px-1 text-muted-foreground">
              Page <span className="font-medium text-foreground">{page}</span> sur{" "}
              <span className="font-medium text-foreground">{totalPages}</span>
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              title="Page suivante"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
