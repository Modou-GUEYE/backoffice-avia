import { DistributeurForm, DistributeurUserForm } from "./types";

export const emptyDistributeurForm: DistributeurForm = {
  nom: "",
  structureId: "",
  address: "",
  contact_email: "",
  contact_phone: "",
  statut: "actif",
  file: null,
  previewUrl: "",
};

export const emptyDistributeurUserForm: DistributeurUserForm = {
  nom: "",
  prenom: "",
  username: "",
  email: "",
  profil: "",
  matricule: "",
};


