import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRightLeft,
  Loader2,
  SlidersHorizontal,
  RotateCcw,
  Power,
  Settings,
  AlertCircle,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import ServicePaymentFlowDialog from "@/features/packages/views/components/ServicePaymentFlowDialog";
import {
  ServiceResponse,
  ServicePaymentFlowResponse,
  StructurePackageAssignmentResponse,
} from "@/features/packages/models/types";
import { PaymentMethodResponse } from "@/features/payment-methods/models/types";
import {
  fetchPackageServices,
  fetchPackagePaymentMethods,
} from "@/features/packages/services/packagesService";
import {
  fetchCatalogServices,
  fetchStructureServicePaymentFlow,
  deleteStructureServicePaymentFlow,
  enableStructureServicePaymentFlow,
  disableStructureServicePaymentFlow,
} from "@/features/packages/services/servicesService";
import { fetchPaymentMethods } from "@/features/payment-methods/services/paymentMethodsService";

export interface StructureServicePaymentFlowsCardProps {
  structureId: string;
  activeAssignment: StructurePackageAssignmentResponse | null;
  canUpdate: boolean;
}

interface ServiceFlowItem {
  service: ServiceResponse;
  flow: ServicePaymentFlowResponse | null;
  isLoadingFlow?: boolean;
}

export const StructureServicePaymentFlowsCard: React.FC<StructureServicePaymentFlowsCardProps> = ({
  structureId,
  activeAssignment,
  canUpdate,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [items, setItems] = useState<ServiceFlowItem[]>([]);
  const [packagePaymentMethods, setPackagePaymentMethods] = useState<PaymentMethodResponse[]>([]);
  const [allPaymentMethods, setAllPaymentMethods] = useState<PaymentMethodResponse[]>([]);

  // Dialog states
  const [selectedService, setSelectedService] = useState<ServiceResponse | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<ServicePaymentFlowResponse | null>(null);
  const [isFlowDialogOpen, setIsFlowDialogOpen] = useState<boolean>(false);

  // Revert surcharge states
  const [serviceToRevert, setServiceToRevert] = useState<ServiceResponse | null>(null);
  const [isRevertDialogOpen, setIsRevertDialogOpen] = useState<boolean>(false);
  const [isReverting, setIsReverting] = useState<boolean>(false);

  // Toggle enable/disable surcharge state
  const [togglingServiceId, setTogglingServiceId] = useState<string | null>(null);

  const isPackageActive = activeAssignment?.status === "ACTIVE" && Boolean(activeAssignment?.package_id);

  // Map of all payment methods for name/code resolution
  const paymentMethodMap = useMemo(() => {
    const map = new Map<string, PaymentMethodResponse>();
    for (const pm of allPaymentMethods) {
      map.set(pm.id, pm);
    }
    return map;
  }, [allPaymentMethods]);

  const loadData = useCallback(async () => {
    if (!structureId || !activeAssignment?.package_id || activeAssignment.status !== "ACTIVE") {
      setItems([]);
      setPackagePaymentMethods([]);
      return;
    }

    const packageId = activeAssignment.package_id;
    setIsLoading(true);

    try {
      // 1. Charger en parallèle les services et moyens du package ainsi que leurs catalogues
      const [pServicesRes, catalogServicesRes, pMethodsRes, catalogPMRes] = await Promise.allSettled([
        fetchPackageServices(packageId),
        fetchCatalogServices(),
        fetchPackagePaymentMethods(packageId),
        fetchPaymentMethods(false),
      ]);

      const pkgServices = pServicesRes.status === "fulfilled" && Array.isArray(pServicesRes.value) ? pServicesRes.value : [];
      const catalogServices = catalogServicesRes.status === "fulfilled" && Array.isArray(catalogServicesRes.value) ? catalogServicesRes.value : [];
      const pkgMethods = pMethodsRes.status === "fulfilled" && Array.isArray(pMethodsRes.value) ? pMethodsRes.value : [];
      const catalogPMs = catalogPMRes.status === "fulfilled" && Array.isArray(catalogPMRes.value) ? catalogPMRes.value : [];

      setAllPaymentMethods(catalogPMs);

      // Filtrer les moyens de paiement autorisés par le package actif de la structure
      const activePackageMethodIds = new Set(
        pkgMethods.filter((pm) => pm.is_enabled).map((pm) => pm.payment_method_id)
      );
      const filteredPackagePMs = catalogPMs.filter((pm) => activePackageMethodIds.has(pm.id));
      setPackagePaymentMethods(filteredPackagePMs);

      // Résoudre les services actifs du package
      const activeServiceItems = pkgServices.filter((ps) => ps.is_enabled);
      const catalogMap = new Map<string, ServiceResponse>();
      for (const s of catalogServices) {
        catalogMap.set(s.id, s);
      }

      const resolvedServices: ServiceResponse[] = activeServiceItems.map((ps) => {
        const found = catalogMap.get(ps.service_id);
        if (found) return found;
        return {
          id: ps.service_id,
          code: ps.service_id,
          label: ps.service_id,
          description: null,
          category_id: null,
          status: "active",
        };
      });

      // 2. Charger le flux effectif de chaque service pour la structure
      const flowResults = await Promise.allSettled(
        resolvedServices.map((srv) => fetchStructureServicePaymentFlow(structureId, srv.id))
      );

      const combined: ServiceFlowItem[] = resolvedServices.map((srv, idx) => {
        const flowRes = flowResults[idx];
        const flow = flowRes.status === "fulfilled" ? flowRes.value : null;
        return {
          service: srv,
          flow,
        };
      });

      setItems(combined);
    } catch (error) {
      console.error("[StructureServicePaymentFlowsCard] Erreur lors du chargement des flux:", error);
      toast.error("Impossible de charger les flux de paiement des services");
    } finally {
      setIsLoading(false);
    }
  }, [structureId, activeAssignment?.package_id, activeAssignment?.status]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions de configuration / modification
  const handleOpenEditFlow = (item: ServiceFlowItem) => {
    setSelectedService(item.service);
    setSelectedFlow(item.flow);
    setIsFlowDialogOpen(true);
  };

  const handleFlowSaveSuccess = async () => {
    if (!selectedService) return;
    try {
      const updatedFlow = await fetchStructureServicePaymentFlow(structureId, selectedService.id);
      setItems((prev) =>
        prev.map((it) => (it.service.id === selectedService.id ? { ...it, flow: updatedFlow } : it))
      );
    } catch {
      loadData();
    }
  };

  // Action Rétablir l'héritage (suppression de la surcharge)
  const handleOpenRevertDialog = (service: ServiceResponse) => {
    setServiceToRevert(service);
    setIsRevertDialogOpen(true);
  };

  const handleConfirmRevert = async () => {
    if (!serviceToRevert) return;
    setIsReverting(true);
    try {
      await deleteStructureServicePaymentFlow(structureId, serviceToRevert.id);
      // Après suppression de la surcharge, le GET renvoie le flux hérité s'il existe
      const inheritedFlow = await fetchStructureServicePaymentFlow(structureId, serviceToRevert.id);
      setItems((prev) =>
        prev.map((it) => (it.service.id === serviceToRevert.id ? { ...it, flow: inheritedFlow } : it))
      );
      toast.success("Surcharge supprimée. Le flux par défaut est désormais hérité.");
      setIsRevertDialogOpen(false);
      setServiceToRevert(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du rétablissement de l'héritage");
    } finally {
      setIsReverting(false);
    }
  };

  // Action Activer / Désactiver la surcharge
  const handleToggleSurchargeStatus = async (item: ServiceFlowItem) => {
    if (!item.flow || item.flow.inherited) return;
    setTogglingServiceId(item.service.id);
    try {
      const updated = item.flow.is_enabled
        ? await disableStructureServicePaymentFlow(structureId, item.service.id)
        : await enableStructureServicePaymentFlow(structureId, item.service.id);

      setItems((prev) =>
        prev.map((it) => (it.service.id === item.service.id ? { ...it, flow: updated } : it))
      );
      toast.success(
        updated.is_enabled ? "Surcharge activée avec succès" : "Surcharge désactivée avec succès"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du changement de statut");
    } finally {
      setTogglingServiceId(null);
    }
  };

  const getMethodBadge = (id: string) => {
    const pm = paymentMethodMap.get(id);
    return pm ? (
      <Badge
        key={id}
        variant="secondary"
        className="text-[11px] font-medium bg-background border border-border/60 py-0.5 px-2 text-foreground"
      >
        {pm.label || pm.code}
      </Badge>
    ) : (
      <Badge
        key={id}
        variant="outline"
        className="text-[10px] font-mono py-0 px-1.5 text-muted-foreground"
      >
        {id.slice(0, 8)}...
      </Badge>
    );
  };

  return (
    <div className="glass-card rounded-xl p-6 space-y-4 md:col-span-2">
      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
            <ArrowRightLeft className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Flux de paiement des Services</h3>
            <p className="text-xs text-muted-foreground">
              Gestion de l'héritage et des surcharges de flux de paiement par service
            </p>
          </div>
        </div>
      </div>

      {/* État 1 : Aucun package actif */}
      {!isPackageActive ? (
        <div className="p-6 rounded-xl border border-dashed border-border/70 bg-muted/5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">Aucun package actif rattaché</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pour configurer ou surcharger les flux de paiement des services pour cette structure,
              celle-ci doit d'abord disposer d'un package actif (assignation ci-dessus).
            </p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground text-xs">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
          <span>Chargement des services et flux de paiement...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground italic rounded-xl border bg-muted/5">
          Aucun service actif trouvé dans le package assigné à cette structure.
        </div>
      ) : (
        /* Tableau élégant des services & flux de paiement */
        <div className="overflow-x-auto rounded-xl border border-border/50 bg-background/40">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-muted-foreground">
                <th className="py-3 px-4 font-semibold">Service</th>
                <th className="py-3 px-4 font-semibold">Configuration</th>
                <th className="py-3 px-4 font-semibold">Statut</th>
                <th className="py-3 px-4 font-semibold">Moyens de paiement</th>
                {canUpdate && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {items.map((item) => {
                const { service, flow } = item;
                const isSurcharge = flow && !flow.inherited;
                const isInherited = flow && flow.inherited;
                const sources = flow?.source_payment_method_ids?.length
                  ? flow.source_payment_method_ids
                  : flow?.source_payment_method_id
                  ? [flow.source_payment_method_id]
                  : [];
                const dests = flow?.destination_payment_method_ids?.length
                  ? flow.destination_payment_method_ids
                  : flow?.destination_payment_method_id
                  ? [flow.destination_payment_method_id]
                  : [];

                return (
                  <tr
                    key={service.id}
                    className="hover:bg-muted/15 transition-colors group"
                  >
                    {/* Colonne Service */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-foreground text-xs block">
                          {service.label}
                        </span>
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] px-1.5 py-0 text-muted-foreground"
                        >
                          {service.code}
                        </Badge>
                      </div>
                    </td>

                    {/* Colonne Configuration / Origine */}
                    <td className="py-3.5 px-4 align-top">
                      {isSurcharge ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                            <SlidersHorizontal className="h-3 w-3" />
                            Surcharge active
                          </span>
                          <p className="text-[10px] text-muted-foreground">
                            Propre à la structure
                          </p>
                        </div>
                      ) : isInherited ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                            <Shield className="h-3 w-3" />
                            Hérité (Défaut)
                          </span>
                          <p className="text-[10px] text-muted-foreground">
                            Flux global du service
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
                            Non configuré
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Colonne Statut */}
                    <td className="py-3.5 px-4 align-top">
                      {flow ? (
                        flow.is_enabled ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-600 border border-amber-500/30">
                            Désactivé
                          </span>
                        )
                      ) : (
                        <span className="text-muted-foreground/60 text-xs">-</span>
                      )}
                    </td>

                    {/* Colonne Moyens de paiement */}
                    <td className="py-3.5 px-4 align-top max-w-md">
                      {flow && (sources.length > 0 || dests.length > 0) ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground w-12 shrink-0">
                              Débit :
                            </span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {sources.map((id) => getMethodBadge(id))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground w-12 shrink-0">
                              Crédit :
                            </span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {dests.map((id) => getMethodBadge(id))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 italic text-xs">
                          Aucun moyen sélectionné
                        </span>
                      )}
                    </td>

                    {/* Colonne Actions */}
                    {canUpdate && (
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {isSurcharge ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditFlow(item)}
                                className="h-8 text-xs gap-1.5 hover:bg-accent/10 hover:text-accent border-border/60"
                              >
                                <Settings className="h-3.5 w-3.5" />
                                Modifier
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleSurchargeStatus(item)}
                                disabled={togglingServiceId === service.id}
                                className={`h-8 text-xs gap-1.5 ${
                                  flow.is_enabled
                                    ? "text-amber-500 hover:bg-amber-500/10 hover:text-amber-600"
                                    : "text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600"
                                }`}
                              >
                                {togglingServiceId === service.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Power className="h-3.5 w-3.5" />
                                )}
                                {flow.is_enabled ? "Désactiver" : "Activer"}
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenRevertDialog(service)}
                                className="h-8 text-xs gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Rétablir héritage
                              </Button>
                            </>
                          ) : isInherited ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEditFlow(item)}
                              className="h-8 text-xs gap-1.5 border-purple-500/30 text-purple-600 hover:bg-purple-500/10 hover:text-purple-700"
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5 text-purple-600" />
                              Surcharger
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEditFlow(item)}
                              className="h-8 text-xs gap-1.5 gradient-accent text-accent-foreground border-none hover:opacity-90"
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                              Configurer
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog de configuration / surcharge de flux */}
      {selectedService && (
        <ServicePaymentFlowDialog
          open={isFlowDialogOpen}
          onOpenChange={(open) => {
            setIsFlowDialogOpen(open);
            if (!open) {
              setSelectedService(null);
              setSelectedFlow(null);
            }
          }}
          service={selectedService}
          flowToEdit={selectedFlow}
          paymentMethods={packagePaymentMethods}
          structureId={structureId}
          onSuccess={handleFlowSaveSuccess}
        />
      )}

      {/* Dialog de confirmation pour rétablir l'héritage */}
      <ConfirmDialog
        open={isRevertDialogOpen}
        onOpenChange={setIsRevertDialogOpen}
        title="Rétablir le flux hérité ?"
        description={`Voulez-vous supprimer la surcharge spécifique pour le service "${serviceToRevert?.label}" ? La structure utilisera à nouveau la configuration de flux globale définie par défaut sur le service.`}
        confirmLabel={isReverting ? "Rétablissement..." : "Rétablir l'héritage"}
        confirmDisabled={isReverting}
        confirmVariant="destructive"
        onConfirm={handleConfirmRevert}
      />
    </div>
  );
};

export default StructureServicePaymentFlowsCard;
