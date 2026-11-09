import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AgenceDetailPage from "./AgenceDetailPage";
import * as useAgenceDetailModule from "../viewmodels/useAgenceDetail";
import type { AgenceRead } from "../models/types";

const mockedNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

vi.mock("../viewmodels/useAgenceDetail");

describe("AgenceDetailPage", () => {
  const mockAgence = {
    id: "ag-123",
    name: "Agence Dakar Plateau",
    code: "AGC-DKR",
    parent_id: "distrib-456",
    parent_type: "DISTRIBUTOR",
    is_active: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useAgenceDetailModule, "useAgenceDetail").mockReturnValue({
      agence: mockAgence as AgenceRead,
      loading: false,
      error: null,
      activeTab: "details",
      handleTabChange: vi.fn(),
      caisses: [],
      caissesLoading: false,
      caisseForm: { name: "", code: "" },
      setCaisseForm: vi.fn(),
      caisseFormErrors: {},
      clearCaisseFormError: vi.fn(),
      editingCaisse: null,
      caisseDialogOpen: false,
      setCaisseDialogOpen: vi.fn(),
      deleteDialogOpen: false,
      setDeleteDialogOpen: vi.fn(),
      statusDialogOpen: false,
      setStatusDialogOpen: vi.fn(),
      utilisateurs: [],
      usersLoading: false,
      availableProfiles: [],
      resolveStructureLabel: vi.fn(),
      resolveParentLabel: vi.fn().mockReturnValue("Distributeur Dakar"),
      permissions: { canUpdate: true, canDelete: true },
    } as unknown as ReturnType<typeof useAgenceDetailModule.useAgenceDetail>);
  });

  it("navigates to /dashboard/agences when no distributorId is in params", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/agences/ag-123"]}>
        <Routes>
          <Route path="/dashboard/agences/:id" element={<AgenceDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    const backButton = screen.getByLabelText("Retour aux agences");
    expect(backButton).toBeInTheDocument();
    fireEvent.click(backButton);

    expect(mockedNavigate).toHaveBeenCalledWith("/dashboard/agences");
  });

  it("navigates to /dashboard/distributeurs/:distributorId?tab=agences when distributorId is present", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/distributeurs/distrib-456/agences/ag-123"]}>
        <Routes>
          <Route
            path="/dashboard/distributeurs/:distributorId/agences/:id"
            element={<AgenceDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    const backButton = screen.getByLabelText("Retour au distributeur");
    expect(backButton).toBeInTheDocument();
    fireEvent.click(backButton);

    expect(mockedNavigate).toHaveBeenCalledWith("/dashboard/distributeurs/distrib-456?tab=agences");
  });
});
