import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  CampaignOut,
  CampaignHistoryEntry,
  MediaType,
  CampaignTarget,
  CampaignStatus,
  computeCampaignStatus,
  NotificationRead,
  NotificationFormState,
  CampaignFormState,
} from "../models/types";
import {
  fetchCampaigns,
  fetchCampaignById,
  createCampaign,
  updateCampaign,
  suspendCampaign,
  deleteCampaign,
  fetchCampaignHistory,
  fetchMediaTypes,
  fetchTargets,
  fetchClientTypes,
} from "../services/campaignsService";
import {
  fetchNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
  toggleNotificationStatus,
  fetchTransactionTypes,
  fetchChannels,
} from "../services/notificationsService";
import { fetchAgences } from "@/features/agences/services/agencesService";
import { AgenceRead } from "@/features/agences/models/types";
import { fetchStructures } from "@/features/structures/services/structuresService";
import { StructureRead } from "@/features/structures/models/types";
import { FieldErrors, hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";

export type NotificationFormField = "libelle" | "type_transaction" | "canal";

/** Valide le formulaire de notification et renvoie toutes les erreurs, par champ. */
export const validateNotificationForm = (form: NotificationFormState): FieldErrors<NotificationFormField> => {
  const errors: FieldErrors<NotificationFormField> = {};
  if (!form.libelle.trim()) errors.libelle = "Le libellé est obligatoire";
  if (!form.type_transaction.trim()) errors.type_transaction = "Le type de transaction est obligatoire";
  if (!form.canal) errors.canal = "Le canal de diffusion est obligatoire";
  return errors;
};

export type CampaignFormField =
  | "libelle"
  | "type"
  | "cible"
  | "cible_ids"
  | "age_min"
  | "age_max"
  | "date_debut"
  | "date_fin"
  | "file";

/** Valide le formulaire de campagne et renvoie toutes les erreurs, par champ. */
export const validateCampaignForm = (
  form: CampaignFormState,
  isEditing: boolean,
): FieldErrors<CampaignFormField> => {
  const errors: FieldErrors<CampaignFormField> = {};

  if (!form.libelle.trim()) errors.libelle = "Le libellé de la publicité est obligatoire";
  if (!form.type) errors.type = "Le type de média est obligatoire";
  if (!form.cible) errors.cible = "La cible client est obligatoire";

  if (!form.date_debut) errors.date_debut = "La date de début est obligatoire";
  if (!form.date_fin) errors.date_fin = "La date de fin est obligatoire";
  if (form.date_debut && form.date_fin && new Date(form.date_debut) >= new Date(form.date_fin)) {
    errors.date_fin = "La date de fin doit être postérieure à la date de début";
  }

  if (!isEditing && !form.file) {
    errors.file = "Un fichier média (image, audio ou vidéo) est obligatoire pour la création";
  }

  if (form.cible && form.cible !== "tous") {
    if (form.cible === "tranche_age") {
      const rawMin = (form.cible_ids[0] ?? "").trim();
      const rawMax = (form.cible_ids[1] ?? "").trim();
      const minAge = Number.parseInt(rawMin);
      const maxAge = Number.parseInt(rawMax);
      if (!rawMin) errors.age_min = "L'âge minimum est obligatoire";
      else if (Number.isNaN(minAge) || minAge < 0) errors.age_min = "L'âge doit être un nombre positif";
      if (!rawMax) errors.age_max = "L'âge maximum est obligatoire";
      else if (Number.isNaN(maxAge) || maxAge < 0) errors.age_max = "L'âge doit être un nombre positif";
      if (!errors.age_min && !errors.age_max && minAge > maxAge) {
        errors.age_max = "L'âge maximum doit être supérieur ou égal à l'âge minimum";
      }
    } else if (!form.cible_ids || form.cible_ids.length === 0) {
      errors.cible_ids =
        form.cible === "agences"
          ? "Sélectionnez au moins une agence"
          : form.cible === "localite"
            ? "Sélectionnez au moins un pays / une localité"
            : form.cible === "type_client"
              ? "Sélectionnez au moins un type de client"
              : "Veuillez renseigner ou sélectionner les critères de ciblage";
    }
  }

  return errors;
};

const emptyNotificationForm: NotificationFormState = {
  libelle: "",
  type_transaction: "",
  canal: "sms",
  contenu_envoyeur: "",
  contenu_destinataire: "",
};

const emptyCampaignForm: CampaignFormState = {
  libelle: "",
  type: "image",
  date_debut: "",
  date_fin: "",
  cible: "tous",
  cible_ids: [],
  description: "",
  file: null,
  structure_id: "",
};

export const useDiffusion = (options?: { enabled?: boolean; activeSubTab?: string }) => {
  const enabled = options?.enabled ?? true;
  const activeSubTab = options?.activeSubTab || "notificationsList";

  const [hasLoadedNotifications, setHasLoadedNotifications] = useState(false);

  // ===== NOTIFICATIONS STATE =====
  const [notificationsState, setNotificationsState] = useState({
    items: [] as NotificationRead[],
    isLoading: true,
    isOpen: false,
    editingItem: null as NotificationRead | null,
    form: emptyNotificationForm,
  });

  // ===== CAMPAIGNS STATE =====
  const [campaignsState, setCampaignsState] = useState({
    items: [] as CampaignOut[],
    isLoading: true,
    isSaving: false,
    isOpen: false,
    editingItem: null as CampaignOut | null,
    form: emptyCampaignForm,
    campaignError: null as string | null,
    page: 1,
    total: 0,
    filterStatus: "all" as CampaignStatus | "all",
    filterType: "all" as MediaType | "all",
  });

  // ===== METADATA STATE =====
  const [metadataState, setMetadataState] = useState({
    mediaTypes: ["image", "audio", "video"] as MediaType[],
    targets: ["tous", "agences", "localite", "type_client", "tranche_age"] as CampaignTarget[],
    clientTypes: ["PARTICULIER", "ENTREPRISE", "COMMERCANT"] as string[],
    transactionTypes: ["virement", "versement", "retrait", "paiement", "transfert_b2w"] as string[],
    channels: ["sms", "email", "app"] as string[],
    agencesList: [] as AgenceRead[],
    structuresList: [] as StructureRead[],
    isLoading: false,
  });

  // ===== HISTORY STATE =====
  const [historyState, setHistoryState] = useState({
    items: [] as CampaignHistoryEntry[],
    isLoading: false,
    isOpen: false,
    selectedCampaign: null as CampaignOut | null,
  });

  // ===== CAMPAIGN DETAIL STATE =====
  const [detailState, setDetailState] = useState({
    campaign: null as CampaignOut | null,
    isLoading: false,
    isOpen: false,
  });

  const campaignLimit = 10;

  const {
    errors: notificationErrors,
    setErrors: setNotificationErrors,
    clearError: clearNotificationError,
    resetErrors: resetNotificationErrors,
  } = useFieldErrors<NotificationFormField>();
  const {
    errors: campaignErrors,
    setErrors: setCampaignErrors,
    clearError: clearCampaignError,
    resetErrors: resetCampaignErrors,
  } = useFieldErrors<CampaignFormField>();

  // ==========================================
  // ===== NOTIFICATIONS ACTIONS =============
  // ==========================================

  const loadMetadata = useCallback(async () => {
    try {
      setMetadataState((prev) => ({ ...prev, isLoading: true }));
      const [fetchedTypes, fetchedTargets, fetchedClientTypes, fetchedAgences, fetchedTransTypes, fetchedChannels, fetchedStructures] = await Promise.all([
        fetchMediaTypes().catch(() => ["image", "audio", "video"] as MediaType[]),
        fetchTargets().catch(() => ["tous", "agences", "localite", "type_client", "tranche_age"] as CampaignTarget[]),
        fetchClientTypes().catch(() => ["PARTICULIER", "ENTREPRISE", "COMMERCANT"] as string[]),
        fetchAgences().catch(() => [] as AgenceRead[]),
        fetchTransactionTypes().catch(() => ["virement", "versement", "retrait", "paiement", "transfert_b2w"]),
        fetchChannels().catch(() => ["sms", "email", "app"]),
        fetchStructures().catch(() => [] as StructureRead[]),
      ]);
      setMetadataState((prev) => ({
        ...prev,
        mediaTypes: fetchedTypes,
        targets: fetchedTargets,
        clientTypes: fetchedClientTypes,
        agencesList: fetchedAgences,
        transactionTypes: fetchedTransTypes,
        channels: fetchedChannels,
        structuresList: fetchedStructures,
      }));
    } catch (error) {
      console.warn("Failed to load metadata dynamically", error);
    } finally {
      setMetadataState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      setNotificationsState((prev) => ({ ...prev, isLoading: true }));
      const data = await fetchNotifications();
      setNotificationsState((prev) => ({ ...prev, items: data }));
    } catch (error) {
      console.error("Failed to load notifications", error);
      toast.error("Impossible de charger les notifications.");
    } finally {
      setNotificationsState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const openAddNotification = () => {
    resetNotificationErrors();
    setNotificationsState((prev) => ({
      ...prev,
      editingItem: null,
      form: emptyNotificationForm,
      isOpen: true,
    }));
  };

  const openEditNotification = (notif: NotificationRead) => {
    resetNotificationErrors();
    setNotificationsState((prev) => ({
      ...prev,
      editingItem: notif,
      form: {
        libelle: notif.libelle,
        type_transaction: notif.type_transaction,
        canal: notif.canal,
        contenu_envoyeur: notif.contenu_envoyeur,
        contenu_destinataire: notif.contenu_destinataire,
      },
      isOpen: true,
    }));
  };

  /** Valide le formulaire de notification et affiche les erreurs sous les champs. */
  const validateNotification = (): boolean => {
    const errors = validateNotificationForm(notificationsState.form);
    setNotificationErrors(errors);
    return !hasFieldErrors(errors);
  };

  const saveNotification = async () => {
    const { form, editingItem } = notificationsState;
    if (!validateNotification()) {
      // En modification, le formulaire a pu être fermé pour la confirmation : on le rouvre pour afficher les erreurs.
      setNotificationsState((prev) => ({ ...prev, isOpen: true }));
      return;
    }

    try {
      if (editingItem) {
        const updated = await updateNotification(editingItem.id, form);
        setNotificationsState((prev) => ({
          ...prev,
          items: prev.items.map((n) => (n.id === updated.id ? updated : n)),
          isOpen: false,
          form: emptyNotificationForm,
          editingItem: null,
        }));
        toast.success("Notification modifiée avec succès");
      } else {
        const created = await createNotification(form);
        setNotificationsState((prev) => ({
          ...prev,
          items: [created, ...prev.items],
          isOpen: false,
          form: emptyNotificationForm,
          editingItem: null,
        }));
        toast.success("Notification créée avec succès");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const changeNotificationStatus = async (notif: NotificationRead, activate: boolean) => {
    try {
      const updated = await toggleNotificationStatus(notif.id, activate);
      setNotificationsState((prev) => ({
        ...prev,
        items: prev.items.map((n) => (n.id === updated.id ? updated : n)),
      }));
      toast.success(activate ? "Notification activée" : "Notification désactivée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier le statut de la notification");
    }
  };

  const removeNotification = async (notifId: string) => {
    try {
      await deleteNotification(notifId);
      setNotificationsState((prev) => ({
        ...prev,
        items: prev.items.filter((n) => n.id !== notifId),
      }));
      toast.success("Notification supprimée avec succès");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer la notification");
    }
  };

  // ==========================================
  // ===== CAMPAIGNS ACTIONS =================
  // ==========================================

  const campaignPage = campaignsState.page;
  const campaignFilterStatus = campaignsState.filterStatus;
  const campaignFilterType = campaignsState.filterType;

  const loadCampaigns = useCallback(async () => {
    try {
      setCampaignsState((prev) => ({ ...prev, isLoading: true }));
      const res = await fetchCampaigns({
        page: campaignPage,
        limit: campaignLimit,
        status: campaignFilterStatus === "all" ? "" : campaignFilterStatus,
        type: campaignFilterType === "all" ? "" : campaignFilterType,
      });
      setCampaignsState((prev) => ({
        ...prev,
        items: res && Array.isArray(res.data)
          ? res.data.map((c) => ({
              ...c,
              status: computeCampaignStatus(c.date_debut, c.date_fin, c.status),
            }))
          : [],
        total: res?.pagination?.total || 0,
      }));
    } catch (error) {
      console.error("Failed to load campaigns", error);
      toast.error("Impossible de charger les campagnes de publicité.");
    } finally {
      setCampaignsState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [campaignPage, campaignFilterStatus, campaignFilterType]);

  const openAddCampaign = () => {
    resetCampaignErrors();
    setCampaignsState((prev) => ({
      ...prev,
      editingItem: null,
      campaignError: null,
      form: { ...emptyCampaignForm, structure_id: "" },
      isOpen: true,
    }));
  };

  const openEditCampaign = async (campaign: CampaignOut) => {
    resetCampaignErrors();
    setCampaignsState((prev) => ({
      ...prev,
      editingItem: campaign,
      campaignError: null,
      form: {
        libelle: campaign.libelle,
        type: campaign.type,
        date_debut: campaign.date_debut ? campaign.date_debut.substring(0, 16) : "",
        date_fin: campaign.date_fin ? campaign.date_fin.substring(0, 16) : "",
        cible: campaign.cible,
        cible_ids: campaign.cible_ids || [],
        description: campaign.description || "",
        file: null,
        structure_id: campaign.structure_id || "",
      },
      isOpen: true,
    }));

    try {
      const fresh = await fetchCampaignById(campaign.id);
      if (fresh) {
        setCampaignsState((prev) => {
          if (prev.editingItem?.id === campaign.id) {
            return {
              ...prev,
              editingItem: fresh,
            };
          }
          return prev;
        });
      }
    } catch (err) {
      console.warn("Could not refresh campaign details on open edit", err);
    }
  };

  /** Valide le formulaire de campagne et affiche les erreurs sous les champs. */
  const validateCampaign = (): boolean => {
    const errors = validateCampaignForm(campaignsState.form, !!campaignsState.editingItem);
    setCampaignErrors(errors);
    return !hasFieldErrors(errors);
  };

  const saveCampaignAction = async () => {
    if (campaignsState.isSaving) return;

    const { form, editingItem } = campaignsState;
    if (!validateCampaign()) {
      // En modification, le formulaire a pu être fermé pour la confirmation : on le rouvre pour afficher les erreurs.
      setCampaignsState((prev) => ({ ...prev, isOpen: true, campaignError: null }));
      return;
    }

    setCampaignsState((prev) => ({ ...prev, isSaving: true, campaignError: null }));

    try {
      const formData = new FormData();
      const targetStatus = computeCampaignStatus(form.date_debut, form.date_fin);

      formData.append("date_debut", new Date(form.date_debut).toISOString());
      formData.append("date_fin", new Date(form.date_fin).toISOString());
      if (form.libelle) formData.append("libelle", form.libelle.trim());
      if (form.cible) formData.append("cible", form.cible);
      if (form.structure_id) formData.append("structure_id", form.structure_id);
      if (form.description) formData.append("description", form.description.trim());
      if (form.file) formData.append("file", form.file);

      if (form.cible !== "tous" && form.cible_ids && form.cible_ids.length > 0) {
        form.cible_ids.forEach((id) => formData.append("cible_ids", id));
        if (form.cible === "type_client") {
          form.cible_ids.forEach((id) => formData.append("client_types", id));
        }
      }

      formData.append("status", targetStatus);

      if (!editingItem) {
        formData.append("type", form.type);
        await createCampaign(formData);
        toast.success("Publicité créée avec succès.");
      } else {
        await updateCampaign(editingItem.id, formData);
        toast.success("Publicité modifiée avec succès.");
      }

      setCampaignsState((prev) => ({
        ...prev,
        isOpen: false,
        isSaving: false,
        campaignError: null,
        form: emptyCampaignForm,
        editingItem: null,
      }));
      await loadCampaigns();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Impossible d'enregistrer la publicité.";
      setCampaignsState((prev) => ({ ...prev, isSaving: false, campaignError: message }));
    }
  };

  const handleSuspendCampaign = async (id: string) => {
    try {
      await suspendCampaign(id);
      toast.success("Publicité suspendue avec succès.");
      void loadCampaigns();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de suspendre la publicité.");
    }
  };

  const removeCampaign = async (campaignId: string) => {
    try {
      await deleteCampaign(campaignId);
      setCampaignsState((prev) => ({
        ...prev,
        items: prev.items.filter((c) => c.id !== campaignId),
        total: Math.max(0, prev.total - 1),
      }));
      toast.success("Publicité supprimée avec succès.");
      void loadCampaigns();
    } catch (error) {
      console.error(error);
      toast.error("Impossible de supprimer la publicité.");
    }
  };

  const showCampaignHistory = async (campaign: CampaignOut) => {
    setHistoryState((prev) => ({
      ...prev,
      selectedCampaign: campaign,
      items: [],
      isLoading: true,
      isOpen: true,
    }));
    try {
      const res = await fetchCampaignHistory(campaign.id);
      setHistoryState((prev) => ({
        ...prev,
        items: res.history || [],
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger l'historique de cette publicité.");
    } finally {
      setHistoryState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  };

  const openCampaignDetails = async (id: string) => {
    const fromList = campaignsState.items.find((c) => c.id === id) || null;
    setDetailState({
      campaign: fromList,
      isLoading: true,
      isOpen: true,
    });
    try {
      const freshCampaign = await fetchCampaignById(id);
      setDetailState((prev) => ({
        ...prev,
        campaign: {
          ...freshCampaign,
          status: computeCampaignStatus(freshCampaign.date_debut, freshCampaign.date_fin, freshCampaign.status),
        },
      }));
    } catch (error) {
      console.error(error);
      toast.error("Impossible de récupérer les détails de la campagne.");
    } finally {
      setDetailState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  };

  const [hasLoadedMetadata, setHasLoadedMetadata] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (!hasLoadedMetadata) {
      setHasLoadedMetadata(true);
      void loadMetadata();
    }
  }, [enabled, hasLoadedMetadata, loadMetadata]);

  useEffect(() => {
    if (!enabled) return;
    if (activeSubTab === "notificationsList" && !hasLoadedNotifications) {
      setHasLoadedNotifications(true);
      void loadNotifications();
    }
  }, [enabled, activeSubTab, hasLoadedNotifications, loadNotifications]);

  useEffect(() => {
    if (!enabled) return;
    if (activeSubTab === "campaignsList") {
      void loadCampaigns();
    }
  }, [enabled, activeSubTab, loadCampaigns, campaignsState.page, campaignsState.filterStatus, campaignsState.filterType]);

  return {
    // Notifications
    notifications: notificationsState.items,
    isLoadingNotifications: notificationsState.isLoading,
    dialogNotificationOpen: notificationsState.isOpen,
    setDialogNotificationOpen: (open: boolean) => {
      if (!open) resetNotificationErrors();
      setNotificationsState((prev) => ({ ...prev, isOpen: open }));
    },
    notificationErrors,
    clearNotificationError,
    validateNotification,
    editingNotification: notificationsState.editingItem,
    notificationForm: notificationsState.form,
    setNotificationForm: (
      form:
        | NotificationFormState
        | ((prev: NotificationFormState) => NotificationFormState),
    ) => {
      setNotificationsState((prev) => ({
        ...prev,
        form: typeof form === "function" ? form(prev.form) : form,
      }));
    },
    loadNotifications,
    openAddNotification,
    openEditNotification,
    saveNotification,
    changeNotificationStatus,
    removeNotification,

    // Campaigns
    campaigns: campaignsState.items,
    isLoadingCampaigns: campaignsState.isLoading,
    isSavingCampaign: campaignsState.isSaving,
    dialogCampaignOpen: campaignsState.isOpen,
    setDialogCampaignOpen: (open: boolean) => {
      if (!open) resetCampaignErrors();
      setCampaignsState((prev) => ({
        ...prev,
        isOpen: open,
        campaignError: open ? prev.campaignError : null,
      }));
    },
    campaignErrors,
    clearCampaignError,
    validateCampaign,
    campaignError: campaignsState.campaignError,
    editingCampaign: campaignsState.editingItem,
    campaignForm: campaignsState.form,
    setCampaignForm: (
      form:
        | CampaignFormState
        | ((prev: CampaignFormState) => CampaignFormState),
    ) => {
      setCampaignsState((prev) => ({
        ...prev,
        form: typeof form === "function" ? form(prev.form) : form,
      }));
    },
    mediaTypes: metadataState.mediaTypes,
    targets: metadataState.targets,
    clientTypes: metadataState.clientTypes,
    transactionTypes: metadataState.transactionTypes,
    channels: metadataState.channels,
    agencesList: metadataState.agencesList,
    structuresList: metadataState.structuresList,
    isLoadingMetadata: metadataState.isLoading,
    campaignPage: campaignsState.page,
    setCampaignPage: (page: number | ((prev: number) => number)) => {
      setCampaignsState((prev) => ({
        ...prev,
        page: typeof page === "function" ? page(prev.page) : page,
      }));
    },
    campaignTotal: campaignsState.total,
    campaignLimit,
    filterStatus: campaignsState.filterStatus,
    setFilterStatus: (status: CampaignStatus | "all") => {
      setCampaignsState((prev) => ({ ...prev, filterStatus: status }));
    },
    filterType: campaignsState.filterType,
    setFilterType: (type: MediaType | "all") => {
      setCampaignsState((prev) => ({ ...prev, filterType: type }));
    },
    loadCampaigns,
    openAddCampaign,
    openEditCampaign,
    saveCampaignAction,
    handleSuspendCampaign,
    removeCampaign,

    // Campaign Details
    campaignDetail: detailState.campaign,
    isLoadingCampaignDetail: detailState.isLoading,
    dialogCampaignDetailOpen: detailState.isOpen,
    setDialogCampaignDetailOpen: (open: boolean) =>
      setDetailState((prev) => ({ ...prev, isOpen: open })),
    openCampaignDetails,

    // Campaign History
    campaignHistory: historyState.items,
    isLoadingHistory: historyState.isLoading,
    dialogHistoryOpen: historyState.isOpen,
    setDialogHistoryOpen: (open: boolean) =>
      setHistoryState((prev) => ({ ...prev, isOpen: open })),
    selectedCampaignForHistory: historyState.selectedCampaign,
    showCampaignHistory,
  };
};

export default useDiffusion;
