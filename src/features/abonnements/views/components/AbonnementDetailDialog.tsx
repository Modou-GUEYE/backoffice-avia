import React from "react";
import DetailDialog from "@/shared/components/DetailDialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { SubscriptionResponse, ServiceResponse, SubscriptionStatus } from "../../models/types";
import { StructureRead } from "@/features/structures/models/types";

interface AbonnementDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSub: SubscriptionResponse | null;
  detailLoading?: boolean;
  structures: StructureRead[];
  services: ServiceResponse[];
  getStatusBadge: (status: SubscriptionStatus) => React.ReactNode;
  getPeriodicityLabel: (p: string) => string;
  formatDateTime: (dateStr: string | null) => string;
}

export const AbonnementDetailDialog: React.FC<AbonnementDetailDialogProps> = ({
  open,
  onOpenChange,
  selectedSub,
  detailLoading = false,
  structures,
  services,
  getStatusBadge,
  getPeriodicityLabel,
  formatDateTime,
}) => {
  const safeServices = Array.isArray(services) ? services : [];

  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Détails de l'abonnement"
      contentClassName="max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      {selectedSub && (
        <div className="space-y-6 py-2 relative">
          {detailLoading && (
            <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground pb-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Synchronisation...</span>
            </div>
          )}

          {/* Meta Info Grid */}
          <div className="p-4 rounded-xl border bg-muted/20 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div className="flex justify-between border-b border-border/40 pb-2 sm:border-0 sm:pb-0">
              <span className="text-muted-foreground">Libellé :</span>
              <span className="font-semibold text-foreground">{selectedSub.label}</span>
            </div>

            <div className="flex justify-between border-b border-border/40 pb-2 sm:border-0 sm:pb-0">
              <span className="text-muted-foreground">Structure :</span>
              <span className="font-semibold text-foreground">
                {structures.find((s) => s.id === selectedSub.structure_id)?.name || "Non affecté"}
              </span>
            </div>

            <div className="flex justify-between border-b border-border/40 pb-2 sm:border-0 sm:pb-0">
              <span className="text-muted-foreground">Tarif :</span>
              <span className="font-semibold text-foreground">
                {parseFloat(selectedSub.amount).toLocaleString()} F CFA
              </span>
            </div>

            <div className="flex justify-between border-b border-border/40 pb-2 sm:border-0 sm:pb-0">
              <span className="text-muted-foreground">Périodicité :</span>
              <span className="font-semibold text-foreground">
                {getPeriodicityLabel(selectedSub.periodicity)}
              </span>
            </div>

            <div className="flex justify-between border-b border-border/40 pb-2 sm:border-0 sm:pb-0">
              <span className="text-muted-foreground">Expiration :</span>
              <span className="font-semibold text-foreground">
                {selectedSub.expires_at ? formatDateTime(selectedSub.expires_at) : "Illimitée"}
              </span>
            </div>

            <div className="flex justify-between border-b border-border/40 pb-2 sm:border-0 sm:pb-0">
              <span className="text-muted-foreground">Statut :</span>
              <div>{getStatusBadge(selectedSub.status)}</div>
            </div>

            <div className="flex justify-between border-b border-border/40 pb-2 sm:border-0 sm:pb-0">
              <span className="text-muted-foreground">Date de création :</span>
              <span className="text-muted-foreground text-xs">
                {formatDateTime(selectedSub.created_at)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Dernière mise à jour :</span>
              <span className="text-muted-foreground text-xs">
                {formatDateTime(selectedSub.updated_at)}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Description</h4>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {selectedSub.description || (
                <span className="text-muted-foreground italic">Aucune description fournie.</span>
              )}
            </p>
          </div>

          {/* Associated Services */}
          <div className="space-y-3">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">
              Services inclus
            </h4>
            {(selectedSub.service_ids || []).length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Aucun service inclus dans cet abonnement.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(selectedSub.service_ids || []).map((srvId) => {
                  const srv = safeServices.find((s) => s.id === srvId);
                  return (
                    <div
                      key={srvId}
                      className="flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-background/60 hover:bg-muted/20 transition-colors"
                    >
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {srv ? srv.label : srvId}
                        </p>
                        {srv?.code && (
                          <p className="text-xs text-muted-foreground font-mono">
                            {srv.code}
                          </p>
                        )}
                        {srv?.description && (
                          <p className="text-xs text-muted-foreground/80 line-clamp-2 pt-0.5">
                            {srv.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </div>
        </div>
      )}
    </DetailDialog>
  );
};
