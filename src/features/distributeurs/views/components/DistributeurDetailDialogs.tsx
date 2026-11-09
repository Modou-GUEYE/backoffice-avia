import React from "react";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import { AgenceFormDialog } from "@/features/agences/views/components";
import { CaisseFormDialog } from "@/features/caisses/views/components/CaisseFormDialog";
import { DistributeurFormDialog } from "./DistributeurFormDialog";
import { DistributeurDetailUserDialog } from "./DistributeurDetailUserDialog";
import type { useDistributeurDetail } from "../../viewmodels/useDistributeurDetail";

interface DistributeurDetailDialogsProps {
  vm: ReturnType<typeof useDistributeurDetail>;
}

export const DistributeurDetailDialogs: React.FC<DistributeurDetailDialogsProps> = ({ vm }) => {
  const d = vm.distributeur;
  if (!d) return null;

  return (
    <>
      {/* Edit Form Dialog */}
      <DistributeurFormDialog
        open={vm.editDialogOpen}
        onOpenChange={vm.setEditDialogOpen}
        editingDistributeur={d}
        form={vm.form}
        setForm={vm.setForm}
        formErrors={vm.formErrors}
        clearFormError={vm.clearFormError}
        structureOptions={[{ id: d.structure_id || d.structureId || "", nom: vm.structureName }]}
        singleStructureMode={true}
        onSubmit={vm.handleSave}
        loading={vm.isSaving}
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

      {/* Dialogue dédié Utilisateur du distributeur (sans onglets, style Utilisateurs) */}
      <DistributeurDetailUserDialog
        open={vm.userDialogOpen}
        onOpenChange={vm.setUserDialogOpen}
        isEditing={Boolean(vm.selectedUserId)}
        userForm={vm.userForm}
        setUserForm={vm.setUserForm}
        errors={vm.userFormErrors}
        clearError={vm.clearUserFormError}
        onSubmit={vm.handleSaveUser}
        loading={vm.isSavingUser}
        availableRoles={vm.availableUserRoles}
        existingUsernames={vm.existingUsernames}
      />

      {/* Toggle Status Confirmation Dialog */}
      <ConfirmDialog
        open={vm.statusDialogOpen}
        onOpenChange={vm.setStatusDialogOpen}
        title={d.is_active ? "Confirmer la désactivation" : "Confirmer l'activation"}
        description={`Êtes-vous sûr de vouloir ${
          d.is_active ? "désactiver" : "activer"
        } le distributeur « ${d.name || d.nom} » ?`}
        confirmLabel={d.is_active ? "Désactiver" : "Activer"}
        onConfirm={vm.handleToggleStatut}
        confirmVariant={d.is_active ? "destructive" : "default"}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={vm.deleteDialogOpen}
        onOpenChange={vm.setDeleteDialogOpen}
        title="Confirmer la suppression"
        description={`Êtes-vous sûr de vouloir supprimer le distributeur « ${
          d.name || d.nom
        } » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        onConfirm={vm.handleDelete}
        confirmVariant="destructive"
      />

      {/* Nouvelle / Modification Agence Dialog */}
      <AgenceFormDialog
        open={vm.agenceDialogOpen}
        onOpenChange={vm.setAgenceDialogOpen}
        editingAgence={vm.editingAgence}
        form={vm.agenceForm}
        setForm={vm.setAgenceForm}
        structureFormOptions={vm.structureFormOptions}
        distributorFormOptions={vm.distributorFormOptions}
        singleStructureMode={true}
        isRestrictedContext={true}
        onSelectStructure={vm.selectStructure}
        onSelectParent={vm.selectParent}
        onSelectParentType={vm.selectParentType}
        onAddCaisseLine={vm.addCaisseLine}
        onUpdateCaisseLine={vm.updateCaisseLine}
        onRemoveCaisseLine={vm.removeCaisseLine}
        errors={vm.agenceFormErrors}
        onClearError={vm.clearAgenceFormError}
        onSubmit={vm.handleSaveAgence}
        loading={vm.isSavingAgence}
      />

      {/* Agence Status Toggle Confirmation Dialog */}
      <ConfirmDialog
        open={vm.agenceStatusDialogOpen}
        onOpenChange={vm.setAgenceStatusDialogOpen}
        title="Confirmer le changement de statut"
        description={
          vm.togglingAgence?.is_active
            ? `Êtes-vous sûr de vouloir désactiver l'agence « ${vm.togglingAgence?.name ?? ""} » ?`
            : `Êtes-vous sûr de vouloir activer l'agence « ${vm.togglingAgence?.name ?? ""} » ?`
        }
        confirmLabel={vm.togglingAgence?.is_active ? "Désactiver" : "Activer"}
        onConfirm={vm.handleToggleAgenceStatus}
        confirmVariant={vm.togglingAgence?.is_active ? "destructive" : "default"}
      />

      {/* Agence Delete Confirmation Dialog */}
      <ConfirmDialog
        open={vm.agenceDeleteDialogOpen}
        onOpenChange={vm.setAgenceDeleteDialogOpen}
        title="Confirmer la suppression"
        description={`Êtes-vous sûr de vouloir supprimer l'agence « ${vm.deletingAgence?.name ?? ""} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        onConfirm={vm.handleDeleteAgence}
        confirmVariant="destructive"
      />

      {/* Modification Caisse Dialog */}
      <CaisseFormDialog
        open={vm.caisseDialogOpen}
        onOpenChange={vm.setCaisseDialogOpen}
        editingCaisse={vm.editingCaisse}
        form={vm.caisseForm}
        setForm={vm.setCaisseForm}
        agenceOptions={vm.agences.map((a) => ({ id: a.id, nom: a.name }))}
        errors={vm.caisseFormErrors}
        onClearError={vm.clearCaisseFormError}
        onSave={vm.handleSaveCaisse}
        disabled={vm.editingCaisse ? !vm.permissions.canUpdateCaisse : !vm.permissions.canCreateCaisse}
      />

      {/* Caisse Status Toggle Confirmation Dialog */}
      <ConfirmDialog
        open={vm.caisseStatusDialogOpen}
        onOpenChange={vm.setCaisseStatusDialogOpen}
        title="Confirmer le changement de statut"
        description={
          vm.togglingCaisse?.is_active
            ? `Êtes-vous sûr de vouloir désactiver la caisse « ${vm.togglingCaisse?.name ?? ""} » ?`
            : `Êtes-vous sûr de vouloir activer la caisse « ${vm.togglingCaisse?.name ?? ""} » ?`
        }
        confirmLabel={vm.togglingCaisse?.is_active ? "Désactiver" : "Activer"}
        onConfirm={vm.handleToggleCaisseStatus}
        confirmVariant={vm.togglingCaisse?.is_active ? "destructive" : "default"}
      />

      {/* Caisse Delete Confirmation Dialog */}
      <ConfirmDialog
        open={vm.caisseDeleteDialogOpen}
        onOpenChange={vm.setCaisseDeleteDialogOpen}
        title="Confirmer la suppression"
        description={`Êtes-vous sûr de vouloir supprimer la caisse « ${vm.deletingCaisse?.name ?? ""} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        onConfirm={vm.handleDeleteCaisse}
        confirmVariant="destructive"
      />
    </>
  );
};

export default DistributeurDetailDialogs;
