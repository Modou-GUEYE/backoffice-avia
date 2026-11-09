import { CampaignOut, CampaignHistoryEntry, statusLabels } from "../../models/types";
import { Badge } from "@/components/ui/badge";
import DetailDialog from "@/shared/components/DetailDialog";

interface CampaignHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  campaign: CampaignOut | null;
  history: CampaignHistoryEntry[];
}

export const CampaignHistoryDialog = ({
  open,
  onOpenChange,
  isLoading,
  campaign,
  history,
}: CampaignHistoryDialogProps) => {
  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Historique de diffusion : ${campaign?.libelle ?? ""}`}
      contentClassName="sm:max-w-md max-h-[80vh] overflow-y-auto"
    >
      <div className="space-y-4 py-2">
        {isLoading ? (
          <p className="text-center py-4 text-xs text-muted-foreground">Chargement de l'historique...</p>
        ) : history.length === 0 ? (
          <p className="text-center py-4 text-xs text-muted-foreground">Aucun historique de diffusion pour le moment.</p>
        ) : (
          <div className="relative border-l border-border pl-4 space-y-4 ml-2 mt-2">
            {history.map((entry, idx) => {
              const statusConfig = statusLabels[entry.status] || {
                label: entry.status,
                className: "bg-muted text-muted-foreground",
              };

              return (
                <div key={entry.diffusion_id || idx} className="relative">
                  <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-accent border-2 border-background" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        Diffusion #{entry.diffusion_id.substring(0, 8)}
                      </span>
                      <Badge variant="outline" className={statusConfig.className}>
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Période : {new Date(entry.date_debut).toLocaleDateString()} au{" "}
                      {new Date(entry.date_fin).toLocaleDateString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground italic">
                      Archivé le : {new Date(entry.archived_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DetailDialog>
  );
};

export default CampaignHistoryDialog;
