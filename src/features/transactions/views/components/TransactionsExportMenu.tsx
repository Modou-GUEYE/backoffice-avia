import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { TransactionExportFormat } from "../../models/types";

interface TransactionsExportMenuProps {
  loading: boolean;
  onExport: (format: TransactionExportFormat) => void;
}

export const TransactionsExportMenu: React.FC<TransactionsExportMenuProps> = ({
  loading,
  onExport,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          className="h-8 text-xs gap-1.5 bg-background shadow-xs hover:bg-accent/40"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          <span>Exporter</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 text-xs">
        <DropdownMenuItem
          onClick={() => onExport("csv")}
          className="cursor-pointer gap-2"
        >
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Format CSV (.csv)</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onExport("xlsx")}
          className="cursor-pointer gap-2"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
          <span>Format Excel (.xlsx)</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onExport("pdf")}
          className="cursor-pointer gap-2"
        >
          <FileText className="h-3.5 w-3.5 text-rose-600" />
          <span>Format PDF (.pdf)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
