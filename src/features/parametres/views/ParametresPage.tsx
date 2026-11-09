import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Building2,
  Layers,
  Megaphone,
  Percent,
  KeyRound,
  GitFork,
  ChevronDown,
  Check,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isBackofficeAdminActor } from "@/core/security/backofficeAdmin";
import type { SubTabsDefinition } from "@/shared/navigation/subTabs";
import { getPackagesSubTabs } from "@/features/packages/models/subTabs";
import { getWorkflowsSubTabs } from "@/features/workflows/models/subTabs";
import { getDiffusionSubTabs } from "@/features/diffusion/models/subTabs";
import { getTarificationSubTabs } from "@/features/tarification/models/subTabs";
import { getHabilitationsSubTabs } from "@/features/habilitations/models/subTabs";
import { getConnectiviteSubTabs } from "@/features/connectivite/models/subTabs";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AdministrationPage } from "@/features/administration/views/AdministrationPage";
import { PackagesPage } from "@/features/packages/views/PackagesPage";
import { WorkflowsPage } from "@/features/workflows/views/WorkflowsPage";
import DiffusionPage from "@/features/diffusion/views/DiffusionPage";
import { TarificationPage } from "@/features/tarification/views/TarificationPage";
import HabilitationsPage from "@/features/habilitations/views/HabilitationsPage";
import StructureParamsPage from "@/features/structure-params/views/StructureParamsPage";
import ConnectivitePage from "@/features/connectivite/views/ConnectivitePage";
import { computeParametresAccess, type ParametresTab } from "../models/parametresAccess";

/** Onglets principaux, dans l'ordre d'affichage. */
const TAB_DEFINITIONS: Array<{ value: ParametresTab; label: string; icon: LucideIcon }> = [
  { value: "administrations", label: "Administration", icon: Building2 },
  { value: "packages", label: "Packages", icon: Layers },
  { value: "workflows", label: "Workflows", icon: GitFork },
  { value: "diffusion", label: "Diffusion", icon: Megaphone },
  { value: "tarification", label: "Tarification", icon: Percent },
  { value: "habilitations", label: "Habilitations", icon: KeyRound },
  { value: "structureParams", label: "P. Structure", icon: Building2 },
  { value: "banking", label: "Connectivité", icon: Building2 },
];

const tabButtonClass = (active: boolean) =>
  cn(
    "inline-flex items-center gap-2 rounded-lg py-2 px-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
  );

const ParametresPage = () => {
  const [activeTab, setActiveTab] = useState<string>("");

  const { currentPermissions, currentActorRole, entityContext } = useCurrentActor();

  const access = useMemo(
    () => computeParametresAccess(currentActorRole, entityContext, currentPermissions),
    [currentActorRole, entityContext, currentPermissions],
  );
  const { tabs, defaultTab } = access;

  const currentTab = activeTab || defaultTab;

  // Sous-sections de chaque onglet : même règle de visibilité que les modules eux-mêmes
  const subTabsByTab = useMemo<Partial<Record<ParametresTab, SubTabsDefinition>>>(() => {
    const permissions = currentPermissions ?? [];
    return {
      packages: getPackagesSubTabs(currentActorRole, permissions),
      workflows: getWorkflowsSubTabs(currentActorRole, entityContext, permissions),
      diffusion: getDiffusionSubTabs(),
      tarification: getTarificationSubTabs(permissions),
      habilitations: getHabilitationsSubTabs(
        permissions,
        isBackofficeAdminActor(currentActorRole, entityContext, permissions),
      ),
      banking: getConnectiviteSubTabs(currentActorRole, entityContext, permissions),
    };
  }, [currentActorRole, entityContext, currentPermissions]);

  const [selectedSubTabs, setSelectedSubTabs] = useState<Partial<Record<ParametresTab, string>>>({});

  /** Sous-section ouverte d'un onglet : choisie, sinon celle par défaut du module. */
  const getSubTab = (tab: ParametresTab): string | undefined => {
    const definition = subTabsByTab[tab];
    if (!definition || definition.items.length === 0) return undefined;
    const isVisible = (value?: string) => definition.items.some((item) => item.value === value);
    const selected = selectedSubTabs[tab];
    if (isVisible(selected)) return selected;
    return isVisible(definition.defaultValue) ? definition.defaultValue : definition.items[0].value;
  };

  const selectSubTab = (tab: ParametresTab, value: string) => {
    setSelectedSubTabs((previous) => ({ ...previous, [tab]: value }));
  };

  /** Props transmises à un module piloté : sous-section imposée, barre interne masquée. */
  const subTabProps = (tab: ParametresTab) => ({
    subTab: getSubTab(tab),
    onSubTabChange: (value: string) => selectSubTab(tab, value),
    hideSubTabNav: true,
  });

  const currentDefinition = currentTab ? subTabsByTab[currentTab as ParametresTab] : undefined;
  const currentSubTabLabel = currentDefinition?.items.find(
    (item) => item.value === getSubTab(currentTab as ParametresTab),
  )?.label;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="h-10 w-10 rounded-xl gradient-accent flex items-center justify-center">
          <Settings className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground text-sm">
            Configuration générale de la plateforme
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {!currentTab ? (
          <div className="text-center py-16 text-xs text-muted-foreground bg-card border rounded-xl shadow-sm">
            Aucun paramètre ne vous est accessible.
          </div>
        ) : (
        <Tabs
          key={defaultTab}
          defaultValue={defaultTab}
          value={currentTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          {/* Onglets : une flèche signale ceux qui ont des sous-sections, proposées dans une liste déroulante */}
          <nav aria-label="Sections des paramètres" className="flex flex-wrap h-auto w-full gap-1 p-1 bg-muted/60 rounded-xl">
            {TAB_DEFINITIONS.filter((tab) => tabs[tab.value]).map(({ value, label, icon: Icon }) => {
              const isActive = currentTab === value;
              const items = subTabsByTab[value]?.items ?? [];

              if (items.length <= 1) {
                return (
                  <button
                    key={value}
                    type="button"
                    className={tabButtonClass(isActive)}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setActiveTab(value)}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                );
              }

              const activeSubTab = getSubTab(value);
              return (
                <DropdownMenu key={value}>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className={tabButtonClass(isActive)} aria-current={isActive ? "page" : undefined}>
                      <Icon className="h-4 w-4" /> {label}
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[220px]">
                    {items.map((item) => {
                      const isCurrent = isActive && item.value === activeSubTab;
                      return (
                        <DropdownMenuItem
                          key={item.value}
                          className="cursor-pointer gap-2"
                          onSelect={() => {
                            selectSubTab(value, item.value);
                            setActiveTab(value);
                          }}
                        >
                          <Check className={cn("h-4 w-4", isCurrent ? "opacity-100 text-accent" : "opacity-0")} />
                          <span className={cn(isCurrent && "font-semibold")}>{item.label}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </nav>

          {/* Titre de la sous-section ouverte */}
          {currentSubTabLabel && (
            <h2 className="text-lg font-semibold text-foreground">{currentSubTabLabel}</h2>
          )}

          <TabsContent value="administrations">
            <AdministrationPage embedded={true} />
          </TabsContent>

          <TabsContent value="packages">
            <PackagesPage embedded={true} {...subTabProps("packages")} />
          </TabsContent>

          <TabsContent value="workflows">
            <WorkflowsPage embedded={true} {...subTabProps("workflows")} />
          </TabsContent>

          <TabsContent value="diffusion" className="space-y-6">
            <DiffusionPage embedded={true} {...subTabProps("diffusion")} />
          </TabsContent>

          <TabsContent value="tarification">
            <TarificationPage embedded={true} {...subTabProps("tarification")} />
          </TabsContent>

          {tabs.habilitations && (
            <TabsContent value="habilitations">
              <HabilitationsPage embedded={true} {...subTabProps("habilitations")} />
            </TabsContent>
          )}

          {tabs.structureParams && (
            <TabsContent value="structureParams">
              <StructureParamsPage embedded={true} />
            </TabsContent>
          )}

          <TabsContent value="banking">
            <ConnectivitePage embedded {...subTabProps("banking")} />
          </TabsContent>
        </Tabs>
        )}
      </motion.div>
    </div>
  );
};

export default ParametresPage;