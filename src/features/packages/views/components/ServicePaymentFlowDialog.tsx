import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRightLeft, CreditCard, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { FieldError, hasFieldErrors, invalidFieldProps, useFieldErrors } from "@/shared/forms/fieldErrors";
import {
  ServicePaymentFlowFormField,
  validateServicePaymentFlowForm,
} from "../../viewmodels/packageValidation";
import {
  ServiceResponse,
  ServicePaymentFlowResponse,
  CreateServicePaymentFlowRequest,
} from "../../models/types";
import { PaymentMethodResponse } from "@/features/payment-methods/models/types";
import {
  createServicePaymentFlow,
  updateServicePaymentFlow,
  fetchServicePaymentFlow,
  fetchStructureServicePaymentFlow,
  createStructureServicePaymentFlow,
  updateStructureServicePaymentFlow,
} from "../../services/servicesService";

export interface ServicePaymentFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceResponse | null;
  flowToEdit?: ServicePaymentFlowResponse | null;
  paymentMethods: PaymentMethodResponse[];
  structureId?: string;
  onSuccess: () => void;
}

export const ServicePaymentFlowDialog: React.FC<ServicePaymentFlowDialogProps> = ({
  open,
  onOpenChange,
  service,
  flowToEdit,
  paymentMethods,
  structureId,
  onSuccess,
}) => {
  const [internalFlow, setInternalFlow] = useState<ServicePaymentFlowResponse | null>(null);
  const [isLoadingFlow, setIsLoadingFlow] = useState<boolean>(false);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [selectedDestIds, setSelectedDestIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors<ServicePaymentFlowFormField>();

  const effectiveFlow = flowToEdit !== undefined ? flowToEdit : internalFlow;

  // Initialisation à l'ouverture du modal
  useEffect(() => {
    if (!open) {
      setInternalFlow(null);
      setSelectedSourceIds([]);
      setSelectedDestIds([]);
      setIsLoadingFlow(false);
      resetErrors();
      return;
    }

    resetErrors();

    if (flowToEdit !== undefined) {
      setInternalFlow(flowToEdit);
      if (flowToEdit) {
        const initialSources = flowToEdit.source_payment_method_ids?.length
          ? flowToEdit.source_payment_method_ids
          : flowToEdit.source_payment_method_id
          ? [flowToEdit.source_payment_method_id]
          : [];

        const initialDests = flowToEdit.destination_payment_method_ids?.length
          ? flowToEdit.destination_payment_method_ids
          : flowToEdit.destination_payment_method_id
          ? [flowToEdit.destination_payment_method_id]
          : [];

        setSelectedSourceIds(initialSources);
        setSelectedDestIds(initialDests);
      } else {
        setSelectedSourceIds([]);
        setSelectedDestIds([]);
      }
    } else if (service?.id) {
      // Aucun flowToEdit explicite passé : on vérifie s'il existe déjà un flux configuré
      let isMounted = true;
      setIsLoadingFlow(true);
      const flowPromise = structureId
        ? fetchStructureServicePaymentFlow(structureId, service.id)
        : fetchServicePaymentFlow(service.id);

      flowPromise
        .then((flow) => {
          if (!isMounted) return;
          if (flow) {
            setInternalFlow(flow);
            const initialSources = flow.source_payment_method_ids?.length
              ? flow.source_payment_method_ids
              : flow.source_payment_method_id
              ? [flow.source_payment_method_id]
              : [];

            const initialDests = flow.destination_payment_method_ids?.length
              ? flow.destination_payment_method_ids
              : flow.destination_payment_method_id
              ? [flow.destination_payment_method_id]
              : [];

            setSelectedSourceIds(initialSources);
            setSelectedDestIds(initialDests);
          } else {
            setInternalFlow(null);
            setSelectedSourceIds([]);
            setSelectedDestIds([]);
          }
        })
        .catch(() => {
          if (!isMounted) return;
          setInternalFlow(null);
          setSelectedSourceIds([]);
          setSelectedDestIds([]);
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingFlow(false);
          }
        });

      return () => {
        isMounted = false;
      };
    } else {
      setInternalFlow(null);
      setSelectedSourceIds([]);
      setSelectedDestIds([]);
    }
  }, [open, flowToEdit, service?.id, structureId, resetErrors]);

  const toggleSource = (pmId: string) => {
    clearError("source");
    setSelectedSourceIds((prev) =>
      prev.includes(pmId) ? prev.filter((id) => id !== pmId) : [...prev, pmId]
    );
  };

  const toggleDest = (pmId: string) => {
    clearError("destination");
    setSelectedDestIds((prev) =>
      prev.includes(pmId) ? prev.filter((id) => id !== pmId) : [...prev, pmId]
    );
  };

  const handleSave = async () => {
    const validationErrors = validateServicePaymentFlowForm(selectedSourceIds, selectedDestIds);
    setErrors(validationErrors);
    if (!service) return;
    if (hasFieldErrors(validationErrors)) return;

    try {
      setIsSaving(true);
      const payload: CreateServicePaymentFlowRequest = {
        source_payment_method_ids: selectedSourceIds,
        destination_payment_method_ids: selectedDestIds,
        constraints: null,
      };

      if (structureId) {
        if (effectiveFlow && !effectiveFlow.inherited) {
          await updateStructureServicePaymentFlow(structureId, service.id, payload);
          toast.success("Surcharge du flux de paiement mise à jour avec succès");
        } else {
          await createStructureServicePaymentFlow(structureId, service.id, payload);
          toast.success("Surcharge du flux de paiement configurée avec succès");
        }
      } else {
        if (effectiveFlow) {
          await updateServicePaymentFlow(service.id, payload);
          toast.success("Flux de paiement mis à jour avec succès");
        } else {
          await createServicePaymentFlow(service.id, payload);
          toast.success("Flux de paiement configuré avec succès");
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement du flux");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background border border-border/50 rounded-2xl shadow-xl">
        {isSaving && <LoadingOverlay title="Enregistrement du flux..." />}

        <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-muted/10 flex flex-row items-center gap-3 space-y-0">
          <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent shrink-0">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base font-bold text-foreground">
              {structureId
                ? effectiveFlow && !effectiveFlow.inherited
                  ? "Modifier la surcharge du flux de paiement"
                  : "Configurer une surcharge du flux de paiement"
                : effectiveFlow
                ? "Modifier le flux de paiement"
                : "Configurer le flux de paiement"}
            </DialogTitle>
            {service && (
              <DialogDescription asChild>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">{service.label}</span>
                  <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 text-accent">
                    {service.code}
                  </Badge>
                  {structureId && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/30 text-purple-600 bg-purple-500/10">
                      Surcharge Structure
                    </Badge>
                  )}
                </div>
              </DialogDescription>
            )}
          </div>
        </DialogHeader>

        {isLoadingFlow ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground text-xs">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <span>Chargement du flux existant...</span>
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Section 1 : Moyens de paiement Source (Débit) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-border/30">
              <div className="p-1 rounded-md bg-blue-500/10 text-blue-600">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
              <Label className="text-xs font-bold text-foreground">
                Moyens de paiement Source (Débit) <span className="text-destructive">*</span>
              </Label>
            </div>

            {paymentMethods.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">
                Aucun moyen de paiement disponible.
              </p>
            ) : (
              <div {...invalidFieldProps(errors.source, "grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-xl border border-transparent p-1.5")}>
                {paymentMethods.map((pm) => {
                  const isChecked = selectedSourceIds.includes(pm.id);
                  return (
                    <div
                      key={`source-${pm.id}`}
                      onClick={() => toggleSource(pm.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? "bg-accent/5 border-accent/40 shadow-sm"
                          : "bg-background/60 border-border/40 hover:bg-muted/30"
                      }`}
                    >
                      <Checkbox
                        id={`source-pm-${pm.id}`}
                        checked={isChecked}
                        onCheckedChange={() => toggleSource(pm.id)}
                        className="h-5 w-5 rounded-[4px] border-2 border-muted-foreground/40 data-[state=checked]:bg-accent data-[state=checked]:border-accent data-[state=checked]:text-white mt-0.5 pointer-events-none transition-all shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {pm.label}
                          </span>
                          <Badge variant="outline" className="font-mono text-[9px] px-1 py-0 shrink-0">
                            {pm.code}
                          </Badge>
                        </div>
                        {pm.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {pm.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <FieldError message={errors.source} className="mt-1" />
          </div>

          {/* Section 2 : Moyens de paiement Destination (Crédit) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-border/30">
              <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600">
                <ArrowDownRight className="h-3.5 w-3.5" />
              </div>
              <Label className="text-xs font-bold text-foreground">
                Moyens de paiement Destination (Crédit) <span className="text-destructive">*</span>
              </Label>
            </div>

            {paymentMethods.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">
                Aucun moyen de paiement disponible.
              </p>
            ) : (
              <div {...invalidFieldProps(errors.destination, "grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-xl border border-transparent p-1.5")}>
                {paymentMethods.map((pm) => {
                  const isChecked = selectedDestIds.includes(pm.id);
                  return (
                    <div
                      key={`dest-${pm.id}`}
                      onClick={() => toggleDest(pm.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? "bg-accent/5 border-accent/40 shadow-sm"
                          : "bg-background/60 border-border/40 hover:bg-muted/30"
                      }`}
                    >
                      <Checkbox
                        id={`dest-pm-${pm.id}`}
                        checked={isChecked}
                        onCheckedChange={() => toggleDest(pm.id)}
                        className="h-5 w-5 rounded-[4px] border-2 border-muted-foreground/40 data-[state=checked]:bg-accent data-[state=checked]:border-accent data-[state=checked]:text-white mt-0.5 pointer-events-none transition-all shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {pm.label}
                          </span>
                          <Badge variant="outline" className="font-mono text-[9px] px-1 py-0 shrink-0">
                            {pm.code}
                          </Badge>
                        </div>
                        {pm.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {pm.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <FieldError message={errors.destination} className="mt-1" />
          </div>
        </div>
      )}

        <DialogFooter className="p-4 px-6 border-t border-border/40 bg-muted/10 gap-2 shrink-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="text-xs h-9"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoadingFlow}
            className="gradient-accent text-accent-foreground text-xs h-9 px-4"
          >
            {structureId
              ? effectiveFlow && !effectiveFlow.inherited
                ? "Enregistrer les modifications"
                : "Créer la surcharge"
              : effectiveFlow
              ? "Enregistrer les modifications"
              : "Créer le flux de paiement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ServicePaymentFlowDialog;
