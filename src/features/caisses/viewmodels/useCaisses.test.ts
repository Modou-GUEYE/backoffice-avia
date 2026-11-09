import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useCaisses, validateCaisseForm, validateCaisseNameCode } from "./useCaisses";
import * as caissesService from "../services/caissesService";
import * as agencesService from "@/features/agences/services/agencesService";

vi.mock("../services/caissesService", () => ({
  fetchCaisses: vi.fn(),
  activateCaisse: vi.fn(),
  deactivateCaisse: vi.fn(),
  deleteCaisse: vi.fn(),
  createCaisse: vi.fn(),
  updateCaisse: vi.fn(),
  hasCaisseDuplicate: vi.fn(),
}));

vi.mock("@/features/agences/services/agencesService", () => ({
  fetchAgences: vi.fn(),
}));

vi.mock("@/core/permissions/permissions", () => ({
  can: () => true,
}));

vi.mock("@/core/security/useCurrentActor", () => ({
  useCurrentActor: () => ({
    currentActorRole: "Admin",
    entityContext: "Administration",
    currentPermissions: [],
  }),
}));

describe("useCaisses", () => {
  const mockCaisses = Object.assign(
    [
      { id: "c1", name: "Caisse 1", code: "C01", agency_id: "a1", is_active: true, is_deleted: false },
      { id: "c2", name: "Caisse 2", code: "C02", agency_id: "a2", is_active: false, is_deleted: false },
    ],
    {
      items: [
        { id: "c1", name: "Caisse 1", code: "C01", agency_id: "a1", is_active: true, is_deleted: false },
        { id: "c2", name: "Caisse 2", code: "C02", agency_id: "a2", is_active: false, is_deleted: false },
      ],
      total: 2,
      summary: { total: 2, actifs: 1, inactifs: 1 },
    }
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(caissesService.fetchCaisses).mockResolvedValue(
      mockCaisses as unknown as Awaited<ReturnType<typeof caissesService.fetchCaisses>>,
    );
    vi.mocked(agencesService.fetchAgences).mockResolvedValue([
      { id: "a1", name: "Agence Dakar", is_deleted: false },
    ] as unknown as Awaited<ReturnType<typeof agencesService.fetchAgences>>);
  });

  it("loads caisses and agencies in parallel on mount", async () => {
    const { result } = renderHook(() => useCaisses());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.caisses.length).toBe(2);
    expect(result.current.summary).toEqual({ total: 2, actifs: 1, inactifs: 1 });
    expect(agencesService.fetchAgences).toHaveBeenCalledTimes(1);
  });

  it("resolves agency label using loaded agencies", async () => {
    const { result } = renderHook(() => useCaisses());

    await waitFor(() => {
      expect(result.current.resolveAgencyLabel("a1")).toBe("Agence Dakar");
    });

    expect(result.current.resolveAgencyLabel("unknown")).toBeUndefined();
  });

  it("updates filter and calls fetchCaisses with debounce", async () => {
    const { result } = renderHook(() => useCaisses());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSearch("C01");
    });

    await waitFor(() => {
      expect(caissesService.fetchCaisses).toHaveBeenCalledWith(
        expect.objectContaining({ search: "C01" })
      );
    });
  });
});

describe("validateCaisseForm", () => {
  const validForm = { name: "Caisse Principale", code: "CSS001", agency_id: "a1" };

  it("returns no error for a complete form", () => {
    expect(validateCaisseForm(validForm)).toEqual({});
  });

  it("returns every missing required field at once", () => {
    expect(validateCaisseForm({ name: " ", code: null, agency_id: "" })).toEqual({
      agency_id: "L'agence de rattachement est obligatoire",
      name: "Le nom de la caisse est obligatoire",
      code: "Le code de la caisse est obligatoire",
    });
  });

  it("checks name and code lengths after trimming", () => {
    expect(validateCaisseForm({ ...validForm, name: " A ", code: "C" })).toEqual({
      name: "Le nom de la caisse doit contenir entre 2 et 255 caractères",
      code: "Le code de la caisse doit contenir entre 2 et 50 caractères",
    });
    expect(validateCaisseForm({ ...validForm, name: "N".repeat(256), code: "C".repeat(51) })).toEqual({
      name: "Le nom de la caisse doit contenir entre 2 et 255 caractères",
      code: "Le code de la caisse doit contenir entre 2 et 50 caractères",
    });
    expect(validateCaisseForm({ ...validForm, name: "N".repeat(255), code: "C".repeat(50) })).toEqual({});
  });
});

describe("validateCaisseNameCode", () => {
  it("validates only the name and the code", () => {
    expect(validateCaisseNameCode("Caisse 1", "CSS001")).toEqual({});
    expect(validateCaisseNameCode("", "")).toEqual({
      name: "Le nom de la caisse est obligatoire",
      code: "Le code de la caisse est obligatoire",
    });
  });
});

describe("useCaisses form errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(caissesService.fetchCaisses).mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof caissesService.fetchCaisses>>,
    );
    vi.mocked(agencesService.fetchAgences).mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof agencesService.fetchAgences>>,
    );
  });

  it("shows field errors instead of saving when required fields are empty, and resets them on close", async () => {
    const { result } = renderHook(() => useCaisses());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.openAdd());
    await act(async () => {
      await result.current.handleSave();
    });

    expect(caissesService.createCaisse).not.toHaveBeenCalled();
    expect(result.current.formErrors).toEqual({
      agency_id: "L'agence de rattachement est obligatoire",
      name: "Le nom de la caisse est obligatoire",
      code: "Le code de la caisse est obligatoire",
    });

    act(() => result.current.clearFormError("name"));
    expect(result.current.formErrors.name).toBeUndefined();

    act(() => result.current.setDialogOpen(false));
    expect(result.current.formErrors).toEqual({});
  });
});
