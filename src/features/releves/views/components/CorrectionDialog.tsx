import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import FormDialog from "@/shared/components/FormDialog";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { BENEFICIAIRES } from "../../models/data";
import type { BeneficiaireType } from "../../models/types";
import type { useReleveDetail } from "../../viewmodels/useReleveDetail";

type CorrectionDialogProps = {
  vm: ReturnType<typeof useReleveDetail>;
};

export const CorrectionDialog = ({ vm }: CorrectionDialogProps) => {
  if (!vm.releve) return null;
  const errors = vm.correctionErrors;
  const form = vm.correctionForm;

  return (
    <FormDialog
      open={vm.correctionOpen}
      onOpenChange={vm.setCorrectionOpen}
      title="Ajouter une correction"
      description="Le relevé figé n'est pas altéré : la régularisation sera imputée sur le relevé du mois suivant (M+1)."
      submitLabel="Enregistrer la correction"
      onSubmit={() => void vm.submitCorrection()}
      loading={vm.actionLoading}
      submitClassName="gradient-accent text-accent-foreground"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="correction-beneficiaire">
            Bénéficiaire <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.beneficiaireType}
            onValueChange={(v) => vm.updateCorrectionField("beneficiaireType", v as BeneficiaireType)}
          >
            <SelectTrigger id="correction-beneficiaire">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BENEFICIAIRES.map((b) => (
                <SelectItem key={b.type} value={b.type}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="correction-montant">
            Montant (FCFA) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="correction-montant"
            inputMode="decimal"
            placeholder="Ex. 1500 ou -30"
            value={form.montant}
            {...invalidFieldProps(errors.montant, "font-mono")}
            onChange={(e) => vm.updateCorrectionField("montant", e.target.value)}
          />
          {errors.montant ? (
            <FieldError message={errors.montant} />
          ) : (
            <p className="text-[11px] text-muted-foreground">Positif : versement complémentaire. Négatif : retenue.</p>
          )}
        </div>
        {form.beneficiaireType === "structure" ? (
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            Bénéficiaire : structure <span className="font-semibold text-foreground">{vm.releve.structure}</span>
          </p>
        ) : (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="correction-beneficiaire-id">
              Identifiant du bénéficiaire <span className="text-destructive">*</span>
            </Label>
            <Input
              id="correction-beneficiaire-id"
              placeholder="Identifiant tel qu'il figure dans les transactions"
              value={form.beneficiaireId}
              {...invalidFieldProps(errors.beneficiaireId)}
              onChange={(e) => vm.updateCorrectionField("beneficiaireId", e.target.value)}
            />
            <FieldError message={errors.beneficiaireId} />
          </div>
        )}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="correction-motif">
            Motif <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="correction-motif"
            className="resize-none h-20"
            placeholder="Ex. Régularisation surtaxe transaction TX-…"
            value={form.motif}
            {...invalidFieldProps(errors.motif)}
            onChange={(e) => vm.updateCorrectionField("motif", e.target.value)}
          />
          <FieldError message={errors.motif} />
        </div>
      </div>
    </FormDialog>
  );
};

export default CorrectionDialog;
