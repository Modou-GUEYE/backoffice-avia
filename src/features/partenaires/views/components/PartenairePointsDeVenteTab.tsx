import React from "react";
import { Edit, MoreHorizontal, Plus, Search, Store, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import FormDialog from "@/shared/components/FormDialog";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import type { PointDeVente } from "../../models/types";
import { usePointsDeVente } from "../../viewmodels/usePointsDeVente";

interface PartenairePointsDeVenteTabProps {
  partnerId: string;
  initialItems: PointDeVente[];
}

export const PartenairePointsDeVenteTab: React.FC<PartenairePointsDeVenteTabProps> = ({ partnerId, initialItems }) => {
  const vm = usePointsDeVente(partnerId, initialItems);
  const errors = vm.formErrors;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Points de vente</h2>
          <p className="text-xs text-muted-foreground">{vm.items.length} point(s) de vente rattaché(s)</p>
        </div>
        <Button size="sm" onClick={vm.openCreate} className="gradient-accent text-accent-foreground">
          <Plus className="h-4 w-4 mr-2" /> Nouveau point de vente
        </Button>
      </div>

      {/* Filtres Points de Vente */}
      <div className="glass-card rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par libellé, code ou adresse..."
              value={vm.search}
              onChange={(e) => vm.setSearch(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>

          <Select value={vm.statusFilter} onValueChange={vm.setStatusFilter}>
            <SelectTrigger aria-label="Filtrer par statut">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="actif">Actif</SelectItem>
              <SelectItem value="inactif">Inactif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-semibold">Libellé</TableHead>
              <TableHead className="font-semibold">Code</TableHead>
              <TableHead className="font-semibold">Adresse</TableHead>
              <TableHead className="font-semibold">Téléphone</TableHead>
              <TableHead className="font-semibold">Statut</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vm.filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  {vm.items.length === 0
                    ? "Aucun point de vente enregistré pour ce partenaire marchand"
                    : "Aucun point de vente ne correspond aux filtres"}
                </TableCell>
              </TableRow>
            ) : (
              vm.filteredItems.map((pdv) => (
                <TableRow key={pdv.id} className="hover:bg-muted/40">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                        <Store className="h-4 w-4 text-accent" />
                      </div>
                      <span>{pdv.libelle || pdv.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{pdv.code || "—"}</TableCell>
                  <TableCell className="text-sm">{pdv.adresse || "—"}</TableCell>
                  <TableCell className="text-sm font-mono">{pdv.telephone || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        pdv.statut === "actif"
                          ? "bg-accent/15 text-accent border-accent/30"
                          : "bg-destructive/15 text-destructive border-destructive/30"
                      }
                    >
                      {pdv.statut === "actif" ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions point de vente">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => vm.openEdit(pdv)}>
                          <Edit className="h-4 w-4 mr-2" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void vm.toggleActive(pdv)}>
                          {pdv.statut === "actif" ? (
                            <ToggleLeft className="h-4 w-4 mr-2" />
                          ) : (
                            <ToggleRight className="h-4 w-4 mr-2" />
                          )}
                          {pdv.statut === "actif" ? "Désactiver" : "Activer"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => vm.setToDelete(pdv)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <FormDialog
        open={vm.dialogOpen}
        onOpenChange={vm.setDialogOpen}
        title={vm.editing ? "Modifier le point de vente" : "Nouveau point de vente"}
        description={
          vm.editing
            ? "Modifiez les informations de ce point de vente."
            : "Créez un nouveau point de vente pour ce partenaire."
        }
        submitLabel={vm.editing ? "Modifier" : "Ajouter"}
        onSubmit={() => void vm.save()}
        loading={vm.saving}
        submitClassName="gradient-accent text-accent-foreground"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pdv-libelle">
              Libellé <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pdv-libelle"
              placeholder="Ex. Boutique Plateau"
              value={vm.form.libelle}
              {...invalidFieldProps(errors.libelle)}
              onChange={(e) => vm.updateField("libelle", e.target.value)}
            />
            <FieldError message={errors.libelle} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pdv-code">Code</Label>
            <Input
              id="pdv-code"
              placeholder="Ex. PDV-001"
              value={vm.form.code}
              {...invalidFieldProps(errors.code, "font-mono")}
              onChange={(e) => vm.updateField("code", e.target.value)}
            />
            <FieldError message={errors.code} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pdv-telephone">Téléphone</Label>
            <Input
              id="pdv-telephone"
              type="tel"
              placeholder="Ex. +221770000000"
              value={vm.form.telephone}
              {...invalidFieldProps(errors.telephone)}
              onChange={(e) => vm.updateField("telephone", e.target.value)}
            />
            <FieldError message={errors.telephone} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pdv-adresse">Adresse</Label>
            <Input
              id="pdv-adresse"
              placeholder="Ex. Avenue Léopold Sédar Senghor, Dakar"
              value={vm.form.adresse}
              {...invalidFieldProps(errors.adresse)}
              onChange={(e) => vm.updateField("adresse", e.target.value)}
            />
            <FieldError message={errors.adresse} />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(vm.toDelete)}
        onOpenChange={(open) => !open && !vm.deleting && vm.setToDelete(null)}
        title="Supprimer le point de vente"
        description={`Le point de vente « ${vm.toDelete?.libelle || vm.toDelete?.name || ""} » sera supprimé définitivement.`}
        confirmLabel="Supprimer"
        onConfirm={() => void vm.confirmDelete()}
        confirmDisabled={vm.deleting}
        destructive
      />
    </div>
  );
};

export default PartenairePointsDeVenteTab;
