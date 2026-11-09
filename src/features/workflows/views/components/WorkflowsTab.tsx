import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  GitFork,
  Star,
  Power,
  Copy,
  X,
  ArrowUp,
  ArrowDown,
  Loader2,
  Server,
  Smartphone,
  Info,
  CheckCircle2,
  Building2,
} from "lucide-react";
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
import { useWorkflows } from "../../viewmodels/useWorkflows";
import { WorkflowResponse } from "../../models/workflowsTypes";
import { ServiceResponse, ServicePaymentFlowResponse, ServiceVersionResponse } from "@/features/packages/models/types";
import { PaymentMethodResponse } from "@/features/payment-methods/models/types";
import { fetchStructureById } from "@/features/structures/services/structuresService";
import { StructureRead } from "@/features/structures/models/types";
import { WorkflowDialog } from "./WorkflowDialog";
import { WorkflowStepDialog } from "./WorkflowStepDialog";
import { WorkflowConfirmationDialogs } from "./WorkflowConfirmationDialogs";
import { DuplicateWorkflowDialog } from "./DuplicateWorkflowDialog";
import { StructureSelectCombobox } from "./StructureSelectCombobox";

interface WorkflowsTabProps {
  workflowsVm: ReturnType<typeof useWorkflows>;
  services: ServiceResponse[];
  paymentMethods: PaymentMethodResponse[];
  serviceFlowsMap?: Record<string, ServicePaymentFlowResponse[]>;
  selectedWfFilterServiceId: string;
  selectedWfFilterVersionId: string;
  setSelectedWfFilterVersionId: (id: string) => void;
  wfFilterVersions: ServiceVersionResponse[];
  isLoadingWfFilterVersions: boolean;
  selectedWfServiceId: string;
  handleSelectWfService: (id: string) => Promise<void>;
  serviceVersionsForWf: ServiceVersionResponse[];
  isLoadingWfVersions: boolean;
  hasPerm?: (perm: string) => boolean;
}

/** Libellé d'une version : numéro et statut renvoyés par l'API (plusieurs versions peuvent porter le même numéro) */
const formatVersionLabel = (v: ServiceVersionResponse) => {
  const number = v.version.startsWith("v") ? v.version : `v${v.version}`;
  return v.status ? `${number} · ${v.status}` : number;
};

export const WorkflowsTab: React.FC<WorkflowsTabProps> = ({
  workflowsVm,
  services,
  paymentMethods,
  serviceFlowsMap = {},
  selectedWfFilterServiceId,
  selectedWfFilterVersionId,
  setSelectedWfFilterVersionId,
  wfFilterVersions,
  isLoadingWfFilterVersions,
  selectedWfServiceId,
  handleSelectWfService,
  serviceVersionsForWf,
  isLoadingWfVersions,
  hasPerm,
}) => {
  const canCreate = hasPerm ? hasPerm("perm.bo.workflow.create") : true;
  const canUpdate = hasPerm ? hasPerm("perm.bo.workflow.update") : true;
  const canDelete = hasPerm ? hasPerm("perm.bo.workflow.delete") : true;
  const canToggle = hasPerm
    ? hasPerm("perm.bo.workflow.activate") ||
    hasPerm("perm.bo.workflow.deactivate") ||
    hasPerm("perm.bo.workflow.update")
    : true;
  const canSetDefault = hasPerm ? hasPerm("perm.bo.workflow.update") : true;

  const [duplicatingWorkflow, setDuplicatingWorkflow] = useState<WorkflowResponse | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  const [resolvedStructure, setResolvedStructure] = useState<StructureRead | null>(null);
  const [isLoadingStructure, setIsLoadingStructure] = useState(false);

  useEffect(() => {
    const structId = workflowsVm.selectedWorkflow?.structure_id;
    if (structId) {
      setIsLoadingStructure(true);
      fetchStructureById(structId)
        .then((s) => setResolvedStructure(s))
        .catch(() => setResolvedStructure(null))
        .finally(() => setIsLoadingStructure(false));
    } else {
      setResolvedStructure(null);
      setIsLoadingStructure(false);
    }
  }, [workflowsVm.selectedWorkflow?.structure_id]);

  return (
    <div className="space-y-4 pt-2">
      {/* Top Filter & Actions Bar - Masqué sur la page de détail d'un workflow */}
      {!workflowsVm.selectedWorkflow && (
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-3.5 glass-card rounded-xl border border-border/30 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[180px] flex-1 max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un workflow..."
                value={workflowsVm.searchTerm}
                onChange={(e) => workflowsVm.setSearchTerm(e.target.value)}
                className="pl-9 text-xs h-9 bg-background shadow-sm border-border/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold text-muted-foreground shrink-0">Version de service :</Label>
              <select
                className="h-9 text-xs rounded-lg border border-border/50 bg-background px-3 focus:outline-none focus:ring-1 focus:ring-accent font-medium max-w-[300px] truncate"
                value={selectedWfFilterVersionId}
                onChange={(e) => setSelectedWfFilterVersionId(e.target.value)}
                disabled={isLoadingWfFilterVersions}
                aria-label="Version de service"
              >
                <option value="">{isLoadingWfFilterVersions ? "Chargement..." : "Toutes les versions"}</option>
                {services.map((srv) => {
                  const versions = wfFilterVersions.filter((v) => v.service_id === srv.id);
                  if (versions.length === 0) return null;
                  return (
                    <optgroup key={srv.id} label={srv.label}>
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          {formatVersionLabel(v)}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold text-muted-foreground shrink-0">Structure :</Label>
              <div className="min-w-[200px] max-w-[240px]">
                <StructureSelectCombobox
                  value={workflowsVm.filterStructureId || null}
                  onChange={(val) => {
                    const newStructId = val || "";
                    workflowsVm.setFilterStructureId(newStructId);
                    void workflowsVm.loadWorkflows(selectedWfFilterVersionId, newStructId);
                  }}
                  placeholder="Tous (Workflows globaux)"
                  clearLabel="Workflows globaux (aucun)"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {canCreate && (
            <Button
              onClick={() => {
                if (selectedWfFilterServiceId) {
                  void handleSelectWfService(selectedWfFilterServiceId);
                }
                workflowsVm.handleOpenNewWorkflow();
              }}
              className="gradient-accent text-accent-foreground hover:opacity-90 text-xs h-9 shrink-0"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Nouveau Workflow
            </Button>
          )}
        </div>
      )}

      {workflowsVm.selectedWorkflow ? (
        /* Full Page Workflow Details & Steps View */
        <div className="space-y-4">
          {/* Steps & Execution Flow Section (Full Width) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 p-4 bg-accent/5 rounded-xl border border-accent/10">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 min-w-0">
                  <GitFork className="h-4 w-4 text-accent shrink-0" />
                  <span className="truncate">Étapes : {workflowsVm.selectedWorkflow.name}</span>
                </h3>
                {!workflowsVm.selectedWorkflow.structure_id ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 py-0.5 border-slate-500/30 text-slate-500 bg-slate-500/10 shrink-0"
                  >
                    Global
                  </Badge>
                ) : (
                  <span className="text-[11px] bg-muted/40 px-2 py-0.5 rounded border border-border/30 text-foreground font-medium flex items-center gap-1.5 shrink-0">
                    <Building2 className="h-3 w-3 text-accent shrink-0" />
                    <span>
                      Structure :{" "}
                      {isLoadingStructure ? (
                        <span className="text-muted-foreground animate-pulse">Chargement...</span>
                      ) : (
                        resolvedStructure?.name || workflowsVm.selectedWorkflow.structure_id
                      )}
                    </span>
                  </span>
                )}

                {workflowsVm.selectedWorkflow.is_default && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 py-0.5 border-amber-500/30 text-amber-600 bg-amber-500/10 gap-1 font-semibold shrink-0"
                  >
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Par défaut
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Filtre par responsabilité (ALL, MOBILE, SYSTEM) */}
                <div className="flex items-center bg-background/80 rounded-lg p-0.5 border border-border/40 text-xs">
                  <button
                    type="button"
                    onClick={() => workflowsVm.handleFilterResponsibility("ALL")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${workflowsVm.stepResponsibilityFilter === "ALL"
                      ? "bg-accent text-accent-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Toutes
                  </button>
                  <button
                    type="button"
                    onClick={() => workflowsVm.handleFilterResponsibility("MOBILE")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${workflowsVm.stepResponsibilityFilter === "MOBILE"
                      ? "bg-accent text-accent-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Mobile
                  </button>
                  <button
                    type="button"
                    onClick={() => workflowsVm.handleFilterResponsibility("SYSTEM")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${workflowsVm.stepResponsibilityFilter === "SYSTEM"
                      ? "bg-accent text-accent-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Système
                  </button>
                </div>

                {canUpdate && (
                  <Button
                    onClick={workflowsVm.handleOpenNewStep}
                    size="sm"
                    className="gradient-accent text-accent-foreground text-xs h-8"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Nouvelle Étape
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => workflowsVm.handleSelectWorkflow(null)}
                  title="Fermer le constructeur d'étapes"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="glass-card rounded-xl overflow-hidden border border-border/30">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/50">
                    <TableHead className="w-16 font-semibold text-xs">Ordre</TableHead>
                    <TableHead className="font-semibold text-xs">Clé / Titre</TableHead>
                    <TableHead className="font-semibold text-xs">Type & Rôle</TableHead>
                    <TableHead className="font-semibold text-xs">Exécution</TableHead>
                    <TableHead className="font-semibold text-xs">Configs</TableHead>
                    <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflowsVm.isLoadingSteps ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-xs py-8">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-accent" />
                      </TableCell>
                    </TableRow>
                  ) : workflowsVm.workflowSteps.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                        Aucune étape configurée dans ce workflow.
                      </TableCell>
                    </TableRow>
                  ) : (
                    workflowsVm.workflowSteps.map((step, idx) => (
                      <TableRow key={step.id} className="border-border/30 hover:bg-muted/10 transition-colors">
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              disabled={idx === 0}
                              onClick={() => void workflowsVm.handleMoveStep(step, "up")}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              disabled={idx === workflowsVm.workflowSteps.length - 1}
                              onClick={() => void workflowsVm.handleMoveStep(step, "down")}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>

                        <TableCell className="py-2.5">
                          <div className="font-mono text-xs font-semibold text-accent-foreground">
                            {step.step_key}
                          </div>
                          <div className="text-xs font-medium text-foreground">{step.title}</div>
                        </TableCell>

                        <TableCell className="py-2.5">
                          <div className="flex flex-col gap-1 items-start">
                            <Badge
                              variant="outline"
                              className={`font-mono text-[10px] px-1.5 py-0.5 flex items-center gap-1 ${step.step_type === "API"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : step.step_type === "CONFIRMATION"
                                  ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                  : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                }`}
                            >
                              {step.step_type === "API" ? (
                                <Server className="h-2.5 w-2.5" />
                              ) : step.step_type === "CONFIRMATION" ? (
                                <CheckCircle2 className="h-2.5 w-2.5" />
                              ) : step.step_type === "INFO" ? (
                                <Info className="h-2.5 w-2.5" />
                              ) : (
                                <Smartphone className="h-2.5 w-2.5" />
                              )}
                              {step.step_type}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {step.responsibility === "SYSTEM" ? "Système" : "Mobile"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-2.5">
                          {step.execution_mode ? (
                            <Badge
                              variant="secondary"
                              className={`font-mono text-[9px] px-1.5 py-0.5 ${step.execution_mode === "INLINE"
                                ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                }`}
                            >
                              {step.execution_mode}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className="py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {step.config && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] px-1 py-0 bg-blue-500/10 text-blue-600"
                              >
                                Config
                              </Badge>
                            )}
                            {step.condition && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] px-1 py-0 bg-purple-500/10 text-purple-600"
                              >
                                Condition
                              </Badge>
                            )}
                            {step.next_step_rules && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-600"
                              >
                                Règles
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            {canUpdate && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => workflowsVm.handleOpenEditStep(step)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => workflowsVm.handleDeleteStep(step.id)}
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
                  <TableHead className="font-semibold text-xs py-3.5 px-4 whitespace-nowrap">Nom</TableHead>
                  <TableHead className="font-semibold text-xs py-3.5 px-4 whitespace-nowrap">
                    Version de Service
                  </TableHead>
                  <TableHead className="font-semibold text-xs py-3.5 px-4 whitespace-nowrap">
                    Flux de Paiement
                  </TableHead>
                  <TableHead className="font-semibold text-xs py-3.5 px-4 whitespace-nowrap">Type</TableHead>
                  <TableHead className="font-semibold text-xs py-3.5 px-4 whitespace-nowrap">Statut</TableHead>
                  <TableHead className="font-semibold text-xs py-3.5 px-4 text-right whitespace-nowrap">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflowsVm.workflows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                      Aucun workflow trouvé.
                    </TableCell>
                  </TableRow>
                ) : (
                  workflowsVm.workflows.map((wf) => {
                    const isSelected = workflowsVm.selectedWorkflow?.id === wf.id;
                    const isActive = wf.status?.toUpperCase() === "ACTIVE";

                    let flowLabel = "Tous les flux";
                    if (wf.service_payment_flow_id) {
                      for (const srvId in serviceFlowsMap) {
                        const flow = (serviceFlowsMap[srvId] || []).find(
                          (f) => f.id === wf.service_payment_flow_id
                        );
                        if (flow) {
                          const src = (flow.source_payment_method_ids || [])
                            .map((id: string) => paymentMethods.find((pm) => pm.id === id)?.label)
                            .filter(Boolean)
                            .join(", ");
                          const dst = (flow.destination_payment_method_ids || [])
                            .map((id: string) => paymentMethods.find((pm) => pm.id === id)?.label)
                            .filter(Boolean)
                            .join(", ");
                          flowLabel = `${src || "Tout"} → ${dst || "Tout"}`;
                          break;
                        }
                      }
                    }

                    return (
                      <TableRow
                        key={wf.id}
                        onClick={() => workflowsVm.handleSelectWorkflow(wf)}
                        className={`cursor-pointer border-border/30 transition-colors ${isSelected ? "bg-accent/15 hover:bg-accent/20" : "hover:bg-muted/20"
                          }`}
                      >
                        <TableCell className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground whitespace-nowrap">
                              {wf.name}
                            </span>
                            {wf.structure_id ? (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 border-indigo-500/30 text-indigo-600 bg-indigo-500/10 font-mono shrink-0"
                                title={`Structure ID: ${wf.structure_id}`}
                              >
                                Structure
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 border-slate-500/30 text-slate-500 bg-slate-500/10 shrink-0"
                              >
                                Global
                              </Badge>
                            )}
                            {wf.is_default && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 border-amber-500/30 text-amber-600 bg-amber-500/10 gap-1 shrink-0"
                              >
                                <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> Par défaut
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3 px-4 font-mono text-[10px]">
                          <span
                            className="bg-muted/50 px-2 py-0.5 rounded text-muted-foreground border border-border/40 whitespace-nowrap"
                            title={wf.service_version_id}
                          >
                            {(() => {
                              const vObj = wfFilterVersions.find((v) => v.id === wf.service_version_id);
                              if (vObj) return formatVersionLabel(vObj);
                              return wf.service_version_id ? `${wf.service_version_id.substring(0, 8)}...` : "N/A";
                            })()}
                          </span>
                        </TableCell>

                        <TableCell className="py-3 px-4 text-xs whitespace-nowrap">
                          <span className="text-[10px] font-medium text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded">
                            {flowLabel}
                          </span>
                        </TableCell>

                        <TableCell className="py-3 px-4 text-xs whitespace-nowrap">
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-2 py-0.5 uppercase tracking-wider font-semibold"
                          >
                            {wf.workflow_type || "STANDARD"}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3 px-4 whitespace-nowrap">
                          {isActive ? (
                            <Badge
                              variant="default"
                              className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30 px-2 py-0.5"
                            >
                              Actif
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5"
                            >
                              {wf.status || "Inactif"}
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell
                          className="text-right py-3 px-4 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {!wf.is_default && canSetDefault && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Définir comme workflow par défaut"
                                className="h-7 w-7 text-amber-500 hover:bg-amber-500/10"
                                onClick={() => void workflowsVm.handleSetDefaultWorkflow(wf.id)}
                              >
                                <Star className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            {canToggle && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title={isActive ? "Désactiver" : "Activer"}
                                className={`h-7 w-7 ${isActive
                                  ? "text-emerald-600 hover:bg-emerald-500/10"
                                  : "text-muted-foreground hover:bg-muted"
                                  }`}
                                onClick={() =>
                                  isActive
                                    ? void workflowsVm.handleDeactivateWorkflow(wf.id)
                                    : void workflowsVm.handleActivateWorkflow(wf.id)
                                }
                              >
                                <Power className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            {canCreate && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Dupliquer ce workflow"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                                onClick={() => {
                                  setDuplicatingWorkflow(wf);
                                  setShowDuplicateDialog(true);
                                }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            {canUpdate && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => workflowsVm.handleOpenEditWorkflow(wf)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            {canDelete && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => workflowsVm.handleDeleteWorkflow(wf.id)}
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

      {/* Workflow Modal Dialog */}
      <WorkflowDialog
        workflowsVm={workflowsVm}
        services={services}
        serviceVersionsForWf={serviceVersionsForWf}
        isLoadingWfVersions={isLoadingWfVersions}
        selectedWfServiceId={selectedWfServiceId}
        serviceFlowsMap={serviceFlowsMap}
        paymentMethods={paymentMethods}
        onSelectWfService={handleSelectWfService}
      />

      {/* Workflow Step Modal Dialog */}
      <WorkflowStepDialog workflowsVm={workflowsVm} />

      {/* Duplicate Workflow Modal Dialog */}
      <DuplicateWorkflowDialog
        open={showDuplicateDialog}
        onOpenChange={setShowDuplicateDialog}
        sourceWorkflow={duplicatingWorkflow}
        onDuplicate={workflowsVm.handleDuplicateWorkflow}
        isDuplicating={workflowsVm.isSavingWorkflow}
        services={services}
        currentServiceId={selectedWfFilterServiceId}
      />

      {/* Confirmation Dialogs */}
      <WorkflowConfirmationDialogs workflowsVm={workflowsVm} />
    </div>
  );
};

export default WorkflowsTab;
