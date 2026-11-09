import React from "react";
import { CheckCircle2, Landmark, XCircle } from "lucide-react";
import type { CaisseSummary } from "../../models/types";

interface CaissesSummaryCardsProps {
  summary?: CaisseSummary | null;
}

export const CaissesSummaryCards: React.FC<CaissesSummaryCardsProps> = ({ summary }) => {
  const total = summary?.total ?? 0;
  const actifs = summary?.actifs ?? 0;
  const inactifs = summary?.inactifs ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
        <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600">
          <Landmark className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{total}</div>
          <div className="text-xs font-medium text-muted-foreground">Total Caisses</div>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
        <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{actifs}</div>
          <div className="text-xs font-medium text-muted-foreground">Caisses Actives</div>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
        <div className="p-3 rounded-lg bg-rose-500/10 text-rose-600">
          <XCircle className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{inactifs}</div>
          <div className="text-xs font-medium text-muted-foreground">Caisses Inactives</div>
        </div>
      </div>
    </div>
  );
};
