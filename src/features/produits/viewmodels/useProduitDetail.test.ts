import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useProduitDetail } from "./useProduitDetail";
import * as produitsService from "../services/produitsService";
import * as accessSecurityService from "@/core/security/accessSecurityService";

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "test-prod-id" }),
}));

vi.mock("../services/produitsService", () => ({
  fetchProduitById: vi.fn(),
  fetchProductStructures: vi.fn(),
}));

vi.mock("@/core/security/accessSecurityService", () => ({
  listHierarchyMembers: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("useProduitDetail", () => {
  const mockProduct = {
    id: "test-prod-id",
    nom: "Test Product",
    code: "TP01",
    statut: "active" as const,
    dateCreation: "2026-01-01",
    structuresAssociees: [],
    utilisateurs: [],
    libelleExpediteur: "TEST",
    mediaUrl: "https://example.com/logo.png",
    media_url: "https://example.com/logo.png",
  };

  const mockStructures = [
    {
      id: "struct-1",
      name: "Structure 1",
      code: "S1",
      type: "BANQUE",
      is_active: true,
    },
  ];

  const mockUsers = [
    {
      user_id: "user-1",
      username: "john.doe",
      email: "john@example.com",
      first_name: "John",
      last_name: "Doe",
      profiles: ["ADMIN"],
      active: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(produitsService.fetchProduitById).mockResolvedValue(mockProduct);
    vi.mocked(produitsService.fetchProductStructures).mockResolvedValue(
      mockStructures as unknown as Awaited<ReturnType<typeof produitsService.fetchProductStructures>>,
    );
    vi.mocked(accessSecurityService.listHierarchyMembers).mockResolvedValue({
      ref_type: "PRODUCT",
      ref_id: "test-prod-id",
      users: mockUsers,
    } as unknown as Awaited<ReturnType<typeof accessSecurityService.listHierarchyMembers>>);
  });

  it("loads ONLY product details initially, and does not call structures or users endpoints", async () => {
    const { result } = renderHook(() => useProduitDetail());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Main product loaded
    expect(produitsService.fetchProduitById).toHaveBeenCalledWith("test-prod-id");
    expect(result.current.produit).toEqual(mockProduct);

    // Neither structures nor users were called on initial load
    expect(produitsService.fetchProductStructures).not.toHaveBeenCalled();
    expect(accessSecurityService.listHierarchyMembers).not.toHaveBeenCalled();
    expect(result.current.structures).toEqual([]);
    expect(result.current.utilisateurs).toEqual([]);
  });

  it("calls fetchProductStructures only when the structures tab is clicked", async () => {
    const { result } = renderHook(() => useProduitDetail());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(produitsService.fetchProductStructures).not.toHaveBeenCalled();

    // Click structures tab
    await act(async () => {
      result.current.handleTabChange("structures");
    });

    await waitFor(() => {
      expect(result.current.structuresLoading).toBe(false);
    });

    expect(produitsService.fetchProductStructures).toHaveBeenCalledTimes(1);
    expect(produitsService.fetchProductStructures).toHaveBeenCalledWith("test-prod-id", {
      skip: 0,
      limit: 100,
    });
    expect(result.current.structures).toEqual(mockStructures);
    expect(accessSecurityService.listHierarchyMembers).not.toHaveBeenCalled();
  });

  it("calls listHierarchyMembers only when the utilisateurs tab is clicked", async () => {
    const { result } = renderHook(() => useProduitDetail());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(accessSecurityService.listHierarchyMembers).not.toHaveBeenCalled();

    // Click utilisateurs tab
    await act(async () => {
      result.current.handleTabChange("utilisateurs");
    });

    await waitFor(() => {
      expect(result.current.utilisateursLoading).toBe(false);
    });

    expect(accessSecurityService.listHierarchyMembers).toHaveBeenCalledTimes(1);
    expect(accessSecurityService.listHierarchyMembers).toHaveBeenCalledWith(
      "PRODUCT",
      "test-prod-id",
      expect.any(String),
    );
    expect(result.current.utilisateurs).toEqual(mockUsers);
    expect(produitsService.fetchProductStructures).not.toHaveBeenCalled();
  });

  it("passes search and is_active filters to fetchProductStructures", async () => {
    const { result } = renderHook(() => useProduitDetail());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Switch to structures tab
    await act(async () => {
      result.current.handleTabChange("structures");
    });

    await waitFor(() => {
      expect(result.current.structuresLoading).toBe(false);
    });

    expect(produitsService.fetchProductStructures).toHaveBeenCalledWith("test-prod-id", {
      skip: 0,
      limit: 100,
    });

    // Set search and status filter
    await act(async () => {
      result.current.setStructureSearch("Banque");
      result.current.setStructureStatusFilter("active");
    });

    // Wait for debounce timeout
    await waitFor(
      () => {
        expect(produitsService.fetchProductStructures).toHaveBeenCalledWith("test-prod-id", {
          skip: 0,
          limit: 100,
          search: "Banque",
          is_active: true,
        });
      },
      { timeout: 1000 },
    );
  });

  it("passes username, email, profile, and status filters to listHierarchyMembers", async () => {
    const { result } = renderHook(() => useProduitDetail());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Switch to utilisateurs tab
    await act(async () => {
      result.current.handleTabChange("utilisateurs");
    });

    await waitFor(() => {
      expect(result.current.utilisateursLoading).toBe(false);
    });

    expect(accessSecurityService.listHierarchyMembers).toHaveBeenCalledWith(
      "PRODUCT",
      "test-prod-id",
      expect.any(String),
    );

    // Set utilisateur filters
    await act(async () => {
      result.current.setUtilisateurUsername("john");
      result.current.setUtilisateurEmail("john@example.com");
      result.current.setUtilisateurProfile("profile.bo.produit-central");
      result.current.setUtilisateurStatus("active");
    });

    // Wait for debounce timeout
    await waitFor(
      () => {
        expect(accessSecurityService.listHierarchyMembers).toHaveBeenCalledWith(
          "PRODUCT",
          "test-prod-id",
          expect.any(String),
          {
            username: "john",
            email: "john@example.com",
            profile: "profile.bo.produit-central",
            status: "active",
          },
        );
      },
      { timeout: 1000 },
    );
  });
});


