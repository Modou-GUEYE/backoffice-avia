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
import { Loader2 } from "lucide-react";
import { useIntegrations } from "../../viewmodels/useIntegrations";

interface IntegrationConfirmationDialogsProps {
  integrationsVm: ReturnType<typeof useIntegrations>;
}

export const IntegrationConfirmationDialogs: React.FC<IntegrationConfirmationDialogsProps> = ({
  integrationsVm,
}) => {
  return (
    <>
      {/* Integration Deletion Confirmation Dialog */}
      <Dialog
        open={integrationsVm.integrationToDelete !== null}
        onOpenChange={(open) => !open && integrationsVm.setIntegrationToDelete(null)}
      >
        <DialogContent className="sm:max-w-md bg-background border border-border/50 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cette action est irréversible et supprimera également toutes les opérations associées à cette intégration.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs text-muted-foreground leading-relaxed">
            Êtes-vous sûr de vouloir supprimer définitivement cette intégration ?
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => integrationsVm.setIntegrationToDelete(null)}
              className="text-xs h-9"
            >
              Annuler
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs h-9"
              disabled={integrationsVm.isDeleting}
              onClick={() => void integrationsVm.handleConfirmDeleteIntegration()}
            >
              {integrationsVm.isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : null}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Operation Deletion Confirmation Dialog */}
      <Dialog
        open={integrationsVm.operationToDelete !== null}
        onOpenChange={(open) => !open && integrationsVm.setOperationToDelete(null)}
      >
        <DialogContent className="sm:max-w-md bg-background border border-border/50 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cette action retirera cette opération d'intégration technique.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs text-muted-foreground leading-relaxed">
            Êtes-vous sûr de vouloir supprimer cette opération ?
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => integrationsVm.setOperationToDelete(null)}
              className="text-xs h-9"
            >
              Annuler
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs h-9"
              disabled={integrationsVm.isDeleting}
              onClick={() => void integrationsVm.handleConfirmDeleteOperation()}
            >
              {integrationsVm.isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : null}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
