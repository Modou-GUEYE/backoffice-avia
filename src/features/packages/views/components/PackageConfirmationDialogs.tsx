import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PackageResponse } from "../../models/types";
import LoadingOverlay from "@/shared/components/LoadingOverlay";

interface PackageConfirmationDialogsProps {
  packageToDelete: PackageResponse | null;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  isDeleting?: boolean;
  packageToArchive?: PackageResponse | null;
  onCancelArchive?: () => void;
  onConfirmArchive?: () => void;
  isArchiving?: boolean;
  packageToggleConfirmation: { pkg: PackageResponse; activate: boolean } | null;
  onCancelToggle: () => void;
  onConfirmToggle: () => void;
}

export const PackageConfirmationDialogs: React.FC<PackageConfirmationDialogsProps> = ({
  packageToDelete,
  onCancelDelete,
  onConfirmDelete,
  isDeleting = false,
  packageToArchive = null,
  onCancelArchive,
  onConfirmArchive,
  isArchiving = false,
  packageToggleConfirmation,
  onCancelToggle,
  onConfirmToggle,
}) => {
  return (
    <>
      {/* Package Delete Confirmation Dialog */}
      <Dialog open={packageToDelete !== null} onOpenChange={(open) => !open && !isDeleting && onCancelDelete()}>
        <DialogContent className="sm:max-w-md overflow-hidden">
          {isDeleting && (
            <LoadingOverlay
              title="Suppression du package"
              description="Veuillez patienter pendant la suppression du package..."
            />
          )}
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground leading-relaxed">
            Voulez-vous vraiment supprimer le package{" "}
            <span className="font-semibold text-foreground">{packageToDelete?.label}</span> ?
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onCancelDelete} disabled={isDeleting}>
              Non
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={onConfirmDelete}
              disabled={isDeleting}
            >
              Oui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Package Archive Confirmation Dialog */}
      <Dialog
        open={packageToArchive !== null}
        onOpenChange={(open) => !open && !isArchiving && onCancelArchive && onCancelArchive()}
      >
        <DialogContent className="sm:max-w-md overflow-hidden">
          {isArchiving && (
            <LoadingOverlay
              title="Archivage du package"
              description="Veuillez patienter pendant l'archivage du package..."
            />
          )}
          <DialogHeader>
            <DialogTitle>Confirmer l'archivage</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground leading-relaxed">
            {packageToArchive?.status === "archived" ? (
              <span>
                Le package{" "}
                <span className="font-semibold text-foreground">{packageToArchive?.label}</span> est
                déjà archivé.
              </span>
            ) : packageToArchive?.status === "active" ? (
              <span className="text-amber-500">
                Le package{" "}
                <span className="font-semibold text-foreground">{packageToArchive?.label}</span> est
                actuellement actif. Veuillez d'abord le désactiver avant de pouvoir l'archiver.
              </span>
            ) : (
              <span>
                Voulez-vous vraiment archiver le package{" "}
                <span className="font-semibold text-foreground">{packageToArchive?.label}</span> ?
              </span>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={onCancelArchive}
              disabled={isArchiving}
            >
              {packageToArchive?.status === "active" || packageToArchive?.status === "archived"
                ? "Fermer"
                : "Non"}
            </Button>
            {packageToArchive?.status !== "active" && packageToArchive?.status !== "archived" && (
              <Button
                className="gradient-accent text-accent-foreground"
                onClick={onConfirmArchive}
                disabled={isArchiving}
              >
                Oui
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Package Toggle Status Confirmation Dialog */}
      <Dialog
        open={packageToggleConfirmation !== null}
        onOpenChange={(open) => !open && onCancelToggle()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer l'action</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground leading-relaxed">
            Voulez-vous vraiment {packageToggleConfirmation?.activate ? "activer" : "désactiver"} le package{" "}
            <span className="font-semibold text-foreground">
              {packageToggleConfirmation?.pkg.label}
            </span>{" "}
            ?
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onCancelToggle}>
              Non
            </Button>
            <Button
              className="gradient-accent text-accent-foreground"
              onClick={onConfirmToggle}
            >
              Oui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PackageConfirmationDialogs;
