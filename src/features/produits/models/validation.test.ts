import { describe, expect, it } from "vitest";
import {
  validateProduitDetailUserForm,
  validateProduitForm,
  validateProduitUserDraft,
} from "./validation";

const validProduitForm = {
  nom: "Demopay",
  libelleExpediteur: "DEMOPAY",
};

const validUserDraft = {
  prenom: "Awa",
  nom: "Diop",
  username: "a.diop",
  email: "awa.diop@example.com",
  role: "profile.bo.produit-central",
};

describe("validateProduitForm", () => {
  it("ne renvoie aucune erreur pour un formulaire valide", () => {
    expect(validateProduitForm(validProduitForm)).toEqual({});
  });

  it("renvoie toutes les erreurs des champs obligatoires vides en une fois", () => {
    expect(validateProduitForm({ ...validProduitForm, nom: "  ", libelleExpediteur: "" })).toEqual({
      nom: "Le libellé du produit est obligatoire",
      libelleExpediteur: "Le libellé expéditeur (SMS) est obligatoire",
    });
  });

  it("refuse les libellés non alphabétiques", () => {
    expect(validateProduitForm({ ...validProduitForm, nom: "Produit 2", libelleExpediteur: "SMS1" })).toEqual({
      nom: "Le libellé du produit doit être alphabétique",
      libelleExpediteur: "Le libellé expéditeur doit être alphabétique",
    });
  });

  it("limite le libellé expéditeur à 10 caractères", () => {
    expect(validateProduitForm({ ...validProduitForm, libelleExpediteur: "ABCDEFGHIJK" })).toEqual({
      libelleExpediteur: "Le libellé expéditeur ne doit pas dépasser 10 caractères",
    });
  });

  it("signale un produit en doublon sur le libellé", () => {
    expect(validateProduitForm(validProduitForm, { isDuplicate: true })).toEqual({
      nom: "Le produit existe déjà !",
    });
  });
});

describe("validateProduitUserDraft", () => {
  it("ne renvoie aucune erreur pour un utilisateur valide", () => {
    expect(validateProduitUserDraft(validUserDraft)).toEqual({});
  });

  it("renvoie toutes les erreurs des champs obligatoires vides, sans signaler le login généré", () => {
    expect(validateProduitUserDraft({ prenom: "", nom: "", username: "", email: "", role: "" })).toEqual({
      prenom: "Le prénom est obligatoire",
      nom: "Le nom est obligatoire",
      email: "L'e-mail est obligatoire",
      role: "Le profil est obligatoire",
    });
  });

  it("contrôle le format des champs à la création", () => {
    expect(
      validateProduitUserDraft({
        prenom: "Awa1",
        nom: "Diop",
        username: "a.diop",
        email: "awa.diop@",
        role: "inconnu",
      }),
    ).toEqual({
      prenom: "Le prénom doit être alphabétique",
      email: "L'adresse e-mail n'est pas valide",
      role: "Le profil sélectionné est invalide",
    });
  });

  it("signale un login invalide ou manquant", () => {
    expect(validateProduitUserDraft({ ...validUserDraft, username: "a diop" })).toEqual({
      username: "Le login ne doit contenir que des lettres, chiffres, points, tirets ou underscores",
    });
    expect(validateProduitUserDraft({ ...validUserDraft, username: "" })).toEqual({
      username: "Le login est obligatoire",
    });
  });

  it("en modification, ne contrôle que les champs obligatoires", () => {
    expect(
      validateProduitUserDraft({ ...validUserDraft, prenom: "Awa1", email: "invalide" }, "update"),
    ).toEqual({});
    expect(validateProduitUserDraft({ ...validUserDraft, email: " " }, "update")).toEqual({
      email: "L'e-mail est obligatoire",
    });
  });
});

describe("validateProduitDetailUserForm", () => {
  it("ne renvoie aucune erreur quand les 5 champs sont renseignés", () => {
    expect(
      validateProduitDetailUserForm({
        firstName: "Awa",
        lastName: "Diop",
        username: "a.diop",
        email: "awa.diop@example.com",
        profile: "profile.bo.produit-central",
      }),
    ).toEqual({});
  });

  it("renvoie une erreur par champ obligatoire vide", () => {
    expect(
      validateProduitDetailUserForm({ firstName: "", lastName: " ", username: "", email: "", profile: "" }),
    ).toEqual({
      firstName: "Le prénom est obligatoire",
      lastName: "Le nom est obligatoire",
      username: "Le nom d'utilisateur est obligatoire",
      email: "L'e-mail est obligatoire",
      profile: "Le profil est obligatoire",
    });
  });
});
