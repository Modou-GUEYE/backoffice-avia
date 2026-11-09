import { describe, it, expect } from "vitest";
import { validateCampaignForm, validateNotificationForm } from "./useDiffusion";
import { CampaignFormState, NotificationFormState } from "../models/types";

const notification: NotificationFormState = {
  libelle: "Virement",
  type_transaction: "virement",
  canal: "sms",
  contenu_envoyeur: "",
  contenu_destinataire: "",
};

const file = new File(["x"], "visuel.png", { type: "image/png" });
const campaign: CampaignFormState = {
  libelle: "Campagne",
  type: "image",
  date_debut: "2026-10-01T10:00",
  date_fin: "2026-10-31T10:00",
  cible: "tous",
  cible_ids: [],
  description: "",
  file,
  structure_id: "",
};

describe("validateNotificationForm", () => {
  it("accepte un formulaire complet", () => {
    expect(validateNotificationForm(notification)).toEqual({});
  });

  it("signale tous les champs obligatoires manquants à la fois", () => {
    const errors = validateNotificationForm({
      ...notification,
      libelle: "  ",
      type_transaction: "",
      canal: "" as NotificationFormState["canal"],
    });
    expect(errors).toEqual({
      libelle: "Le libellé est obligatoire",
      type_transaction: "Le type de transaction est obligatoire",
      canal: "Le canal de diffusion est obligatoire",
    });
  });
});

describe("validateCampaignForm", () => {
  it("accepte une campagne complète", () => {
    expect(validateCampaignForm(campaign, false)).toEqual({});
  });

  it("signale libellé, dates et fichier manquants à la fois en création", () => {
    const errors = validateCampaignForm(
      { ...campaign, libelle: "", date_debut: "", date_fin: "", file: null },
      false,
    );
    expect(Object.keys(errors).sort()).toEqual(["date_debut", "date_fin", "file", "libelle"]);
  });

  it("n'exige pas de fichier en modification", () => {
    expect(validateCampaignForm({ ...campaign, file: null }, true)).toEqual({});
  });

  it("refuse une date de fin antérieure ou égale à la date de début", () => {
    const errors = validateCampaignForm({ ...campaign, date_fin: campaign.date_debut }, false);
    expect(errors.date_fin).toBe("La date de fin doit être postérieure à la date de début");
  });

  it("exige au moins une sélection pour une cible agences / localités / types de client", () => {
    expect(validateCampaignForm({ ...campaign, cible: "agences" }, false).cible_ids).toBe(
      "Sélectionnez au moins une agence",
    );
    expect(validateCampaignForm({ ...campaign, cible: "localite" }, false).cible_ids).toBeDefined();
    expect(validateCampaignForm({ ...campaign, cible: "type_client" }, false).cible_ids).toBeDefined();
    expect(validateCampaignForm({ ...campaign, cible: "agences", cible_ids: ["a1"] }, false)).toEqual({});
  });

  it("valide la tranche d'âge champ par champ", () => {
    expect(validateCampaignForm({ ...campaign, cible: "tranche_age", cible_ids: [] }, false)).toEqual({
      age_min: "L'âge minimum est obligatoire",
      age_max: "L'âge maximum est obligatoire",
    });
    expect(
      validateCampaignForm({ ...campaign, cible: "tranche_age", cible_ids: ["-1", "30"] }, false).age_min,
    ).toBe("L'âge doit être un nombre positif");
    expect(
      validateCampaignForm({ ...campaign, cible: "tranche_age", cible_ids: ["40", "30"] }, false).age_max,
    ).toBe("L'âge maximum doit être supérieur ou égal à l'âge minimum");
    expect(validateCampaignForm({ ...campaign, cible: "tranche_age", cible_ids: ["18", "35"] }, false)).toEqual({});
  });
});
