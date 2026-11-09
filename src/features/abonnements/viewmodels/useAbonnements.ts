import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  SubscriptionResponse,
  ServiceResponse,
  SubscriptionPeriodicity,
  SubscriptionStatus,
} from "../models/types";
import {
  fetchSubscriptions,
  fetchSubscriptionById,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  fetchServices,
  activateSubscription,
  inactivateSubscription,
  suspendSubscription,
  expireSubscription,
} from "../services/abonnementsService";
import { fetchStructures } from "@/features/structures/services/structuresService";
import { useUserPerimeter } from "@/core/security/useUserPerimeter";
import { StructureRead } from "@/features/structures/models/types";
import httpClient from "@/core/network/httpClient";
import { FieldErrors, hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";

export interface SubscriptionFormState {
  label: string;
  amount: string;
  periodicity: SubscriptionPeriodicity;
  service_ids: string[];
  structure_id: string;
  description: string;
  status: SubscriptionStatus;
  expires_at: string;
}

const initialFormState: SubscriptionFormState = {
  label: "",
  amount: "",
  periodicity: "MONTHLY",
  service_ids: [],
  structure_id: "",
  description: "",
  status: "ACTIVE",
  expires_at: "",
};

export type SubscriptionFormField = "label" | "structure_id" | "periodicity" | "amount";

/** Valide le formulaire d'abonnement et renvoie toutes les erreurs, par champ. */
export const validateSubscriptionForm = (
  form: SubscriptionFormState,
): FieldErrors<SubscriptionFormField> => {
  const errors: FieldErrors<SubscriptionFormField> = {};
  if (!form.label.trim()) errors.label = "Le libellé est obligatoire";
  if (!form.structure_id) errors.structure_id = "La structure cible est obligatoire";
  if (!form.periodicity) errors.periodicity = "La périodicité est obligatoire";
  if (!form.amount.trim()) {
    errors.amount = "Le tarif est obligatoire";
  } else {
    const amountNum = parseFloat(form.amount);
    if (isNaN(amountNum) || amountNum <= 0) errors.amount = "Veuillez saisir un tarif valide";
  }
  return errors;
};

const arraysEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, index) => val === sortedB[index]);
};

type ApiErrorLike = {
  response?: { data?: { detail?: unknown; message?: string } };
  message?: string;
};

const formatApiError = (err: unknown, fallback: string): string => {
  const apiErr = err as ApiErrorLike | null | undefined;
  const detail = apiErr?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d: { msg?: string; message?: string } | null | undefined) => d?.msg || d?.message || JSON.stringify(d))
      .join(", ");
  }
  if (detail && typeof detail === "object") {
    if ("message" in detail && typeof detail.message === "string") {
      return detail.message;
    }
    return JSON.stringify(detail);
  }
  return apiErr?.response?.data?.message || apiErr?.message || fallback;
};

export const useAbonnements = () => {
  const [listState, setListState] = useState({
    subscriptions: [] as SubscriptionResponse[],
    services: [] as ServiceResponse[],
    structures: [] as StructureRead[],
    loading: false,
    actionLoading: false,
    error: null as string | null,
  });

  const [formState, setFormState] = useState({
    formOpen: false,
    isEdit: false,
    editingId: null as string | null,
    form: initialFormState as SubscriptionFormState,
  });

  const { subscriptions, services, structures, loading, actionLoading, error } = listState;

  // Un utilisateur rattaché à une structure ne peut cibler que sa propre structure
  const perimeter = useUserPerimeter();
  const enforcedStructureId = perimeter.enforcedStructureId;
  const structureOptions = useMemo(() => {
    if (!enforcedStructureId) return structures;
    const own = structures.filter((s) => s.id === enforcedStructureId);
    return own.length > 0
      ? own
      : [{ id: enforcedStructureId, name: perimeter.enforcedStructureLabel || enforcedStructureId } as StructureRead];
  }, [structures, enforcedStructureId, perimeter.enforcedStructureLabel]);
  const { formOpen, isEdit, editingId, form } = formState;
  const {
    errors: formErrors,
    setErrors: setFormErrors,
    clearError: clearFormError,
    resetErrors: resetFormErrors,
  } = useFieldErrors<SubscriptionFormField>();

  const setSubscriptions = (next: SubscriptionResponse[] | ((prev: SubscriptionResponse[]) => SubscriptionResponse[])) =>
    setListState((prev) => ({
      ...prev,
      subscriptions: typeof next === "function" ? next(prev.subscriptions) : next,
    }));

  const setServices = (next: ServiceResponse[] | ((prev: ServiceResponse[]) => ServiceResponse[])) =>
    setListState((prev) => ({
      ...prev,
      services: typeof next === "function" ? next(prev.services) : next,
    }));

  const setStructures = (next: StructureRead[] | ((prev: StructureRead[]) => StructureRead[])) =>
    setListState((prev) => ({
      ...prev,
      structures: typeof next === "function" ? next(prev.structures) : next,
    }));

  const setLoading = (val: boolean) => setListState((prev) => ({ ...prev, loading: val }));
  const setActionLoading = (val: boolean) => setListState((prev) => ({ ...prev, actionLoading: val }));
  const setError = (val: string | null) => setListState((prev) => ({ ...prev, error: val }));

  const setFormOpen = (open: boolean) => {
    resetFormErrors();
    setFormState((prev) => ({ ...prev, formOpen: open }));
  };
  const setIsEdit = (isEdit: boolean) => setFormState((prev) => ({ ...prev, isEdit }));
  const setEditingId = (id: string | null) => setFormState((prev) => ({ ...prev, editingId: id }));
  const setForm = (nextForm: SubscriptionFormState | ((prev: SubscriptionFormState) => SubscriptionFormState)) =>
    setFormState((prev) => ({
      ...prev,
      form: typeof nextForm === "function" ? nextForm(prev.form) : nextForm,
    }));
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subsData, servicesData, structuresData] = await Promise.all([
        fetchSubscriptions(),
        fetchServices(),
        fetchStructures(),
      ]);
      setSubscriptions(Array.isArray(subsData) ? subsData : []);
      setServices(Array.isArray(servicesData) ? servicesData : []);
      setStructures(Array.isArray(structuresData) ? structuresData.filter((s) => !s.is_deleted) : []);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les abonnements et les services");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const withEnforcedStructure = (value: SubscriptionFormState): SubscriptionFormState =>
    enforcedStructureId ? { ...value, structure_id: enforcedStructureId } : value;

  const openCreate = () => {
    setIsEdit(false);
    setEditingId(null);
    setForm({
      ...initialFormState,
      service_ids: [],
      structure_id: enforcedStructureId ?? "",
    });
    setFormOpen(true);
  };

  const openEdit = (sub: SubscriptionResponse) => {
    setIsEdit(true);
    setEditingId(sub.id);
    const activeServiceIds = (services || [])
      .filter((s) => s.status?.toUpperCase() === "ACTIVE")
      .map((s) => s.id);
    setForm({
      label: sub.label,
      amount: sub.amount,
      periodicity: sub.periodicity,
      service_ids: (sub.service_ids || []).filter((id) => activeServiceIds.includes(id)),
      structure_id: sub.structure_id || "",
      description: sub.description || "",
      status: sub.status,
      expires_at: sub.expires_at ? sub.expires_at.split("T")[0] : "",
    });
    setFormOpen(true);
  };

  const handleCreate = async () => {
    const activeServiceIds = (services || [])
      .filter((s) => s.status?.toUpperCase() === "ACTIVE")
      .map((s) => s.id);
    // On envoie directement les fonctionnalités cochées
    const cleanServiceIds = form.service_ids.filter((id) => activeServiceIds.includes(id));

    const validationErrors = validateSubscriptionForm(withEnforcedStructure(form));
    setFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    const amountNum = parseFloat(form.amount);

    // Duplicate check
    const isDuplicate = subscriptions.some(
      (s) =>
        s.label.trim().toLowerCase() === form.label.trim().toLowerCase() &&
        parseFloat(s.amount) === amountNum &&
        s.periodicity === form.periodicity &&
        arraysEqual(s.service_ids || [], cleanServiceIds),
    );

    if (isDuplicate) {
      toast.error(
        "Un abonnement identique existe déjà (même libellé, tarif, périodicité et fonctionnalités)",
      );
      return;
    }

    setActionLoading(true);
    try {
      await createSubscription({
        structure_id: enforcedStructureId ?? form.structure_id,
        label: form.label,
        description: form.description || null,
        periodicity: form.periodicity,
        amount: amountNum,
        status: form.status,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        service_ids: cleanServiceIds,
      });
      toast.success("Abonnement créé avec succès");
      setFormOpen(false);
      loadData();
    } catch (err) {
      toast.error(formatApiError(err, "Erreur lors de la création de l'abonnement"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;

    const activeServiceIds = (services || [])
      .filter((s) => s.status?.toUpperCase() === "ACTIVE")
      .map((s) => s.id);
    // On envoie directement les fonctionnalités cochées
    const cleanServiceIds = form.service_ids.filter((id) => activeServiceIds.includes(id));

    const validationErrors = validateSubscriptionForm(withEnforcedStructure(form));
    setFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    const amountNum = parseFloat(form.amount);

    // Duplicate check (excluding current item)
    const isDuplicate = subscriptions.some(
      (s) =>
        s.id !== editingId &&
        s.label.trim().toLowerCase() === form.label.trim().toLowerCase() &&
        parseFloat(s.amount) === amountNum &&
        s.periodicity === form.periodicity &&
        arraysEqual(s.service_ids || [], cleanServiceIds),
    );

    if (isDuplicate) {
      toast.error(
        "Un abonnement identique existe déjà (même libellé, tarif, périodicité et fonctionnalités)",
      );
      return;
    }

    setActionLoading(true);
    try {
      await updateSubscription(editingId, {
        structure_id: enforcedStructureId ?? form.structure_id,
        label: form.label,
        description: form.description || null,
        periodicity: form.periodicity,
        amount: amountNum,
        status: form.status,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        service_ids: cleanServiceIds,
      });
      toast.success("Abonnement modifié avec succès");
      setFormOpen(false);
      loadData();
    } catch (err) {
      toast.error(formatApiError(err, "Erreur lors de la modification de l'abonnement"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(true);
    try {
      await deleteSubscription(id);
      toast.success("Abonnement supprimé avec succès");
      loadData();
    } catch (err) {
      toast.error(formatApiError(err, "Erreur lors de la suppression de l'abonnement"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: SubscriptionStatus) => {
    setActionLoading(true);
    try {
      if (status === "ACTIVE") {
        await activateSubscription(id);
      } else if (status === "INACTIVE") {
        await inactivateSubscription(id);
      } else if (status === "SUSPENDED") {
        await suspendSubscription(id);
      } else if (status === "EXPIRED") {
        await expireSubscription(id);
      }
      toast.success("Statut de l'abonnement mis à jour");
      loadData();
    } catch (err) {
      toast.error(formatApiError(err, "Erreur lors de la mise à jour du statut"));
    } finally {
      setActionLoading(false);
    }
  };

  const getSubscriptionById = async (id: string): Promise<SubscriptionResponse | null> => {
    try {
      return await fetchSubscriptionById(id);
    } catch (err) {
      console.error(err);
      toast.error(formatApiError(err, "Erreur lors de la récupération des détails de l'abonnement"));
      return null;
    }
  };

  return {
    subscriptions,
    services,
    structures,
    structureOptions,
    structureLocked: Boolean(enforcedStructureId),
    loading,
    actionLoading,
    error,
    formOpen,
    setFormOpen,
    isEdit,
    form,
    setForm,
    formErrors,
    clearFormError,
    openCreate,
    openEdit,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleStatusChange,
    getSubscriptionById,
    refresh: loadData,
  };
};
