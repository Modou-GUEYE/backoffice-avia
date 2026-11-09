import React from "react";
import { Plus, RefreshCw, Eye, Pencil, Trash2, AlertCircle, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTaxes } from "../../viewmodels/useTaxes";
import { ServiceType, TenantLevel, CatalogServiceItem } from "../../models/types";
import { TaxDetailPage } from "../TaxDetailPage";

interface TaxesTabProps {
  vm: ReturnType<typeof useTaxes>;
  onOpenDeleteTax: (id: string) => void;
  onOpenToggleTax: (tax: { id: string; nextActive: boolean; label: string }) => void;
  structures?: { id: string; name: string }[];
  catalogServices?: CatalogServiceItem[];
}

export const TaxesTab: React.FC<TaxesTabProps> = ({
  vm,
  onOpenDeleteTax,
  onOpenToggleTax,
  structures = [],
  catalogServices = [],
}) => {
  const getTargetEntityLabel = (level: TenantLevel, tenantId: string | null) => {
    if (level === "GLOBAL") return "Global";
    if (level === "STRUCTURE") {
      return structures.find((s) => s.id === tenantId)?.name || tenantId || "Structure";
    }
    if (level === "AGENCY") {
      return vm.activeAgencies.find((a) => a.id === tenantId)?.name || tenantId || "Agence";
    }
    if (level === "PRODUCT") {
      return vm.products.find((p) => p.id === tenantId)?.nom || tenantId || "Produit";
    }
    if (level === "DISTRIBUTEUR") {
      return vm.distributors.find((d) => d.id === tenantId)?.nom || tenantId || "Distributeur";
    }
    return tenantId || "—";
  };

  const catalogServicesList = (catalogServices.length > 0 ? catalogServices : vm.catalogServices) || [];

  const renderServiceSelect = () => (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Service :
      </span>
      <Select
        value={vm.selectedServiceType}
        onValueChange={(v) => vm.setSelectedServiceType(v as ServiceType | "ALL")}
      >
        <SelectTrigger className="h-8 text-xs w-48">
          <SelectValue placeholder="Tous les services" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL" className="text-xs font-medium">
            Tous les services
          </SelectItem>
          {catalogServicesList.map((s) => (
            <SelectItem key={s.id || s.code} value={s.code} className="text-xs">
              {s.label || s.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  if (vm.viewingTax) {
    return (
      <div className="space-y-6">
        <TaxDetailPage
          item={vm.viewingTax}
          onBack={() => {
            vm.setViewingTax(null);
            vm.setDetailOpen(false);
          }}
          catalogServices={catalogServices}
          products={vm.products}
          structures={structures.length > 0 ? structures : vm.structures}
          distributors={vm.distributors}
          activeAgencies={vm.activeAgencies}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Receipt className="h-5 w-5 text-accent" />
            Gestion des Taxes & Règles Fiscales
          </h3>
          <p className="text-muted-foreground text-xs">
            Définissez et gérez les taxes applicables (timbre fiscal, etc.) par produit ou par structure.
          </p>
        </div>
        <Button
          onClick={vm.openAddTax}
          className="gradient-accent text-accent-foreground hover:opacity-90"
          disabled={vm.isProductAdmin && !vm.filterTenantId}
        >
          <Plus className="h-4 w-4 mr-2" /> Nouvelle Taxe
        </Button>
      </div>

      {/* Filter controls */}
      <div className="glass-card rounded-xl p-4 border border-border/40 bg-background/40">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          {vm.isProductAdmin ? (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Niveau :
                </span>
                <Badge className="text-xs font-mono pointer-events-none bg-muted text-muted-foreground border border-border">
                  PRODUCT
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Produit :
                </span>
                <Badge className="text-xs font-medium pointer-events-none bg-accent/15 text-accent border border-accent/25">
                  {vm.institutionLabel || "Mon Produit"}
                </Badge>
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
                    {vm.institutionLabel || "Ma Structure"}
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
                    <SelectItem value="DISTRIBUTEUR" className="text-xs font-medium">DISTRIBUTEUR</SelectItem>
                    <SelectItem value="AGENCY" className="text-xs font-medium">AGENCE</SelectItem>
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
                  onValueChange={(v) => vm.handleFilterLevelChange(v as TenantLevel)}
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
                      {structures.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.name || s.id}
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
                      {vm.products.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.nom}
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
                          {a.name || (a as { nom?: string }).nom || a.id}
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

      {/* Table */}
      <div className="glass-card rounded-xl border border-border/40 overflow-hidden bg-background/30">
        {vm.isLoading ? (
          <div className="py-12 flex justify-center items-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-3 text-sm text-muted-foreground">Chargement des taxes...</span>
          </div>
        ) : vm.taxes.length === 0 ? (
          <div className="py-12 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucune taxe configurée pour les critères sélectionnés.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-border/50">
                  <TableHead className="font-semibold text-xs text-muted-foreground">Service</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground">Niveau</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground">Entité Cible</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground">Type de taxe</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground">Type de client</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground">Taux (%)</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground">Montant (FCFA)</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground">Statut</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vm.taxes.map((tax) => (
                  <TableRow key={tax.id} className="border-border/30 hover:bg-muted/20 transition-colors">
                    <TableCell className="py-3">
                      <Badge className="bg-accent/10 text-accent hover:bg-accent/20 border-accent/20 uppercase text-[9px] font-bold">
                        {tax.service_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge className="text-[9px] font-bold uppercase tracking-wider pointer-events-none bg-muted/80 text-muted-foreground border border-border">
                        {tax.tenant_level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground py-3 max-w-[150px] truncate">
                      {getTargetEntityLabel(tax.tenant_level, tax.tenant_id)}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground py-3">
                      {tax.tax_type === "TIMBRE_FISCAL" ? "Timbre Fiscal" : tax.tax_type}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-3">
                      {tax.client_type === "PARTICULIER" ? "Particulier" : "Entreprise"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground font-medium py-3">
                      {tax.tax_rate != null ? `${tax.tax_rate.toLocaleString("fr-FR")} %` : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground font-medium py-3">
                      {tax.tax_amount != null ? `${tax.tax_amount.toLocaleString("fr-FR")} FCFA` : "—"}
                    </TableCell>
                    <TableCell className="py-3">
                      <Switch
                        checked={tax.is_active}
                        onCheckedChange={() =>
                          onOpenToggleTax({
                            id: tax.id,
                            nextActive: !tax.is_active,
                            label: `${tax.tax_type} (${tax.client_type})`,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => vm.openDetailTax(tax.id)}
                          title="Voir le détail"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => vm.openEditTax(tax)}
                          title="Modifier la taxe"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onOpenDeleteTax(tax.id)}
                          title="Supprimer la taxe"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};
