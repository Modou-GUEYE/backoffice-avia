import React, { useMemo } from "react";
import { Plus, RefreshCw, Eye, Pencil, Trash2, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFees } from "../../viewmodels/useFees";
import { ServiceType, TenantLevel, FeeFilterLevel, FeeFilterService } from "../../models/types";
import { FeeDetailPage } from "../FeeDetailPage";

interface FeesTabProps {
  vm: ReturnType<typeof useFees>;
}

export const FeesTab: React.FC<FeesTabProps> = ({ vm }) => {
  const getTargetEntityLabel = (level: TenantLevel, tenantId: string | null) => {
    if (level === "GLOBAL") return "Global";
    if (level === "STRUCTURE") {
      const s = vm.structures.find((st) => st.id === tenantId);
      return s?.name || (s as { nom?: string })?.nom || tenantId || "Structure";
    }
    if (level === "AGENCY") {
      const a = vm.activeAgencies.find((ag) => ag.id === tenantId) || vm.agencies.find((ag) => ag.id === tenantId);
      return a?.name || (a as { nom?: string })?.nom || tenantId || "Agence";
    }
    if (level === "PRODUCT") {
      const p = vm.produitsOptions.find((pr) => pr.id === tenantId);
      return p?.nom || (p as { name?: string })?.name || tenantId || "—";
    }
    if (level === "DISTRIBUTEUR") {
      const d = vm.distributors.find((di) => di.id === tenantId);
      return d?.nom || (d as { name?: string })?.name || tenantId || "Distributeur";
    }
    return tenantId || "—";
  };

  if (vm.viewingItem) {
    return (
      <div className="space-y-6">
        <FeeDetailPage
          item={vm.viewingItem}
          onBack={() => {
            vm.setViewingItem(null);
            vm.setDetailOpen(false);
          }}
          catalogServices={vm.catalogServices}
          products={vm.produitsOptions}
          structures={vm.structures}
          distributors={vm.distributors}
          activeAgencies={vm.activeAgencies}
        />
      </div>
    );
  }

  const renderServiceSelect = () => (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Service :
      </span>
      <Select
        value={vm.selectedServiceType}
        onValueChange={(v) => vm.setSelectedServiceType(v as FeeFilterService)}
      >
        <SelectTrigger className="h-8 text-xs w-48">
          <SelectValue placeholder="Tous les services" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL" className="text-xs font-medium">
            Tous les services
          </SelectItem>
          {vm.catalogServices?.map((s) => (
            <SelectItem key={s.id || s.code} value={s.code} className="text-xs">
              {s.label || s.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Percent className="h-5 w-5 text-accent" />
            Gestion de la Tarification & Frais
          </h3>
          <p className="text-muted-foreground text-xs">
            Paramétrez les grilles tarifaires par produit pour les transactions.
          </p>
        </div>
        <Button
          onClick={vm.openAddFee}
          className="gradient-accent text-accent-foreground hover:opacity-90"
          disabled={vm.isProductAdmin && !vm.selectedProductId}
        >
          <Plus className="h-4 w-4 mr-2" /> Nouvelle règle de frais
        </Button>
      </div>

      {/* Filter controls */}
      <div className="glass-card rounded-xl p-4 border border-border/40 bg-background/40">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          {vm.isProductAdmin ? (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Produit :
                </span>
                <Select
                  value={vm.selectedProductId}
                  onValueChange={(v) => vm.setSelectedProductId(v)}
                >
                  <SelectTrigger className="h-8 text-xs w-52">
                    <SelectValue placeholder="Choisir un produit..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vm.produitsOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {renderServiceSelect()}
            </div>
          ) : vm.isStructureAdmin ? (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Niveau :
                </span>
                <Select
                  value={vm.filterLevel}
                  onValueChange={(v) => vm.handleFilterLevelChange(v as TenantLevel)}
                >
                  <SelectTrigger className="h-8 text-xs w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STRUCTURE" className="text-xs font-medium">STRUCTURE</SelectItem>
                    <SelectItem value="AGENCY" className="text-xs font-medium">AGENCE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {vm.filterLevel === "STRUCTURE" ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Structure :</span>
                  <Badge className="text-xs font-medium pointer-events-none bg-muted text-muted-foreground border border-border">
                    {vm.institutionLabel}
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agence :</span>
                  <Select
                    value={vm.filterTenantId}
                    onValueChange={(v) => vm.setFilterTenantId(v)}
                  >
                    <SelectTrigger className="h-8 text-xs w-56">
                      <SelectValue placeholder="Choisir une agence..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vm.activeAgencies.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {renderServiceSelect()}
            </div>
          ) : vm.isDistributorAdmin ? (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Niveau :
                </span>
                <Select
                  value={vm.filterLevel}
                  onValueChange={(v) => vm.handleFilterLevelChange(v as TenantLevel)}
                >
                  <SelectTrigger className="h-8 text-xs w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DISTRIBUTEUR" className="text-xs">DISTRIBUTEUR</SelectItem>
                    <SelectItem value="AGENCY" className="text-xs">AGENCE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {vm.filterLevel === "DISTRIBUTEUR" ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Distributeur :</span>
                  <Badge className="text-xs font-medium pointer-events-none bg-accent/15 text-accent border border-accent/25">
                    {vm.distributors.find((d) => d.id === vm.filterTenantId)?.nom || vm.filterTenantId}
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agence :</span>
                  <Select
                    value={vm.filterTenantId}
                    onValueChange={(v) => vm.setFilterTenantId(v)}
                  >
                    <SelectTrigger className="h-8 text-xs w-56">
                      <SelectValue placeholder="Choisir une agence..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vm.activeAgencies.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {renderServiceSelect()}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Niveau :
                </span>
                <Select
                  value={vm.filterLevel}
                  onValueChange={(v) => vm.handleFilterLevelChange(v as FeeFilterLevel)}
                >
                  <SelectTrigger className="h-8 text-xs w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GLOBAL" className="text-xs font-medium">GLOBAL</SelectItem>
                    <SelectItem value="STRUCTURE" className="text-xs font-medium">STRUCTURE</SelectItem>
                    <SelectItem value="PRODUCT" className="text-xs font-medium">PRODUIT</SelectItem>
                    <SelectItem value="DISTRIBUTEUR" className="text-xs font-medium">DISTRIBUTEUR</SelectItem>
                    <SelectItem value="AGENCY" className="text-xs font-medium">AGENCE</SelectItem>
                    <SelectItem value="ALL" className="text-xs font-medium">Toutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {vm.filterLevel === "STRUCTURE" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Structure :</span>
                  <Select
                    value={vm.filterTenantId}
                    onValueChange={(v) => vm.setFilterTenantId(v)}
                  >
                    <SelectTrigger className="h-8 text-xs w-52">
                      <SelectValue placeholder="Choisir une structure..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vm.structures.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.name || (s as { nom?: string }).nom || s.id} {s.code ? `(${s.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {vm.filterLevel === "PRODUCT" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Produit :</span>
                  <Select
                    value={vm.filterTenantId}
                    onValueChange={(v) => vm.setFilterTenantId(v)}
                  >
                    <SelectTrigger className="h-8 text-xs w-52">
                      <SelectValue placeholder="Choisir un produit..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vm.produitsOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.nom} {p.code ? `(${p.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {vm.filterLevel === "DISTRIBUTEUR" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Distributeur :</span>
                  <Select
                    value={vm.filterTenantId}
                    onValueChange={(v) => vm.setFilterTenantId(v)}
                  >
                    <SelectTrigger className="h-8 text-xs w-52">
                      <SelectValue placeholder="Choisir un distributeur..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vm.distributors.map((d) => (
                        <SelectItem key={d.id} value={d.id} className="text-xs">
                          {d.nom || (d as { name?: string }).name || d.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {vm.filterLevel === "AGENCY" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agence :</span>
                  <Select
                    value={vm.filterTenantId}
                    onValueChange={(v) => vm.setFilterTenantId(v)}
                  >
                    <SelectTrigger className="h-8 text-xs w-52">
                      <SelectValue placeholder="Choisir une agence..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vm.activeAgencies.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">
                          {a.name} {a.code ? `(${a.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {renderServiceSelect()}
            </div>
          )}
        </div>
      </div>

      {/* Fees grid table */}
      <div className="glass-card rounded-xl overflow-hidden border border-border/40 bg-background/40">
        {vm.isLoadingFees ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <RefreshCw className="h-8 w-8 text-accent animate-spin" />
            <p className="text-xs text-muted-foreground">Chargement de la grille tarifaire...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border/50">
                  <TableHead className="font-semibold text-xs text-muted-foreground">Service</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground">Niveau</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground">Entité Cible</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground">Borne Min (FCFA)</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground">Borne Max (FCFA)</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground">Statut</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vm.fees.map((fee) => (
                  <TableRow key={fee.id} className="border-border/30 hover:bg-muted/20 transition-colors">
                    <TableCell className="py-3">
                      <Badge className="bg-accent/10 text-accent hover:bg-accent/20 border-accent/20 uppercase text-[9px] font-bold">
                        {vm.catalogServices?.find((s) => s.code === fee.service_type)?.label || fee.service_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge className="text-[9px] font-bold uppercase tracking-wider pointer-events-none bg-muted/80 text-muted-foreground border border-border">
                        {fee.tenant_level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground py-3">
                      {getTargetEntityLabel(fee.tenant_level, fee.tenant_id)}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {fee.min_bound.toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {fee.max_bound.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={fee.is_active}
                        onCheckedChange={(checked) => {
                          vm.setFeeToToggle({
                            id: fee.id,
                            nextActive: checked,
                            label: `de la tranche [${fee.min_bound.toLocaleString()} - ${fee.max_bound.toLocaleString()}]`,
                          });
                        }}
                        className="scale-75"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => vm.openDetailFee(fee)}
                          title="Détails"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => vm.openEditFee(fee)}
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive/80"
                          onClick={() => vm.setFeeToDelete(fee.id)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {vm.fees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16 text-muted-foreground text-xs italic">
                      Aucune tranche tarifaire définie pour ce produit et type de service.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

