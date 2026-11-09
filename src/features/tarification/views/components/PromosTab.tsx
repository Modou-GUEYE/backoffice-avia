import React from "react";
import { Plus, Eye, Pencil, Trash2, Tag, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import { usePromos } from "../../viewmodels/usePromos";
import { ServiceType, TenantLevel } from "../../models/types";
import { PromoDetailPage } from "../PromoDetailPage";
import { formatPromoDiscount } from "./promoFormatters";

interface PromosTabProps {
  vm: ReturnType<typeof usePromos>;
}

export const PromosTab: React.FC<PromosTabProps> = ({ vm }) => {
  const getTargetEntityLabel = (level: TenantLevel, tenantId: string | null) => {
    if (level === "GLOBAL") return "Global";
    if (level === "STRUCTURE") {
      return vm.structures.find((s) => s.id === tenantId)?.name || tenantId || "Structure";
    }
    if (level === "AGENCY") {
      return vm.activeAgencies.find((a) => a.id === tenantId)?.name || tenantId || "Agence";
    }
    if (level === "DISTRIBUTEUR") {
      return vm.distributors.find((d) => d.id === tenantId)?.nom || tenantId || "Distributeur";
    }
    return tenantId || "—";
  };

  const getServiceLabel = (serviceCode?: string | null) => {
    if (!serviceCode) return "TOUS";
    const found = vm.catalogServices?.find((s) => s.code === serviceCode);
    return found ? found.label : serviceCode;
  };

  if (vm.detailItem) {
    return (
      <div className="space-y-6">
        <PromoDetailPage
          item={vm.detailItem}
          onBack={() => vm.setDetailItem(null)}
          catalogServices={vm.catalogServices}
          structures={vm.structures}
          distributors={vm.distributors}
          activeAgencies={vm.activeAgencies}
          feeGrids={vm.feeGrids}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Tag className="h-5 w-5 text-accent" />
            Gestion des Promotions & Remises
          </h3>
          <p className="text-muted-foreground text-xs">
            Configurez les codes promotionnels et réductions temporaires applicables sur les grilles tarifaires.
          </p>
        </div>
        <Button
          onClick={vm.openCreateDialog}
          className="gradient-accent text-accent-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4 mr-2" /> Nouvelle Promotion
        </Button>
      </div>

      {/* Filter controls */}
      <div className="glass-card rounded-xl p-4 border border-border/40 bg-background/40">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Niveau :
            </span>
            <Select
              value={vm.filterLevel}
              onValueChange={(v) => vm.setFilterLevel(v as TenantLevel)}
            >
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GLOBAL" className="text-xs">GLOBAL</SelectItem>
                <SelectItem value="STRUCTURE" className="text-xs">STRUCTURE</SelectItem>
                <SelectItem value="DISTRIBUTEUR" className="text-xs">DISTRIBUTEUR</SelectItem>
                <SelectItem value="AGENCY" className="text-xs">AGENCY</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {vm.filterLevel !== "GLOBAL" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Entité :
              </span>
              <Select
                value={vm.filterTenantId || "__all__"}
                onValueChange={(v) => vm.setFilterTenantId(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="h-8 text-xs w-48">
                  <SelectValue placeholder="Toutes les entités" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="text-xs">Toutes les entités</SelectItem>
                  {vm.filterLevel === "STRUCTURE" &&
                    vm.structures.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                    ))}
                  {vm.filterLevel === "DISTRIBUTEUR" &&
                    vm.distributors.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">{d.nom}</SelectItem>
                    ))}
                  {vm.filterLevel === "AGENCY" &&
                    vm.activeAgencies.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>
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
              onValueChange={(v) => vm.setFilterServiceType(v === "__all__" ? "" : (v as ServiceType))}
            >
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue placeholder="Tous les services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">Tous les services</SelectItem>
                {vm.catalogServices?.map((s) => (
                  <SelectItem key={s.id || s.code} value={s.code} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
                {vm.filterServiceType &&
                  vm.catalogServices &&
                  !vm.catalogServices.some((s) => s.code === vm.filterServiceType) && (
                    <SelectItem value={vm.filterServiceType} className="text-xs">
                      {vm.filterServiceType}
                    </SelectItem>
                  )}
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
              <TableHead className="text-xs font-bold">Code Promo</TableHead>
              <TableHead className="text-xs font-bold">Niveau</TableHead>
              <TableHead className="text-xs font-bold">Entité Cible</TableHead>
              <TableHead className="text-xs font-bold">Service</TableHead>
              <TableHead className="text-xs font-bold">Remise</TableHead>
              <TableHead className="text-xs font-bold">Période de Validité</TableHead>
              <TableHead className="text-xs font-bold text-center">Statut</TableHead>
              <TableHead className="text-xs font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vm.isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-xs text-muted-foreground">
                  Chargement des promotions...
                </TableCell>
              </TableRow>
            ) : vm.promos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-xs text-muted-foreground">
                  Aucune promotion configurée pour ces filtres.
                </TableCell>
              </TableRow>
            ) : (
              vm.promos.map((item) => {
                const isExpired = new Date(item.end_date) < new Date();
                return (
                  <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="text-xs">
                      <span className="font-mono font-bold text-foreground uppercase tracking-wider">
                        {item.code}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge className="text-[9px] font-bold uppercase tracking-wider pointer-events-none bg-muted/80 text-muted-foreground border border-border">
                        {item.tenant_level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground py-3">
                      {getTargetEntityLabel(item.tenant_level, item.tenant_id)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge className="text-[10px] font-bold uppercase pointer-events-none bg-accent/15 text-accent border border-accent/25">
                        {getServiceLabel(item.service_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPromoDiscount(item.fixed_amount, item.rate_amount)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">
                          {new Date(item.start_date).toLocaleDateString("fr-FR")} → {new Date(item.end_date).toLocaleDateString("fr-FR")}
                        </span>
                        {isExpired && (
                          <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                            Expiré
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={() => vm.handleToggleStatus(item)}
                        aria-label="Activer ou désactiver la promotion"
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>


      {/* Confirmation de suppression */}
      <ConfirmDialog
        open={!!vm.deleteConfirmId}
        onOpenChange={(open) => !open && vm.setDeleteConfirmId(null)}
        title="Supprimer la promotion"
        description="Êtes-vous sûr de vouloir supprimer définitivement cette promotion ?"
        confirmLabel="Supprimer"
        confirmVariant="destructive"
        onConfirm={() => vm.deleteConfirmId && vm.handleDelete(vm.deleteConfirmId)}
      />
    </div>
  );
};
