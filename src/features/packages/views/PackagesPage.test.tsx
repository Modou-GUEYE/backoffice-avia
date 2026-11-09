import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PackagesPage } from "./PackagesPage";
import * as currentActorHook from "@/core/security/useCurrentActor";
import * as packagesVmHook from "../viewmodels/usePackages";
import { PackageResponse } from "../models/types";

type PackagesVm = ReturnType<typeof packagesVmHook.usePackages>;

vi.mock("@/core/security/useCurrentActor", () => ({
  useCurrentActor: vi.fn(),
}));

vi.mock("../viewmodels/usePackages", () => ({
  usePackages: vi.fn(),
}));

vi.mock("@/features/payment-methods/views/PaymentMethodsPage", () => ({
  PaymentMethodsPage: () => <div>PaymentMethodsPageMock</div>,
}));

vi.mock("@/features/abonnements/views/AbonnementsPage", () => ({
  AbonnementsPage: () => <div>AbonnementsPageMock</div>,
}));

const mockPackage: PackageResponse = {
  id: "pkg-1",
  code: "PKG_CORP",
  label: "Package Entreprise",
  description: "Description test",
  status: "active",
  client_types: ["ENTREPRISE"],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("PackagesPage - Habilitations Admin Backoffice vs Profil Technique", () => {
  const mockVm = {
    packages: [mockPackage],
    services: [],
    packageCatalogServices: [],
    paymentMethods: [],
    packageServices: [],
    packagePaymentMethods: [],
    isLoadingDetailFlows: false,
    openAddPackage: vi.fn(),
    openEditPackage: vi.fn(),
    openDetailPackage: vi.fn(),
    openDuplicatePackage: vi.fn(),
    setPackageToDelete: vi.fn(),
    setPackageToggleConfirmation: vi.fn(),
    openAddService: vi.fn(),
    openEditService: vi.fn(),
    openDetailService: vi.fn(),
    closeDetailService: vi.fn(),
    handleToggleServiceStatus: vi.fn(),
    handleDeleteService: vi.fn(),
    dialogPackageOpen: false,
    setDialogPackageOpen: vi.fn(),
    packageForm: {
      code: "",
      label: "",
      description: "",
      client_types: [],
      services: [],
      payment_methods: [],
    },
    setPackageForm: vi.fn(),
    editingPackage: null,
    isSavingPackage: false,
    savePackage: vi.fn(),
    handleToggleService: vi.fn(),
    handleToggleAllServices: vi.fn(),
    handleTogglePaymentMethod: vi.fn(),
    handleToggleAllPaymentMethods: vi.fn(),
    detailPackageOpen: false,
    setDetailPackageOpen: vi.fn(),
    viewingPackage: null,
    toggleServiceInPackage: vi.fn(),
    togglePackagePaymentMethod: vi.fn(),
    dialogDuplicateOpen: false,
    setDialogDuplicateOpen: vi.fn(),
    duplicateForm: {
      code: "",
      label: "",
      description: "",
      client_types: [],
      services: [],
      payment_methods: [],
    },
    setDuplicateForm: vi.fn(),
    duplicatingPackage: null,
    handleConfirmDuplicatePackage: vi.fn(),
    packageToDelete: null,
    handleDeletePackage: vi.fn(),
    isDeletingPackage: false,
    packageToArchive: null,
    setPackageToArchive: vi.fn(),
    handleArchivePackage: vi.fn(),
    isArchivingPackage: false,
    packageToggleConfirmation: null,
    handleTogglePackageStatus: vi.fn(),
    dialogServiceOpen: false,
    setDialogServiceOpen: vi.fn(),
    serviceForm: {},
    setServiceForm: vi.fn(),
    editingService: null,
    isSavingService: false,
    saveService: vi.fn(),
    viewingService: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(packagesVmHook.usePackages).mockReturnValue(mockVm as unknown as PackagesVm);
  });

  it("Profil Technique : n'a pas accès aux paramétrages de packages et l'onglet par défaut est les moyens de paiement", () => {
    vi.mocked(currentActorHook.useCurrentActor).mockReturnValue({
      currentActorRole: "Profil Technique",
      entityContext: "Administration",
      currentPermissions: [
        "profile.bo-profil-technique",
        "perm.bo.payment-method.list",
        "perm.bo.service.list",
      ],
    });

    render(<PackagesPage embedded={false} />);

    // Pour le profil technique, l'onglet par défaut est Moyens de paiement
    expect(screen.getByText("PaymentMethodsPageMock")).toBeInTheDocument();

    // L'onglet Packages n'est pas affiché car perm.bo.package.list n'est pas octroyé
    expect(screen.queryByRole("tab", { name: /^Packages$/i })).not.toBeInTheDocument();

    // Les boutons de paramétrage ne sont pas affichés
    expect(screen.queryByText(/Nouveau Package/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Modifier/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Dupliquer/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Désactiver/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Supprimer/i)).not.toBeInTheDocument();
  });

  it("Admin Backoffice avec permissions : a accès aux paramétrages (ajout, modification, duplication, activation/désactivation, suppression)", () => {
    vi.mocked(currentActorHook.useCurrentActor).mockReturnValue({
      currentActorRole: "Administrateur",
      entityContext: "Administration",
      currentPermissions: [
        "profile.bo-admin",
        "perm.bo.package.list",
        "perm.bo.package.create",
        "perm.bo.package.update",
        "perm.bo.package.delete",
        "perm.bo.package.deactivate",
      ],
    });

    render(<PackagesPage embedded={false} />);

    // Bouton Nouveau Package visible
    expect(screen.getByText(/Nouveau Package/i)).toBeInTheDocument();

    // Boutons de modification, duplication, désactivation, suppression visibles
    expect(screen.getByTitle(/Modifier/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Dupliquer/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Désactiver/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Supprimer/i)).toBeInTheDocument();
  });

  it("Archivage : cliquer sur le bouton Archiver appelle setPackageToArchive avec le package correspondant", () => {
    const inactivePackage = { ...mockPackage, status: "inactive" as const };
    vi.mocked(packagesVmHook.usePackages).mockReturnValue({
      ...mockVm,
      packages: [inactivePackage],
    } as unknown as PackagesVm);

    vi.mocked(currentActorHook.useCurrentActor).mockReturnValue({
      currentActorRole: "Administrateur",
      entityContext: "Administration",
      currentPermissions: [
        "profile.bo-admin",
        "perm.bo.package.list",
        "perm.bo.package.archive",
      ],
    });

    render(<PackagesPage embedded={false} />);

    const archiveBtn = screen.getByTitle(/^Archiver$/i);
    expect(archiveBtn).toBeInTheDocument();
    expect(archiveBtn).not.toBeDisabled();
    fireEvent.click(archiveBtn);

    expect(mockVm.setPackageToArchive).toHaveBeenCalledWith(inactivePackage);
  });
});
