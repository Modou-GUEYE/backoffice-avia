import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PieChart } from "lucide-react";
import { useCommissions } from "../../viewmodels/useCommissions";
import { CommissionFormFields } from "./CommissionFormFields";

interface CommissionDialogProps {
  vm: ReturnType<typeof useCommissions>;
}

export const CommissionDialog: React.FC<CommissionDialogProps> = ({ vm }) => {
  const isEditing = !!vm.editingItem;
  return (
    <Dialog open={vm.isFormOpen} onOpenChange={vm.setIsFormOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-accent/15 text-accent border border-accent/25">
              <PieChart className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                {isEditing ? "Modifier la répartition de commission" : "Nouvelle répartition de commission"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEditing
                  ? "Ajustez les quotes-parts de commission selon les règles de ventilation (somme des 4 taux = 100%)."
                  : "Définissez le périmètre et la ventilation des 4 quotes-parts de commission devant sommer à 100%."}
              </p>
            </div>
          </div>
        </DialogHeader>

        <CommissionFormFields vm={vm} />

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => vm.setIsFormOpen(false)}
            disabled={vm.isSaving}
          >
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={vm.handleSave}
            disabled={vm.isSaving}
            className="gradient-accent text-accent-foreground"
          >
            {vm.isSaving ? "Enregistrement..." : isEditing ? "Enregistrer les modifications" : "Créer la répartition"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
