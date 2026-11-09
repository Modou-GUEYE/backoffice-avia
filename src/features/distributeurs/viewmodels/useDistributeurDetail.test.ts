import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useDistributeurDetail } from "./useDistributeurDetail";
import * as distributeursService from "../services/distributeursService";
import * as accessSecurityService from "@/core/security/accessSecurityService";
import type { AgenceRead } from "@/features/agences/models/types";
import type { Distributeur } from "../models/types";

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "distrib-123" }),
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock("../services/distributeursService", () => ({
  fetchDistributeurById: vi.fn(),
  fetchDistributorAgencies: vi.fn(),
  fetchDistributorCaisses: vi.fn(),
  activateDistributeur: vi.fn(),
  deactivateDistributeur: vi.fn(),
  deleteDistributeur: vi.fn(),
  updateDistributeur: vi.fn(),
}));

vi.mock("@/features/agences/services/agencesService", () => ({
  createAgence: vi.fn(),
  updateAgence: vi.fn(),
  toggleAgenceStatus: vi.fn(),
  deleteAgence: vi.fn(),
  fetchAgencyCaisses: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/caisses/services/caissesService", () => ({
  createCaisse: vi.fn(),
  updateCaisse: vi.fn(),
  activateCaisse: vi.fn(),
  deactivateCaisse: vi.fn(),
  deleteCaisse: vi.fn(),
  fetchCaisses: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/core/security/accessSecurityService", () => ({
  listHierarchyMembers: vi.fn(),
  listClientCompositeRoles: vi.fn().mockResolvedValue([]),
  createBackofficeUser: vi.fn(),
  deleteAccessSecurityUser: vi.fn(),
  updateAccessSecurityUser: vi.fn(),
}));

vi.mock("@/core/references/structureCatalogStore", () => {
  const storeFn = Object.assign(
    vi.fn((selector) => selector({ items: [{ id: "struct-1", nom: "Structure Test" }] })),
    {
      getState: () => ({ items: [{ id: "struct-1", nom: "Structure Test" }] }),
    }
  );
  return { useStructureCatalogStore: storeFn };
});

vi.mock("@/core/security/useCurrentActor", () => ({
  useCurrentActor: () => ({
    currentActorRole: "Admin",
    currentPermissions: [],
  }),
}));

vi.mock("@/core/permissions/permissions", () => ({
  can: () => true,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("useDistributeurDetail", () => {
  const mockDistributeur = {
    id: "distrib-123",
    name: "Distributeur Test",
    structure_id: "struct-1",
    contact_email: "test@distrib.com",
    contact_phone: "339001122",
    deposit_required: "100000",
    current_deposit: "50000",
    is_active: true,
    is_deleted: false,
    deposit_validated: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(distributeursService.fetchDistributeurById).mockResolvedValue(mockDistributeur as unknown as Distributeur);
    vi.mocked(distributeursService.fetchDistributorAgencies).mockResolvedValue([]);
    vi.mocked(distributeursService.fetchDistributorCaisses).mockResolvedValue([]);
    vi.mocked(accessSecurityService.listHierarchyMembers).mockResolvedValue(
      { users: [] } as unknown as Awaited<ReturnType<typeof accessSecurityService.listHierarchyMembers>>,
    );
  });

  it("loads ONLY distributor details on initial load and does NOT call sub-resources", async () => {
    const { result } = renderHook(() => useDistributeurDetail());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.distributeur).toEqual(mockDistributeur);
    expect(result.current.structureName).toBe("Structure Test");

    // Only distributor detail is loaded initially
    expect(distributeursService.fetchDistributeurById).toHaveBeenCalledTimes(1);
    expect(distributeursService.fetchDistributorAgencies).not.toHaveBeenCalled();
    expect(distributeursService.fetchDistributorCaisses).not.toHaveBeenCalled();
    expect(accessSecurityService.listHierarchyMembers).not.toHaveBeenCalled();
  });

  it("calls fetchDistributorAgencies only when switching to 'agences' tab with backend params", async () => {
    const { result } = renderHook(() => useDistributeurDetail());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(distributeursService.fetchDistributorAgencies).not.toHaveBeenCalled();

    act(() => {
      result.current.setActiveTab("agences");
    });

    await waitFor(() => {
      expect(distributeursService.fetchDistributorAgencies).toHaveBeenCalledTimes(1);
    });
    expect(distributeursService.fetchDistributorAgencies).toHaveBeenCalledWith("distrib-123", {
      skip: 0,
      limit: 100,
      search: undefined,
      city: undefined,
      is_active: undefined,
    });
  });

  it("calls fetchDistributorCaisses only when switching to 'caisses' tab with backend params", async () => {
    const { result } = renderHook(() => useDistributeurDetail());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(distributeursService.fetchDistributorCaisses).not.toHaveBeenCalled();

    act(() => {
      result.current.setActiveTab("caisses");
    });

    await waitFor(() => {
      expect(distributeursService.fetchDistributorCaisses).toHaveBeenCalledTimes(1);
    });
    expect(distributeursService.fetchDistributorCaisses).toHaveBeenCalledWith("distrib-123", {
      skip: 0,
      limit: 100,
      search: undefined,
      is_active: undefined,
    });
  });

  it("calls listHierarchyMembers only when switching to 'utilisateurs' tab", async () => {
    const { result } = renderHook(() => useDistributeurDetail());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(accessSecurityService.listHierarchyMembers).not.toHaveBeenCalled();

    act(() => {
      result.current.setActiveTab("utilisateurs");
    });

    await waitFor(() => {
      expect(accessSecurityService.listHierarchyMembers).toHaveBeenCalledTimes(1);
    });
    expect(accessSecurityService.listHierarchyMembers).toHaveBeenCalledWith(
      "DISTRIBUTOR",
      "distrib-123",
      expect.any(String)
    );
  });

  it("calls listHierarchyMembers with backend filters when user filters are changed", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDistributeurDetail());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.setActiveTab("utilisateurs");
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(accessSecurityService.listHierarchyMembers).toHaveBeenCalledWith(
      "DISTRIBUTOR",
      "distrib-123",
      expect.any(String)
    );

    act(() => {
      result.current.setUserUsername("jdupont");
      result.current.setUserEmail("jdupont@test.com");
      result.current.setUserProfile("profile.bo.autonome-set-admin");
      result.current.setUserStatus("active");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    expect(accessSecurityService.listHierarchyMembers).toHaveBeenCalledWith(
      "DISTRIBUTOR",
      "distrib-123",
      expect.any(String),
      {
        username: "jdupont",
        email: "jdupont@test.com",
        profile: "profile.bo.autonome-set-admin",
        status: "active",
      }
    );
    vi.useRealTimers();
  });

  it("handles agence edit, status toggle, and delete", async () => {
    const agencesService = await import("@/features/agences/services/agencesService");
    const mockAgence = {
      id: "ag-1",
      name: "Agence Test",
      code: "AGC1",
      is_active: true,
      parent_id: "distrib-123",
      parent_type: "DISTRIBUTOR",
    } as AgenceRead;

    const { result } = renderHook(() => useDistributeurDetail());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Test openEditAgence
    await act(async () => {
      await result.current.openEditAgence(mockAgence);
    });

    expect(result.current.editingAgence).toEqual(mockAgence);
    expect(result.current.agenceForm.name).toBe("Agence Test");
    expect(result.current.agenceForm.code).toBe("AGC1");
    expect(result.current.agenceDialogOpen).toBe(true);

    // Test confirmToggleAgenceStatus and handleToggleAgenceStatus
    act(() => {
      result.current.confirmToggleAgenceStatus(mockAgence);
    });
    expect(result.current.togglingAgence).toEqual(mockAgence);
    expect(result.current.agenceStatusDialogOpen).toBe(true);

    vi.mocked(agencesService.toggleAgenceStatus).mockResolvedValue({
      ...mockAgence,
      is_active: false,
    });

    await act(async () => {
      await result.current.handleToggleAgenceStatus();
    });

    expect(agencesService.toggleAgenceStatus).toHaveBeenCalledWith("ag-1", false);
    expect(result.current.agenceStatusDialogOpen).toBe(false);
    expect(result.current.togglingAgence).toBeNull();

    // Test confirmDeleteAgence and handleDeleteAgence
    act(() => {
      result.current.confirmDeleteAgence(mockAgence);
    });
    expect(result.current.deletingAgence).toEqual(mockAgence);
    expect(result.current.agenceDeleteDialogOpen).toBe(true);

    vi.mocked(agencesService.deleteAgence).mockResolvedValue(undefined);

    await act(async () => {
      await result.current.handleDeleteAgence();
    });

    expect(agencesService.deleteAgence).toHaveBeenCalledWith("ag-1");
    expect(result.current.agenceDeleteDialogOpen).toBe(false);
    expect(result.current.deletingAgence).toBeNull();
  });

  it("handles caisse creation dialog", async () => {
    const { result } = renderHook(() => useDistributeurDetail());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.openAddCaisse();
    });

    expect(result.current.editingCaisse).toBeNull();
    expect(result.current.caisseDialogOpen).toBe(true);
    expect(result.current.caisseForm.name).toBe("");
  });
});
