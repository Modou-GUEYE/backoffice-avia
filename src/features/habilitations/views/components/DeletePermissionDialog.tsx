import React from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PermissionResponse } from "../../models/types";
import LoadingOverlay from "@/shared/components/LoadingOverlay";

interface DeletePermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissionToDelete: PermissionResponse | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeletePermissionDialog: React.FC<DeletePermissionDialogProps> = ({
  open,
  onOpenChange,
  permissionToDelete,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {isDeleting && (
          <LoadingOverlay
            title="Suppression de la permission"
            description="Veuillez patienter pendant la suppression de la permission..."
          />
        )}
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> Supprimer la permission
          </DialogTitle>
        </DialogHeader>
        <div className="py-3 space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Êtes-vous sûr de vouloir supprimer définitivement la permission{" "}
            <strong className="text-foreground">
              {permissionToDelete?.name || ""}
            </strong>{" "}
            ({permissionToDelete?.code}) ?
          </p>
          <p className="text-xs text-destructive/80 font-medium">
            Cette action retirera la permission de la matrice et des rôles Keycloak associés.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            disabled={isDeleting}
            onClick={onCancel}
            className="text-xs"
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            onClick={onConfirm}
            className="text-xs"
          >
            Supprimer la permission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeletePermissionDialog;
