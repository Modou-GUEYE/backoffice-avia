import { FileClock, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUT_LABELS } from "../../models/data";

/** Brouillon (recalculable) ou Figé (période clôturée, immuable). */
export const ReleveStatutBadge = ({ statut }: { statut: string }) => {
  const fige = statut?.toLowerCase() === "fige";
  const Icon = fige ? Lock : FileClock;
  return (
    <Badge
      variant="outline"
      className={`gap-1.5 font-semibold ${
        fige
          ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400"
          : "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {STATUT_LABELS[statut?.toLowerCase()] ?? statut}
    </Badge>
  );
};

export default ReleveStatutBadge;
