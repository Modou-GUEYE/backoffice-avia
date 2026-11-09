import { describe, expect, it } from "vitest";
import { emptyPartenaireForm } from "./data";
import {
  validatePartenaireDetailUserForm,
  validatePartenaireForm,
  validatePartenaireUserForm,
} from "./validation";

describe("validatePartenaireForm", () => {
  it("renvoie toutes les erreurs d'un particulier vide", () => {
    expect(validatePartenaireForm({ ...emptyPartenaireForm, type: "particulier" })).toEqual({
      nom: "Le nom est obligatoire",
      prenom: "Le prénom est obligatoire",
      email: "L'e-mail est obligatoire",
      typePiece: "Le type de pièce est obligatoire",
      dateNaissance: "La date de naissance est obligatoire",
      dateDelivrance: "La date de délivrance est obligatoire",
      dateExpiration: "La date d'expiration est obligatoire",
    });
  });

  it("renvoie toutes les erreurs d'une entreprise vide", () => {
    expect(validatePartenaireForm({ ...emptyPartenaireForm, type: "entreprise" })).toEqual({
      libelle: "Le libellé de l'entreprise est obligatoire",
      numeroIdentiteFiscale: "Le numéro d'identité fiscale est obligatoire",
      email: "L'e-mail est obligatoire",
      ninea: "Le NINEA est obligatoire",
    });
  });

  it("signale la catégorie manquante et l'e-mail invalide", () => {
    const errors = validatePartenaireForm({
      ...emptyPartenaireForm,
      type: "entreprise",
      libelle: "ACME",
      numeroIdentiteFiscale: "123",
      ninea: "N-1",
      email: "acme.sn",
      categorie: "" as never,
    });
    expect(errors).toEqual({
      categorie: "La catégorie est obligatoire",
      email: "L'adresse e-mail n'est pas valide",
    });
  });

  it("ne renvoie aucune erreur pour un particulier complet", () => {
    expect(
      validatePartenaireForm({
        ...emptyPartenaireForm,
        type: "particulier",
        nom: "Diop",
        prenom: "Awa",
        email: "awa@example.com",
        typePiece: "CNI",
        dateNaissance: "1990-01-01",
        dateDelivrance: "2020-01-01",
        dateExpiration: "2030-01-01",
      }),
    ).toEqual({});
  });
});

describe("validatePartenaireUserForm / validatePartenaireDetailUserForm", () => {
  it("renvoie une erreur par champ obligatoire manquant", () => {
    expect(validatePartenaireUserForm({ prenom: "", nom: "", username: "", email: "", profil: "" })).toEqual({
      prenom: "Le prénom est obligatoire",
      nom: "Le nom est obligatoire",
      username: "Le login est obligatoire",
      email: "L'e-mail est obligatoire",
      profil: "Le profil est obligatoire",
    });
  });

  it("utilise les noms de champs du dialogue de la fiche partenaire", () => {
    expect(
      validatePartenaireDetailUserForm({ firstName: "", lastName: "Diop", username: "", email: "x@", profile: "" }),
    ).toEqual({
      firstName: "Le prénom est obligatoire",
      username: "Le nom d'utilisateur est obligatoire",
      email: "L'adresse e-mail n'est pas valide",
      profile: "Le profil est obligatoire",
    });
  });

  it("ne renvoie aucune erreur pour un utilisateur complet", () => {
    expect(
      validatePartenaireDetailUserForm({
        firstName: "Awa",
        lastName: "Diop",
        username: "a.awadiop",
        email: "awa@example.com",
        profile: "profile.bo.partenaire-admin",
      }),
    ).toEqual({});
  });
});
