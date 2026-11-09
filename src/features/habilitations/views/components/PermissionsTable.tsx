import React from "react";
import { Plus, Trash2, Pencil, RefreshCw, Key } from "lucide-react";
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
import { PermissionResponse } from "../../models/types";

interface PermissionsTableProps {
  permissions: PermissionResponse[];
  isLoadingMatrix: boolean;
  onStartCreatePermission: () => void;
  onStartEditPermission: (perm: PermissionResponse) => void;
  onStartDeletePermission: (perm: PermissionResponse) => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const PermissionsTable: React.FC<PermissionsTableProps> = ({
  permissions,
  isLoadingMatrix,
  onStartCreatePermission,
  onStartEditPermission,
  onStartDeletePermission,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}) => {
  return (
    <div className="space-y-4">
      {isLoadingMatrix ? (
        <div className="text-center py-20 text-xs text-muted-foreground flex flex-col items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-accent" />
          <span>Chargement du catalogue des permissions...</span>
        </div>
      ) : permissions.length === 0 ? (
        <div className="text-center py-20 text-xs text-muted-foreground italic border border-dashed border-border/50 rounded-xl p-8 bg-card/40">
          <Key className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p>Aucune permission enregistrée.</p>
          {canCreate && (
          <Button
            size="sm"
            onClick={onStartCreatePermission}
            className="mt-3 text-xs gradient-accent text-accent-foreground"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Créer la première permission
          </Button>
          )}
        </div>
      ) : (
        <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10 border-b border-border/50">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="font-semibold text-xs py-3">Permission</TableHead>
                  <TableHead className="font-semibold text-xs py-3">Code technique</TableHead>
                  <TableHead className="font-semibold text-xs py-3">Client</TableHead>
                  <TableHead className="font-semibold text-xs py-3">Statut</TableHead>
                  <TableHead className="font-semibold text-xs py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((perm) => {
                  const isEnabled = perm.enabled ?? true;

                  return (
                    <TableRow
                      key={perm.id}
                      className="border-border/30 hover:bg-muted/10 transition-colors"
                    >
                      {/* Nom & Description */}
                      <TableCell className="py-3.5">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-xs text-foreground">
                            {perm.name}
                          </span>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {perm.description || "Aucune description"}
                          </p>
                        </div>
                      </TableCell>

                      {/* Code technique */}
                      <TableCell className="py-3.5">
                        <code className="text-[11px] font-mono bg-muted/50 px-2 py-0.5 rounded border border-border/40 text-foreground">
                          {perm.code}
                        </code>
                      </TableCell>

                      {/* Client ID */}
                      <TableCell className="py-3.5">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {perm.client_id}
                        </Badge>
                      </TableCell>

                      {/* Statut Actif/Inactif */}
                      <TableCell className="py-3.5">
                        {isEnabled ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium"
                          >
                            Actif
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-muted/50 text-muted-foreground border-border font-medium"
                          >
                            Inactif
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Modifier la permission"
                            onClick={() => onStartEditPermission(perm)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          )}
                          {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Supprimer la permission"
                            onClick={() => onStartDeletePermission(perm)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsTable;
