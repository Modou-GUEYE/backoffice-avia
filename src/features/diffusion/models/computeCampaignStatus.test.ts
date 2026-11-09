import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { computeCampaignStatus } from "./types";

describe("computeCampaignStatus", () => {
  beforeEach(() => {
    // Fix current time to 2026-09-21T12:00:00.000Z
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-21T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retourne 'en_cours' lorsque date_debut <= maintenant et date_fin > date_debut (et date_fin > maintenant)", () => {
    // Cas produit : ajout d'une publicité débutant aujourd'hui ou plus tôt avec une fin future
    const status = computeCampaignStatus("2026-09-21T10:00:00.000Z", "2026-09-25T18:00:00.000Z");
    expect(status).toBe("en_cours");
  });

  it("retourne 'en_cours' lorsque date_debut est exactement l'heure actuelle", () => {
    const status = computeCampaignStatus("2026-09-21T12:00:00.000Z", "2026-09-22T12:00:00.000Z");
    expect(status).toBe("en_cours");
  });

  it("retourne 'pas_encore_diffusee' lorsque date_debut est dans le futur", () => {
    const status = computeCampaignStatus("2026-09-22T10:00:00.000Z", "2026-09-30T18:00:00.000Z");
    expect(status).toBe("pas_encore_diffusee");
  });

  it("retourne 'deja_diffusee' lorsque date_fin est passée", () => {
    const status = computeCampaignStatus("2026-09-10T10:00:00.000Z", "2026-09-20T18:00:00.000Z");
    expect(status).toBe("deja_diffusee");
  });

  it("préserve le statut 'suspendue' si passé en currentStatus", () => {
    const status = computeCampaignStatus("2026-09-21T10:00:00.000Z", "2026-09-25T18:00:00.000Z", "suspendue");
    expect(status).toBe("suspendue");
  });

  it("retourne fallback si dates invalides", () => {
    const status = computeCampaignStatus("date-invalide", "autre-date", "en_cours");
    expect(status).toBe("en_cours");
  });
});
