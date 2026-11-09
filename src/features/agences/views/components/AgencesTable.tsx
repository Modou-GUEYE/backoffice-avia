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
  Loader2,
  MapPin,
  MoreHorizontal,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AgenceRead, AgencyParentType } from "../../models/types";

interface AgencesTableProps {
  loading: boolean;
  error: string | null;
  agences: AgenceRead[];
  resolveStructureLabel?: (structureId?: string) => string;
  resolveParentLabel?: (parentId?: string, parentType?: AgencyParentType | string) => string;
  getCaisseCount?: (agencyId: string) => number;
  permissions: {
    canUpdate: boolean;
    canDelete: boolean;
  };
  onOpenEdit: (agence: AgenceRead) => void;
  onConfirmToggleStatus: (agence: AgenceRead) => void;
  onConfirmDelete: (agence: AgenceRead) => void;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

export const AgencesTable: React.FC<AgencesTableProps> = ({
  loading,
  error,
  agences,
  resolveStructureLabel,
  resolveParentLabel,
  getCaisseCount,
  permissions,
  onOpenEdit,
  onConfirmToggleStatus,
  onConfirmDelete,
}) => {
  const navigate = useNavigate();
  const hasActions = permissions.canUpdate || permissions.canDelete;

  const getParentName = (parentId?: string, parentType?: AgencyParentType | string) => {
    if (resolveParentLabel) return resolveParentLabel(parentId, parentType);
    if (resolveStructureLabel) return resolveStructureLabel(parentId);
    return "—";
  };

  const renderTableBody = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={hasActions ? 6 : 5} className="text-center py-12 text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement des agences…
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={hasActions ? 6 : 5} className="text-center py-12">
            <div className="flex items-center justify-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (agences.length === 0) {
      return (
        <TableRow>
          <TableCell
            colSpan={hasActions ? 6 : 5}
            className="text-center py-12 text-muted-foreground"
          >
            Aucune agence trouvée
          </TableCell>
        </TableRow>
      );
    }

    return agences.map((a) => (
      <TableRow
        key={a.id}
        className="group cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={() => navigate(`/dashboard/agences/${a.id}`)}
      >
        <TableCell className="font-medium">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <span className="text-foreground font-semibold block">{a.name}</span>
              {a.code && (
                <span className="font-mono text-xs text-muted-foreground">{a.code}</span>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1 items-start">
            <span className="text-sm font-medium text-foreground">
              {getParentName(a.parent_id, a.parent_type)}
            </span>
            <Badge
              variant={a.parent_type === "DISTRIBUTOR" ? "outline" : "secondary"}
              className="text-[10px] px-1.5 py-0 font-normal"
            >
              {a.parent_type === "DISTRIBUTOR" ? "Distributeur" : "Structure"}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="text-sm">{a.city || "—"}</TableCell>
        <TableCell>
          <Badge
            className={
              a.is_active
                ? "bg-accent/15 text-accent border-accent/30 hover:bg-accent/20"
                : "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20"
            }
            variant="outline"
          >
            {a.is_active ? "Actif" : "Inactif"}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground text-xs">
          {formatDateTime(a.activated_at)}
        </TableCell>
        {hasActions && (
          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions pour l'agence ${a.name}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {permissions.canUpdate && (
                  <>
                    <DropdownMenuItem onClick={() => onOpenEdit(a)}>
                      <Edit className="h-4 w-4 mr-2" /> Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onConfirmToggleStatus(a)}>
                      {a.is_active ? (
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
                    onClick={() => onConfirmDelete(a)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        )}
      </TableRow>
    ));
  };

  return (
    <div className="overflow-y-auto max-h-[75vh]">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="font-semibold">Agence</TableHead>
            <TableHead className="font-semibold">Entité parente</TableHead>
            <TableHead className="font-semibold">Ville</TableHead>
            <TableHead className="font-semibold">Statut</TableHead>
            <TableHead className="font-semibold">Date activation</TableHead>
            {hasActions && <TableHead className="font-semibold text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>{renderTableBody()}</TableBody>
      </Table>
    </div>
  );
};
