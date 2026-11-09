import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FormDialog from "@/shared/components/FormDialog";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { MOIS_LABELS } from "../../models/data";
import type { useReleves } from "../../viewmodels/useReleves";

type GenerateReleveDialogProps = {
  vm: ReturnType<typeof useReleves>;
  onGenerated: (releveId: string) => void;
};

export const GenerateReleveDialog = ({ vm, onGenerated }: GenerateReleveDialogProps) => {
  const errors = vm.generateErrors;

  return (
    <FormDialog
      open={vm.generateOpen}
      onOpenChange={vm.setGenerateOpen}
      title="Générer un relevé mensuel"
      description="Agrège les transactions validées du mois et applique les corrections reportées. Un relevé en brouillon est recalculé ; un relevé figé ne peut plus l'être."
      submitLabel="Générer"
      onSubmit={async () => {
        const releve = await vm.submitGenerate();
        if (releve?.id) onGenerated(releve.id);
      }}
      loading={vm.generating}
      submitClassName="gradient-accent text-accent-foreground"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="releve-structure">
            Structure <span className="text-destructive">*</span>
          </Label>
          {vm.enforcedStructure ? (
            <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/40 text-sm">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              {vm.enforcedStructureLabel}
            </div>
          ) : (
            <Select value={vm.generateForm.structure} onValueChange={(v) => vm.updateGenerateField("structure", v)}>
              <SelectTrigger id="releve-structure" {...invalidFieldProps(errors.structure)}>
                <SelectValue placeholder="Sélectionner une structure" />
              </SelectTrigger>
              <SelectContent>
                {vm.structureOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <FieldError message={errors.structure} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="releve-mois">
            Mois <span className="text-destructive">*</span>
          </Label>
          <Select value={vm.generateForm.mois} onValueChange={(v) => vm.updateGenerateField("mois", v)}>
            <SelectTrigger id="releve-mois" {...invalidFieldProps(errors.mois)}>
              <SelectValue placeholder="Mois" />
            </SelectTrigger>
            <SelectContent>
              {MOIS_LABELS.map((label, index) => (
                <SelectItem key={label} value={String(index + 1)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.mois} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="releve-annee">
            Année <span className="text-destructive">*</span>
          </Label>
          <Input
            id="releve-annee"
            type="number"
            min={2000}
            max={2100}
            value={vm.generateForm.annee}
            {...invalidFieldProps(errors.annee)}
            onChange={(e) => vm.updateGenerateField("annee", e.target.value)}
          />
          <FieldError message={errors.annee} />
        </div>
      </div>
    </FormDialog>
  );
};

export default GenerateReleveDialog;
