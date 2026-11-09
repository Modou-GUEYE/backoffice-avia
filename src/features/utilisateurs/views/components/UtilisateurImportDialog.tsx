import React from "react";
import ImportUsersDialog from "@/shared/components/ImportUsersDialog";

export interface UtilisateurImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportFile: (file: File) => void;
}

export const UtilisateurImportDialog: React.FC<UtilisateurImportDialogProps> = ({
  open,
  onOpenChange,
  onImportFile,
}) => {
  return (
    <ImportUsersDialog
      open={open}
      onOpenChange={onOpenChange}
      onImportFile={onImportFile}
    />
  );
};
