import React from "react";
import { motion } from "framer-motion";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { useStructureParams } from "../viewmodels/useStructureParams";
import { isBackofficeAdminActor } from "@/core/security/backofficeAdmin";
import { buildStructureParamsAccess, canSaveStructureParams } from "../models/permissions";
import {
  StructureParamsHeader,
  ConnectivityAccountsCard,
  KycCriteriaCard,
  StructureParamsActions,
} from "./components";

export interface StructureParamsPageProps {
  embedded?: boolean;
}

export const StructureParamsPage: React.FC<StructureParamsPageProps> = ({ embedded = false }) => {
  const { currentActorRole, entityContext, currentPermissions } = useCurrentActor();
  const access = buildStructureParamsAccess(
    currentPermissions,
    isBackofficeAdminActor(currentActorRole, entityContext, currentPermissions),
  );
  const vm = useStructureParams({ enabled: access.view });

  if (!access.view) {
    return (
      <div className="text-center py-16 text-xs text-muted-foreground bg-card border rounded-xl shadow-sm">
        Vous n'avez pas la permission d'accéder aux paramètres de structure.
      </div>
    );
  }

  const isGlobalDefaults = vm.selectedStructureId === "GLOBAL_DEFAULTS";
  const canSave = canSaveStructureParams(access, isGlobalDefaults);
  const canReset = access.reset && !isGlobalDefaults;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {vm.isSavingParams && (
        <LoadingOverlay
          title="Enregistrement des paramètres"
          description="Veuillez patienter pendant l'enregistrement des paramètres de structure..."
        />
      )}
      <StructureParamsHeader
        isStructureAdmin={vm.isStructureAdmin}
        selectedStructureId={vm.selectedStructureId}
        onSelectStructureId={vm.setSelectedStructureId}
        structures={vm.structures}
        isLoadingStructures={vm.isLoadingStructures}
        structureParams={vm.structureParams}
        embedded={embedded}
      />

      {vm.isLoadingParams ? (
        <div className="text-center py-16 text-xs text-muted-foreground">
          Chargement des paramètres...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ConnectivityAccountsCard
            form={vm.paramsForm}
            onChange={vm.setParamsForm}
            disabled={vm.isSavingParams || !canSave}
          />

          <KycCriteriaCard
            form={vm.paramsForm}
            onChange={vm.setParamsForm}
            disabled={vm.isSavingParams || !canSave}
          />

          {(canSave || canReset) && (
            <StructureParamsActions
              canSave={canSave}
              canReset={canReset}
              isSaving={vm.isSavingParams}
              onReset={vm.handleResetParams}
              onSave={vm.handleSaveParams}
            />
          )}
        </div>
      )}
    </motion.div>
  );
};

export default StructureParamsPage;
