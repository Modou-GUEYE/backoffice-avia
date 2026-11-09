import React from "react";
import { CheckCircle2, MapPin, XCircle } from "lucide-react";
import type { AgenceRead, AgencySummary } from "../../models/types";

interface AgencesSummaryCardsProps {
  summary?: AgencySummary | null;
  agences?: AgenceRead[];
}

export const AgencesSummaryCards: React.FC<AgencesSummaryCardsProps> = ({ summary, agences }) => {
  // Utilise directement les KPIs de la réponse backend
  const total = summary?.total ?? agences?.length ?? 0;
  const actifs = summary?.actifs ?? agences?.filter((s) => s.is_active).length ?? 0;
  const inactifs = summary?.inactifs ?? agences?.filter((s) => !s.is_active).length ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
        <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{total}</div>
          <div className="text-xs font-medium text-muted-foreground">Total Agences</div>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
        <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{actifs}</div>
          <div className="text-xs font-medium text-muted-foreground">Agences Actives</div>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
        <div className="p-3 rounded-lg bg-rose-500/10 text-rose-600">
          <XCircle className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{inactifs}</div>
          <div className="text-xs font-medium text-muted-foreground">Agences Inactives</div>
        </div>
      </div>
    </div>
  );
};
