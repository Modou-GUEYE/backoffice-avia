import httpClient from "@/core/network/httpClient";
import { getPerimeterContextHeaders } from "@/core/security/useUserPerimeter";
import {
  TrackingEventDetail,
  TrackingEventListResponse,
  TrackingFilters,
} from "../models/types";

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: unknown } }).response?.data === "object"
  ) {
    const data = (error as { response?: { data?: Record<string, unknown> } }).response?.data ?? {};

    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const fetchTrackingEvents = async (
  filters?: TrackingFilters,
): Promise<TrackingEventListResponse> => {
  try {
    const queryParams: Record<string, string | number | undefined> = {};

    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          queryParams[key] = val;
        }
      });

    }

    queryParams.skip = filters?.skip ?? 0;
    queryParams.limit = filters?.limit ?? 50;

    const { data } = await httpClient.get<TrackingEventListResponse>(
      "/api/v1/tracking/events",
      { params: queryParams, headers: getPerimeterContextHeaders() },
    );

    return data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Impossible de charger les événements de tracking"),
    );
  }
};

export const fetchTrackingSources = async (): Promise<string[]> => {
  try {
    const { data } = await httpClient.get<string[]>(
      "/api/v1/tracking/events/sources",
      { headers: getPerimeterContextHeaders() },
    );

    return Array.isArray(data) ? data.filter((source) => typeof source === "string") : [];
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Impossible de charger les modules de tracking"),
    );
  }
};

export const fetchTrackingEventDetail = async (
  id: string,
): Promise<TrackingEventDetail> => {
  try {
    const { data } = await httpClient.get<TrackingEventDetail>(
      `/api/v1/tracking/events/${id}`,
      { headers: getPerimeterContextHeaders() },
    );
    return data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Impossible de récupérer le détail de l'événement"),
    );
  }
};

export const downloadTrackingExport = async (
  filters: TrackingFilters,
  format: "csv" | "xlsx" | "pdf" = "csv",
): Promise<void> => {
  const queryParams: Record<string, string | number> = { format };

  Object.entries(filters).forEach(([key, value]) => {
    if (key !== "skip" && key !== "limit" && value !== undefined && value !== null && value !== "") {
      queryParams[key] = value;
    }
  });

  try {
    const response = await httpClient.get<Blob>("/api/v1/tracking/events/export", {
      params: queryParams,
      responseType: "blob",
      headers: {
        ...getPerimeterContextHeaders(),
        Accept: format === "pdf"
          ? "application/pdf"
          : format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv",
      },
    });
    const contentDisposition = response.headers["content-disposition"] as string | undefined;
    const filenameMatch = contentDisposition
      ? /filename\*?=(?:UTF-8''|)?([^";]+)/i.exec(contentDisposition)
      : null;
    const filename = filenameMatch?.[1]
      ? decodeURIComponent(filenameMatch[1])
      : `export_tracking_audit_${new Date().toISOString().slice(0, 10)}.${format}`;
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Impossible d'exporter les événements de tracking"));
  }
};
