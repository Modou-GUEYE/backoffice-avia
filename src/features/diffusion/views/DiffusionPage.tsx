import { useState } from "react";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import { useDiffusion } from "../viewmodels/useDiffusion";
import {
  NotificationsTab,
  CampaignsTab,
} from "./components";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Megaphone } from "lucide-react";
import type { ControlledSubTabProps } from "@/shared/navigation/subTabs";
import { getDiffusionSubTabs } from "../models/subTabs";

interface DiffusionPageProps extends ControlledSubTabProps {
  embedded?: boolean;
}

export const DiffusionPage = ({ embedded = false, subTab, onSubTabChange, hideSubTabNav = false }: DiffusionPageProps) => {
  const { currentPermissions } = useCurrentActor();
  const [internalSubTab, setInternalSubTab] = useState<string>(getDiffusionSubTabs().defaultValue);
  // Sous-onglet piloté par Paramètres quand il est fourni
  const activeSubTab = subTab ?? internalSubTab;
  const setActiveSubTab = (value: string) => {
    setInternalSubTab(value);
    onSubTabChange?.(value);
  };

  const hasPerm = (perm: string) => {
    if (!currentPermissions) return false;
    const isGlobalAdmin = currentPermissions.some(
      (p) => p === "profile.bo-admin" || p === "profile.bo.admin" || p === "*" || p === "all",
    );
    if (isGlobalAdmin) return true;
    return currentPermissions.some((p) => p.toLowerCase() === perm.toLowerCase());
  };

  const vm = useDiffusion({ enabled: true, activeSubTab });

  const canCreateNotification = hasPerm("perm.bo.notification.create");
  const canUpdateNotification = hasPerm("perm.bo.notification.update");
  const canDeleteNotification = hasPerm("perm.bo.notification.delete");

  const canCreateCampaign = hasPerm("perm.bo.campaign.create");
  const canUpdateCampaign = hasPerm("perm.bo.campaign.update");
  const canDeleteCampaign = hasPerm("perm.bo.campaign.delete");

  return (
    <div className="space-y-6">
      {/* Header section (only if not embedded) */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-accent" /> Diffusion & Communication
            </h2>
            <p className="text-muted-foreground text-sm">
              Gérez les notifications automatiques transactionnelles et les campagnes publicitaires de l'institution.
            </p>
          </div>
        </div>
      )}

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-6">
        {!hideSubTabNav && (
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <TabsList className="flex w-full sm:w-[450px] bg-muted/40 p-1 rounded-xl border border-border/30">
            <TabsTrigger value="notificationsList" className="flex-1 py-2 text-xs rounded-lg">
              Gestion notifications
            </TabsTrigger>
            <TabsTrigger value="campaignsList" className="flex-1 py-2 text-xs rounded-lg">
              Publicités & Informations
            </TabsTrigger>
          </TabsList>
        </div>
        )}

        {/* Sub-tab 1: Notifications */}
        <TabsContent value="notificationsList" className="space-y-4 pt-1 outline-none">
          <NotificationsTab
            vm={vm}
            canCreate={canCreateNotification}
            canUpdate={canUpdateNotification}
            canDelete={canDeleteNotification}
          />
        </TabsContent>

        {/* Sub-tab 2: Campaigns */}
        <TabsContent value="campaignsList" className="space-y-4 pt-1 outline-none">
          <CampaignsTab
            vm={vm}
            canCreate={canCreateCampaign}
            canUpdate={canUpdateCampaign}
            canDelete={canDeleteCampaign}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DiffusionPage;
