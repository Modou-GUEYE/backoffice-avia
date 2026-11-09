import React, { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import { usePackages } from "../viewmodels/usePackages";
import { createPackagesHasPerm, getPackagesSubTabs, isPackagesTechnicalProfile } from "../models/subTabs";
import type { ControlledSubTabProps } from "@/shared/navigation/subTabs";
import { PaymentMethodsPage } from "@/features/payment-methods/views/PaymentMethodsPage";
import { AbonnementsPage } from "@/features/abonnements/views/AbonnementsPage";
import {
  fetchServiceVersions,
  createServiceVersion,
  publishServiceVersion,
  deprecateServiceVersion,
} from "../services/servicesService";
import { ServiceResponse, ServiceVersionResponse } from "../models/types";
import {
  PackagesTab,
  ServicesTab,
  PackageDialog,
  PackageDetailDialog,
  PackageDuplicateDialog,
  PackageConfirmationDialogs,
  ServiceDialog,
  ServiceVersionsModal,
  ServicePaymentFlowDialog,
} from "./components";
import { ServiceDetailPage } from "./ServiceDetailPage";
import { hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import { ServiceVersionFormField, validateServiceVersionForm } from "../viewmodels/packageValidation";

export interface PackagesPageProps extends ControlledSubTabProps {
  embedded?: boolean;
}

export const PackagesPage: React.FC<PackagesPageProps> = ({
  embedded = false,
  subTab,
  onSubTabChange,
  hideSubTabNav = false,
}) => {
  const { currentActorRole = "", currentPermissions = [] } = useCurrentActor();
  const isTechnicalProfile = isPackagesTechnicalProfile(currentActorRole, currentPermissions);
  const hasPerm = useCallback(
    (perm: string) => createPackagesHasPerm(currentActorRole, currentPermissions)(perm),
    [currentActorRole, currentPermissions],
  );

  const defaultSubTab = useMemo(
    () => getPackagesSubTabs(currentActorRole, currentPermissions).defaultValue,
    [currentActorRole, currentPermissions],
  );

  const [internalSubTab, setInternalSubTab] = useState<string>(defaultSubTab);
  // Sous-onglet piloté par Paramètres quand il est fourni
  const activeSubTab = subTab ?? internalSubTab;
  const setActiveSubTab = (value: string) => {
    setInternalSubTab(value);
    onSubTabChange?.(value);
  };

  // Packages & Services ViewModel
  const pkgVm = usePackages({ enabled: true, isTechnical: isTechnicalProfile });

  // Service Versions Modal State (Réservé UNIQUEMENT au profil technique et aux permissions explicites de versioning)
  const hasVersionPermission = useMemo(() => {
    return currentPermissions.some((p) => {
      const lower = p.toLowerCase();
      return (
        lower === "perm.bo.service.version" ||
        lower === "perm.bo.service.manage-versions" ||
        lower === "perm.bo.service.version.manage" ||
        lower === "perm.bo.service.version.list" ||
        lower === "perm.bo.service.version.create" ||
        lower === "perm.bo.service.version.update" ||
        lower.startsWith("perm.bo.service.version")
      );
    });
  }, [currentPermissions]);

  const canAccessVersions = isTechnicalProfile || hasVersionPermission;

  const [showVersionModal, setShowVersionModal] = useState<boolean>(false);
  const [selectedServiceForVersions, setSelectedServiceForVersions] = useState<ServiceResponse | null>(null);
  const [serviceVersions, setServiceVersions] = useState<ServiceVersionResponse[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState<boolean>(false);
  const [isSavingVersion, setIsSavingVersion] = useState<boolean>(false);
  const [newVersionData, setNewVersionData] = useState<{ version: string; changelog: string }>({
    version: "",
    changelog: "",
  });
  const {
    errors: versionFormErrors,
    setErrors: setVersionFormErrors,
    clearError: clearVersionFormError,
    resetErrors: resetVersionFormErrors,
  } = useFieldErrors<ServiceVersionFormField>();

  // Modal de configuration directe des flux de paiement pour un service
  const [serviceForFlowModal, setServiceForFlowModal] = useState<ServiceResponse | null>(null);

  const handleOpenServiceVersions = async (service: ServiceResponse) => {
    if (!canAccessVersions) {
      toast.error("Accès réservé au profil technique ou aux utilisateurs autorisés");
      return;
    }
    setSelectedServiceForVersions(service);
    setShowVersionModal(true);
    setNewVersionData({ version: "", changelog: "" });
    resetVersionFormErrors();
    try {
      setIsLoadingVersions(true);
      const versions = await fetchServiceVersions(service.id);
      setServiceVersions(versions);
    } catch {
      toast.error("Erreur lors du chargement des versions du service");
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleCreateNewVersion = async () => {
    if (!canAccessVersions) {
      toast.error("Opération non autorisée");
      return;
    }
    if (!selectedServiceForVersions) return;
    const validationErrors = validateServiceVersionForm(newVersionData);
    setVersionFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;
    try {
      setIsSavingVersion(true);
      const created = await createServiceVersion(selectedServiceForVersions.id, {
        version: newVersionData.version.trim(),
        changelog: newVersionData.changelog.trim() || null,
      });
      setServiceVersions((prev) => [created, ...prev]);
      toast.success("Nouvelle version créée avec succès");
      setNewVersionData({ version: "", changelog: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création de la version");
    } finally {
      setIsSavingVersion(false);
    }
  };

  const handlePublishVersion = async (versionId: string) => {
    if (!canAccessVersions) {
      toast.error("Opération non autorisée");
      return;
    }
    if (!selectedServiceForVersions) return;
    try {
      const updated = await publishServiceVersion(selectedServiceForVersions.id, versionId);
      setServiceVersions((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      toast.success("Version publiée avec succès");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la publication de la version");
    }
  };

  const handleDeprecateVersion = async (versionId: string) => {
    if (!canAccessVersions) {
      toast.error("Opération non autorisée");
      return;
    }
    if (!selectedServiceForVersions) return;
    try {
      const updated = await deprecateServiceVersion(selectedServiceForVersions.id, versionId);
      setServiceVersions((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      toast.success("Version marquée comme obsolète");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'obsolescence de la version");
    }
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h2 className="text-xl font-bold text-foreground">Gestion des Packages</h2>
          <p className="text-muted-foreground text-sm">
            Configurez les packages de services et moyens de paiement ainsi que les activations globales de la technique.
          </p>
        </div>
      )}

      <Tabs
        key={defaultSubTab}
        defaultValue={defaultSubTab}
        value={activeSubTab}
        onValueChange={setActiveSubTab}
        className="space-y-6"
      >
        {!hideSubTabNav && (
        <TabsList className="flex flex-wrap h-auto w-full sm:w-[840px] gap-1 p-1 bg-muted/40 rounded-xl border border-border/30">
          {hasPerm("perm.bo.package.list") && (
            <TabsTrigger value="listPackages" className="flex-1 py-2 text-xs rounded-lg">
              Packages
            </TabsTrigger>
          )}
          {hasPerm("perm.bo.service.list") && (
            <TabsTrigger value="listServices" className="flex-1 py-2 text-xs rounded-lg">
              Services
            </TabsTrigger>
          )}
          {(hasPerm("perm.bo.payment-method.list") || hasPerm("profile.bo-controller")) && (
            <TabsTrigger value="listPaymentMethods" className="flex-1 py-2 text-xs rounded-lg">
              Moyens de paiement
            </TabsTrigger>
          )}
          {hasPerm("perm.bo.subscription.list") && (
            <TabsTrigger value="listAbonnements" className="flex-1 py-2 text-xs rounded-lg">
              Abonnements
            </TabsTrigger>
          )}
        </TabsList>
        )}

        {/* Sub-tab 1: Packages */}
        <TabsContent value="listPackages" className="space-y-6 pt-2">
          <PackagesTab
            packages={pkgVm.packages}
            onAdd={pkgVm.openAddPackage}
            onEdit={pkgVm.openEditPackage}
            onDetail={pkgVm.openDetailPackage}
            onDuplicate={pkgVm.openDuplicatePackage}
            onDelete={(id) => {
              const p = pkgVm.packages.find((item) => item.id === id) || null;
              pkgVm.setPackageToDelete(p);
            }}
            onToggleStatus={({ pkg, activate }) => {
              pkgVm.setPackageToggleConfirmation({ pkg, activate });
            }}
            onArchive={(id) => {
              const p = pkgVm.packages.find((item) => item.id === id) || null;
              pkgVm.setPackageToArchive(p);
            }}
            hasPerm={hasPerm}
          />
        </TabsContent>

        {/* Sub-tab 2: Services */}
        <TabsContent value="listServices" className="space-y-6 pt-2">
          {pkgVm.viewingService ? (
            <ServiceDetailPage
              service={pkgVm.viewingService}
              onBack={() => {
                pkgVm.closeDetailService();
                setActiveSubTab("listServices");
              }}
              isTechnicalProfile={isTechnicalProfile}
              canManageVersions={canAccessVersions}
              onManageVersions={handleOpenServiceVersions}
            />
          ) : (
            <ServicesTab
              services={pkgVm.services}
              onAdd={pkgVm.openAddService}
              onEdit={pkgVm.openEditService}
              onDetail={pkgVm.openDetailService}
              onToggleStatus={pkgVm.handleToggleServiceStatus}
              onManageVersions={handleOpenServiceVersions}
              canManageVersions={canAccessVersions}
              onDelete={pkgVm.handleDeleteService}
              onConfigureFlows={(srv) => setServiceForFlowModal(srv)}
              hasPerm={hasPerm}
              isTechnicalProfile={isTechnicalProfile}
            />
          )}
        </TabsContent>

        {/* Sub-tab 3: Moyens de paiement */}
        <TabsContent value="listPaymentMethods" className="space-y-6 pt-2">
          <PaymentMethodsPage embedded={true} />
        </TabsContent>

        {/* Sub-tab 4: Abonnements */}
        <TabsContent value="listAbonnements" className="space-y-6 pt-2">
          <AbonnementsPage embedded={true} />
        </TabsContent>
      </Tabs>

      {/* Package Create/Edit Dialog */}
      <PackageDialog
        open={pkgVm.dialogPackageOpen}
        onOpenChange={pkgVm.setDialogPackageOpen}
        form={pkgVm.packageForm}
        setForm={pkgVm.setPackageForm}
        editingPackage={pkgVm.editingPackage}
        services={pkgVm.packageCatalogServices}
        paymentMethods={pkgVm.paymentMethods}
        isSaving={pkgVm.isSavingPackage}
        onSave={pkgVm.savePackage}
        onToggleService={pkgVm.handleToggleService}
        onToggleAllServices={pkgVm.handleToggleAllServices}
        onTogglePaymentMethod={pkgVm.handleTogglePaymentMethod}
        onToggleAllPaymentMethods={pkgVm.handleToggleAllPaymentMethods}
      />

      {/* Package Detail Dialog */}
      <PackageDetailDialog
        open={pkgVm.detailPackageOpen}
        onOpenChange={pkgVm.setDetailPackageOpen}
        pkg={pkgVm.viewingPackage}
        services={pkgVm.packageCatalogServices}
        paymentMethods={pkgVm.paymentMethods}
        packageServices={pkgVm.packageServices}
        packagePaymentMethods={pkgVm.packagePaymentMethods}
        isLoadingDetailFlows={pkgVm.isLoadingDetailFlows}
        onToggleService={pkgVm.toggleServiceInPackage}
        onEditPackage={pkgVm.openEditPackage}
      />

      {/* Package Duplicate Dialog */}
      <PackageDuplicateDialog
        open={pkgVm.dialogDuplicateOpen}
        onOpenChange={pkgVm.setDialogDuplicateOpen}
        form={pkgVm.duplicateForm}
        setForm={pkgVm.setDuplicateForm}
        services={pkgVm.packageCatalogServices}
        paymentMethods={pkgVm.paymentMethods}
        duplicatingPackage={pkgVm.duplicatingPackage}
        isSaving={pkgVm.isSavingPackage}
        onConfirm={pkgVm.handleConfirmDuplicatePackage}
      />

      {/* Package Confirmation Dialogs (Delete, Archive & Toggle Status) */}
      <PackageConfirmationDialogs
        packageToDelete={pkgVm.packageToDelete}
        onCancelDelete={() => pkgVm.setPackageToDelete(null)}
        onConfirmDelete={pkgVm.handleDeletePackage}
        isDeleting={pkgVm.isDeletingPackage}
        packageToArchive={pkgVm.packageToArchive}
        onCancelArchive={() => pkgVm.setPackageToArchive(null)}
        onConfirmArchive={pkgVm.handleArchivePackage}
        isArchiving={pkgVm.isArchivingPackage}
        packageToggleConfirmation={pkgVm.packageToggleConfirmation}
        onCancelToggle={() => pkgVm.setPackageToggleConfirmation(null)}
        onConfirmToggle={pkgVm.handleTogglePackageStatus}
      />

      {/* Service Create/Edit Dialog */}
      <ServiceDialog
        open={pkgVm.dialogServiceOpen}
        onOpenChange={pkgVm.setDialogServiceOpen}
        form={pkgVm.serviceForm}
        setForm={pkgVm.setServiceForm}
        errors={pkgVm.serviceFormErrors}
        onClearError={pkgVm.clearServiceFormError}
        editingService={pkgVm.editingService}
        isSaving={pkgVm.isSavingService}
        onSave={pkgVm.saveService}
      />

      {/* Service Versions Management Modal (Réservé au profil technique et aux permissions) */}
      <ServiceVersionsModal
        open={showVersionModal}
        onOpenChange={(open) => {
          resetVersionFormErrors();
          setShowVersionModal(open);
        }}
        service={selectedServiceForVersions}
        versions={serviceVersions}
        isLoading={isLoadingVersions}
        isSaving={isSavingVersion}
        newVersionData={newVersionData}
        setNewVersionData={setNewVersionData}
        errors={versionFormErrors}
        onClearError={clearVersionFormError}
        onCreateVersion={handleCreateNewVersion}
        onPublishVersion={handlePublishVersion}
        onDeprecateVersion={handleDeprecateVersion}
      />

      {/* Modal de configuration directe des flux de paiement depuis la liste */}
      <ServicePaymentFlowDialog
        open={Boolean(serviceForFlowModal)}
        onOpenChange={(open) => !open && setServiceForFlowModal(null)}
        service={serviceForFlowModal}
        paymentMethods={pkgVm.paymentMethods}
        onSuccess={() => {
          setServiceForFlowModal(null);
        }}
      />
    </div>
  );
};

export default PackagesPage;
