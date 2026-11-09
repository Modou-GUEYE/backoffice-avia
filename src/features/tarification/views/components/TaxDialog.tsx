import React from "react";
import { Receipt, RefreshCw } from "lucide-react";
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
import { useTaxes } from "../../viewmodels/useTaxes";
import { TenantLevel, ServiceType, ClientType, TaxForm } from "../../models/types";
import { TaxFormField } from "../../models/validation";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { getCurrentInstitutionLabel } from "@/core/security/authStore";

interface TaxDialogProps {
  vm: ReturnType<typeof useTaxes>;
}

export const TaxDialog: React.FC<TaxDialogProps> = ({ vm }) => {
  const isEditing = !!vm.editingTax;
  const errors = vm.formErrors;

  /** Met à jour le formulaire et efface les erreurs des champs modifiés. */
  const updateForm = (patch: Partial<TaxForm>, ...fields: TaxFormField[]) => {
    fields.forEach(vm.clearFormError);
    vm.setTaxForm({ ...vm.taxForm, ...patch });
  };

  return (
    <Dialog open={vm.dialogOpen} onOpenChange={vm.setDialogOpen}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/15 text-accent border border-accent/25 shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                {isEditing ? "Modifier la taxe" : "Nouvelle taxe"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEditing
                  ? "Ajustez le taux, le montant forfaitaire et le motif de dérogation de cette règle fiscale."
                  : "Définissez les taux et/ou montants de taxe pour un service et un périmètre donné."}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
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
                  value={vm.taxForm.tenantLevel}
                  onValueChange={(v) => vm.handleTaxLevelChange(v as TenantLevel)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STRUCTURE" className="text-xs">Structure</SelectItem>
                    <SelectItem value="AGENCY" className="text-xs">Agence</SelectItem>
                  </SelectContent>
                </Select>
              ) : vm.isDistributorAdmin ? (
                <Select
                  value={vm.taxForm.tenantLevel}
                  onValueChange={(v) => vm.handleTaxLevelChange(v as TenantLevel)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DISTRIBUTEUR" className="text-xs">Distributeur</SelectItem>
                    <SelectItem value="AGENCY" className="text-xs">Agence</SelectItem>
                  </SelectContent>
                </Select>
              ) : vm.isProductAdmin ? (
                <Input
                  className="h-9 text-xs font-mono bg-muted"
                  value={vm.taxForm.tenantLevel}
                  disabled={true}
                />
              ) : (
                <Select
                  value={vm.taxForm.tenantLevel}
                  onValueChange={(v) => vm.handleTaxLevelChange(v as TenantLevel)}
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
                value={vm.taxForm.serviceType}
                onValueChange={(v) => updateForm({ serviceType: v as ServiceType }, "serviceType")}
              >
                <SelectTrigger {...invalidFieldProps(errors.serviceType, "h-9 text-xs")}>
                  <SelectValue placeholder="Sélectionner un service..." />
                </SelectTrigger>
                <SelectContent>
                  {vm.catalogServices && vm.catalogServices.length > 0 ? (
                    vm.catalogServices.map((s) => (
                      <SelectItem key={s.id || s.code} value={s.code} className="text-xs">
                        <span className="font-medium">{s.label || s.code}</span>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value={vm.taxForm.serviceType} className="text-xs">
                      {vm.taxForm.serviceType}
                    </SelectItem>
                  )}
                  {vm.catalogServices &&
                    vm.catalogServices.length > 0 &&
                    !vm.catalogServices.some((s) => s.code === vm.taxForm.serviceType) && (
                      <SelectItem value={vm.taxForm.serviceType} className="text-xs">
                        {vm.taxForm.serviceType}
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
              <FieldError message={errors.serviceType} />
            </div>
          </div>

              {/* Entité cible (masquée si GLOBAL) */}
              {vm.taxForm.tenantLevel !== "GLOBAL" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    {vm.taxForm.tenantLevel === "STRUCTURE"
                      ? "Structure cible"
                      : vm.taxForm.tenantLevel === "PRODUCT"
                      ? "Produit cible"
                      : vm.taxForm.tenantLevel === "AGENCY"
                      ? "Agence cible"
                      : "Distributeur cible"}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  {vm.taxForm.tenantLevel === "STRUCTURE" ? (
                    vm.isStructureAdmin ? (
                      <Input
                        className="h-9 text-xs"
                        value={getCurrentInstitutionLabel() || "Ma Structure"}
                        disabled={true}
                      />
                    ) : (
                      <Select
                        value={vm.taxForm.tenantId}
                        onValueChange={(v) => updateForm({ tenantId: v }, "tenantId")}
                      >
                        <SelectTrigger {...invalidFieldProps(errors.tenantId, "h-9 text-xs")}>
                          <SelectValue placeholder="Choisir une structure..." />
                        </SelectTrigger>
                        <SelectContent>
                          {vm.structures.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  ) : vm.taxForm.tenantLevel === "PRODUCT" ? (
                    <Select
                      value={vm.taxForm.tenantId}
                      onValueChange={(v) => updateForm({ tenantId: v }, "tenantId")}
                    >
                      <SelectTrigger {...invalidFieldProps(errors.tenantId, "h-9 text-xs")}>
                        <SelectValue placeholder="Choisir un produit..." />
                      </SelectTrigger>
                      <SelectContent>
                        {vm.products.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : vm.taxForm.tenantLevel === "DISTRIBUTEUR" ? (
                    vm.isDistributorAdmin ? (
                      <Input
                        className="h-9 text-xs"
                        value={getCurrentInstitutionLabel() || "Mon Réseau de Distribution"}
                        disabled={true}
                      />
                    ) : (
                      <Select
                        value={vm.taxForm.tenantId}
                        onValueChange={(v) => updateForm({ tenantId: v }, "tenantId")}
                      >
                        <SelectTrigger {...invalidFieldProps(errors.tenantId, "h-9 text-xs")}>
                          <SelectValue placeholder="Choisir un distributeur..." />
                        </SelectTrigger>
                        <SelectContent>
                          {vm.distributors && vm.distributors.length > 0 ? (
                            vm.distributors.map((d) => (
                              <SelectItem key={d.id} value={d.id} className="text-xs">
                                {d.nom}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-2 text-xs text-muted-foreground text-center">
                              Aucun distributeur disponible
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    )
                  ) : (
                    <Select
                      value={vm.taxForm.tenantId}
                      onValueChange={(v) => updateForm({ tenantId: v }, "tenantId")}
                    >
                      <SelectTrigger {...invalidFieldProps(errors.tenantId, "h-9 text-xs")}>
                        <SelectValue placeholder="Choisir une agence..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(vm.activeAgencies && vm.activeAgencies.length > 0 ? vm.activeAgencies : vm.agencies).map((a) => (
                          <SelectItem key={a.id} value={a.id} className="text-xs">
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FieldError message={errors.tenantId} />
                </div>
              )}

              {/* Type de client et Type de taxe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Type de client <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={vm.taxForm.clientType}
                    onValueChange={(v) => updateForm({ clientType: v as ClientType }, "clientType")}
                  >
                    <SelectTrigger {...invalidFieldProps(errors.clientType, "h-9 text-xs")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PARTICULIER" className="text-xs">Particulier</SelectItem>
                      <SelectItem value="ENTREPRISE" className="text-xs">Entreprise</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError message={errors.clientType} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Type de Taxe <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={
                      vm.taxForm.taxType === "TIMBRE_FISCAL" ||
                      vm.taxForm.taxType === "TVA" ||
                      vm.taxForm.taxType === "TAF"
                        ? vm.taxForm.taxType
                        : "autre"
                    }
                    onValueChange={(val) => {
                      if (val === "autre") {
                        vm.setTaxForm({ ...vm.taxForm, taxType: "" });
                      } else {
                        updateForm({ taxType: val }, "taxType");
                      }
                    }}
                  >
                    <SelectTrigger {...invalidFieldProps(errors.taxType, "h-9 text-xs")}>
                      <SelectValue placeholder="Choisir ou saisir un type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TIMBRE_FISCAL" className="text-xs">Timbre Fiscal</SelectItem>
                      <SelectItem value="TVA" className="text-xs">TVA</SelectItem>
                      <SelectItem value="TAF" className="text-xs">TAF</SelectItem>
                      <SelectItem value="autre" className="text-xs">Autre</SelectItem>
                    </SelectContent>
                  </Select>

                  {vm.taxForm.taxType !== "TIMBRE_FISCAL" &&
                    vm.taxForm.taxType !== "TVA" &&
                    vm.taxForm.taxType !== "TAF" && (
                      <Input
                        {...invalidFieldProps(errors.taxType, "h-9 text-xs mt-2")}
                        value={vm.taxForm.taxType}
                        onChange={(e) => updateForm({ taxType: e.target.value }, "taxType")}
                        placeholder="Saisissez le code technique de la taxe..."
                      />
                    )}
                  <FieldError message={errors.taxType} />
                </div>
              </div>

          {/* Valeurs financières modifiables (Taux et Montant) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Taux de taxe (%)
              </Label>
              <Input
                type="number"
                step="0.01"
                {...invalidFieldProps(
                  errors.taxRate,
                  "h-9 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                )}
                value={vm.taxForm.taxRate}
                onChange={(e) => updateForm({ taxRate: e.target.value }, "taxRate")}
                placeholder="Ex. 18"
              />
              <FieldError message={errors.taxRate} />
              <span className="text-[10px] text-muted-foreground">Pourcentage prélevé sur le montant</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Montant fixe (FCFA)
              </Label>
              <Input
                type="number"
                step="0.01"
                {...invalidFieldProps(
                  errors.taxAmount,
                  "h-9 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                )}
                value={vm.taxForm.taxAmount}
                onChange={(e) => updateForm({ taxAmount: e.target.value }, "taxAmount")}
                placeholder="Ex. 100"
              />
              <FieldError message={errors.taxAmount} />
              <span className="text-[10px] text-muted-foreground">Montant fixe prélevé par transaction</span>
            </div>
          </div>

          {/* Motif de dérogation / Justification */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Raison / Justification (optionnel)
            </Label>
            <Textarea
              className="text-xs resize-none"
              rows={2}
              value={vm.taxForm.overrideReason}
              onChange={(e) => updateForm({ overrideReason: e.target.value })}
              placeholder="Ex. Application d'une dérogation fiscale..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => vm.setDialogOpen(false)} disabled={vm.isSaving}>
            Annuler
          </Button>
          <Button
            onClick={vm.saveTax}
            className="gradient-accent text-accent-foreground gap-1.5"
            disabled={vm.isSaving}
          >
            {vm.isSaving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            {isEditing ? "Enregistrer les modifications" : "Créer la règle de taxe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
