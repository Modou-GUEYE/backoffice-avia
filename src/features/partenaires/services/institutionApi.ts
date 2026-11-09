import { gatewayApiBaseUrl } from "@/core/network/apiGateway";

const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, "");

export const institutionApiUrl = (path: string): string => {
  if (!gatewayApiBaseUrl) {
    throw new Error("VITE_GATEWAY_BASE_URL est requis pour contacter l'API Gateway");
  }

  return `${trimTrailingSlashes(gatewayApiBaseUrl)}${path}`;
};
