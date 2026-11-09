import React from "react";
import { Plus, Eye, Pencil, Copy, Power, Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PackageResponse } from "../../models/types";

interface PackagesTabProps {
  packages: PackageResponse[];
  onAdd: () => void;
  onEdit: (pkg: PackageResponse) => void;
  onDetail: (pkg: PackageResponse) => void;
  onDuplicate: (pkg: PackageResponse) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (params: { pkg: PackageResponse; activate: boolean }) => void;
  onArchive: (id: string) => void;
  hasPerm: (perm: string) => boolean;
}

export const PackagesTab: React.FC<PackagesTabProps> = ({
  packages,
  onAdd,
  onEdit,
  onDetail,
  onDuplicate,
  onDelete,
  onToggleStatus,
  onArchive,
  hasPerm,
}) => {
  const canCreate = hasPerm("perm.bo.package.create");
  const canUpdate = hasPerm("perm.bo.package.update");
  const canDuplicate =
    hasPerm("perm.bo.package.duplicate") || hasPerm("perm.bo.package.create");
  const canArchive = hasPerm("perm.bo.package.archive");
  const canDelete = hasPerm("perm.bo.package.delete");
  const canRead =
    hasPerm("perm.bo.package.read") || hasPerm("perm.bo.package.list");
  const canToggleAny =
    canUpdate ||
    hasPerm("perm.bo.package.activate") ||
    hasPerm("perm.bo.package.deactivate");

  const hasAnyRowAction =
    canRead ||
    canUpdate ||
    canDuplicate ||
    canToggleAny ||
    canArchive ||
    canDelete;

  return (
    <div className="space-y-6 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground">Liste des Packages</h3>
          <p className="text-muted-foreground text-xs">
            Gérez les packages affectables aux structures.
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={onAdd}
            className="gradient-accent text-accent-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" /> Nouveau Package
          </Button>
        )}
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/50">
                <TableHead className="font-semibold">Code</TableHead>
                <TableHead className="font-semibold">Libellé</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                {hasAnyRowAction && (
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id} className="border-border/30 hover:bg-muted/20 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-accent">
                    {pkg.code}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{pkg.label}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        pkg.status === "active"
                          ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                          : pkg.status === "archived"
                            ? "bg-slate-500/15 text-slate-400 border-slate-500/30"
                            : "bg-muted text-muted-foreground border-border"
                      }
                    >
                      {pkg.status === "active"
                        ? "Actif"
                        : pkg.status === "archived"
                          ? "Archivé"
                          : "Inactif"}
                    </Badge>
                  </TableCell>
                  {hasAnyRowAction && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => onDetail(pkg)}
                            title="Détails (Services & Moyens de paiement)"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => onEdit(pkg)}
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDuplicate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => onDuplicate(pkg)}
                            title="Dupliquer"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        {pkg.status !== "archived" &&
                          ((pkg.status === "active" &&
                            (hasPerm("perm.bo.package.deactivate") || canUpdate)) ||
                            (pkg.status !== "active" &&
                              (hasPerm("perm.bo.package.activate") || canUpdate))) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${
                              pkg.status === "active"
                                ? "text-amber-500 hover:text-amber-600"
                                : "text-emerald-500 hover:text-emerald-600"
                            }`}
                            onClick={() =>
                              onToggleStatus({ pkg, activate: pkg.status !== "active" })
                            }
                            title={pkg.status === "active" ? "Désactiver" : "Activer"}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        )}
                        {canArchive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={pkg.status === "active" || pkg.status === "archived"}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                            onClick={() => onArchive(pkg.id)}
                            title={
                              pkg.status === "archived"
                                ? "Ce package est déjà archivé"
                                : pkg.status === "active"
                                  ? "Veuillez désactiver le package avant de l'archiver"
                                  : "Archiver"
                            }
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive/80"
                            onClick={() => onDelete(pkg.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {packages.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={hasAnyRowAction ? 4 : 3}
                    className="text-center py-10 text-muted-foreground"
                  >
                    Aucun package configuré.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default PackagesTab;
