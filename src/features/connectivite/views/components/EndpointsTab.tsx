import { useState } from "react";
import { Search, Pencil, Plus, Trash2, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import type { useConnectivite } from "../../viewmodels/useConnectivite";
import type { ConnectivitePermissions } from "../../models/permissions";

type ConnectiviteVm = ReturnType<typeof useConnectivite>;
type EndpointRow = Parameters<ConnectiviteVm["handleDeleteOverride"]>[0];

/** Valeur du sélecteur sans filtre : tous les moyens (Radix interdit la valeur vide) */
const ALL_PAYMENT_METHODS = "__ALL__";

interface EndpointsTabProps {
  vm: ConnectiviteVm;
  perms: ConnectivitePermissions["endpoint"];
}

export const EndpointsTab = ({ vm, perms }: EndpointsTabProps) => {
  const [deleteTarget, setDeleteTarget] = useState<{ row: EndpointRow; kind: "override" | "default" } | null>(null);
  const isStructureLevel = vm.selectedStructureId !== "GLOBAL_DEFAULTS";
  const paymentMethodCode = vm.selectedPaymentMethodCode;

  const paymentMethodSelect = (
    <Select
      value={paymentMethodCode || ALL_PAYMENT_METHODS}
      onValueChange={(v) => vm.setSelectedPaymentMethodCode(v === ALL_PAYMENT_METHODS ? "" : v)}
    >
      <SelectTrigger className="h-9 w-[230px] text-xs bg-background border-border/60 rounded-lg shadow-sm" aria-label="Moyen de paiement">
        <SelectValue placeholder="Moyen de paiement" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_PAYMENT_METHODS} className="text-xs">Tous les moyens de paiement</SelectItem>
        {vm.paymentMethods.map((pm) => (
          <SelectItem key={pm.code} value={pm.code} className="text-xs">
            {pm.label || pm.code}
            {pm.is_active === false ? " (inactif)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (vm.isLoadingEndpoints) {
    return (
      <div className="text-center py-16 text-xs text-muted-foreground">
        Chargement des endpoints de connectivité...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/20 pb-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 max-w-2xl">
          {paymentMethodSelect}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/75" />
            <Input
              placeholder="Rechercher une opération ou une route..."
              className="pl-9 text-xs bg-background h-9 border-border/60 focus-visible:ring-accent/35 rounded-lg shadow-sm"
              value={vm.searchQuery}
              onChange={(e) => vm.setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <span className="text-xs text-muted-foreground font-semibold bg-muted/40 py-1.5 px-3.5 rounded-xl border border-border/40 shadow-sm shrink-0 self-end sm:self-auto">
          {vm.filteredEndpoints.length} opération(s)
        </span>
      </div>


      <div className="border border-border/50 rounded-xl overflow-hidden bg-card">
        <div className="max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10 border-b border-border/50 shadow-sm">
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="font-semibold text-xs py-3">Opération &amp; moyen de paiement</TableHead>
                <TableHead className="font-semibold text-xs py-3">Méthode / Type</TableHead>
                <TableHead className="font-semibold text-xs py-3">Cible (URL ou Procédure)</TableHead>
                <TableHead className="font-semibold text-xs py-3">Niveau / Origine</TableHead>
                <TableHead className="font-semibold text-xs py-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vm.filteredEndpoints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 text-xs text-muted-foreground italic">
                    Aucune opération configurée ou trouvée.
                  </TableCell>
                </TableRow>
              ) : (
                vm.filteredEndpoints.map((row) => (
                  <TableRow key={`${row.operationCode}|${row.paymentMethodCode}`} className="border-border/30 hover:bg-muted/10 transition-colors">
                    <TableCell className="py-3">
                      <div className="space-y-0.5 max-w-[320px]">
                        <p className="text-xs font-semibold text-foreground">{row.operationName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">{row.operationCode}</p>
                        {row.paymentMethodCode && (
                          <Badge variant="outline" className="text-[9px] font-mono font-semibold py-0 px-1.5">
                            {row.paymentMethodCode}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      {row.isConfigured ? (
                        <Badge variant="outline" className={`text-[9px] font-mono font-bold py-0.5 px-2 uppercase tracking-wide border ${row.httpMethod === "GET" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : row.httpMethod === "POST" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : row.httpMethod === "PUT" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : row.httpMethod === "PROC" ? "bg-purple-500/10 text-purple-600 border-purple-500/30" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                          {row.httpMethod}
                        </Badge>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="font-mono text-xs text-foreground bg-muted/40 py-1 px-2.5 rounded-lg border border-border/40 inline-block truncate max-w-[350px]" title={row.pathPattern}>
                        {row.pathPattern}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      {vm.selectedStructureId === "GLOBAL_DEFAULTS" ? (
                        row.isConfigured
                          ? <Badge className="text-[8px] font-bold uppercase tracking-wider py-0.5 px-2 bg-blue-500/10 text-blue-500 border border-blue-500/20">Global (Défaut)</Badge>
                          : <Badge className="text-[8px] font-bold uppercase tracking-wider py-0.5 px-2 bg-red-500/10 text-red-500 border border-red-500/20">Non configuré</Badge>
                      ) : row.isOverridden ? (
                        <Badge className="text-[8px] font-bold uppercase tracking-wider py-0.5 px-2 bg-amber-500/10 text-amber-500 border border-amber-500/20">Spécifique structure</Badge>
                      ) : row.isConfigured ? (
                        <Badge className="text-[8px] font-bold uppercase tracking-wider py-0.5 px-2 bg-muted/80 text-muted-foreground border border-border">Hérité (Global)</Badge>
                      ) : (
                        <Badge className="text-[8px] font-bold uppercase tracking-wider py-0.5 px-2 bg-red-500/10 text-red-500 border border-red-500/20">Non configuré</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        {perms.test && isStructureLevel && row.isConfigured && (
                          <Button variant="ghost" size="icon" onClick={() => vm.handleTestEndpoint(row)} disabled={vm.isSavingEndpoint} className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600" title="Tester le câblage"><Play className="h-3.5 w-3.5" /></Button>
                        )}
                        {perms.delete && vm.selectedStructureId === "GLOBAL_DEFAULTS" && row.isConfigured && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ row, kind: "default" })} disabled={vm.isSavingEndpoint} className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" title="Supprimer l'endpoint par défaut"><Trash2 className="h-3.5 w-3.5" /></Button>
                        )}
                        {perms.delete && row.isOverridden && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ row, kind: "override" })} className="h-8 w-8 text-red-600 bg-red-500/10 border border-red-500/30 hover:bg-red-600 hover:text-white hover:border-red-600" title="Supprimer la surcharge (rétablir défaut)"><Trash2 className="h-3.5 w-3.5" /></Button>
                        )}
                        {perms.update && (
                        <Button variant="ghost" size="icon" onClick={() => vm.handleStartEditEndpoint(row)} className={`h-8 w-8 hover:bg-muted/20 ${row.isConfigured ? "text-muted-foreground hover:text-foreground" : "text-accent hover:text-accent-hover"}`} title={row.isConfigured ? "Modifier l'endpoint" : "Ajouter / Configurer l'endpoint"}>
                          {row.isConfigured ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-4 w-4" />}
                        </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget?.kind === "override" ? "Supprimer la surcharge" : "Supprimer l'endpoint par défaut"}
        description={
          deleteTarget?.kind === "override"
            ? `Supprimer la surcharge de « ${deleteTarget.row.operationName || deleteTarget.row.operationCode} » ? L'opération reprendra l'endpoint par défaut.`
            : `Supprimer définitivement l'endpoint par défaut de « ${deleteTarget?.row.operationName || deleteTarget?.row.operationCode} » ?`
        }
        confirmLabel="Supprimer"
        confirmVariant="destructive"
        onConfirm={() => {
          if (!deleteTarget) return;
          const { row, kind } = deleteTarget;
          setDeleteTarget(null);
          if (kind === "override") void vm.handleDeleteOverride(row);
          else void vm.handleDeleteDefaultEndpoint(row);
        }}
      />
    </div>
  );
};
