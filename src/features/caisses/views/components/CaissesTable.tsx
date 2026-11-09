import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  Edit,
  Eye,
  Landmark,
  Loader2,
  MoreHorizontal,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import type { CaisseRead } from "../../models/types";

interface CaissesTableProps {
  loading: boolean;
  error: string | null;
  caisses: CaisseRead[];
  resolveAgencyLabel: (agencyId: string) => string | undefined;
  resolveParentTypeLabel?: (agencyId: string) => string | undefined;
  permissions: {
    canUpdate: boolean;
    canDelete: boolean;
  };
  onOpenDetail?: (caisse: CaisseRead) => void;
  onOpenEdit: (caisse: CaisseRead) => void;
  onConfirmToggleStatus: (caisse: CaisseRead) => void;
  onConfirmDelete: (caisse: CaisseRead) => void;
}

export const CaissesTable: React.FC<CaissesTableProps> = ({
  loading,
  error,
  caisses,
  resolveAgencyLabel,
  resolveParentTypeLabel,
  permissions,
  onOpenDetail,
  onOpenEdit,
  onConfirmToggleStatus,
  onConfirmDelete,
}) => {
  const hasActions = permissions.canUpdate || permissions.canDelete;

  const renderTableBody = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={hasActions ? 4 : 3} className="text-center py-12 text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              Chargement des caisses…
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={hasActions ? 4 : 3} className="text-center py-12">
            <div className="flex items-center justify-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (caisses.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={hasActions ? 4 : 3} className="text-center py-12 text-muted-foreground">
            Aucune caisse trouvée
          </TableCell>
        </TableRow>
      );
    }

    return caisses.map((c) => {
      const parentType = c.parent_type || resolveParentTypeLabel?.(c.agency_id);
      return (
        <TableRow
          key={c.id}
          className={`hover:bg-muted/40 transition-colors ${onOpenDetail ? "cursor-pointer" : ""}`}
          onClick={() => onOpenDetail?.(c)}
        >
          <TableCell className="font-medium">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                <Landmark className="h-4 w-4" />
              </div>
              <div>
                <span className="text-foreground font-semibold block">{c.name}</span>
                {c.code && (
                  <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                )}
              </div>
            </div>
          </TableCell>

          <TableCell>
            <div className="flex flex-col gap-1 items-start">
              <span className="text-sm font-medium text-foreground">
                {resolveAgencyLabel(c.agency_id) || "—"}
              </span>
              {parentType && (
                <Badge
                  variant={parentType === "DISTRIBUTOR" ? "outline" : "secondary"}
                  className="text-[10px] px-1.5 py-0 font-normal"
                >
                  {parentType === "DISTRIBUTOR" ? "Distributeur" : "Structure"}
                </Badge>
              )}
            </div>
          </TableCell>

          <TableCell>
            <Badge
              className={
                c.is_active
                  ? "bg-accent/15 text-accent border-accent/30 hover:bg-accent/20"
                  : "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20"
              }
              variant="outline"
            >
              {c.is_active ? "Actif" : "Inactif"}
            </Badge>
          </TableCell>

          {hasActions && (
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`Actions pour la caisse ${c.name}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onOpenDetail && (
                    <DropdownMenuItem onClick={() => onOpenDetail(c)}>
                      <Eye className="h-4 w-4 mr-2" /> Voir les détails
                    </DropdownMenuItem>
                  )}
                  {permissions.canUpdate && (
                    <>
                      <DropdownMenuItem onClick={() => onOpenEdit(c)}>
                        <Edit className="h-4 w-4 mr-2" /> Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onConfirmToggleStatus(c)}>
                        {c.is_active ? (
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
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onConfirmDelete(c)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          )}
        </TableRow>
      );
    });
  };

  return (
    <div className="overflow-y-auto max-h-[75vh]">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="font-semibold">Caisse</TableHead>
            <TableHead className="font-semibold">Agence</TableHead>
            <TableHead className="font-semibold">Statut</TableHead>
            {hasActions && <TableHead className="font-semibold text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>{renderTableBody()}</TableBody>
      </Table>
    </div>
  );
};
