import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DuplicateWorkflowDialog } from "./DuplicateWorkflowDialog";
import { WorkflowResponse } from "../../models/workflowsTypes";
import { ServiceResponse } from "@/features/packages/models/types";

vi.mock("@/features/packages/services/servicesService", () => ({
  fetchServices: vi.fn().mockResolvedValue([
    { id: "srv-1", label: "Service Virement", code: "VIR_01" },
  ]),
  fetchServiceVersions: vi.fn().mockResolvedValue([
    { id: "ver-100", version: "v1.0.0", status: "PUBLISHED" },
    { id: "ver-200", version: "v2.0.0", status: "DRAFT" },
  ]),
}));

vi.mock("@/features/structures/services/structuresService", () => ({
  fetchStructureById: vi.fn().mockImplementation((id: string) =>
    Promise.resolve({
      id,
      name: id === "struct-source" ? "Banque Atlantique" : "Coris Bank",
      code: id === "struct-source" ? "BA-01" : "CBI-01",
      is_active: true,
      is_deleted: false,
    })
  ),
  fetchStructures: vi.fn().mockResolvedValue({
    items: [
      { id: "struct-source", name: "Banque Atlantique", code: "BA-01", is_active: true },
      { id: "struct-dest", name: "Coris Bank", code: "CBI-01", is_active: true },
    ],
    total: 2,
  }),
}));

describe("DuplicateWorkflowDialog", () => {
  const mockServices = [
    { id: "srv-1", label: "Service Virement", code: "VIR_01" },
  ] as unknown as ServiceResponse[];

  const mockSourceWorkflow: WorkflowResponse = {
    id: "wf-1",
    name: "Workflow Virement",
    service_version_id: "ver-100",
    service_payment_flow_id: null,
    structure_id: "struct-source",
    workflow_type: "STANDARD",
    status: "ACTIVE",
    is_default: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with prefilled name, service select and version select when opened", async () => {
    render(
      <DuplicateWorkflowDialog
        open={true}
        onOpenChange={vi.fn()}
        sourceWorkflow={mockSourceWorkflow}
        onDuplicate={vi.fn()}
        isDuplicating={false}
        services={mockServices}
        currentServiceId="srv-1"
      />
    );

    expect(screen.getByText("Dupliquer le workflow")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Workflow Virement (Copie)")).toBeInTheDocument();
    expect(await screen.findByText(/Banque Atlantique/i)).toBeInTheDocument();

    // Service select
    const serviceSelect = screen.getByLabelText(/Service concerné \*/i) as HTMLSelectElement;
    expect(serviceSelect.value).toBe("srv-1");

    // Version select
    const versionSelect = (await screen.findByLabelText(/Version de service cible \*/i)) as HTMLSelectElement;
    expect(versionSelect.tagName).toBe("SELECT");
    expect(versionSelect.value).toBe("ver-100");
  });

  it("validates required fields and displays error message", async () => {
    const onDuplicateMock = vi.fn();
    render(
      <DuplicateWorkflowDialog
        open={true}
        onOpenChange={vi.fn()}
        sourceWorkflow={mockSourceWorkflow}
        onDuplicate={onDuplicateMock}
        isDuplicating={false}
        services={mockServices}
        currentServiceId="srv-1"
      />
    );

    const nameInput = screen.getByLabelText(/Nom de la copie/i);
    fireEvent.change(nameInput, { target: { value: "" } });

    const submitBtn = screen.getByRole("button", { name: /^Dupliquer$/i });
    fireEvent.click(submitBtn);

    expect(
      screen.getByText("Le nom de la copie du workflow est obligatoire.")
    ).toBeInTheDocument();
    expect(onDuplicateMock).not.toHaveBeenCalled();
  });

  it("submits duplicate request with selected version from select and closes modal", async () => {
    const onDuplicateMock = vi.fn().mockResolvedValue({});
    const onOpenChangeMock = vi.fn();

    render(
      <DuplicateWorkflowDialog
        open={true}
        onOpenChange={onOpenChangeMock}
        sourceWorkflow={mockSourceWorkflow}
        onDuplicate={onDuplicateMock}
        isDuplicating={false}
        services={mockServices}
        currentServiceId="srv-1"
      />
    );

    // Open combobox for structure
    const comboboxBtn = screen.getByRole("combobox", { name: /Structure destination/i });
    fireEvent.click(comboboxBtn);

    // Select "Coris Bank"
    const destOption = await screen.findByText("Coris Bank");
    fireEvent.click(destOption);

    // Wait for version select to be loaded
    const versionSelect = (await screen.findByLabelText(/Version de service cible \*/i)) as HTMLSelectElement;
    expect(versionSelect.value).toBe("ver-100");

    const submitBtn = screen.getByRole("button", { name: /^Dupliquer$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onDuplicateMock).toHaveBeenCalledWith(
        "wf-1",
        {
          name: "Workflow Virement (Copie)",
          service_version_id: "ver-100",
          structure_id: "struct-dest",
        },
        "struct-source"
      );
      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    });
  });
});
