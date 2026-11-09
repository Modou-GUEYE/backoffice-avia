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
import { motion } from "framer-motion";
import {
  AlertCircle,
  Edit,
  Loader2,
  MoreHorizontal,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import type { useStructures } from "../../viewmodels/useStructures";

interface StructuresDataTableProps {
  vm: ReturnType<typeof useStructures>;
  onNavigate: (id: string) => void;
}

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

export const StructuresDataTable: React.FC<StructuresDataTableProps> = ({
  vm,
  onNavigate,
}) => {
  const hasActions = vm.permissions.canUpdate || vm.permissions.canDelete;

  const renderTableBody = () => {
    if (vm.loading) {
      return (
        <TableRow>
          <TableCell colSpan={hasActions ? 6 : 5} className="text-center py-12 text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement des structures…
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (vm.error) {
      return (
        <TableRow>
          <TableCell colSpan={hasActions ? 6 : 5} className="text-center py-12">
            <div className="flex items-center justify-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              {vm.error}
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (vm.filtered.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={hasActions ? 6 : 5} className="text-center py-12 text-muted-foreground">
            Aucune structure trouvée
          </TableCell>
        </TableRow>
      );
    }

    return vm.filtered.map((s) => (
      <TableRow
        key={s.id}
        className="group cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={() => onNavigate(s.id)}
      >
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {(() => {
              const logoSrc = s.media_url || s.mediaUrl;
              if (!logoSrc) return null;
              return (
                <div className="h-6 w-6 rounded-md border bg-background/50 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                  <img
                    src={logoSrc}
                    alt={s.name}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              );
            })()}
            <span>{s.name}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="text-xs">{s.type}</Badge>
        </TableCell>
        <TableCell>{s.address}</TableCell>
        <TableCell>
          <Badge
            className={
              s.is_active
                ? "bg-accent/15 text-accent border-accent/30 hover:bg-accent/20"
                : "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20"
            }
            variant="outline"
          >
            {s.is_active ? "Actif" : "Inactif"}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">
          {s.activated_at ? formatDateTime(s.activated_at) : ""}
        </TableCell>
        {hasActions && (
          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
            {(vm.permissions.canUpdate || vm.permissions.canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {vm.permissions.canUpdate && (
                    <>
                      <DropdownMenuItem onClick={() => vm.openEdit(s)}>
                        <Edit className="h-4 w-4 mr-2" /> Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => vm.confirmToggleStatut(s)}>
                        {s.is_active ? (
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
                  {vm.permissions.canDelete && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        vm.setDeletingStructure(s);
                        vm.setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </TableCell>
        )}
      </TableRow>
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="glass-card rounded-xl overflow-hidden"
    >
      <div className="overflow-y-auto max-h-[75vh]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-semibold">Nom</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Pays</TableHead>
              <TableHead className="font-semibold">Statut</TableHead>
              <TableHead className="font-semibold">Date création</TableHead>
              {hasActions && <TableHead className="font-semibold text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>{renderTableBody()}</TableBody>
        </Table>
      </div>
    </motion.div>
  );
};
