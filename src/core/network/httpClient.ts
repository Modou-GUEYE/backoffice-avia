import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { accessSecurityApiBaseUrl, gatewayApiBaseUrl } from "@/core/network/apiGateway";
import { useAuthStore } from "@/core/security/authStore";
import { notifySessionExpired } from "@/core/security/sessionManager";

export interface RetriableRequestConfig<T = unknown> extends InternalAxiosRequestConfig<T> {
  _retry?: boolean;
}

export const attachAuthorizationHeader = (config: AxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) {
    if (!config.headers) {
      config.headers = {};
    }
    const headers = config.headers as Record<string, unknown> & { set?: (key: string, val: string) => void };
    if (typeof headers.set === "function") {
      headers.set("Authorization", `Bearer ${token}`);
    } else {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
};

export const httpClient = axios.create({
  baseURL: gatewayApiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

const accessSecurityBaseUrl = accessSecurityApiBaseUrl;
let refreshPromise: Promise<string | null> | null = null;

export const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!accessSecurityBaseUrl || !refreshToken) {
    return null;
  }

  try {
    const refreshEndpoint =
      accessSecurityBaseUrl === "/"
        ? "/api/v1/security/tokens/refresh"
        : `${accessSecurityBaseUrl}/api/v1/security/tokens/refresh`;

    const response = await axios.post<{
      token_type: string;
      access_token: string;
      expires_in: number;
    }>(
      refreshEndpoint,
      { refresh_token: refreshToken },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const nextAccessToken = response.data.access_token;
    useAuthStore.getState().updateAccessToken({
      token: nextAccessToken,
      tokenType: response.data.token_type,
      expiresIn: response.data.expires_in,
    });
    return nextAccessToken;
  } catch {
    notifySessionExpired();
    return null;
  }
};

httpClient.interceptors.request.use((config) => {
  if (!gatewayApiBaseUrl) {
    throw new Error("VITE_GATEWAY_BASE_URL est requis pour contacter l'API Gateway");
  }

  attachAuthorizationHeader(config);

  if (config.url) {
    if (config.url.includes("/package-assignments")) {
      if (config.url.startsWith("/api/v1/organisation/structures")) {
        config.url = config.url.replace("/api/v1/organisation/structures", "/api/v1/packages-services/structures");
      } else if (config.url.startsWith("/api/v1/structures")) {
        config.url = config.url.replace("/api/v1/structures", "/api/v1/packages-services/structures");
      } else if (!config.url.startsWith("/api/v1/packages-services")) {
        config.url = config.url.replace("/api/v1", "/api/v1/packages-services");
      }
    } else if (config.url.startsWith("/enrollment")) {
      config.url = config.url.replace("/enrollment", "/api/v1/enrollment");
    } else if (
      !config.url.startsWith("/api/v1/packages-services") &&
      !config.url.startsWith("/api/v1/organisation")
    ) {
        const organisationPaths = [
          "/api/v1/administrations",
          "/api/v1/products",
          "/api/v1/structures",
          "/api/v1/agencies",
          "/api/v1/caisses",
          "/api/v1/distributors",
          "/api/v1/partners",
        ];
        const isOrganisationPath = organisationPaths.some((p) => config.url?.startsWith(p));
        if (isOrganisationPath) {
          config.url = config.url.replace("/api/v1", "/api/v1/organisation");
        } else {
          const packagesServicesPaths = [
            "/api/v1/packages",
            "/api/v1/services",
            "/api/v1/payment-methods",
            "/api/v1/service-categories",
            "/api/v1/workflows",
            "/api/v1/forms",
            "/api/v1/workflow-instances",
            "/api/v1/field-types",
            "/api/v1/field-definitions",
            "/api/v1/integrations",
          ];
          const isPackagesServicesPath = packagesServicesPaths.some((p) => config.url?.startsWith(p));
          if (isPackagesServicesPath) {
            config.url = config.url.replace("/api/v1", "/api/v1/packages-services");
          }
        }
      }
    }

  //Désactiver le caching pour les requêtes GET
  if (config.method?.toLowerCase() === "get") {
    config.headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
    config.headers["Pragma"] = "no-cache";
    config.headers["Expires"] = "0";
  }

  return config;
});

export const attachAuthResponseInterceptor = (instance: AxiosInstance) => {
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (!axios.isAxiosError(error) || !error.config) {
        throw error;
      }

      const originalRequest = error.config as RetriableRequestConfig;

      if (error.response?.status !== 401 || originalRequest._retry) {
        throw error;
      }

      originalRequest._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const nextAccessToken = await refreshPromise;
      if (!nextAccessToken) {
        notifySessionExpired();
        throw error;
      }

      if (!originalRequest.headers) {
        originalRequest.headers = new axios.AxiosHeaders();
      }
      originalRequest.headers.set("Authorization", `Bearer ${nextAccessToken}`);

      return instance(originalRequest);
    },
  );
};

attachAuthResponseInterceptor(httpClient);

export default httpClient;
