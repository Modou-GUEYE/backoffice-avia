import {
  CampaignOut,
  mediaTypeLabels,
  statusLabels,
  targetLabels,
  resolveCampaignMediaUrl,
} from "../../models/types";
import { AgenceRead } from "@/features/agences/models/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DetailDialog from "@/shared/components/DetailDialog";
import {
  Volume2,
  FileVideo,
  Image as ImageIcon,
  History,
  Pencil,
} from "lucide-react";

interface CampaignDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  campaign: CampaignOut | null;
  agencesList: AgenceRead[];
  clientTypes?: string[];
  onShowHistory?: (camp: CampaignOut) => void;
  onOpenEdit?: (camp: CampaignOut) => void;
}

const formatClientTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    PARTICULIER: "Particulier",
    ENTREPRISE: "Entreprise",
    COMMERCANT: "Commerçant",
  };
  return map[type] || type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

export const CampaignDetailDialog = ({
  open,
  onOpenChange,
  isLoading,
  campaign,
  agencesList,
  clientTypes,
  onShowHistory,
  onOpenEdit,
}: CampaignDetailDialogProps) => {
  const mediaUrl = campaign ? (campaign.media_url ?? resolveCampaignMediaUrl(campaign)) : null;

  const statusConfig = campaign
    ? statusLabels[campaign.status] || {
        label: campaign.status,
        className: "bg-muted text-muted-foreground",
      }
    : null;

  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      title={campaign?.libelle || "Détails de la publicité"}
      contentClassName="sm:max-w-lg max-h-[85vh] overflow-y-auto"
    >
      {isLoading && !campaign ? (
        <div className="py-8 text-center text-xs text-muted-foreground">Chargement des détails...</div>
      ) : campaign ? (
        <div className="space-y-4 py-2">
          {/* Status and Type Badges */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              {statusConfig && (
                <Badge variant="outline" className={statusConfig.className}>
                  {statusConfig.label}
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {mediaTypeLabels[campaign.type] || campaign.type}
              </Badge>
            </div>
            {isLoading && (
              <span className="text-[11px] text-muted-foreground italic animate-pulse">Actualisation...</span>
            )}
          </div>

          {/* Media Preview */}
          <div className="rounded-lg overflow-hidden border border-border bg-background/50 flex items-center justify-center p-2 min-h-[140px] max-h-[220px]">
            {campaign.type === "image" && mediaUrl ? (
              <img
                src={mediaUrl}
                alt={campaign.libelle}
                className="max-h-[200px] w-auto object-contain rounded"
              />
            ) : campaign.type === "audio" && mediaUrl ? (
              <div className="w-full p-4 flex flex-col items-center gap-2">
                <Volume2 className="h-8 w-8 text-accent mb-2" />
                <audio src={mediaUrl} controls className="w-full" />
              </div>
            ) : campaign.type === "video" && mediaUrl ? (
              <video src={mediaUrl} controls className="w-full max-h-[200px] object-contain rounded" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground p-4">
                {campaign.type === "image" ? (
                  <ImageIcon className="h-10 w-10 opacity-40" />
                ) : campaign.type === "audio" ? (
                  <Volume2 className="h-10 w-10 opacity-40" />
                ) : (
                  <FileVideo className="h-10 w-10 opacity-40" />
                )}
                {campaign.filename && (
                  <span className="font-mono text-xs text-muted-foreground">{campaign.filename}</span>
                )}
              </div>
            )}
          </div>

          {/* Information List */}
          <div className="space-y-2.5 text-xs bg-muted/20 p-3 rounded-lg border border-border/30">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date de début :</span>
              <span className="font-medium text-foreground">
                {new Date(campaign.date_debut).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date de fin :</span>
              <span className="font-medium text-foreground">
                {new Date(campaign.date_fin).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cible client :</span>
              <span className="font-semibold text-accent uppercase">
                {targetLabels[campaign.cible] || campaign.cible}
              </span>
            </div>
            {campaign.cible !== "tous" && campaign.cible_ids && campaign.cible_ids.length > 0 && (
              <div className="flex justify-between gap-2 border-t border-border/20 pt-2">
                <span className="text-muted-foreground shrink-0">Critères cibles :</span>
                <span className="font-medium text-foreground text-right max-w-[240px]">
                  {campaign.cible === "agences"
                    ? campaign.cible_ids.map((id) => agencesList.find((a) => a.id === id)?.name || id).join(", ")
                    : campaign.cible === "tranche_age" && campaign.cible_ids.length === 2
                      ? `${campaign.cible_ids[0]} à ${campaign.cible_ids[1]} ans`
                      : campaign.cible === "type_client"
                        ? campaign.cible_ids.map((id) => formatClientTypeLabel(id)).join(", ")
                        : campaign.cible_ids.join(", ")}
                </span>
              </div>
            )}
            {campaign.filename && (
              <div className="flex justify-between border-t border-border/20 pt-2">
                <span className="text-muted-foreground">Fichier média :</span>
                <span
                  className="font-mono text-[11px] text-muted-foreground truncate max-w-[200px]"
                  title={campaign.filename}
                >
                  {campaign.filename}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Description :</span>
            <p className="p-3 rounded-lg bg-background border border-border/40 text-foreground whitespace-pre-wrap leading-relaxed">
              {campaign.description?.trim() ? (
                campaign.description
              ) : (
                <span className="italic text-muted-foreground">Aucune description fournie</span>
              )}
            </p>
          </div>

          {/* Actions footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30">
            {onShowHistory && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  onOpenChange(false);
                  onShowHistory(campaign);
                }}
              >
                <History className="h-3.5 w-3.5 mr-1.5" /> Historique
              </Button>
            )}
            {onOpenEdit && (
              <Button
                size="sm"
                className="gradient-accent text-accent-foreground text-xs"
                onClick={() => {
                  onOpenChange(false);
                  onOpenEdit(campaign);
                }}
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Modifier
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </DetailDialog>
  );
};

export default CampaignDetailDialog;
