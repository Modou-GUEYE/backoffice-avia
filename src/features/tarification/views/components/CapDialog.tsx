import React from "react";
import { Check, RefreshCw, AlertCircle, TrendingDown } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCaps } from "../../viewmodels/useCaps";
import { ServiceType, TenantLevel } from "../../models/types";
import { getCurrentInstitutionLabel } from "@/core/security/authStore";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";

interface CapDialogProps {
  vm: ReturnType<typeof useCaps>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CapDialog: React.FC<CapDialogProps> = ({ vm, open, onOpenChange }) => {
  const isOpen = open !== undefined ? open : vm.dialogOpen;
  const handleOpenChange = onOpenChange || vm.setDialogOpen;
  const isEditing = !!vm.editingCap;
  const errors = vm.createFormErrors;

  const handleSubmit = async () => {
    await vm.handleCreate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/15 text-accent border border-accent/25 shrink-0">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                {isEditing ? "Modifier le plafond" : "Nouveau plafond"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEditing
                  ? "Ajustez les plafonds de transaction et de cumul pour cette tranche."
                  : "Définissez les plafonds de transaction et de cumul pour un service et un périmètre donné."}
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
                  value={vm.createForm.tenant_level}
                  onValueChange={(v) => vm.handleCreateFieldChange("tenant_level", v as TenantLevel)}
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
                  value={vm.createForm.tenant_level}
                  onValueChange={(v) => vm.handleCreateFieldChange("tenant_level", v as TenantLevel)}
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
                  className="h-9 text-xs font-mono"
                  value={vm.createForm.tenant_level}
                  disabled={true}
                />
              ) : (
                <Select
                  value={vm.createForm.tenant_level}
                  onValueChange={(v) => vm.handleCreateFieldChange("tenant_level", v as TenantLevel)}
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
                value={vm.createForm.service_type}
                onValueChange={(v) => vm.handleCreateFieldChange("service_type", v as ServiceType)}
              >
                <SelectTrigger {...invalidFieldProps(errors.service_type, "h-9 text-xs")}>
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
                    <div className="p-2 text-xs text-muted-foreground text-center">
                      {vm.isLoadingCatalogServices ? "Chargement des services..." : "Aucun service disponible"}
                    </div>
                  )}
                  {vm.createForm.service_type &&
                    vm.catalogServices &&
                    vm.catalogServices.length > 0 &&
                    !vm.catalogServices.some((s) => s.code === vm.createForm.service_type) && (
                      <SelectItem value={vm.createForm.service_type} className="text-xs">
                        {vm.createForm.service_type}
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
              <FieldError message={errors.service_type} />
            </div>
          </div>

          {/* Entité cible (masquée si GLOBAL) */}
          {vm.createForm.tenant_level !== "GLOBAL" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {vm.createForm.tenant_level === "STRUCTURE"
                  ? "Structure cible"
                  : vm.createForm.tenant_level === "PRODUCT"
                  ? "Produit cible"
                  : vm.createForm.tenant_level === "AGENCY"
                  ? "Agence cible"
                  : "Distributeur cible"}{" "}
                <span className="text-destructive">*</span>
              </Label>
              {vm.createForm.tenant_level === "STRUCTURE" ? (
                vm.isStructureAdmin ? (
                  <Input
                    className="h-9 text-xs"
                    value={getCurrentInstitutionLabel() || "Ma Structure"}
                    disabled={true}
                  />
                ) : (
                  <Select
                    value={vm.createForm.tenant_id}
                    onValueChange={(v) => vm.handleCreateFieldChange("tenant_id", v)}
                  >
                    <SelectTrigger {...invalidFieldProps(errors.tenant_id, "h-9 text-xs")}>
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
                )
              ) : vm.createForm.tenant_level === "PRODUCT" ? (
                vm.isProductAdmin ? (
                  <Input
                    className="h-9 text-xs"
                    value={getCurrentInstitutionLabel() || "Mon Produit"}
                    disabled={true}
                  />
                ) : (
                  <Select
                    value={vm.createForm.tenant_id}
                    onValueChange={(v) => vm.handleCreateFieldChange("tenant_id", v)}
                  >
                    <SelectTrigger {...invalidFieldProps(errors.tenant_id, "h-9 text-xs")}>
                      <SelectValue placeholder="Choisir un produit..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vm.products && vm.products.length > 0 ? (
                        vm.products.map((p) => (
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
                )
              ) : vm.createForm.tenant_level === "AGENCY" ? (
                <Select
                  value={vm.createForm.tenant_id}
                  onValueChange={(v) => vm.handleCreateFieldChange("tenant_id", v)}
                >
                  <SelectTrigger {...invalidFieldProps(errors.tenant_id, "h-9 text-xs")}>
                    <SelectValue placeholder="Choisir une agence..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(vm.activeAgencies && vm.activeAgencies.length > 0 ? vm.activeAgencies : vm.agencies).map((a) => (
                      <SelectItem key={a.id} value={a.id} className="text-xs">
                        {a.name || (a as { nom?: string }).nom || a.id} {a.code ? `(${a.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={vm.createForm.tenant_id}
                  onValueChange={(v) => vm.handleCreateFieldChange("tenant_id", v)}
                >
                  <SelectTrigger {...invalidFieldProps(errors.tenant_id, "h-9 text-xs")}>
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
              <FieldError message={errors.tenant_id} />
            </div>
          )}

          {/* Bornes par transaction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Min par transaction (FCFA)</Label>
              <Input
                type="number"
                min={0}
                {...invalidFieldProps(errors.min_per_transaction, "h-9 text-xs")}
                placeholder="Illimité si vide"
                value={vm.createForm.min_per_transaction}
                onChange={(e) => vm.handleCreateFieldChange("min_per_transaction", e.target.value)}
              />
              <FieldError message={errors.min_per_transaction} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Max par transaction (FCFA)</Label>
              <Input
                type="number"
                min={0}
                {...invalidFieldProps(errors.max_per_transaction, "h-9 text-xs")}
                placeholder="Illimité si vide"
                value={vm.createForm.max_per_transaction}
                onChange={(e) => vm.handleCreateFieldChange("max_per_transaction", e.target.value)}
              />
              <FieldError message={errors.max_per_transaction} />
            </div>
          </div>

          {/* Cumuls journalier et mensuel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Cumul journalier (FCFA)</Label>
              <Input
                type="number"
                min={0}
                {...invalidFieldProps(errors.daily_cumulative, "h-9 text-xs")}
                placeholder="Illimité si vide"
                value={vm.createForm.daily_cumulative}
                onChange={(e) => vm.handleCreateFieldChange("daily_cumulative", e.target.value)}
              />
              <FieldError message={errors.daily_cumulative} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Cumul mensuel (FCFA)</Label>
              <Input
                type="number"
                min={0}
                {...invalidFieldProps(errors.monthly_cumulative, "h-9 text-xs")}
                placeholder="Illimité si vide"
                value={vm.createForm.monthly_cumulative}
                onChange={(e) => vm.handleCreateFieldChange("monthly_cumulative", e.target.value)}
              />
              <FieldError message={errors.monthly_cumulative} />
            </div>
          </div>

          {/* Erreur renvoyée par l'API */}
          {vm.createSubmitError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{vm.createSubmitError}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={vm.isCreating}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={vm.isCreating}
            className="gradient-accent text-accent-foreground gap-1.5"
          >
            {vm.isCreating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {vm.isCreating
              ? isEditing
                ? "Sauvegarde..."
                : "Création..."
              : isEditing
              ? "Enregistrer les modifications"
              : "Créer le plafond"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
