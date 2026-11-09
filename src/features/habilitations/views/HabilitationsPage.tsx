import React, { useEffect } from "react";
import {
  ShieldCheck,
  Plus,
  KeyRound,
  Shield,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import { isBackofficeAdminActor } from "@/core/security/backofficeAdmin";
import { useHabilitations } from "../viewmodels/useHabilitations";
import { buildHabilitationAccess, getProfileRowRights } from "../models/permissions";
import type { ControlledSubTabProps } from "@/shared/navigation/subTabs";
import { HabilitationMatrixRowResponse } from "../models/types";
import {
  DeleteProfileDialog,
  DeletePermissionDialog,
  CreatePermissionDialog,
  ProfileEditCard,
  ProfilesTable,
  PermissionsTable,
} from "./components";

const categoryLabels: Record<string, string> = {
  user: "Utilisateurs",
  structure: "Structures",
  agence: "Agences",
  caisse: "Caisses",
  "autonome-set": "Distributeurs",
  partenaire: "Partenaires",
  produit: "Produits",
  package: "Packages",
  service: "Services",
  "payment-method": "Moyens de paiement",
  subscription: "Abonnements",
  enrollment: "Enrôlements",
  rule: "Frais",
  cap: "Plafonds",
  taxe: "Taxes",
  banking: "Connectivité",
  campaign: "Campagnes de diffusion",
  notification: "Notifications",
  tracking: "Tracking & Audit",
  form: "Formulaires",
  field: "Champs",
  workflow: "Workflows",
  integration: "Intégrations",
  "structure-params": "Paramètres de structure",
  habilitation: "Habilitations",
};

export interface HabilitationsPageProps extends ControlledSubTabProps {
  embedded?: boolean;
}

export const HabilitationsPage: React.FC<HabilitationsPageProps> = ({
  embedded = false,
  subTab,
  onSubTabChange,
  hideSubTabNav = false,
}) => {
  const habVm = useHabilitations();
  const { currentActorRole, entityContext, currentPermissions } = useCurrentActor();
  const access = buildHabilitationAccess(
    currentPermissions,
    isBackofficeAdminActor(currentActorRole, entityContext, currentPermissions),
  );
  const rowRights = (row: HabilitationMatrixRowResponse) =>
    getProfileRowRights(access, row.profile.code, currentPermissions);

  const { clientId, setClientId, activeTab, setActiveTab } = habVm;
  // Sous-onglet piloté par Paramètres quand il est fourni
  useEffect(() => {
    if (subTab === "profiles" || subTab === "permissions") setActiveTab(subTab);
  }, [subTab, setActiveTab]);
  // Sans droit sur les habilitations mobiles, rester sur le back-office
  useEffect(() => {
    if (!access.mobile && clientId === "mobile-app") setClientId("backoffice-web");
  }, [access.mobile, clientId, setClientId]);
  // Ouvrir le premier sous-onglet autorisé
  useEffect(() => {
    if (activeTab === "profiles" && !access.profile.view && access.permission.view) setActiveTab("permissions");
    if (activeTab === "permissions" && !access.permission.view && access.profile.view) setActiveTab("profiles");
  }, [activeTab, access.profile.view, access.permission.view, setActiveTab]);

  const isEditingOrCreatingProfile = habVm.isCreatingProfile || Boolean(habVm.editingProfileRow);
  const editRights = habVm.editingProfileRow
    ? rowRights(habVm.editingProfileRow)
    : { updateDetails: access.profile.create, assign: access.profile.assign };

  if (!access.view) {
    return (
      <div className="text-center py-16 text-xs text-muted-foreground bg-card border rounded-xl shadow-sm">
        Vous n'avez pas la permission d'accéder aux habilitations.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section (only if standalone) */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-accent" /> Habilitations & Profils
            </h2>
            <p className="text-muted-foreground text-sm">
              Gérez les profils et les permissions d'accès au système.
            </p>
          </div>
        </div>
      )}

      {/* Main Container */}
      {isEditingOrCreatingProfile ? (
        <ProfileEditCard
          mode={habVm.isCreatingProfile ? "create" : "edit"}
          editingRow={habVm.editingProfileRow}
          form={habVm.profileForm}
          setForm={habVm.setProfileForm}
          availablePermissions={habVm.availablePermissions}
          categoryLabels={categoryLabels}
          isSaving={habVm.isSaving}
          onTogglePermission={habVm.handleTogglePermission}
          onToggleAllPermissions={habVm.handleToggleAllPermissions}
          canUpdateDetails={editRights.updateDetails}
          canAssign={editRights.assign}
          errors={habVm.profileErrors}
          clearError={habVm.clearProfileError}
          onCancel={habVm.handleCancelProfileForm}
          onSubmit={
            habVm.isCreatingProfile
              ? habVm.handleConfirmCreateProfile
              : habVm.handleConfirmUpdateProfile
          }
        />
      ) : (
        <div className="space-y-5">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl border border-border/40">
            {/* Left: Client selector (backoffice-web vs mobile-app) */}
            <div className="flex items-center p-1 bg-background/80 rounded-lg border border-border/50 shadow-xs">
              <button
                type="button"
                onClick={() => habVm.setClientId("backoffice-web")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  habVm.clientId === "backoffice-web"
                    ? "gradient-accent text-accent-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="h-3.5 w-3.5" /> Backoffice Web
              </button>
              {access.mobile && (
              <button
                type="button"
                onClick={() => habVm.setClientId("mobile-app")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  habVm.clientId === "mobile-app"
                    ? "gradient-accent text-accent-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Shield className="h-3.5 w-3.5" /> Application Mobile
              </button>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Create Permission */}
              {access.permission.create && (
              <Button
                variant="outline"
                size="sm"
                onClick={habVm.handleStartCreatePermission}
                className="text-xs h-8 gap-1.5 border-border"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nouvelle permission</span>
              </Button>
              )}

              {/* Create Profile */}
              {access.profile.create && (
              <Button
                size="sm"
                onClick={habVm.handleStartCreateProfile}
                className="text-xs h-8 gap-1.5 gradient-accent text-accent-foreground shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nouveau profil</span>
              </Button>
              )}
            </div>
          </div>

          {/* Sub-tabs: Profils vs Catalogue Permissions */}
          <Tabs
            value={habVm.activeTab}
            onValueChange={(val) => {
              habVm.setActiveTab(val as "profiles" | "permissions");
              onSubTabChange?.(val);
            }}
            className="space-y-4"
          >
            {!hideSubTabNav && (
            <TabsList className="bg-muted/40 p-1 border border-border/40">
              {access.profile.view && (
              <TabsTrigger
                value="profiles"
                className="text-xs flex items-center gap-2 py-1.5 px-3 data-[state=active]:bg-background"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Profils d'habilitation</span>
              </TabsTrigger>
              )}

              {access.permission.view && (
              <TabsTrigger
                value="permissions"
                className="text-xs flex items-center gap-2 py-1.5 px-3 data-[state=active]:bg-background"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Catalogue des permissions</span>
              </TabsTrigger>
              )}
            </TabsList>
            )}

            <TabsContent value="profiles" className="space-y-4 m-0">
              <ProfilesTable
                profiles={habVm.profiles}
                totalPermissionsCount={habVm.availablePermissions.length}
                isLoadingMatrix={habVm.isLoadingMatrix}
                onStartCreateProfile={habVm.handleStartCreateProfile}
                onStartEditProfile={habVm.handleStartEditProfile}
                onStartDeleteProfile={habVm.setProfileToDelete}
                canCreate={access.profile.create}
                getRowRights={rowRights}
              />
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4 m-0">
              <PermissionsTable
                permissions={habVm.availablePermissions}
                isLoadingMatrix={habVm.isLoadingMatrix}
                onStartCreatePermission={habVm.handleStartCreatePermission}
                onStartEditPermission={habVm.handleStartEditPermission}
                onStartDeletePermission={habVm.setPermissionToDelete}
                canCreate={access.permission.create}
                canEdit={access.permission.update}
                canDelete={access.permission.delete}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Profile Delete Dialog */}
      <DeleteProfileDialog
        open={Boolean(habVm.profileToDelete)}
        onOpenChange={(open) => !open && !habVm.isDeletingProfile && habVm.setProfileToDelete(null)}
        profileToDelete={habVm.profileToDelete}
        isDeleting={habVm.isDeletingProfile}
        onConfirm={habVm.handleDeleteProfile}
        onCancel={() => habVm.setProfileToDelete(null)}
      />

      {/* Permission Delete Dialog */}
      <DeletePermissionDialog
        open={Boolean(habVm.permissionToDelete)}
        onOpenChange={(open) => !open && !habVm.isDeletingPermission && habVm.setPermissionToDelete(null)}
        permissionToDelete={habVm.permissionToDelete}
        isDeleting={habVm.isDeletingPermission}
        onConfirm={habVm.handleDeletePermission}
        onCancel={() => habVm.setPermissionToDelete(null)}
      />

      {/* Permission Create / Edit Dialog */}
      <CreatePermissionDialog
        open={habVm.isCreatingPermission || Boolean(habVm.editingPermission)}
        isEdit={Boolean(habVm.editingPermission)}
        originalCode={habVm.editingPermission?.code}
        onOpenChange={(open) => !open && habVm.handleCancelPermissionModal()}
        form={habVm.permissionForm}
        setForm={habVm.setPermissionForm}
        isSaving={habVm.isSaving}
        onConfirm={habVm.handleConfirmSavePermission}
        onCancel={habVm.handleCancelPermissionModal}
        errors={habVm.permissionErrors}
        clearError={habVm.clearPermissionError}
      />
    </div>
  );
};

export default HabilitationsPage;
