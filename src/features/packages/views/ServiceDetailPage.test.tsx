import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ServiceDetailPage } from "./ServiceDetailPage";
import * as servicesService from "../services/servicesService";
import { ServiceResponse, ServicePaymentFlowResponse } from "../models/types";

vi.mock("../services/servicesService", async () => {
  const actual = await vi.importActual("../services/servicesService");
  return {
    ...actual,
    fetchServiceDetail: vi.fn(),
    fetchServicePaymentFlows: vi.fn(),
    enableServicePaymentFlow: vi.fn(),
    disableServicePaymentFlow: vi.fn(),
    deleteServicePaymentFlow: vi.fn(),
    createServicePaymentFlow: vi.fn(),
    updateServicePaymentFlow: vi.fn(),
  };
});
vi.mock("../services/contractsService", async () => {
  const actual = await vi.importActual("../services/contractsService");
  return {
    ...actual,
    downloadContractDefinition: vi.fn(),
  };
});
vi.mock("@/features/payment-methods/services/paymentMethodsService", () => ({
  fetchPaymentMethods: vi.fn().mockResolvedValue([
    { id: "pm-1", code: "BANK_ACCOUNT", label: "Compte bancaire", status: "active" },
    { id: "pm-2", code: "WALLET", label: "Wave Wallet", status: "active" },
  ]),
}));

const mockContractService: ServiceResponse = {
  id: "srv_c1",
  code: "TRANSFERT_NAT",
  label: "Transfert National d'Argent",
  description: "Contrat d'orchestration pour les transferts nationaux",
  category_id: null,
  status: "active",
  is_contract: true,
  version: "1.2.0",
  source_format: "yaml",
  definition: {
    preconditions: [
      {
        type: "BALANCE_CHECK",
        description: "Solde émetteur suffisant",
        parameters: { min_balance: 1000 },
      },
    ],
    execution_steps: [
      {
        order: 1,
        name: "Debiter Compte",
        type: "DEBIT",
        description: "Débit du compte expéditeur",
        responsibility: "SYSTEM",
        execution_mode: "INLINE",
      },
      {
        order: 2,
        name: "Notifier Beneficiaire",
        type: "NOTIFICATION",
        description: "SMS au récepteur",
        responsibility: "API",
        execution_mode: "ASYNC",
      },
    ],
    compensation: {
      rules: [
        {
          trigger_condition: "STEP_FAILURE",
          rollback_action: "CREDIT_ACCOUNT",
          description: "Remboursement immédiat",
        },
      ],
    },
  },
};

const mockStandardService: ServiceResponse = {
  id: "srv_std_1",
  code: "SRV_CONSULT",
  label: "Consultation de Solde",
  description: "Consultation basique",
  category_id: null,
  status: "active",
  is_contract: false,
};

describe("ServiceDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(servicesService.fetchServiceDetail).mockResolvedValue(mockContractService);
    vi.mocked(servicesService.fetchServicePaymentFlows).mockResolvedValue([]);
  });

  it("affiche les détails d'un contrat avec ses badges et préconditions", async () => {
    render(
      <MemoryRouter>
        <ServiceDetailPage
          service={mockContractService}
          isTechnicalProfile={true}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("TRANSFERT_NAT")).toBeInTheDocument();
    expect(screen.getByText("Transfert National d'Argent")).toBeInTheDocument();
    expect(screen.getByText(/1\.2\.0/)).toBeInTheDocument();

    // Onglet Préconditions par défaut pour un contrat
    expect(screen.getByText("Solde émetteur suffisant")).toBeInTheDocument();
    expect(screen.getByText("BALANCE_CHECK")).toBeInTheDocument();
  });

  it("affiche directement les étapes du contrat sans emboîtement de tabs ni de cards", async () => {
    render(
      <MemoryRouter>
        <ServiceDetailPage
          service={mockContractService}
          isTechnicalProfile={true}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Debiter Compte")).toBeInTheDocument();
      expect(screen.getByText("Notifier Beneficiaire")).toBeInTheDocument();
    });
  });

  it("déclenche onBack lorsqu'on clique sur le bouton retour", () => {
    const handleBack = vi.fn();

    render(
      <MemoryRouter>
        <ServiceDetailPage
          service={mockContractService}
          onBack={handleBack}
          isTechnicalProfile={true}
        />
      </MemoryRouter>
    );

    const backButtons = screen.getAllByRole("button", { name: /Retour aux services/i });
    expect(backButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(backButtons[0]);

    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it("affiche la description bien structurée et n'affiche aucun bouton d'action ni statut dans l'en-tête", () => {
    render(
      <MemoryRouter>
        <ServiceDetailPage
          service={mockContractService}
          canManageVersions={true}
          isTechnicalProfile={true}
        />
      </MemoryRouter>
    );

    // Vérifie le design de la description
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Contrat d'orchestration pour les transferts nationaux")).toBeInTheDocument();

    // Vérifie qu'aucun bouton d'action n'est dans l'en-tête
    expect(screen.queryByRole("button", { name: /Copier JSON/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Versions/i })).not.toBeInTheDocument();
  });

  it("charge les flux de paiement pour un service standard", async () => {
    vi.mocked(servicesService.fetchServiceDetail).mockResolvedValue(mockStandardService);
    vi.mocked(servicesService.fetchServicePaymentFlows).mockResolvedValue([
      {
        id: "flow_1",
        service_id: "srv_std_1",
        is_enabled: true,
      } as ServicePaymentFlowResponse,
    ]);

    render(
      <MemoryRouter>
        <ServiceDetailPage
          service={mockStandardService}
          isTechnicalProfile={false}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Consultation de Solde")).toBeInTheDocument();
    expect(screen.getByText("SRV_CONSULT")).toBeInTheDocument();

    await waitFor(() => {
      expect(servicesService.fetchServiceDetail).toHaveBeenCalledWith("srv_std_1", false);
      expect(screen.getByText("flow_1")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("effectue un appel fetchServiceDetail avec le profil technique quand id est fourni via l'URL", async () => {
    vi.mocked(servicesService.fetchServiceDetail).mockResolvedValue(mockContractService);

    render(
      <MemoryRouter initialEntries={["/parametres/services/TRANSFERT_NAT"]}>
        <Routes>
          <Route
            path="/parametres/services/:id"
            element={<ServiceDetailPage isTechnicalProfile={true} />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(servicesService.fetchServiceDetail).toHaveBeenCalledWith(
        "TRANSFERT_NAT",
        true
      );
      expect(screen.getByText("TRANSFERT_NAT")).toBeInTheDocument();
    });
  });

  it("affiche correctement les détails d'un contrat réel avec étapes, préconditions, compensations et métadonnées", async () => {
    const realContractResponse: ServiceResponse = {
      id: "a7c80ef2-a280-453d-bf50-a17a69c27f2b",
      service_type: "BILL_PAYMENT",
      code: "BILL_PAYMENT_01",
      version: "1.0",
      label: "Paiement de Facture",
      description: "Règlement de facture d'un créancier/facturier avec prélèvement de frais",
      version_id: "a7cd0ea8-711a-42da-b370-ff7755f5dcb3",
      aggregate_version: 1,
      source_format: "yaml",
      is_active: true,
      definition: {
        preconditions: [
          { rule: "account_active", account: "initiator_account" },
          { rule: "sufficient_balance", account: "initiator_account" },
          { rule: "within_daily_limit", account: "initiator_account" },
          { rule: "biller_active" },
        ],
        execution_steps: [
          { step: "DEBIT", account: "initiator_account_id", amount: "amount + fees" },
          { step: "PAY_BILLER" },
          { step: "RECORD_FEES", fee_account: "TECH_FEES", amount: "fees" },
        ],
        compensation: {
          DEBIT: { action: "REVERSE_DEBIT" },
          PAY_BILLER: { action: "REVERSE_PAY_BILLER" },
          RECORD_FEES: { action: "LOG_INCIDENT", manual: true },
        },
      },
      created_at: "2026-09-17T19:12:59.003177+00:00",
      updated_at: "2026-09-17T19:12:59.003183+00:00",
      is_contract: true,
      status: "active",
      category_id: null,
    };

    render(
      <MemoryRouter>
        <ServiceDetailPage service={realContractResponse} isTechnicalProfile={true} />
      </MemoryRouter>
    );

    // Métadonnées
    expect(screen.getByText("a7c80ef2-a280-453d-bf50-a17a69c27f2b")).toBeInTheDocument();
    expect(screen.getByText("BILL_PAYMENT")).toBeInTheDocument();
    expect(screen.getByText("BILL_PAYMENT_01")).toBeInTheDocument();
    expect(screen.getByText("Paiement de Facture")).toBeInTheDocument();
    expect(screen.getByText("a7cd0ea8-711a-42da-b370-ff7755f5dcb3")).toBeInTheDocument();
    expect(screen.getByText("v1")).toBeInTheDocument();

    // Étapes & Compensation (les étapes configurées en compensation apparaissent dans les deux tables)
    expect(screen.getAllByText("DEBIT").length).toBe(2);
    expect(screen.getByText("initiator_account_id")).toBeInTheDocument();
    expect(screen.getByText("amount + fees")).toBeInTheDocument();
    expect(screen.getAllByText("PAY_BILLER").length).toBe(2);
    expect(screen.getAllByText("RECORD_FEES").length).toBe(2);
    expect(screen.getByText("TECH_FEES")).toBeInTheDocument();

    // Préconditions
    expect(screen.getByText("account_active")).toBeInTheDocument();
    expect(screen.getAllByText("initiator_account").length).toBe(3);
    expect(screen.getByText("biller_active")).toBeInTheDocument();

    // Compensation
    expect(screen.getByText("REVERSE_DEBIT")).toBeInTheDocument();
    expect(screen.getByText("REVERSE_PAY_BILLER")).toBeInTheDocument();
    expect(screen.getByText("LOG_INCIDENT")).toBeInTheDocument();
    expect(screen.getByText("true")).toBeInTheDocument();
  });

  it("permet d'ouvrir le dialogue de création d'un flux de paiement", async () => {
    vi.mocked(servicesService.fetchServiceDetail).mockResolvedValue(mockStandardService);
    vi.mocked(servicesService.fetchServicePaymentFlows).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <ServiceDetailPage service={mockStandardService} isTechnicalProfile={false} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Flux de Paiement Associé/i)).toBeInTheDocument();
    });

    const addBtn = screen.getByRole("button", { name: "Nouveau flux" });
    expect(addBtn).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Configurer le premier flux/i })).not.toBeInTheDocument();
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText("Moyens de paiement Source (Débit)")).toBeInTheDocument();
      expect(screen.getByText("Moyens de paiement Destination (Crédit)")).toBeInTheDocument();
    });
  });

  it("ne permet pas d'ajouter un second flux lorsqu'un flux existe déjà", async () => {
    vi.mocked(servicesService.fetchServiceDetail).mockResolvedValue(mockStandardService);
    vi.mocked(servicesService.fetchServicePaymentFlows).mockResolvedValue([
      {
        id: "flow_123",
        service_id: "srv_std_1",
        is_enabled: true,
        source_payment_method_ids: ["pm-1"],
        destination_payment_method_ids: ["pm-2"],
      } as ServicePaymentFlowResponse,
    ]);

    render(
      <MemoryRouter>
        <ServiceDetailPage service={mockStandardService} isTechnicalProfile={false} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("flow_123")).toBeInTheDocument();
    });

    // Le bouton "Nouveau flux" ne doit pas exister car un flux unique existe déjà
    expect(screen.queryByRole("button", { name: /^Nouveau flux$/i })).not.toBeInTheDocument();
  });

  it("permet de désactiver un flux de paiement actif", async () => {
    vi.mocked(servicesService.fetchServiceDetail).mockResolvedValue(mockStandardService);
    vi.mocked(servicesService.fetchServicePaymentFlows).mockResolvedValue([
      {
        id: "flow_123",
        service_id: "srv_std_1",
        is_enabled: true,
        source_payment_method_ids: ["pm-1"],
        destination_payment_method_ids: ["pm-2"],
      } as ServicePaymentFlowResponse,
    ]);
    vi.mocked(servicesService.disableServicePaymentFlow).mockResolvedValue({} as ServicePaymentFlowResponse);

    render(
      <MemoryRouter>
        <ServiceDetailPage service={mockStandardService} isTechnicalProfile={false} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("flow_123")).toBeInTheDocument();
    });

    const disableBtn = screen.getByRole("button", { name: /Désactiver/i });
    fireEvent.click(disableBtn);

    await waitFor(() => {
      expect(servicesService.disableServicePaymentFlow).toHaveBeenCalledWith("srv_std_1");
    });
  });
});
