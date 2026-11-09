import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import { motion } from "framer-motion";
import { Plus, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCurrentDistributorId, useAuthStore } from "@/core/security/authStore";
import { useDistributeurs } from "../viewmodels/useDistributeurs";
import {
  DistributeurFormDialog,
  DistributeursFilters,
  DistributeursSummaryCards,
  DistributeursTable,
} from "./components";

export const DistributeursPage: React.FC = () => {
  const vm = useDistributeurs();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const currentDistributorId = getCurrentDistributorId();
  const isDistributor =
    user?.entityContext === "Distributeur" ||
    (Boolean(currentDistributorId) && user?.entityContext !== "Administration" && user?.entityContext !== "Structure");

  useEffect(() => {
    if (isDistributor && currentDistributorId) {
      navigate(`/dashboard/distributeurs/${currentDistributorId}`, { replace: true });
    }
  }, [isDistributor, currentDistributorId, navigate]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-accent flex items-center justify-center shadow-sm">
            <Truck className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestion des Distributeurs</h1>
          </div>
        </div>
        <div className="flex gap-2">
          {vm.permissions.canCreate && (
            <Button
              onClick={vm.openAdd}
              className="gradient-accent text-accent-foreground hover:opacity-90 shadow-sm"
              aria-label="Ajouter un nouveau distributeur"
            >
              <Plus className="h-4 w-4 mr-2" /> Nouveau distributeur
            </Button>
          )}
        </div>
      </motion.div>

      {/* KPI Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <DistributeursSummaryCards
          summary={vm.summary}
        />
      </motion.div>

      {/* Filters */}
      <DistributeursFilters
        search={vm.search}
        onSearchChange={vm.setSearch}
        filterStructureId={vm.filterStructureId}
        onFilterStructureIdChange={vm.setFilterStructureId}
        filterStatut={vm.filterStatut}
        onFilterStatutChange={vm.setFilterStatut}
        structureOptions={vm.structureOptions}
        singleStructureMode={vm.singleStructureMode}
      />

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card rounded-xl overflow-hidden shadow-sm"
      >
        <DistributeursTable
          loading={vm.loading}
          error={vm.error}
          distributeurs={vm.filtered}
          resolveStructureLabel={vm.resolveStructureLabel}
          permissions={vm.permissions}
          onOpenDetail={(d) => navigate(`/dashboard/distributeurs/${d.id}`)}
          onOpenEdit={vm.openEdit}
          onConfirmToggleStatus={vm.requestToggleStatut}
          onConfirmDelete={vm.openDelete}
        />
      </motion.div>

      {/* Form Dialog */}
      <DistributeurFormDialog
        open={vm.dialogOpen}
        onOpenChange={vm.setDialogOpen}
        editingDistributeur={vm.editingDistributeur}
        form={vm.form}
        setForm={vm.setForm}
        formErrors={vm.formErrors}
        clearFormError={vm.clearFormError}
        structureOptions={vm.structureOptions}
        singleStructureMode={vm.singleStructureMode}
        onSubmit={vm.handleSave}
        loading={vm.isSaving}
        disabled={vm.editingDistributeur ? !vm.permissions.canUpdate : !vm.permissions.canCreate}
        onLogoFileSelected={vm.onLogoFileSelected}
        users={vm.users}
        userForm={vm.userForm}
        setUserForm={vm.setUserForm}
        userFormErrors={vm.userFormErrors}
        clearUserFormError={vm.clearUserFormError}
        availableUserRoles={vm.availableUserRoles}
        showUserForm={vm.showUserForm}
        selectedUserId={vm.selectedUserId}
        isUpdatingUser={vm.isUpdatingUser}
        deriveLogin={vm.deriveLogin}
        openAddUserForm={vm.openAddUserForm}
        cancelUserForm={vm.cancelUserForm}
        addUser={vm.addUser}
        editUser={vm.editUser}
        removeUser={vm.removeUser}
        updateUser={vm.updateDistributeurUser}
      />

      {/* Toggle Status Confirmation Dialog */}
      <ConfirmDialog
        open={vm.statusDialogOpen}
        onOpenChange={vm.setStatusDialogOpen}
        title={vm.statusNextAction === "deactivate" ? "Confirmer la désactivation" : "Confirmer l'activation"}
        description={`Êtes-vous sûr de vouloir ${
          vm.statusNextAction === "deactivate" ? "désactiver" : "activer"
        } le distributeur « ${vm.statusTarget?.name || vm.statusTarget?.nom || ""} » ?`}
        confirmLabel={vm.statusNextAction === "deactivate" ? "Désactiver" : "Activer"}
        onConfirm={vm.handleToggleStatut}
        confirmVariant={vm.statusNextAction === "deactivate" ? "destructive" : "default"}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={vm.deleteDialogOpen}
        onOpenChange={vm.setDeleteDialogOpen}
        title="Confirmer la suppression"
        description={`Êtes-vous sûr de vouloir supprimer le distributeur « ${
          vm.deletingDistributeur?.name || vm.deletingDistributeur?.nom || ""
        } » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        onConfirm={vm.handleDelete}
        confirmVariant="destructive"
      />
    </div>
  );
};

export default DistributeursPage;
