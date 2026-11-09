import { describe, expect, it } from "vitest";
import { emptyDistributeurForm } from "./data";
import {
  validateDistributeurAgenceForm,
  validateDistributeurCaisseForm,
  validateDistributeurForm,
  validateDistributeurUserForm,
} from "./validation";

describe("validateDistributeurForm", () => {
  it("renvoie toutes les erreurs à la fois quand le formulaire est vide", () => {
    expect(validateDistributeurForm({ ...emptyDistributeurForm, nom: " ", structureId: "" })).toEqual({
      nom: "Le nom du distributeur est obligatoire",
      structureId: "La structure de rattachement est obligatoire",
    });
  });

  it("n'exige pas la structure quand elle est figée (fiche distributeur)", () => {
    expect(
      validateDistributeurForm({ ...emptyDistributeurForm, nom: "Dist", structureId: "" }, { requireStructure: false }),
    ).toEqual({});
  });

  it("ne renvoie aucune erreur pour un formulaire complet", () => {
    expect(validateDistributeurForm({ ...emptyDistributeurForm, nom: "Dist", structureId: "s1" })).toEqual({});
  });
});

describe("validateDistributeurUserForm", () => {
  const validUser = {
    prenom: "Amadou",
    nom: "Diop",
    username: "a.amadoudiop",
    email: "amadou@example.com",
    profil: "profile.bo.autonome-set-admin",
  };

  it("renvoie une erreur par champ obligatoire manquant", () => {
    expect(validateDistributeurUserForm({ prenom: "", nom: "", username: "", email: "", profil: "" })).toEqual({
      prenom: "Le prénom est obligatoire",
      nom: "Le nom est obligatoire",
      username: "Le login est obligatoire",
      email: "L'e-mail est obligatoire",
      profil: "Le profil est obligatoire",
    });
  });

  it("signale un e-mail au format invalide", () => {
    expect(validateDistributeurUserForm({ ...validUser, email: "amadou@" })).toEqual({
      email: "L'adresse e-mail n'est pas valide",
    });
  });

  it("ne renvoie aucune erreur pour un utilisateur complet", () => {
    expect(validateDistributeurUserForm(validUser)).toEqual({});
  });
});

describe("validateDistributeurAgenceForm / validateDistributeurCaisseForm", () => {
  it("exige le nom et le code de l'agence, comme la page Agences", () => {
    expect(validateDistributeurAgenceForm({ name: "  ", code: "" })).toEqual({
      name: "Le nom de l'agence est obligatoire",
      code: "Le code de l'agence est obligatoire",
    });
    expect(validateDistributeurAgenceForm({ name: "Agence", code: "AG-01" })).toEqual({});
  });

  it("applique les règles de la page Caisses (agence, nom et code)", () => {
    expect(validateDistributeurCaisseForm({ name: "", code: "", agency_id: "" })).toEqual({
      agency_id: "L'agence de rattachement est obligatoire",
      name: "Le nom de la caisse est obligatoire",
      code: "Le code de la caisse est obligatoire",
    });
    expect(validateDistributeurCaisseForm({ name: "Caisse 1", code: "C1-01", agency_id: "a1" })).toEqual({});
  });
});
