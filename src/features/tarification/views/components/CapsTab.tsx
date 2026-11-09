import React, { useState } from "react";
import { Plus, Pencil, Trash2, TrendingDown, ShieldAlert, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientCapOverrideDialog } from "./ClientCapOverrideDialog";
import { ClientCapUsageDialog } from "./ClientCapUsageDialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCaps } from "../../viewmodels/useCaps";
import { TenantLevel } from "../../models/types";

interface CapsTabProps {
  vm: ReturnType<typeof useCaps>;
  onOpenDeleteCap: (id: string) => void;
  structures?: { id: string; name: string }[];
}

export const CapsTab: React.FC<CapsTabProps> = ({ vm, onOpenDeleteCap, structures = [] }) => {
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [overrideClientId, setOverrideClientId] = useState("");
  const [overrideStructureId, setOverrideStructureId] = useState("");

  const renderServiceSelect = () => (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Service :
      </span>
      <Select
        value={vm.selectedServiceType}
        onValueChange={(v) => vm.setSelectedServiceType(v)}
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-accent" />
            Gestion des plafonds
          </h3>
          <p className="text-muted-foreground text-xs">
            Définissez les plafonds min, max, cumulé journalier et mensuel par service.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUsageDialogOpen(true)}
            className="text-xs gap-1.5 h-9 border-accent/40 text-foreground hover:bg-accent/10 hover:text-foreground hover:border-accent font-medium"
          >
            <Activity className="h-4 w-4 text-accent" />
            Consommation client
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setOverrideClientId("");
              setOverrideStructureId("");
              vm.openOverrideDialog();
            }}
            className="text-xs gap-1.5 h-9 border-accent/40 text-foreground hover:bg-accent/10 hover:text-foreground hover:border-accent font-medium"
          >
            <ShieldAlert className="h-4 w-4 text-accent" />
            Dérogation client
          </Button>
          <Button
            onClick={vm.openCreateDialog}
            className="gradient-accent text-accent-foreground hover:opacity-90 h-9 text-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nouveau plafond
          </Button>
        </div>
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
                      {(structures.length > 0 ? structures : vm.structures).map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.name || (s as { id: string; name?: string; nom?: string }).nom || s.id}
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
                          {d.nom}
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
                          {a.name}
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

      {/* Table Card */}
      <div className="glass-card rounded-xl p-6">
        {/* Table */}
        {vm.isLoading ? (
          <div className="text-center py-16 text-xs text-muted-foreground">
            Chargement des plafonds...
          </div>
        ) : vm.caps.length === 0 ? (
          <div className="text-center py-16 text-xs text-muted-foreground italic">
            Aucun plafond configuré pour ce périmètre et ce service.
          </div>
        ) : (
          <div className="border border-border/50 rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border/50">
                  <TableHead className="font-semibold text-xs py-3">Service</TableHead>
                  <TableHead className="font-semibold text-xs py-3">Niveau</TableHead>
                  <TableHead className="font-semibold text-xs py-3 text-right">Min / transaction</TableHead>
                  <TableHead className="font-semibold text-xs py-3 text-right">Max / transaction</TableHead>
                  <TableHead className="font-semibold text-xs py-3 text-right">Cumul journalier</TableHead>
                  <TableHead className="font-semibold text-xs py-3 text-right">Cumul mensuel</TableHead>
                  <TableHead className="font-semibold text-xs py-3 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vm.caps.map((cap) => (
                  <TableRow key={cap.id} className="border-border/30 hover:bg-muted/10 transition-colors">
                    <TableCell className="py-3">
                      <Badge className="text-[9px] font-bold uppercase tracking-wider pointer-events-none bg-accent/15 text-accent border border-accent/25">
                        {cap.service_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge className="text-[9px] font-bold uppercase tracking-wider pointer-events-none bg-muted/80 text-muted-foreground border-border border">
                        {cap.tenant_level}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-right text-xs font-mono text-muted-foreground">
                      {cap.min_per_transaction != null ? cap.min_per_transaction.toLocaleString("fr-FR") : <span className="italic opacity-50">Illimité</span>}
                    </TableCell>
                    <TableCell className="py-3 text-right text-xs font-mono text-muted-foreground">
                      {cap.max_per_transaction != null ? cap.max_per_transaction.toLocaleString("fr-FR") : <span className="italic opacity-50">Illimité</span>}
                    </TableCell>
                    <TableCell className="py-3 text-right text-xs font-mono text-muted-foreground">
                      {cap.daily_cumulative != null ? cap.daily_cumulative.toLocaleString("fr-FR") : <span className="italic opacity-50">Illimité</span>}
                    </TableCell>
                    <TableCell className="py-3 text-right text-xs font-mono text-muted-foreground">
                      {cap.monthly_cumulative != null ? cap.monthly_cumulative.toLocaleString("fr-FR") : <span className="italic opacity-50">Illimité</span>}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => vm.openEditDialog(cap)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Modifier le plafond"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onOpenDeleteCap(cap.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          title="Supprimer le plafond"
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

      <ClientCapUsageDialog
        open={usageDialogOpen}
        onOpenChange={setUsageDialogOpen}
        structures={structures.length > 0 ? structures : vm.structures}
        catalogServices={vm.catalogServices}
        onGrantOverride={(cId, sId) => {
          setOverrideClientId(cId);
          setOverrideStructureId(sId);
          setUsageDialogOpen(false);
          setTimeout(() => {
            vm.openOverrideDialog();
          }, 60);
        }}
      />

      <ClientCapOverrideDialog
        open={vm.overrideDialogOpen}
        onOpenChange={(open) => {
          vm.setOverrideDialogOpen(open);
          if (!open) {
            setOverrideClientId("");
            setOverrideStructureId("");
          }
        }}
        structures={structures.length > 0 ? structures : vm.structures}
        initialClientId={overrideClientId}
        initialStructureId={overrideStructureId}
      />
    </div>
  );
};
