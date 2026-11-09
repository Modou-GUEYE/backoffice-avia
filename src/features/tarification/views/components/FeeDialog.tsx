import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { AlertCircle, Percent, RefreshCw } from "lucide-react";
import { useFees } from "../../viewmodels/useFees";
import { TenantLevel, ServiceType, FeeForm } from "../../models/types";
import { FeeFormField } from "../../models/validation";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";

interface FeeDialogProps {
  vm: ReturnType<typeof useFees>;
}

export const FeeDialog: React.FC<FeeDialogProps> = ({ vm }) => {
  const isEditing = !!vm.editingItem;
  const errors = vm.formErrors;

  /** Met à jour le formulaire et efface les erreurs des champs modifiés. */
  const updateForm = (patch: Partial<FeeForm>, ...fields: FeeFormField[]) => {
    fields.forEach(vm.clearFormError);
    vm.setForm({ ...vm.form, ...patch });
  };

  return (
    <Dialog open={vm.dialogOpen} onOpenChange={vm.setDialogOpen}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/15 text-accent border border-accent/25 shrink-0">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                {isEditing ? "Modifier la règle de frais" : "Nouvelle règle de frais"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEditing
                  ? "Ajustez les bornes de transaction et les frais applicables pour cette tranche."
                  : "Définissez les frais fixes et/ou variables pour un service et un périmètre donné."}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Périmètre & Service (Toujours modifiables) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between h-5">
                    <Label className="text-xs font-medium">
                      Niveau <span className="text-destructive">*</span>
                    </Label>
                  </div>
                  {vm.isStructureAdmin ? (
                    <Select
                      value={vm.form.tenantLevel}
                      onValueChange={(v) => vm.handleFeeLevelChange(v as TenantLevel)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STRUCTURE" className="text-xs">Structure</SelectItem>
                        <SelectItem value="AGENCY" className="text-xs">Agence</SelectItem>
                        <SelectItem value="DISTRIBUTEUR" className="text-xs">Distributeur</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : vm.isDistributorAdmin ? (
                    <Select
                      value={vm.form.tenantLevel}
                      onValueChange={(v) => vm.handleFeeLevelChange(v as TenantLevel)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DISTRIBUTEUR" className="text-xs">Distributeur</SelectItem>
                        <SelectItem value="AGENCY" className="text-xs">Agence</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select
                      value={vm.form.tenantLevel}
                      onValueChange={(v) => vm.handleFeeLevelChange(v as TenantLevel)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GLOBAL" className="text-xs">Global</SelectItem>
                        <SelectItem value="STRUCTURE" className="text-xs">Structure</SelectItem>
                        <SelectItem value="PRODUCT" className="text-xs">Produit</SelectItem>
                        <SelectItem value="DISTRIBUTEUR" className="text-xs">Distributeur</SelectItem>
                        <SelectItem value="AGENCY" className="text-xs">Agence</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

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
                    value={vm.form.serviceType}
                    onValueChange={(v) => updateForm({ serviceType: v as ServiceType }, "serviceType")}
                  >
                    <SelectTrigger {...invalidFieldProps(errors.serviceType, "h-9 text-xs")}>
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
                      {vm.form.serviceType &&
                        vm.catalogServices &&
                        !vm.catalogServices.some((s) => s.code === vm.form.serviceType) && (
                          <SelectItem value={vm.form.serviceType} className="text-xs">
                            {vm.form.serviceType}
                          </SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                  <FieldError message={errors.serviceType} />
                </div>
              </div>

              {/* Entité cible (masquée si GLOBAL) */}
              {vm.form.tenantLevel !== "GLOBAL" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    {vm.form.tenantLevel === "STRUCTURE"
                      ? "Structure cible"
                      : vm.form.tenantLevel === "PRODUCT"
                      ? "Produit cible"
                      : vm.form.tenantLevel === "AGENCY"
                      ? "Agence cible"
                      : "Distributeur cible"}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  {vm.form.tenantLevel === "STRUCTURE" ? (
                    <Select
                      value={vm.form.tenantId}
                      onValueChange={(v) => updateForm({ tenantId: v }, "tenantId")}
                    >
                      <SelectTrigger {...invalidFieldProps(errors.tenantId, "h-9 text-xs")}>
                        <SelectValue placeholder="Choisir une structure..." />
                      </SelectTrigger>
                      <SelectContent>
                        {vm.structures && vm.structures.length > 0 ? (
                          vm.structures.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">
                              {s.name || (s as { nom?: string }).nom || s.id} {s.code ? `(${s.code})` : ""}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-xs text-muted-foreground text-center">
                            Aucune structure disponible
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  ) : vm.form.tenantLevel === "PRODUCT" ? (
                    <Select
                      value={vm.form.tenantId}
                      onValueChange={(v) => updateForm({ tenantId: v }, "tenantId")}
                    >
                      <SelectTrigger {...invalidFieldProps(errors.tenantId, "h-9 text-xs")}>
                        <SelectValue placeholder="Choisir un produit..." />
                      </SelectTrigger>
                      <SelectContent>
                        {vm.produitsOptions && vm.produitsOptions.length > 0 ? (
                          vm.produitsOptions.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">
                              {p.nom || (p as { name?: string }).name || p.id} {p.code ? `(${p.code})` : ""}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-xs text-muted-foreground text-center">
                            Aucun produit disponible
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  ) : vm.form.tenantLevel === "AGENCY" ? (
                    <Select
                      value={vm.form.tenantId}
                      onValueChange={(v) => updateForm({ tenantId: v }, "tenantId")}
                    >
                      <SelectTrigger {...invalidFieldProps(errors.tenantId, "h-9 text-xs")}>
                        <SelectValue placeholder="Choisir une agence..." />
                      </SelectTrigger>
                      <SelectContent>
                        {vm.activeAgencies && vm.activeAgencies.length > 0 ? (
                          vm.activeAgencies.map((a) => (
                            <SelectItem key={a.id} value={a.id} className="text-xs">
                              {a.name || (a as { nom?: string }).nom || a.id} {a.code ? `(${a.code})` : ""}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-xs text-muted-foreground text-center">
                            Aucune agence disponible
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select
                      value={vm.form.tenantId}
                      onValueChange={(v) => updateForm({ tenantId: v }, "tenantId")}
                    >
                      <SelectTrigger {...invalidFieldProps(errors.tenantId, "h-9 text-xs")}>
                        <SelectValue placeholder="Choisir un distributeur..." />
                      </SelectTrigger>
                      <SelectContent>
                        {vm.distributors && vm.distributors.length > 0 ? (
                          vm.distributors.map((d) => (
                            <SelectItem key={d.id} value={d.id} className="text-xs">
                              {d.nom || (d as { name?: string }).name || d.id}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-xs text-muted-foreground text-center">
                            Aucun distributeur disponible
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  <FieldError message={errors.tenantId} />
                </div>
              )}

          {/* Bornes de transaction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Borne minimale (FCFA) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                {...invalidFieldProps(
                  errors.minBound,
                  "h-9 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                )}
                value={vm.form.minBound}
                onChange={(e) => updateForm({ minBound: e.target.value }, "minBound", "maxBound")}
                placeholder="Ex. 0"
              />
              <FieldError message={errors.minBound} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Borne maximale (FCFA) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                {...invalidFieldProps(
                  errors.maxBound,
                  "h-9 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                )}
                value={vm.form.maxBound}
                onChange={(e) => updateForm({ maxBound: e.target.value }, "maxBound")}
                placeholder="Ex. 50000"
              />
              <FieldError message={errors.maxBound} />
            </div>
          </div>

          {/* Frais Fixes et Variables */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Frais fixe (FCFA)
              </Label>
              <Input
                type="number"
                {...invalidFieldProps(
                  errors.fixedFee,
                  "h-9 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                )}
                value={vm.form.fixedFee}
                onChange={(e) => updateForm({ fixedFee: e.target.value }, "fixedFee")}
                placeholder="Ex. 100"
              />
              <FieldError message={errors.fixedFee} />
              <span className="text-[10px] text-muted-foreground">Montant fixe prélevé par transaction</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Frais variable (%)
              </Label>
              <Input
                type="number"
                {...invalidFieldProps(
                  errors.rateFee,
                  "h-9 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                )}
                value={vm.form.rateFee}
                onChange={(e) => updateForm({ rateFee: e.target.value }, "rateFee")}
                placeholder="Ex. 2 %"
              />
              <FieldError message={errors.rateFee} />
              <span className="text-[10px] text-muted-foreground">Pourcentage prélevé sur le montant</span>
            </div>
          </div>

          {/* Raison d'écrasement (optionnel) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Raison / Justification (optionnel)
            </Label>
            <Textarea
              className="text-xs resize-none"
              rows={2}
              value={vm.form.overrideReason}
              onChange={(e) => updateForm({ overrideReason: e.target.value })}
              placeholder="Ex. Tarification préférentielle négociée..."
            />
          </div>

          {vm.submitError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{vm.submitError}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => vm.setDialogOpen(false)} disabled={vm.isSaving}>
            Annuler
          </Button>
          <Button
            onClick={vm.saveFee}
            disabled={vm.isSaving}
            className="gradient-accent text-accent-foreground gap-1.5"
          >
            {vm.isSaving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            {isEditing ? "Enregistrer les modifications" : "Créer la règle de frais"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
