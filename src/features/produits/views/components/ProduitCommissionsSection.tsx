import React, { useEffect } from "react";
import { Edit, Info, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import { CommissionFormFields } from "@/features/tarification/views/components/CommissionFormFields";
import type { useCommissions } from "@/features/tarification/viewmodels/useCommissions";

/** Taux affichés dans la liste de l'onglet, avec la couleur utilisée dans le formulaire. */
const RATE_ITEMS = [
  { key: "rate_structure", label: "Structure", dot: "bg-blue-500" },
  { key: "rate_tca_structure", label: "TCA", dot: "bg-indigo-500" },
  { key: "rate_groupement", label: "Groupement", dot: "bg-purple-500" },
  { key: "rate_partenaire_technique", label: "Partenaire Tech.", dot: "bg-emerald-500" },
  { key: "rate_distributeur", label: "Distributeur", dot: "bg-amber-500" },
] as const;

interface ProduitCommissionsSectionProps {
  vm: ReturnType<typeof useCommissions>;
  /** Consultation seule (fiche produit) : pas d'ajout, de modification ni de suppression. */
  readOnly?: boolean;
}

/**
 * Répartitions de commission d'un produit, gérées par le service de commissions de la Tarification
 * (niveau PRODUCT, produit courant). En édition, le formulaire est affiché directement dans l'onglet.
 */
export const ProduitCommissionsSection: React.FC<ProduitCommissionsSectionProps> = ({ vm, readOnly = false }) => {
  const getServiceLabel = (code: string) => vm.catalogServices.find((s) => s.code === code)?.label || code;
  const isEditing = Boolean(vm.editingItem);
  const { isFormOpen, editingItem, catalogServices, formState, openCreateDialog } = vm;

  // Formulaire toujours prêt pour une nouvelle répartition : à l'ouverture de l'onglet et après chaque enregistrement
  useEffect(() => {
    if (!readOnly) openCreateDialog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly]);

  useEffect(() => {
    if (readOnly) return;
    const serviceUnknown =
      catalogServices.length > 0 && !catalogServices.some((s) => s.code === formState.serviceType);
    if (!isFormOpen || (!editingItem && serviceUnknown)) openCreateDialog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, isFormOpen, editingItem, catalogServices]);

  // Fiche produit (consultation) : tableau complet
  const table = (
    <div className="border border-border/60 rounded-xl overflow-x-auto bg-background">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="text-xs font-bold">Service</TableHead>
            <TableHead className="text-xs font-bold">Phase</TableHead>
            <TableHead className="text-xs font-bold">Structure</TableHead>
            <TableHead className="text-xs font-bold" title="Taxe sur chiffre d'affaires">TCA Struct.</TableHead>
            <TableHead className="text-xs font-bold">Groupement</TableHead>
            <TableHead className="text-xs font-bold">Partenaire Tech.</TableHead>
            <TableHead className="text-xs font-bold">Distributeur</TableHead>
            <TableHead className="text-xs font-bold text-center">Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vm.isLoading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                Chargement des répartitions de commission...
              </TableCell>
            </TableRow>
          ) : vm.commissions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                Aucune répartition de commission configurée pour ce produit.
              </TableCell>
            </TableRow>
          ) : (
            vm.commissions.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
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
                <TableCell className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{item.rate_structure}%</TableCell>
                <TableCell className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{item.rate_tca_structure}%</TableCell>
                <TableCell className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">{item.rate_groupement}%</TableCell>
                <TableCell className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{item.rate_partenaire_technique}%</TableCell>
                <TableCell className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">{item.rate_distributeur}%</TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={item.is_active}
                    disabled
                    aria-label="Statut de la répartition"
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  if (readOnly) return table;

  return (
    <div className="min-w-0 border border-border rounded-lg p-4 space-y-3 bg-muted/20">
      <p className="text-xs text-muted-foreground font-medium">
        {isEditing ? "Modifier la répartition de commission" : "Nouvelle répartition de commission"}
      </p>

      <CommissionFormFields vm={vm} />

      <div className="flex justify-end gap-2">
        {isEditing ? (
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => vm.setIsFormOpen(false)} disabled={vm.isSaving}>
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={vm.handleSave}
              disabled={vm.isSaving}
              className="gradient-accent text-accent-foreground"
            >
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              {vm.isSaving ? "Modification..." : "Modifier la répartition"}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={vm.handleSave}
            disabled={vm.isSaving}
            className="gradient-accent text-accent-foreground"
          >
            {vm.isSaving ? "Ajout..." : "Ajouter la répartition"}
          </Button>
        )}
      </div>

      {(vm.isLoading || vm.commissions.length > 0) && (
        <div className="space-y-2 pt-2 border-t border-border">
          <Label className="text-xs text-muted-foreground font-medium">
            Répartitions du produit ({vm.commissions.length})
          </Label>
          {vm.isStaging && (
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
              Ces répartitions seront créées à l'enregistrement du produit.
            </p>
          )}
          {vm.isLoading ? (
            <p className="py-4 text-center text-xs text-muted-foreground">Chargement des répartitions de commission...</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {vm.commissions.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start justify-between gap-3 p-2.5 rounded-lg border text-xs bg-muted/20 transition-colors ${
                    vm.editingItem?.id === item.id ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-foreground">{getServiceLabel(item.service_type)}</span>
                      <Badge variant="outline" className="text-[10px]">{item.phase}</Badge>
                      {!item.is_active && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      {RATE_ITEMS.map(({ key, label, dot }) => (
                        <span key={key} className="inline-flex items-center gap-1">
                          <span className={`h-2 w-2 rounded-full ${dot}`} />
                          {label} <span className="font-mono font-semibold text-foreground">{item[key]}%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => vm.handleToggleStatus(item)}
                      aria-label="Activer ou désactiver la répartition"
                      className="mr-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-accent"
                      onClick={() => vm.openEditDialog(item)}
                      title="Modifier"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => vm.setDeleteConfirmId(item.id)}
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!vm.deleteConfirmId}
        onOpenChange={(open) => !open && vm.setDeleteConfirmId(null)}
        title="Supprimer la répartition de commission"
        description="Êtes-vous sûr de vouloir supprimer cette répartition de commission ?"
        confirmLabel="Supprimer"
        confirmVariant="destructive"
        onConfirm={() => vm.deleteConfirmId && vm.handleDelete(vm.deleteConfirmId)}
      />
    </div>
  );
};

export default ProduitCommissionsSection;
