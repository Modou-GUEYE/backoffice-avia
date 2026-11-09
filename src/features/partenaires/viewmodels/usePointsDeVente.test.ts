import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import * as service from "../services/partenairesService";
import type { PointDeVente } from "../models/types";
import { usePointsDeVente, validatePointDeVenteForm, emptyPointDeVenteForm } from "./usePointsDeVente";

vi.mock("../services/partenairesService", () => ({
  fetchPointsDeVente: vi.fn(),
  createPointDeVente: vi.fn(),
  updatePointDeVente: vi.fn(),
  deletePointDeVente: vi.fn(),
  togglePointDeVenteStatus: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const pdv = (overrides: Partial<PointDeVente> = {}): PointDeVente => ({
  id: "pdv-1",
  name: "Boutique Plateau",
  libelle: "Boutique Plateau",
  code: "PDV-01",
  adresse: "Dakar",
  telephone: "770000000",
  partnerId: "partner-1",
  statut: "actif",
  ...overrides,
});

describe("validatePointDeVenteForm", () => {
  it("exige le libellé", () => {
    expect(validatePointDeVenteForm(emptyPointDeVenteForm)).toEqual({ libelle: "Le libellé est obligatoire" });
  });

  it("applique les longueurs du contrat (libellé 2-255, code 2-50)", () => {
    expect(validatePointDeVenteForm({ ...emptyPointDeVenteForm, libelle: "A", code: "X" })).toEqual({
      libelle: "Le libellé doit contenir entre 2 et 255 caractères",
      code: "Le code doit contenir entre 2 et 50 caractères",
    });
  });

  it("accepte un formulaire valide avec les champs optionnels vides", () => {
    expect(validatePointDeVenteForm({ ...emptyPointDeVenteForm, libelle: "Boutique" })).toEqual({});
  });
});

describe("usePointsDeVente", () => {
  const initial = [pdv()];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("n'appelle pas l'API et affiche les erreurs si le formulaire est invalide", async () => {
    const { result } = renderHook(() => usePointsDeVente("partner-1", initial));
    act(() => result.current.openCreate());
    await act(async () => {
      await result.current.save();
    });
    expect(service.createPointDeVente).not.toHaveBeenCalled();
    expect(result.current.formErrors.libelle).toBe("Le libellé est obligatoire");

    act(() => result.current.updateField("libelle", "Bo"));
    expect(result.current.formErrors.libelle).toBeUndefined();
  });

  it("crée un point de vente et l'ajoute en tête de liste", async () => {
    vi.mocked(service.createPointDeVente).mockResolvedValue(pdv({ id: "pdv-2", libelle: "Boutique Almadies" }));
    const { result } = renderHook(() => usePointsDeVente("partner-1", initial));

    act(() => result.current.openCreate());
    act(() => result.current.updateField("libelle", "Boutique Almadies"));
    await act(async () => {
      await result.current.save();
    });

    expect(service.createPointDeVente).toHaveBeenCalledWith(
      "partner-1",
      expect.objectContaining({ libelle: "Boutique Almadies", name: "Boutique Almadies", partner_id: "partner-1" }),
    );
    expect(result.current.items.map((item) => item.id)).toEqual(["pdv-2", "pdv-1"]);
    expect(result.current.dialogOpen).toBe(false);
  });

  it("modifie un point de vente existant", async () => {
    vi.mocked(service.updatePointDeVente).mockResolvedValue(pdv({ libelle: "Boutique Rénovée" }));
    const { result } = renderHook(() => usePointsDeVente("partner-1", initial));

    act(() => result.current.openEdit(initial[0]));
    expect(result.current.form.libelle).toBe("Boutique Plateau");
    act(() => result.current.updateField("libelle", "Boutique Rénovée"));
    await act(async () => {
      await result.current.save();
    });

    expect(service.updatePointDeVente).toHaveBeenCalledWith(
      "partner-1",
      "pdv-1",
      expect.objectContaining({ libelle: "Boutique Rénovée" }),
    );
    expect(result.current.items[0].libelle).toBe("Boutique Rénovée");
  });

  it("désactive puis supprime un point de vente", async () => {
    vi.mocked(service.togglePointDeVenteStatus).mockResolvedValue(pdv({ statut: "inactif" }));
    vi.mocked(service.deletePointDeVente).mockResolvedValue(undefined);
    const { result } = renderHook(() => usePointsDeVente("partner-1", initial));

    await act(async () => {
      await result.current.toggleActive(initial[0]);
    });
    expect(service.togglePointDeVenteStatus).toHaveBeenCalledWith("partner-1", "pdv-1", false);
    expect(service.updatePointDeVente).not.toHaveBeenCalled();
    expect(result.current.items[0].statut).toBe("inactif");

    act(() => result.current.setToDelete(result.current.items[0]));
    await act(async () => {
      await result.current.confirmDelete();
    });
    expect(service.deletePointDeVente).toHaveBeenCalledWith("partner-1", "pdv-1");
    expect(result.current.items).toEqual([]);
  });

  it("filtre par recherche et par statut", () => {
    const items = [pdv(), pdv({ id: "pdv-2", libelle: "Kiosque Yoff", code: "K-02", statut: "inactif" })];
    const { result } = renderHook(() => usePointsDeVente("partner-1", items));
    act(() => result.current.setSearch("kiosque"));
    expect(result.current.filteredItems.map((item) => item.id)).toEqual(["pdv-2"]);
    act(() => {
      result.current.setSearch("");
      result.current.setStatusFilter("actif");
    });
    expect(result.current.filteredItems.map((item) => item.id)).toEqual(["pdv-1"]);
  });
});
