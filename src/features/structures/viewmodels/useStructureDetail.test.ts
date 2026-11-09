import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useStructureDetail } from "./useStructureDetail";
import * as structuresService from "../services/structuresService";
import * as accessSecurityService from "@/core/security/accessSecurityService";

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "struct-123" }),
}));

vi.mock("../services/structuresService", () => ({
  fetchStructureById: vi.fn(),
  updateStructure: vi.fn(),
  fetchStructureAgencies: vi.fn(),
  fetchStructureCaisses: vi.fn(),
  fetchStructureDistributors: vi.fn(),
}));

vi.mock("@/core/security/accessSecurityService", () => ({
  listHierarchyMembers: vi.fn(),
}));

vi.mock("@/core/network/httpClient", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock("@/features/parametres/services/packagesService", () => ({
  fetchPackages: vi.fn().mockResolvedValue([]),
  assignPackageToStructure: vi.fn(),
  changeStructurePackage: vi.fn(),
  fetchStructureActivePackage: vi.fn().mockResolvedValue(null),
  suspendStructurePackage: vi.fn(),
  resumeStructurePackage: vi.fn(),
  terminateStructurePackage: vi.fn(),
}));

vi.mock("@/core/theme/ThemeContext", () => ({
  useTheme: () => ({
    allBrandings: [],
    saveBranding: vi.fn(),
  }),
}));

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

describe("useStructureDetail", () => {
  const mockStructure = {
    id: "struct-123",
    name: "Structure Alpha",
    code: "SA01",
    type: "IMF",
    address: "Sénégal",
    is_active: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(structuresService.fetchStructureById).mockResolvedValue(
      mockStructure as unknown as Awaited<ReturnType<typeof structuresService.fetchStructureById>>,
    );
    vi.mocked(structuresService.fetchStructureAgencies).mockResolvedValue([
      { id: "ag-1", code: "AG01", name: "Agence 1", is_active: true },
    ] as unknown as Awaited<ReturnType<typeof structuresService.fetchStructureAgencies>>);
    vi.mocked(structuresService.fetchStructureCaisses).mockResolvedValue([
      { id: "cs-1", code: "CS01", name: "Caisse 1", is_active: true },
    ] as unknown as Awaited<ReturnType<typeof structuresService.fetchStructureCaisses>>);
    vi.mocked(structuresService.fetchStructureDistributors).mockResolvedValue([]);
    vi.mocked(accessSecurityService.listHierarchyMembers).mockResolvedValue({
      users: [
        { user_id: "u-1", username: "user.alpha", email: "alpha@test.com", active: true },
      ],
    } as unknown as Awaited<ReturnType<typeof accessSecurityService.listHierarchyMembers>>);
  });

  it("loads ONLY structure details on initial load and does NOT call sub-resources endpoints", async () => {
    const { result } = renderHook(() => useStructureDetail());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Structure fetched
    expect(structuresService.fetchStructureById).toHaveBeenCalledWith("struct-123");
    expect(result.current.structure).toEqual(mockStructure);

    // Sub-resources NOT called initially
    expect(structuresService.fetchStructureAgencies).not.toHaveBeenCalled();
    expect(structuresService.fetchStructureCaisses).not.toHaveBeenCalled();
    expect(structuresService.fetchStructureDistributors).not.toHaveBeenCalled();
    expect(accessSecurityService.listHierarchyMembers).not.toHaveBeenCalled();

    expect(result.current.agences).toEqual([]);
    expect(result.current.caisses).toEqual([]);
    expect(result.current.ensembles).toEqual([]);
    expect(result.current.utilisateurs).toEqual([]);
  });

  it("calls fetchStructureAgencies only when switching to 'agences' tab", async () => {
    const { result } = renderHook(() => useStructureDetail());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(structuresService.fetchStructureAgencies).not.toHaveBeenCalled();

    act(() => {
      result.current.handleTabChange("agences");
    });

    await waitFor(() => {
      expect(structuresService.fetchStructureAgencies).toHaveBeenCalledWith("struct-123", {
        skip: 0,
        limit: 100,
        search: undefined,
        is_active: undefined,
      });
    });

    expect(structuresService.fetchStructureAgencies).toHaveBeenCalledTimes(1);
    expect(result.current.agences).toHaveLength(1);
    expect(result.current.agences[0].name).toBe("Agence 1");
  });

  it("calls fetchStructureCaisses only once when switching to 'caisses' tab", async () => {
    const { result } = renderHook(() => useStructureDetail());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(structuresService.fetchStructureCaisses).not.toHaveBeenCalled();

    act(() => {
      result.current.handleTabChange("caisses");
    });

    await waitFor(() => {
      expect(structuresService.fetchStructureCaisses).toHaveBeenCalledWith("struct-123", {
        skip: 0,
        limit: 100,
        search: undefined,
        is_active: undefined,
      });
    });

    await waitFor(() => {
      expect(result.current.caisses).toHaveLength(1);
      expect(result.current.caisses[0].name).toBe("Caisse 1");
    });
  });

  it("calls listHierarchyMembers only once when switching to 'utilisateurs' tab", async () => {
    const { result } = renderHook(() => useStructureDetail());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(accessSecurityService.listHierarchyMembers).not.toHaveBeenCalled();

    act(() => {
      result.current.handleTabChange("utilisateurs");
    });

    await waitFor(() => {
      expect(accessSecurityService.listHierarchyMembers).toHaveBeenCalledWith(
        "STRUCTURE",
        "struct-123",
        expect.any(String)
      );
    });

    expect(accessSecurityService.listHierarchyMembers).toHaveBeenCalledTimes(1);
    expect(result.current.utilisateurs).toHaveLength(1);
    expect(result.current.utilisateurs[0].username).toBe("user.alpha");
  });
});
