import { Search, Plus, Eye, Power, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { useConnectivite } from "../../viewmodels/useConnectivite";
import type { BankingOperationDef } from "../../models/types";
import type { ConnectivitePermissions } from "../../models/permissions";

type ConnectiviteVm = ReturnType<typeof useConnectivite>;

interface CatalogueTabProps {
  vm: ConnectiviteVm;
  filteredOperations: BankingOperationDef[];
  catalogSearch: string;
  setCatalogSearch: (v: string) => void;
  perms: ConnectivitePermissions["operation"];
}

export const CatalogueTab = ({
  vm,
  filteredOperations,
  catalogSearch,
  setCatalogSearch,
  perms,
}: CatalogueTabProps) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/20 pb-4">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/75" />
            <Input
              placeholder="Rechercher une opération..."
              className="pl-9 text-xs bg-background h-9 border-border/60 focus-visible:ring-accent/35 rounded-lg shadow-sm"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
            />
          </div>
          {!vm.isStructureAdmin && perms.create && (
            <Button
              onClick={vm.handleStartCreateOperation}
              className="gradient-accent text-accent-foreground hover:opacity-95 flex items-center gap-2 font-semibold shadow-sm text-xs h-9 rounded-lg transition-all duration-200 hover:shadow hover:-translate-y-0.5 active:translate-y-0 shrink-0"
            >
              <Plus className="h-4 w-4" /> Ajouter une opération
            </Button>
          )}
        </div>
        <span className="text-xs text-muted-foreground font-semibold bg-muted/40 py-1.5 px-3.5 rounded-xl border border-border/40 shadow-sm shrink-0">
          {filteredOperations.length} opération(s)
        </span>
      </div>

      <div className="border border-border/40 rounded-xl overflow-hidden shadow-sm bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[150px] text-xs font-semibold">Code</TableHead>
                <TableHead className="text-xs font-semibold">Libellé</TableHead>
                <TableHead className="w-[100px] text-xs font-semibold text-center">Statut</TableHead>
                {!vm.isStructureAdmin && (
                  <TableHead className="w-[100px] text-xs font-semibold text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOperations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-xs text-muted-foreground">
                    Aucune opération trouvée dans le catalogue.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOperations.map((op) => (
                  <TableRow key={op.code} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="py-3 font-mono text-xs font-bold text-foreground">{op.code}</TableCell>
                    <TableCell className="py-3 text-xs font-medium text-foreground">{op.label || op.code}</TableCell>
                    <TableCell className="py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${op.is_active ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-muted text-muted-foreground border"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${op.is_active ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                        {op.is_active ? "Actif" : "Inactif"}
                      </span>
                    </TableCell>
                    {!vm.isStructureAdmin && (
                      <TableCell className="py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {perms.read && <Button variant="ghost" size="icon" onClick={() => vm.handleOpenOperationDetail(op)} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Voir le détail"><Eye className="h-3.5 w-3.5" /></Button>}
                          {(op.is_active ? perms.deactivate : perms.activate) && <Button variant="ghost" size="icon" onClick={() => vm.handleToggleOperationStatus(op, !op.is_active)} className={`h-8 w-8 ${op.is_active ? "text-amber-500 hover:text-amber-600" : "text-emerald-600 hover:text-emerald-700"}`} title={op.is_active ? "Désactiver" : "Activer"}><Power className="h-3.5 w-3.5" /></Button>}
                          {perms.update && <Button variant="ghost" size="icon" onClick={() => vm.handleStartEditOperation(op)} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Modifier"><Pencil className="h-3.5 w-3.5" /></Button>}
                          {perms.delete && <Button variant="ghost" size="icon" onClick={() => vm.setOperationToDelete(op)} className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" title="Retirer du catalogue"><Trash2 className="h-3.5 w-3.5" /></Button>}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
