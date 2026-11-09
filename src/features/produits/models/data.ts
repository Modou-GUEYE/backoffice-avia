import { ProduitForm, ProduitUtilisateurForm, ProduitUserDraft } from "./types";

export const emptyUtilisateurForm: ProduitUtilisateurForm = {
  id: "",
  username: "",
  email: "",
  nom: "", prenom: "", matricule: "", profil: "",
};

export const emptyUserDraft: ProduitUserDraft = {
  nom: "",
  prenom: "",
  username: "",
  email: "",
  role: "",
};

export const DEFAULT_BRANDING_COLORS = {
  primaryColor: "220 88% 42%",
  secondaryColor: "220 14% 96%",
  accentColor: "220 88% 52%",
  sidebarColor: "220 75% 15%",
  borderColor: "220 75% 15%",
};

export const emptyForm: ProduitForm = {
  nom: "",
  code: "",
  description: "",
  logo: "",
  logoFile: null,
  mediaUrl: "",
  libelleExpediteur: "",
  structuresAssociees: [],
  statut: "active",
  utilisateurs: [],
  faviconUrl: "",
  apsfdLogoUrl: "",
  primaryColor: DEFAULT_BRANDING_COLORS.primaryColor,
  secondaryColor: DEFAULT_BRANDING_COLORS.secondaryColor,
  accentColor: DEFAULT_BRANDING_COLORS.accentColor,
  sidebarColor: DEFAULT_BRANDING_COLORS.sidebarColor,
  borderColor: DEFAULT_BRANDING_COLORS.borderColor,
  loginBgUrl: "",
};
