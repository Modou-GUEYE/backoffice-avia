import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AxiosResponse } from "axios";
import {
  buildPaymentMethodFormData,
  fetchPaymentMethods,
  fetchPaymentMethod,
  isTechnicalUser,
  type UpsertPaymentMethodPayload,
} from "./paymentMethodsService";
import { bankingHttpClient } from "@/features/connectivite/services/bankingService";
import httpClient from "@/core/network/httpClient";
import { useAuthStore } from "@/core/security/authStore";

describe("buildPaymentMethodFormData", () => {
  it("serializes arrays and appends logo file for multipart upload", () => {
    const payload: UpsertPaymentMethodPayload = {
      code: "MOBILE_MONEY",
      label: "Mobile Money",
      backend: "WALLET_ENGINE",
      kind: "WALLET",
      description: "Test",
      is_active: true,
      currencies: ["XOF", "EUR"],
      supported_operations: ["PAYIN", "PAYOUT"],
      min_kyc_tier: 2,
      loop_type: "OPEN",
    };

    const file = new File(["data"], "logo.png", { type: "image/png" });
    const formData = buildPaymentMethodFormData(payload, file);

    expect(formData.get("code")).toBe("MOBILE_MONEY");
    expect(formData.get("kind")).toBe("WALLET");
    expect(formData.get("currencies")).toBe(JSON.stringify(["XOF", "EUR"]));
    expect(formData.get("supported_operations")).toBe(JSON.stringify(["PAYIN", "PAYOUT"]));
    expect(formData.get("logo")).toBe(file);
  });
});

describe("fetchPaymentMethods by profile", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls bankingHttpClient (/api/v1/config/payment-methods) when user has Profil Technique", async () => {
    useAuthStore.setState({
      user: {
        email: "tech@example.com",
        role: "Profil Technique",
        entityContext: "Administration",
        permissions: ["profile.bo-profil-technique"],
      },
    });

    expect(isTechnicalUser()).toBe(true);

    const spyBanking = vi.spyOn(bankingHttpClient, "get").mockResolvedValue({
      data: [{ code: "tech_pm", label: "Tech PM", status: "active", id: "1" }],
    } as unknown as AxiosResponse);

    const spyHttp = vi.spyOn(httpClient, "get");

    const result = await fetchPaymentMethods();

    expect(spyBanking).toHaveBeenCalledWith("/payment-methods");
    expect(spyHttp).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("tech_pm");
  });

  it("calls httpClient (/api/v1/packages-services/payment-methods) when user has other profile", async () => {
    useAuthStore.setState({
      user: {
        email: "admin@example.com",
        role: "Administrateur",
        entityContext: "Administration",
        permissions: ["profile.bo-admin"],
      },
    });

    expect(isTechnicalUser()).toBe(false);

    const spyBanking = vi.spyOn(bankingHttpClient, "get");
    const spyHttp = vi.spyOn(httpClient, "get").mockResolvedValue({
      data: [{ code: "pkg_pm", label: "Pkg PM", status: "active", id: "2" }],
    } as unknown as AxiosResponse);

    const result = await fetchPaymentMethods();

    expect(spyHttp).toHaveBeenCalledWith("/api/v1/packages-services/payment-methods");
    expect(spyBanking).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("pkg_pm");
  });

  it("calls bankingHttpClient with code for detail when user has Profil Technique", async () => {
    useAuthStore.setState({
      user: {
        email: "tech@example.com",
        role: "Profil Technique",
        entityContext: "Administration",
        permissions: ["profile.bo-profil-technique"],
      },
    });

    const spyBanking = vi.spyOn(bankingHttpClient, "get").mockResolvedValue({
      data: { code: "WAVE", label: "Wave", status: "active", id: "uuid-123" },
    } as unknown as AxiosResponse);

    const spyHttp = vi.spyOn(httpClient, "get");

    const result = await fetchPaymentMethod({ code: "WAVE", id: "uuid-123" });

    expect(spyBanking).toHaveBeenCalledWith("/payment-methods/WAVE");
    expect(spyHttp).not.toHaveBeenCalled();
    expect(result.code).toBe("WAVE");
  });

  it("calls httpClient with payment_method_id for detail when user has other profile", async () => {
    useAuthStore.setState({
      user: {
        email: "admin@example.com",
        role: "Administrateur",
        entityContext: "Administration",
        permissions: ["profile.bo-admin"],
      },
    });

    const spyBanking = vi.spyOn(bankingHttpClient, "get");
    const spyHttp = vi.spyOn(httpClient, "get").mockResolvedValue({
      data: { code: "WAVE", label: "Wave", status: "active", id: "uuid-123" },
    } as unknown as AxiosResponse);

    const result = await fetchPaymentMethod({ code: "WAVE", id: "uuid-123" });

    expect(spyHttp).toHaveBeenCalledWith("/api/v1/packages-services/payment-methods/uuid-123");
    expect(spyBanking).not.toHaveBeenCalled();
    expect(result.id).toBe("uuid-123");
  });

  it("correctly maps uppercase status 'ACTIVE' without is_active to 'active'", async () => {
    useAuthStore.setState({
      user: {
        email: "admin@example.com",
        role: "Administrateur",
        entityContext: "Administration",
        permissions: ["profile.bo-admin"],
      },
    });

    vi.spyOn(httpClient, "get").mockResolvedValue({
      data: [
        { code: "BANK_ACCOUNT", label: "Compte bancaire", status: "ACTIVE", id: "1" },
        { code: "WALLET", label: "Wave digital finance", status: "ACTIVE", id: "2" },
      ],
    } as unknown as AxiosResponse);

    const result = await fetchPaymentMethods();
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe("active");
    expect(result[1].status).toBe("active");
  });
});

