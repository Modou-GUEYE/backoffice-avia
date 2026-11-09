import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useStructures,
  validateStructureDetailUserForm,
  validateStructureForm,
  validateStructureUserForm,
} from "./useStructures";
import * as structuresService from "../services/structuresService";
import * as agencesService from "@/features/agences/services/agencesService";

vi.mock("../services/structuresService", () => ({
  fetchStructures: vi.fn(),
  createStructure: vi.fn(),
  updateStructure: vi.fn(),
  deleteStructure: vi.fn(),
  toggleStructureStatus: vi.fn(),
  archiveStructure: vi.fn(),
  extractStructuresList: vi.fn((d) => d || []),
}));

vi.mock("@/features/agences/services/agencesService", () => ({
  fetchAgences: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/core/security/useCurrentActor", () => ({
  useCurrentActor: () => ({
    currentActorRole: "ADMIN",
    currentPermissions: ["STRUCTURE_READ", "STRUCTURE_CREATE", "STRUCTURE_UPDATE", "STRUCTURE_DELETE"],
  }),
}));

vi.mock("@/core/permissions/permissions", () => ({
  can: () => true,
}));

vi.mock("@/core/security/accessSecurityService", () => ({
  listClientCompositeRoles: vi.fn().mockResolvedValue([]),
  listHierarchyMembers: vi.fn().mockResolvedValue({ users: [] }),
  createBackofficeUser: vi.fn(),
  importBackofficeUsers: vi.fn(),
  requestAccessSecurityPasswordReset: vi.fn(),
  updateAccessSecurityUser: vi.fn(),
}));

vi.mock("@/features/parametres/services/packagesService", () => ({
  fetchPackages: vi.fn().mockResolvedValue([]),
  assignPackageToStructure: vi.fn(),
  changeStructurePackage: vi.fn(),
}));

vi.mock("@/core/theme/ThemeContext", () => ({
  useTheme: () => ({ saveBranding: vi.fn() }),
  DEFAULT_BRANDING_COLORS: {},
}));

type FetchStructuresResult = Awaited<ReturnType<typeof structuresService.fetchStructures>>;
type CreateStructureResult = Awaited<ReturnType<typeof structuresService.createStructure>>;

describe("useStructures hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads structures using fetchStructures and sets total and summary", async () => {
    const mockData = Object.assign(
      [{ id: "s-1", code: "S01", name: "Structure 1", is_active: true }],
      {
        items: [{ id: "s-1", code: "S01", name: "Structure 1", is_active: true }],
        total: 1,
        summary: { total: 1, actifs: 1, inactifs: 0 },
      }
    );

    vi.mocked(structuresService.fetchStructures).mockResolvedValueOnce(mockData as unknown as FetchStructuresResult);

    const { result } = renderHook(() => useStructures());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(structuresService.fetchStructures).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        limit: 100,
        include_inactive: true,
      })
    );
    expect(result.current.structures).toHaveLength(1);
    expect(result.current.total).toBe(1);
    expect(result.current.summary).toEqual({ total: 1, actifs: 1, inactifs: 0 });
  });

  it("calls deleteStructure when handleDelete is triggered", async () => {
    const mockData = Object.assign(
      [{ id: "s-1", code: "S01", name: "Structure 1", is_active: true }],
      {
        items: [{ id: "s-1", code: "S01", name: "Structure 1", is_active: true }],
        total: 1,
        summary: { total: 1, actifs: 1, inactifs: 0 },
      }
    );

    vi.mocked(structuresService.fetchStructures).mockResolvedValue(mockData as unknown as FetchStructuresResult);
    vi.mocked(structuresService.deleteStructure).mockImplementation(async () => {
      vi.mocked(structuresService.fetchStructures).mockResolvedValue({
        items: [],
        total: 0,
        summary: { total: 0, actifs: 0, inactifs: 0 },
      } as unknown as FetchStructuresResult);
    });

    const { result } = renderHook(() => useStructures());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setDeletingStructure(result.current.structures[0]);
    });

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(structuresService.deleteStructure).toHaveBeenCalledWith("s-1");
    expect(result.current.structures).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it("does not call user endpoints when creating a structure with an empty user tab", async () => {
    vi.mocked(structuresService.fetchStructures).mockResolvedValue({
      items: [],
      total: 0,
      summary: { total: 0, actifs: 0, inactifs: 0 },
    } as unknown as FetchStructuresResult);

    vi.mocked(structuresService.createStructure).mockResolvedValue({
      id: "struct-new-1",
      name: "Nouvelle Structure",
      code: "STR-1",
      type: "IMF",
      address: "Dakar",
      is_active: true,
      media_url: "http://storage/logo.png",
      utilisateurs: [],
      is_deleted: false,
    } as unknown as CreateStructureResult);

    const { result } = renderHook(() => useStructures());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      result.current.openAdd();
    });

    act(() => {
      result.current.setForm((prev) => ({
        ...prev,
        name: "Nouvelle Structure",
        type: "IMF",
        address: "Dakar",
        produitId: "prod-uuid-1",
        ajouterProduit: true,
      }));
    });

    const accessSecurity = await import("@/core/security/accessSecurityService");
    vi.mocked(accessSecurity.listHierarchyMembers).mockClear();
    vi.mocked(accessSecurity.createBackofficeUser).mockClear();

    await act(async () => {
      await result.current.handleSave();
    });

    expect(structuresService.createStructure).toHaveBeenCalled();
    expect(accessSecurity.listHierarchyMembers).not.toHaveBeenCalled();
    expect(accessSecurity.createBackofficeUser).not.toHaveBeenCalled();
  });
});

describe("validateStructureForm", () => {
  const validForm = { name: "Ma Banque", type: "BANK", address: "Sénégal", produitId: "prod-1", ajouterProduit: true };

  it("returns no error for a complete form", () => {
    expect(validateStructureForm(validForm, false)).toEqual({});
  });

  it("returns every missing required field at once", () => {
    expect(
      validateStructureForm({ name: "  ", type: "", address: "", produitId: "", ajouterProduit: false }, false),
    ).toEqual({
      name: "Le nom est obligatoire",
      type: "Le type est obligatoire",
      address: "Le pays est obligatoire",
      produitId: "Le produit est obligatoire",
    });
  });

  it("requires the product on creation even if the product toggle is off", () => {
    expect(validateStructureForm({ ...validForm, produitId: "", ajouterProduit: false }, false)).toEqual({
      produitId: "Le produit est obligatoire",
    });
  });

  it("does not require the product when editing a structure whose product was removed", () => {
    expect(validateStructureForm({ ...validForm, produitId: "", ajouterProduit: false }, true)).toEqual({});
  });

  it("requires the product when editing with the product toggle on", () => {
    expect(validateStructureForm({ ...validForm, produitId: "" }, true)).toEqual({
      produitId: "Le produit est obligatoire",
    });
  });
});

describe("validateStructureUserForm", () => {
  const validUser = { prenom: "Jean", nom: "Dupont", username: "j.dupont", email: "jean@test.com", profil: "profile.bo.structure-admin" };

  it("returns no error for a complete user", () => {
    expect(validateStructureUserForm(validUser)).toEqual({});
  });

  it("returns every missing required field at once", () => {
    expect(validateStructureUserForm({ prenom: "", nom: " ", username: "", email: "", profil: "" })).toEqual({
      prenom: "Le prénom est obligatoire",
      nom: "Le nom est obligatoire",
      username: "Le login est obligatoire",
      email: "L'e-mail est obligatoire",
      profil: "Le profil est obligatoire",
    });
  });

  it("rejects an invalid e-mail address", () => {
    expect(validateStructureUserForm({ ...validUser, email: "jean@test" })).toEqual({
      email: "L'adresse e-mail n'est pas valide",
    });
  });
});

describe("validateStructureDetailUserForm", () => {
  it("maps errors onto the detail dialog field names", () => {
    const errors = validateStructureDetailUserForm({
      firstName: "",
      lastName: "Dupont",
      username: "",
      email: "pas-un-email",
      profile: "",
    });

    expect(errors.firstName).toBe("Le prénom est obligatoire");
    expect(errors.lastName).toBeUndefined();
    expect(errors.username).toBe("Le login est obligatoire");
    expect(errors.email).toBe("L'adresse e-mail n'est pas valide");
    expect(errors.profile).toBe("Le profil est obligatoire");
  });
});

describe("useStructures form errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(structuresService.fetchStructures).mockResolvedValue({
      items: [],
      total: 0,
      summary: { total: 0, actifs: 0, inactifs: 0 },
    } as never);
  });

  it("shows field errors instead of saving when required fields are empty, and resets them on close", async () => {
    const { result } = renderHook(() => useStructures());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.openAdd();
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(structuresService.createStructure).not.toHaveBeenCalled();
    expect(result.current.formErrors).toMatchObject({
      name: "Le nom est obligatoire",
      type: "Le type est obligatoire",
      address: "Le pays est obligatoire",
    });

    act(() => result.current.clearFormError("name"));
    expect(result.current.formErrors.name).toBeUndefined();
    expect(result.current.formErrors.type).toBe("Le type est obligatoire");

    act(() => result.current.setDialogOpen(false));
    expect(result.current.formErrors).toEqual({});
  });

  it("shows user field errors instead of adding an incomplete user", async () => {
    const { result } = renderHook(() => useStructures());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.openAddUserForm());
    act(() => result.current.setUserForm((prev) => ({ ...prev, prenom: "Jean", nom: "Dupont", email: "jean@", profil: "profile.bo.structure-admin" })));
    act(() => result.current.addUser());

    expect(result.current.users).toHaveLength(0);
    expect(result.current.userFormErrors).toEqual({ email: "L'adresse e-mail n'est pas valide" });

    act(() => result.current.cancelUserForm());
    expect(result.current.userFormErrors).toEqual({});
  });
});
