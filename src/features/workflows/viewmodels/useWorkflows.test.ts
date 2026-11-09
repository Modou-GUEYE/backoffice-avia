import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useWorkflows } from "./useWorkflows";
import * as workflowsService from "../services/workflowsService";
import { WorkflowResponse, WorkflowStepResponse } from "../models/workflowsTypes";

vi.mock("../services/workflowsService", () => ({
  fetchWorkflows: vi.fn(),
  fetchWorkflowDetails: vi.fn(),
  createWorkflow: vi.fn(),
  updateWorkflow: vi.fn(),
  deleteWorkflow: vi.fn(),
  activateWorkflow: vi.fn(),
  deactivateWorkflow: vi.fn(),
  setDefaultWorkflow: vi.fn(),
  duplicateWorkflow: vi.fn(),
  assignWorkflowPaymentFlow: vi.fn(),
  unassignWorkflowPaymentFlow: vi.fn(),
  fetchWorkflowSteps: vi.fn(),
  createWorkflowStep: vi.fn(),
  updateWorkflowStep: vi.fn(),
  deleteWorkflowStep: vi.fn(),
  reorderWorkflowSteps: vi.fn(),
  fetchStepMappingContext: vi.fn(),
  previewStepMappingContext: vi.fn(),
  fetchActiveIntegrations: vi.fn().mockResolvedValue([]),
  fetchIntegrationOperations: vi.fn().mockResolvedValue([]),
}));

vi.mock("../services/formsService", () => ({
  fetchForms: vi.fn().mockResolvedValue([
    {
      id: "form-uuid-1",
      code: "TRANSFER_INPUT",
      title: "Saisie Virement",
      description: "Formulaire de saisie",
    },
  ]),
}));

describe("useWorkflows - CONFIRMATION step support", () => {
  const mockWorkflow: WorkflowResponse = {
    id: "wf-123",
    service_version_id: "ver-1",
    service_payment_flow_id: null,
    name: "Transfert Workflow",
    workflow_type: "STANDARD",
    status: "ACTIVE",
    is_default: true,
  };

  const mockConfirmationStep: WorkflowStepResponse = {
    id: "step-confirm-1",
    workflow_id: "wf-123",
    step_order: 3,
    step_key: "flow_confirmation",
    step_type: "CONFIRMATION",
    responsibility: "MOBILE",
    execution_mode: "INLINE",
    title: "Confirmation de l'opération",
    config: {
      message: "Veuillez confirmer les informations de l'opération",
      summary_fields: [
        {
          label: "Montant",
          from: "collected_data.amount_entry.amount",
          format: "amount",
          currency: "XOF",
        },
        {
          label: "Frais",
          from: "collected_data.calculate-fees.fees",
          format: "amount",
          currency: "XOF",
        },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workflowsService.fetchWorkflows).mockResolvedValue([mockWorkflow]);
    vi.mocked(workflowsService.fetchWorkflowSteps).mockResolvedValue([mockConfirmationStep]);
    vi.mocked(workflowsService.fetchStepMappingContext).mockResolvedValue({
      workflow_id: "wf-123",
      step_id: "step-confirm-1",
      sources: [
        {
          path: "collected_data.amount_entry.amount",
          label: "amount",
          value_type: "number",
          nullable: false,
          step_key: "amount_entry",
        },
      ],
      targets: [],
    });
  });

  it("opens an existing CONFIRMATION step and loads summary_fields and mapping context", async () => {
    const { result } = renderHook(() => useWorkflows({ serviceVersionId: "ver-1" }));

    // Select workflow
    await act(async () => {
      await result.current.handleSelectWorkflow(mockWorkflow);
    });

    // Open edit for confirmation step
    await act(async () => {
      await result.current.handleOpenEditStep(mockConfirmationStep);
    });

    expect(result.current.showStepDialog).toBe(true);
    expect(result.current.stepFormData.step_type).toBe("CONFIRMATION");
    expect(result.current.stepFormData.confirmation_message).toBe(
      "Veuillez confirmer les informations de l'opération"
    );
    expect(result.current.stepFormData.confirmation_summary_fields).toHaveLength(2);
    expect(result.current.stepFormData.confirmation_summary_fields[0]).toEqual({
      label: "Montant",
      from: "collected_data.amount_entry.amount",
      format: "amount",
      currency: "XOF",
    });

    expect(workflowsService.fetchStepMappingContext).toHaveBeenCalledWith("wf-123", "step-confirm-1");
  });

  it("supports adding, updating, and removing confirmation summary fields", async () => {
    const { result } = renderHook(() => useWorkflows({ serviceVersionId: "ver-1" }));

    await act(async () => {
      await result.current.handleSelectWorkflow(mockWorkflow);
      await result.current.handleOpenEditStep(mockConfirmationStep);
    });

    // Add field
    act(() => {
      result.current.handleAddConfirmationSummaryField();
    });
    expect(result.current.stepFormData.confirmation_summary_fields).toHaveLength(3);

    // Update newly added field
    act(() => {
      result.current.handleUpdateConfirmationSummaryField(2, {
        label: "Bénéficiaire",
        from: "collected_data.receiver.phone",
        format: "text",
      });
    });
    expect(result.current.stepFormData.confirmation_summary_fields[2].label).toBe("Bénéficiaire");
    expect(result.current.stepFormData.confirmation_summary_fields[2].from).toBe("collected_data.receiver.phone");

    // Remove field at index 0
    act(() => {
      result.current.handleRemoveConfirmationSummaryField(0);
    });
    expect(result.current.stepFormData.confirmation_summary_fields).toHaveLength(2);
    expect(result.current.stepFormData.confirmation_summary_fields[0].label).toBe("Frais");
  });

  it("serializes config.summary_fields and config.message on save", async () => {
    vi.mocked(workflowsService.updateWorkflowStep).mockResolvedValue({
      ...mockConfirmationStep,
    });

    const { result } = renderHook(() => useWorkflows({ serviceVersionId: "ver-1" }));

    await act(async () => {
      await result.current.handleSelectWorkflow(mockWorkflow);
      await result.current.handleOpenEditStep(mockConfirmationStep);
    });

    await act(async () => {
      await result.current.handleCreateOrUpdateStep();
    });

    expect(workflowsService.updateWorkflowStep).toHaveBeenCalledWith(
      "wf-123",
      "step-confirm-1",
      expect.objectContaining({
        step_type: "CONFIRMATION",
        responsibility: "MOBILE",
        config: expect.objectContaining({
          message: "Veuillez confirmer les informations de l'opération",
          summary_fields: [
            {
              label: "Montant",
              from: "collected_data.amount_entry.amount",
              format: "amount",
              currency: "XOF",
            },
            {
              label: "Frais",
              from: "collected_data.calculate-fees.fees",
              format: "amount",
              currency: "XOF",
            },
          ],
        }),
      })
    );
  });

  it("excludes removed fields from the payload and cleans up stale display_fields on save", async () => {
    const stepWithDisplayFields: WorkflowStepResponse = {
      ...mockConfirmationStep,
      config: {
        message: "Veuillez confirmer",
        display_fields: [
          { label: "Montant", from: "collected_data.amount_entry.amount", format: "amount", currency: "XOF" },
          { label: "Frais", from: "collected_data.calculate-fees.fees", format: "amount", currency: "XOF" },
        ],
      },
    };

    vi.mocked(workflowsService.updateWorkflowStep).mockResolvedValue(stepWithDisplayFields);

    const { result } = renderHook(() => useWorkflows({ serviceVersionId: "ver-1" }));

    await act(async () => {
      await result.current.handleSelectWorkflow(mockWorkflow);
      await result.current.handleOpenEditStep(stepWithDisplayFields);
    });

    // Remove the second field (Frais)
    act(() => {
      result.current.handleRemoveConfirmationSummaryField(1);
    });

    await act(async () => {
      await result.current.handleCreateOrUpdateStep();
    });

    expect(workflowsService.updateWorkflowStep).toHaveBeenCalledWith(
      "wf-123",
      "step-confirm-1",
      expect.objectContaining({
        config: {
          message: "Veuillez confirmer",
          summary_fields: [
            {
              label: "Montant",
              from: "collected_data.amount_entry.amount",
              format: "amount",
              currency: "XOF",
            },
          ],
        },
      })
    );

    const calledPayload = vi.mocked(workflowsService.updateWorkflowStep).mock.calls[0][2];
    expect(calledPayload.config).not.toHaveProperty("display_fields");
    expect(calledPayload.config?.summary_fields).toHaveLength(1);
    expect(calledPayload.config?.summary_fields[0].label).toBe("Montant");
  });

  it("excludes removed fields from INFO step payload and cleans up stale summary_fields on save", async () => {
    const mockInfoStep: WorkflowStepResponse = {
      id: "step-info-1",
      workflow_id: "wf-123",
      step_order: 2,
      step_key: "step_details",
      step_type: "INFO",
      responsibility: "MOBILE",
      execution_mode: "INLINE",
      title: "Détails du transfert",
      config: {
        message: "Transfer details",
        display_fields: [
          { label: "Montant", from: "collected_data.amount_entry.amount", format: "amount", currency: "XOF" },
          { label: "Frais", from: "collected_data.calculate-fees.fees", format: "amount", currency: "XOF" },
        ],
        summary_fields: [
          { label: "Montant", from: "collected_data.amount_entry.amount", format: "amount", currency: "XOF" },
          { label: "Frais", from: "collected_data.calculate-fees.fees", format: "amount", currency: "XOF" },
        ],
      },
    };

    vi.mocked(workflowsService.updateWorkflowStep).mockResolvedValue(mockInfoStep);

    const { result } = renderHook(() => useWorkflows({ serviceVersionId: "ver-1" }));

    await act(async () => {
      await result.current.handleSelectWorkflow(mockWorkflow);
      await result.current.handleOpenEditStep(mockInfoStep);
    });

    expect(result.current.stepFormData.info_display_fields).toHaveLength(2);

    // Remove the second field (Frais)
    act(() => {
      result.current.handleRemoveInfoDisplayField(1);
    });

    expect(result.current.stepFormData.info_display_fields).toHaveLength(1);

    await act(async () => {
      await result.current.handleCreateOrUpdateStep();
    });

    expect(workflowsService.updateWorkflowStep).toHaveBeenCalledWith(
      "wf-123",
      "step-info-1",
      expect.objectContaining({
        step_type: "INFO",
        config: {
          message: "Transfer details",
          display_fields: [
            {
              label: "Montant",
              from: "collected_data.amount_entry.amount",
              format: "amount",
              currency: "XOF",
            },
          ],
        },
      })
    );

    const calledPayload = vi.mocked(workflowsService.updateWorkflowStep).mock.calls[0][2];
    expect(calledPayload.config).not.toHaveProperty("summary_fields");
    expect(calledPayload.config?.display_fields).toHaveLength(1);
    expect(calledPayload.config?.display_fields[0].label).toBe("Montant");
  });
});

describe("useWorkflows - FORM step support", () => {
  const mockWorkflow: WorkflowResponse = {
    id: "wf-123",
    service_version_id: "ver-1",
    service_payment_flow_id: null,
    name: "Transfert Workflow",
    workflow_type: "STANDARD",
    status: "ACTIVE",
    is_default: true,
  };

  const mockFormStep: WorkflowStepResponse = {
    id: "step-form-1",
    workflow_id: "wf-123",
    step_order: 1,
    step_key: "step_input",
    step_type: "FORM",
    responsibility: "MOBILE",
    execution_mode: "INLINE",
    title: "Saisie des données",
    config: {
      form_id: "form-uuid-1",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workflowsService.fetchWorkflows).mockResolvedValue([mockWorkflow]);
    vi.mocked(workflowsService.fetchWorkflowSteps).mockResolvedValue([mockFormStep]);
  });

  it("loads forms and creates a FORM step with { form_id: 'uuid' } ignoring additional properties", async () => {
    vi.mocked(workflowsService.createWorkflowStep).mockResolvedValueOnce({
      ...mockFormStep,
      id: "step-created",
    });

    const { result } = renderHook(() => useWorkflows({ serviceVersionId: "ver-1" }));

    await act(async () => {
      await result.current.handleSelectWorkflow(mockWorkflow);
    });

    await act(async () => {
      result.current.handleOpenNewStep();
    });

    expect(result.current.showStepDialog).toBe(true);
    expect(result.current.forms).toHaveLength(1);
    expect(result.current.forms[0].id).toBe("form-uuid-1");

    act(() => {
      result.current.setStepFormData({
        ...result.current.stepFormData,
        step_key: "step_virement",
        title: "Virement Form",
        step_type: "FORM",
        form_id: "form-uuid-1",
      });
    });

    await act(async () => {
      await result.current.handleCreateOrUpdateStep();
    });

    expect(workflowsService.createWorkflowStep).toHaveBeenCalledWith(
      "wf-123",
      expect.objectContaining({
        step_key: "step_virement",
        title: "Virement Form",
        step_type: "FORM",
        responsibility: "MOBILE",
        config: {
          form_id: "form-uuid-1",
        },
      })
    );
  });

  it("prevents submission of FORM step when no form_id is selected", async () => {
    const { result } = renderHook(() => useWorkflows({ serviceVersionId: "ver-1" }));

    await act(async () => {
      await result.current.handleSelectWorkflow(mockWorkflow);
    });

    await act(async () => {
      result.current.handleOpenNewStep();
    });

    act(() => {
      result.current.setStepFormData({
        ...result.current.stepFormData,
        step_key: "step_virement",
        title: "Virement Form",
        step_type: "FORM",
        form_id: "",
      });
    });

    await act(async () => {
      await result.current.handleCreateOrUpdateStep();
    });

    expect(workflowsService.createWorkflowStep).not.toHaveBeenCalled();
  });

  it("exposes all step field errors and returns them when saving an incomplete step", async () => {
    const { result } = renderHook(() => useWorkflows({ serviceVersionId: "ver-1" }));

    await act(async () => {
      await result.current.handleSelectWorkflow(mockWorkflow);
    });

    await act(async () => {
      result.current.handleOpenNewStep();
    });

    let returnedErrors: Awaited<ReturnType<typeof result.current.handleCreateOrUpdateStep>> = {};
    await act(async () => {
      returnedErrors = await result.current.handleCreateOrUpdateStep();
    });

    const expectedErrors = {
      step_key: "La clé de l'étape est obligatoire",
      title: "Le titre est obligatoire",
      form_id: "Le formulaire associé est obligatoire",
    };
    expect(returnedErrors).toEqual(expectedErrors);
    expect(result.current.stepFormErrors).toEqual(expectedErrors);
    expect(workflowsService.createWorkflowStep).not.toHaveBeenCalled();

    act(() => {
      result.current.clearStepFormError("title");
    });
    expect(result.current.stepFormErrors.title).toBeUndefined();

    act(() => {
      result.current.setShowStepDialog(false);
    });
    expect(result.current.stepFormErrors).toEqual({});
  });

  it("opens an existing FORM step and extracts form_id correctly", async () => {
    const { result } = renderHook(() => useWorkflows({ serviceVersionId: "ver-1" }));

    await act(async () => {
      await result.current.handleSelectWorkflow(mockWorkflow);
      await result.current.handleOpenEditStep(mockFormStep);
    });

    expect(result.current.stepFormData.form_id).toBe("form-uuid-1");
    expect(result.current.stepFormData.step_type).toBe("FORM");
  });

  describe("Step Mapping Context Preview", () => {
    it("calls previewStepMappingContext and updates mappingContext state", async () => {
      const mockPreviewResponse = {
        workflow_id: "wf-123",
        sources: [
          {
            path: "collected_data.amount_entry.amount",
            label: "Montant",
            value_type: "number",
            nullable: false,
          },
        ],
        targets: [
          {
            key: "amount",
            label: "Amount",
            value_type: "number",
            required: true,
            nullable: false,
          },
        ],
      };
      vi.mocked(workflowsService.previewStepMappingContext).mockResolvedValueOnce(mockPreviewResponse);

      const { result } = renderHook(() => useWorkflows({ serviceVersionId: "ver-1" }));

      let res: Awaited<ReturnType<typeof result.current.loadPreviewMappingContext>>;
      await act(async () => {
        res = await result.current.loadPreviewMappingContext("wf-123", 2, "API", "op-456");
      });

      expect(workflowsService.previewStepMappingContext).toHaveBeenCalledWith("wf-123", {
        step_order: 2,
        step_type: "API",
        integration_operation_id: "op-456",
      });
      expect(result.current.mappingContext).toEqual(mockPreviewResponse);
      expect(res).toEqual(mockPreviewResponse);
    });

    it("loadStepContext in creation mode calculates step_order and requests preview", async () => {
      const mockPreviewResponse = {
        workflow_id: "wf-123",
        sources: [
          {
            path: "collected_data.form_step.name",
            label: "Nom",
            value_type: "string",
            nullable: false,
          },
        ],
        targets: [],
      };
      vi.mocked(workflowsService.previewStepMappingContext).mockResolvedValueOnce(mockPreviewResponse);
      vi.mocked(workflowsService.fetchWorkflowSteps).mockResolvedValueOnce([mockFormStep]);

      const { result } = renderHook(() => useWorkflows({ serviceVersionId: "ver-1" }));

      await act(async () => {
        await result.current.handleSelectWorkflow(mockWorkflow);
      });

      // Open new step (creation mode)
      act(() => {
        result.current.handleOpenNewStep();
      });

      // Load preview for INFO step
      await act(async () => {
        await result.current.loadStepContext("INFO", null);
      });

      // mockFormStep has step_order: 1, so new step order should be 2
      expect(workflowsService.previewStepMappingContext).toHaveBeenCalledWith("wf-123", {
        step_order: 2,
        step_type: "INFO",
        integration_operation_id: null,
      });
      expect(result.current.mappingContext).toEqual(mockPreviewResponse);
    });

    it("loadStepContext in creation mode for API step passes integration_operation_id", async () => {
      const mockPreviewResponse = {
        workflow_id: "wf-123",
        sources: [],
        targets: [{ key: "client_id", label: "Client ID", value_type: "string", required: true, nullable: false }],
      };
      vi.mocked(workflowsService.previewStepMappingContext).mockResolvedValueOnce(mockPreviewResponse);

      const { result } = renderHook(() => useWorkflows({ serviceVersionId: "ver-1" }));

      await act(async () => {
        await result.current.handleSelectWorkflow(mockWorkflow);
      });

      act(() => {
        result.current.handleOpenNewStep();
      });

      await act(async () => {
        await result.current.loadStepContext("API", "op-fees-123");
      });

      expect(workflowsService.previewStepMappingContext).toHaveBeenCalledWith("wf-123", {
        step_order: 2,
        step_type: "API",
        integration_operation_id: "op-fees-123",
      });
      expect(result.current.mappingContext).toEqual(mockPreviewResponse);
    });
  });

  describe("Structure Isolation & Duplication", () => {
    it("loads workflows with structureId option and scopes queries", async () => {
      const { result } = renderHook(() =>
        useWorkflows({ serviceVersionId: "ver-1", structureId: "struct-123" })
      );

      await act(async () => {
        await result.current.loadWorkflows("ver-1", "struct-123");
      });

      expect(workflowsService.fetchWorkflows).toHaveBeenCalledWith("ver-1", "struct-123");
      expect(result.current.currentStructureId).toBe("struct-123");
    });

    it("handleDuplicateWorkflow invokes duplicateWorkflow with sourceStructureId and payload", async () => {
      const mockDupResponse: WorkflowResponse = {
        id: "wf-copy-456",
        name: "Copie Workflow",
        service_version_id: "ver-1",
        workflow_type: "STANDARD",
        status: "DRAFT",
        is_default: false,
        structure_id: "struct-dest",
      };
      vi.mocked(workflowsService.duplicateWorkflow).mockResolvedValueOnce(mockDupResponse);

      const { result } = renderHook(() =>
        useWorkflows({ serviceVersionId: "ver-1", structureId: "struct-source" })
      );

      let dupResult: WorkflowResponse | undefined;
      await act(async () => {
        dupResult = await result.current.handleDuplicateWorkflow(
          "wf-123",
          {
            name: "Copie Workflow",
            service_version_id: "ver-1",
            structure_id: "struct-dest",
          },
          "struct-source"
        );
      });

      expect(workflowsService.duplicateWorkflow).toHaveBeenCalledWith(
        "wf-123",
        {
          name: "Copie Workflow",
          service_version_id: "ver-1",
          structure_id: "struct-dest",
        },
        "struct-source"
      );
      expect(dupResult).toEqual(mockDupResponse);
      expect(result.current.workflows).toContainEqual(mockDupResponse);
    });
  });
});


