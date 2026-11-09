import { Trash2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { useConnectivite } from "../../viewmodels/useConnectivite";

type ConnectiviteVm = ReturnType<typeof useConnectivite>;

interface DeleteOperationDialogProps {
  vm: ConnectiviteVm;
}

export const DeleteOperationDialog = ({ vm }: DeleteOperationDialogProps) => {
  return (
    <Dialog open={!!vm.operationToDelete} onOpenChange={(open) => !open && vm.setOperationToDelete(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> Supprimer l'opération du catalogue
          </DialogTitle>
        </DialogHeader>
        <div className="py-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Êtes-vous sûr de vouloir retirer définitivement l'opération{" "}
            <strong className="text-foreground">{vm.operationToDelete?.label || vm.operationToDelete?.code || ""}</strong>{" "}
            du catalogue global ?
          </p>
          <p className="text-[10px] text-destructive/80 font-medium mt-2 leading-relaxed bg-destructive/5 p-2.5 rounded-lg border border-destructive/20">
            ⚠️ Attention : Cette action supprimera également tous les mappages d'endpoints associés à cette opération pour toutes les structures raccordées.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" disabled={vm.isDeletingOperation} onClick={() => vm.setOperationToDelete(null)} className="text-xs">Annuler</Button>
          <Button variant="destructive" size="sm" disabled={vm.isDeletingOperation} onClick={vm.handleDeleteOperation} className="text-xs flex items-center gap-1.5">
            {vm.isDeletingOperation && <Loader2 className="h-3 w-3 animate-spin" />}
            Retirer du catalogue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
