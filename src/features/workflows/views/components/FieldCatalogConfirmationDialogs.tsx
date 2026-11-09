import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useFieldCatalog } from "../../viewmodels/useFieldCatalog";

interface FieldCatalogConfirmationDialogsProps {
  fieldCatalogVm: ReturnType<typeof useFieldCatalog>;
}

export const FieldCatalogConfirmationDialogs: React.FC<FieldCatalogConfirmationDialogsProps> = ({
  fieldCatalogVm,
}) => {
  return (
    <>
      {/* Type Deletion Dialog */}
      <Dialog
        open={fieldCatalogVm.typeToDelete !== null}
        onOpenChange={(open) => !open && fieldCatalogVm.setTypeToDelete(null)}
      >
        <DialogContent className="sm:max-w-md bg-background border border-border/50 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cette action supprimera ce type de champ.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs text-muted-foreground leading-relaxed">
            Êtes-vous sûr de vouloir supprimer définitivement ce type de champ ?
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => fieldCatalogVm.setTypeToDelete(null)}
              className="text-xs h-9"
            >
              Annuler
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs h-9"
              onClick={() => void fieldCatalogVm.handleConfirmDeleteType()}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Definition Deletion Dialog */}
      <Dialog
        open={fieldCatalogVm.definitionToDelete !== null}
        onOpenChange={(open) => !open && fieldCatalogVm.setDefinitionToDelete(null)}
      >
        <DialogContent className="sm:max-w-md bg-background border border-border/50 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cette action retirera cette définition du catalogue.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs text-muted-foreground leading-relaxed">
            Êtes-vous sûr de vouloir supprimer définitivement cette définition de champ ?
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => fieldCatalogVm.setDefinitionToDelete(null)}
              className="text-xs h-9"
            >
              Annuler
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs h-9"
              onClick={() => void fieldCatalogVm.handleConfirmDeleteDefinition()}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
