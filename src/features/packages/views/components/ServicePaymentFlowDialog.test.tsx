import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ServicePaymentFlowDialog } from "./ServicePaymentFlowDialog";
import * as servicesService from "../../services/servicesService";
import { ServiceResponse, ServicePaymentFlowResponse } from "../../models/types";
import { PaymentMethodResponse } from "@/features/payment-methods/models/types";

vi.mock("../../services/servicesService", () => ({
  createServicePaymentFlow: vi.fn(),
  updateServicePaymentFlow: vi.fn(),
  fetchServicePaymentFlow: vi.fn(),
  fetchServicePaymentFlows: vi.fn(),
  fetchStructureServicePaymentFlow: vi.fn(),
  createStructureServicePaymentFlow: vi.fn(),
  updateStructureServicePaymentFlow: vi.fn(),
}));

const mockPaymentMethods: PaymentMethodResponse[] = [
  { id: "pm-source-1", code: "WAVE_CI", label: "Wave CI", is_active: true } as unknown as PaymentMethodResponse,
  { id: "pm-dest-1", code: "ORANGE_CI", label: "Orange Money CI", is_active: true } as unknown as PaymentMethodResponse,
];

const mockService: ServiceResponse = {
  id: "srv-test-1",
  code: "CASHIN_SRV",
  label: "Cash-In Service",
  status: "ACTIVE",
  category: "STANDARD",
  type: "STANDARD",
} as unknown as ServiceResponse;

describe("ServicePaymentFlowDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("charge automatiquement le flux existant s'il n'est pas fourni et passe en mode modification", async () => {
    const existingFlow: ServicePaymentFlowResponse = {
      id: "flow-existing-1",
      service_id: "srv-test-1",
      source_payment_method_ids: ["pm-source-1"],
      destination_payment_method_ids: ["pm-dest-1"],
      is_enabled: true,
    };

    vi.mocked(servicesService.fetchServicePaymentFlow).mockResolvedValue(existingFlow);
    vi.mocked(servicesService.fetchServicePaymentFlows).mockResolvedValue([existingFlow]);
    vi.mocked(servicesService.updateServicePaymentFlow).mockResolvedValue({} as ServicePaymentFlowResponse);

    render(
      <ServicePaymentFlowDialog
        open={true}
        onOpenChange={vi.fn()}
        service={mockService}
        paymentMethods={mockPaymentMethods}
        onSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Modifier le flux de paiement")).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: "Enregistrer les modifications" });
    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(servicesService.updateServicePaymentFlow).toHaveBeenCalledWith(
        "srv-test-1",
        expect.objectContaining({
          source_payment_method_ids: ["pm-source-1"],
          destination_payment_method_ids: ["pm-dest-1"],
        })
      );
    });
  });

  it("ouvre en mode création si aucun flux n'existe pour le service", async () => {
    vi.mocked(servicesService.fetchServicePaymentFlow).mockResolvedValue(null);
    vi.mocked(servicesService.fetchServicePaymentFlows).mockResolvedValue([]);
    vi.mocked(servicesService.createServicePaymentFlow).mockResolvedValue({} as ServicePaymentFlowResponse);

    render(
      <ServicePaymentFlowDialog
        open={true}
        onOpenChange={vi.fn()}
        service={mockService}
        paymentMethods={mockPaymentMethods}
        onSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Configurer le flux de paiement")).toBeInTheDocument();
    });

    // Vérifier l'absence de 'Service :' et 'Tout cocher' / 'sélectionné(s)'
    expect(screen.queryByText("Service :")).not.toBeInTheDocument();
    expect(screen.queryByText("Tout cocher")).not.toBeInTheDocument();
    expect(screen.queryByText(/sélectionné\(s\)/i)).not.toBeInTheDocument();

    // Sélectionner un moyen source et un moyen destination
    const waveItems = screen.getAllByText("Wave CI");
    fireEvent.click(waveItems[0]);
    const orangeItems = screen.getAllByText("Orange Money CI");
    fireEvent.click(orangeItems[1]);

    const submitBtn = screen.getByRole("button", { name: "Créer le flux de paiement" });
    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(servicesService.createServicePaymentFlow).toHaveBeenCalledWith(
        "srv-test-1",
        expect.objectContaining({
          source_payment_method_ids: ["pm-source-1"],
          destination_payment_method_ids: ["pm-dest-1"],
        })
      );
    });
  });

  it("affiche des messages d'erreur sous les listes si on tente de valider sans sélection", async () => {
    vi.mocked(servicesService.fetchServicePaymentFlow).mockResolvedValue(null);
    vi.mocked(servicesService.fetchServicePaymentFlows).mockResolvedValue([]);

    render(
      <ServicePaymentFlowDialog
        open={true}
        onOpenChange={vi.fn()}
        service={mockService}
        paymentMethods={mockPaymentMethods}
        onSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Configurer le flux de paiement")).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: "Créer le flux de paiement" });
    expect(submitBtn).toBeEnabled();

    // Clic sans rien sélectionner
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Veuillez sélectionner au moins un moyen de paiement source (débit).")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Veuillez sélectionner au moins un moyen de paiement destinataire (crédit).")
      ).toBeInTheDocument();
    });

    expect(servicesService.createServicePaymentFlow).not.toHaveBeenCalled();
  });

  it("crée une surcharge pour la structure si le flux était hérité", async () => {
    const inheritedFlow: ServicePaymentFlowResponse = {
      id: "flow-inherited-1",
      service_id: "srv-test-1",
      source_payment_method_ids: ["pm-source-1"],
      destination_payment_method_ids: ["pm-dest-1"],
      is_enabled: true,
      scope: "DEFAULT",
      inherited: true,
    };

    vi.mocked(servicesService.fetchStructureServicePaymentFlow).mockResolvedValue(inheritedFlow);
    vi.mocked(servicesService.createStructureServicePaymentFlow).mockResolvedValue({} as ServicePaymentFlowResponse);

    render(
      <ServicePaymentFlowDialog
        open={true}
        onOpenChange={vi.fn()}
        service={mockService}
        paymentMethods={mockPaymentMethods}
        structureId="struct-123"
        onSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Configurer une surcharge du flux de paiement")).toBeInTheDocument();
      expect(screen.getByText("Surcharge Structure")).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: "Créer la surcharge" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(servicesService.createStructureServicePaymentFlow).toHaveBeenCalledWith(
        "struct-123",
        "srv-test-1",
        expect.objectContaining({
          source_payment_method_ids: ["pm-source-1"],
          destination_payment_method_ids: ["pm-dest-1"],
        })
      );
    });
  });

  it("met à jour une surcharge existante pour la structure si inherited est false", async () => {
    const customFlow: ServicePaymentFlowResponse = {
      id: "flow-custom-1",
      service_id: "srv-test-1",
      source_payment_method_ids: ["pm-source-1"],
      destination_payment_method_ids: ["pm-dest-1"],
      is_enabled: true,
      scope: "STRUCTURE",
      inherited: false,
    };

    vi.mocked(servicesService.fetchStructureServicePaymentFlow).mockResolvedValue(customFlow);
    vi.mocked(servicesService.updateStructureServicePaymentFlow).mockResolvedValue({} as ServicePaymentFlowResponse);

    render(
      <ServicePaymentFlowDialog
        open={true}
        onOpenChange={vi.fn()}
        service={mockService}
        paymentMethods={mockPaymentMethods}
        structureId="struct-123"
        onSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Modifier la surcharge du flux de paiement")).toBeInTheDocument();
      expect(screen.getByText("Surcharge Structure")).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: "Enregistrer les modifications" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(servicesService.updateStructureServicePaymentFlow).toHaveBeenCalledWith(
        "struct-123",
        "srv-test-1",
        expect.objectContaining({
          source_payment_method_ids: ["pm-source-1"],
          destination_payment_method_ids: ["pm-dest-1"],
        })
      );
    });
  });
});
