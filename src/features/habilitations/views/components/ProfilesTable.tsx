import React from "react";
import { Plus, Trash2, Pencil, RefreshCw, Shield } from "lucide-react";
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
import { HabilitationMatrixRowResponse } from "../../models/types";

interface ProfilesTableProps {
  profiles: HabilitationMatrixRowResponse[];
  totalPermissionsCount: number;
  isLoadingMatrix: boolean;
  onStartCreateProfile: () => void;
  onStartEditProfile: (row: HabilitationMatrixRowResponse) => void;
  onStartDeleteProfile: (row: HabilitationMatrixRowResponse) => void;
  canCreate?: boolean;
  getRowRights?: (row: HabilitationMatrixRowResponse) => { edit: boolean; delete: boolean };
}

const allRights = () => ({ edit: true, delete: true });

export const ProfilesTable: React.FC<ProfilesTableProps> = ({
  profiles,
  totalPermissionsCount,
  isLoadingMatrix,
  onStartCreateProfile,
  onStartEditProfile,
  onStartDeleteProfile,
  canCreate = true,
  getRowRights = allRights,
}) => {
  return (
    <div className="space-y-4">
      {isLoadingMatrix ? (
        <div className="text-center py-20 text-xs text-muted-foreground flex flex-col items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-accent" />
          <span>Chargement des profils d'habilitation...</span>
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-20 text-xs text-muted-foreground italic border border-dashed border-border/50 rounded-xl p-8 bg-card/40">
          <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p>Aucun profil d'habilitation trouvé.</p>
          {canCreate && (
          <Button
            size="sm"
            onClick={onStartCreateProfile}
            className="mt-3 text-xs gradient-accent text-accent-foreground"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Créer le premier profil
          </Button>
          )}
        </div>
      ) : (
        <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10 border-b border-border/50">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="font-semibold text-xs py-3">Profil</TableHead>
                  <TableHead className="font-semibold text-xs py-3">Code technique</TableHead>
                  <TableHead className="font-semibold text-xs py-3">Permissions</TableHead>
                  <TableHead className="font-semibold text-xs py-3">Statut</TableHead>
                  <TableHead className="font-semibold text-xs py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((row) => {
                  const isEnabled = row.profile.enabled ?? true;

                  return (
                    <TableRow
                      key={row.profile.id}
                      className="border-border/30 hover:bg-muted/10 transition-colors"
                    >
                      {/* Nom & Description */}
                      <TableCell className="py-3.5">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-xs text-foreground">
                            {row.profile.name}
                          </span>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {row.profile.description || "Aucune description"}
                          </p>
                        </div>
                      </TableCell>

                      {/* Code technique */}
                      <TableCell className="py-3.5">
                        <code className="text-[11px] font-mono bg-muted/50 px-2 py-0.5 rounded border border-border/40 text-foreground">
                          {row.profile.code}
                        </code>
                      </TableCell>

                      {/* Permissions actives */}
                      <TableCell className="py-3.5">
                        <Badge variant="secondary" className="text-[11px] font-mono">
                          {row.permission_ids.length} / {totalPermissionsCount} active(s)
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
                          {getRowRights(row).edit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Modifier le profil et ses permissions"
                            onClick={() => onStartEditProfile(row)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          )}
                          {getRowRights(row).delete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Supprimer le profil"
                            onClick={() => onStartDeleteProfile(row)}
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

export default ProfilesTable;
