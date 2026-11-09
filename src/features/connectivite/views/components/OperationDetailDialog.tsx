import { Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { useConnectivite } from "../../viewmodels/useConnectivite";

type ConnectiviteVm = ReturnType<typeof useConnectivite>;

interface OperationDetailDialogProps {
  vm: ConnectiviteVm;
}

export const OperationDetailDialog = ({ vm }: OperationDetailDialogProps) => {
  return (
    <Dialog open={!!vm.detailOperation} onOpenChange={(open) => !open && vm.setDetailOperation(null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-accent" /> Détail de l'opération
          </DialogTitle>
        </DialogHeader>
        {vm.isLoadingOperationDetail ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Chargement...</div>
        ) : vm.detailOperation ? (
          <div className="space-y-3 py-3 text-xs">
            {[
              ["Backend", vm.detailOperation.backend],
              ["Code", vm.detailOperation.code],
              ["Libellé", vm.detailOperation.label],
              ["Direction", vm.detailOperation.direction],
              ["Statut", vm.detailOperation.is_active ? "Actif" : "Inactif"],
              ["Idempotente", vm.detailOperation.is_idempotent ? "Oui" : "Non"],
              ["Code compensatoire", vm.detailOperation.compensating_code || "-"],
              ["Identifiant", vm.detailOperation.id],
              ["Créée le", vm.detailOperation.created_at || "-"],
              ["Modifiée le", vm.detailOperation.updated_at || "-"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4 border-b border-border/40 pb-2">
                <span className="font-semibold text-muted-foreground">{label}</span>
                <span className="max-w-[65%] text-right font-mono text-foreground break-words">{value}</span>
              </div>
            ))}
            <div className="space-y-1.5 pt-1">
              <span className="font-semibold text-muted-foreground">Contrat de requête</span>
              <pre className="max-h-40 overflow-auto rounded-lg border border-border/50 bg-muted/30 p-3 text-[10px] text-foreground">
                {JSON.stringify(vm.detailOperation.request_contract || {}, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
