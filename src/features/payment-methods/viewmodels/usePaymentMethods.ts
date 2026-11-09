import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  PaymentMethodResponse,
  PaymentMethodFormState,
  BankingBackendType,
  MethodKind,
  LoopType,
  UpsertPaymentMethodPayload,
} from "../models/types";
import {
  fetchPaymentMethods,
  fetchPaymentMethod,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  togglePaymentMethodStatus,
} from "../services/paymentMethodsService";
import { FieldErrors, hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";

export type PaymentMethodFormField = "code" | "label" | "backend" | "kind";

/** Valide le formulaire moyen de paiement et renvoie toutes les erreurs, par champ. */
export const validatePaymentMethodForm = (
  form: PaymentMethodFormState,
): FieldErrors<PaymentMethodFormField> => {
  const errors: FieldErrors<PaymentMethodFormField> = {};
  if (!form.code.trim()) errors.code = "Le code est obligatoire";
  if (!form.label.trim()) errors.label = "Le libellé est obligatoire";
  if (!form.backend) errors.backend = "Le backend technique est obligatoire";
  if (!form.kind) errors.kind = "Le type de moyen de paiement (Kind) est obligatoire";
  return errors;
};

const initialFormState: PaymentMethodFormState = {
  code: "",
  label: "",
  description: "",
  backend: "CORE_BANKING",
  kind: "BANK_ACCOUNT",
  is_active: true,
  currencies: "",
  loop_type: "" as LoopType | "",
  min_kyc_tier: 0,
  settlement_account_ref: "",
  supported_operations: "",
  logo_media_id: "",
  logo_file: null,
  logo_preview_url: "",
};

export const usePaymentMethods = () => {
  const [items, setItems] = useState<PaymentMethodResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dialogOpen, setDialogOpenState] = useState<boolean>(false);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<PaymentMethodResponse | null>(null);
  const [viewingItem, setViewingItem] = useState<PaymentMethodResponse | null>(null);
  const [form, setForm] = useState<PaymentMethodFormState>(initialFormState);
  const {
    errors: formErrors,
    setErrors: setFormErrors,
    clearError: clearFormError,
    resetErrors: resetFormErrors,
  } = useFieldErrors<PaymentMethodFormField>();

  const setDialogOpen = useCallback(
    (open: boolean) => {
      resetFormErrors();
      setDialogOpenState(open);
    },
    [resetFormErrors],
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchPaymentMethods();
      setItems(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger les moyens de paiement");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetForm = () => {
    setForm(initialFormState);
    setEditingItem(null);
    resetFormErrors();
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (pm: PaymentMethodResponse) => {
    setEditingItem(pm);
    setForm({
      code: pm.code,
      label: pm.label,
      description: pm.description ?? "",
      backend: (pm.backend ?? "CORE_BANKING") as BankingBackendType,
      kind: (pm.kind ?? "BANK_ACCOUNT") as MethodKind,
      is_active: pm.is_active ?? true,
      currencies: (pm.currencies ?? []).join(", "),
      loop_type: (pm.loop_type ?? "") as LoopType | "",
      min_kyc_tier: pm.min_kyc_tier ?? 0,
      settlement_account_ref: pm.settlement_account_ref ?? "",
      supported_operations: (pm.supported_operations ?? []).join(", "),
      logo_media_id: pm.logo_media_id ?? "",
      logo_file: null,
      logo_preview_url: pm.logo_url ?? "",
    });
    setDialogOpen(true);
  };

  const openDetail = async (pm: PaymentMethodResponse) => {
    setViewingItem(pm);
    setDetailOpen(true);
    setIsLoadingDetail(true);
    try {
      const detailed = await fetchPaymentMethod({ code: pm.code, id: pm.id });
      setViewingItem(detailed);
    } catch (error) {
      console.error("Erreur chargement détail moyen de paiement:", error);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const save = async () => {
    const validationErrors = validatePaymentMethodForm(form);
    setFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    const currenciesArray = form.currencies
      ? form.currencies.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const operationsArray = form.supported_operations
      ? form.supported_operations.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const payload: UpsertPaymentMethodPayload = {
      code: form.code.trim(),
      label: form.label.trim(),
      backend: form.backend as BankingBackendType,
      kind: form.kind as MethodKind,
      description: form.description.trim() || null,
      is_active: form.is_active,
      currencies: currenciesArray.length > 0 ? currenciesArray : undefined,
      loop_type: form.loop_type ? (form.loop_type as LoopType) : undefined,
      min_kyc_tier: form.min_kyc_tier > 0 ? form.min_kyc_tier : undefined,
      supported_operations: operationsArray.length > 0 ? operationsArray : undefined,
      logo_media_id: form.logo_media_id || (editingItem?.logo_media_id ?? null),
    };

    try {
      setIsSaving(true);
      if (editingItem) {
        const updated = await updatePaymentMethod(editingItem.code, payload, form.logo_file);
        setItems((prev) =>
          prev.map((item) =>
            item.id === updated.id
              ? { ...item, ...updated, logo_url: updated.logo_url ?? (form.logo_preview_url || item.logo_url) }
              : item,
          ),
        );
        toast.success("Moyen de paiement modifié avec succès");
      } else {
        const created = await createPaymentMethod(payload, form.logo_file);
        setItems((prev) => [...prev, created]);
        toast.success("Moyen de paiement créé avec succès");
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer le moyen de paiement");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: string) => {
    const target = items.find((item) => item.id === id);
    if (!target) return;

    try {
      await deletePaymentMethod(target.code);
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Moyen de paiement supprimé");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer le moyen de paiement");
    }
  };

  const toggleStatus = async (pm: PaymentMethodResponse, activate: boolean) => {
    try {
      const updated = await togglePaymentMethodStatus(pm.code, activate);
      setItems((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? { ...item, ...updated, logo_url: updated.logo_url ?? item.logo_url }
            : item,
        ),
      );
      toast.success(updated.status === "active" ? "Moyen de paiement activé" : "Moyen de paiement désactivé");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du changement de statut");
    }
  };

  return {
    items,
    isLoading,
    dialogOpen,
    setDialogOpen,
    detailOpen,
    setDetailOpen,
    isSaving,
    isLoadingDetail,
    editingItem,
    viewingItem,
    form,
    setForm,
    formErrors,
    clearFormError,
    openAdd,
    openEdit,
    openDetail,
    save,
    remove,
    toggleStatus,
    reload: loadData,
  };
};
