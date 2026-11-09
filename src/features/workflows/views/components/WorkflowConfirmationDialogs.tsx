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
import { useWorkflows } from "../../viewmodels/useWorkflows";

interface WorkflowConfirmationDialogsProps {
  workflowsVm: ReturnType<typeof useWorkflows>;
}

export const WorkflowConfirmationDialogs: React.FC<WorkflowConfirmationDialogsProps> = ({
  workflowsVm,
}) => {
  return (
    <>
      {/* Workflow Deletion Confirmation Dialog */}
      <Dialog
        open={workflowsVm.workflowToDelete !== null}
        onOpenChange={(open) => !open && workflowsVm.setWorkflowToDelete(null)}
      >
        <DialogContent className="sm:max-w-md bg-background border border-border/50 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cette action supprimera définitivement ce workflow et toutes ses étapes rattachées.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs text-muted-foreground leading-relaxed">
            Êtes-vous sûr de vouloir supprimer définitivement ce workflow ?
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => workflowsVm.setWorkflowToDelete(null)}
              className="text-xs h-9"
            >
              Annuler
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs h-9"
              onClick={() => void workflowsVm.handleConfirmDeleteWorkflow()}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step Deletion Confirmation Dialog */}
      <Dialog
        open={workflowsVm.stepToDelete !== null}
        onOpenChange={(open) => !open && workflowsVm.setStepToDelete(null)}
      >
        <DialogContent className="sm:max-w-md bg-background border border-border/50 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Confirmer le retrait
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cette action retirera cette étape du workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs text-muted-foreground leading-relaxed">
            Êtes-vous sûr de vouloir retirer cette étape ?
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => workflowsVm.setStepToDelete(null)}
              className="text-xs h-9"
            >
              Annuler
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs h-9"
              onClick={() => void workflowsVm.handleConfirmDeleteStep()}
            >
              Retirer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
