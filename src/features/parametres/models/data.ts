import {
  AdministrationRead,
  RoleForm,
  PaymentMethodResponse,
  ServiceResponse,
  PackageServiceItemResponse,
  PackagePaymentFlowResponse,
  PackageResponse,
  PackageForm,
} from "./types";

export const emptyRole: RoleForm = { nom: "", description: "", permissions: [], statut: "Actif" };

export const initialAdministrations: AdministrationRead[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    name: "APSFD",
    code: "APSFD",
    description: "Organisation centrale",
    contact_email: null,
    contact_phone: null,
    settings: null,
    is_active: true,
    activated_at: null,
    deactivated_at: null,
    is_deleted: false,
  },
];

// ===== DONNEES MAQUETTES POUR LES SERVICES ET MOYENS DE PAIEMENT =====

export const initialPaymentMethods: PaymentMethodResponse[] = [
  {
    id: "pm-0000-0000-0000-000000000001",
    code: "cash",
    label: "Cash",
    description: "Paiement en espèces / physique",
    status: "active",
  },
  {
    id: "pm-0000-0000-0000-000000000002",
    code: "compte bancaire",
    label: "Compte bancaire",
    description: "Virement ou prélèvement bancaire direct",
    status: "active",
  },
  {
    id: "pm-0000-0000-0000-000000000003",
    code: "carte prépayée",
    label: "Carte prépayée",
    description: "Cartes prépayées VISA / Mastercard",
    status: "active",
  },
  {
    id: "pm-0000-0000-0000-000000000004",
    code: "wallet",
    label: "Wallet",
    description: "Portefeuille électronique mobile (Orange, Wave, Free)",
    status: "active",
  },
];

export const initialServices: ServiceResponse[] = [
  {
    id: "srv-0000-0000-0000-000000000001",
    code: "virement",
    label: "Virement",
    description: "Virement de compte à compte",
    category_id: null,
    status: "active",
  },
  {
    id: "srv-0000-0000-0000-000000000002",
    code: "versement",
    label: "Versement",
    description: "Versement d'espèces en agence",
    category_id: null,
    status: "active",
  },
  {
    id: "srv-0000-0000-0000-000000000003",
    code: "retrait",
    label: "Retrait",
    description: "Retrait de fonds",
    category_id: null,
    status: "active",
  },
  {
    id: "srv-0000-0000-0000-000000000004",
    code: "paiement",
    label: "Paiement",
    description: "Paiement de factures / marchands",
    category_id: null,
    status: "active",
  },
  {
    id: "srv-0000-0000-0000-000000000005",
    code: "transfert cash",
    label: "Transfert cash",
    description: "Envoi de cash à retirer en agence",
    category_id: null,
    status: "active",
  },
  {
    id: "srv-0000-0000-0000-000000000006",
    code: "transfert wallet",
    label: "Transfert wallet",
    description: "Transfert direct vers un wallet mobile",
    category_id: null,
    status: "active",
  },
];

// Mappings des services et moyens de paiements par défaut dans les packages
export const initialPackageServices: PackageServiceItemResponse[] = [
  // Pack Particulier Essentiel (Services 2, 3, 4)
  { id: "ps-1-2", package_id: "pkg-0000-0000-0000-000000000001", service_id: "srv-0000-0000-0000-000000000002", is_enabled: true },
  { id: "ps-1-3", package_id: "pkg-0000-0000-0000-000000000001", service_id: "srv-0000-0000-0000-000000000003", is_enabled: true },
  { id: "ps-1-4", package_id: "pkg-0000-0000-0000-000000000001", service_id: "srv-0000-0000-0000-000000000004", is_enabled: true },

  // Pack Business Entreprise (Services 1, 4, 6)
  { id: "ps-2-1", package_id: "pkg-0000-0000-0000-000000000002", service_id: "srv-0000-0000-0000-000000000001", is_enabled: true },
  { id: "ps-2-4", package_id: "pkg-0000-0000-0000-000000000002", service_id: "srv-0000-0000-0000-000000000004", is_enabled: true },
  { id: "ps-2-6", package_id: "pkg-0000-0000-0000-000000000002", service_id: "srv-0000-0000-0000-000000000006", is_enabled: true },

  // Pack Premium Plus (Tous les services)
  { id: "ps-3-1", package_id: "pkg-0000-0000-0000-000000000003", service_id: "srv-0000-0000-0000-000000000001", is_enabled: true },
  { id: "ps-3-2", package_id: "pkg-0000-0000-0000-000000000003", service_id: "srv-0000-0000-0000-000000000002", is_enabled: true },
  { id: "ps-3-3", package_id: "pkg-0000-0000-0000-000000000003", service_id: "srv-0000-0000-0000-000000000003", is_enabled: true },
  { id: "ps-3-4", package_id: "pkg-0000-0000-0000-000000000003", service_id: "srv-0000-0000-0000-000000000004", is_enabled: true },
  { id: "ps-3-5", package_id: "pkg-0000-0000-0000-000000000003", service_id: "srv-0000-0000-0000-000000000005", is_enabled: true },
  { id: "ps-3-6", package_id: "pkg-0000-0000-0000-000000000003", service_id: "srv-0000-0000-0000-000000000006", is_enabled: true },
];

export const initialPackagePaymentFlows: PackagePaymentFlowResponse[] = [
  // Essentiel : Cash (pm1), Compte bancaire (pm2)
  { id: "ppf-1-2-1", package_service_id: "ps-1-2", service_payment_flow_id: "pm-0000-0000-0000-000000000001", is_enabled: true },
  { id: "ppf-1-2-2", package_service_id: "ps-1-2", service_payment_flow_id: "pm-0000-0000-0000-000000000002", is_enabled: true },
  { id: "ppf-1-3-1", package_service_id: "ps-1-3", service_payment_flow_id: "pm-0000-0000-0000-000000000001", is_enabled: true },
  { id: "ppf-1-3-2", package_service_id: "ps-1-3", service_payment_flow_id: "pm-0000-0000-0000-000000000002", is_enabled: true },
  { id: "ppf-1-4-1", package_service_id: "ps-1-4", service_payment_flow_id: "pm-0000-0000-0000-000000000001", is_enabled: true },

  // Business : Compte bancaire (pm2), Wallet (pm4)
  { id: "ppf-2-1-2", package_service_id: "ps-2-1", service_payment_flow_id: "pm-0000-0000-0000-000000000002", is_enabled: true },
  { id: "ppf-2-4-2", package_service_id: "ps-2-4", service_payment_flow_id: "pm-0000-0000-0000-000000000002", is_enabled: true },
  { id: "ppf-2-4-4", package_service_id: "ps-2-4", service_payment_flow_id: "pm-0000-0000-0000-000000000004", is_enabled: true },
  { id: "ppf-2-6-4", package_service_id: "ps-2-6", service_payment_flow_id: "pm-0000-0000-0000-000000000004", is_enabled: true },

  // Premium Plus : Toutes les méthodes de paiement pour tous les services
  { id: "ppf-3-1-1", package_service_id: "ps-3-1", service_payment_flow_id: "pm-0000-0000-0000-000000000002", is_enabled: true },
  { id: "ppf-3-2-1", package_service_id: "ps-3-2", service_payment_flow_id: "pm-0000-0000-0000-000000000001", is_enabled: true },
  { id: "ppf-3-2-2", package_service_id: "ps-3-2", service_payment_flow_id: "pm-0000-0000-0000-000000000002", is_enabled: true },
  { id: "ppf-3-3-1", package_service_id: "ps-3-3", service_payment_flow_id: "pm-0000-0000-0000-000000000001", is_enabled: true },
  { id: "ppf-3-3-3", package_service_id: "ps-3-3", service_payment_flow_id: "pm-0000-0000-0000-000000000003", is_enabled: true },
  { id: "ppf-3-4-1", package_service_id: "ps-3-4", service_payment_flow_id: "pm-0000-0000-0000-000000000001", is_enabled: true },
  { id: "ppf-3-4-2", package_service_id: "ps-3-4", service_payment_flow_id: "pm-0000-0000-0000-000000000002", is_enabled: true },
  { id: "ppf-3-4-4", package_service_id: "ps-3-4", service_payment_flow_id: "pm-0000-0000-0000-000000000004", is_enabled: true },
  { id: "ppf-3-5-1", package_service_id: "ps-3-5", service_payment_flow_id: "pm-0000-0000-0000-000000000001", is_enabled: true },
  { id: "ppf-3-6-4", package_service_id: "ps-3-6", service_payment_flow_id: "pm-0000-0000-0000-000000000004", is_enabled: true },
];

export const initialPackages: PackageResponse[] = [
  {
    id: "pkg-0000-0000-0000-000000000001",
    code: "PKG-001",
    label: "Pack Particulier Essentiel",
    description: "Package de base pour les clients particuliers avec les opérations courantes",
    status: "active",
  },
  {
    id: "pkg-0000-0000-0000-000000000002",
    code: "PKG-002",
    label: "Pack Business Entreprise",
    description: "Package avancé pour PME et grandes entreprises",
    status: "active",
  },
  {
    id: "pkg-0000-0000-0000-000000000003",
    code: "PKG-003",
    label: "Pack Premium Plus",
    description: "Package premium avec accès à tous les services et des plafonds élevés",
    status: "active",
  },
];

// COMPATIBILITÉ ASCENDANTE AVEC STRUCTURES PAGE
export const packagesInit = initialPackages.map((p) => ({
  id: p.id,
  code: p.code,
  nom: p.label,
  description: p.description ?? "",
  produits: ["Dépôt Espèces", "Retrait GAB", "Paiement Marchand"],
  limiteTransaction: 500000,
  fraisForfaitaires: 1500,
  statut: p.status === "active" ? ("Actif" as const) : ("Inactif" as const),
  type: "Standard" as const,
  dateCreation: "2024-01-10",
}));

export const emptyPackageForm: PackageForm = {
  code: "",
  label: "",
  description: "",
  client_types: [],
  services: [],
  payment_methods: [],
};

