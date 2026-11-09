import { useState, useMemo } from "react";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import { useConnectivite } from "../viewmodels/useConnectivite";
import { getConnectiviteSubTabs } from "../models/subTabs";
import type { ControlledSubTabProps } from "@/shared/navigation/subTabs";
import { motion } from "framer-motion";
import { Settings, Database, Layers } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildConnectivitePermissions,
  hasBankingAccess,
  scopeConnectivitePermissions,
} from "../models/permissions";
import { BANKING_BACKENDS, connectionOriginLevels, type BankingBackend } from "../models/types";
import {
  ConnectionConfigTab,
  CatalogueTab,
  EndpointsTab,
  OperationDialog,
  OperationDetailDialog,
  DeleteOperationDialog,
  EndpointEditDialog,
} from "./components";

interface ConnectivitePageProps extends ControlledSubTabProps {
  embedded?: boolean;
}

export const ConnectivitePage = ({
  embedded = false,
  subTab,
  onSubTabChange,
  hideSubTabNav = false,
}: ConnectivitePageProps) => {
  const { currentPermissions, currentActorRole, entityContext } = useCurrentActor();
  const [internalBankingSubTab, setInternalBankingSubTab] = useState("connection");
  // Sous-onglet piloté par Paramètres quand il est fourni
  const activeBankingSubTab = subTab ?? internalBankingSubTab;
  const setActiveBankingSubTab = (value: string) => {
    setInternalBankingSubTab(value);
    onSubTabChange?.(value);
  };
  const [catalogSearch, setCatalogSearch] = useState("");

  const isGlobalAdmin =
    (currentActorRole === "Administrateur" && entityContext === "Administration") ||
    Boolean(
      currentPermissions?.some(
        (p) => p === "profile.bo-admin" || p === "profile.bo.admin" || p === "*" || p === "all",
      ),
    );

  const hasPerm = (perm: string) => {
    if (!currentPermissions) return false;
    if (isGlobalAdmin) return true;
    return currentPermissions.some((p) => p.toLowerCase() === perm.toLowerCase());
  };

  const perms = buildConnectivitePermissions(hasPerm);
  const visibleSubTabs = getConnectiviteSubTabs(currentActorRole, entityContext, currentPermissions).items.map(
    (item) => item.value,
  );
  const currentSubTab = visibleSubTabs.includes(activeBankingSubTab)
    ? activeBankingSubTab
    : visibleSubTabs[0] ?? "connection";

  const vm = useConnectivite({ enabled: true, activeSubTab: currentSubTab });
  const scopedPerms = scopeConnectivitePermissions(perms, vm.selectedStructureId === "GLOBAL_DEFAULTS");

  const filteredOperations = useMemo(() => {
    if (!catalogSearch.trim()) return vm.operations;
    const q = catalogSearch.toLowerCase();
    return vm.operations.filter(
      (op) =>
        op.code.toLowerCase().includes(q) ||
        op.label?.toLowerCase().includes(q),
    );
  }, [vm.operations, catalogSearch]);

  // Structure cible et backend sur une même ligne ; le backend ne concerne que la connexion
  const showBackendSelect = currentSubTab === "connection";
  const targetSelectors = (!vm.isStructureAdmin || showBackendSelect) && (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {!vm.isStructureAdmin && (
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase shrink-0">Structure Cible :</Label>
          <Select value={vm.selectedStructureId} onValueChange={vm.setSelectedStructureId}>
            <SelectTrigger className="w-[240px] h-9 text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GLOBAL_DEFAULTS" className="text-xs font-semibold text-accent">
                Valeurs globales par defaut
              </SelectItem>
              {vm.structures.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {showBackendSelect && (
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase shrink-0">Backend :</Label>
          <Select value={vm.selectedBackend} onValueChange={(v) => vm.setSelectedBackend(v as BankingBackend)}>
            <SelectTrigger className="w-[200px] h-9 text-xs bg-background font-mono font-semibold" aria-label="Backend">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BANKING_BACKENDS.map((backend) => (
                <SelectItem key={backend} value={backend} className="text-xs font-mono">{backend}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  if (!isGlobalAdmin && !hasBankingAccess(currentPermissions)) {
    return (
      <div className="text-center py-16 text-xs text-muted-foreground bg-card border rounded-xl shadow-sm">
        Vous n'avez pas la permission d'accéder à la configuration de la connectivité.
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Header with Structure Selector */}
        {!embedded && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">Connectivité</h3>
              <p className="text-xs text-muted-foreground">
                Gerez le raccordement et la cartographie des endpoints d'API pour les transactions et le KYC.
              </p>
            </div>

            {targetSelectors}
          </div>
        )}

        {/* Sélecteurs de cible quand l'écran est intégré */}
        {embedded && targetSelectors}

        {vm.bankingConfig && (
          <div className="flex flex-wrap gap-2 text-[10px] items-center text-muted-foreground pb-2 mt-1">
            <span className="bg-muted/60 px-2 py-0.5 rounded border border-border/40 font-medium">
              {(() => {
                // Connexion d'une structure : origine lue dans resolved_from (champ par champ)
                const levels = connectionOriginLevels(vm.bankingConfig);
                if (levels.length === 0) return `Niveau : ${vm.bankingConfig.tenant_level}`;
                if (levels.length === 1) return `Origine : ${levels[0]}${levels[0] === "GLOBAL" ? " (héritée)" : ""}`;
                return "Origine : mixte";
              })()}
            </span>
            {vm.bankingConfig.backend && (
              <span className="bg-muted/60 px-2 py-0.5 rounded border border-border/40 font-mono font-medium">
                Backend : {vm.bankingConfig.backend}
              </span>
            )}
            {vm.bankingConfig.environment && (
              <span className="bg-muted/60 px-2 py-0.5 rounded border border-border/40 uppercase text-accent font-semibold">
                Env : {vm.bankingConfig.environment}
              </span>
            )}
            <span className="bg-muted/60 px-2 py-0.5 rounded border border-border/40 font-medium flex items-center gap-1.5">
              Statut :
              <span className={`h-1.5 w-1.5 rounded-full ${vm.bankingConfig.is_active ? "bg-emerald-500" : "bg-muted-foreground"}`} />
              {vm.bankingConfig.is_active ? "Actif" : "Inactif"}
            </span>
          </div>
        )}

        {visibleSubTabs.length === 0 ? (
          <div className="text-center py-16 text-xs text-muted-foreground bg-card border rounded-xl shadow-sm">
            Aucune section de la connectivité ne vous est accessible.
          </div>
        ) : (
        <Tabs value={currentSubTab} onValueChange={setActiveBankingSubTab} className="space-y-4">
          {!hideSubTabNav && (
          <TabsList className="flex w-full sm:w-[540px] bg-muted/40 p-1 rounded-xl border border-border/30">
            {perms.connection.view && (
              <TabsTrigger value="connection" className="flex-1 py-1.5 text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200">
                <Settings className="h-3.5 w-3.5" /> Config. de Connexion
              </TabsTrigger>
            )}
            {perms.operation.view && (
              <TabsTrigger value="catalogue" className="flex-1 py-1.5 text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200">
                <Database className="h-3.5 w-3.5" /> Catalogue d'Opérations
              </TabsTrigger>
            )}
            {perms.endpoint.view && (
              <TabsTrigger value="endpoints" className="flex-1 py-1.5 text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200">
                <Layers className="h-3.5 w-3.5" /> Endpoints d'Opérations
              </TabsTrigger>
            )}
          </TabsList>
          )}

          <TabsContent value="connection" className="space-y-6 pt-2">
            <ConnectionConfigTab vm={vm} perms={scopedPerms.connection} />
          </TabsContent>

          <TabsContent value="catalogue" className="space-y-4 pt-2">
            <CatalogueTab
              vm={vm}
              filteredOperations={filteredOperations}
              catalogSearch={catalogSearch}
              setCatalogSearch={setCatalogSearch}
              perms={scopedPerms.operation}
            />
          </TabsContent>

          <TabsContent value="endpoints" className="space-y-4 pt-2">
            <EndpointsTab vm={vm} perms={scopedPerms.endpoint} />
          </TabsContent>
        </Tabs>
        )}
      </motion.div>

      {/* Dialogs */}
      <OperationDialog vm={vm} />
      <OperationDetailDialog vm={vm} />
      <DeleteOperationDialog vm={vm} />
      <EndpointEditDialog vm={vm} />
    </>
  );
};

export default ConnectivitePage;
