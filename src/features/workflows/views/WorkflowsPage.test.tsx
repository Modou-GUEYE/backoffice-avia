import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkflowsPage } from "./WorkflowsPage";
import { useCurrentActor } from "@/core/security/useCurrentActor";

vi.mock("@/core/security/useCurrentActor", () => ({
  useCurrentActor: vi.fn(),
}));

vi.mock("../services/workflowsService", () => ({
  fetchWorkflows: vi.fn().mockResolvedValue([]),
  fetchWorkflowDetails: vi.fn().mockResolvedValue(null),
  createWorkflow: vi.fn(),
  updateWorkflow: vi.fn(),
  deleteWorkflow: vi.fn(),
  activateWorkflow: vi.fn(),
  deactivateWorkflow: vi.fn(),
  setDefaultWorkflow: vi.fn(),
  fetchWorkflowSteps: vi.fn().mockResolvedValue([]),
  createWorkflowStep: vi.fn(),
  updateWorkflowStep: vi.fn(),
  deleteWorkflowStep: vi.fn(),
  reorderWorkflowSteps: vi.fn(),
}));

vi.mock("../services/formsService", () => ({
  fetchForms: vi.fn().mockResolvedValue([]),
  createForm: vi.fn(),
  updateForm: vi.fn(),
  deleteForm: vi.fn(),
  fetchFormFields: vi.fn().mockResolvedValue([]),
  createFormField: vi.fn(),
  updateFormField: vi.fn(),
  deleteFormField: vi.fn(),
  reorderFormFields: vi.fn(),
}));

vi.mock("../services/fieldTypesService", () => ({
  fetchFieldTypes: vi.fn().mockResolvedValue([]),
  fetchFieldTypeDetails: vi.fn().mockResolvedValue(null),
  createFieldType: vi.fn(),
  updateFieldType: vi.fn(),
  deleteFieldType: vi.fn(),
  fetchFieldDefinitions: vi.fn().mockResolvedValue([]),
  createFieldDefinition: vi.fn(),
  updateFieldDefinition: vi.fn(),
  deleteFieldDefinition: vi.fn(),
}));

vi.mock("@/features/packages/services/servicesService", () => ({
  fetchServices: vi.fn().mockResolvedValue([]),
  fetchServiceVersions: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/payment-methods/services/paymentMethodsService", () => ({
  fetchPaymentMethods: vi.fn().mockResolvedValue([]),
}));

describe("WorkflowsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with header when not embedded", async () => {
    vi.mocked(useCurrentActor).mockReturnValue({
      currentActorRole: "Administrateur",
      currentPermissions: ["profile.bo-admin"],
      entityContext: "Administration",
    });

    await React.act(async () => {
      render(
        <WorkflowsPage
          embedded={false}
          services={[]}
          paymentMethods={[]}
        />
      );
    });

    expect(screen.getByText("Workflows & Formulaires")).toBeInTheDocument();
    expect(screen.getByText("Workflows")).toBeInTheDocument();
    expect(screen.getByText("Intégrations")).toBeInTheDocument();
    expect(screen.getByText("Formulaires")).toBeInTheDocument();
    expect(screen.getByText("Catalogue de Champs")).toBeInTheDocument();
  });

  it("hides header when embedded", async () => {
    vi.mocked(useCurrentActor).mockReturnValue({
      currentActorRole: "Administrateur",
      currentPermissions: ["profile.bo-admin"],
      entityContext: "Administration",
    });

    await React.act(async () => {
      render(
        <WorkflowsPage
          embedded={true}
          initialTab="workflows"
          services={[]}
          paymentMethods={[]}
        />
      );
    });

    expect(screen.queryByText("Gestion et orchestration des étapes d'exécution de service, formulaires dynamiques et catalogue de champs.")).not.toBeInTheDocument();
    expect(screen.getByText("Workflows")).toBeInTheDocument();
  });

  it("hides creation button if user has only read permission", async () => {
    vi.mocked(useCurrentActor).mockReturnValue({
      currentActorRole: "Contrôleur",
      currentPermissions: ["perm.bo.workflow.list", "perm.bo.workflow.read"],
      entityContext: "Administration",
    });

    await React.act(async () => {
      render(
        <WorkflowsPage
          embedded={true}
          initialTab="workflows"
          services={[]}
          paymentMethods={[]}
        />
      );
    });

    expect(screen.queryByText("Nouveau Workflow")).not.toBeInTheDocument();
  });

  it("shows creation button if user has workflow create permission", async () => {
    vi.mocked(useCurrentActor).mockReturnValue({
      currentActorRole: "Administrateur",
      currentPermissions: ["perm.bo.workflow.list", "perm.bo.workflow.read", "perm.bo.workflow.create"],
      entityContext: "Administration",
    });

    await React.act(async () => {
      render(
        <WorkflowsPage
          embedded={true}
          initialTab="workflows"
          services={[]}
          paymentMethods={[]}
        />
      );
    });

    expect(screen.getByText("Nouveau Workflow")).toBeInTheDocument();
  });

  it("only displays Formulaires tab if user only has perm.bo.form.list", async () => {
    vi.mocked(useCurrentActor).mockReturnValue({
      currentActorRole: "Contrôleur",
      currentPermissions: ["perm.bo.form.list"],
      entityContext: "Administration",
    });

    await React.act(async () => {
      render(
        <WorkflowsPage
          embedded={true}
          initialTab="forms"
          services={[]}
          paymentMethods={[]}
        />
      );
    });

    expect(screen.getByText("Formulaires")).toBeInTheDocument();
    expect(screen.queryByText("Workflows")).not.toBeInTheDocument();
    expect(screen.queryByText("Catalogue de Champs")).not.toBeInTheDocument();
  });

  it("only displays Catalogue de Champs tab if user only has perm.bo.field.list", async () => {
    vi.mocked(useCurrentActor).mockReturnValue({
      currentActorRole: "Contrôleur",
      currentPermissions: ["perm.bo.field.list"],
      entityContext: "Administration",
    });

    await React.act(async () => {
      render(
        <WorkflowsPage
          embedded={true}
          initialTab="fields"
          services={[]}
          paymentMethods={[]}
        />
      );
    });

    expect(screen.getByText("Catalogue de Champs")).toBeInTheDocument();
    expect(screen.queryByText("Workflows")).not.toBeInTheDocument();
    expect(screen.queryByText("Formulaires")).not.toBeInTheDocument();
  });

  it("only displays Intégrations tab if user only has perm.bo.integration.list", async () => {
    vi.mocked(useCurrentActor).mockReturnValue({
      currentActorRole: "Contrôleur",
      currentPermissions: ["perm.bo.integration.list"],
      entityContext: "Administration",
    });

    await React.act(async () => {
      render(
        <WorkflowsPage
          embedded={true}
          initialTab="integrations"
          services={[]}
          paymentMethods={[]}
        />
      );
    });

    expect(screen.getByText("Intégrations")).toBeInTheDocument();
    expect(screen.queryByText("Workflows")).not.toBeInTheDocument();
    expect(screen.queryByText("Formulaires")).not.toBeInTheDocument();
    expect(screen.queryByText("Nouvelle Intégration")).not.toBeInTheDocument();
  });

  it("does not display Intégrations tab with workflow permissions only", async () => {
    vi.mocked(useCurrentActor).mockReturnValue({
      currentActorRole: "Contrôleur",
      currentPermissions: ["perm.bo.workflow.list", "perm.bo.workflow.read", "perm.bo.workflow.create"],
      entityContext: "Administration",
    });

    await React.act(async () => {
      render(
        <WorkflowsPage
          embedded={true}
          initialTab="workflows"
          services={[]}
          paymentMethods={[]}
        />
      );
    });

    expect(screen.getByText("Workflows")).toBeInTheDocument();
    expect(screen.queryByText("Intégrations")).not.toBeInTheDocument();
  });

  it("shows Nouvelle Intégration button with perm.bo.integration.create", async () => {
    vi.mocked(useCurrentActor).mockReturnValue({
      currentActorRole: "Contrôleur",
      currentPermissions: ["perm.bo.integration.list", "perm.bo.integration.create"],
      entityContext: "Administration",
    });

    await React.act(async () => {
      render(
        <WorkflowsPage
          embedded={true}
          initialTab="integrations"
          services={[]}
          paymentMethods={[]}
        />
      );
    });

    expect(screen.getByText("Nouvelle Intégration")).toBeInTheDocument();
  });

  it("displays tabs when user has permissions", async () => {
    vi.mocked(useCurrentActor).mockReturnValue({
      currentActorRole: "Administrateur",
      currentPermissions: [
        "perm.bo.workflow.list",
        "perm.bo.workflow.read",
        "perm.bo.form.list",
        "perm.bo.form.read",
        "perm.bo.field.list",
        "perm.bo.field.read",
        "perm.bo.integration.list",
        "perm.bo.integration.read",
      ],
      entityContext: "Administration",
    });

    await React.act(async () => {
      render(
        <WorkflowsPage
          embedded={true}
          services={[]}
          paymentMethods={[]}
        />
      );
    });

    expect(screen.getByText("Workflows")).toBeInTheDocument();
    expect(screen.getByText("Intégrations")).toBeInTheDocument();
    expect(screen.getByText("Formulaires")).toBeInTheDocument();
    expect(screen.getByText("Catalogue de Champs")).toBeInTheDocument();
  });
});

