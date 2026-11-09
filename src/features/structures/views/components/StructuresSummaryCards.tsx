import React from "react";
import { Building2, CheckCircle2, XCircle } from "lucide-react";
import type { Structure, StructureSummary } from "../../models/types";

type StructuresSummaryCardsProps = {
  structures: Structure[];
  summary?: StructureSummary | null;
};

export const StructuresSummaryCards: React.FC<StructuresSummaryCardsProps> = ({ structures, summary }) => {
  const list = structures || [];
  const total = summary ? summary.total : list.length;
  const actifs = summary ? summary.actifs : list.filter((s) => s.is_active).length;
  const inactifs = summary ? summary.inactifs : list.filter((s) => !s.is_active).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
        <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{total}</div>
          <div className="text-xs font-medium text-muted-foreground">Total Structures</div>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
        <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{actifs}</div>
          <div className="text-xs font-medium text-muted-foreground">Structures Actives</div>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
        <div className="p-3 rounded-lg bg-rose-500/10 text-rose-600">
          <XCircle className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{inactifs}</div>
          <div className="text-xs font-medium text-muted-foreground">Structures Inactives</div>
        </div>
      </div>
    </div>
  );
};
