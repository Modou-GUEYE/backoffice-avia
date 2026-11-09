import { AgenceForm } from "./types";

export const emptyForm: AgenceForm = {
  name: "",
  code: "",
  parent_id: "",
  parent_type: "STRUCTURE",
  structureId: "",
  city: "",
  region: "",
  country: "Sénégal",
  address: "",
  contact_phone: "",
  contact_email: "",
  is_active: true,
  caisses: [],
};

export const paysOptions = [
  "Sénégal",
  "Mali",
  "Côte d'Ivoire",
  "Burkina Faso",
  "Togo",
  "Bénin",
  "Niger",
  "Guinée-Bissau",
  "UEMOA",
];
