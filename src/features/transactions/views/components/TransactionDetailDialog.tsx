import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  XCircle,
  Circle,
} from "lucide-react";
import { TransactionDetailOut } from "../../models/types";

interface TransactionDetailDialogProps {
  transaction: TransactionDetailOut | null;
  loading: boolean;
  error: string | null;
  open: boolean;
  onClose: () => void;
}

const formatCurrency = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return "-";
  return (
    new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      maximumFractionDigits: 2,
    }).format(val) + " FCFA"
  );
};

const formatDate = (isoString: string | null | undefined): string => {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoString;
  }
};

const statutConfig = (statut: string) => {
  const s = statut?.toUpperCase() ?? "";
  if (["VALIDEE", "TERMINEE", "SUCCESS"].includes(s))
    return {
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />,
      label: "Validée",
      cls: "text-emerald-600 dark:text-emerald-400",
      dot: "bg-emerald-500",
    };
  if (["EN_ATTENTE", "INITIEE", "EN_COURS", "PENDING"].includes(s))
    return {
      icon: <Clock className="h-4 w-4 text-amber-500 shrink-0" />,
      label: "En cours",
      cls: "text-amber-600 dark:text-amber-400",
      dot: "bg-amber-500",
    };
  if (["ECHOUEE", "REJETEE", "FAILED", "ANNULEE"].includes(s))
    return {
      icon: <XCircle className="h-4 w-4 text-rose-500 shrink-0" />,
      label: "Échouée",
      cls: "text-rose-600 dark:text-rose-400",
      dot: "bg-rose-500",
    };
  return {
    icon: <Circle className="h-4 w-4 text-muted-foreground shrink-0" />,
    label: statut,
    cls: "text-muted-foreground",
    dot: "bg-muted-foreground",
  };
};

/** Affiche une ligne label/valeur uniquement si la valeur est non nulle */
const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) => {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-1 border-b border-border/30 last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  );
};

export const TransactionDetailDialog: React.FC<TransactionDetailDialogProps> = ({
  transaction,
  loading,
  error,
  open,
  onClose,
}) => {
  const hasQuoteparts =
    transaction?.quoteparts &&
    Object.keys(transaction.quoteparts).length > 0;

  const hasHistory =
    transaction?.raw_payloads && transaction.raw_payloads.length > 0;

  const statut = transaction ? statutConfig(transaction.statut) : null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0">

        {/* Header */}
        <DialogHeader className="p-5 pb-4 pr-14 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <ArrowLeftRight className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold">
                  Détail de la transaction
                </DialogTitle>
                {transaction && (
                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5 truncate">
                    {transaction.reference}
                  </p>
                )}
              </div>
            </div>
            {statut && (
              <div className={`flex items-center gap-1.5 text-xs font-medium shrink-0 ${statut.cls}`}>
                {statut.icon}
                {statut.label}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* States */}
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="h-6 w-1/3 bg-muted animate-pulse rounded" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-muted animate-pulse rounded" />
              <div className="h-16 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-32 bg-muted animate-pulse rounded" />
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={onClose}>
              Fermer
            </Button>
          </div>
        ) : !transaction ? null : (
          <div className="p-5 space-y-5">

            {/* KPI Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-muted/40 border border-border/60 text-xs">
              <div>
                <span className="text-muted-foreground block mb-0.5">Montant</span>
                <span className="font-bold text-sm text-foreground">
                  {formatCurrency(transaction.montant)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Frais</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(transaction.frais)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Opération</span>
                <span className="font-medium text-foreground capitalize">
                  {transaction.type_transaction}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Sens</span>
                <span className="font-medium text-foreground capitalize">
                  {transaction.sens || "-"}
                </span>
              </div>
            </div>

            {/* Anomalie / Rejet */}
            {(transaction.anomalie_ordre || transaction.motif_rejet) && (
              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Signalement sur cette opération</span>
                </div>
                {transaction.anomalie_ordre && (
                  <p className="text-muted-foreground pl-5">
                    <strong>Anomalie d&apos;ordre :</strong>{" "}
                    {transaction.anomalie_detail || "Détectée lors du rapprochement."}
                  </p>
                )}
                {transaction.motif_rejet && (
                  <p className="text-muted-foreground pl-5">
                    <strong>Motif de rejet :</strong> {transaction.motif_rejet}
                  </p>
                )}
              </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="flux" className="w-full">
              <TabsList
                className={`grid h-8 text-xs bg-muted/60 ${hasQuoteparts ? "grid-cols-3" : "grid-cols-2"
                  }`}
              >
                <TabsTrigger value="flux" className="text-xs">Flux</TabsTrigger>
                <TabsTrigger value="historique" className="text-xs">Historique</TabsTrigger>
                {hasQuoteparts && (
                  <TabsTrigger value="quoteparts" className="text-xs">Quote-parts</TabsTrigger>
                )}
              </TabsList>

              {/* Tab Flux */}
              <TabsContent value="flux" className="pt-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded border border-border/60 bg-card">
                    <span className="font-semibold text-foreground/90 block border-b border-border/40 pb-1 mb-2">
                      Parties prenantes
                    </span>
                    <InfoRow label="Initiateur" value={transaction.initiateur} />
                    <InfoRow label="Receveur" value={transaction.receveur} />
                    <InfoRow label="Agent" value={transaction.agent} />
                    <InfoRow label="Agence" value={transaction.agence} />
                    {!transaction.initiateur &&
                      !transaction.receveur &&
                      !transaction.agent &&
                      !transaction.agence && (
                        <p className="text-muted-foreground text-center py-2">—</p>
                      )}
                  </div>

                  <div className="p-3 rounded border border-border/60 bg-card">
                    <span className="font-semibold text-foreground/90 block border-b border-border/40 pb-1 mb-2">
                      Contexte
                    </span>
                    <InfoRow label="Moyen paiement" value={transaction.moyen_paiement} />
                    <InfoRow label="Canal" value={transaction.canal} />
                    <InfoRow label="Structure" value={transaction.structure} />
                    <InfoRow label="Distributeur" value={transaction.distributeur} />
                    <InfoRow label="Produit" value={transaction.produit} />
                  </div>
                </div>

                <div className="p-3 rounded border border-border/60 bg-card text-xs">
                  <span className="font-semibold text-foreground/90 block border-b border-border/40 pb-1 mb-2">
                    Dates
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground block">Initiation :</span>
                      <span className="font-mono text-foreground">
                        {formatDate(transaction.date_initiation)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Finalisation :</span>
                      <span className="font-mono text-foreground">
                        {formatDate(transaction.date_finalisation)}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab Historique (timeline des raw_payloads) */}
              <TabsContent value="historique" className="pt-3">
                {hasHistory ? (
                  <div className="relative pl-5">
                    <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border/60" />
                    <div className="space-y-3">
                      {(transaction.raw_payloads as Record<string, unknown>[]).map(
                        (evt, idx) => {
                          const evtStatut = String(evt.statut ?? "");
                          const cfg = statutConfig(evtStatut);
                          const evtDate = String(evt.date_evenement ?? "");
                          const isLast =
                            idx === (transaction.raw_payloads as unknown[]).length - 1;
                          return (
                            <div key={idx} className="relative flex gap-3">
                              <div
                                className={`absolute -left-5 top-1 h-3.5 w-3.5 rounded-full border-2 border-background ${cfg.dot} ${isLast ? `ring-2 ring-offset-1 ring-offset-background ring-${cfg.dot.replace("bg-", "")}` : ""
                                  }`}
                              />
                              <div className="flex-1 p-3 rounded border border-border/60 bg-card text-xs space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`font-semibold capitalize ${cfg.cls}`}>
                                    {evtStatut.toLowerCase()}
                                  </span>
                                  <span className="font-mono text-muted-foreground text-[11px]">
                                    {formatDate(evtDate)}
                                  </span>
                                </div>
                                {evt.montant !== undefined && (
                                  <div className="flex justify-between text-muted-foreground">
                                    <span>Montant</span>
                                    <span className="font-medium text-foreground">
                                      {formatCurrency(evt.montant as number)}
                                    </span>
                                  </div>
                                )}
                                {evt.frais !== undefined && (
                                  <div className="flex justify-between text-muted-foreground">
                                    <span>Frais</span>
                                    <span className="font-medium text-foreground">
                                      {formatCurrency(evt.frais as number)}
                                    </span>
                                  </div>
                                )}
                                {evt.receveur && (
                                  <div className="flex justify-between text-muted-foreground">
                                    <span>Receveur</span>
                                    <span className="font-medium text-foreground">
                                      {String(evt.receveur)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground bg-card rounded border border-border/60">
                    Aucun événement enregistré pour cette transaction.
                  </div>
                )}
              </TabsContent>

              {/* Tab Quote-parts (conditionnel) */}
              {hasQuoteparts && (
                <TabsContent value="quoteparts" className="pt-3">
                  <div className="p-3 rounded border border-border/60 bg-card text-xs">
                    {Object.entries(transaction.quoteparts!).map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0"
                      >
                        <span className="font-medium text-foreground/85 capitalize">
                          {k.replace(/_/g, " ")}
                        </span>
                        <span className="font-mono font-semibold text-foreground">
                          {typeof v === "number" ? formatCurrency(v) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
