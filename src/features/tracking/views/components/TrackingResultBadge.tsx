import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isTrackingSuccess } from "../../viewmodels/useTrackingEvents";

type TrackingResultBadgeProps = {
  result?: string | null;
};

/** Résultat d'une action tracée : « Réussie » ou « Échec », la valeur brute de l'API en info-bulle. */
export const TrackingResultBadge = ({ result }: TrackingResultBadgeProps) => {
  if (!result?.trim()) {
    return <span className="text-muted-foreground">—</span>;
  }

  const success = isTrackingSuccess(result);
  const Icon = success ? CheckCircle2 : XCircle;

  return (
    <Badge
      variant="outline"
      title={result}
      className={`gap-1.5 font-semibold ${
        success
          ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400"
          : "bg-destructive/10 text-destructive border-destructive/30"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {success ? "Réussie" : "Échec"}
    </Badge>
  );
};

export default TrackingResultBadge;
