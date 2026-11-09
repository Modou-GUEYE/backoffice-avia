import React from "react";
import { Plus, Pencil, Tag, Trash2, Download, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ServiceResponse } from "../../models/types";
import { downloadContractDefinition } from "../../services/contractsService";
import { toast } from "sonner";

interface ServicesTabProps {
  services: ServiceResponse[];
  onAdd: () => void;
  onEdit: (srv: ServiceResponse) => void;
  onDetail?: (srv: ServiceResponse) => void;
  onToggleStatus: (srv: ServiceResponse) => void;
  onManageVersions?: (srv: ServiceResponse) => void;
  canManageVersions?: boolean;
  onDelete?: (idOrCode: string) => void;
  onConfigureFlows?: (srv: ServiceResponse) => void;
  hasPerm?: (perm: string) => boolean;
  isTechnicalProfile?: boolean;
}

export const ServicesTab: React.FC<ServicesTabProps> = ({
  services,
  onAdd,
  onEdit,
  onDetail,
  onToggleStatus,
  onManageVersions,
  canManageVersions,
  onDelete,
  onConfigureFlows,
  isTechnicalProfile,
}) => {
  const handleDownload = async (srv: ServiceResponse, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const format = srv.source_format === "json" ? "json" : "yaml";
      await downloadContractDefinition(srv.id, format);
      toast.success(`Définition du contrat ${srv.code || srv.label} téléchargée`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du téléchargement");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground">
            {isTechnicalProfile ? "Contrats de Services" : "Services Paramétrés"}
          </h3>
          <p className="text-muted-foreground text-xs">
            {isTechnicalProfile
              ? "Gestion des contrats de services financiers."
              : "Consultation des services disponibles dans le catalogue."}
          </p>
        </div>
        {isTechnicalProfile && (
          <Button
            onClick={onAdd}
            className="gradient-accent text-accent-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" /> Nouveau Contrat
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((srv) => (
          <div
            key={srv.id}
            onClick={() => onDetail && onDetail(srv)}
            role={onDetail ? "button" : undefined}
            tabIndex={onDetail ? 0 : undefined}
            onKeyDown={
              onDetail
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onDetail(srv);
                    }
                  }
                : undefined
            }
            className={`glass-card rounded-xl p-5 flex flex-col justify-between border border-border/40 bg-background/40 hover:bg-background/60 transition-all duration-300 group ${
              onDetail ? "cursor-pointer hover:border-accent/40 hover:shadow-md" : ""
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className="font-mono text-xs text-accent">
                    {srv.service_type || srv.code}
                  </Badge>
                </div>
                {isTechnicalProfile ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={srv.status === "active"}
                      onCheckedChange={() => onToggleStatus(srv)}
                      title={srv.status === "active" ? "Désactiver le contrat" : "Activer le contrat"}
                    />
                  </div>
                ) : (
                  <Badge
                    variant="outline"
                    className={
                      srv.status === "active"
                        ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[11px]"
                        : "bg-muted text-muted-foreground border-border text-[11px]"
                    }
                  >
                    {srv.status === "active" ? "Actif" : "Inactif"}
                  </Badge>
                )}
              </div>

              <div>
                <h4 className="font-bold text-foreground text-sm">{srv.label}</h4>
                <p className="text-muted-foreground text-xs leading-relaxed min-h-[32px] mt-0.5 line-clamp-2">
                  {srv.description || "Aucune description fournie."}
                </p>
              </div>
            </div>

            {(srv.is_contract || (onManageVersions && canManageVersions) || isTechnicalProfile) ? (
              <div className="flex items-center justify-between gap-1 mt-3 pt-3 border-t border-border/30">
                <div className="flex items-center gap-1">
                  {srv.is_contract && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-accent hover:text-accent hover:bg-accent/15 px-2 gap-1 font-medium transition-colors"
                      onClick={(e) => handleDownload(srv, e)}
                      title="Télécharger le fichier de contrat (.yaml/.json)"
                    >
                      <Download className="h-3.5 w-3.5" /> Exporter
                    </Button>
                  )}

                  {onManageVersions && canManageVersions && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-accent hover:text-accent hover:bg-accent/15 px-2 gap-1 font-medium transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onManageVersions(srv);
                      }}
                      title="Gérer les versions de service"
                    >
                      <Tag className="h-3.5 w-3.5" /> Versions
                    </Button>
                  )}
                </div>

                {isTechnicalProfile && (
                  <div className="flex items-center gap-1 ml-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(srv);
                      }}
                      title="Modifier le contrat"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(srv.id);
                        }}
                        title="Supprimer le contrat"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-1 mt-3 pt-3 border-t border-border/30">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-accent hover:text-accent hover:bg-accent/15 px-2 gap-1.5 font-medium transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onConfigureFlows) {
                      onConfigureFlows(srv);
                    } else if (onDetail) {
                      onDetail(srv);
                    }
                  }}
                  title="Configurer les flux de paiement (moyens source et destinataire)"
                >
                  <Coins className="h-3.5 w-3.5" /> Flux de paiement
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServicesTab;
