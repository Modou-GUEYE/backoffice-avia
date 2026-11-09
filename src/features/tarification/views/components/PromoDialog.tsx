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
import { AlertCircle, Tag } from "lucide-react";
import { usePromos } from "../../viewmodels/usePromos";
import { TenantLevel, ServiceType, PromoForm } from "../../models/types";
import { PromoFormField } from "../../models/validation";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { formatFeeGridLabel } from "./promoFormatters";

interface PromoDialogProps {
  vm: ReturnType<typeof usePromos>;
}

export const PromoDialog: React.FC<PromoDialogProps> = ({ vm }) => {
  const isEditing = !!vm.editingItem;
  const errors = vm.formErrors;

  /** Met à jour le formulaire et efface les erreurs des champs modifiés. */
  const updateForm = (patch: Partial<PromoForm>, ...fields: PromoFormField[]) => {
    fields.forEach(vm.clearFormError);
    vm.setFormState({ ...vm.formState, ...patch });
  };

  return (
    <Dialog open={vm.isFormOpen} onOpenChange={vm.setIsFormOpen}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Tag className="h-5 w-5 text-accent" />
            {isEditing ? "Modifier la promotion" : "Nouvelle promotion"}
          </DialogTitle>
        </DialogHeader>

        {vm.submitError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{vm.submitError}</span>
          </div>
        )}

        <div className="space-y-4 py-2">
          {/* Code Promo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Code promotionnel <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Ex: PROMO_ETE_2026"
              {...invalidFieldProps(errors.code, "h-9 text-xs uppercase font-mono tracking-wider")}
              value={vm.formState.code}
              onChange={(e) => updateForm({ code: e.target.value.toUpperCase() }, "code")}
            />
            <FieldError message={errors.code} />
          </div>

          {/* Niveau & Service */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center h-5">
                <Label className="text-xs font-medium">
                  Niveau <span className="text-destructive">*</span>
                </Label>
              </div>
              <Select
                value={vm.formState.tenantLevel}
                onValueChange={(v) => updateForm({ tenantLevel: v as TenantLevel, tenantId: "" }, "tenantId")}
                disabled={isEditing}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GLOBAL" className="text-xs">Global</SelectItem>
                  <SelectItem value="STRUCTURE" className="text-xs">Structure</SelectItem>
                  <SelectItem value="DISTRIBUTEUR" className="text-xs">Distributeur</SelectItem>
                  <SelectItem value="AGENCY" className="text-xs">Agence</SelectItem>
                </SelectContent>
              </Select>
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
                value={vm.formState.serviceType}
                onValueChange={(v) => updateForm({ serviceType: v as ServiceType }, "serviceType")}
                disabled={isEditing}
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
          </div>

          {/* Entité cible si non-GLOBAL */}
          {vm.formState.tenantLevel !== "GLOBAL" && !isEditing && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Entité cible <span className="text-destructive">*</span>
              </Label>
              <Select
                value={vm.formState.tenantId}
                onValueChange={(v) => updateForm({ tenantId: v }, "tenantId")}
              >
                <SelectTrigger {...invalidFieldProps(errors.tenantId, "h-8 text-xs")}>
                  <SelectValue placeholder="Sélectionner l'entité" />
                </SelectTrigger>
                <SelectContent>
                  {vm.formState.tenantLevel === "STRUCTURE" &&
                    vm.structures.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                    ))}
                  {vm.formState.tenantLevel === "DISTRIBUTEUR" &&
                    vm.distributors.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">{d.nom}</SelectItem>
                    ))}
                  {vm.formState.tenantLevel === "AGENCY" &&
                    vm.activeAgencies.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.tenantId} />
            </div>
          )}

          {/* Grille de frais ciblée (optionnelle) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between h-5">
              <Label className="text-xs font-medium">
                Grille de frais ciblée <span className="text-muted-foreground text-[10px]">(Facultatif)</span>
              </Label>
              {vm.isLoadingFeeGrids && (
                <span className="text-[10px] text-muted-foreground animate-pulse">Chargement des grilles...</span>
              )}
            </div>
            <Select
              value={vm.formState.feeGridId || "__all__"}
              onValueChange={(v) => updateForm({ feeGridId: v === "__all__" ? "" : v })}
              disabled={isEditing}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Aucune grille" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">
                  Aucune grille
                </SelectItem>
                {vm.feeGrids.map((grid) => (
                  <SelectItem key={grid.id} value={grid.id} className="text-xs">
                    {formatFeeGridLabel(grid)}
                  </SelectItem>
                ))}
                {vm.formState.feeGridId &&
                  !vm.feeGrids.some((g) => g.id === vm.formState.feeGridId) && (
                    <SelectItem value={vm.formState.feeGridId} className="text-xs">
                      Grille sélectionnée ({vm.formState.feeGridId})
                    </SelectItem>
                  )}
              </SelectContent>
            </Select>
          </div>

          {/* Dates de validité */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Date de début <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                {...invalidFieldProps(errors.startDate, "h-8 text-xs")}
                value={vm.formState.startDate}
                onChange={(e) => updateForm({ startDate: e.target.value }, "startDate", "endDate")}
              />
              <FieldError message={errors.startDate} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Date de fin <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                {...invalidFieldProps(errors.endDate, "h-8 text-xs")}
                value={vm.formState.endDate}
                onChange={(e) => updateForm({ endDate: e.target.value }, "endDate")}
              />
              <FieldError message={errors.endDate} />
            </div>
          </div>

          {/* Remise fixe et Taux de réduction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Remise fixe (FCFA)
              </Label>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="Ex. 50"
                {...invalidFieldProps(
                  errors.fixedAmount || errors.discount,
                  "h-9 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                )}
                value={vm.formState.fixedAmount}
                onChange={(e) => updateForm({ fixedAmount: e.target.value }, "fixedAmount", "discount")}
              />
              <FieldError message={errors.fixedAmount} />
              <span className="text-[10px] text-muted-foreground">Montant fixe déduit des frais</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Taux de réduction (%)
              </Label>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="Ex. 1"
                {...invalidFieldProps(
                  errors.rateAmount || errors.discount,
                  "h-9 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                )}
                value={vm.formState.rateAmount}
                onChange={(e) => updateForm({ rateAmount: e.target.value }, "rateAmount", "discount")}
              />
              <FieldError message={errors.rateAmount} />
              <span className="text-[10px] text-muted-foreground">Pourcentage déduit sur les frais</span>
            </div>
            <FieldError message={errors.discount} className="sm:col-span-2 -mt-2" />
          </div>

          {/* Motif */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Motif</Label>
            <Textarea
              className="text-xs resize-none h-16"
              placeholder="Campagne Tabaski, opération de rentrée..."
              value={vm.formState.overrideReason}
              onChange={(e) => updateForm({ overrideReason: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => vm.setIsFormOpen(false)}
            disabled={vm.isSaving}
          >
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={vm.handleSave}
            disabled={vm.isSaving}
            className="gradient-accent text-accent-foreground"
          >
            {vm.isSaving ? "Enregistrement..." : isEditing ? "Enregistrer" : "Créer la promotion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
