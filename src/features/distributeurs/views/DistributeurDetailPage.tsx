import React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { ArrowLeft, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCurrentDistributorId, useAuthStore } from "@/core/security/authStore";
import { useDistributeurDetail } from "../viewmodels/useDistributeurDetail";
import {
  DistributeurAgencesTab,
  DistributeurCaissesTab,
  DistributeurDetailDialogs,
  DistributeurGeneralTab,
  DistributeurUsersTab,
} from "./components";

export const DistributeurDetailPage: React.FC = () => {
  const vm = useDistributeurDetail();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const currentDistributorId = getCurrentDistributorId();
  const isDistributor =
    user?.entityContext === "Distributeur" ||
    (Boolean(currentDistributorId) && user?.entityContext !== "Administration" && user?.entityContext !== "Structure");

  if (vm.loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Chargement du distributeur...</p>
      </div>
    );
  }

  if (!vm.distributeur) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {!isDistributor && (
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard/distributeurs")}
            className="gap-2 hover:bg-transparent hover:text-inherit"
          >
            <ArrowLeft className="h-4 w-4" /> Retour aux distributeurs
          </Button>
        )}
        <div className="text-center py-12 text-muted-foreground">
          {vm.error || "Distributeur introuvable"}
        </div>
      </div>
    );
  }

  const d = vm.distributeur;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header avec retour, logo/icône, titre et actions */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          {!isDistributor && (
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-transparent hover:text-inherit shrink-0"
              onClick={() => navigate("/dashboard/distributeurs")}
              aria-label="Retour aux distributeurs"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          <div className="h-14 w-14 rounded-2xl border border-border/80 bg-background/50 backdrop-blur-sm shadow-sm flex items-center justify-center overflow-hidden shrink-0">
            {d.media_url ? (
              <img
                src={d.media_url}
                alt={d.name || d.nom}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <div className="h-full w-full bg-accent/10 flex items-center justify-center text-accent">
                <Truck className="h-7 w-7" />
              </div>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground">{d.name || d.nom}</h1>
            <p className="text-muted-foreground text-sm flex items-center flex-wrap gap-x-2">
              <span>
                Structure : <span className="font-medium text-foreground">{vm.structureName}</span>
              </span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Onglets principaux */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Tabs value={vm.activeTab} onValueChange={vm.setActiveTab} className="w-full space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-lg h-auto p-1 bg-muted/60 rounded-xl gap-1">
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="agences">Agences</TabsTrigger>
            <TabsTrigger value="caisses">Caisses</TabsTrigger>
            <TabsTrigger value="utilisateurs">Utilisateurs</TabsTrigger>
          </TabsList>

          {vm.activeTab === "details" && (
            <DistributeurGeneralTab
              distributeur={d}
              structureName={vm.structureName}
              canUpdate={vm.permissions.canUpdate}
            />
          )}

          {vm.activeTab === "agences" && (
            <DistributeurAgencesTab
              distributeurId={d.id}
              distributeurName={d.name || d.nom}
              agences={vm.agences}
              loading={vm.agencesLoading}
              canCreateAgence={vm.permissions.canCreateAgence}
              canUpdateAgence={vm.permissions.canUpdateAgence}
              canDeleteAgence={vm.permissions.canDeleteAgence}
              onOpenAddAgence={vm.openAddAgence}
              onOpenEditAgence={vm.openEditAgence}
              onConfirmToggleStatus={vm.confirmToggleAgenceStatus}
              onConfirmDelete={vm.confirmDeleteAgence}
              search={vm.agencySearch}
              onSearchChange={vm.setAgencySearch}
              city={vm.agencyCity}
              onCityChange={vm.setAgencyCity}
              status={vm.agencyStatus}
              onStatusChange={vm.setAgencyStatus}
            />
          )}

          {vm.activeTab === "caisses" && (
            <DistributeurCaissesTab
              distributeurId={d.id}
              caisses={vm.caisses}
              agences={vm.agences}
              loading={vm.caissesLoading}
              canCreateCaisse={vm.permissions.canCreateCaisse}
              canUpdateCaisse={vm.permissions.canUpdateCaisse}
              canDeleteCaisse={vm.permissions.canDeleteCaisse}
              onOpenAddCaisse={vm.openAddCaisse}
              onOpenEditCaisse={vm.openEditCaisse}
              onConfirmToggleCaisseStatus={vm.confirmToggleCaisseStatus}
              onConfirmDeleteCaisse={vm.confirmDeleteCaisse}
              search={vm.caisseSearch}
              onSearchChange={vm.setCaisseSearch}
              status={vm.caisseStatus}
              onStatusChange={vm.setCaisseStatus}
            />
          )}

          {vm.activeTab === "utilisateurs" && (
            <DistributeurUsersTab
              users={vm.users}
              loading={vm.usersLoading}
              availableRoles={vm.availableUserRoles}
              username={vm.userUsername}
              onUsernameChange={vm.setUserUsername}
              email={vm.userEmail}
              onEmailChange={vm.setUserEmail}
              profile={vm.userProfile}
              onProfileChange={vm.setUserProfile}
              status={vm.userStatus}
              onStatusChange={vm.setUserStatus}
              onOpenAddUser={vm.openAddUser}
              onEditUser={vm.openEditUser}
              onDeleteUser={vm.removeUser}
              onToggleStatut={vm.toggleUserStatut}
              onResetPassword={vm.resetUserPassword}
              onValidatePassword={vm.validateUserPassword}
            />
          )}
        </Tabs>
      </motion.div>

      {/* Dialogues du détail distributeur (formulaires et confirmations) */}
      <DistributeurDetailDialogs vm={vm} />
    </div>
  );
};

export default DistributeurDetailPage;
