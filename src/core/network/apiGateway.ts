const sanitizeBaseUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed === "/") {
    return "/";
  }
  return trimmed.replace(/\/$/, "");
};

export const gatewayApiBaseUrl = sanitizeBaseUrl(import.meta.env.VITE_GATEWAY_BASE_URL ?? "");

export const accessSecurityApiBaseUrl = gatewayApiBaseUrl;
