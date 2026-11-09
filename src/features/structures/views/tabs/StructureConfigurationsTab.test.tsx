import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { StructureConfigurationsTab } from "./StructureConfigurationsTab";

vi.mock("@/features/packages/services/packagesService", () => ({
  fetchPackageServices: vi.fn().mockResolvedValue([]),
  fetchPackagePaymentMethods: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/packages/services/servicesService", () => ({
  fetchCatalogServices: vi.fn().mockResolvedValue([]),
  fetchStructureServicePaymentFlow: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/features/payment-methods/services/paymentMethodsService", () => ({
  fetchPaymentMethods: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/shared/components/BrandingForm", () => ({
  default: () => <div>Mock BrandingForm</div>,
}));

describe("StructureConfigurationsTab", () => {
  it("renders StructureServicePaymentFlowsCard inside configurations tab", async () => {
    const mockVm = {
      structure: {
        id: "struct-1",
        name: "AVIA",
        branding_config: null,
      },
      activeAssignment: {
        id: "ass-1",
        structure_id: "struct-1",
        package_id: "pkg-1",
        status: "ACTIVE",
      },
      permissions: { canUpdate: true },
      form: { packageId: "pkg-1" },
      setForm: vi.fn(),
      packages: [{ id: "pkg-1", nom: "PACKAGE TEST" }],
      structureBranding: null,
    } as unknown as React.ComponentProps<typeof StructureConfigurationsTab>["vm"];

    render(<StructureConfigurationsTab vm={mockVm} />);

    await waitFor(() => {
      expect(screen.getByText("Flux de paiement des Services")).toBeInTheDocument();
      expect(screen.getByText("Offre & Package de Services")).toBeInTheDocument();
      expect(screen.getByText("Identité visuelle")).toBeInTheDocument();
    });
  });
});
