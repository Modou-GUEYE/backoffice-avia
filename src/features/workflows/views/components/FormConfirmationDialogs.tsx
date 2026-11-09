import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useForms } from "../../viewmodels/useForms";

interface FormConfirmationDialogsProps {
  formsVm: ReturnType<typeof useForms>;
}

export const FormConfirmationDialogs: React.FC<FormConfirmationDialogsProps> = ({ formsVm }) => {
  return (
    <>
      {/* Form Deletion Confirmation Dialog */}
      <Dialog open={formsVm.formToDelete !== null} onOpenChange={(open) => !open && formsVm.setFormToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-background border border-border/50 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cette action est irréversible et supprimera également tous les champs associés à ce formulaire.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs text-muted-foreground leading-relaxed">
            Êtes-vous sûr de vouloir supprimer définitivement ce formulaire ?
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => formsVm.setFormToDelete(null)} className="text-xs h-9">
              Annuler
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs h-9"
              onClick={() => void formsVm.handleConfirmDeleteForm()}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Field Deletion Confirmation Dialog */}
      <Dialog open={formsVm.fieldToDelete !== null} onOpenChange={(open) => !open && formsVm.setFieldToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-background border border-border/50 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Confirmer le retrait
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cette action retirera ce champ technique du formulaire.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs text-muted-foreground leading-relaxed">
            Êtes-vous sûr de vouloir retirer ce champ du formulaire ?
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => formsVm.setFieldToDelete(null)} className="text-xs h-9">
              Annuler
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs h-9"
              onClick={() => void formsVm.handleConfirmDeleteField()}
            >
              Retirer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
