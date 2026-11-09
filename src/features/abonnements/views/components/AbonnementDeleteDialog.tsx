import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface AbonnementDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLoading: boolean;
  onConfirm: () => void | Promise<void>;
}

export const AbonnementDeleteDialog: React.FC<AbonnementDeleteDialogProps> = ({
  open,
  onOpenChange,
  actionLoading,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive font-bold">
            <AlertCircle className="h-5 w-5" /> Confirmer la suppression
          </DialogTitle>
        </DialogHeader>
        <div className="py-3 text-sm text-muted-foreground">
          Voulez-vous vraiment supprimer cet abonnement ? Cette action est irréversible.
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={actionLoading}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={actionLoading}
          >
            {actionLoading ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
