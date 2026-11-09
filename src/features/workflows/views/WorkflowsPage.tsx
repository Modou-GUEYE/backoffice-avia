import React, { useMemo, useCallback } from "react";
import { GitFork, FileText, BookOpen, Workflow, Server } from "lucide-react";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkflowsPage } from "../viewmodels/useWorkflowsPage";
import { getWorkflowsSubTabs } from "../models/subTabs";
import type { ControlledSubTabProps } from "@/shared/navigation/subTabs";
import { FormsTab, WorkflowsTab, FieldCatalogTab, IntegrationsTab } from "./components";
import type { ServiceResponse } from "@/features/packages/models/types";
import type { PaymentMethodResponse } from "@/features/payment-methods/models/types";

export interface WorkflowsPageProps extends ControlledSubTabProps {
  embedded?: boolean;
  initialTab?: "forms" | "workflows" | "fields" | "integrations";
  services?: ServiceResponse[];
  paymentMethods?: PaymentMethodResponse[];
  structureId?: string;
}

export const WorkflowsPage: React.FC<WorkflowsPageProps> = ({
  embedded = false,
  initialTab = "workflows",
  services,
  paymentMethods,
  structureId,
  subTab,
  onSubTabChange,
  hideSubTabNav = false,
}) => {
  const { currentPermissions, currentActorRole, entityContext } = useCurrentActor();

  const isTechnicalProfile = useMemo(() => {
    return (
      currentActorRole === "Profil Technique" ||
      Boolean(
        currentPermissions?.some(
          (p) =>
            p === "profile.bo-profil-technique" ||
            p === "profile.bo.profil-technique" ||
            p.toLowerCase().includes("profil-technique")
        )
      )
    );
  }, [currentActorRole, currentPermissions]);

  const isBackofficeAdmin = useMemo(() => {
    return (
      (currentActorRole === "Administrateur" && entityContext === "Administration") ||
      Boolean(
        currentPermissions?.some(
          (p) =>
            p === "profile.bo-admin" ||
            p === "profile.bo.admin" ||
            p === "*" ||
            p === "all" ||
            p.toLowerCase().includes("bo-admin") ||
            p.toLowerCase().includes("bo.admin")
        )
      )
    );
  }, [currentActorRole, entityContext, currentPermissions]);

  const hasPerm = useCallback(
    (perm: string) => {
      if (!currentPermissions) return false;

      const isWildcardAdmin =
        isBackofficeAdmin ||
        currentPermissions.some(
          (p) =>
            p === "profile.bo-admin" ||
            p === "profile.bo.admin" ||
            p === "*" ||
            p === "all"
        );
      if (isWildcardAdmin) return true;

      const isActionPerm =
        perm.startsWith("perm.bo.form.") ||
        perm.startsWith("perm.bo.workflow.") ||
        perm.startsWith("perm.bo.integration.") ||
        perm.startsWith("perm.bo.field.");

      if (!isActionPerm) {
        const isGlobalAdmin = currentPermissions.some(
          (p) => p === "profile.bo-admin" || p === "profile.bo.admin"
        );
        if (isGlobalAdmin) return true;

        if (
          isTechnicalProfile &&
          (perm.includes("workflow") ||
            perm.includes("integration") ||
            perm.includes("form") ||
            perm.includes("field"))
        ) {
          return true;
        }
      }

      return currentPermissions.some(
        (p) => p.toLowerCase() === perm.toLowerCase()
      );
    },
    [currentPermissions, isBackofficeAdmin, isTechnicalProfile]
  );

  const vm = useWorkflowsPage({
    // Sous-onglet piloté par Paramètres quand il est fourni
    initialTab: (subTab as WorkflowsPageProps["initialTab"]) ?? initialTab,
    services,
    paymentMethods,
    structureId,
  });

  // Sous-onglets visibles : même règle que la navigation de Paramètres
  const visibleSubTabs = useMemo(
    () => new Set(getWorkflowsSubTabs(currentActorRole, entityContext, currentPermissions).items.map((item) => item.value)),
    [currentActorRole, entityContext, currentPermissions],
  );
  const canViewWorkflows = visibleSubTabs.has("workflows");
  const canViewForms = visibleSubTabs.has("forms");
  const canViewFields = visibleSubTabs.has("fields");
  const canViewIntegrations = visibleSubTabs.has("integrations");

  const effectiveTab = useMemo(() => {
    if (vm.activeTab === "workflows" && canViewWorkflows) return "workflows";
    if (vm.activeTab === "integrations" && canViewIntegrations) return "integrations";
    if (vm.activeTab === "forms" && canViewForms) return "forms";
    if (vm.activeTab === "fields" && canViewFields) return "fields";
    if (canViewWorkflows) return "workflows";
    if (canViewIntegrations) return "integrations";
    if (canViewForms) return "forms";
    if (canViewFields) return "fields";
    return "";
  }, [vm.activeTab, canViewWorkflows, canViewIntegrations, canViewForms, canViewFields]);

  return (
    <div className="space-y-6">
      {/* Page Header when not embedded */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Workflow className="h-6 w-6 text-accent" />
              Workflows & Formulaires
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Gestion et orchestration des étapes d'exécution de service, intégrations techniques, formulaires dynamiques et catalogue de champs.
            </p>
          </div>
        </div>
      )}

      {/* Tabs Layout */}
      <Tabs
        value={effectiveTab || vm.activeTab}
        onValueChange={(val) => {
          vm.setActiveTab(val as "forms" | "workflows" | "fields" | "integrations");
          onSubTabChange?.(val);
        }}
        className="space-y-4"
      >
        {!hideSubTabNav && (
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <TabsList className="bg-muted/40 p-1 rounded-xl h-10 border border-border/30">
            {canViewWorkflows && (
              <TabsTrigger
                value="workflows"
                className="text-xs font-semibold px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center gap-2"
              >
                <GitFork className="h-3.5 w-3.5" /> Workflows
              </TabsTrigger>
            )}

            {canViewIntegrations && (
              <TabsTrigger
                value="integrations"
                className="text-xs font-semibold px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center gap-2"
              >
                <Server className="h-3.5 w-3.5" /> Intégrations
              </TabsTrigger>
            )}

            {canViewForms && (
              <TabsTrigger
                value="forms"
                className="text-xs font-semibold px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center gap-2"
              >
                <FileText className="h-3.5 w-3.5" /> Formulaires
              </TabsTrigger>
            )}

            {canViewFields && (
              <TabsTrigger
                value="fields"
                className="text-xs font-semibold px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center gap-2"
              >
                <BookOpen className="h-3.5 w-3.5" /> Catalogue de Champs
              </TabsTrigger>
            )}
          </TabsList>
        </div>
        )}

        {canViewWorkflows && (
          <TabsContent value="workflows" className="space-y-4 pt-1 outline-none">
            <WorkflowsTab
              workflowsVm={vm.workflowsVm}
              services={vm.services}
              paymentMethods={vm.paymentMethods}
              selectedWfFilterServiceId={vm.selectedWfFilterServiceId}
              selectedWfFilterVersionId={vm.selectedWfFilterVersionId}
              setSelectedWfFilterVersionId={vm.setSelectedWfFilterVersionId}
              wfFilterVersions={vm.wfFilterVersions}
              isLoadingWfFilterVersions={vm.isLoadingWfFilterVersions}
              selectedWfServiceId={vm.selectedWfServiceId}
              handleSelectWfService={vm.handleSelectWfService}
              serviceVersionsForWf={vm.serviceVersionsForWf}
              isLoadingWfVersions={vm.isLoadingWfVersions}
              hasPerm={hasPerm}
            />
          </TabsContent>
        )}

        {canViewIntegrations && (
          <TabsContent value="integrations" className="space-y-4 pt-1 outline-none">
            <IntegrationsTab
              integrationsVm={vm.integrationsVm}
              hasPerm={hasPerm}
            />
          </TabsContent>
        )}

        {canViewForms && (
          <TabsContent value="forms" className="space-y-4 pt-1 outline-none">
            <FormsTab
              formsVm={vm.formsVm}
              fieldCatalogVm={vm.fieldCatalogVm}
              hasPerm={hasPerm}
            />
          </TabsContent>
        )}

        {canViewFields && (
          <TabsContent value="fields" className="space-y-4 pt-1 outline-none">
            <FieldCatalogTab
              fieldCatalogVm={vm.fieldCatalogVm}
              hasPerm={hasPerm}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default WorkflowsPage;
