import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Check,
  Clock,
  Layers,
  AlertCircle,
  Workflow,
  ShieldCheck,
  Undo2,
  Coins,
  RefreshCw,
  Download,
  ExternalLink,
  Code2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDateTime } from "@/core/references/dateUtils";
import { useParams, useNavigate } from "react-router-dom";
import { ServiceResponse, ServicePaymentFlowResponse } from "../models/types";

import {
  fetchServiceDetail,
  fetchServicePaymentFlows,
  fetchServicePartner,
  enableServicePaymentFlow,
  disableServicePaymentFlow,
  deleteServicePaymentFlow,
} from "../services/servicesService";
import { fetchPaymentMethods } from "@/features/payment-methods/services/paymentMethodsService";
import { PaymentMethodResponse } from "@/features/payment-methods/models/types";
import { PartnerResponse } from "@/features/partenaires/models/types";
import { downloadContractDefinition } from "../services/contractsService";
import { ContractExecutionStep, ContractPrecondition } from "../models/contractsTypes";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ServicePaymentFlowDialog } from "./components";
import LoadingOverlay from "@/shared/components/LoadingOverlay";

export interface ServiceDetailPageProps {
  service?: ServiceResponse | null;
  onBack?: () => void;
  isTechnicalProfile?: boolean;
  canManageVersions?: boolean;
  onManageVersions?: (srv: ServiceResponse) => void;
}

export const ServiceDetailPage: React.FC<ServiceDetailPageProps> = ({
  service: initialService,
  onBack,
  isTechnicalProfile = false,
}) => {
  const { id: routeId } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const isContractInitial = Boolean(initialService?.is_contract || initialService?.definition);
  const shouldUseContract = isTechnicalProfile || isContractInitial;

  // Selon les spécifications via API Gateway (:9080) :
  // - Profil Technique / Contrat (via Gateway) : GET /api/v1/operation/contracts/{identifier} attend service_type ou UUID (id).
  // - Profil Standard / Services (via Gateway) : GET /api/v1/packages-services/services/{service_id} attend strictement le format UUID (id).
  const effectiveId = shouldUseContract
    ? (initialService?.id || initialService?.service_type || routeId)
    : (initialService?.id || routeId);

  const [service, setService] = useState<ServiceResponse | null>(initialService || null);
  const [loading, setLoading] = useState<boolean>(!initialService && !!effectiveId);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [paymentFlows, setPaymentFlows] = useState<ServicePaymentFlowResponse[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodResponse[]>([]);
  const [loadingFlows, setLoadingFlows] = useState<boolean>(false);
  const [partner, setPartner] = useState<PartnerResponse | null>(null);
  const [loadingPartner, setLoadingPartner] = useState<boolean>(false);
  const [showRawDefinition, setShowRawDefinition] = useState<boolean>(false);

  useEffect(() => {
    setService(initialService || null);
  }, [initialService]);

  // Chargement des données du service (détail, flux, moyens de paiement et partenaire)
  useEffect(() => {
    if (!effectiveId) return;
    let isMounted = true;

    if (!initialService) {
      setLoading(true);
    }
    setError(null);

    // 1. Charger les détails du service
    fetchServiceDetail(effectiveId, shouldUseContract)
      .then((detail) => {
        if (!isMounted) return;
        setService(detail);
        setLoading(false);

        // 2. Si service standard : charger partenaire si rattaché
        if (!shouldUseContract && !detail?.is_contract && detail?.partner_id) {
          setLoadingPartner(true);
          fetchServicePartner(detail.id)
            .then((p) => {
              if (isMounted) setPartner(p);
            })
            .catch(() => {
              if (isMounted) setPartner(null);
            })
            .finally(() => {
              if (isMounted) setLoadingPartner(false);
            });
        } else if (isMounted) {
          setPartner(null);
          setLoadingPartner(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          if (!initialService) {
            setError(err instanceof Error ? err.message : "Erreur de chargement du service");
          }
          setLoading(false);
        }
      });

    // 3. Si service standard : charger les flux et moyens de paiement
    const isStandard = !shouldUseContract && !initialService?.is_contract;
    if (isStandard) {
      setLoadingFlows(true);
      Promise.allSettled([
        fetchServicePaymentFlows(effectiveId),
        fetchPaymentMethods(false),
      ])
        .then(([flowsRes, methodsRes]) => {
          if (!isMounted) return;
          setPaymentFlows(flowsRes.status === "fulfilled" ? flowsRes.value : []);
          setPaymentMethods(methodsRes.status === "fulfilled" ? methodsRes.value : []);
          setLoadingFlows(false);
        });
    } else {
      setPaymentFlows([]);
      setPaymentMethods([]);
      setLoadingFlows(false);
    }

    return () => {
      isMounted = false;
    };
  }, [effectiveId, shouldUseContract]);

  const paymentMethodsMap = React.useMemo(() => {
    const map = new Map<string, PaymentMethodResponse>();
    paymentMethods.forEach((pm) => {
      map.set(pm.id, pm);
      if (pm.code) map.set(pm.code, pm);
    });
    return map;
  }, [paymentMethods]);

  // États pour la gestion des flux de paiement
  const [flowDialogOpen, setFlowDialogOpen] = useState<boolean>(false);
  const [flowToEdit, setFlowToEdit] = useState<ServicePaymentFlowResponse | null>(null);
  const [flowToDelete, setFlowToDelete] = useState<ServicePaymentFlowResponse | null>(null);
  const [togglingFlowId, setTogglingFlowId] = useState<string | null>(null);
  const [isDeletingFlow, setIsDeletingFlow] = useState<boolean>(false);

  const loadFlows = useCallback(async () => {
    if (!service?.id) return;
    try {
      setLoadingFlows(true);
      const flows = await fetchServicePaymentFlows(service.id);
      setPaymentFlows(flows);
    } finally {
      setLoadingFlows(false);
    }
  }, [service?.id]);

  const handleOpenAddFlow = () => {
    setFlowToEdit(null);
    setFlowDialogOpen(true);
  };

  const handleOpenEditFlow = (flow: ServicePaymentFlowResponse) => {
    setFlowToEdit(flow);
    setFlowDialogOpen(true);
  };

  const handleToggleFlowStatus = async (flow: ServicePaymentFlowResponse) => {
    if (!service?.id) return;
    try {
      setTogglingFlowId(flow.id);
      let updated: ServicePaymentFlowResponse;
      if (flow.is_enabled) {
        updated = await disableServicePaymentFlow(service.id);
        toast.success("Flux de paiement désactivé avec succès");
      } else {
        updated = await enableServicePaymentFlow(service.id);
        toast.success("Flux de paiement activé avec succès");
      }
      setPaymentFlows((prev) =>
        prev.map((f) => (f.id === flow.id ? { ...f, is_enabled: updated?.is_enabled ?? !flow.is_enabled } : f))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du changement de statut");
    } finally {
      setTogglingFlowId(null);
    }
  };

  const handleConfirmDeleteFlow = async () => {
    if (!service?.id || !flowToDelete) return;
    try {
      setIsDeletingFlow(true);
      await deleteServicePaymentFlow(service.id);
      toast.success("Flux de paiement supprimé avec succès");
      setFlowToDelete(null);
      setPaymentFlows([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression du flux");
    } finally {
      setIsDeletingFlow(false);
    }
  };



  const handleBack = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copié dans le presse-papiers");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownload = async (format: "yaml" | "json") => {
    if (!service?.id) return;
    try {
      await downloadContractDefinition(service.id, format);
      toast.success(`Définition du contrat (${format.toUpperCase()}) téléchargée`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du téléchargement");
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          <RefreshCw className="h-5 w-5 animate-spin text-accent" />
          <span>Chargement du contrat de service...</span>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span className="hover:underline">Retour aux services</span>
        </button>
        <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center gap-2">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p>{error || "Contrat de service introuvable"}</p>
        </div>
      </div>
    );
  }

  const isContract = Boolean(service.is_contract || service.definition);
  const definition = (service.definition as Record<string, unknown>) || {};
  const preconditions: ContractPrecondition[] =
    (definition.preconditions as ContractPrecondition[]) ||
    ((service as unknown as { preconditions?: ContractPrecondition[] }).preconditions as ContractPrecondition[]) ||
    [];
  const executionSteps: ContractExecutionStep[] =
    (definition.execution_steps as ContractExecutionStep[]) ||
    ((service as unknown as { execution_steps?: ContractExecutionStep[] }).execution_steps as ContractExecutionStep[]) ||
    [];
  const rawCompensation =
    (definition.compensation as Record<string, unknown>) ||
    ((service as unknown as { compensation?: Record<string, unknown> }).compensation as Record<string, unknown>) ||
    {};

  const compensationEntries: [string, { action?: string; manual?: boolean }][] = Array.isArray(
    (rawCompensation as { rules?: unknown[] }).rules
  )
    ? ((rawCompensation as { rules: { trigger_condition?: string; rollback_action?: string; description?: string }[] }).rules.map(
      (r, idx) => [r.trigger_condition || `Règle #${idx + 1}`, { action: r.rollback_action, manual: false }]
    ))
    : Object.entries(rawCompensation as Record<string, { action?: string; manual?: boolean }>);

  const isActive = service.is_active ?? (service.status === "active");

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-6"
      >
        {/* Card 1 : Informations Générales */}
        <div className="glass-card rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/40 gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                <Layers className="h-5 w-5 text-accent" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">Informations Générales</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Caractéristiques principales du service
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer self-start sm:self-auto group"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span className="group-hover:underline">Retour aux services</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-1">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">{isContract ? "ID Contrat" : "ID Service"}</span>
              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground">
                <span className="truncate select-all">{service.id}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(service.id, "id")}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  title="Copier l'identifiant"
                >
                  {copiedKey === "id" ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {service.service_type && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Type de Service</span>
                <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground">
                  <span className="truncate select-all">{service.service_type}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(service.service_type!, "service_type")}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    title="Copier le type de service"
                  >
                    {copiedKey === "service_type" ? (
                      <Check className="h-3.5 w-3.5 text-accent" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {service.code && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">{isContract ? "Code Contrat" : "Code Service"}</span>
                <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground">
                  <span className="truncate select-all">{service.code}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(service.code, "code")}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    title="Copier le code"
                  >
                    {copiedKey === "code" ? (
                      <Check className="h-3.5 w-3.5 text-accent" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {service.owner_code && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Code Propriétaire</span>
                <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground">
                  <span className="truncate select-all">{service.owner_code}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(service.owner_code!, "owner_code")}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    title="Copier le code propriétaire"
                  >
                    {copiedKey === "owner_code" ? (
                      <Check className="h-3.5 w-3.5 text-accent" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Nom / Libellé</span>
              <p className="text-sm font-semibold text-foreground">{service.label}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Statut</span>
              <div>
                <Badge
                  variant="outline"
                  className={
                    isActive
                      ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs font-medium"
                      : "bg-muted text-muted-foreground border-border text-xs font-medium"
                  }
                >
                  {isActive ? "Actif" : "Inactif"}
                </Badge>
              </div>
            </div>

            {service.version && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Version</span>
                <p className="text-sm font-semibold font-mono text-foreground">v{service.version}</p>
              </div>
            )}

            {service.source_format && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Format source</span>
                <p className="text-sm font-semibold font-mono uppercase text-foreground">{service.source_format}</p>
              </div>
            )}

            {partner && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Partenaire Associé</span>
                <div>
                  <button
                    type="button"
                    onClick={() => navigate(`/partenaires/${partner.id}`)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer border border-accent/20"
                    title="Voir les détails du partenaire"
                  >
                    <span className="truncate max-w-[150px]">{partner.label}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                  </button>
                </div>
              </div>
            )}

            {service.description && (
              <div className="col-span-1 sm:col-span-2 lg:col-span-4 space-y-1 pt-3 border-t border-border/40">
                <span className="text-xs text-muted-foreground font-medium">Description</span>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {service.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card 2 : Spécification du Contrat ou Flux de paiement */}
        {isContract ? (
          <div className="glass-card rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/40 gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                  <Workflow className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Spécification du Contrat</h3>
                  <p className="text-xs text-muted-foreground">
                    {executionSteps.length} étape(s) • {preconditions.length} précondition(s) • {compensationEntries.length} règle(s) de compensation
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowRawDefinition(!showRawDefinition)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline cursor-pointer"
                  title="Afficher la définition JSON brute"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span>{showRawDefinition ? "Masquer JSON" : "Voir JSON"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload("yaml")}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>YAML</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload("json")}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>JSON</span>
                </button>
              </div>
            </div>

            {/* Visualiseur JSON brut (optionnel) */}
            {showRawDefinition && (
              <div className="rounded-lg border border-border/40 bg-muted/20 p-4 relative group animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/30">
                  <span className="text-xs font-mono font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Code2 className="h-3.5 w-3.5 text-accent" /> Définition brute ({service.source_format?.toUpperCase() || "JSON"})
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(JSON.stringify(definition, null, 2), "raw_def")}
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline cursor-pointer"
                  >
                    {copiedKey === "raw_def" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedKey === "raw_def" ? "Copié !" : "Copier"}</span>
                  </button>
                </div>
                <pre className="text-xs font-mono text-foreground/90 overflow-x-auto max-h-80 p-2 leading-relaxed select-all">
                  {JSON.stringify(definition, null, 2)}
                </pre>
              </div>
            )}

            {/* Section A : Étapes d'Exécution */}
            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Workflow className="h-4 w-4 text-accent" /> Étapes d&apos;Exécution ({executionSteps.length})
              </span>
              {executionSteps.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  Aucune étape d&apos;exécution explicite configurée.
                </p>
              ) : (
                <div className="rounded-lg border border-border/40 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/40 bg-muted/20">
                        <TableHead className="w-12 text-xs font-medium">N°</TableHead>
                        <TableHead className="text-xs font-medium">Étape (step)</TableHead>
                        <TableHead className="text-xs font-medium">Compte (account)</TableHead>
                        <TableHead className="text-xs font-medium">Montant (amount)</TableHead>
                        <TableHead className="text-xs font-medium">Compte Frais (fee_account)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {executionSteps.map((step, idx) => {
                        const stepObj = step as Record<string, unknown>;
                        const stepName = String(step.step || stepObj.name || `Étape ${idx + 1}`);
                        const accountVal = step.account || step.from_account || step.to_account;
                        return (
                          <TableRow key={idx} className="border-border/30 hover:bg-muted/10">
                            <TableCell className="font-mono text-xs font-bold text-accent">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="font-mono font-semibold text-xs text-foreground">
                              <span>{stepName}</span>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {accountVal ? (
                                <span className="font-mono text-xs">{String(accountVal)}</span>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-foreground font-medium">
                              {step.amount ? (
                                <Badge variant="secondary" className="font-mono text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                                  {String(step.amount)}
                                </Badge>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {step.fee_account ? (
                                <Badge variant="outline" className="font-mono text-xs font-semibold">
                                  {String(step.fee_account)}
                                </Badge>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Section B & C : Préconditions & Compensation côte-à-côte */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-3 border-t border-border/40">
              {/* Préconditions */}
              <div className="space-y-2.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-accent" /> Préconditions ({preconditions.length})
                </span>
                {preconditions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    Aucune précondition configurée.
                  </p>
                ) : (
                  <div className="rounded-lg border border-border/40 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-border/40 bg-muted/20">
                          <TableHead className="text-xs font-medium">Règle (rule)</TableHead>
                          <TableHead className="text-xs font-medium">Compte (account)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preconditions.map((prec, idx) => {
                          const precObj = prec as Record<string, unknown>;
                          const ruleCode = String(prec.rule || precObj.type || `Règle #${idx + 1}`);
                          const desc = String(prec.expression || precObj.description || "");
                          return (
                            <TableRow key={idx} className="border-border/30 hover:bg-muted/10">
                              <TableCell className="text-xs font-semibold text-accent">
                                <div className="space-y-0.5">
                                  <span className="font-mono">{ruleCode}</span>
                                  {desc && (
                                    <p className="font-normal text-[11px] text-muted-foreground font-mono">{desc}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {prec.account ? (
                                  <span className="font-mono text-xs">{String(prec.account)}</span>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Compensation */}
              <div className="space-y-2.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Undo2 className="h-4 w-4 text-accent" /> Compensation ({compensationEntries.length})
                </span>
                {compensationEntries.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    Aucune règle de compensation configurée.
                  </p>
                ) : (
                  <div className="rounded-lg border border-border/40 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-border/40 bg-muted/20">
                          <TableHead className="text-xs font-medium">Étape (step)</TableHead>
                          <TableHead className="text-xs font-medium">Action (action)</TableHead>
                          <TableHead className="text-xs font-medium">Manuel (manual)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {compensationEntries.map(([stepKey, compRule]) => (
                          <TableRow key={stepKey} className="border-border/30 hover:bg-muted/10">
                            <TableCell className="font-mono text-xs font-semibold text-foreground">
                              {stepKey}
                            </TableCell>
                            <TableCell className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
                              <Badge variant="outline" className="font-mono text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10">
                                {compRule.action || "REVERSE"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {compRule.manual ? (
                                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30 bg-amber-500/10 font-mono">
                                  true
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs font-mono">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Card 2 pour Service Standard : Flux de paiement */
          <div className="glass-card rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                  <Coins className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Flux de Paiement Associé</h3>
                  <p className="text-xs text-muted-foreground">
                    {paymentFlows.length === 0
                      ? "Aucun flux configuré"
                      : "Flux configuré"}
                  </p>
                </div>
              </div>
              {!loadingFlows && paymentFlows.length === 0 && (
                <Button
                  size="sm"
                  onClick={handleOpenAddFlow}
                  className="gradient-accent text-accent-foreground text-xs h-8 gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Nouveau flux</span>
                </Button>
              )}
            </div>

            {loadingFlows ? (
              <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-accent" />
                <span>Chargement des flux de paiement...</span>
              </div>
            ) : paymentFlows.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground text-xs">
                  Aucun flux de paiement spécifique configuré pour ce service standard.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border/40 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/40 bg-muted/20">
                      <TableHead className="text-xs font-medium">ID Flux</TableHead>
                      <TableHead className="text-xs font-medium">Statut</TableHead>
                      <TableHead className="text-xs font-medium">Moyens Source (Débit)</TableHead>
                      <TableHead className="text-xs font-medium">Moyens Destination (Crédit)</TableHead>
                      <TableHead className="text-xs font-medium text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentFlows.map((flow) => {
                      const sourceIds = flow.source_payment_method_ids?.length
                        ? flow.source_payment_method_ids
                        : flow.source_payment_method_id
                        ? [flow.source_payment_method_id]
                        : [];

                      const destIds = flow.destination_payment_method_ids?.length
                        ? flow.destination_payment_method_ids
                        : flow.destination_payment_method_id
                        ? [flow.destination_payment_method_id]
                        : [];

                      return (
                        <TableRow key={flow.id} className="border-border/30 hover:bg-muted/10">
                          <TableCell className="font-mono text-xs font-semibold text-foreground">
                            {flow.id}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge
                              variant="outline"
                              className={
                                flow.is_enabled
                                  ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs font-medium"
                                  : "bg-muted text-muted-foreground border-border text-xs font-medium"
                              }
                            >
                              {flow.is_enabled ? "Actif" : "Inactif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {sourceIds.length === 0 ? (
                              <span className="text-muted-foreground text-xs">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {sourceIds.map((pmId) => {
                                  const pm = paymentMethodsMap.get(pmId);
                                  return (
                                    <Badge
                                      key={pmId}
                                      variant="secondary"
                                      className="font-medium text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                                      title={pm?.code ? `Code: ${pm.code} • ID: ${pmId}` : `ID: ${pmId}`}
                                    >
                                      {pm?.label || pm?.code || pmId}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {destIds.length === 0 ? (
                              <span className="text-muted-foreground text-xs">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {destIds.map((pmId) => {
                                  const pm = paymentMethodsMap.get(pmId);
                                  return (
                                    <Badge
                                      key={pmId}
                                      variant="secondary"
                                      className="font-medium text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                      title={pm?.code ? `Code: ${pm.code} • ID: ${pmId}` : `ID: ${pmId}`}
                                    >
                                      {pm?.label || pm?.code || pmId}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px] gap-1"
                                onClick={() => handleToggleFlowStatus(flow)}
                                disabled={togglingFlowId === flow.id}
                                title={flow.is_enabled ? "Désactiver le flux" : "Activer le flux"}
                              >
                                {togglingFlowId === flow.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-accent" />
                                ) : flow.is_enabled ? (
                                  <span className="text-muted-foreground hover:text-foreground">Désactiver</span>
                                ) : (
                                  <span className="text-emerald-600 hover:text-emerald-700 font-semibold">Activer</span>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => handleOpenEditFlow(flow)}
                                title="Modifier le flux"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setFlowToDelete(flow)}
                                title="Supprimer le flux"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Card 3 : Traçabilité & Audit */}
        <div className="glass-card rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-border/40">
            <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Traçabilité & Audit</h3>
              <p className="text-xs text-muted-foreground">
                Historique de création, versioning et mise à jour {isContract ? "du contrat" : "du service"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Date de création</span>
              <p className="text-sm font-semibold text-foreground font-mono">
                {formatDateTime(service.created_at || service.creation_date)}
              </p>
            </div>

            {service.updated_at && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Dernière mise à jour</span>
                <p className="text-sm font-semibold text-foreground font-mono">
                  {formatDateTime(service.updated_at)}
                </p>
              </div>
            )}

            {isContract && service.version_id && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">ID Version</span>
                <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground">
                  <span className="truncate select-all" title={service.version_id || "—"}>
                    {service.version_id || "—"}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(service.version_id!, "version_id")}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    title="Copier l'ID de version"
                  >
                    {copiedKey === "version_id" ? (
                      <Check className="h-3.5 w-3.5 text-accent" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {isContract && service.aggregate_version != null && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Version d&apos;Agrégat</span>
                <p className="text-sm font-semibold font-mono text-foreground">
                  v{service.aggregate_version}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Modal de création / modification d'un flux de paiement */}
      <ServicePaymentFlowDialog
        open={flowDialogOpen}
        onOpenChange={setFlowDialogOpen}
        service={service}
        flowToEdit={flowToEdit}
        paymentMethods={paymentMethods}
        onSuccess={loadFlows}
      />

      {/* Dialogue de confirmation de suppression */}
      <AlertDialog
        open={Boolean(flowToDelete)}
        onOpenChange={(open) => !open && setFlowToDelete(null)}
      >
        <AlertDialogContent className="rounded-2xl overflow-hidden">
          {isDeletingFlow && <LoadingOverlay title="Suppression en cours..." />}
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce flux de paiement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement le flux de paiement pour ce service.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingFlow}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteFlow}
              disabled={isDeletingFlow}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ServiceDetailPage;
