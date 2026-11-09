import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import { motion } from "framer-motion";
import { Landmark, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCurrentDistributorId, useAuthStore } from "@/core/security/authStore";
import { useCaisses } from "../viewmodels/useCaisses";
import {
  CaisseFormDialog,
  CaissesFilters,
  CaissesSummaryCards,
  CaissesTable,
} from "./components";

const CaissesPage = () => {
  const vm = useCaisses();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const currentDistributorId = getCurrentDistributorId();
  const isDistributor =
    user?.entityContext === "Distributeur" ||
    (Boolean(currentDistributorId) && user?.entityContext !== "Administration" && user?.entityContext !== "Structure");

  useEffect(() => {
    if (isDistributor && currentDistributorId) {
      navigate(`/dashboard/distributeurs/${currentDistributorId}?tab=caisses`, { replace: true });
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
            <Landmark className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestion des Caisses</h1>
          </div>
        </div>
        <div className="flex gap-2">
          {vm.permissions.canCreate && (
            <Button
              onClick={vm.openAdd}
              className="gradient-accent text-accent-foreground hover:opacity-90"
              aria-label="Ajouter une nouvelle caisse"
            >
              <Plus className="h-4 w-4 mr-2" /> Nouvelle caisse
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
        <CaissesSummaryCards summary={vm.summary} />
      </motion.div>

      {/* Filters */}
      <CaissesFilters
        search={vm.search}
        onSearchChange={vm.setSearch}
        filterAgencyId={vm.filterAgencyId}
        onFilterAgencyIdChange={vm.setFilterAgencyId}
        onAgencyDropdownOpen={vm.loadAgencies}
        filterStatut={vm.filterStatut}
        onFilterStatutChange={vm.setFilterStatut}
        filterParentType={vm.filterParentType}
        onFilterParentTypeChange={vm.setFilterParentType}
        agenceOptions={vm.agenceOptions}
      />

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card rounded-xl overflow-hidden shadow-sm"
      >
        <CaissesTable
          loading={vm.loading}
          error={vm.error}
          caisses={vm.filtered}
          resolveAgencyLabel={vm.resolveAgencyLabel}
          resolveParentTypeLabel={vm.resolveParentTypeLabel}
          permissions={vm.permissions}
          onOpenDetail={(c) => navigate(`/dashboard/caisses/${c.id}`)}
          onOpenEdit={vm.openEdit}
          onConfirmToggleStatus={vm.requestToggleStatut}
          onConfirmDelete={vm.openDelete}
        />
      </motion.div>

      {/* Add / Edit Dialog */}
      <CaisseFormDialog
        open={vm.dialogOpen}
        onOpenChange={vm.setDialogOpen}
        editingCaisse={vm.editingCaisse}
        form={vm.form}
        setForm={vm.setForm}
        agenceOptions={vm.agenceOptions}
        onSave={vm.handleSave}
        disabled={vm.editingCaisse ? !vm.permissions.canUpdate : !vm.permissions.canCreate}
        errors={vm.formErrors}
        onClearError={vm.clearFormError}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={vm.deleteDialogOpen}
        onOpenChange={vm.setDeleteDialogOpen}
        title="Confirmer la suppression"
        description={`Êtes-vous sûr de vouloir supprimer la caisse « ${vm.deletingCaisse?.name ?? ""} » ?`}
        confirmLabel="Supprimer"
        onConfirm={vm.handleDelete}
        confirmVariant="destructive"
      />

      {/* Toggle status confirmation */}
      <ConfirmDialog
        open={vm.statusDialogOpen}
        onOpenChange={vm.setStatusDialogOpen}
        title={vm.statusDialogTitle}
        description={vm.statusDialogDescription}
        confirmLabel={vm.statusConfirmLabel}
        onConfirm={vm.confirmToggleStatut}
        confirmVariant={vm.statusNextAction === "deactivate" ? "destructive" : "default"}
      />
    </div>
  );
};

export default CaissesPage;
