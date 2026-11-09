import { PaymentMethodResponse } from "../../models/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Eye, Pencil, Trash2 } from "lucide-react";

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethodResponse;
  onToggleStatus: (checked: boolean) => void;
  onOpenDetail: () => void;
  onOpenEdit: () => void;
  onRemove: () => void;
  canUpdate: boolean;
  canDelete: boolean;
  canToggleStatus: boolean;
  canRead?: boolean;
}

export const PaymentMethodCard = ({
  paymentMethod,
  onToggleStatus,
  onOpenDetail,
  onOpenEdit,
  onRemove,
  canUpdate,
  canDelete,
  canToggleStatus,
  canRead = true,
}: PaymentMethodCardProps) => {
  const hasAnyAction = canRead || canUpdate || canDelete;

  return (
    <div className="glass-card rounded-xl p-5 flex flex-col justify-between border border-border/40 bg-background/40 hover:bg-background/60 transition-all duration-300">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={paymentMethod.logo_url ?? undefined}
              alt={paymentMethod.label}
              className="h-9 w-9 rounded-lg border border-border/40 bg-background object-cover shrink-0 shadow-2xs"
            />
            <Badge variant="outline" className="font-mono text-xs text-accent">
              {paymentMethod.kind ?? "—"}
            </Badge>
          </div>
          {canToggleStatus ? (
            <Switch
              checked={paymentMethod.status === "active"}
              onCheckedChange={onToggleStatus}
            />
          ) : (
            <Badge
              variant="outline"
              className={
                paymentMethod.status === "active"
                  ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[11px]"
                  : "bg-muted text-muted-foreground border-border text-[11px]"
              }
            >
              {paymentMethod.status === "active" ? "Actif" : "Inactif"}
            </Badge>
          )}
        </div>
        <div>
          <h4 className="font-bold text-foreground text-sm">{paymentMethod.label}</h4>
          <p className="text-muted-foreground text-xs leading-relaxed min-h-[32px] mt-0.5">
            {paymentMethod.description || "Aucune description fournie."}
          </p>
        </div>
      </div>
      {hasAnyAction && (
        <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-border/30">
          {canRead && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onOpenDetail}
              title="Détails"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {canUpdate && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onOpenEdit}
              title="Modifier"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive/80"
              onClick={onRemove}
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentMethodCard;
