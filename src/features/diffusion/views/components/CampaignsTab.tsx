import { useState } from "react";
import {
  CampaignOut,
  CampaignStatus,
  MediaType,
  targetLabels,
  statusLabels,
  resolveCampaignMediaUrl,
} from "../../models/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Volume2,
  FileVideo,
  History,
  Ban,
  Play,
  Eye,
  Maximize2,
  Calendar,
  Users,
} from "lucide-react";

import { useDiffusion } from "../../viewmodels/useDiffusion";
import { CampaignDialog } from "./CampaignDialog";
import { CampaignDetailDialog } from "./CampaignDetailDialog";
import { CampaignHistoryDialog } from "./CampaignHistoryDialog";

interface CampaignsTabProps {
  vm: ReturnType<typeof useDiffusion>;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

const CampaignMediaThumb = ({ campaign }: { campaign: CampaignOut }) => {
  const url = campaign.media_url ?? resolveCampaignMediaUrl(campaign);

  if (campaign.type === "image" && url) {
    return (
      <img
        src={url}
        alt={campaign.libelle}
        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
    );
  }

  if (campaign.type === "video") {
    if (url) {
      return (
        <div className="relative h-full w-full bg-black/40 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
          <video
            src={url}
            className="h-full w-full object-cover pointer-events-none"
            muted
            playsInline
            preload="metadata"
          />
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white border border-white/30 shadow-md">
              <Play className="h-3.5 w-3.5 fill-white ml-0.5" />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
        <FileVideo className="h-8 w-8 text-accent/80" />
        <span className="text-[10px] font-mono">Vidéo</span>
      </div>
    );
  }

  if (campaign.type === "audio") {
    return (
      <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
        <Volume2 className="h-8 w-8 text-accent/80" />
        <span className="text-[10px] font-mono">Audio</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
      <ImageIcon className="h-8 w-8 text-muted-foreground/60" />
      <span className="text-[10px]">Média</span>
    </div>
  );
};

export const CampaignsTab = ({
  vm,
  canCreate,
  canUpdate,
  canDelete,
}: CampaignsTabProps) => {
  const {
    campaigns,
    isLoadingCampaigns: isLoading,
    filterStatus,
    setFilterStatus,
    filterType,
    setFilterType,
    openAddCampaign: onOpenAdd,
    openEditCampaign: onOpenEdit,
    openCampaignDetails: onOpenDetails,
    showCampaignHistory: onShowHistory,
    handleSuspendCampaign: onSuspend,
    removeCampaign: onDelete,
    dialogCampaignOpen,
    setDialogCampaignOpen,
    campaignError,
    editingCampaign,
    campaignForm,
    setCampaignForm,
    mediaTypes,
    targets,
    clientTypes,
    agencesList,
    structuresList,
    isSavingCampaign,
    saveCampaignAction,
    dialogCampaignDetailOpen,
    setDialogCampaignDetailOpen,
    isLoadingCampaignDetail,
    campaignDetail,
    dialogHistoryOpen,
    setDialogHistoryOpen,
    isLoadingHistory,
    selectedCampaignForHistory,
    campaignHistory,
  } = vm;
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [campaignToSuspend, setCampaignToSuspend] = useState<string | null>(null);
  const [campaignMediaToPreview, setCampaignMediaToPreview] = useState<CampaignOut | null>(null);

  const previewMediaUrl = campaignMediaToPreview
    ? campaignMediaToPreview.media_url ?? resolveCampaignMediaUrl(campaignMediaToPreview)
    : null;

  return (
    <div className="space-y-6 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground">Campagnes de Publicité & d'Informations</h3>
          <p className="text-muted-foreground text-xs">
            Planifiez et diffusez des messages multimédias (images, audios, vidéos) vers vos cibles clients.
          </p>
        </div>
        {canCreate && (
          <Button onClick={onOpenAdd} className="gradient-accent text-accent-foreground hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" /> Nouvelle Publicité
          </Button>
        )}
      </div>

      {/* Filters Row */}
      <div className="glass-card rounded-xl p-4 flex flex-col sm:flex-row gap-3 bg-background/30 border border-border/40">
        <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val as CampaignStatus | "all")}>
          <SelectTrigger className="w-full sm:w-[220px] text-xs">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Tous les statuts</SelectItem>
            <SelectItem value="pas_encore_diffusee" className="text-xs">Pas encore diffusée</SelectItem>
            <SelectItem value="en_cours" className="text-xs">En cours</SelectItem>
            <SelectItem value="deja_diffusee" className="text-xs">Déjà diffusée</SelectItem>
            <SelectItem value="suspendue" className="text-xs">Suspendue</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={(val) => setFilterType(val as MediaType | "all")}>
          <SelectTrigger className="w-full sm:w-[200px] text-xs">
            <SelectValue placeholder="Filtrer par média" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Tous les médias</SelectItem>
            <SelectItem value="image" className="text-xs">Images</SelectItem>
            <SelectItem value="audio" className="text-xs">Audios</SelectItem>
            <SelectItem value="video" className="text-xs">Vidéos</SelectItem>
          </SelectContent>
        </Select>

        {(filterStatus !== "all" || filterType !== "all") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFilterStatus("all");
              setFilterType("all");
            }}
            className="self-start sm:self-auto text-xs"
          >
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Campaigns Card Grid */}
      {isLoading ? (
        <p className="text-center py-10 text-muted-foreground text-xs">Chargement des campagnes...</p>
      ) : campaigns.length === 0 ? (
        <div className="glass-card rounded-xl p-10 text-center text-muted-foreground text-xs border border-border/40">
          Aucune campagne publicitaire trouvée.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((camp) => {
            const statusConfig = statusLabels[camp.status] || {
              label: camp.status,
              className: "bg-muted text-muted-foreground",
            };

            return (
              <div
                key={camp.id}
                className="glass-card rounded-xl border border-border/40 bg-card/60 hover:bg-card/90 hover:border-accent/30 transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-sm"
              >
                <div>
                  {/* Media Thumbnail Header - Click to enlarge / play */}
                  <div
                    onClick={() => setCampaignMediaToPreview(camp)}
                    className="relative h-28 w-full bg-muted/30 border-b border-border/30 overflow-hidden cursor-pointer group flex items-center justify-center select-none"
                    title="Cliquer pour afficher / lire le média"
                  >
                    <CampaignMediaThumb campaign={camp} />

                    {/* Badges on Thumbnail */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-background/80 backdrop-blur-md border border-border/40 text-foreground flex items-center gap-1 shadow-2xs">
                        {camp.type === "image" ? (
                          <ImageIcon className="h-3 w-3 text-accent" />
                        ) : camp.type === "audio" ? (
                          <Volume2 className="h-3 w-3 text-accent" />
                        ) : (
                          <FileVideo className="h-3 w-3 text-accent" />
                        )}
                        {camp.type === "image" ? "Image" : camp.type === "audio" ? "Audio" : "Vidéo"}
                      </span>
                    </div>

                    <div className="absolute top-2 right-2 z-10 scale-90 origin-top-right">
                      <Badge variant="outline" className={statusConfig.className}>
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-medium backdrop-blur-[1px]">
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span>Agrandir / Lire</span>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-3.5 space-y-2">
                    <div>
                      <h4 className="font-bold text-foreground text-sm truncate" title={camp.libelle}>
                        {camp.libelle}
                      </h4>
                    </div>

                    <div className="space-y-1.5 pt-1 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-accent shrink-0" />
                        <span className="truncate">
                          {new Date(camp.date_debut).toLocaleDateString()} — {new Date(camp.date_fin).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 text-accent shrink-0" />
                        <span className="font-medium text-foreground capitalize truncate">
                          {targetLabels[camp.cible] || camp.cible}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-3.5 py-2 border-t border-border/30 bg-muted/10 flex items-center justify-between gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                    onClick={() => onShowHistory(camp)}
                  >
                    <History className="h-3 w-3" /> Historique
                  </Button>

                  <div className="flex items-center gap-0.5">
                    {canUpdate && camp.status === "en_cours" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                        onClick={() => setCampaignToSuspend(camp.id)}
                        title="Suspendre la diffusion"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canUpdate && (camp.status === "suspendue" || camp.status === "deja_diffusee") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                        onClick={() => onOpenEdit(camp)}
                        title="Relancer la campagne"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => onOpenDetails(camp.id)}
                      title="Détails complets"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => onOpenEdit(camp)}
                        title="Modifier la campagne"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        onClick={() => setCampaignToDelete(camp.id)}
                        title="Supprimer la campagne"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog for Delete Campaign */}
      <AlertDialog open={!!campaignToDelete} onOpenChange={(open) => !open && setCampaignToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette campagne publicitaire ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (campaignToDelete) {
                  onDelete(campaignToDelete);
                  setCampaignToDelete(null);
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for Suspend Campaign */}
      <AlertDialog open={!!campaignToSuspend} onOpenChange={(open) => !open && setCampaignToSuspend(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspendre la diffusion</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir suspendre cette campagne ? Elle ne sera plus affichée aux utilisateurs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (campaignToSuspend) {
                  onSuspend(campaignToSuspend);
                  setCampaignToSuspend(null);
                }
              }}
            >
              Suspendre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Media Preview Lightbox Modal */}
      <Dialog open={!!campaignMediaToPreview} onOpenChange={(open) => !open && setCampaignMediaToPreview(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] p-4 flex flex-col items-center justify-center">
          <DialogHeader className="w-full">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              {campaignMediaToPreview?.libelle}
            </DialogTitle>
          </DialogHeader>
          <div className="w-full flex items-center justify-center rounded-xl bg-black/40 overflow-hidden min-h-[250px] p-2">
            {campaignMediaToPreview?.type === "image" && previewMediaUrl && (
              <img
                src={previewMediaUrl}
                alt={campaignMediaToPreview.libelle}
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
              />
            )}
            {campaignMediaToPreview?.type === "video" && previewMediaUrl && (
              <video src={previewMediaUrl} controls className="max-h-[65vh] w-full rounded-lg shadow-lg">
                Votre navigateur ne supporte pas la lecture de cette vidéo.
              </video>
            )}
            {campaignMediaToPreview?.type === "audio" && previewMediaUrl && (
              <div className="w-full p-8 flex flex-col items-center gap-4 bg-muted/20 rounded-xl">
                <Volume2 className="h-14 w-14 text-accent animate-pulse" />
                <audio src={previewMediaUrl} controls className="w-full">
                  Votre navigateur ne supporte pas la lecture audio.
                </audio>
              </div>
            )}
            {!previewMediaUrl && (
              <p className="text-xs text-muted-foreground italic">Aucune URL média disponible pour cette campagne.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Campaign Create / Edit Modal Dialog */}
      <CampaignDialog
        open={dialogCampaignOpen}
        onOpenChange={setDialogCampaignOpen}
        editingCampaign={editingCampaign}
        form={campaignForm}
        setForm={setCampaignForm}
        mediaTypes={mediaTypes}
        targets={targets}
        clientTypes={clientTypes}
        agencesList={agencesList}
        structuresList={structuresList}
        isSaving={isSavingCampaign}
        errorMessage={campaignError}
        onSave={saveCampaignAction}
        errors={vm.campaignErrors}
        clearError={vm.clearCampaignError}
        onValidate={vm.validateCampaign}
      />

      {/* Campaign Detail Modal Dialog */}
      <CampaignDetailDialog
        open={dialogCampaignDetailOpen}
        onOpenChange={setDialogCampaignDetailOpen}
        isLoading={isLoadingCampaignDetail}
        campaign={campaignDetail}
        agencesList={agencesList}
        clientTypes={clientTypes}
        onShowHistory={onShowHistory}
        onOpenEdit={onOpenEdit}
      />

      {/* Campaign History Modal Dialog */}
      <CampaignHistoryDialog
        open={dialogHistoryOpen}
        onOpenChange={setDialogHistoryOpen}
        isLoading={isLoadingHistory}
        campaign={selectedCampaignForHistory}
        history={campaignHistory}
      />
    </div>
  );
};

export default CampaignsTab;
