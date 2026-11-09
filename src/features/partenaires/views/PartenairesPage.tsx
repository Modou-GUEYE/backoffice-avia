import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Handshake, Plus } from "lucide-react";
import { usePartenaires } from "../viewmodels/usePartenaires";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import PartenairesSummaryCards from "./components/PartenairesSummaryCards";
import PartenairesFilters from "./components/PartenairesFilters";
import PartenairesDataTable from "./components/PartenairesDataTable";
import PartenaireFormDialog from "./components/PartenaireFormDialog";
import { useLocation, useNavigate } from "react-router-dom";

const PartenairesPage = () => {
  const vm = usePartenaires();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const editPartnerId = (location.state as { editPartnerId?: string } | null)?.editPartnerId;
    if (!editPartnerId) return;

    const partner = vm.partenaires.find((candidate) => candidate.id === editPartnerId);
    if (partner) {
      vm.openEdit(partner);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate, vm.partenaires]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-accent flex items-center justify-center">
            <Handshake className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Partenaires</h1>
          </div>
        </div>
        <Button onClick={vm.openCreate} className="gradient-accent text-accent-foreground hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" /> Ajouter un partenaire
        </Button>
      </motion.div>

      {/* Summary Cards */}
      <PartenairesSummaryCards partenaires={vm.partenaires} summary={vm.summary} />


      {/* Filters */}
      <PartenairesFilters
        search={vm.search}
        setSearch={vm.setSearch}
        filterType={vm.filterType}
        setFilterType={vm.setFilterType}
        filterCategorie={vm.filterCategorie}
        setFilterCategorie={vm.setFilterCategorie}
        filterStatut={vm.filterStatut}
        setFilterStatut={vm.setFilterStatut}
      />

      {/* Table */}
      <PartenairesDataTable
        filtered={vm.filtered}
        loading={vm.loading}
        error={vm.error}
        getDisplayName={vm.getDisplayName}
        openDetail={(partner) => navigate(`/dashboard/partenaires/${partner.id}`)}
        openEdit={vm.openEdit}
        confirmToggle={vm.confirmToggle}
        confirmDelete={vm.confirmDelete}
      />

      {/* Add/Edit Partner Dialog */}
      <PartenaireFormDialog
        dialogOpen={vm.dialogOpen}
        setDialogOpen={vm.setDialogOpen}
        editing={vm.editing}
        save={vm.save}
        updatePartnerUser={vm.updatePartnerUser}
        savingPartner={vm.savingPartner}
        savingPartnerUser={vm.savingPartnerUser}
        activeTab={vm.activeTab}
        setActiveTab={vm.setActiveTab}
        setFormType={vm.setFormType}
        form={vm.form}
        setForm={vm.setForm}
        userForm={vm.userForm}
        setUserForm={vm.setUserForm}
        selectPartnerUser={vm.selectPartnerUser}
        deriveLogin={vm.deriveLogin}
        partnerUsers={vm.partnerUsers}
        selectedPartnerUserId={vm.selectedPartnerUserId}
        profilsForCategorie={vm.profilsForCategorie}
        showUserForm={vm.showUserForm}
        setShowUserForm={vm.setShowUserForm}
        openAddUserForm={vm.openAddUserForm}
        addUser={vm.addUser}
        removeUser={vm.removeUser}
        catalogServices={vm.catalogServices}
        toggleService={vm.toggleService}
        clearServices={vm.clearServices}
        formErrors={vm.formErrors}
        clearFormError={vm.clearFormError}
        userFormErrors={vm.userFormErrors}
        clearUserFormError={vm.clearUserFormError}
      />

      {/* Partner Toggle Confirmation Dialog */}
      <ConfirmDialog
        open={vm.toggleDialogOpen}
        onOpenChange={vm.setToggleDialogOpen}
        title="Confirmer"
        description="Voulez-vous vraiment effectuer cette action ?"
        confirmLabel="Oui"
        cancelLabel="Non"
        onConfirm={vm.handleToggle}
      />

      {/* Partner Delete Confirmation Dialog */}
      <ConfirmDialog
        open={vm.deleteDialogOpen}
        onOpenChange={vm.setDeleteDialogOpen}
        title="Confirmer la suppression"
        description="Voulez-vous vraiment effectuer cette action ?"
        confirmLabel="Oui, supprimer"
        cancelLabel="Non"
        onConfirm={vm.handleDelete}
        confirmVariant="destructive"
      />


    </div>
  );
};

export default PartenairesPage;
