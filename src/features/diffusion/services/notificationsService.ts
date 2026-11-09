import httpClient from "@/core/network/httpClient";
import { NotificationRead, NotificationCanal } from "../models/types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getNotificationErrorMessage = (error: unknown): string | null => {
  if (!isRecord(error)) return null;
  const response = isRecord(error.response) ? error.response : null;
  const data = response && isRecord(response.data) ? response.data : null;
  const message = data?.message;
  return typeof message === "string" && message.trim() ? message : null;
};

/** Notification telle que renvoyée par le backend (NotificationOut). */
type NotificationOut = {
  id: string;
  libelle?: string;
  transaction_type?: string;
  channel?: unknown;
  content_sender?: string | null;
  content_receiver?: string | null;
  status?: string;
  /** Présents lorsque le backend signale une erreur fonctionnelle (ex. conflit). */
  code?: string;
  message?: string;
};

// Helper to map backend NotificationOut to frontend NotificationRead
export const mapNotificationOutToRead = (out: NotificationOut): NotificationRead => {
  const channelArray = Array.isArray(out.channel) ? out.channel : [];
  const primaryChannel = channelArray[0] || "sms";
  const canal: NotificationCanal = primaryChannel === "email" ? "mail" : (primaryChannel as NotificationCanal);

  return {
    id: out.id,
    libelle: out.libelle || "",
    type_transaction: out.transaction_type || "",
    canal: canal,
    channel: channelArray,
    contenu_envoyeur: out.content_sender || "",
    contenu_destinataire: out.content_receiver || "",
    is_active: out.status === "active",
  };
};

// Helper to map frontend Partial<NotificationRead> to backend NotificationCreate / Update format
export const mapNotificationReadToCreate = (read: Partial<NotificationRead>) => {
  const channel = Array.isArray(read.channel) && read.channel.length > 0
    ? read.channel.map((c: string) => (c === "mail" ? "email" : c))
    : [read.canal === "mail" ? "email" : read.canal || "sms"];

  return {
    libelle: read.libelle,
    transaction_type: read.type_transaction,
    channel: channel,
    content_sender: read.contenu_envoyeur || null,
    content_receiver: read.contenu_destinataire || null,
  };
};

export const fetchTransactionTypes = async (): Promise<string[]> => {
  const { data } = await httpClient.get<string[]>("/api/v1/diffusion/notifications/transaction-types");
  return data;
};

export const fetchChannels = async (): Promise<string[]> => {
  const { data } = await httpClient.get<string[]>("/api/v1/diffusion/notifications/channels");
  return data;
};

export const fetchNotifications = async (): Promise<NotificationRead[]> => {
  const { data } = await httpClient.get<NotificationOut[] | { data?: NotificationOut[] }>("/api/v1/diffusion/notifications", {
    params: { limit: 100 },
  });
  const items = Array.isArray(data) ? data : (data?.data || []);
  return items.map(mapNotificationOutToRead);
};

export const createNotification = async (
  payload: Omit<NotificationRead, "id" | "is_active">,
): Promise<NotificationRead> => {
  try {
    const backendPayload = mapNotificationReadToCreate(payload);
    const { data } = await httpClient.post<NotificationOut>("/api/v1/diffusion/notifications", backendPayload);
    if (data?.code === "ERR_CONFLICT") {
      throw new Error(data.message || "Notification existante");
    }
    return mapNotificationOutToRead(data);
  } catch (error) {
    const backendMessage = getNotificationErrorMessage(error);
    if (backendMessage) {
      throw new Error(backendMessage);
    }
    throw error;
  }
};

export const updateNotification = async (
  id: string,
  payload: Partial<NotificationRead>,
): Promise<NotificationRead> => {
  const backendPayload = mapNotificationReadToCreate(payload);
  const { data } = await httpClient.put<NotificationOut>(
    `/api/v1/diffusion/notifications/${encodeURIComponent(id)}`,
    backendPayload,
  );
  return mapNotificationOutToRead(data);
};

export const deleteNotification = async (id: string): Promise<void> => {
  await httpClient.delete(`/api/v1/diffusion/notifications/${encodeURIComponent(id)}`);
};

export const toggleNotificationStatus = async (id: string, activate: boolean): Promise<NotificationRead> => {
  const status = activate ? "active" : "inactive";
  const { data } = await httpClient.patch<NotificationOut>(
    `/api/v1/diffusion/notifications/${encodeURIComponent(id)}/status`,
    { status },
  );
  return mapNotificationOutToRead(data);
};
