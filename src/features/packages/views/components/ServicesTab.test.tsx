import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServicesTab } from "./ServicesTab";
import { ServiceResponse } from "../../models/types";

const mockStandardService: ServiceResponse = {
  id: "srv-1",
  code: "TRANSFER_P2P",
  label: "Transfert Particulier",
  description: "Description transfert",
  status: "active",
  category_id: null,
  is_contract: false,
  service_type: "TRANSFER",
};

const mockContractService: ServiceResponse = {
  id: "c-1",
  code: "TRANSFER",
  label: "Virement Bancaire",
  description: "Description contrat virement",
  status: "active",
  category_id: null,
  is_contract: true,
  version: "1.0",
  source_format: "yaml",
  service_type: "TRANSFER",
};

describe("ServicesTab - Access Control & Role Segregation", () => {
  const defaultProps = {
    services: [mockStandardService, mockContractService],
    onAdd: vi.fn(),
    onEdit: vi.fn(),
    onDetail: vi.fn(),
    onToggleStatus: vi.fn(),
    onManageVersions: vi.fn(),
    onDelete: vi.fn(),
    hasPerm: vi.fn().mockReturnValue(false),
  };

  it("hides Versions button, mutation buttons, and creation button for Admin Backoffice without technical profile", () => {
    // Admin Backoffice having general admin permissions but NOT technical profile
    const hasPerm = (perm: string) => perm === "perm.bo.service.list" || perm === "perm.bo.service.update";

    render(
      <ServicesTab
        {...defaultProps}
        hasPerm={hasPerm}
        isTechnicalProfile={false}
        canManageVersions={false}
      />
    );

    // "Nouveau Contrat" is NOT shown
    expect(screen.queryByText(/Nouveau Contrat/i)).not.toBeInTheDocument();

    // "Versions" button is NOT shown
    expect(screen.queryByText(/Versions/i)).not.toBeInTheDocument();

    // Modifier and Supprimer buttons are NOT shown
    expect(screen.queryByTitle(/Modifier le contrat/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Supprimer le contrat/i)).not.toBeInTheDocument();

    // Status is displayed as a badge, no switch for standard profile
    expect(screen.getAllByText("Actif").length).toBeGreaterThan(0);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("shows Versions button when canManageVersions is true (explicit version permission)", () => {
    render(
      <ServicesTab
        {...defaultProps}
        isTechnicalProfile={false}
        canManageVersions={true}
      />
    );

    // "Versions" button IS rendered for services
    expect(screen.getAllByText(/Versions/i).length).toBeGreaterThan(0);
  });

  it("shows all technical tools (Nouveau Contrat, Switch, Versions, Modifier, Supprimer) for Technical profile", () => {
    render(
      <ServicesTab
        {...defaultProps}
        isTechnicalProfile={true}
        canManageVersions={true}
      />
    );

    // Creation button
    expect(screen.getByText(/Nouveau Contrat/i)).toBeInTheDocument();

    // Versions button
    expect(screen.getAllByText(/Versions/i).length).toBeGreaterThan(0);

    // Switch for status toggle
    expect(screen.getAllByRole("switch").length).toBeGreaterThan(0);

    // Modifier & Supprimer
    expect(screen.getAllByTitle(/Modifier le contrat/i).length).toBeGreaterThan(0);
    expect(screen.getAllByTitle(/Supprimer le contrat/i).length).toBeGreaterThan(0);
  });

  it("does not render a standalone 'Détails' button and triggers onDetail on card click", async () => {
    const onDetail = vi.fn();
    const { fireEvent } = await import("@testing-library/react");

    render(
      <ServicesTab
        {...defaultProps}
        onDetail={onDetail}
        isTechnicalProfile={false}
        canManageVersions={false}
      />
    );

    // Ensure the old "Détails" button is no longer present
    expect(screen.queryByText(/Détails/i)).not.toBeInTheDocument();

    // Clicking the card itself triggers onDetail
    const cardTitle = screen.getByText("Transfert Particulier");
    fireEvent.click(cardTitle);

    expect(onDetail).toHaveBeenCalledWith(mockStandardService);
  });

  it("does not trigger onDetail when clicking inner actions like Versions or Modifier", async () => {
    const onDetail = vi.fn();
    const onManageVersions = vi.fn();
    const { fireEvent } = await import("@testing-library/react");

    render(
      <ServicesTab
        {...defaultProps}
        onDetail={onDetail}
        onManageVersions={onManageVersions}
        isTechnicalProfile={true}
        canManageVersions={true}
      />
    );

    const versionButtons = screen.getAllByText(/Versions/i);
    fireEvent.click(versionButtons[0]);

    expect(onManageVersions).toHaveBeenCalled();
    expect(onDetail).not.toHaveBeenCalled();
  });

  it("renders Flux de paiement button for non-technical profile and triggers onConfigureFlows", async () => {
    const onConfigureFlows = vi.fn();
    const { fireEvent } = await import("@testing-library/react");

    render(
      <ServicesTab
        {...defaultProps}
        onConfigureFlows={onConfigureFlows}
        isTechnicalProfile={false}
        canManageVersions={false}
      />
    );

    const flowButton = screen.getByText("Flux de paiement");
    fireEvent.click(flowButton);

    expect(onConfigureFlows).toHaveBeenCalledWith(mockStandardService);
  });

  it("affiche le type de service au lieu du code dans le badge", () => {
    const serviceWithType: ServiceResponse = {
      ...mockStandardService,
      code: "CODE_123",
      service_type: "BILL_PAYMENT",
    };

    render(
      <ServicesTab
        {...defaultProps}
        services={[serviceWithType]}
        isTechnicalProfile={false}
        canManageVersions={false}
      />
    );

    expect(screen.getByText("BILL_PAYMENT")).toBeInTheDocument();
  });
});

