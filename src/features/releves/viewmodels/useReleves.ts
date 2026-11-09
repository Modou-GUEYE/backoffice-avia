import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/core/security/authStore";
import { useUserPerimeter } from "@/core/security/useUserPerimeter";
import { RelevePermissions, hasRelevePermission } from "@/core/permissions/permissions";
import { fetchStructures } from "@/features/structures/services/structuresService";
import { FieldErrors, hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import type { Releve, ReleveFilters } from "../models/types";
import { fetchReleves, generateReleve } from "../services/relevesService";

const DEFAULT_LIMIT = 20;

export type GenerateFormField = "structure" | "annee" | "mois";

export interface GenerateFormState {
  structure: string;
  annee: string;
  mois: string;
}

export const validateGenerateForm = (form: GenerateFormState): FieldErrors<GenerateFormField> => {
  const errors: FieldErrors<GenerateFormField> = {};
  if (!form.structure.trim()) errors.structure = "La structure est obligatoire";
  const annee = Number(form.annee);
  if (!form.annee) errors.annee = "L'année est obligatoire";
  else if (!Number.isInteger(annee) || annee < 2000 || annee > 2100) errors.annee = "Année invalide";
  const mois = Number(form.mois);
  if (!form.mois) errors.mois = "Le mois est obligatoire";
  else if (!Number.isInteger(mois) || mois < 1 || mois > 12) errors.mois = "Mois invalide";
  return errors;
};

export const useReleves = () => {
  const perimeter = useUserPerimeter();
  const permissions = useAuthStore((state) => state.user?.permissions);
  // Structure imposée : le Reporting la compare au périmètre du jeton, qui porte l'identifiant (UUID) de la structure.
  // Le nom n'est utilisé que pour l'affichage.
  const enforcedStructure = perimeter.enforcedStructureId?.trim() || "";
  const enforcedStructureLabel = perimeter.enforcedStructureLabel?.trim() || enforcedStructure;

  const canRead = hasRelevePermission(permissions, RelevePermissions.read);
  const canGenerate = hasRelevePermission(permissions, RelevePermissions.generate);

  const [filters, setFilters] = useState<ReleveFilters>({ skip: 0, limit: DEFAULT_LIMIT });
  const effectiveFilters = useMemo<ReleveFilters>(
    () => (enforcedStructure ? { ...filters, structure: enforcedStructure } : filters),
    [filters, enforcedStructure],
  );

  const [items, setItems] = useState<Releve[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Les transactions (et donc les relevés) portent l'identifiant de la structure : il sert de valeur, le nom de libellé
  const [structureOptions, setStructureOptions] = useState<Array<{ id: string; name: string }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchReleves(effectiveFilters);
      setItems(response.items);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les relevés mensuels.");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [effectiveFilters]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (enforcedStructure) return;
    let isMounted = true;
    fetchStructures()
      .then((structures) => {
        if (!isMounted) return;
        setStructureOptions(
          structures
            .filter((st) => st.id)
            .map((st) => ({ id: st.id, name: st.name?.trim() || st.id }))
            .sort((a, b) => a.name.localeCompare(b.name, "fr")),
        );
      })
      .catch(() => {
        if (isMounted) setStructureOptions([]);
      });
    return () => {
      isMounted = false;
    };
  }, [enforcedStructure]);

  /** Nom de la structure par correspondance exacte de son identifiant ; l'identifiant reste affiché s'il est inconnu. */
  const getStructureName = (structureId: string): string => {
    if (enforcedStructure && structureId === enforcedStructure) return enforcedStructureLabel;
    return structureOptions.find((option) => option.id === structureId)?.name ?? structureId;
  };

  const updateFilters = (patch: Partial<ReleveFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch, skip: patch.skip ?? 0 }));
  };

  const resetFilters = () => setFilters({ skip: 0, limit: filters.limit ?? DEFAULT_LIMIT });

  const limit = filters.limit ?? DEFAULT_LIMIT;
  const skip = filters.skip ?? 0;
  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // ===== Génération =====
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateForm, setGenerateForm] = useState<GenerateFormState>({ structure: "", annee: "", mois: "" });
  const {
    errors: generateErrors,
    setErrors: setGenerateErrors,
    clearError: clearGenerateError,
    resetErrors: resetGenerateErrors,
  } = useFieldErrors<GenerateFormField>();

  const openGenerate = () => {
    setGenerateForm({ structure: enforcedStructure || effectiveFilters.structure || "", annee: "", mois: "" });
    resetGenerateErrors();
    setGenerateOpen(true);
  };

  const updateGenerateField = (field: GenerateFormField, value: string) => {
    clearGenerateError(field);
    setGenerateForm((prev) => ({ ...prev, [field]: value }));
  };

  /** Renvoie le relevé généré (pour ouvrir son détail), ou null en cas d'échec. */
  const submitGenerate = async (): Promise<Releve | null> => {
    const form = enforcedStructure ? { ...generateForm, structure: enforcedStructure } : generateForm;
    const errors = validateGenerateForm(form);
    setGenerateErrors(errors);
    if (hasFieldErrors(errors)) return null;

    setGenerating(true);
    try {
      const releve = await generateReleve({
        structure_id: form.structure.trim(),
        annee: Number(form.annee),
        mois: Number(form.mois),
      });
      toast.success("Relevé généré avec succès");
      setGenerateOpen(false);
      void load();
      return releve;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de générer le relevé.");
      return null;
    } finally {
      setGenerating(false);
    }
  };

  return {
    items,
    total,
    loading,
    error,
    reload: load,
    filters: effectiveFilters,
    updateFilters,
    resetFilters,
    limit,
    skip,
    currentPage,
    totalPages,
    structureOptions,
    getStructureName,
    enforcedStructure,
    enforcedStructureLabel,
    canRead,
    canGenerate,

    generateOpen,
    setGenerateOpen,
    generating,
    generateForm,
    generateErrors,
    openGenerate,
    updateGenerateField,
    submitGenerate,
  };
};
