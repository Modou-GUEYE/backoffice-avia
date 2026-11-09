// ===== DIFFUSION & COMMUNICATIONS TYPES =====

export type CampaignStatus = "pas_encore_diffusee" | "en_cours" | "deja_diffusee" | "suspendue";
export type MediaType = "image" | "audio" | "video";
export type CampaignTarget = "tous" | "agences" | "localite" | "type_client" | "tranche_age";

export interface CampaignOut {
  id: string;
  libelle: string;
  type: MediaType;
  date_debut: string; // ISO Datetime
  date_fin: string; // ISO Datetime
  cible: CampaignTarget;
  cible_ids?: string[] | null;
  description?: string | null;
  status: CampaignStatus;
  filename?: string | null;
  structure_id?: string | null;
  media_url?: string | null;
  media_id?: string | null;
  url?: string | null;
  logo_url?: string | null;
  logo_media_id?: string | null;
}

export const resolveCampaignMediaUrl = (campaign?: Partial<CampaignOut> | null): string | null => {
  const rawUrl = campaign?.media_url ?? campaign?.url ?? campaign?.logo_url ?? null;
  if (typeof rawUrl === "string" && rawUrl.trim().length > 0) {
    return rawUrl.trim();
  }

  const rawMediaId = campaign?.media_id ?? campaign?.logo_media_id ?? null;
  if (typeof rawMediaId === "string" && rawMediaId.trim().length > 0) {
    const value = rawMediaId.trim();
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }
  }

  return null;
};

export const extractFilenameFromMediaUrl = (url?: string | null): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const disposition = parsed.searchParams.get("response-content-disposition");
    if (disposition) {
      const matchUtf8 = disposition.match(/filename\*=UTF-8''([^&;]+)/i);
      if (matchUtf8) return decodeURIComponent(matchUtf8[1]);
      const matchSimple = disposition.match(/filename="?([^"&;]+)"?/i);
      if (matchSimple) return decodeURIComponent(matchSimple[1]);
    }
    const pathname = parsed.pathname;
    const last = pathname.split("/").filter(Boolean).pop();
    if (last && last.includes(".")) return decodeURIComponent(last);
  } catch {
    const match = url.match(/filename\*=UTF-8''([^&;]+)/i) || url.match(/filename="?([^"&;]+)"?/i);
    if (match) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }
  return null;
};

export interface CampaignHistoryEntry {
  diffusion_id: string;
  date_debut: string;
  date_fin: string;
  status: CampaignStatus;
  archived_at: string;
}

export interface CampaignHistoryResponse {
  campaign_id: string;
  history: CampaignHistoryEntry[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface CampaignListResponse {
  data: CampaignOut[];
  pagination: PaginationMeta;
}

export type NotificationCanal = "sms" | "mail" | "app";
export type Channel = "sms" | "email" | "app";
export type TransactionType = "virement" | "versement" | "retrait" | "paiement" | "transfert_b2w";

export interface NotificationRead {
  id: string;
  libelle: string;
  type_transaction: string;
  canal: NotificationCanal;
  channel?: string[];
  contenu_envoyeur: string;
  contenu_destinataire: string;
  is_active: boolean;
}

export interface NotificationFormState {
  libelle: string;
  type_transaction: string;
  canal: NotificationCanal;
  contenu_envoyeur: string;
  contenu_destinataire: string;
}

export interface CampaignFormState {
  libelle: string;
  type: MediaType;
  date_debut: string;
  date_fin: string;
  cible: CampaignTarget;
  cible_ids: string[];
  description: string;
  file: File | null;
  structure_id: string;
}

export const targetLabels: Record<string, string> = {
  tous: "Tous les clients",
  agences: "Par agence",
  localite: "Par localité",
  type_client: "Par type de client",
  tranche_age: "Par tranche d'âge",
};

export const mediaTypeLabels: Record<MediaType, string> = {
  image: "Image",
  audio: "Audio",
  video: "Vidéo",
};

export const statusLabels: Record<CampaignStatus, { label: string; className: string }> = {
  en_cours: {
    label: "En cours",
    className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  },
  pas_encore_diffusee: {
    label: "Planifiée",
    className: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  },
  deja_diffusee: {
    label: "Terminée",
    className: "bg-muted text-muted-foreground border-border/50",
  },
  suspendue: {
    label: "Suspendue",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

/**
 * Calcule dynamiquement le statut d'une publicité selon la période de diffusion.
 * - Si suspendue explicitement (via currentStatus), conserve l'état suspendu.
 * - Si date_fin <= maintenant : "deja_diffusee"
 * - Si date_debut > maintenant : "pas_encore_diffusee"
 * - Si date_debut <= maintenant et date_fin > maintenant : "en_cours"
 */
export const computeCampaignStatus = (
  dateDebut: string | Date,
  dateFin: string | Date,
  currentStatus?: CampaignStatus
): CampaignStatus => {
  if (currentStatus === "suspendue") {
    return "suspendue";
  }

  const start = new Date(dateDebut);
  const end = new Date(dateFin);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return currentStatus || "pas_encore_diffusee";
  }

  const now = new Date();
  if (end <= now) {
    return "deja_diffusee";
  }
  if (start > now) {
    return "pas_encore_diffusee";
  }
  return "en_cours";
};

