import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AbonnementsPage } from "./AbonnementsPage";
import * as useAbonnementsModule from "../viewmodels/useAbonnements";

vi.mock("../viewmodels/useAbonnements");

describe("AbonnementsPage", () => {
  it("renders without crashing even if services is undefined or non-array", () => {
    vi.spyOn(useAbonnementsModule, "useAbonnements").mockReturnValue({
      subscriptions: [],
      services: undefined as unknown as ReturnType<typeof useAbonnementsModule.useAbonnements>["services"],
      structures: [],
      structureOptions: [],
      structureLocked: false,
      loading: false,
      actionLoading: false,
      error: null,
      formOpen: true, // open form where services.map is rendered
      setFormOpen: vi.fn(),
      isEdit: false,
      form: {
        label: "",
        amount: "",
        periodicity: "MONTHLY",
        service_ids: [],
        structure_id: "",
        description: "",
        status: "ACTIVE",
        expires_at: "",
      },
      setForm: vi.fn(),
      formErrors: {},
      clearFormError: vi.fn(),
      openCreate: vi.fn(),
      openEdit: vi.fn(),
      handleCreate: vi.fn(),
      handleUpdate: vi.fn(),
      handleDelete: vi.fn(),
      handleStatusChange: vi.fn(),
      getSubscriptionById: vi.fn(),
      refresh: vi.fn(),
    });

    render(<AbonnementsPage embedded={true} />);

    expect(screen.getByText("Liste des Abonnements")).toBeInTheDocument();
    expect(screen.getByText("Fonctionnalités à restreindre")).toBeInTheDocument();
  });

  it("renders services list properly when provided", () => {
    vi.spyOn(useAbonnementsModule, "useAbonnements").mockReturnValue({
      subscriptions: [],
      services: [
        { id: "srv-1", label: "Virement", code: "VIR", description: null, category_id: null, status: "ACTIVE" },
      ],
      structures: [],
      structureOptions: [],
      structureLocked: false,
      loading: false,
      actionLoading: false,
      error: null,
      formOpen: true,
      setFormOpen: vi.fn(),
      isEdit: false,
      form: {
        label: "",
        amount: "",
        periodicity: "MONTHLY",
        service_ids: ["srv-1"],
        structure_id: "",
        description: "",
        status: "ACTIVE",
        expires_at: "",
      },
      setForm: vi.fn(),
      formErrors: {},
      clearFormError: vi.fn(),
      openCreate: vi.fn(),
      openEdit: vi.fn(),
      handleCreate: vi.fn(),
      handleUpdate: vi.fn(),
      handleDelete: vi.fn(),
      handleStatusChange: vi.fn(),
      getSubscriptionById: vi.fn(),
      refresh: vi.fn(),
    });

    render(<AbonnementsPage embedded={true} />);

    expect(screen.getByText("Virement")).toBeInTheDocument();
  });
});
