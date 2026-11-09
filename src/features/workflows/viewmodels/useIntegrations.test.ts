import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIntegrations } from "./useIntegrations";
import * as integrationsService from "../services/integrationsService";
import { IntegrationItem, ImportOperationCandidate } from "../models/workflowsTypes";

vi.mock("../services/integrationsService", () => ({
  fetchIntegrations: vi.fn(),
  fetchActiveIntegrations: vi.fn(),
  getIntegration: vi.fn(),
  createIntegration: vi.fn(),
  patchIntegration: vi.fn(),
  deleteIntegration: vi.fn(),
  fetchIntegrationOperations: vi.fn(),
  getIntegrationOperation: vi.fn(),
  createIntegrationOperation: vi.fn(),
  patchIntegrationOperation: vi.fn(),
  deleteIntegrationOperation: vi.fn(),
  importOperationPreview: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useIntegrations - OpenAPI Import Flow", () => {
  const mockIntegration: IntegrationItem = {
    id: "integ-1",
    key: "fin-service",
    label: "Service Financier",
    base_url: "http://financial-api:8080",
    active: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(integrationsService.fetchIntegrations).mockResolvedValue([mockIntegration]);
    vi.mocked(integrationsService.fetchIntegrationOperations).mockResolvedValue([]);
  });

  it("handleOpenImportOperation initialise l'état d'import et ouvre la modale", async () => {
    const { result } = renderHook(() => useIntegrations());

    act(() => {
      result.current.handleSelectIntegration(mockIntegration);
    });

    act(() => {
      result.current.handleOpenImportOperation();
    });

    expect(result.current.showImportDialog).toBe(true);
    expect(result.current.importFile).toBeNull();
    expect(result.current.importCandidates).toEqual([]);
    expect(result.current.selectedCandidate).toBeNull();
  });

  it("handleSelectImportFile réinitialise les candidats précédents si le fichier change", async () => {
    const { result } = renderHook(() => useIntegrations());

    const file1 = new File(["dummy"], "file1.yaml", { type: "text/yaml" });
    const file2 = new File(["dummy"], "file2.json", { type: "application/json" });

    act(() => {
      result.current.handleSelectImportFile(file1);
    });
    expect(result.current.importFile).toBe(file1);

    act(() => {
      result.current.handleSelectImportFile(file2);
    });
    expect(result.current.importFile).toBe(file2);
    expect(result.current.importCandidates).toEqual([]);
    expect(result.current.selectedCandidate).toBeNull();
  });

  it("handleAnalyzeImportFile bloque les fichiers de plus de 2 MiB", async () => {
    const { result } = renderHook(() => useIntegrations());

    act(() => {
      result.current.handleSelectIntegration(mockIntegration);
    });

    // Create file > 2 MiB (2097153 bytes)
    const largeFile = new File([new ArrayBuffer(2097153)], "large.json", { type: "application/json" });

    await act(async () => {
      await result.current.handleSelectImportFile(largeFile);
    });

    expect(result.current.importAnalysisError).toContain("dépasse la limite autorisée de 2 MiB");
    expect(integrationsService.importOperationPreview).not.toHaveBeenCalled();
  });

  it("handleSelectImportFile bloque les fichiers vides automatiquement", async () => {
    const { result } = renderHook(() => useIntegrations());

    act(() => {
      result.current.handleSelectIntegration(mockIntegration);
    });

    const emptyFile = new File([], "empty.json", { type: "application/json" });

    await act(async () => {
      await result.current.handleSelectImportFile(emptyFile);
    });

    expect(result.current.importAnalysisError).toContain("vide");
    expect(integrationsService.importOperationPreview).not.toHaveBeenCalled();
  });

  it("handleSelectImportFile analyse et récupère automatiquement les opérations candidates", async () => {
    const mockCandidates: ImportOperationCandidate[] = [
      {
        key: "calculate_fee",
        label: "Calculer les frais",
        method: "GET",
        relative_path: "/fees/calculate",
        request_schema: { type: "object" },
        response_schema: { type: "object" },
        response_options: [{ status_code: "200", response_schema: { type: "object" } }],
        requires_response_selection: false,
        warnings: [],
        errors: [],
      },
    ];

    vi.mocked(integrationsService.importOperationPreview).mockResolvedValueOnce({
      operations: mockCandidates,
    });

    const { result } = renderHook(() => useIntegrations());

    act(() => {
      result.current.handleSelectIntegration(mockIntegration);
    });

    const validFile = new File(["valid"], "spec.yaml", { type: "text/yaml" });

    await act(async () => {
      await result.current.handleSelectImportFile(validFile);
    });

    expect(result.current.importCandidates).toHaveLength(1);
    expect(result.current.importCandidates[0].key).toBe("calculate_fee");
    expect(result.current.importAnalysisError).toBeNull();
  });

  it("handleConfirmUseCandidate crée directement l'opération importée avec les réglages par défaut", async () => {
    const mockCandidate: ImportOperationCandidate = {
      key: "calculate_fee",
      label: "Calculer les frais",
      method: "GET",
      relative_path: "/fees/calculate",
      request_schema: { type: "object", properties: { amount: { type: "number" } } },
      response_schema: { type: "object", properties: { fee: { type: "number" } } },
      response_options: [{ status_code: "200", response_schema: { type: "object" } }],
      requires_response_selection: false,
      warnings: [],
      errors: [],
    };
    const created = { id: "op-1", key: "calculate_fee", label: "Calculer les frais" };
    vi.mocked(integrationsService.createIntegrationOperation).mockResolvedValue(created as never);

    const { result } = renderHook(() => useIntegrations());

    act(() => {
      result.current.handleSelectIntegration(mockIntegration);
      result.current.handleSelectCandidate(mockCandidate);
    });

    await act(async () => {
      await result.current.handleConfirmUseCandidate();
    });

    expect(integrationsService.createIntegrationOperation).toHaveBeenCalledWith(
      "integ-1",
      expect.objectContaining({
        key: "calculate_fee",
        label: "Calculer les frais",
        method: "GET",
        relative_path: "/fees/calculate",
        completion_mode: "IMMEDIATE",
        authorization_mode: "NONE",
        request_schema: mockCandidate.request_schema,
        response_schema: mockCandidate.response_schema,
        active: true,
      })
    );
    expect(result.current.operations[0]).toEqual(created);
    expect(result.current.showImportDialog).toBe(false);
    expect(result.current.showOperationDialog).toBe(false);
  });

  it("handleConfirmUseCandidate utilise le schéma du code de réponse sélectionné", async () => {
    const mockCandidate: ImportOperationCandidate = {
      key: "new_op",
      label: "Nouvelle op",
      method: "POST",
      relative_path: "/test",
      request_schema: null,
      response_schema: null,
      response_options: [
        { status_code: "200", response_schema: { type: "object", title: "ok" } },
        { status_code: "202", response_schema: null },
      ],
      requires_response_selection: true,
      warnings: [],
      errors: [],
    };
    vi.mocked(integrationsService.createIntegrationOperation).mockResolvedValue({ id: "op-2" } as never);

    const { result } = renderHook(() => useIntegrations());

    act(() => {
      result.current.handleSelectIntegration(mockIntegration);
      result.current.handleSelectCandidate(mockCandidate);
    });
    act(() => {
      result.current.setSelectedResponseCode("200");
    });

    await act(async () => {
      await result.current.handleConfirmUseCandidate();
    });

    expect(integrationsService.createIntegrationOperation).toHaveBeenCalledWith(
      "integ-1",
      expect.objectContaining({ response_schema: { type: "object", title: "ok" } })
    );
  });

  it("réinitialise le contexte d'import quand l'intégration sélectionnée change", async () => {
    const { result } = renderHook(() => useIntegrations());

    act(() => {
      result.current.handleSelectIntegration(mockIntegration);
      result.current.handleSelectImportFile(new File(["a"], "a.json"));
    });

    expect(result.current.importFile).not.toBeNull();

    // Change integration
    const secondIntegration: IntegrationItem = {
      id: "integ-2",
      key: "other",
      label: "Autre",
      base_url: "http://other",
      active: true,
    };

    act(() => {
      result.current.handleSelectIntegration(secondIntegration);
    });

    expect(result.current.importFile).toBeNull();
    expect(result.current.importCandidates).toEqual([]);
    expect(result.current.selectedCandidate).toBeNull();
  });
});
