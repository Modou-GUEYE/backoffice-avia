import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAdministration } from "../../viewmodels/useAdministration";

interface AdministrationConfirmationDialogProps {
  vm: ReturnType<typeof useAdministration>;
}

export const AdministrationConfirmationDialog: React.FC<AdministrationConfirmationDialogProps> = ({
  vm,
}) => {
  return (
    <>
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={vm.administrationToDelete !== null}
        onOpenChange={(open) => !open && vm.setAdministrationToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            Voulez-vous vraiment supprimer l'administration{" "}
            <span className="font-semibold text-foreground">
              {vm.administrationToDelete?.name}
            </span>{" "}
            ? Cette action peut avoir un impact critique sur les produits et structures rattachés.
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => vm.setAdministrationToDelete(null)}
            >
              Annuler
            </Button>
            <Button variant="destructive" onClick={vm.confirmDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Status Confirmation Dialog */}
      <Dialog
        open={vm.administrationToToggle !== null}
        onOpenChange={(open) => !open && vm.setAdministrationToToggle(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer l'action</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            Voulez-vous vraiment{" "}
            {vm.administrationToToggle?.is_active ? "désactiver" : "activer"}{" "}
            l'administration{" "}
            <span className="font-semibold text-foreground">
              {vm.administrationToToggle?.name}
            </span>{" "}
            ?
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => vm.setAdministrationToToggle(null)}
            >
              Annuler
            </Button>
            <Button
              className="gradient-accent text-accent-foreground"
              onClick={vm.confirmToggle}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
