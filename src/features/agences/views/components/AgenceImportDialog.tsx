import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FormDialog from "@/shared/components/FormDialog";

interface AgenceImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => Promise<void>;
}

export const AgenceImportDialog = ({
  open,
  onOpenChange,
  onSubmit,
}: AgenceImportDialogProps) => {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Import agences & caisses"
      description="L'import est temporairement indisponible tant que l'endpoint backend n'est pas disponible."
      submitLabel="Valider l'import"
      onSubmit={onSubmit}
      submitDisabled={true}
      contentClassName="sm:max-w-lg"
      submitClassName="gradient-accent text-accent-foreground hover:opacity-90"
    >
      <div className="space-y-4">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-sm text-amber-500">
          <p className="font-semibold mb-1">Import désactivé</p>
          <p>Le backend d'import n'est pas encore disponible. Cette action est bloquée temporairement.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="agences-caisses-file-input">
            Fichier d'import <span className="text-destructive">*</span>
          </Label>
          <Input
            id="agences-caisses-file-input"
            type="file"
            accept=".csv,.txt"
            className="cursor-not-allowed opacity-60"
            disabled
          />
        </div>
      </div>
    </FormDialog>
  );
};
