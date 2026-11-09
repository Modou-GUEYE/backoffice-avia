import { PaymentMethodResponse } from "../../models/types";
import { Badge } from "@/components/ui/badge";
import DetailDialog from "@/shared/components/DetailDialog";
import { RefreshCw } from "lucide-react";

interface PaymentMethodDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  item: PaymentMethodResponse | null;
}

export const PaymentMethodDetailDialog = ({
  open,
  onOpenChange,
  isLoading,
  item,
}: PaymentMethodDetailDialogProps) => {
  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Détails du moyen de paiement ${item?.code ?? ""}`}
      contentClassName="sm:max-w-xl max-h-[85vh] overflow-y-auto"
    >
      {isLoading && !item ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : item ? (
        <div className="space-y-4 py-2 text-sm">
          {/* Meta Info */}
          <div className="p-3.5 rounded-xl border bg-muted/20 space-y-3">
            <div className="flex items-center gap-3.5 pb-3 border-b border-border/30">
              <img
                src={item.logo_url ?? undefined}
                alt={item.label}
                className="h-12 w-12 rounded-xl border border-border/40 bg-background object-cover shrink-0 shadow-2xs"
              />
              <div>
                <span className="text-xs font-semibold text-foreground block">{item.label}</span>
                <span className="text-[11px] font-mono text-muted-foreground">{item.kind ?? "—"}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Code:</span>
              <Badge variant="outline" className="font-mono text-xs font-bold text-accent">
                {item.code}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Nom / Libellé:</span>
              <span className="font-semibold text-foreground text-xs">{item.label}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Statut:</span>
              <Badge
                className={
                  item.status === "active"
                    ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                    : "bg-muted text-muted-foreground"
                }
                variant="outline"
              >
                {item.status === "active" ? "Actif" : "Inactif"}
              </Badge>
            </div>
            {item.description && (
              <div className="pt-2 border-t border-border/30 text-xs">
                <span className="text-muted-foreground block mb-0.5">Description:</span>
                <p className="text-foreground leading-relaxed italic">{item.description}</p>
              </div>
            )}
          </div>

          {/* Technical Classification */}
          <div className="p-3.5 rounded-xl border bg-card/60 space-y-2.5">
            <p className="font-semibold text-[11px] text-foreground uppercase tracking-wider">Classification technique</p>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px]">Backend</span>
                <div className="mt-1 h-6 flex items-center">
                  <Badge variant="outline" className="font-mono">
                    {item.backend || "CORE_BANKING"}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Type de boucle (Loop)</span>
                <div className="mt-1 h-6 flex items-center">
                  <span className="font-mono font-medium">{item.loop_type || "Non défini"}</span>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Niveau KYC minimum</span>
                <div className="mt-1 h-6 flex items-center">
                  <span className="font-semibold">{item.min_kyc_tier ?? 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Currencies & Capabilities */}
          <div className="p-3.5 rounded-xl border bg-muted/15 space-y-3">
            <p className="font-semibold text-[11px] text-foreground uppercase tracking-wider">Périmètre & Capacités</p>
            <div>
              <span className="text-muted-foreground block text-xs mb-1">Devises supportées:</span>
              {item.currencies && item.currencies.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {item.currencies.map((curr) => (
                    <Badge key={curr} variant="secondary" className="font-mono text-[11px]">
                      {curr}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">Toutes les devises</span>
              )}
            </div>
            <div>
              <span className="text-muted-foreground block text-xs mb-1">Opérations supportées:</span>
              {item.supported_operations && item.supported_operations.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {item.supported_operations.map((op) => (
                    <Badge key={op} variant="outline" className="font-mono text-[11px] bg-background">
                      {op}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">Toutes les opérations</span>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </DetailDialog>
  );
};

export default PaymentMethodDetailDialog;
