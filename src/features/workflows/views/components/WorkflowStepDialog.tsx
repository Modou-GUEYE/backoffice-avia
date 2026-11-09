import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitFork, Layers, Code, Loader2 } from "lucide-react";
import { StepDialogTab, getStepErrorTab, useWorkflows } from "../../viewmodels/useWorkflows";
import { StepGeneralTab } from "./StepGeneralTab";
import { StepApiMappingTab } from "./StepApiMappingTab";
import { StepSummaryFieldsMappingTab } from "./StepSummaryFieldsMappingTab";
import { StepAdvancedTab } from "./StepAdvancedTab";

interface WorkflowStepDialogProps {
  workflowsVm: ReturnType<typeof useWorkflows>;
}

export const WorkflowStepDialog: React.FC<WorkflowStepDialogProps> = ({ workflowsVm }) => {
  const isApi = workflowsVm.stepFormData.step_type === "API";
  const isInfo = workflowsVm.stepFormData.step_type === "INFO";
  const isConfirmation = workflowsVm.stepFormData.step_type === "CONFIRMATION";
  const hasMappingTab = isApi || isInfo || isConfirmation;
  const [activeTab, setActiveTab] = useState<StepDialogTab>("general");

  // Chaque ouverture du dialogue repart sur l'onglet Général
  useEffect(() => {
    if (workflowsVm.showStepDialog) setActiveTab("general");
  }, [workflowsVm.showStepDialog]);

  const handleTabChange = (val: string) => {
    setActiveTab(val as StepDialogTab);
    if (val === "mapping" && !workflowsVm.mappingContext && workflowsVm.selectedWorkflow) {
      if (workflowsVm.editingStep) {
        void workflowsVm.loadMappingContext(workflowsVm.selectedWorkflow.id, workflowsVm.editingStep.id);
      } else {
        if (isInfo || isConfirmation) {
          void workflowsVm.loadStepContext(workflowsVm.stepFormData.step_type, null);
        } else if (isApi && workflowsVm.stepFormData.integration_operation_id) {
          void workflowsVm.loadStepContext("API", workflowsVm.stepFormData.integration_operation_id);
        }
      }
    }
  };

  const handleSave = async () => {
    const errors = await workflowsVm.handleCreateOrUpdateStep();
    // Affiche l'onglet qui contient le premier champ en erreur
    const errorTab = getStepErrorTab(errors);
    if (errorTab && errorTab !== activeTab) handleTabChange(errorTab);
  };

  return (
    <Dialog open={workflowsVm.showStepDialog} onOpenChange={workflowsVm.setShowStepDialog}>
      <DialogContent className="sm:max-w-4xl bg-background border border-border/50 rounded-2xl shadow-xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-muted/10 flex flex-row items-center gap-3 space-y-0">
          <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent shrink-0">
            <GitFork className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base font-bold text-foreground">
                {workflowsVm.editingStep ? "Modifier l'étape" : "Nouvelle étape de workflow"}
              </DialogTitle>
              {!isInfo && !isConfirmation && (
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase font-mono ${
                    isApi
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/25"
                      : "bg-blue-500/10 text-blue-600 border-blue-500/25"
                  }`}
                >
                  {isApi ? "API Système" : "Formulaire Mobile"}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {isApi
                ? "Configurez l'opération d'intégration technique et son mapping de requête / réponse."
                : isInfo
                ? "Configurez les données des étapes précédentes à restituer à l'utilisateur mobile."
                : isConfirmation
                ? "Configurez le message et les champs récapitulatifs à afficher pour confirmation par l'utilisateur mobile."
                : "Configurez l'étape mobile soumise par l'utilisateur final."}
            </DialogDescription>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} className="w-full" onValueChange={handleTabChange}>
          <div className="px-6 pt-3 border-b border-border/30 bg-muted/5">
            <TabsList
              className={`grid w-full ${
                hasMappingTab ? "grid-cols-3" : "grid-cols-2"
              } h-9 p-1 bg-muted/40 rounded-lg`}
            >
              <TabsTrigger value="general" className="text-xs font-semibold rounded-md">
                Général
              </TabsTrigger>
              {hasMappingTab && (
                <TabsTrigger value="mapping" className="text-xs font-semibold rounded-md flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-accent" /> Mapping des données
                </TabsTrigger>
              )}
              <TabsTrigger
                value="json"
                className="text-xs font-semibold rounded-md flex items-center gap-1.5"
              >
                <Code className="h-3.5 w-3.5 text-accent" /> Configurations JSON
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <TabsContent value="general" className="m-0">
              <StepGeneralTab workflowsVm={workflowsVm} />
            </TabsContent>

            {hasMappingTab && (
              <TabsContent value="mapping" className="m-0">
                {isApi && <StepApiMappingTab workflowsVm={workflowsVm} />}
                {isInfo && (
                  <StepSummaryFieldsMappingTab
                    workflowsVm={workflowsVm}
                    stepType="INFO"
                  />
                )}
                {isConfirmation && (
                  <StepSummaryFieldsMappingTab
                    workflowsVm={workflowsVm}
                    stepType="CONFIRMATION"
                  />
                )}
              </TabsContent>
            )}

            <TabsContent value="json" className="m-0">
              <StepAdvancedTab workflowsVm={workflowsVm} />
            </TabsContent>
          </div>

          <DialogFooter className="p-4 px-6 border-t border-border/40 bg-muted/10 gap-2">
            <Button
              variant="ghost"
              onClick={() => workflowsVm.setShowStepDialog(false)}
              className="text-xs h-9"
            >
              Annuler
            </Button>
            <Button
              disabled={workflowsVm.isSavingStep}
              onClick={() => void handleSave()}
              className="gradient-accent text-accent-foreground text-xs h-9 px-4"
            >
              {workflowsVm.isSavingStep && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {workflowsVm.editingStep ? "Enregistrer les modifications" : "Ajouter l'étape"}
            </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
