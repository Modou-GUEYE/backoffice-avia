import React from "react";
import { Plus, Eye, Pencil, Trash2, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import { CommissionDetailPage } from "../CommissionDetailPage";
import { useCommissions } from "../../viewmodels/useCommissions";
import { ServiceType, TenantLevel } from "../../models/types";

interface CommissionsTabProps {
  vm: ReturnType<typeof useCommissions>;
}

export const CommissionsTab: React.FC<CommissionsTabProps> = ({ vm }) => {
  const getTargetEntityLabel = (level: string, id?: string | null) => {
    if (level === "GLOBAL" || !id) return "GLOBAL";
    if (level === "STRUCTURE") {
      const s = vm.structures.find((st) => st.id === id);
      return s ? s.name : id;
    }
    if (level === "PRODUCT") {
      const p = vm.products.find((pr) => pr.id === id);
      return p ? p.nom : id;
    }
    if (level === "DISTRIBUTEUR") {
      const d = vm.distributors.find((di) => di.id === id);
      return d ? d.nom : id;
    }
    if (level === "AGENCY") {
      const a = vm.activeAgencies.find((ag) => ag.id === id);
      return a ? a.name : id;
    }
    return id;
  };

  const getServiceLabel = (serviceCode: string) => {
    const found = vm.catalogServices?.find((s) => s.code === serviceCode);
    return found ? found.label : serviceCode;
  };

  if (vm.detailItem) {
    return (
      <div className="space-y-6">
        <CommissionDetailPage
          item={vm.detailItem}
          onBack={() => vm.setDetailItem(null)}
          catalogServices={vm.catalogServices}
          products={vm.products}
          structures={vm.structures}
          distributors={vm.distributors}
          activeAgencies={vm.activeAgencies}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <PieChart className="h-5 w-5 text-accent" />
            Répartition des Commissions
          </h3>
          <p className="text-muted-foreground text-xs">
            Configurez la ventilation des quotes-parts de commission par niveau et type de service.
          </p>
        </div>
        <Button
          onClick={vm.openCreateDialog}
          className="gradient-accent text-accent-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4 mr-2" /> Nouvelle Répartition
        </Button>
      </div>

      {/* Filter controls */}
      <div className="glass-card rounded-xl p-4 border border-border/40 bg-background/40">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Niveau :
              </span>
              <Select
                value={vm.filterLevel}
                onValueChange={(v) => vm.setFilterLevel(v as "ALL" | "PRODUCT" | "STRUCTURE")}
              >
                <SelectTrigger className="h-8 text-xs w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs font-medium">
                    Toutes
                  </SelectItem>
                  <SelectItem value="PRODUCT" className="text-xs font-medium">
                    PRODUIT
                  </SelectItem>
                  <SelectItem value="STRUCTURE" className="text-xs font-medium">
                    STRUCTURE
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {vm.filterLevel === "PRODUCT" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Produit :
                </span>
                <Select
                  value={vm.filterTenantId}
                  onValueChange={(v) => vm.setFilterTenantId(v)}
                >
                  <SelectTrigger className="h-8 text-xs w-52">
                    <SelectValue placeholder="Sélectionner un produit..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vm.products.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {vm.filterLevel === "STRUCTURE" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Structure :
                </span>
                <Select
                  value={vm.filterTenantId}
                  onValueChange={(v) => vm.setFilterTenantId(v)}
                >
                  <SelectTrigger className="h-8 text-xs w-52">
                    <SelectValue placeholder="Sélectionner une structure..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vm.structures.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {s.name || s.code || s.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Service :
              </span>
              <Select
                value={vm.filterServiceType || "__all__"}
                onValueChange={(v) => vm.setFilterServiceType(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="h-8 text-xs w-48">
                  <SelectValue placeholder="Tous les services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="text-xs">
                    Tous les services
                  </SelectItem>
                  {vm.catalogServices?.map((s) => (
                    <SelectItem key={s.id || s.code} value={s.code} className="text-xs">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

      {/* Table */}
      <div className="glass-card rounded-xl border border-border/40 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs font-bold">Niveau / Cible</TableHead>
              <TableHead className="text-xs font-bold">Service</TableHead>
              <TableHead className="text-xs font-bold">Phase</TableHead>
              <TableHead className="text-xs font-bold">Structure</TableHead>
              <TableHead className="text-xs font-bold" title="Taxe sur chiffre d'affaires">TCA Struct.</TableHead>
              <TableHead className="text-xs font-bold">Groupement</TableHead>
              <TableHead className="text-xs font-bold">Partenaire Tech.</TableHead>
              <TableHead className="text-xs font-bold">Distributeur</TableHead>
              <TableHead className="text-xs font-bold text-center">Statut</TableHead>
              <TableHead className="text-xs font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vm.isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-xs text-muted-foreground">
                  Chargement des grilles de commission...
                </TableCell>
              </TableRow>
            ) : vm.commissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-xs text-muted-foreground">
                  Aucune répartition de commission configurée pour ces filtres.
                </TableCell>
              </TableRow>
            ) : (
              vm.commissions.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-foreground">
                        {getTargetEntityLabel(item.tenant_level, item.tenant_id)}
                      </span>
                      <Badge className="w-fit text-[9px] font-bold uppercase pointer-events-none bg-muted text-muted-foreground border">
                        {item.tenant_level}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge className="text-[10px] font-bold uppercase pointer-events-none bg-accent/15 text-accent border border-accent/25">
                      {getServiceLabel(item.service_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge className="text-[10px] font-semibold uppercase pointer-events-none bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      {item.phase}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                    {item.rate_structure}%
                  </TableCell>
                  <TableCell className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {item.rate_tca_structure}%
                  </TableCell>
                  <TableCell className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                    {item.rate_groupement}%
                  </TableCell>
                  <TableCell className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {item.rate_partenaire_technique}%
                  </TableCell>
                  <TableCell className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                    {item.rate_distributeur}%
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => vm.handleToggleStatus(item)}
                      aria-label="Activer ou désactiver la répartition"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => vm.openDetailDialog(item)}
                        title="Voir le détail"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-accent"
                        onClick={() => vm.openEditDialog(item)}
                        title="Modifier"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => vm.setDeleteConfirmId(item.id)}
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation de suppression */}
      <ConfirmDialog
        open={!!vm.deleteConfirmId}
        onOpenChange={(open) => !open && vm.setDeleteConfirmId(null)}
        title="Supprimer la répartition de commission"
        description="Êtes-vous sûr de vouloir supprimer définitivement cette règle de répartition de commission ?"
        confirmLabel="Supprimer"
        confirmVariant="destructive"
        onConfirm={() => vm.deleteConfirmId && vm.handleDelete(vm.deleteConfirmId)}
      />
    </div>
  );
};
