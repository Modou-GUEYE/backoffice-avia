import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuthStore } from "@/core/security/authStore";
import * as service from "../services/relevesService";
import { useReleves, validateGenerateForm } from "./useReleves";
import type { Releve } from "../models/types";

vi.mock("../services/relevesService", () => ({
  fetchReleves: vi.fn(),
  generateReleve: vi.fn(),
}));
vi.mock("@/features/structures/services/structuresService", () => ({
  fetchStructures: vi.fn().mockResolvedValue([{ id: "s-2", name: "BCI" }, { id: "s-1", name: "ALPHA" }]),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const releve = { id: "rel-1", structure: "ALPHA", annee: 2026, mois: 9 } as Releve;

describe("validateGenerateForm", () => {
  it("exige la structure, l'année et le mois", () => {
    expect(validateGenerateForm({ structure: "", annee: "", mois: "" })).toEqual({
      structure: "La structure est obligatoire",
      annee: "L'année est obligatoire",
      mois: "Le mois est obligatoire",
    });
  });

  it("refuse un mois hors 1-12", () => {
    expect(validateGenerateForm({ structure: "ALPHA", annee: "2026", mois: "13" })).toEqual({ mois: "Mois invalide" });
  });
});

describe("useReleves", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(service.fetchReleves).mockResolvedValue({ total: 1, skip: 0, limit: 20, items: [releve] });
  });

  it("administrateur back-office : liste sans structure imposée et structures proposées par identifiant, triées par nom", async () => {
    useAuthStore.setState({
      user: { email: "admin@example.com", role: "Administrateur", entityContext: "Administration", permissions: ["profile.bo-admin"] },
    });
    const { result } = renderHook(() => useReleves());

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(vi.mocked(service.fetchReleves).mock.calls[0][0].structure).toBeUndefined();
    await waitFor(() =>
      expect(result.current.structureOptions).toEqual([
        { id: "s-1", name: "ALPHA" },
        { id: "s-2", name: "BCI" },
      ]),
    );
    expect(result.current.canGenerate).toBe(true);
    expect(result.current.getStructureName("s-2")).toBe("BCI");
    expect(result.current.getStructureName("inconnue")).toBe("inconnue");
  });

  it("administrateur de structure : sa structure (identifiant du jeton) est imposée dans la liste et à la génération", async () => {
    useAuthStore.setState({
      user: {
        email: "admin@alpha.sn",
        role: "Administrateur",
        entityContext: "Structure",
        institutionId: "s-1",
        institutionLabel: "ALPHA",
        permissions: ["perm.bo.releve.list", "perm.bo.releve.generate"],
      },
    });
    vi.mocked(service.generateReleve).mockResolvedValue(releve);
    const { result } = renderHook(() => useReleves());

    await waitFor(() => expect(service.fetchReleves).toHaveBeenCalledWith(expect.objectContaining({ structure: "s-1" })));
    expect(result.current.enforcedStructureLabel).toBe("ALPHA");
    expect(result.current.canRead).toBe(false);

    act(() => result.current.openGenerate());
    act(() => result.current.updateGenerateField("structure", "BCI"));
    act(() => result.current.updateGenerateField("mois", "9"));
    act(() => result.current.updateGenerateField("annee", "2026"));
    await act(async () => {
      await result.current.submitGenerate();
    });

    expect(service.generateReleve).toHaveBeenCalledWith({ structure_id: "s-1", annee: 2026, mois: 9 });
  });

  it("sans permission de génération, le bouton n'est pas proposé", async () => {
    useAuthStore.setState({
      user: { email: "lecteur@example.com", role: "Administrateur", entityContext: "Administration", permissions: ["perm.bo.releve.list"] },
    });
    const { result } = renderHook(() => useReleves());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canGenerate).toBe(false);
  });
});
