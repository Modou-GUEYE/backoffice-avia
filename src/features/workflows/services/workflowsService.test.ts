import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";
import httpClient from "@/core/network/httpClient";
import {
  fetchWorkflows,
  fetchWorkflowDetails,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  activateWorkflow,
  deactivateWorkflow,
  setDefaultWorkflow,
  fetchWorkflowSteps,
  createWorkflowStep,
  updateWorkflowStep,
  patchWorkflowStep,
  deleteWorkflowStep,
  reorderWorkflowSteps,
  assignWorkflowPaymentFlow,
  unassignWorkflowPaymentFlow,
  fetchStepMappingContext,
  previewStepMappingContext,
  duplicateWorkflow,
  fetchStructureAvailableServices,
  fetchInstancePaymentMethods,
} from "./workflowsService";

vi.mock("@/core/network/httpClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedHttp = httpClient as unknown as {
  get: Mock;
  post: Mock;
  put: Mock;
  patch: Mock;
  delete: Mock;
};

describe("workflowsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchWorkflows appelle /api/v1/packages-services/workflows", async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: [{ id: "wf-1", name: "Workflow 1" }] });
    const res = await fetchWorkflows();
    expect(httpClient.get).toHaveBeenCalledWith("/api/v1/packages-services/workflows");
    expect(res).toEqual([{ id: "wf-1", name: "Workflow 1" }]);
  });

  it("fetchWorkflows avec serviceVersionId", async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: [] });
    await fetchWorkflows("v-123");
    expect(httpClient.get).toHaveBeenCalledWith(
      "/api/v1/packages-services/workflows?service_version_id=v-123"
    );
  });

  it("fetchWorkflowDetails appelle /api/v1/packages-services/workflows/{id}", async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: { id: "wf-1" } });
    await fetchWorkflowDetails("wf-1");
    expect(httpClient.get).toHaveBeenCalledWith("/api/v1/packages-services/workflows/wf-1");
  });

  it("createWorkflow appelle POST /api/v1/packages-services/workflows", async () => {
    mockedHttp.post.mockResolvedValueOnce({ data: { id: "wf-new" } });
    await createWorkflow({ name: "Nouveau WF", service_version_id: "ver-1" });
    expect(httpClient.post).toHaveBeenCalledWith(
      "/api/v1/packages-services/workflows",
      {
        name: "Nouveau WF",
        service_version_id: "ver-1",
        definition_kind: "WORKFLOW",
        workflow_type: "STANDARD",
      }
    );
  });

  it("updateWorkflow appelle PUT /api/v1/packages-services/workflows/{id}", async () => {
    mockedHttp.put.mockResolvedValueOnce({ data: { id: "wf-1", name: "Updated" } });
    await updateWorkflow("wf-1", { name: "Updated" });
    expect(httpClient.put).toHaveBeenCalledWith(
      "/api/v1/packages-services/workflows/wf-1",
      { name: "Updated" }
    );
  });

  it("activateWorkflow appelle POST /activate", async () => {
    mockedHttp.post.mockResolvedValueOnce({ data: { id: "wf-1", status: "active" } });
    await activateWorkflow("wf-1");
    expect(httpClient.post).toHaveBeenCalledWith("/api/v1/packages-services/workflows/wf-1/activate");
  });

  it("deactivateWorkflow appelle POST /deactivate", async () => {
    mockedHttp.post.mockResolvedValueOnce({ data: { id: "wf-1", status: "inactive" } });
    await deactivateWorkflow("wf-1");
    expect(httpClient.post).toHaveBeenCalledWith("/api/v1/packages-services/workflows/wf-1/deactivate");
  });

  it("setDefaultWorkflow appelle POST /set-default", async () => {
    mockedHttp.post.mockResolvedValueOnce({ data: { id: "wf-1", is_default: true } });
    await setDefaultWorkflow("wf-1");
    expect(httpClient.post).toHaveBeenCalledWith("/api/v1/packages-services/workflows/wf-1/set-default");
  });

  it("fetchWorkflowSteps appelle GET avec responsibility=ALL par défaut", async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: [{ id: "step-1", step_order: 1 }] });
    const res = await fetchWorkflowSteps("wf-1");
    expect(httpClient.get).toHaveBeenCalledWith(
      "/api/v1/packages-services/workflows/wf-1/steps?responsibility=ALL"
    );
    expect(res).toEqual([{ id: "step-1", step_order: 1 }]);
  });

  it("fetchWorkflowSteps avec filtre responsibility=MOBILE", async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: [] });
    await fetchWorkflowSteps("wf-1", "MOBILE");
    expect(httpClient.get).toHaveBeenCalledWith(
      "/api/v1/packages-services/workflows/wf-1/steps?responsibility=MOBILE"
    );
  });

  it("fetchStepMappingContext appelle GET /api/v1/packages-services/workflows/{wfId}/steps/{stepId}/mapping-context", async () => {
    const mockContext = {
      workflow_id: "wf-1",
      step_id: "step-1",
      sources: [
        {
          path: "collected_data.calculate-fees.fees",
          label: "fees",
          value_type: "number",
          nullable: false,
          step_key: "calculate-fees",
        },
      ],
      targets: [],
    };
    mockedHttp.get.mockResolvedValueOnce({ data: mockContext });
    const res = await fetchStepMappingContext("wf-1", "step-1");
    expect(httpClient.get).toHaveBeenCalledWith(
      "/api/v1/packages-services/workflows/wf-1/steps/step-1/mapping-context"
    );
    expect(res.sources).toHaveLength(1);
    expect(res.sources[0].path).toBe("collected_data.calculate-fees.fees");
  });

  it("patchWorkflowStep appelle PATCH /api/v1/packages-services/workflows/{wfId}/steps/{stepId}", async () => {
    const patchPayload = {
      config: {
        message: "Transfer details",
        display_fields: [
          {
            label: "Fees",
            from: "collected_data.calculate-fees.fees",
            format: "amount",
            currency: "XOF",
          },
        ],
      },
    };
    mockedHttp.patch.mockResolvedValueOnce({ data: { id: "step-1", ...patchPayload } });
    await patchWorkflowStep("wf-1", "step-1", patchPayload);
    expect(httpClient.patch).toHaveBeenCalledWith(
      "/api/v1/packages-services/workflows/wf-1/steps/step-1",
      patchPayload
    );
  });

  it("previewStepMappingContext appelle POST /api/v1/packages-services/workflows/{wfId}/steps/mapping-context/preview", async () => {
    const mockPreview = {
      workflow_id: "wf-1",
      sources: [{ path: "collected_data.amount_entry.amount", label: "Montant", value_type: "number", nullable: false }],
      targets: [{ key: "amount", label: "Amount", value_type: "number", required: true, nullable: false }],
    };
    mockedHttp.post.mockResolvedValueOnce({ data: mockPreview });
    const payload = {
      step_order: 2,
      step_type: "API" as const,
      integration_operation_id: "op-123",
    };
    const res = await previewStepMappingContext("wf-1", payload);
    expect(httpClient.post).toHaveBeenCalledWith(
      "/api/v1/packages-services/workflows/wf-1/steps/mapping-context/preview",
      payload
    );
    expect(res.sources).toHaveLength(1);
    expect(res.targets).toHaveLength(1);
  });

  it("fetchWorkflows avec serviceVersionId et structureId", async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: [] });
    await fetchWorkflows("v-123", "struct-456");
    expect(httpClient.get).toHaveBeenCalledWith(
      "/api/v1/packages-services/workflows?service_version_id=v-123&structure_id=struct-456"
    );
  });

  it("fetchWorkflowDetails avec structureId", async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: { id: "wf-1", structure_id: "struct-1" } });
    await fetchWorkflowDetails("wf-1", "struct-1");
    expect(httpClient.get).toHaveBeenCalledWith(
      "/api/v1/packages-services/workflows/wf-1?structure_id=struct-1"
    );
  });

  it("createWorkflow avec structure_id transmet la query et le body avec definition_kind", async () => {
    mockedHttp.post.mockResolvedValueOnce({ data: { id: "wf-new", structure_id: "struct-1" } });
    await createWorkflow({
      name: "Workflow Structure",
      service_version_id: "ver-1",
      structure_id: "struct-1",
    });
    expect(httpClient.post).toHaveBeenCalledWith(
      "/api/v1/packages-services/workflows?structure_id=struct-1",
      {
        name: "Workflow Structure",
        service_version_id: "ver-1",
        structure_id: "struct-1",
        definition_kind: "WORKFLOW",
        workflow_type: "STANDARD",
      }
    );
  });

  it("activateWorkflow, deactivateWorkflow et setDefaultWorkflow avec structureId", async () => {
    mockedHttp.post.mockResolvedValue({ data: { id: "wf-1" } });

    await activateWorkflow("wf-1", "struct-1");
    expect(httpClient.post).toHaveBeenCalledWith(
      "/api/v1/packages-services/workflows/wf-1/activate?structure_id=struct-1"
    );

    await deactivateWorkflow("wf-1", "struct-1");
    expect(httpClient.post).toHaveBeenCalledWith(
      "/api/v1/packages-services/workflows/wf-1/deactivate?structure_id=struct-1"
    );

    await setDefaultWorkflow("wf-1", "struct-1");
    expect(httpClient.post).toHaveBeenCalledWith(
      "/api/v1/packages-services/workflows/wf-1/set-default?structure_id=struct-1"
    );
  });

  it("duplicateWorkflow sans structure source (duplication de template)", async () => {
    mockedHttp.post.mockResolvedValueOnce({ data: { id: "wf-copy" } });
    const payload = {
      name: "Copie Workflow",
      structure_id: "struct-dest",
      service_version_id: "ver-1",
    };
    await duplicateWorkflow("wf-source", payload);
    expect(httpClient.post).toHaveBeenCalledWith(
      "/api/v1/packages-services/workflows/wf-source/duplicate",
      payload
    );
  });

  it("duplicateWorkflow avec structure source (duplication entre structures)", async () => {
    mockedHttp.post.mockResolvedValueOnce({ data: { id: "wf-copy" } });
    const payload = {
      name: "Copie Workflow",
      structure_id: "struct-dest",
      service_version_id: "ver-1",
    };
    await duplicateWorkflow("wf-source", payload, "struct-src");
    expect(httpClient.post).toHaveBeenCalledWith(
      "/api/v1/packages-services/workflows/wf-source/duplicate?structure_id=struct-src",
      payload
    );
  });

  it("fetchWorkflowSteps avec structureId et responsibility=ALL", async () => {
    mockedHttp.get.mockResolvedValueOnce({ data: [] });
    await fetchWorkflowSteps("wf-1", "ALL", "struct-1");
    expect(httpClient.get).toHaveBeenCalledWith(
      "/api/v1/packages-services/workflows/wf-1/steps?responsibility=ALL&structure_id=struct-1"
    );
  });

  it("fetchStructureAvailableServices appelle /api/v1/packages-services/structures/{id}/available-services", async () => {
    const mockServices = {
      items: [
        { id: "srv-1", code: "TRANSFER", supports_workflows: true, workflow_id: "wf-default" },
      ],
      page: 1,
      page_size: 20,
      total: 1,
    };
    mockedHttp.get.mockResolvedValueOnce({ data: mockServices });
    const res = await fetchStructureAvailableServices("struct-1", 1, 20);
    expect(httpClient.get).toHaveBeenCalledWith(
      "/api/v1/packages-services/structures/struct-1/available-services?page=1&page_size=20"
    );
    expect(res.items).toHaveLength(1);
    expect(res.items[0].workflow_id).toBe("wf-default");
  });

  it("fetchInstancePaymentMethods appelle /api/v1/packages-services/workflow-instances/{id}/payment-methods", async () => {
    const mockPms = [{ id: "pm-1", name: "Wallet" }];
    mockedHttp.get.mockResolvedValueOnce({ data: mockPms });
    const res = await fetchInstancePaymentMethods("inst-1", "SOURCE");
    expect(httpClient.get).toHaveBeenCalledWith(
      "/api/v1/packages-services/workflow-instances/inst-1/payment-methods?direction=SOURCE"
    );
    expect(res).toEqual(mockPms);
  });
});

