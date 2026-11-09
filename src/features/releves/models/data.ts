import type { BeneficiaireType } from "./types";

export const MOIS_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

/** Ordre d'affichage des bénéficiaires d'une quote-part. */
export const BENEFICIAIRES: Array<{ type: BeneficiaireType; label: string }> = [
  { type: "structure", label: "Structure" },
  { type: "distributeur", label: "Distributeur" },
  { type: "produit", label: "Produit" },
  { type: "partenaire_technique", label: "Partenaire technique" },
];

export const STATUT_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  fige: "Figé",
};

export const formatPeriode = (annee: number, mois: number): string =>
  `${MOIS_LABELS[mois - 1] ?? `Mois ${mois}`} ${annee}`;

export const formatMontant = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value)} FCFA`;
};

export const formatDateTime = (value?: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDate = (value?: string | null): string => {
  if (!value) return "-";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};
