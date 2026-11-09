import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TarificationConfirmationDialogsProps {
  // Fee confirmations
  feeToDelete: string | null;
  onCloseDeleteFee: () => void;
  onConfirmDeleteFee: () => void;

  feeToToggle: { id: string; nextActive: boolean; label: string } | null;
  onCloseToggleFee: () => void;
  onConfirmToggleFee: () => void;

  // Cap confirmations
  capToDelete: string | null;
  onCloseDeleteCap: () => void;
  onConfirmDeleteCap: () => void;

  // Tax confirmations
  taxToDelete: string | null;
  onCloseDeleteTax: () => void;
  onConfirmDeleteTax: () => void;

  taxToToggle: { id: string; nextActive: boolean; label: string } | null;
  onCloseToggleTax: () => void;
  onConfirmToggleTax: () => void;
}

export const TarificationConfirmationDialogs: React.FC<TarificationConfirmationDialogsProps> = ({
  feeToDelete,
  onCloseDeleteFee,
  onConfirmDeleteFee,
  feeToToggle,
  onCloseToggleFee,
  onConfirmToggleFee,
  capToDelete,
  onCloseDeleteCap,
  onConfirmDeleteCap,
  taxToDelete,
  onCloseDeleteTax,
  onConfirmDeleteTax,
  taxToToggle,
  onCloseToggleTax,
  onConfirmToggleTax,
}) => {
  return (
    <>
      {/* Delete Fee Confirmation Dialog */}
      <Dialog open={feeToDelete !== null} onOpenChange={(open) => !open && onCloseDeleteFee()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            Voulez-vous vraiment supprimer cette ligne de grille tarifaire ? Cette action est irréversible.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onCloseDeleteFee}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={onConfirmDeleteFee}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Fee Status Confirmation Dialog */}
      <Dialog open={feeToToggle !== null} onOpenChange={(open) => !open && onCloseToggleFee()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer l'action</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            Voulez-vous vraiment {feeToToggle?.nextActive ? "activer" : "désactiver"} cette ligne de frais {feeToToggle?.label} ?
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onCloseToggleFee}>
              Annuler
            </Button>
            <Button className="gradient-accent text-accent-foreground" onClick={onConfirmToggleFee}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Cap Confirmation Dialog */}
      <Dialog open={capToDelete !== null} onOpenChange={(open) => !open && onCloseDeleteCap()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            Voulez-vous vraiment supprimer ce plafond ? Cette action est irréversible.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onCloseDeleteCap}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={onConfirmDeleteCap}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tax Confirmation Dialog */}
      <Dialog open={taxToDelete !== null} onOpenChange={(open) => !open && onCloseDeleteTax()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            Voulez-vous vraiment supprimer cette taxe ? Cette action est irréversible et conservera un historique logique en cas d'utilisation transactionnelle.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onCloseDeleteTax}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={onConfirmDeleteTax}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Tax Status Confirmation Dialog */}
      <Dialog open={taxToToggle !== null} onOpenChange={(open) => !open && onCloseToggleTax()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer l'action</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            Voulez-vous vraiment {taxToToggle?.nextActive ? "activer" : "désactiver"} la taxe {taxToToggle?.label} ?
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onCloseToggleTax}>
              Annuler
            </Button>
            <Button className="gradient-accent text-accent-foreground" onClick={onConfirmToggleTax}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
