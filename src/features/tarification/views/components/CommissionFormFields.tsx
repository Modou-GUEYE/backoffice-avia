import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useCommissions } from "../../viewmodels/useCommissions";
import { TenantLevel, CommissionPhase, CommissionForm } from "../../models/types";
import { CommissionFormField } from "../../models/validation";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";

interface CommissionFormFieldsProps {
  vm: ReturnType<typeof useCommissions>;
}

/**
 * Champs d'une répartition de commission (périmètre, service, phase, taux, motif).
 * Partagés par le dialogue de la Tarification et l'onglet Commission d'un produit.
 */
export const CommissionFormFields: React.FC<CommissionFormFieldsProps> = ({ vm }) => {
  const isTotalValid = vm.totalRate === 100;

  const rateStruct = Math.max(0, parseFloat(vm.formState.rateStructure) || 0);
  const rateTca = Math.max(0, parseFloat(vm.formState.rateTcaStructure) || 0);
  const rateGroup = Math.max(0, parseFloat(vm.formState.rateGroupement) || 0);
  const rateTech = Math.max(0, parseFloat(vm.formState.ratePartenaireTechnique) || 0);
  const errors = vm.formErrors;

  /** Met à jour le formulaire et efface les erreurs des champs modifiés. */
  const updateForm = (patch: Partial<CommissionForm>, ...fields: CommissionFormField[]) => {
    fields.forEach(vm.clearFormError);
    vm.setFormState({ ...vm.formState, ...patch });
  };

  return (
    <div className="space-y-4 py-1">
      {/* Périmètre, Cible, Service, Phase (Toujours modifiables) */}
      <div className="space-y-3 p-3.5 rounded-xl border border-border/60 bg-muted/15">
          <div className={`grid grid-cols-1 ${vm.scope ? "sm:grid-cols-2" : "sm:grid-cols-3"} gap-3`}>
            {!vm.scope && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between h-5">
                <Label className="text-xs font-medium">
                  Niveau d'application <span className="text-destructive">*</span>
                </Label>
              </div>
              <Select
                value={vm.formState.tenantLevel}
                onValueChange={(v) => {
                  const newLevel = v as TenantLevel;
                  const newTenantId =
                    newLevel === "STRUCTURE"
                      ? vm.structures[0]?.id || ""
                      : vm.products[0]?.id || "";
                  updateForm({ tenantLevel: newLevel, tenantId: newTenantId }, "tenantLevel", "tenantId");
                }}
              >
                <SelectTrigger {...invalidFieldProps(errors.tenantLevel, "h-8 text-xs")}>
                  <SelectValue placeholder="Sélectionner un niveau..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRODUCT" className="text-xs">PRODUIT</SelectItem>
                  <SelectItem value="STRUCTURE" className="text-xs">STRUCTURE</SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={errors.tenantLevel} />
            </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between h-5">
                <Label className="text-xs font-medium">
                  Type de service <span className="text-destructive">*</span>
                </Label>
                {vm.isLoadingCatalogServices && (
                  <span className="text-[10px] text-muted-foreground animate-pulse">Chargement...</span>
                )}
              </div>
              <Select
                value={vm.formState.serviceType}
                onValueChange={(v) => updateForm({ serviceType: v }, "serviceType")}
              >
                <SelectTrigger {...invalidFieldProps(errors.serviceType, "h-8 text-xs")}>
                  <SelectValue placeholder="Sélectionner un service..." />
                </SelectTrigger>
                <SelectContent>
                  {vm.catalogServices && vm.catalogServices.length > 0 ? (
                    vm.catalogServices.map((s) => (
                      <SelectItem key={s.id || s.code} value={s.code} className="text-xs">
                        <span className="font-medium">{s.label}</span>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-xs text-muted-foreground text-center">
                      {vm.isLoadingCatalogServices ? "Chargement des services..." : "Aucun service disponible"}
                    </div>
                  )}
                  {vm.formState.serviceType &&
                    vm.catalogServices &&
                    !vm.catalogServices.some((s) => s.code === vm.formState.serviceType) && (
                      <SelectItem value={vm.formState.serviceType} className="text-xs">
                        {vm.formState.serviceType}
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
              <FieldError message={errors.serviceType} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between h-5">
                <Label className="text-xs font-medium">
                  Phase <span className="text-destructive">*</span>
                </Label>
              </div>
              <Select
                value={vm.formState.phase}
                onValueChange={(v) => updateForm({ phase: v as CommissionPhase }, "phase")}
              >
                <SelectTrigger {...invalidFieldProps(errors.phase, "h-8 text-xs")}>
                  <SelectValue placeholder="Sélectionner une phase..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNIQUE" className="text-xs">UNIQUE</SelectItem>
                  <SelectItem value="INITIATION" className="text-xs">INITIATION</SelectItem>
                  <SelectItem value="DENOUEMENT" className="text-xs">DENOUEMENT</SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={errors.phase} />
            </div>
          </div>

          {/* Entité cible : imposée par le périmètre (ex. onglet Commission d'un produit) ou à choisir */}
          {!vm.scope && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between h-5">
              <Label className="text-xs font-medium">
                {vm.formState.tenantLevel === "STRUCTURE" ? "Structure cible" : "Produit cible"}{" "}
                <span className="text-destructive">*</span>
              </Label>
            </div>
            <Select
              value={vm.formState.tenantId}
              onValueChange={(v) => updateForm({ tenantId: v }, "tenantId")}
            >
              <SelectTrigger {...invalidFieldProps(errors.tenantId, "h-8 text-xs")}>
                <SelectValue
                  placeholder={
                    vm.formState.tenantLevel === "STRUCTURE"
                      ? "Sélectionner une structure..."
                      : "Sélectionner un produit..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {vm.formState.tenantLevel === "STRUCTURE"
                  ? vm.structures.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {s.name} {s.code ? `(${s.code})` : ""}
                      </SelectItem>
                    ))
                  : vm.products.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.nom} {p.code ? `(${p.code})` : ""}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.tenantId} />
          </div>
          )}
        </div>

      {/* Grille principale des 4 taux qui somment à 100% */}
      <div className="border border-border/80 rounded-xl p-4 bg-muted/10 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Ventilation des 4 Taux de Commission
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Structure + TCA Structure + Groupement + Partenaire Technique = 100%
            </p>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit ${
              isTotalValid
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-destructive/15 text-destructive border border-destructive/30"
            }`}
          >
            {isTotalValid ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5" />
            )}
            Total : {vm.totalRate}%
          </span>
        </div>

        {/* Barre de répartition visuelle des 4 taux */}
        <div className="h-3.5 w-full bg-muted/60 rounded-full overflow-hidden flex border border-border/40 shadow-inner">
          <div
            style={{ width: `${Math.min(rateStruct, 100)}%` }}
            className="bg-blue-500 transition-all duration-300"
            title={`Structure: ${vm.formState.rateStructure}%`}
          />
          <div
            style={{ width: `${Math.min(rateTca, 100)}%` }}
            className="bg-indigo-500 transition-all duration-300"
            title={`TCA Structure: ${vm.formState.rateTcaStructure}%`}
          />
          <div
            style={{ width: `${Math.min(rateGroup, 100)}%` }}
            className="bg-purple-500 transition-all duration-300"
            title={`Groupement: ${vm.formState.rateGroupement}%`}
          />
          <div
            style={{ width: `${Math.min(rateTech, 100)}%` }}
            className="bg-emerald-500 transition-all duration-300"
            title={`Partenaire Technique: ${vm.formState.ratePartenaireTechnique}%`}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {/* Part Structure */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
              <Label className="text-[11px] font-semibold text-foreground">Part Structure <span className="text-destructive">*</span></Label>
            </div>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="0"
                {...invalidFieldProps(errors.rateStructure, "h-8 text-xs font-mono pr-6")}
                value={vm.formState.rateStructure}
                onChange={(e) => updateForm({ rateStructure: e.target.value }, "rateStructure", "totalRate")}
              />
              <span className="absolute right-2 top-2 text-[10px] text-muted-foreground">%</span>
            </div>
            <FieldError message={errors.rateStructure} />
          </div>

          {/* TCA Structure */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shrink-0" />
              <Label className="text-[11px] font-semibold text-foreground" title="Taxe sur chiffre d'affaires">
                TCA Structure <span className="text-destructive">*</span>
              </Label>
            </div>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="0"
                {...invalidFieldProps(errors.rateTcaStructure, "h-8 text-xs font-mono pr-6")}
                value={vm.formState.rateTcaStructure}
                onChange={(e) => updateForm({ rateTcaStructure: e.target.value }, "rateTcaStructure", "totalRate")}
              />
              <span className="absolute right-2 top-2 text-[10px] text-muted-foreground">%</span>
            </div>
            <FieldError message={errors.rateTcaStructure} />
          </div>

          {/* Part Groupement */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shrink-0" />
              <Label className="text-[11px] font-semibold text-foreground">Part Groupement <span className="text-destructive">*</span></Label>
            </div>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="0"
                {...invalidFieldProps(errors.rateGroupement, "h-8 text-xs font-mono pr-6")}
                value={vm.formState.rateGroupement}
                onChange={(e) => updateForm({ rateGroupement: e.target.value }, "rateGroupement", "totalRate")}
              />
              <span className="absolute right-2 top-2 text-[10px] text-muted-foreground">%</span>
            </div>
            <FieldError message={errors.rateGroupement} />
          </div>

          {/* Partenaire Tech */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
              <Label className="text-[11px] font-semibold text-foreground">Partenaire Tech. <span className="text-destructive">*</span></Label>
            </div>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="0"
                {...invalidFieldProps(errors.ratePartenaireTechnique, "h-8 text-xs font-mono pr-6")}
                value={vm.formState.ratePartenaireTechnique}
                onChange={(e) => updateForm({ ratePartenaireTechnique: e.target.value }, "ratePartenaireTechnique", "totalRate")}
              />
              <span className="absolute right-2 top-2 text-[10px] text-muted-foreground">%</span>
            </div>
            <FieldError message={errors.ratePartenaireTechnique} />
          </div>
        </div>
        <FieldError message={errors.totalRate} />
      </div>

      {/* Section Rétrocession Distributeur Interne */}
      <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
              <Label className="text-xs font-bold text-foreground">
                Quote-Part Distributeur <span className="text-destructive">*</span>
              </Label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Déjà incluse dans la Part Structure.
            </p>
          </div>
          <div className="relative w-full sm:w-36 shrink-0">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="0"
              {...invalidFieldProps(errors.rateDistributeur, "h-8 text-xs font-mono pr-6 bg-background")}
              value={vm.formState.rateDistributeur}
              onChange={(e) => updateForm({ rateDistributeur: e.target.value }, "rateDistributeur")}
            />
            <span className="absolute right-2 top-2 text-[10px] text-muted-foreground">%</span>
          </div>
        </div>
        <FieldError message={errors.rateDistributeur} className="sm:text-right" />
      </div>

      {/* override_reason en français */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Motif de dérogation</Label>
          <span className="text-[10px] text-muted-foreground">Optionnel</span>
        </div>
        <Textarea
          className="text-xs resize-none h-16"
          placeholder="Préciser le motif de dérogation..."
          value={vm.formState.overrideReason}
          onChange={(e) => updateForm({ overrideReason: e.target.value })}
        />
      </div>

      {vm.submitError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{vm.submitError}</span>
        </div>
      )}
    </div>
  );
};

export default CommissionFormFields;
