import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, Sparkles, Star } from "lucide-react";
import { WorkflowFormField, useWorkflows, validateWorkflowForm } from "../../viewmodels/useWorkflows";
import { FieldError, hasFieldErrors, invalidFieldProps, useFieldErrors } from "@/shared/forms/fieldErrors";
import { StructureSelectCombobox } from "./StructureSelectCombobox";

interface ServiceItem {
  id: string;
  code: string;
  label: string;
}

interface ServiceVersionItem {
  id: string;
  service_id: string;
  version: string;
}

interface ServicePaymentFlowItem {
  id: string;
  service_id: string;
  source_payment_method_ids?: string[];
  destination_payment_method_ids?: string[];
  is_enabled: boolean;
}

interface PaymentMethodItem {
  id: string;
  label: string;
}

interface WorkflowDialogProps {
  workflowsVm: ReturnType<typeof useWorkflows>;
  services: ServiceItem[];
  serviceVersionsForWf: ServiceVersionItem[];
  isLoadingWfVersions: boolean;
  selectedWfServiceId: string;
  serviceFlowsMap: Record<string, ServicePaymentFlowItem[]>;
  paymentMethods: PaymentMethodItem[];
  onSelectWfService: (serviceId: string) => Promise<void> | void;
}

export const WorkflowDialog: React.FC<WorkflowDialogProps> = ({
  workflowsVm,
  services,
  serviceVersionsForWf,
  isLoadingWfVersions,
  selectedWfServiceId,
  serviceFlowsMap,
  paymentMethods,
  onSelectWfService,
}) => {
  const isEditing = Boolean(workflowsVm.editingWorkflow);
  const editingWf = workflowsVm.editingWorkflow;

  const { errors, setErrors, clearError, resetErrors } = useFieldErrors<WorkflowFormField>();

  // Chaque ouverture ou fermeture du dialogue repart d'un formulaire sans erreur affichée
  useEffect(() => {
    resetErrors();
  }, [workflowsVm.showWorkflowDialog, editingWf, resetErrors]);

  const handleSave = () => {
    const validationErrors = validateWorkflowForm(workflowsVm.workflowFormData, {
      isEditing,
      serviceId: selectedWfServiceId,
    });
    setErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;
    void workflowsVm.handleCreateOrUpdateWorkflow();
  };

  const updateServiceVersionId = (value: string) => {
    workflowsVm.setWorkflowFormData({
      ...workflowsVm.workflowFormData,
      service_version_id: value,
    });
    clearError("service_version_id");
  };

  const versionClassName = "h-9 text-xs bg-background font-mono";

  return (
    <Dialog open={workflowsVm.showWorkflowDialog} onOpenChange={workflowsVm.setShowWorkflowDialog}>
      <DialogContent className="max-w-lg bg-background border border-border/50 rounded-2xl shadow-xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-accent/10 text-accent">
                {isEditing ? <ShieldCheck className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {isEditing ? "Modifier le workflow" : "Nouveau workflow"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {isEditing
                    ? "Modifiez les informations du workflow."
                    : "Définissez le nom, le service et le périmètre du nouveau workflow."}
                </DialogDescription>
              </div>
            </div>

            {isEditing && editingWf && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge
                  variant={editingWf.status === "ACTIVE" ? "default" : "secondary"}
                  className="text-[10px] uppercase font-semibold"
                >
                  {editingWf.status || "DRAFT"}
                </Badge>
                {editingWf.is_default && (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-amber-500/30 text-amber-600 bg-amber-500/10 gap-1"
                  >
                    <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> Par défaut
                  </Badge>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Creation Only: Structure Combobox with dynamic backend search en haut */}
          {!isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="wfStructureId" className="text-xs font-semibold">
                Structure (Optionnel)
              </Label>
              <StructureSelectCombobox
                id="wfStructureId"
                value={workflowsVm.workflowFormData.structure_id}
                onChange={(structureId) =>
                  workflowsVm.setWorkflowFormData({
                    ...workflowsVm.workflowFormData,
                    structure_id: structureId || "",
                    definition_kind: structureId ? "WORKFLOW" : "TEMPLATE",
                  })
                }
                placeholder="Sélectionner une structure"
                clearLabel="Sélectionner une structure"
              />
            </div>
          )}

          {/* Nom du workflow * et Type de workflow côte à côte (immédiatement après Structure) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="wfName" className="text-xs font-semibold">
                Nom du workflow <span className="text-destructive">*</span>
              </Label>
              <Input
                id="wfName"
                {...invalidFieldProps(errors.name, "h-9 text-xs bg-background")}
                placeholder="Ex. Workflow Souscription Standard"
                value={workflowsVm.workflowFormData.name}
                onChange={(e) => {
                  workflowsVm.setWorkflowFormData({
                    ...workflowsVm.workflowFormData,
                    name: e.target.value,
                  });
                  clearError("name");
                }}
              />
              <FieldError message={errors.name} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wfType" className="text-xs font-semibold">
                Type de workflow
              </Label>
              <Input
                id="wfType"
                className="h-9 text-xs bg-background font-mono"
                placeholder="STANDARD"
                value={workflowsVm.workflowFormData.workflow_type}
                onChange={(e) =>
                  workflowsVm.setWorkflowFormData({
                    ...workflowsVm.workflowFormData,
                    workflow_type: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* Creation Only: Service concerné * et Version de Service * côte à côte */}
          {!isEditing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="wfServiceId" className="text-xs font-semibold">
                  Service concerné <span className="text-destructive">*</span>
                </Label>
                <select
                  id="wfServiceId"
                  {...invalidFieldProps(
                    errors.service,
                    "w-full h-9 text-xs rounded-lg border border-border/50 bg-background px-3 focus:outline-none focus:ring-1 focus:ring-accent"
                  )}
                  value={selectedWfServiceId}
                  onChange={(e) => {
                    clearError("service");
                    // La version est réinitialisée puis présélectionnée selon le nouveau service
                    clearError("service_version_id");
                    void onSelectWfService(e.target.value);
                  }}
                >
                  <option value="">-- Sélectionner un service --</option>
                  {services.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.label} ({srv.code})
                    </option>
                  ))}
                </select>
                <FieldError message={errors.service} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wfServiceVerId" className="text-xs font-semibold">
                  Version de Service <span className="text-destructive">*</span>
                </Label>
                {isLoadingWfVersions ? (
                  <div className="flex items-center text-xs text-muted-foreground gap-2 py-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" /> Chargement des versions...
                  </div>
                ) : serviceVersionsForWf.length > 0 ? (
                  <select
                    id="wfServiceVerId"
                    {...invalidFieldProps(
                      errors.service_version_id,
                      "w-full h-9 text-xs rounded-lg border border-border/50 bg-background px-3 font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                    )}
                    value={workflowsVm.workflowFormData.service_version_id}
                    onChange={(e) => updateServiceVersionId(e.target.value)}
                  >
                    {serviceVersionsForWf.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.version}
                      </option>
                    ))}
                  </select>
                ) : selectedWfServiceId ? (
                  <div className="space-y-1">
                    <p className="text-[10px] text-amber-600 font-medium truncate">
                      Aucune version enregistrée :
                    </p>
                    <Input
                      id="wfServiceVerId"
                      {...invalidFieldProps(errors.service_version_id, versionClassName)}
                      placeholder="Ex. 9aef8151-56b1-4703-b336-a164bb06a39e"
                      value={workflowsVm.workflowFormData.service_version_id}
                      onChange={(e) => updateServiceVersionId(e.target.value)}
                    />
                  </div>
                ) : (
                  <Input
                    id="wfServiceVerId"
                    {...invalidFieldProps(errors.service_version_id, versionClassName)}
                    placeholder="Sélectionnez un service..."
                    disabled
                  />
                )}
                <FieldError message={errors.service_version_id} />
              </div>
            </div>
          )}


        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => workflowsVm.setShowWorkflowDialog(false)}
            className="text-xs h-9"
            disabled={workflowsVm.isSavingWorkflow}
          >
            Annuler
          </Button>
          <Button
            disabled={workflowsVm.isSavingWorkflow}
            onClick={handleSave}
            className="gradient-accent text-accent-foreground text-xs h-9"
          >
            {workflowsVm.isSavingWorkflow && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {isEditing ? "Enregistrer les modifications" : "Créer le workflow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
