import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  Building2,
  Edit,
  Eye,
  Loader2,
  MoreHorizontal,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Truck,
} from "lucide-react";
import type { Distributeur } from "../../models/types";

interface DistributeursTableProps {
  loading: boolean;
  error: string | null;
  distributeurs: Distributeur[];
  resolveStructureLabel: (id?: string) => string;
  permissions: {
    canUpdate: boolean;
    canDelete: boolean;
  };
  onOpenDetail: (distributeur: Distributeur) => void;
  onOpenEdit: (distributeur: Distributeur) => void;
  onConfirmToggleStatus: (distributeur: Distributeur) => void;
  onConfirmDelete: (distributeur: Distributeur) => void;
}

export const DistributeursTable: React.FC<DistributeursTableProps> = ({
  loading,
  error,
  distributeurs,
  resolveStructureLabel,
  permissions,
  onOpenDetail,
  onOpenEdit,
  onConfirmToggleStatus,
  onConfirmDelete,
}) => {
  const hasActions = permissions.canUpdate || permissions.canDelete;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Chargement des distributeurs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 text-destructive gap-2">
        <AlertCircle className="h-5 w-5" />
        <span>{error}</span>
      </div>
    );
  }

  if (distributeurs.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Aucun distributeur trouvé
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="font-semibold">Distributeur</TableHead>
            <TableHead className="font-semibold">Structure</TableHead>
            <TableHead className="font-semibold">Email</TableHead>
            <TableHead className="font-semibold">Statut</TableHead>
            {hasActions && <TableHead className="font-semibold text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {distributeurs.map((d) => {
            const structureName = resolveStructureLabel(d.structure_id || d.structureId);

            return (
              <TableRow
                key={d.id}
                className="group cursor-pointer hover:bg-muted/50"
                onClick={() => onOpenDetail(d)}
              >
                {/* Distributeur / Nom */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 border border-border/60 flex items-center justify-center shrink-0 overflow-hidden">
                      {d.media_url ? (
                        <img src={d.media_url} alt={d.name || d.nom} className="h-full w-full object-cover" />
                      ) : (
                        <Truck className="h-5 w-5 text-accent" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{d.name || d.nom}</div>
                    </div>
                  </div>
                </TableCell>

                {/* Structure */}
                <TableCell>
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{structureName}</span>
                  </div>
                </TableCell>

                {/* Email */}
                <TableCell>
                  <span className="text-sm text-foreground">{d.contact_email || "—"}</span>
                </TableCell>

                {/* Statut */}
                <TableCell>
                  <Badge
                    className={
                      d.is_active
                        ? "bg-accent/15 text-accent border-accent/30 hover:bg-accent/20"
                        : "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20"
                    }
                    variant="outline"
                  >
                    {d.is_active ? "Actif" : "Inactif"}
                  </Badge>
                </TableCell>

                {/* Actions */}
                {hasActions && (
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          aria-label={`Actions pour ${d.name || d.nom}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onOpenDetail(d)}>
                          <Eye className="h-4 w-4 mr-2" /> Voir le détail
                        </DropdownMenuItem>

                        {permissions.canUpdate && (
                          <>
                            <DropdownMenuItem onClick={() => onOpenEdit(d)}>
                              <Edit className="h-4 w-4 mr-2" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onConfirmToggleStatus(d)}>
                              {d.is_active ? (
                                <>
                                  <ToggleLeft className="h-4 w-4 mr-2" /> Désactiver
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="h-4 w-4 mr-2" /> Activer
                                </>
                              )}
                            </DropdownMenuItem>
                          </>
                        )}

                        {permissions.canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => onConfirmDelete(d)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
