import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, type AxiosResponse } from "axios";
import {
  bankingHttpClient,
  ConfigApiError,
  deleteDefaultEndpoint,
  deleteStructureBankingConfig,
  fetchBankingOperations,
  fetchDefaultBankingConfig,
  fetchStructureBankingConfig,
  updateBankingOperation,
  updateDefaultBankingConfig,
  updateStructureBankingConfig,
  deleteStructureEndpointOverride,
  fetchDefaultEndpoints,
  fetchStructureEndpoints,
  testStructureEndpoint,
  updateDefaultEndpoint,
  updateStructureEndpoint,
} from "./bankingService";

const WALLET = { params: { payment_method: "WALLET" } };

describe("bankingService - câblage par moyen de paiement", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("GET /structures/{id}/endpoints sans payment_method", async () => {
    const get = vi.spyOn(bankingHttpClient, "get").mockResolvedValueOnce({ data: [] });

    await fetchStructureEndpoints("struct-1");

    expect(get).toHaveBeenCalledWith("/structures/struct-1/endpoints", undefined);
  });

  it("GET /structures/{id}/endpoints avec payment_method", async () => {
    const get = vi.spyOn(bankingHttpClient, "get").mockResolvedValueOnce({ data: [] });

    await fetchStructureEndpoints("struct-1", "WALLET");

    expect(get).toHaveBeenCalledWith("/structures/struct-1/endpoints", {
      params: { payment_method: "WALLET" },
    });
  });

  it("PUT /structures/{id}/endpoints/{operation} avec payment_method", async () => {
    const put = vi.spyOn(bankingHttpClient, "put").mockResolvedValueOnce({ data: {} });
    const payload = { http_method: "POST", path: "/debit" };

    await updateStructureEndpoint("struct-1", "DEBIT", payload, "WALLET");

    expect(put).toHaveBeenCalledWith("/structures/struct-1/endpoints/DEBIT", payload, {
      params: { payment_method: "WALLET" },
    });
  });

  it("DELETE /structures/{id}/endpoints/{operation} avec payment_method", async () => {
    const del = vi.spyOn(bankingHttpClient, "delete").mockResolvedValueOnce({ data: undefined });

    await deleteStructureEndpointOverride("struct-1", "DEBIT", "WALLET");

    expect(del).toHaveBeenCalledWith("/structures/struct-1/endpoints/DEBIT", {
      params: { payment_method: "WALLET" },
    });
  });

  it("GET /defaults/endpoints avec ou sans payment_method", async () => {
    const get = vi.spyOn(bankingHttpClient, "get").mockResolvedValue({ data: [] });

    await fetchDefaultEndpoints();
    await fetchDefaultEndpoints("WALLET");

    expect(get).toHaveBeenNthCalledWith(1, "/defaults/endpoints", undefined);
    expect(get).toHaveBeenNthCalledWith(2, "/defaults/endpoints", WALLET);
  });

  it("PUT et DELETE /defaults/endpoints/{operation} avec payment_method", async () => {
    const put = vi.spyOn(bankingHttpClient, "put").mockResolvedValueOnce({ data: {} });
    const del = vi.spyOn(bankingHttpClient, "delete").mockResolvedValueOnce({ data: undefined });
    const payload = { http_method: "POST", path: "/debit" };

    await updateDefaultEndpoint("DEBIT", payload, "WALLET");
    await deleteDefaultEndpoint("DEBIT", "WALLET");

    expect(put).toHaveBeenCalledWith("/defaults/endpoints/DEBIT", payload, WALLET);
    expect(del).toHaveBeenCalledWith("/defaults/endpoints/DEBIT", WALLET);
  });

  it("POST /structures/{id}/endpoints/{operation}/test avec payment_method", async () => {
    const post = vi.spyOn(bankingHttpClient, "post").mockResolvedValueOnce({ data: { reachable: true } });

    await testStructureEndpoint("struct-1", "DEBIT", "WALLET");

    expect(post).toHaveBeenCalledWith("/structures/struct-1/endpoints/DEBIT/test", undefined, WALLET);
  });
});

describe("bankingService - connexion par backend", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("GET et PUT /defaults/connections/{backend}", async () => {
    const get = vi.spyOn(bankingHttpClient, "get").mockResolvedValueOnce({ data: {} });
    const put = vi.spyOn(bankingHttpClient, "put").mockResolvedValueOnce({ data: {} });
    const payload = { base_url: "https://pi-spi", auth_type: "NONE" as const };

    await fetchDefaultBankingConfig("PI_SPI");
    await updateDefaultBankingConfig("PI_SPI", payload);

    expect(get).toHaveBeenCalledWith("/defaults/connections/PI_SPI");
    expect(put).toHaveBeenCalledWith("/defaults/connections/PI_SPI", payload);
  });

  it("GET, PUT et DELETE /structures/{id}/connections/{backend}", async () => {
    const get = vi.spyOn(bankingHttpClient, "get").mockResolvedValueOnce({ data: {} });
    const put = vi.spyOn(bankingHttpClient, "put").mockResolvedValueOnce({ data: {} });
    const del = vi.spyOn(bankingHttpClient, "delete").mockResolvedValueOnce({ data: undefined });
    const payload = { base_url: "https://kyc", auth_type: "NONE" as const };

    await fetchStructureBankingConfig("struct-1", "KYC");
    await updateStructureBankingConfig("struct-1", "KYC", payload);
    await deleteStructureBankingConfig("struct-1", "KYC");

    expect(get).toHaveBeenCalledWith("/structures/struct-1/connections/KYC");
    expect(put).toHaveBeenCalledWith("/structures/struct-1/connections/KYC", payload);
    expect(del).toHaveBeenCalledWith("/structures/struct-1/connections/KYC");
  });

  it("GET /operations sans filtre backend imposé", async () => {
    const get = vi.spyOn(bankingHttpClient, "get").mockResolvedValue({ data: [] });

    await fetchBankingOperations();
    await fetchBankingOperations("KYC");

    expect(get).toHaveBeenNthCalledWith(1, "/operations", undefined);
    expect(get).toHaveBeenNthCalledWith(2, "/operations", { params: { backend: "KYC" } });
  });

  it("POST /operations en modification garde le backend de l'opération", async () => {
    const post = vi.spyOn(bankingHttpClient, "post").mockResolvedValueOnce({ data: {} });

    await updateBankingOperation("KYC_CHECK", { backend: "KYC", label: "KYC", direction: "READ" });

    expect(post).toHaveBeenCalledWith("/operations", { code: "KYC_CHECK", backend: "KYC", label: "KYC", direction: "READ" });
  });

  it("GET connexion d'une structure : garde le code métier de l'erreur (CONN_002)", async () => {
    const response = { status: 409, data: { code: "CONN_002", message: "La connexion résolue est désactivée" } } as AxiosResponse;
    vi.spyOn(bankingHttpClient, "get").mockRejectedValueOnce(new AxiosError("409", "ERR_BAD_REQUEST", undefined, undefined, response));

    const error = await fetchStructureBankingConfig("struct-1", "CORE_BANKING").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConfigApiError);
    expect((error as ConfigApiError).code).toBe("CONN_002");
  });
});
