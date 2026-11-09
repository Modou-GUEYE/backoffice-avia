import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { StructureServicePaymentFlowsCard } from "./StructureServicePaymentFlowsCard";
import * as packagesService from "@/features/packages/services/packagesService";
import * as servicesService from "@/features/packages/services/servicesService";
import * as paymentMethodsService from "@/features/payment-methods/services/paymentMethodsService";
import { StructurePackageAssignmentResponse } from "@/features/packages/models/types";

vi.mock("@/features/packages/services/packagesService", () => ({
  fetchPackageServices: vi.fn(),
  fetchPackagePaymentMethods: vi.fn(),
}));

vi.mock("@/features/packages/services/servicesService", () => ({
  fetchCatalogServices: vi.fn(),
  fetchStructureServicePaymentFlow: vi.fn(),
  deleteStructureServicePaymentFlow: vi.fn(),
  enableStructureServicePaymentFlow: vi.fn(),
  disableStructureServicePaymentFlow: vi.fn(),
  createStructureServicePaymentFlow: vi.fn(),
  updateStructureServicePaymentFlow: vi.fn(),
  fetchServicePaymentFlow: vi.fn(),
}));

vi.mock("@/features/payment-methods/services/paymentMethodsService", () => ({
  fetchPaymentMethods: vi.fn(),
}));

const mockActiveAssignment: StructurePackageAssignmentResponse = {
  id: "ass-1",
  structure_id: "struct-1",
  package_id: "pkg-1",
  status: "ACTIVE",
  assigned_at: "2026-09-01T00:00:00Z",
};

describe("StructureServicePaymentFlowsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche un avertissement si aucun package actif n'est assigné", () => {
    render(
      <StructureServicePaymentFlowsCard
        structureId="struct-1"
        activeAssignment={null}
        canUpdate={true}
      />
    );

    expect(screen.getByText("Aucun package actif rattaché")).toBeInTheDocument();
  });

  it("charge les services du package et affiche les flux hérités et surchargés", async () => {
    vi.mocked(packagesService.fetchPackageServices).mockResolvedValue([
      { id: "ps-1", package_id: "pkg-1", service_id: "srv-inherited", is_enabled: true },
      { id: "ps-2", package_id: "pkg-1", service_id: "srv-custom", is_enabled: true },
    ]);

    vi.mocked(servicesService.fetchCatalogServices).mockResolvedValue([
      {
        id: "srv-inherited",
        code: "VIREMENT",
        label: "Virement bancaire",
        status: "active",
        category_id: null,
        description: null,
      },
      {
        id: "srv-custom",
        code: "DEPOSIT",
        label: "Dépôt compte",
        status: "active",
        category_id: null,
        description: null,
      },
    ]);

    vi.mocked(packagesService.fetchPackagePaymentMethods).mockResolvedValue([
      { id: "ppm-1", package_id: "pkg-1", payment_method_id: "pm-wave", is_enabled: true },
      { id: "ppm-2", package_id: "pkg-1", payment_method_id: "pm-om", is_enabled: true },
    ]);

    vi.mocked(paymentMethodsService.fetchPaymentMethods).mockResolvedValue([
      { id: "pm-wave", code: "WAVE", label: "Wave CI", is_active: true },
      { id: "pm-om", code: "OM", label: "Orange Money", is_active: true },
    ] as unknown as Awaited<ReturnType<typeof paymentMethodsService.fetchPaymentMethods>>);

    // Mock des flux par structure
    vi.mocked(servicesService.fetchStructureServicePaymentFlow).mockImplementation(
      async (_structId, srvId) => {
        if (srvId === "srv-inherited") {
          return {
            id: "flow-def-1",
            service_id: "srv-inherited",
            source_payment_method_ids: ["pm-wave"],
            destination_payment_method_ids: ["pm-om"],
            is_enabled: true,
            scope: "DEFAULT",
            inherited: true,
          };
        }
        if (srvId === "srv-custom") {
          return {
            id: "flow-cust-1",
            structure_id: "struct-1",
            service_id: "srv-custom",
            source_payment_method_ids: ["pm-om"],
            destination_payment_method_ids: ["pm-wave"],
            is_enabled: true,
            scope: "STRUCTURE",
            inherited: false,
          };
        }
        return null;
      }
    );

    render(
      <StructureServicePaymentFlowsCard
        structureId="struct-1"
        activeAssignment={mockActiveAssignment}
        canUpdate={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Virement bancaire")).toBeInTheDocument();
      expect(screen.getByText("Dépôt compte")).toBeInTheDocument();
    });

    // Vérifier les badges Hérité vs Surcharge
    expect(screen.getByText("Hérité (Défaut)")).toBeInTheDocument();
    expect(screen.getByText("Surcharge active")).toBeInTheDocument();

    // Bouton 'Surcharger' sur le flux hérité
    expect(screen.getByRole("button", { name: /surcharger/i })).toBeInTheDocument();

    // Boutons sur la surcharge active
    expect(screen.getByRole("button", { name: /modifier/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /désactiver/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rétablir héritage/i })).toBeInTheDocument();
  });

  it("permet de rétablir l'héritage d'un flux surchargé", async () => {
    vi.mocked(packagesService.fetchPackageServices).mockResolvedValue([
      { id: "ps-1", package_id: "pkg-1", service_id: "srv-custom", is_enabled: true },
    ]);

    vi.mocked(servicesService.fetchCatalogServices).mockResolvedValue([
      {
        id: "srv-custom",
        code: "DEPOSIT",
        label: "Dépôt compte",
        status: "active",
        category_id: null,
        description: null,
      },
    ]);

    vi.mocked(packagesService.fetchPackagePaymentMethods).mockResolvedValue([]);
    vi.mocked(paymentMethodsService.fetchPaymentMethods).mockResolvedValue([]);

    vi.mocked(servicesService.fetchStructureServicePaymentFlow)
      .mockResolvedValueOnce({
        id: "flow-cust-1",
        structure_id: "struct-1",
        service_id: "srv-custom",
        source_payment_method_ids: [],
        destination_payment_method_ids: [],
        is_enabled: true,
        scope: "STRUCTURE",
        inherited: false,
      })
      .mockResolvedValueOnce({
        id: "flow-def-1",
        service_id: "srv-custom",
        source_payment_method_ids: [],
        destination_payment_method_ids: [],
        is_enabled: true,
        scope: "DEFAULT",
        inherited: true,
      });

    vi.mocked(servicesService.deleteStructureServicePaymentFlow).mockResolvedValue();

    render(
      <StructureServicePaymentFlowsCard
        structureId="struct-1"
        activeAssignment={mockActiveAssignment}
        canUpdate={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Surcharge active")).toBeInTheDocument();
    });

    // Clic sur Rétablir héritage
    const revertBtn = screen.getByRole("button", { name: /rétablir héritage/i });
    fireEvent.click(revertBtn);

    // Modal de confirmation
    await waitFor(() => {
      expect(screen.getByText("Rétablir le flux hérité ?")).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole("button", { name: "Rétablir l'héritage" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(servicesService.deleteStructureServicePaymentFlow).toHaveBeenCalledWith(
        "struct-1",
        "srv-custom"
      );
      expect(screen.getByText("Hérité (Défaut)")).toBeInTheDocument();
    });
  });

  it("permet de désactiver une surcharge active", async () => {
    vi.mocked(packagesService.fetchPackageServices).mockResolvedValue([
      { id: "ps-1", package_id: "pkg-1", service_id: "srv-custom", is_enabled: true },
    ]);

    vi.mocked(servicesService.fetchCatalogServices).mockResolvedValue([
      {
        id: "srv-custom",
        code: "DEPOSIT",
        label: "Dépôt compte",
        status: "active",
        category_id: null,
        description: null,
      },
    ]);

    vi.mocked(packagesService.fetchPackagePaymentMethods).mockResolvedValue([]);
    vi.mocked(paymentMethodsService.fetchPaymentMethods).mockResolvedValue([]);

    vi.mocked(servicesService.fetchStructureServicePaymentFlow).mockResolvedValue({
      id: "flow-cust-1",
      structure_id: "struct-1",
      service_id: "srv-custom",
      source_payment_method_ids: [],
      destination_payment_method_ids: [],
      is_enabled: true,
      scope: "STRUCTURE",
      inherited: false,
    });

    vi.mocked(servicesService.disableStructureServicePaymentFlow).mockResolvedValue({
      id: "flow-cust-1",
      structure_id: "struct-1",
      service_id: "srv-custom",
      source_payment_method_ids: [],
      destination_payment_method_ids: [],
      is_enabled: false,
      scope: "STRUCTURE",
      inherited: false,
    });

    render(
      <StructureServicePaymentFlowsCard
        structureId="struct-1"
        activeAssignment={mockActiveAssignment}
        canUpdate={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Actif")).toBeInTheDocument();
    });

    const disableBtn = screen.getByRole("button", { name: /désactiver/i });
    fireEvent.click(disableBtn);

    await waitFor(() => {
      expect(servicesService.disableStructureServicePaymentFlow).toHaveBeenCalledWith(
        "struct-1",
        "srv-custom"
      );
      expect(screen.getByText("Désactivé")).toBeInTheDocument();
    });
  });
});
