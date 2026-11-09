import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import { motion } from "framer-motion";
import { Building2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStructures } from "../viewmodels/useStructures";
import {
  StructuresSummaryCards,
  StructuresFilters,
  StructuresDataTable,
  StructureFormDialog,
} from "./components";

const StructuresPage = () => {
  const vm = useStructures();
  const navigate = useNavigate();

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-accent flex items-center justify-center">
            <Building2 className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestion des Structures</h1>
          </div>
        </div>
        <div className="flex gap-2">
          {vm.permissions.canCreate && (
            <Button onClick={vm.openAdd} className="gradient-accent text-accent-foreground hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" /> Nouvelle structure
            </Button>
          )}
        </div>
      </motion.div>

      {/* KPI Summary Cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <StructuresSummaryCards structures={vm.structures} summary={vm.summary} />
      </motion.div>

      {/* Filters */}
      <StructuresFilters
        search={vm.search}
        onSearchChange={vm.setSearch}
        filterStatut={vm.filterStatut}
        onFilterStatutChange={vm.setFilterStatut}
      />

      {/* Table */}
      <StructuresDataTable
        vm={vm}
        onNavigate={(id) => navigate(`/dashboard/structures/${id}`)}
      />

      {/* Create/Edit Dialog */}
      <StructureFormDialog vm={vm} />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={vm.deleteDialogOpen}
        onOpenChange={vm.setDeleteDialogOpen}
        title="Confirmer la suppression"
        description={`Êtes-vous sûr de vouloir supprimer la structure « ${vm.deletingStructure?.name ?? ""} » ? Cette action procédera à un archivage. Si la structure possède des transactions ou enrôlements, la suppression sera refusée.`}
        confirmLabel="Supprimer"
        onConfirm={vm.handleDelete}
        confirmVariant="destructive"
      />

      {/* Toggle statut confirmation */}
      <ConfirmDialog
        open={vm.statutDialogOpen}
        onOpenChange={vm.setStatutDialogOpen}
        title="Confirmer le changement de statut"
        description={
          vm.togglingStructure?.is_active
            ? `Voulez-vous désactiver « ${vm.togglingStructure?.name} » ? Aucune transaction ne pourra passer tant que la structure sera inactive.`
            : `Voulez-vous activer « ${vm.togglingStructure?.name} » ?`
        }
        confirmLabel="Confirmer"
        onConfirm={vm.toggleStatut}
      />
    </div>
  );
};

export default StructuresPage;
