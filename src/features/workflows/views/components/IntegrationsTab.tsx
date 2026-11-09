import React from "react";
import {
  Server,
  Plus,
  Pencil,
  Search,
  Loader2,
  X,
  Trash2,
  FileCode2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIntegrations } from "../../viewmodels/useIntegrations";
import { IntegrationDialog } from "./IntegrationDialog";
import { OperationDialog } from "./OperationDialog";
import { OperationImportDialog } from "./OperationImportDialog";
import { IntegrationConfirmationDialogs } from "./IntegrationConfirmationDialogs";

interface IntegrationsTabProps {
  integrationsVm: ReturnType<typeof useIntegrations>;
  hasPerm?: (perm: string) => boolean;
}

export const IntegrationsTab: React.FC<IntegrationsTabProps> = ({
  integrationsVm,
  hasPerm,
}) => {
  const canCreate = hasPerm ? hasPerm("perm.bo.integration.create") : true;
  const canUpdate = hasPerm ? hasPerm("perm.bo.integration.update") : true;
  const canDelete = hasPerm ? hasPerm("perm.bo.integration.delete") : true;

  const integrationsList = integrationsVm?.filteredIntegrations ?? integrationsVm?.integrations ?? [];
  const operationsList = integrationsVm?.operations ?? [];

  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "POST":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "PUT":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "PATCH":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "DELETE":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground border-border/40";
    }
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Top Filter & Actions Bar - Masqué sur la page de détail d'une intégration */}
      {!integrationsVm.selectedIntegration && (
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-3.5 glass-card rounded-xl border border-border/30 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[180px] flex-1 max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une intégration..."
                value={integrationsVm.searchTerm}
                onChange={(e) => integrationsVm.setSearchTerm(e.target.value)}
                className="pl-9 text-xs h-9 bg-background shadow-sm border-border/50"
              />
            </div>
          </div>

          {canCreate && (
            <Button
              onClick={integrationsVm.handleOpenNewIntegration}
              className="gradient-accent text-accent-foreground hover:opacity-90 text-xs h-9 shrink-0"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Nouvelle Intégration
            </Button>
          )}
        </div>
      )}

      {integrationsVm.selectedIntegration ? (
        /* Full Page Integration Details & Operations View */
        <div className="space-y-4">
          {/* Operations Section (Full Width) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 p-4 bg-accent/5 rounded-xl border border-accent/10">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 min-w-0">
                  <Server className="h-4 w-4 text-accent shrink-0" />
                  <span className="truncate">Opérations : {integrationsVm.selectedIntegration.label}</span>
                </h3>
                {integrationsVm.selectedIntegration.active ? (
                  <Badge
                    variant="default"
                    className="text-[9px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30 px-1.5 py-0.5 shrink-0"
                  >
                    Actif
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 shrink-0"
                  >
                    Inactif
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canUpdate && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={integrationsVm.handleOpenImportOperation}
                      className="text-xs h-8 border-accent/40 text-accent hover:bg-accent/15 hover:text-accent hover:border-accent"
                      title="Importer une spécification OpenAPI"
                    >
                      <FileCode2 className="h-3.5 w-3.5 mr-1" /> Importer une opération
                    </Button>
                    <Button
                      onClick={integrationsVm.handleOpenNewOperation}
                      size="sm"
                      className="gradient-accent text-accent-foreground text-xs h-8"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Nouvelle opération
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => integrationsVm.handleSelectIntegration(null)}
                  title="Fermer les opérations"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="glass-card rounded-xl overflow-hidden border border-border/30">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/50">
                    <TableHead className="font-semibold text-xs py-3 px-3 whitespace-nowrap">Méthode & Chemin</TableHead>
                    <TableHead className="font-semibold text-xs py-3 px-3 whitespace-nowrap">Libellé</TableHead>
                    <TableHead className="font-semibold text-xs py-3 px-3 whitespace-nowrap">Complétion</TableHead>
                    <TableHead className="font-semibold text-xs py-3 px-3 whitespace-nowrap">Autorisation</TableHead>
                    <TableHead className="font-semibold text-xs py-3 px-3 whitespace-nowrap">Statut</TableHead>
                    <TableHead className="font-semibold text-xs py-3 px-3 text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrationsVm.isLoadingOperations ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-xs py-8">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-accent" />
                      </TableCell>
                    </TableRow>
                  ) : operationsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                        Aucune opération configurée pour cette intégration.
                      </TableCell>
                    </TableRow>
                  ) : (
                    operationsList.map((op) => (
                      <TableRow key={op.id} className="border-border/30 hover:bg-muted/10 transition-colors">
                        <TableCell className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className={`font-mono text-[9px] font-bold px-1.5 py-0 ${getMethodBadgeClass(op.method)}`}>
                              {op.method}
                            </Badge>
                            <span className="font-mono text-xs text-foreground truncate max-w-[320px]" title={op.relative_path}>
                              {op.relative_path}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-2.5 px-3">
                          <div className="text-xs font-medium text-foreground truncate max-w-[280px]">
                            {op.label}
                          </div>
                        </TableCell>

                        <TableCell className="py-2.5 px-3">
                          <Badge variant="secondary" className="font-mono text-[9px] px-1.5 py-0">
                            {op.completion_mode}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-2.5 px-3">
                          <Badge
                            variant="outline"
                            className={`font-mono text-[9px] px-1.5 py-0 ${op.authorization_mode === "FORWARD_BEARER"
                                ? "border-amber-500/30 text-amber-600 bg-amber-500/10"
                                : "text-muted-foreground"
                              }`}
                          >
                            {op.authorization_mode || "NONE"}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-2.5 px-3">
                          {op.active ? (
                            <Badge
                              variant="default"
                              className="text-[9px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30 px-1.5 py-0.5"
                            >
                              Actif
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5"
                            >
                              Inactif
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right py-2.5 px-3">
                          <div className="flex items-center justify-end gap-1">
                            {canUpdate && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => integrationsVm.handleOpenEditOperation(op)}
                                title="Modifier l'opération"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => integrationsVm.handleDeleteOperation(op.id)}
                                title="Supprimer l'opération"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ) : (
        /* Full Width View: Data Table */
        <div className="glass-card rounded-xl overflow-hidden border border-border/30 shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border/50">
                  <TableHead className="font-semibold text-xs py-3.5 px-4 whitespace-nowrap">Clé</TableHead>
                  <TableHead className="font-semibold text-xs py-3.5 px-4 whitespace-nowrap">Libellé</TableHead>
                  <TableHead className="font-semibold text-xs py-3.5 px-4 whitespace-nowrap">URL de base</TableHead>
                  <TableHead className="font-semibold text-xs py-3.5 px-4 whitespace-nowrap">Statut</TableHead>
                  <TableHead className="font-semibold text-xs py-3.5 px-4 text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integrationsVm.isLoadingIntegrations ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-xs py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-accent" />
                    </TableCell>
                  </TableRow>
                ) : integrationsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                      Aucune intégration trouvée.
                    </TableCell>
                  </TableRow>
                ) : (
                  integrationsList.map((integ) => {
                    const isSelected = integrationsVm.selectedIntegration?.id === integ.id;
                    return (
                      <TableRow
                        key={integ.id}
                        onClick={() => integrationsVm.handleSelectIntegration(integ)}
                        className={`cursor-pointer border-border/30 transition-colors ${isSelected ? "bg-accent/15 hover:bg-accent/20" : "hover:bg-muted/20"
                          }`}
                      >
                        <TableCell className="py-3 px-4 font-mono text-xs font-semibold text-accent whitespace-nowrap">
                          {integ.key}
                        </TableCell>

                        <TableCell className="py-3 px-4 text-xs font-semibold text-foreground whitespace-nowrap">
                          {integ.label}
                        </TableCell>

                        <TableCell className="py-3 px-4 text-xs text-muted-foreground font-mono max-w-md truncate">
                          {integ.base_url}
                        </TableCell>

                        <TableCell className="py-3 px-4 whitespace-nowrap">
                          {integ.active ? (
                            <Badge
                              variant="default"
                              className="text-[9px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30 px-2 py-0.5"
                            >
                              Actif
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-[9px] bg-muted text-muted-foreground px-2 py-0.5"
                            >
                              Inactif
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right py-3 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {canUpdate && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => integrationsVm.handleOpenEditIntegration(integ)}
                                title="Modifier l'intégration"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => integrationsVm.handleDeleteIntegration(integ.id)}
                                title="Supprimer l'intégration"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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
      )}

      {/* Integration Modal Dialog */}
      <IntegrationDialog integrationsVm={integrationsVm} />

      {/* Operation Modal Dialog */}
      <OperationDialog integrationsVm={integrationsVm} />

      {/* Operation Import Dialog */}
      <OperationImportDialog integrationsVm={integrationsVm} />

      {/* Confirmation Dialogs */}
      <IntegrationConfirmationDialogs integrationsVm={integrationsVm} />
    </div>
  );
};
