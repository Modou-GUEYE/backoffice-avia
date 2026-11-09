import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  PackageResponse,
  ServiceResponse,
} from "../../models/types";
import { PaymentMethodResponse } from "@/features/payment-methods/models/types";
import {
  Package,
  Layers,
  CreditCard,
  Loader2,
  Users,
  Check,
} from "lucide-react";

const CLIENT_TYPES = [
  { value: "PARTICULIER", label: "Particulier" },
  { value: "ENTREPRISE", label: "Entreprise" },
  { value: "COMMERCANT", label: "Commerçant" },
];

interface PackageDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg: PackageResponse | null;
  services: ServiceResponse[];
  paymentMethods: PaymentMethodResponse[];
  packageServices: string[];
  packagePaymentMethods?: string[];
  isLoadingDetailFlows?: boolean;
  onToggleService?: (serviceId: string, enabled: boolean) => void;
  onEditPackage?: (pkg: PackageResponse) => void;
}

export const PackageDetailDialog: React.FC<PackageDetailDialogProps> = ({
  open,
  onOpenChange,
  pkg,
  services,
  paymentMethods,
  packageServices,
  packagePaymentMethods = [],
  isLoadingDetailFlows = false,
  onToggleService,
  onEditPackage,
}) => {
  const activeServices = useMemo(() => {
    return services.filter((s) => s.status === "active");
  }, [services]);

  const activePaymentMethods = useMemo(() => {
    return paymentMethods.filter((pm) => pm.status === "active");
  }, [paymentMethods]);

  // Déterminer les moyens de paiement inclus dans le package
  const includedPaymentMethodIds = useMemo(() => {
    return packagePaymentMethods ?? [];
  }, [packagePaymentMethods]);

  // Après les hooks : ils doivent être appelés dans le même ordre à chaque rendu
  if (!pkg) return null;

  const includedServicesCount = activeServices.filter((s) => packageServices.includes(s.id)).length;
  const includedPaymentMethodsCount = activePaymentMethods.filter((pm) =>
    includedPaymentMethodIds.includes(pm.id)
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-5 border-b border-border/40 bg-muted/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-foreground">
                    Détails du package {pkg.code}
                  </DialogTitle>
                  <Badge
                    className={
                      pkg.status === "active"
                        ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]"
                        : pkg.status === "archived"
                          ? "bg-slate-500/15 text-slate-500 border-slate-500/30 text-[10px]"
                          : "bg-muted text-muted-foreground text-[10px]"
                    }
                    variant="outline"
                  >
                    {pkg.status === "active" ? "Actif" : pkg.status === "archived" ? "Archivé" : "Inactif"}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Consultation des informations générales, services inclus et moyens de paiement.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {isLoadingDetailFlows && (
            <div className="flex items-center justify-center py-2 gap-2 text-xs text-muted-foreground bg-primary/5 rounded-lg border border-primary/10">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Actualisation des informations du package...</span>
            </div>
          )}

          {/* Section 1 : Métadonnées générales */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Libellé du package
                </Label>
                <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 text-sm font-semibold text-foreground">
                  {pkg.label}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Code du package
                </Label>
                <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 font-mono text-sm font-bold uppercase text-foreground">
                  {pkg.code}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Description
              </Label>
              <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 text-xs text-foreground min-h-[50px] whitespace-pre-wrap">
                {pkg.description?.trim() ? pkg.description : (
                  <span className="text-muted-foreground italic">Aucune description renseignée.</span>
                )}
              </div>
            </div>

            {/* Types de client */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                <Label className="text-xs font-semibold">
                  Types de client autorisés
                </Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {CLIENT_TYPES.map(({ value, label }) => {
                  const isEligible = pkg.client_types?.includes(value) ?? false;
                  return (
                    <div
                      key={value}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        isEligible
                          ? "border-primary bg-primary/10 text-primary shadow-xs font-semibold"
                          : "border-border/40 bg-muted/10 text-muted-foreground opacity-50"
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded flex items-center justify-center border transition-all ${
                          isEligible
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30 bg-background"
                        }`}
                      >
                        {isEligible && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2 : Services */}
          <div className="space-y-3 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Services
                </h3>
                <Badge variant="outline" className="text-[10px] font-normal">
                  {includedServicesCount} / {activeServices.length} inclus
                </Badge>
              </div>
            </div>

            {activeServices.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                Aucun service actif disponible sur la plateforme.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeServices.map((srv) => {
                  const isIncluded = packageServices.includes(srv.id);
                  return (
                    <div
                      key={srv.id}
                      className={`p-3 rounded-xl border text-xs transition-all flex items-center justify-between gap-3 ${
                        isIncluded
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border/60 bg-muted/10 text-muted-foreground opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-4 w-4 rounded flex items-center justify-center border shrink-0 ${
                            isIncluded
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30 bg-background"
                          }`}
                        >
                          {isIncluded && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <div className="truncate min-w-0">
                          <p className="font-semibold text-foreground truncate text-xs">{srv.label}</p>
                          <span className="font-mono text-[10px] text-muted-foreground uppercase">
                            {srv.code}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant={isIncluded ? "default" : "outline"}
                        className="text-[9px] px-1.5 py-0 h-4 uppercase shrink-0"
                      >
                        {isIncluded ? "Inclus" : "Non inclus"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3 : Moyens de paiement */}
          <div className="space-y-3 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Moyens de paiement
                </h3>
                <Badge variant="outline" className="text-[10px] font-normal">
                  {includedPaymentMethodsCount} / {activePaymentMethods.length} inclus
                </Badge>
              </div>
            </div>

            {activePaymentMethods.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                Aucun moyen de paiement actif disponible sur la plateforme.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activePaymentMethods.map((pm) => {
                  const isIncluded = includedPaymentMethodIds.includes(pm.id);
                  return (
                    <div
                      key={pm.id}
                      className={`p-3 rounded-xl border text-xs transition-all flex items-center justify-between gap-3 ${
                        isIncluded
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border/60 bg-muted/10 text-muted-foreground opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-4 w-4 rounded flex items-center justify-center border shrink-0 ${
                            isIncluded
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30 bg-background"
                          }`}
                        >
                          {isIncluded && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
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
                        variant={isIncluded ? "default" : "outline"}
                        className="text-[9px] px-1.5 py-0 h-4 uppercase shrink-0"
                      >
                        {isIncluded ? "Inclus" : "Non inclus"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/40 bg-muted/20 flex items-center justify-end sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PackageDetailDialog;
