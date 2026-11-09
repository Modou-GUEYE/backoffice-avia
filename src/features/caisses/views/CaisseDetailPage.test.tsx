import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import CaisseDetailPage from "./CaisseDetailPage";
import * as useCaisseDetailModule from "../viewmodels/useCaisseDetail";

const mockedNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

vi.mock("../viewmodels/useCaisseDetail");

describe("CaisseDetailPage", () => {
  const mockOpenEdit = vi.fn();
  const mockRequestToggleStatut = vi.fn();
  const mockOpenDelete = vi.fn();
  const mockHandleSave = vi.fn();
  const mockConfirmToggleStatut = vi.fn();
  const mockHandleDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche le loader quand loading est vrai", () => {
    vi.spyOn(useCaisseDetailModule, "useCaisseDetail").mockReturnValue({
      caisse: null,
      loading: true,
      error: null,
      agencyName: "",
      parentName: "",
      agencyOptions: [],
      permissions: { canUpdate: true, canDelete: true },
      editDialogOpen: false,
      setEditDialogOpen: vi.fn(),
      editForm: { name: "", code: "", agency_id: "" },
      setEditForm: vi.fn(),
      editFormErrors: {},
      clearEditFormError: vi.fn(),
      statusDialogOpen: false,
      setStatusDialogOpen: vi.fn(),
      statusNextAction: null,
      deleteDialogOpen: false,
      setDeleteDialogOpen: vi.fn(),
      openEdit: mockOpenEdit,
      handleSave: mockHandleSave,
      requestToggleStatut: mockRequestToggleStatut,
      confirmToggleStatut: mockConfirmToggleStatut,
      openDelete: mockOpenDelete,
      handleDelete: mockHandleDelete,
      loadCaisse: vi.fn(),
    });

    render(
      <MemoryRouter>
        <CaisseDetailPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Chargement de la caisse...")).toBeInTheDocument();
  });

  it("affiche les informations de la caisse sans champs inutiles", () => {
    const fakeCaisse = {
      id: "caisse-uuid-1234",
      name: "Caisse Principale 01",
      code: "CSS001",
      agency_id: "agency-uuid-1",
      parent_id: "struct-uuid-1",
      parent_type: "STRUCTURE" as const,
      is_active: true,
      activated_at: "2026-01-15T10:00:00Z",
      deactivated_at: null,
      is_deleted: false,
      created_at: "2026-01-15T09:00:00Z",
      updated_at: "2026-01-15T09:00:00Z",
    };

    vi.spyOn(useCaisseDetailModule, "useCaisseDetail").mockReturnValue({
      caisse: fakeCaisse,
      loading: false,
      error: null,
      agencyName: "Agence Centrale",
      parentName: "Structure Siège",
      agencyOptions: [{ id: "agency-uuid-1", nom: "Agence Centrale" }],
      permissions: { canUpdate: true, canDelete: true },
      editDialogOpen: false,
      setEditDialogOpen: vi.fn(),
      editForm: { name: "Caisse Principale 01", code: "CSS001", agency_id: "agency-uuid-1" },
      setEditForm: vi.fn(),
      editFormErrors: {},
      clearEditFormError: vi.fn(),
      statusDialogOpen: false,
      setStatusDialogOpen: vi.fn(),
      statusNextAction: null,
      deleteDialogOpen: false,
      setDeleteDialogOpen: vi.fn(),
      openEdit: mockOpenEdit,
      handleSave: mockHandleSave,
      requestToggleStatut: mockRequestToggleStatut,
      confirmToggleStatut: mockConfirmToggleStatut,
      openDelete: mockOpenDelete,
      handleDelete: mockHandleDelete,
      loadCaisse: vi.fn(),
    });

    render(
      <MemoryRouter>
        <CaisseDetailPage />
      </MemoryRouter>
    );

    // Titre et informations principales
    expect(screen.getAllByText("Caisse Principale 01")[0]).toBeInTheDocument();
    expect(screen.getAllByText("CSS001")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Agence Centrale")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Structure Siège")[0]).toBeInTheDocument();
    expect(screen.getByText("Informations Générales")).toBeInTheDocument();
    expect(screen.getByText("Traçabilité & Dates")).toBeInTheDocument();

    // Vérifier l'absence des champs inutiles
    expect(screen.queryByText("Solde")).not.toBeInTheDocument();
    expect(screen.queryByText("current_balance")).not.toBeInTheDocument();
    expect(screen.queryByText("Limite journalière")).not.toBeInTheDocument();
    expect(screen.queryByText("Limite par transaction")).not.toBeInTheDocument();
    expect(screen.queryByText("Caissier assigné")).not.toBeInTheDocument();
    expect(screen.queryByText("Devise")).not.toBeInTheDocument();

    // Vérifier l'absence des boutons d'actions dans le header
    expect(screen.queryByRole("button", { name: /modifier/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /désactiver/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /supprimer/i })).not.toBeInTheDocument();
  });

  it("navigates to /dashboard/caisses when no distributorId is in params", () => {
    vi.spyOn(useCaisseDetailModule, "useCaisseDetail").mockReturnValue({
      caisse: { id: "caisse-uuid-1", name: "Caisse Test", is_active: true },
      loading: false,
      error: null,
      agencyName: "Agence Test",
      parentName: "Structure Siège",
      agencyOptions: [],
      permissions: { canUpdate: true, canDelete: true },
      editDialogOpen: false,
      setEditDialogOpen: vi.fn(),
      editForm: { name: "", code: "", agency_id: "" },
      setEditForm: vi.fn(),
      editFormErrors: {},
      clearEditFormError: vi.fn(),
      statusDialogOpen: false,
      setStatusDialogOpen: vi.fn(),
      deleteDialogOpen: false,
      setDeleteDialogOpen: vi.fn(),
    } as unknown as ReturnType<typeof useCaisseDetailModule.useCaisseDetail>);

    render(
      <MemoryRouter initialEntries={["/dashboard/caisses/caisse-uuid-1"]}>
        <Routes>
          <Route path="/dashboard/caisses/:id" element={<CaisseDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    const backBtn = screen.getByLabelText("Retour aux caisses");
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);

    expect(mockedNavigate).toHaveBeenCalledWith("/dashboard/caisses");
  });

  it("navigates to /dashboard/distributeurs/:distributorId?tab=caisses when distributorId is present", () => {
    vi.spyOn(useCaisseDetailModule, "useCaisseDetail").mockReturnValue({
      caisse: { id: "caisse-uuid-1", name: "Caisse Test", is_active: true },
      loading: false,
      error: null,
      agencyName: "Agence Test",
      parentName: "Distributeur Test",
      agencyOptions: [],
      permissions: { canUpdate: true, canDelete: true },
      editDialogOpen: false,
      setEditDialogOpen: vi.fn(),
      editForm: { name: "", code: "", agency_id: "" },
      setEditForm: vi.fn(),
      editFormErrors: {},
      clearEditFormError: vi.fn(),
      statusDialogOpen: false,
      setStatusDialogOpen: vi.fn(),
      deleteDialogOpen: false,
      setDeleteDialogOpen: vi.fn(),
    } as unknown as ReturnType<typeof useCaisseDetailModule.useCaisseDetail>);

    render(
      <MemoryRouter initialEntries={["/dashboard/distributeurs/distrib-123/caisses/caisse-uuid-1"]}>
        <Routes>
          <Route
            path="/dashboard/distributeurs/:distributorId/caisses/:id"
            element={<CaisseDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    const backBtn = screen.getByLabelText("Retour au distributeur");
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);

    expect(mockedNavigate).toHaveBeenCalledWith("/dashboard/distributeurs/distrib-123?tab=caisses");
  });
});
