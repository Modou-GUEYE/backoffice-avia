import React from "react";
import { Tag, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ServiceResponse, ServiceVersionResponse } from "../../models/types";
import { FieldError, FieldErrors, invalidFieldProps } from "@/shared/forms/fieldErrors";
import type { ServiceVersionFormField } from "../../viewmodels/packageValidation";

interface ServiceVersionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceResponse | null;
  versions: ServiceVersionResponse[];
  isLoading: boolean;
  isSaving: boolean;
  newVersionData: { version: string; changelog: string };
  setNewVersionData: React.Dispatch<React.SetStateAction<{ version: string; changelog: string }>>;
  errors?: FieldErrors<ServiceVersionFormField>;
  onClearError?: (field: ServiceVersionFormField) => void;
  onCreateVersion: () => void;
  onPublishVersion: (versionId: string) => void;
  onDeprecateVersion: (versionId: string) => void;
}

export const ServiceVersionsModal: React.FC<ServiceVersionsModalProps> = ({
  open,
  onOpenChange,
  service,
  versions,
  isLoading,
  isSaving,
  newVersionData,
  setNewVersionData,
  errors = {},
  onClearError,
  onCreateVersion,
  onPublishVersion,
  onDeprecateVersion,
}) => {
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) setNewVersionData({ version: "", changelog: "" });
      }}
    >
      <DialogContent className="max-w-2xl bg-background border border-border/50 rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Tag className="h-4 w-4 text-accent" /> Versions du Service : {service?.label}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Gérez les versions, les journaux de modifications (changelog) et la publication pour ce service.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Section 1: Formulaire nouvelle version */}
          <div className="p-4 rounded-xl bg-accent/5 border border-accent/10 space-y-3">
            <h4 className="text-xs font-bold text-foreground">Créer une nouvelle version</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="versionNum" className="text-xs">
                  Numéro de version <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="versionNum"
                  {...invalidFieldProps(errors.version, "h-8 text-xs font-mono bg-background")}
                  placeholder="Ex. v1.0.0"
                  value={newVersionData.version}
                  onChange={(e) => {
                    onClearError?.("version");
                    setNewVersionData({ ...newVersionData, version: e.target.value });
                  }}
                />
                <FieldError message={errors.version} />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="versionChangelog" className="text-xs">
                  Journal des modifications (Changelog)
                </Label>
                <Input
                  id="versionChangelog"
                  className="h-8 text-xs bg-background"
                  placeholder="Ex. Ajout des nouveaux flux..."
                  value={newVersionData.changelog}
                  onChange={(e) => setNewVersionData({ ...newVersionData, changelog: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={isSaving}
                onClick={onCreateVersion}
                className="gradient-accent text-accent-foreground text-xs h-8"
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Créer la version
              </Button>
            </div>
          </div>

          {/* Section 2: Table des versions de service */}
          <div className="glass-card rounded-xl overflow-hidden border border-border/30 max-h-60 overflow-y-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border/50">
                  <TableHead className="font-semibold text-xs">Version</TableHead>
                  <TableHead className="font-semibold text-xs">Statut</TableHead>
                  <TableHead className="font-semibold text-xs">Changelog</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-xs py-6">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto text-accent" />
                    </TableCell>
                  </TableRow>
                ) : versions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                      Aucune version enregistrée pour ce service.
                    </TableCell>
                  </TableRow>
                ) : (
                  versions.map((v) => {
                    const isPublished = v.status?.toUpperCase() === "PUBLISHED";
                    const isDeprecated = v.status?.toUpperCase() === "DEPRECATED";
                    return (
                      <TableRow key={v.id} className="border-border/30 hover:bg-muted/10 transition-colors">
                        <TableCell className="font-mono text-xs font-semibold py-2.5">
                          {v.version}
                        </TableCell>
                        <TableCell className="py-2.5">
                          {isPublished ? (
                            <Badge
                              variant="default"
                              className="text-[9px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                            >
                              Publiée
                            </Badge>
                          ) : isDeprecated ? (
                            <Badge
                              variant="secondary"
                              className="text-[9px] bg-red-500/15 text-red-600 border-red-500/30"
                            >
                              Obsolète
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px]">
                              Brouillon
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2.5 line-clamp-1">
                          {v.changelog || "-"}
                        </TableCell>
                        <TableCell className="text-right py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            {!isPublished && !isDeprecated && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[10px] text-emerald-600 hover:bg-emerald-500/10 px-2"
                                onClick={() => onPublishVersion(v.id)}
                              >
                                Publier
                              </Button>
                            )}
                            {isPublished && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[10px] text-destructive hover:bg-destructive/10 px-2"
                                onClick={() => onDeprecateVersion(v.id)}
                              >
                                Obsolétiser
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs h-9">
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceVersionsModal;
