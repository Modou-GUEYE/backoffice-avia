import React from "react";
import { Handshake, Store, FileText, CheckCircle2, XCircle } from "lucide-react";
import type { PartenaireRead, PartenaireSummary } from "../../models/types";

type PartenairesSummaryCardsProps = {
  partenaires: PartenaireRead[];
  summary?: PartenaireSummary | null;
};

export const PartenairesSummaryCards: React.FC<PartenairesSummaryCardsProps> = ({ partenaires, summary }) => {
  const list = partenaires || [];
  const total = summary ? summary.total : list.length;
  const marchands = summary ? summary.marchands : list.filter((p) => p.categorie === "marchand").length;
  const facturiers = summary ? summary.facturiers : list.filter((p) => p.categorie === "facturier").length;
  const actifs = summary ? summary.actifs : list.filter((p) => p.statut === "actif").length;
  const inactifs = summary ? summary.inactifs : list.filter((p) => p.statut === "inactif").length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
        <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600">
          <Handshake className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{total}</div>
          <div className="text-xs font-medium text-muted-foreground">Total Partenaires</div>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
        <div className="p-3 rounded-lg bg-amber-500/10 text-amber-600">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{marchands}</div>
          <div className="text-xs font-medium text-muted-foreground">Marchands</div>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
        <div className="p-3 rounded-lg bg-purple-500/10 text-purple-600">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{facturiers}</div>
          <div className="text-xs font-medium text-muted-foreground">Facturiers</div>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
        <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{actifs}</div>
          <div className="text-xs font-medium text-muted-foreground">Partenaires Actifs</div>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-4">
        <div className="p-3 rounded-lg bg-rose-500/10 text-rose-600">
          <XCircle className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{inactifs}</div>
          <div className="text-xs font-medium text-muted-foreground">Partenaires Inactifs</div>
        </div>
      </div>
    </div>
  );
};

export default PartenairesSummaryCards;
