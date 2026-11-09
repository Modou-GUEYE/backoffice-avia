import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorkflowDialog } from "./WorkflowDialog";
import { WorkflowResponse } from "../../models/workflowsTypes";

vi.mock("@/features/structures/services/structuresService", () => ({
  fetchStructureById: vi.fn().mockImplementation((id: string) =>
    Promise.resolve({
      id,
      name: "Banque Atlantique",
      code: "BA-01",
      is_active: true,
      is_deleted: false,
    })
  ),
  fetchStructures: vi.fn().mockResolvedValue({
    items: [
      { id: "struct-1", name: "Banque Atlantique", code: "BA-01", is_active: true },
      { id: "struct-2", name: "Coris Bank", code: "CBI-01", is_active: true },
    ],
    total: 2,
  }),
}));

describe("WorkflowDialog", () => {
  const mockHandleCreateOrUpdate = vi.fn().mockResolvedValue(undefined);
  const mockSetShowWorkflowDialog = vi.fn();
  const mockSetWorkflowFormData = vi.fn();

  const createMockVm = (isEditing: boolean = false) => {
    const mockEditingWorkflow: WorkflowResponse | null = isEditing
      ? {
          id: "wf-123",
          name: "Workflow Souscription Standard",
          service_version_id: "ver-456",
          structure_id: "struct-1",
          workflow_type: "STANDARD",
          status: "ACTIVE",
          is_default: true,
        }
      : null;

    return {
      showWorkflowDialog: true,
      setShowWorkflowDialog: mockSetShowWorkflowDialog,
      editingWorkflow: mockEditingWorkflow,
      isSavingWorkflow: false,
      workflowFormData: {
        name: isEditing ? "Workflow Souscription Standard" : "",
        service_version_id: isEditing ? "ver-456" : "",
        workflow_type: "STANDARD",
        structure_id: isEditing ? "struct-1" : "",
        definition_kind: isEditing ? "WORKFLOW" : "TEMPLATE",
      },
      setWorkflowFormData: mockSetWorkflowFormData,
      handleCreateOrUpdateWorkflow: mockHandleCreateOrUpdate,
    } as unknown as Parameters<typeof WorkflowDialog>[0]["workflowsVm"];
  };

  const defaultProps = {
    services: [
      { id: "srv-1", code: "TRANS", label: "Transfert d'argent" },
      { id: "srv-2", code: "BILL", label: "Paiement Facture" },
    ],
    serviceVersionsForWf: [
      { id: "ver-456", service_id: "srv-1", version: "1.0.0" },
    ],
    isLoadingWfVersions: false,
    selectedWfServiceId: "srv-1",
    serviceFlowsMap: {},
    paymentMethods: [],
    onSelectWfService: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Creation Mode", () => {
    it("renders creation dialog with service, version and structure combobox fields", () => {
      const vm = createMockVm(false);
      render(<WorkflowDialog {...defaultProps} workflowsVm={vm} />);

      expect(screen.getByText("Nouveau workflow")).toBeInTheDocument();
      expect(screen.getByLabelText(/Nom du workflow/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Service concerné/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Version de Service/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Structure \(Optionnel\)/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Créer le workflow/i })).toBeInTheDocument();
    });

    it("displays validation error when submitting with empty name", async () => {
      const vm = createMockVm(false);
      render(<WorkflowDialog {...defaultProps} workflowsVm={vm} />);

      const submitBtn = screen.getByRole("button", { name: /Créer le workflow/i });
      fireEvent.click(submitBtn);

      expect(screen.getByText("Le nom du workflow est obligatoire.")).toBeInTheDocument();
      expect(mockHandleCreateOrUpdate).not.toHaveBeenCalled();
    });

    it("displays every missing required field under its input at once", () => {
      const vm = createMockVm(false);
      render(
        <WorkflowDialog {...defaultProps} selectedWfServiceId="" serviceVersionsForWf={[]} workflowsVm={vm} />
      );

      fireEvent.click(screen.getByRole("button", { name: /Créer le workflow/i }));

      expect(screen.getByText("Le nom du workflow est obligatoire.")).toBeInTheDocument();
      expect(screen.getByText("Le service concerné est obligatoire.")).toBeInTheDocument();
      expect(screen.getByText("La version de service est obligatoire.")).toBeInTheDocument();
      expect(screen.getByLabelText(/Nom du workflow/i)).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByLabelText(/Service concerné/i)).toHaveAttribute("aria-invalid", "true");
      expect(mockHandleCreateOrUpdate).not.toHaveBeenCalled();
    });
  });

  describe("Modification Mode (Workflow Contract Compliance)", () => {
    it("displays edit dialog with name and type, without immutable section or creation selectors", async () => {
      const vm = createMockVm(true);
      render(<WorkflowDialog {...defaultProps} workflowsVm={vm} />);

      expect(screen.getByText("Modifier le workflow")).toBeInTheDocument();
      // Status and Default badges
      expect(screen.getByText("ACTIVE")).toBeInTheDocument();
      expect(screen.getByText("Par défaut")).toBeInTheDocument();

      // Périmètre & Rattachements section should NOT be present
      expect(screen.queryByText(/Périmètre & Rattachements/i)).not.toBeInTheDocument();

      // Service and Structure select inputs must NOT be editable in edit mode
      expect(screen.queryByLabelText(/Service concerné/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Version de Service/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Structure \(Optionnel\)/i)).not.toBeInTheDocument();

      // Editable fields must be present
      expect(screen.getByDisplayValue("Workflow Souscription Standard")).toBeInTheDocument();
      expect(screen.getByDisplayValue("STANDARD")).toBeInTheDocument();
    });

    it("submits updated workflow name and type when valid", async () => {
      const vm = createMockVm(true);
      render(<WorkflowDialog {...defaultProps} workflowsVm={vm} />);

      const saveBtn = screen.getByRole("button", { name: /Enregistrer les modifications/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockHandleCreateOrUpdate).toHaveBeenCalled();
      });
    });
  });
});
