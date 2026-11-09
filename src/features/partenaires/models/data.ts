import { PartenaireForm } from "./types";

export const profilsMarchand = [
  "profile.bo.partenaire-admin",
  "profile.bo.partenaire-marchand",
];
export const profilsFacturier = [
  "profile.bo.partenaire-admin",
  "profile.bo.partenaire-facturier",
];
export const typesPiece = ["CNI", "PASSEPORT", "PERMIS", "CARTE_SEJOUR"];

export const initialStructures: Array<{ id: string; nom: string; pays: string }> = [];

export const emptyPartenaireForm: PartenaireForm = {
  code: "",
  type: "particulier",
  categorie: "marchand",
  nom: "",
  prenom: "",
  dateNaissance: "",
  typePiece: "",
  dateDelivrance: "",
  dateExpiration: "",
  libelle: "",
  ninea: "",
  numeroIdentiteFiscale: "",
  telephone: "",
  email: "",
  profil: "",
  serviceIds: [],
};
