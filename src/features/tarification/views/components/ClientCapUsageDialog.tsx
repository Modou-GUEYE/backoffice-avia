import React, { useState, useEffect, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  AlertCircle,
  Calendar,
  CreditCard,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/core/network/errorUtils";
import { fetchClientCapUsage } from "../../services/capsService";
import { ClientCapUsage, CatalogServiceItem } from "../../models/types";
import { fetchStructures, extractStructuresList } from "@/features/structures/services/structuresService";
import { useAuthStore, getCurrentInstitutionId, getCurrentInstitutionLabel } from "@/core/security/authStore";
import { FieldError, hasFieldErrors, invalidFieldProps, useFieldErrors } from "@/shared/forms/fieldErrors";
import { ClientCapUsageField, validateClientCapUsageLookup } from "../../models/validation";

interface ClientCapUsageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  structures?: { id: string; name: string }[];
  catalogServices?: CatalogServiceItem[];
  initialClientId?: string;
  initialStructureId?: string;
  onGrantOverride?: (clientId: string, structureId: string) => void;
}

export const ClientCapUsageDialog: React.FC<ClientCapUsageDialogProps> = ({
  open,
  onOpenChange,
  structures = [],
  catalogServices = [],
  initialClientId = "",
  initialStructureId = "",
  onGrantOverride,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const isStructureAdmin = currentUser?.entityContext === "Structure";
  const userStructureId = getCurrentInstitutionId();
  const userStructureLabel = getCurrentInstitutionLabel();

  const [loadedStructures, setLoadedStructures] = useState<{ id: string; name: string }[]>(structures);
  const [clientId, setClientId] = useState(initialClientId);
  const [structureId, setStructureId] = useState(
    isStructureAdmin && userStructureId
      ? userStructureId
      : initialStructureId || structures[0]?.id || ""
  );

  const [usageList, setUsageList] = useState<ClientCapUsage[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Erreur renvoyée par l'API (les erreurs de saisie sont affichées sous les champs)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    errors: fieldErrors,
    setErrors: setFieldErrors,
    clearError: clearFieldError,
    resetErrors: resetFieldErrors,
  } = useFieldErrors<ClientCapUsageField>();

  useEffect(() => {
    if (isStructureAdmin && userStructureId) {
      setStructureId(userStructureId);
      return;
    }
    if (structures.length > 0) {
      setLoadedStructures(structures);
      if (!structureId) setStructureId(initialStructureId || structures[0].id);
    } else if (open) {
      fetchStructures()
        .then((res) => {
          const list = extractStructuresList(res);
          setLoadedStructures(list);
          if (list.length > 0 && !structureId) {
            setStructureId(initialStructureId || list[0].id);
          }
        })
        .catch((e) => console.error("Erreur chargement structures", e));
    }
  }, [structures, open, isStructureAdmin, userStructureId, structureId, initialStructureId]);

  const effectiveStructureId = isStructureAdmin && userStructureId ? userStructureId : structureId;

  const handleConsult = useCallback(
    async (targetClientId?: string, targetStructId?: string) => {
      const cId = (targetClientId !== undefined ? targetClientId : clientId).trim();
      const sId = targetStructId !== undefined ? targetStructId : effectiveStructureId;

      const validationErrors = validateClientCapUsageLookup({ clientId: cId, structureId: sId });
      setFieldErrors(validationErrors);
      if (hasFieldErrors(validationErrors)) return;

      setErrorMessage(null);
      setIsLoading(true);

      try {
        const data = await fetchClientCapUsage(cId, sId);
        setUsageList(data);
        if (data.length === 0) {
          toast.info("Aucune consommation enregistrée pour ce client.");
        }
      } catch (err: unknown) {
        const msg = getErrorMessage(err, "Impossible de charger la consommation cumulée");
        setErrorMessage(msg);
        setUsageList(null);
      } finally {
        setIsLoading(false);
      }
    },
    [clientId, effectiveStructureId, setFieldErrors]
  );

  useEffect(() => {
    if (open) {
      if (initialClientId) {
        setClientId(initialClientId);
        const sId = isStructureAdmin && userStructureId ? userStructureId : initialStructureId || structureId;
        if (sId) {
          void handleConsult(initialClientId, sId);
        }
      }
    } else {
      setErrorMessage(null);
      resetFieldErrors();
      setUsageList(null);
      if (!initialClientId) setClientId("");
    }
  }, [open, initialClientId, initialStructureId, isStructureAdmin, userStructureId, handleConsult, structureId, resetFieldErrors]);

  // Calculations for totals
  const totalDaily = usageList
    ? usageList.reduce((acc, u) => acc + (Number(u.daily_total) || 0), 0)
    : 0;
  const totalMonthly = usageList
    ? usageList.reduce((acc, u) => acc + (Number(u.monthly_total) || 0), 0)
    : 0;

  const getServiceLabel = (serviceCode: string) => {
    const found = catalogServices.find((s) => s.code === serviceCode);
    return found?.label || serviceCode;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/15 text-accent border border-accent/25 shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Consommation cumulée du client
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Consultez la consommation cumulée en temps réel avant d&apos;accorder une dérogation de plafond
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Filter / Search Bar */}
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
            <div className="sm:col-span-6 space-y-1.5">
              <Label className="text-xs font-semibold">
                Identifiant du client <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Ex: client-uuid ou code client"
                {...invalidFieldProps(fieldErrors.clientId, "h-9 text-xs font-mono")}
                value={clientId}
                onChange={(e) => {
                  clearFieldError("clientId");
                  setClientId(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleConsult();
                  }
                }}
                disabled={isLoading}
              />
              <FieldError message={fieldErrors.clientId} />
            </div>

            <div className="sm:col-span-4 space-y-1.5">
              <Label className="text-xs font-semibold">
                Structure <span className="text-destructive">*</span>
              </Label>
              {isStructureAdmin ? (
                <div className="flex items-center h-9 px-3 rounded-md border bg-muted/40 text-xs font-medium text-foreground truncate">
                  <Badge className="mr-1.5 text-[9px] pointer-events-none bg-accent/15 text-accent border border-accent/25">
                    Structure
                  </Badge>
                  <span className="truncate">{userStructureLabel || userStructureId || "Ma structure"}</span>
                </div>
              ) : (
                <Select
                  value={structureId}
                  onValueChange={(value) => {
                    clearFieldError("structureId");
                    setStructureId(value);
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger {...invalidFieldProps(fieldErrors.structureId, "h-9 text-xs")}>
                    <SelectValue placeholder="Choisir une structure..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loadedStructures.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FieldError message={fieldErrors.structureId} />
            </div>

            {/* Décalé de la hauteur du libellé pour rester aligné sur les champs */}
            <div className="sm:col-span-2 sm:mt-[1.375rem]">
              <Button
                type="button"
                onClick={() => void handleConsult()}
                disabled={isLoading}
                className="w-full h-9 text-xs gradient-accent text-accent-foreground hover:opacity-90 gap-1.5 font-medium"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5" />
                )}
                <span>Consulter</span>
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in-50">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Result Content */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3 text-muted-foreground">
              <Loader2 className="h-7 w-7 text-accent animate-spin" />
              <p className="text-xs">Récupération de la consommation cumulée du client...</p>
            </div>
          ) : usageList !== null ? (
            <div className="space-y-4 pt-1">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/50 bg-background/50 p-4 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-medium">Cumulé Journalier Total</span>
                    <Wallet className="h-4 w-4 text-accent" />
                  </div>
                  <p className="text-xl font-bold font-mono text-foreground">
                    {totalDaily.toLocaleString("fr-FR")} <span className="text-xs font-sans font-normal text-muted-foreground">FCFA</span>
                  </p>
                </div>

                <div className="rounded-xl border border-border/50 bg-background/50 p-4 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-medium">Cumulé Mensuel Total</span>
                    <CreditCard className="h-4 w-4 text-accent" />
                  </div>
                  <p className="text-xl font-bold font-mono text-foreground">
                    {totalMonthly.toLocaleString("fr-FR")} <span className="text-xs font-sans font-normal text-muted-foreground">FCFA</span>
                  </p>
                </div>
              </div>

              {/* Table per service */}
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <div className="bg-muted/40 px-4 py-2.5 border-b border-border/40 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    Détail de la consommation par service
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {usageList.length} service{usageList.length > 1 ? "s" : ""} enregistré{usageList.length > 1 ? "s" : ""}
                  </span>
                </div>

                {usageList.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    Aucune consommation enregistrée pour ce client sur cette structure.
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/20">
                      <TableRow>
                        <TableHead className="text-xs font-semibold">Service</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Consommé Jour</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Consommé Mois</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Date Réf.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageList.map((u, idx) => (
                        <TableRow key={u.id || `${u.service_type}-${idx}`}>
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] font-mono font-semibold">
                                {u.service_type}
                              </Badge>
                              <span className="text-xs font-medium text-foreground">
                                {getServiceLabel(u.service_type)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-2.5 font-mono text-xs font-bold text-foreground">
                            {Number(u.daily_total).toLocaleString("fr-FR")} FCFA
                          </TableCell>
                          <TableCell className="text-right py-2.5 font-mono text-xs font-bold text-foreground">
                            {Number(u.monthly_total).toLocaleString("fr-FR")} FCFA
                          </TableCell>
                          <TableCell className="text-center py-2.5 text-xs text-muted-foreground font-mono">
                            {u.reference_date || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-xl p-8 text-center space-y-2 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <p className="text-xs font-medium text-foreground">
                Aucune consultation en cours
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Indiquez l&apos;identifiant du client et la structure pour obtenir la consommation cumulée instantanée.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 gap-2 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Fermer
          </Button>

          {onGrantOverride && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (!clientId.trim()) {
                  setFieldErrors(validateClientCapUsageLookup({ clientId, structureId: effectiveStructureId }));
                  return;
                }
                onGrantOverride(clientId.trim(), effectiveStructureId);
              }}
              className="gradient-accent text-accent-foreground text-xs hover:opacity-90 gap-1.5"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Accorder une dérogation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default ClientCapUsageDialog;
