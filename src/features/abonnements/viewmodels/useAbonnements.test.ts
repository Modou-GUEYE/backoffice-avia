import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAbonnements, validateSubscriptionForm, SubscriptionFormState } from "./useAbonnements";
import * as abonnementsService from "../services/abonnementsService";
import * as structuresService from "@/features/structures/services/structuresService";
import type { FetchStructuresResult, StructureRead } from "@/features/structures/models/types";
import { useAuthStore } from "@/core/security/authStore";

vi.mock("../services/abonnementsService");
vi.mock("@/features/structures/services/structuresService");

const emptyStructures: FetchStructuresResult = Object.assign([], {
  items: [],
  total: 0,
  summary: { total: 0, actifs: 0, inactifs: 0 },
});

describe("useAbonnements - openCreate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with empty service_ids by default when openCreate is called", async () => {
    const mockServices = [
      { id: "srv-1", label: "Virement A2A", code: "VIREMENT", description: null, category_id: null, status: "ACTIVE" },
      { id: "srv-2", label: "Paiement Facture 2", code: "BILL_PAYMENT_02", description: null, category_id: null, status: "INACTIVE" },
      { id: "srv-3", label: "Paiement Facture", code: "BILL_PAYMENT", description: null, category_id: null, status: "ACTIVE" },
    ];

    vi.spyOn(abonnementsService, "fetchSubscriptions").mockResolvedValue([]);
    vi.spyOn(abonnementsService, "fetchServices").mockResolvedValue(mockServices);
    vi.spyOn(structuresService, "fetchStructures").mockResolvedValue(emptyStructures);

    const { result } = renderHook(() => useAbonnements());

    // Wait for initial load
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.services).toEqual(mockServices);

    // Call openCreate
    act(() => {
      result.current.openCreate();
    });

    expect(result.current.formOpen).toBe(true);
    expect(result.current.isEdit).toBe(false);
    // User checks the features to restrict, so service_ids starts empty
    expect(result.current.form.service_ids).toEqual([]);
  });

  it("sends checked active services directly when calling handleCreate", async () => {
    const mockServices = [
      { id: "srv-1", label: "Virement A2A", code: "VIREMENT", description: null, category_id: null, status: "ACTIVE" },
      { id: "srv-2", label: "Inactive Srv", code: "INACT", description: null, category_id: null, status: "INACTIVE" },
      { id: "srv-3", label: "Paiement Facture", code: "BILL_PAYMENT", description: null, category_id: null, status: "ACTIVE" },
    ];

    vi.spyOn(abonnementsService, "fetchSubscriptions").mockResolvedValue([]);
    vi.spyOn(abonnementsService, "fetchServices").mockResolvedValue(mockServices);
    vi.spyOn(structuresService, "fetchStructures").mockResolvedValue(emptyStructures);
    const createSubSpy = vi.spyOn(abonnementsService, "createSubscription").mockResolvedValue({} as Awaited<ReturnType<typeof abonnementsService.createSubscription>>);

    const { result } = renderHook(() => useAbonnements());

    await act(async () => {
      await result.current.refresh();
    });

    act(() => {
      result.current.openCreate();
      result.current.setForm((prev) => ({
        ...prev,
        label: "Mon abonnement",
        amount: "1000",
        structure_id: "struct-1",
        service_ids: ["srv-1", "srv-2"], // srv-2 is INACTIVE
      }));
    });

    await act(async () => {
      await result.current.handleCreate();
    });

    expect(createSubSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        service_ids: ["srv-1"], // only active checked services are sent
      }),
    );
  });

  it("loads sub.service_ids directly into form when openEdit is called", async () => {
    const mockServices = [
      { id: "srv-1", label: "Virement A2A", code: "VIREMENT", description: null, category_id: null, status: "ACTIVE" },
      { id: "srv-2", label: "Inactive Srv", code: "INACT", description: null, category_id: null, status: "INACTIVE" },
      { id: "srv-3", label: "Paiement Facture", code: "BILL_PAYMENT", description: null, category_id: null, status: "ACTIVE" },
    ];

    vi.spyOn(abonnementsService, "fetchSubscriptions").mockResolvedValue([]);
    vi.spyOn(abonnementsService, "fetchServices").mockResolvedValue(mockServices);
    vi.spyOn(structuresService, "fetchStructures").mockResolvedValue(emptyStructures);

    const { result } = renderHook(() => useAbonnements());

    await act(async () => {
      await result.current.refresh();
    });

    const mockSub = {
      id: "sub-1",
      label: "Sub 1",
      amount: "5000",
      periodicity: "MONTHLY" as const,
      status: "ACTIVE" as const,
      structure_id: "struct-1",
      service_ids: ["srv-3"],
      description: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      expires_at: null,
    };

    act(() => {
      result.current.openEdit(mockSub);
    });

    expect(result.current.isEdit).toBe(true);
    expect(result.current.form.service_ids).toEqual(["srv-3"]);
  });
});

describe("validateSubscriptionForm", () => {
  const validForm: SubscriptionFormState = {
    label: "Premium",
    amount: "5000",
    periodicity: "MONTHLY",
    service_ids: [],
    structure_id: "struct-1",
    description: "",
    status: "ACTIVE",
    expires_at: "",
  };

  it("ne renvoie aucune erreur pour un formulaire complet", () => {
    expect(validateSubscriptionForm(validForm)).toEqual({});
  });

  it("renvoie toutes les erreurs des champs obligatoires manquants", () => {
    expect(
      validateSubscriptionForm({
        ...validForm,
        label: " ",
        amount: "",
        structure_id: "",
        periodicity: "" as SubscriptionFormState["periodicity"],
      }),
    ).toEqual({
      label: "Le libellé est obligatoire",
      structure_id: "La structure cible est obligatoire",
      periodicity: "La périodicité est obligatoire",
      amount: "Le tarif est obligatoire",
    });
  });

  it("rejette un tarif nul, négatif ou non numérique", () => {
    for (const amount of ["0", "-10", "abc"]) {
      expect(validateSubscriptionForm({ ...validForm, amount }).amount).toBe("Veuillez saisir un tarif valide");
    }
  });
});

describe("useAbonnements - périmètre structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null });
  });

  it("impose sa propre structure à un utilisateur de structure", async () => {
    useAuthStore.setState({
      user: {
        email: "admin.structure@example.com",
        role: "Administrateur",
        entityContext: "Structure",
        institutionId: "struct-1",
        institutionLabel: "Structure 1",
      },
    });
    const structures = [
      { id: "struct-1", name: "Structure 1" },
      { id: "struct-2", name: "Structure 2" },
    ] as StructureRead[];
    vi.spyOn(abonnementsService, "fetchSubscriptions").mockResolvedValue([]);
    vi.spyOn(abonnementsService, "fetchServices").mockResolvedValue([]);
    vi.spyOn(structuresService, "fetchStructures").mockResolvedValue(
      Object.assign(structures, { items: structures, total: 2, summary: { total: 2, actifs: 2, inactifs: 0 } }),
    );

    const { result } = renderHook(() => useAbonnements());
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.structureLocked).toBe(true);
    expect(result.current.structureOptions.map((s) => s.id)).toEqual(["struct-1"]);

    act(() => {
      result.current.openCreate();
    });
    expect(result.current.form.structure_id).toBe("struct-1");
  });

  it("laisse toutes les structures à un administrateur back-office", async () => {
    useAuthStore.setState({
      user: { email: "admin@example.com", role: "Administrateur", entityContext: "Administration" },
    });
    vi.spyOn(abonnementsService, "fetchSubscriptions").mockResolvedValue([]);
    vi.spyOn(abonnementsService, "fetchServices").mockResolvedValue([]);
    vi.spyOn(structuresService, "fetchStructures").mockResolvedValue(emptyStructures);

    const { result } = renderHook(() => useAbonnements());
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.structureLocked).toBe(false);
  });
});
