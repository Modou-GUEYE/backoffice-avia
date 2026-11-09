import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import { motion } from "framer-motion";
import { MapPin, Plus } from "lucide-react";
import { getCurrentDistributorId, useAuthStore } from "@/core/security/authStore";
import { useAgences } from "../viewmodels/useAgences";
import {
  AgenceFormDialog,
  AgencesFilters,
  AgencesSummaryCards,
  AgencesTable,
} from "./components";

const AgencesPage = () => {
  const vm = useAgences();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const currentDistributorId = getCurrentDistributorId();
  const isDistributor =
    user?.entityContext === "Distributeur" ||
    (Boolean(currentDistributorId) && user?.entityContext !== "Administration" && user?.entityContext !== "Structure");

  useEffect(() => {
    if (isDistributor && currentDistributorId) {
      navigate(`/dashboard/distributeurs/${currentDistributorId}?tab=agences`, { replace: true });
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
            <MapPin className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestion des Agences</h1>
          </div>
        </div>
        <div className="flex gap-2">
          {vm.permissions.canCreate && (
            <Button
              onClick={vm.openAdd}
              className="gradient-accent text-accent-foreground hover:opacity-90"
              aria-label="Ajouter une nouvelle agence"
            >
              <Plus className="h-4 w-4 mr-2" /> Nouvelle agence
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
        <AgencesSummaryCards agences={vm.agences} summary={vm.summary} />
      </motion.div>

      {/* Filters */}
      <AgencesFilters
        search={vm.search}
        onSearchChange={vm.setSearch}
        filterCity={vm.filterCity}
        onFilterCityChange={vm.setFilterCity}
        filterParentType={vm.filterParentType}
        onFilterParentTypeChange={vm.setFilterParentType}
        filterStatut={vm.filterStatut}
        onFilterStatutChange={vm.setFilterStatut}
      />

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card rounded-xl overflow-hidden shadow-sm"
      >
        <AgencesTable
          loading={vm.loading}
          error={vm.error}
          agences={vm.filtered}
          resolveStructureLabel={vm.resolveStructureLabel}
          resolveParentLabel={vm.resolveParentLabel}
          getCaisseCount={vm.getCaisseCount}
          permissions={vm.permissions}
          onOpenEdit={vm.openEdit}
          onConfirmToggleStatus={vm.confirmToggleStatut}
          onConfirmDelete={vm.confirmDelete}
        />
      </motion.div>

      {/* Add/Edit Dialog */}
      <AgenceFormDialog
        open={vm.dialogOpen}
        onOpenChange={vm.setDialogOpen}
        editingAgence={vm.editingAgence}
        form={vm.form}
        setForm={vm.setForm}
        structureFormOptions={vm.structureFormOptions}
        distributorFormOptions={vm.distributorFormOptions}
        singleStructureMode={vm.singleStructureMode}
        isRestrictedContext={vm.isRestrictedContext}
        onSelectStructure={vm.selectStructure}
        onSelectParent={vm.selectParent}
        onSelectParentType={vm.selectParentType}
        onAddCaisseLine={vm.addCaisseLine}
        onUpdateCaisseLine={vm.updateCaisseLine}
        onRemoveCaisseLine={vm.removeCaisseLine}
        onSubmit={vm.handleSave}
        errors={vm.formErrors}
        onClearError={vm.clearFormError}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={vm.deleteDialogOpen}
        onOpenChange={vm.setDeleteDialogOpen}
        title="Confirmer la suppression"
        description={`Êtes-vous sûr de vouloir supprimer l'agence « ${vm.deletingAgence?.name ?? ""} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        onConfirm={vm.handleDelete}
        confirmVariant="destructive"
      />

      {/* Status Toggle Confirmation */}
      <ConfirmDialog
        open={vm.statusDialogOpen}
        onOpenChange={vm.setStatusDialogOpen}
        title="Confirmer le changement de statut"
        description={
          vm.togglingAgence?.is_active
            ? `Voulez-vous désactiver l'agence « ${vm.togglingAgence?.name} » ? Aucune transaction ne pourra passer tant qu'elle est inactive.`
            : `Voulez-vous réactiver l'agence « ${vm.togglingAgence?.name} » ?`
        }
        confirmLabel="Confirmer"
        onConfirm={vm.handleToggleStatut}
      />
    </div>
  );
};

export default AgencesPage;
