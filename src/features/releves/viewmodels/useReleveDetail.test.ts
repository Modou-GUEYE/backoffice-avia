import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuthStore } from "@/core/security/authStore";
import * as service from "../services/relevesService";
import { emptyCorrectionForm, useReleveDetail, validateCorrectionForm } from "./useReleveDetail";
import type { Releve } from "../models/types";

vi.mock("../services/relevesService", () => ({
  fetchReleve: vi.fn(),
  generateReleve: vi.fn(),
  figerReleve: vi.fn(),
  createCorrection: vi.fn(),
  downloadReleveExport: vi.fn(),
  notifierReleve: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/structures/services/structuresService", () => ({
  fetchStructureById: vi.fn().mockResolvedValue({ id: "ALPHA", name: "ALPHA SA" }),
}));

const brouillon = {
  id: "rel-1",
  structure: "ALPHA",
  annee: 2026,
  mois: 12,
  statut: "brouillon",
  montant_net_a_reverser: 170,
} as Releve;
const fige = { ...brouillon, statut: "fige", fige_par: "omar.thiam" } as Releve;

describe("validateCorrectionForm", () => {
  it("exige motif et montant non nul", () => {
    expect(validateCorrectionForm({ ...emptyCorrectionForm, montant: "0" })).toEqual({
      motif: "Le motif est obligatoire",
      montant: "Le montant doit être différent de 0",
    });
  });

  it("accepte un montant négatif avec virgule et exige l'identifiant hors structure", () => {
    expect(
      validateCorrectionForm({ motif: "Régularisation", montant: "-30,5", beneficiaireType: "distributeur", beneficiaireId: "" }),
    ).toEqual({ beneficiaireId: "L'identifiant du bénéficiaire est obligatoire hors structure" });
  });
});

describe("useReleveDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        email: "omar@example.com",
        username: "omar.thiam",
        role: "Administrateur",
        entityContext: "Administration",
        permissions: ["profile.bo-admin"],
      },
    });
  });

  it("recalcule un brouillon avec sa structure et sa période, puis le fige au nom de l'utilisateur connecté", async () => {
    vi.mocked(service.fetchReleve).mockResolvedValue(brouillon);
    vi.mocked(service.generateReleve).mockResolvedValue(brouillon);
    vi.mocked(service.figerReleve).mockResolvedValue(fige);
    const { result } = renderHook(() => useReleveDetail("rel-1"));
    await waitFor(() => expect(result.current.releve).not.toBeNull());

    await act(async () => {
      await result.current.recalculate();
    });
    expect(service.generateReleve).toHaveBeenCalledWith({ structure_id: "ALPHA", annee: 2026, mois: 12 });

    await act(async () => {
      await result.current.freeze();
    });
    expect(service.figerReleve).toHaveBeenCalledWith("rel-1", "omar.thiam");
    expect(result.current.isFige).toBe(true);
  });

  it("un relevé figé ne se recalcule plus et accepte une correction reportée", async () => {
    vi.mocked(service.fetchReleve).mockResolvedValue(fige);
    vi.mocked(service.createCorrection).mockResolvedValue({ annee_cible: 2027, mois_cible: 1 } as never);
    const { result } = renderHook(() => useReleveDetail("rel-1"));
    await waitFor(() => expect(result.current.isFige).toBe(true));

    await act(async () => {
      await result.current.recalculate();
    });
    expect(service.generateReleve).not.toHaveBeenCalled();

    act(() => result.current.setCorrectionOpen(true));
    act(() => result.current.updateCorrectionField("motif", "Régularisation surtaxe"));
    act(() => result.current.updateCorrectionField("montant", "-30"));
    await act(async () => {
      await result.current.submitCorrection();
    });

    expect(service.createCorrection).toHaveBeenCalledWith("rel-1", {
      motif: "Régularisation surtaxe",
      montant: -30,
      beneficiaire_type: "structure",
      beneficiaire_id: "ALPHA",
      cree_par: "omar.thiam",
    });
    expect(result.current.correctionOpen).toBe(false);
  });

  it("n'accorde les actions qu'avec les permissions dédiées", async () => {
    useAuthStore.setState({
      user: {
        email: "lecteur@example.com",
        role: "Administrateur",
        entityContext: "Administration",
        permissions: ["perm.bo.releve.list", "perm.bo.releve.read", "perm.bo.releve.export"],
      },
    });
    vi.mocked(service.fetchReleve).mockResolvedValue(brouillon);
    const { result } = renderHook(() => useReleveDetail("rel-1"));
    await waitFor(() => expect(result.current.releve).not.toBeNull());

    expect(result.current.canRead).toBe(true);
    expect(result.current.canExport).toBe(true);
    expect(result.current.canGenerate).toBe(false);
    expect(result.current.canFreeze).toBe(false);
    expect(result.current.canCorrect).toBe(false);
    expect(result.current.canNotify).toBe(false);
  });

  it("affiche le nom de la structure trouvé par son identifiant, l'identifiant sinon", async () => {
    const { fetchStructureById } = await import("@/features/structures/services/structuresService");
    vi.mocked(service.fetchReleve).mockResolvedValue({ ...brouillon, structure: "9aef8151-56b1-4703-b336-a164bb06a39e" });
    vi.mocked(fetchStructureById).mockResolvedValueOnce({ id: "9aef8151-56b1-4703-b336-a164bb06a39e", name: "AVIA" } as never);
    const { result } = renderHook(() => useReleveDetail("rel-1"));
    await waitFor(() => expect(result.current.structureLabel).toBe("AVIA"));

    vi.mocked(fetchStructureById).mockRejectedValueOnce(new Error("404"));
    vi.mocked(service.fetchReleve).mockResolvedValue({ ...brouillon, structure: "85f38f4b-2b8f-4849-bf0e-fc3402c656e4" });
    const second = renderHook(() => useReleveDetail("rel-2"));
    await waitFor(() => expect(second.result.current.releve?.structure).toBe("85f38f4b-2b8f-4849-bf0e-fc3402c656e4"));
    expect(second.result.current.structureLabel).toBe("85f38f4b-2b8f-4849-bf0e-fc3402c656e4");

    // Valeur qui n'est pas un UUID (ancien relevé généré au nom) : pas d'appel, valeur affichée telle quelle
    vi.mocked(fetchStructureById).mockClear();
    vi.mocked(service.fetchReleve).mockResolvedValue({ ...brouillon, structure: "AVIA" });
    const third = renderHook(() => useReleveDetail("rel-3"));
    await waitFor(() => expect(third.result.current.releve?.structure).toBe("AVIA"));
    expect(third.result.current.structureLabel).toBe("AVIA");
    expect(fetchStructureById).not.toHaveBeenCalled();
  });

  it("prépare la notification sans l'envoyer et la referme", async () => {
    vi.mocked(service.fetchReleve).mockResolvedValue(fige);
    vi.mocked(service.notifierReleve).mockResolvedValue({
      releve_id: "rel-1",
      structure: "ALPHA",
      periode: "2026-12",
      objet: "Relevé mensuel",
      message: "Bonjour",
      lien_telechargement: "https://gateway/x",
    });
    const { result } = renderHook(() => useReleveDetail("rel-1"));
    await waitFor(() => expect(result.current.releve).not.toBeNull());
    expect(result.current.canNotify).toBe(true);

    await act(async () => {
      await result.current.prepareNotification();
    });
    expect(service.notifierReleve).toHaveBeenCalledWith("rel-1");
    expect(result.current.notification?.objet).toBe("Relevé mensuel");

    act(() => result.current.closeNotification());
    expect(result.current.notification).toBeNull();
  });
});
