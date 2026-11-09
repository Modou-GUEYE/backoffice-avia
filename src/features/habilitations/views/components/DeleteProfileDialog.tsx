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
import { HabilitationMatrixRowResponse } from "../../models/types";
import LoadingOverlay from "@/shared/components/LoadingOverlay";

interface DeleteProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileToDelete: HabilitationMatrixRowResponse | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteProfileDialog: React.FC<DeleteProfileDialogProps> = ({
  open,
  onOpenChange,
  profileToDelete,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {isDeleting && (
          <LoadingOverlay
            title="Suppression du profil"
            description="Veuillez patienter pendant la suppression du profil..."
          />
        )}
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> Supprimer le profil d'habilitation
          </DialogTitle>
        </DialogHeader>
        <div className="py-3 space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Êtes-vous sûr de vouloir supprimer définitivement le profil{" "}
            <strong className="text-foreground">
              {profileToDelete?.profile.name || ""}
            </strong>{" "}
            ({profileToDelete?.profile.code}) ?
          </p>
          <p className="text-xs text-destructive/80 font-medium">
            Cette action supprimera le profil de la matrice et le désynchronisera de Keycloak.
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
            Supprimer le profil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteProfileDialog;
