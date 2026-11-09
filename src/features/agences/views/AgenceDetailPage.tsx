import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import FormDialog from "@/shared/components/FormDialog";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin } from "lucide-react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAgenceDetail } from "../viewmodels/useAgenceDetail";
import { AgenceDetailSections } from "./components/AgenceDetailSections";

const AgenceDetailPage = () => {
  const vm = useAgenceDetail();
  const navigate = useNavigate();
  const { distributorId } = useParams<{ distributorId?: string; id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const effectiveDistributorId =
    distributorId ||
    searchParams.get("fromDistributeur") ||
    searchParams.get("distributorId") ||
    (location.state as { fromDistributorId?: string })?.fromDistributorId;

  const handleBack = () => {
    if (effectiveDistributorId) {
      navigate(`/dashboard/distributeurs/${effectiveDistributorId}?tab=agences`);
    } else {
      navigate("/dashboard/agences");
    }
  };

  const backLabel = effectiveDistributorId ? "Retour au distributeur" : "Retour aux agences";

  if (vm.loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!vm.agence) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="gap-2 hover:bg-transparent hover:text-inherit"
        >
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Button>
        <div className="text-center py-12 text-muted-foreground">Agence introuvable</div>
      </div>
    );
  }

  const parentName =
    (vm.resolveParentLabel
      ? vm.resolveParentLabel(vm.agence.parent_id, vm.agence.parent_type)
      : vm.resolveStructureLabel(vm.agence.parent_id)) || "—";
  const parentTypeLabel = vm.agence.parent_type === "DISTRIBUTOR" ? "Distributeur" : "Structure";

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header avec bouton retour et logo/icône premium */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-transparent hover:text-inherit shrink-0"
            onClick={handleBack}
            aria-label={backLabel}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-14 w-14 rounded-2xl border border-border/80 bg-background/50 backdrop-blur-sm shadow-sm flex items-center justify-center overflow-hidden shrink-0">
            <div className="h-full w-full bg-accent/10 flex items-center justify-center text-accent">
              <MapPin className="h-7 w-7" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{vm.agence.name}</h1>
          </div>
        </div>
      </motion.div>

      {/* Onglets principaux */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Tabs value={vm.activeTab} onValueChange={vm.handleTabChange} className="w-full space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-md h-auto p-1 bg-muted/60 rounded-xl gap-1">
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="caisses">Caisses</TabsTrigger>
            <TabsTrigger value="utilisateurs">Utilisateurs</TabsTrigger>
          </TabsList>

          <AgenceDetailSections
            agence={vm.agence}
            caisses={vm.caisses}
            caissesLoading={vm.caissesLoading}
            caisseSearch={vm.caisseSearch}
            onCaisseSearchChange={vm.setCaisseSearch}
            caisseStatus={vm.caisseStatus}
            onCaisseStatusChange={vm.setCaisseStatus}
            utilisateurs={vm.utilisateurs}
            usersLoading={vm.usersLoading}
            userUsername={vm.userUsername}
            onUserUsernameChange={vm.setUserUsername}
            userEmail={vm.userEmail}
            onUserEmailChange={vm.setUserEmail}
            userProfile={vm.userProfile}
            onUserProfileChange={vm.setUserProfile}
            userStatus={vm.userStatus}
            onUserStatusChange={vm.setUserStatus}
            availableProfiles={vm.availableProfiles}
            resolveStructureLabel={vm.resolveStructureLabel}
            resolveParentLabel={vm.resolveParentLabel}
            permissions={vm.permissions}
            statutBadge={vm.statutBadge}
            onOpenCaisseDialog={vm.openCaisseDialog}
            onOpenDetailCaisse={(c) => navigate(`/dashboard/caisses/${c.id}`)}
            onOpenEditCaisseDialog={vm.openEditCaisseDialog}
            onRequestToggleCaisseStatut={vm.requestToggleCaisseStatut}
            onOpenDeleteCaisse={vm.openDeleteCaisse}
          />
        </Tabs>
      </motion.div>

      {/* Dialogue Caisse */}
      <FormDialog
        open={vm.caisseDialogOpen}
        onOpenChange={vm.setCaisseDialogOpen}
        title={vm.editingCaisse ? "Modifier la caisse" : "Nouvelle caisse"}
        description={
          vm.editingCaisse
            ? "Modifiez les informations de la caisse."
            : `Ajoutez une caisse à l'agence « ${vm.agence.name} ».`
        }
        submitLabel={vm.editingCaisse ? "Enregistrer" : "Ajouter"}
        onSubmit={vm.handleSaveCaisse}
        submitDisabled={vm.editingCaisse ? !vm.permissions.canUpdate : !vm.permissions.canCreate}
        contentClassName="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        submitClassName="gradient-accent text-accent-foreground hover:opacity-90"
      >
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Code <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Ex: CSS001"
                value={vm.caisseForm.code}
                {...invalidFieldProps(vm.caisseFormErrors.code)}
                onChange={(e) => {
                  vm.clearCaisseFormError("code");
                  vm.setCaisseForm({ ...vm.caisseForm, code: e.target.value });
                }}
                disabled={Boolean(vm.editingCaisse && !vm.permissions.canUpdate)}
              />
              <FieldError message={vm.caisseFormErrors.code} />
            </div>
            <div className="space-y-2">
              <Label>Nom de la caisse <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Nom de la caisse"
                value={vm.caisseForm.name}
                {...invalidFieldProps(vm.caisseFormErrors.name)}
                onChange={(e) => {
                  vm.clearCaisseFormError("name");
                  vm.setCaisseForm({ ...vm.caisseForm, name: e.target.value });
                }}
                disabled={Boolean(vm.editingCaisse && !vm.permissions.canUpdate)}
              />
              <FieldError message={vm.caisseFormErrors.name} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Agence</Label>
            <Input value={vm.agence.name} disabled />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={vm.deleteDialogOpen}
        onOpenChange={vm.setDeleteDialogOpen}
        title="Confirmer la suppression"
        description={
          vm.deletingCaisse
            ? `Êtes-vous sûr de vouloir supprimer la caisse « ${vm.deletingCaisse.name} » ? Cette action est irréversible.`
            : ""
        }
        confirmLabel="Supprimer"
        onConfirm={vm.handleDeleteCaisse}
        confirmDisabled={!vm.permissions.canDelete}
        confirmVariant="destructive"
      />

      <ConfirmDialog
        open={vm.statusDialogOpen}
        onOpenChange={vm.setStatusDialogOpen}
        title={vm.statusDialogTitle}
        description={vm.statusDialogDescription}
        confirmLabel={vm.statusConfirmLabel}
        onConfirm={vm.confirmToggleCaisseStatut}
        onCancel={vm.cancelToggleCaisseStatut}
      />
    </div>
  );
};

export default AgenceDetailPage;
