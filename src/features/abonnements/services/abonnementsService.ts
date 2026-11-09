import httpClient from "@/core/network/httpClient";
import {
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  SubscriptionResponse,
  ServiceResponse,
  ServicesListResponse,
} from "../models/types";

export const fetchSubscriptions = async (): Promise<SubscriptionResponse[]> => {
  const { data } = await httpClient.get<SubscriptionResponse[]>(
    "/api/v1/packages-services/subscriptions",
  );
  return data;
};

export const fetchSubscriptionById = async (id: string): Promise<SubscriptionResponse> => {
  const { data } = await httpClient.get<SubscriptionResponse>(
    `/api/v1/packages-services/subscriptions/${id}`,
  );
  return data;
};

export const createSubscription = async (
  payload: CreateSubscriptionRequest,
): Promise<SubscriptionResponse> => {
  const { data } = await httpClient.post<SubscriptionResponse>(
    "/api/v1/packages-services/subscriptions",
    payload,
  );
  return data;
};

export const updateSubscription = async (
  id: string,
  payload: UpdateSubscriptionRequest,
): Promise<SubscriptionResponse> => {
  const { data } = await httpClient.put<SubscriptionResponse>(
    `/api/v1/packages-services/subscriptions/${id}`,
    payload,
  );
  return data;
};

export const deleteSubscription = async (id: string): Promise<void> => {
  await httpClient.delete(`/api/v1/packages-services/subscriptions/${id}`);
};

export const fetchServices = async (): Promise<ServiceResponse[]> => {
  const { data } = await httpClient.get<ServicesListResponse>(
    "/api/v1/packages-services/services?page=1&page_size=100",
  );
  return data.items;
};

export const activateSubscription = async (id: string): Promise<SubscriptionResponse> => {
  const { data } = await httpClient.post<SubscriptionResponse>(
    `/api/v1/packages-services/subscriptions/${id}/activate`,
  );
  return data;
};

export const inactivateSubscription = async (id: string): Promise<SubscriptionResponse> => {
  const { data } = await httpClient.post<SubscriptionResponse>(
    `/api/v1/packages-services/subscriptions/${id}/inactivate`,
  );
  return data;
};

export const suspendSubscription = async (id: string): Promise<SubscriptionResponse> => {
  const { data } = await httpClient.post<SubscriptionResponse>(
    `/api/v1/packages-services/subscriptions/${id}/suspend`,
  );
  return data;
};

export const expireSubscription = async (id: string): Promise<SubscriptionResponse> => {
  const { data } = await httpClient.post<SubscriptionResponse>(
    `/api/v1/packages-services/subscriptions/${id}/expire`,
  );
  return data;
};
