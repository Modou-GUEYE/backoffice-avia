import React, { useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PackageResponse,
  PackageForm,
  ServiceResponse,
} from "../../models/types";
import { PaymentMethodResponse } from "@/features/payment-methods/models/types";
import {
  Package,
  Layers,
  CreditCard,
  Users,
  Check,
} from "lucide-react";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { FieldError, hasFieldErrors, invalidFieldProps, useFieldErrors } from "@/shared/forms/fieldErrors";
import { PackageFormField, validatePackageForm } from "../../viewmodels/packageValidation";

const CLIENT_TYPES = [
  { value: "PARTICULIER", label: "Particulier" },
  { value: "ENTREPRISE", label: "Entreprise" },
  { value: "COMMERCANT", label: "Commerçant" },
];

interface PackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: PackageForm;
  setForm: React.Dispatch<React.SetStateAction<PackageForm>>;
  editingPackage: PackageResponse | null;
  services: ServiceResponse[];
  paymentMethods: PaymentMethodResponse[];
  isSaving: boolean;
  onSave: () => void;
  onToggleService: (serviceId: string, checked: boolean) => void;
  onToggleAllServices: (selectAll: boolean) => void;
  onTogglePaymentMethod: (pmId: string, checked: boolean) => void;
  onToggleAllPaymentMethods: (selectAll: boolean) => void;
}

export const PackageDialog: React.FC<PackageDialogProps> = ({
  open,
  onOpenChange,
  form,
  setForm,
  editingPackage,
  services,
  paymentMethods,
  isSaving,
  onSave,
  onToggleService,
  onToggleAllServices,
  onTogglePaymentMethod,
  onToggleAllPaymentMethods,
}) => {
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors<PackageFormField>();

  useEffect(() => {
    resetErrors();
  }, [open, resetErrors]);

  const activeServices = useMemo(() => {
    return services.filter((s) => s.status === "active");
  }, [services]);

  const activePaymentMethods = useMemo(() => {
    return paymentMethods.filter((pm) => pm.status === "active");
  }, [paymentMethods]);

  const handleClientTypeToggle = (type: string) => {
    const current = form.client_types || [];
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setForm((prev) => ({ ...prev, client_types: next }));
    if (next.length > 0) clearError("client_types");
  };

  const handleToggleServiceWrapper = (serviceId: string, checked: boolean) => {
    onToggleService(serviceId, checked);
    clearError("services");
  };

  const handleTogglePaymentMethodWrapper = (pmId: string, checked: boolean) => {
    onTogglePaymentMethod(pmId, checked);
    clearError("payment_methods");
  };

  const handleValidateAndSave = () => {
    const newErrors = validatePackageForm(form);
    setErrors(newErrors);
    if (hasFieldErrors(newErrors)) return;

    onSave();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {isSaving && (
          <LoadingOverlay
            title={editingPackage ? "Modification du package" : "Création du package"}
            description="Veuillez patienter pendant l'enregistrement du package..."
          />
        )}
        {/* Header */}
        <DialogHeader className="px-6 py-5 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {editingPackage ? `Modifier le package ${editingPackage.code}` : "Nouveau package"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Renseignez les informations générales, les services et les moyens de paiement du package.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Section 1 : Métadonnées générales */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pkg-label" className="text-xs font-semibold">
                  Libellé du package <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pkg-label"
                  placeholder="Ex: Pack Gold Entreprise"
                  value={form.label}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, label: e.target.value }));
                    clearError("label");
                  }}
                  {...invalidFieldProps(errors.label, "text-sm font-medium")}
                />
                <FieldError message={errors.label} className="mt-1" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pkg-code" className="text-xs font-semibold">
                  Code du package <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pkg-code"
                  placeholder="Ex: PKG-001"
                  value={form.code}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }));
                    clearError("code");
                  }}
                  {...invalidFieldProps(errors.code, "font-mono text-sm uppercase")}
                />
                <FieldError message={errors.code} className="mt-1" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pkg-description" className="text-xs font-semibold">
                Description
              </Label>
              <Textarea
                id="pkg-description"
                placeholder="Description facultative du package..."
                value={form.description || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="text-xs min-h-[70px] resize-none"
              />
            </div>

            {/* Types de client */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                <Label className="text-xs font-semibold">
                  Types de client autorisés <span className="text-destructive">*</span>
                </Label>
              </div>
              <div {...invalidFieldProps(errors.client_types, "flex flex-wrap gap-2 rounded-xl border border-transparent p-1.5")}>
                {CLIENT_TYPES.map(({ value, label }) => {
                  const isChecked = form.client_types?.includes(value) ?? false;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleClientTypeToggle(value)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        isChecked
                          ? "border-primary bg-primary/10 text-primary shadow-xs font-semibold"
                          : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded flex items-center justify-center border transition-all ${
                          isChecked
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/40 bg-background"
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
              <FieldError message={errors.client_types} className="mt-1" />
            </div>
          </div>

          {/* Section 2 : Services */}
          <div className="space-y-3 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Services <span className="text-destructive">*</span>
                </h3>
              </div>
            </div>

            {activeServices.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                Aucun service actif disponible sur la plateforme.
              </div>
            ) : (
              <div {...invalidFieldProps(errors.services, "grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-xl border border-transparent p-1.5")}>
                {activeServices.map((srv) => {
                  const isSelected = form.services.includes(srv.id);
                  return (
                    <div
                      key={srv.id}
                      onClick={() => handleToggleServiceWrapper(srv.id, !isSelected)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border/60 bg-muted/10 text-muted-foreground hover:bg-muted/30 hover:border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox
                          id={`service-${srv.id}`}
                          checked={isSelected}
                          onCheckedChange={() => {}}
                          className="pointer-events-none shrink-0"
                        />
                        <div className="truncate min-w-0">
                          <p className="font-semibold text-foreground truncate text-xs">{srv.label}</p>
                          <span className="font-mono text-[10px] text-muted-foreground uppercase">
                            {srv.code}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant={isSelected ? "default" : "outline"}
                        className="text-[9px] px-1.5 py-0 h-4 uppercase shrink-0"
                      >
                        {isSelected ? "Inclus" : "Non inclus"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
            <FieldError message={errors.services} />
          </div>

          {/* Section 3 : Moyens de paiement */}
          <div className="space-y-3 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Moyens de paiement <span className="text-destructive">*</span>
                </h3>
              </div>
            </div>

            {activePaymentMethods.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                Aucun moyen de paiement actif disponible sur la plateforme.
              </div>
            ) : (
              <div {...invalidFieldProps(errors.payment_methods, "grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-xl border border-transparent p-1.5")}>
                {activePaymentMethods.map((pm) => {
                  const isSelected = form.payment_methods.includes(pm.id);
                  return (
                    <div
                      key={pm.id}
                      onClick={() => handleTogglePaymentMethodWrapper(pm.id, !isSelected)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border/60 bg-muted/10 text-muted-foreground hover:bg-muted/30 hover:border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox
                          id={`pm-${pm.id}`}
                          checked={isSelected}
                          onCheckedChange={() => {}}
                          className="pointer-events-none shrink-0"
                        />
                        {pm.logo_url ? (
                          <img
                            src={pm.logo_url}
                            alt={pm.label}
                            className="h-7 w-7 rounded-md border border-border/40 bg-background object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-7 w-7 rounded-md border border-border/40 bg-muted flex items-center justify-center shrink-0">
                            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="truncate min-w-0">
                          <p className="font-semibold text-foreground truncate text-xs">{pm.label}</p>
                          <span className="font-mono text-[10px] text-muted-foreground uppercase">
                            {pm.code}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant={isSelected ? "default" : "outline"}
                        className="text-[9px] px-1.5 py-0 h-4 uppercase shrink-0"
                      >
                        {isSelected ? "Inclus" : "Non inclus"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
            <FieldError message={errors.payment_methods} />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/40 bg-muted/20 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleValidateAndSave}
            disabled={isSaving}
            className="min-w-[100px]"
          >
            Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PackageDialog;
