import { EntityBranding } from "@/core/theme/ThemeContext";
import { StructureForm, StructureUserForm } from "./types";

export const DEFAULT_BRANDING_COLORS = {
  primaryColor: "220 88% 42%",
  secondaryColor: "220 14% 96%",
  accentColor: "220 88% 52%",
  sidebarColor: "220 75% 15%",
  borderColor: "220 75% 15%",
};

export const emptyForm: StructureForm = {
  code: "", name: "", type: "", description: "", legal_name: "", registration_number: "", address: "", contact_email: "", contact_phone: "", is_active: true,
  logoUrl: "", logoFile: null, libelleExpediteurSMS: "", packageId: "",
  ajouterProduit: false, produitId: "",
  primaryColor: DEFAULT_BRANDING_COLORS.primaryColor,
  secondaryColor: DEFAULT_BRANDING_COLORS.secondaryColor,
  accentColor: DEFAULT_BRANDING_COLORS.accentColor,
  sidebarColor: DEFAULT_BRANDING_COLORS.sidebarColor,
  borderColor: DEFAULT_BRANDING_COLORS.borderColor,
};

export const emptyUserForm: StructureUserForm = {
  nom: "", prenom: "", username: "", email: "", profil: "", matricule: "", agenceId: "", caisseId: "",
};

export const emptyBranding: Partial<EntityBranding> = {
  entityName: "", logoUrl: "", faviconUrl: "",
  primaryColor: DEFAULT_BRANDING_COLORS.primaryColor,
  secondaryColor: DEFAULT_BRANDING_COLORS.secondaryColor,
  accentColor: DEFAULT_BRANDING_COLORS.accentColor,
  sidebarColor: DEFAULT_BRANDING_COLORS.sidebarColor,
  fontFamily: "Inter",
  loginBgUrl: "", tagline: "",
};

export const typeOptions = [
  { value: "BANK", label: "BANK" },
  { value: "IMF", label: "IMF" },
  { value: "PARTNER", label: "PARTNER" },
  { value: "OTHER", label: "OTHER" },
];

export const paysOptions = [
  "Mali", "Sénégal", "Côte d'Ivoire", "Burkina Faso",
  "Togo", "Bénin", "Niger", "Guinée-Bissau", "UEMOA",
];

