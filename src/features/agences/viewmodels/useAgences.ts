import { can } from "@/core/permissions/permissions";
import { useAgencyCatalogStore } from "@/core/references/agencyCatalogStore";
import { useStructureCatalogStore } from "@/core/references/structureCatalogStore";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import { getCurrentInstitutionId, getCurrentDistributorId } from "@/core/security/authStore";
import httpClient from "@/core/network/httpClient";
import { fetchCaisses } from "@/features/caisses/services/caissesService";
import { emptyForm } from "@/features/agences/models/data";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AgenceCreate,
  AgenceCaisseFormLine,
  AgenceForm,
  AgenceRead,
  AgenceUpdate,
  AgencyParentType,
  AgencySummary,
  FetchAgencesParams,
} from "../models/types";
import {
  createAgence,
  deleteAgence,
  fetchAgences,
  toggleAgenceStatus,
  updateAgence,
  extractAgencySummary,
} from "../services/agencesService";
import {
  createCaissesForAgency,
  updateCaisse,
} from "../../caisses/services/caissesService";
import { FieldErrors, hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";

export type AgenceFormField = "name" | "code" | "parent_type" | "parent_id";

/** Valide le formulaire agence et renvoie toutes les erreurs, par champ. */
export const validateAgenceForm = (form: AgenceForm): FieldErrors<AgenceFormField> => {
  const errors: FieldErrors<AgenceFormField> = {};

  if (!(form.name || "").trim()) errors.name = "Le nom de l'agence est obligatoire";
  if (!(form.code || "").trim()) errors.code = "Le code de l'agence est obligatoire";
  if (!form.parent_type) errors.parent_type = "Le type d'entité parente est obligatoire";
  if (!(form.parent_id || form.structureId || "").trim()) {
    errors.parent_id = "L'entité de rattachement est obligatoire";
  }

  return errors;
};

export type AgenceContextFilterInput = {
  connectedEntityContext?: string;
  institutionId?: string;
  distributorId?: string;
};

const buildDataFilter = ({
  connectedEntityContext,
  institutionId,
  distributorId,
}: AgenceContextFilterInput): Record<string, string> => {
  const dataFilter: Record<string, string> = {};
  const isDistributorUser = connectedEntityContext === "Distributeur";

  if (connectedEntityContext === "Structure" && institutionId) {
    dataFilter.parent_id = institutionId;
    dataFilter.parent_type = "STRUCTURE";
  } else if (isDistributorUser && distributorId) {
    dataFilter.parent_id = distributorId;
    dataFilter.parent_type = "DISTRIBUTOR";
  }

  return dataFilter;
};

const buildCaisseCountMap = (
  items: Array<{ agency_id: string; is_deleted?: boolean }>,
): Record<string, number> =>
  items
    .filter((item) => !item.is_deleted)
    .reduce<Record<string, number>>((acc, item) => {
      acc[item.agency_id] = (acc[item.agency_id] || 0) + 1;
      return acc;
    }, {});

const normalizeCaisseLines = (caisses: AgenceCaisseFormLine[]) => {
  const normalizedCaisses = caisses
    .map((line) => ({
      existingId: line.existing_id,
      name: line.name.trim(),
      code: line.code.trim(),
    }))
    .filter((line) => !(line.name.length === 0 && line.code.length === 0));

  return {
    createLines: normalizedCaisses
      .map((line) => ({ name: line.name, code: line.code }))
      .filter((_, index) => !normalizedCaisses[index].existingId),
    updateLines: normalizedCaisses
      .filter((line): line is typeof line & { existingId: string } => Boolean(line.existingId))
      .map((line) => ({
        id: line.existingId,
        payload: {
          name: line.name,
          code: line.code,
        },
      })),
  };
};

type NormalizedAgencyForm = ReturnType<typeof normalizeAgencyForm>;

const normalizeAgencyForm = (form: AgenceForm) => ({
  name: (form.name || "").trim(),
  code: (form.code || "").trim(),
  parentId: (form.parent_id || form.structureId || "").trim(),
  parentType: (form.parent_type || "STRUCTURE") as AgencyParentType,
  address: (form.address || "").trim(),
  city: (form.city || "").trim(),
  region: (form.region || "").trim(),
  country: (form.country || "Sénégal").trim(),
  email: (form.contact_email || "").trim(),
  phone: (form.contact_phone || "").trim(),
});

const saveUpdatedAgence = async ({
  agencyId,
  form,
  caisses,
  setAgences,
  setCaisseCountByAgency,
  upsertAgencyCatalog,
}: {
  agencyId: string;
  form: NormalizedAgencyForm;
  caisses: AgenceCaisseFormLine[];
  setAgences: Dispatch<SetStateAction<AgenceRead[]>>;
  setCaisseCountByAgency: Dispatch<SetStateAction<Record<string, number>>>;
  upsertAgencyCatalog: (item: { id: string; nom: string }) => void;
}) => {
  const payload: AgenceUpdate = {
    name: form.name,
    code: form.code || null,
    address: form.address || null,
    city: form.city || null,
    region: form.region || null,
    country: form.country || null,
    contact_email: form.email || null,
    contact_phone: form.phone || null,
  };

  if (form.parentId) {
    payload.parent_id = form.parentId;
    payload.parent_type = form.parentType;
  }

  const updatedAgence = await updateAgence(agencyId, payload);
  const caisseSync = await syncAgencyCaisses(agencyId, caisses, {
    parent_id: updatedAgence.parent_id,
    parent_type: updatedAgence.parent_type,
  });

  if (caisseSync.errors.length > 0) {
    toast.error(`Erreur mise à jour caisses: ${caisseSync.errors.join(", ")}`);
  }

  if (caisseSync.warnings.length > 0) {
    toast.warning(`Agence mise à jour, mais ${caisseSync.warnings.join(" | ")}`);
  }

  setAgences((prev) => prev.map((agency) => (agency.id === agencyId ? updatedAgence : agency)));
  if (caisseSync.createdCount > 0) {
    setCaisseCountByAgency((prev) => ({
      ...prev,
      [agencyId]: (prev[agencyId] || 0) + caisseSync.createdCount,
    }));
  }

  upsertAgencyCatalog({ id: agencyId, nom: updatedAgence.name });
  toast.success("Agence modifiée avec succès");
};

const saveCreatedAgence = async ({
  form,
  caisses,
  setAgences,
  setCaisseCountByAgency,
  upsertAgencyCatalog,
}: {
  form: NormalizedAgencyForm;
  caisses: AgenceCaisseFormLine[];
  setAgences: Dispatch<SetStateAction<AgenceRead[]>>;
  setCaisseCountByAgency: Dispatch<SetStateAction<Record<string, number>>>;
  upsertAgencyCatalog: (item: { id: string; nom: string }) => void;
}) => {
  const payload: AgenceCreate = {
    name: form.name,
    code: form.code || null,
    parent_id: form.parentId,
    parent_type: form.parentType,
  };

  if (form.address) payload.address = form.address;
  if (form.city) payload.city = form.city;
  if (form.region) payload.region = form.region;
  if (form.country) payload.country = form.country;
  if (form.email) payload.contact_email = form.email;
  if (form.phone) payload.contact_phone = form.phone;

  const created = await createAgence(payload);
  const caisseSync = await syncAgencyCaisses(created.id, caisses, {
    parent_id: created.parent_id,
    parent_type: created.parent_type,
  });

  if (caisseSync.warnings.length > 0) {
    toast.warning(`Agence créée, mais ${caisseSync.warnings.join(" | ")}`);
  }

  setAgences((prev) => [created, ...prev]);
  setCaisseCountByAgency((prev) => ({
    ...prev,
    [created.id]: caisseSync.createdCount,
  }));
  upsertAgencyCatalog({ id: created.id, nom: created.name });
  toast.success("Agence ajoutée avec succès");
};

const syncAgencyCaisses = async (
  agencyId: string,
  caisses: AgenceCaisseFormLine[],
  parentInfo?: {
    parent_id?: string | null;
    parent_type?: AgencyParentType | null;
  },
) => {
  const { createLines, updateLines } = normalizeCaisseLines(caisses);
  const warnings: string[] = [];
  const errors: string[] = [];
  let createdCount = 0;

  if (updateLines.length > 0) {
    const updateResults = await Promise.all(
      updateLines.map(async (line) => {
        try {
          await updateCaisse(line.id, {
            ...line.payload,
            ...(parentInfo?.parent_id !== undefined ? { parent_id: parentInfo.parent_id } : {}),
            ...(parentInfo?.parent_type !== undefined ? { parent_type: parentInfo.parent_type } : {}),
          });
          return null;
        } catch (error) {
          return error instanceof Error
            ? `${line.payload.code}: ${error.message}`
            : `${line.payload.code}: Impossible de mettre à jour la caisse`;
        }
      }),
    );

    errors.push(...updateResults.filter((message): message is string => Boolean(message)));
  }

  if (createLines.length > 0) {
    const caisseSyncResult = await createCaissesForAgency({
      agency_id: agencyId,
      parent_id: parentInfo?.parent_id,
      parent_type: parentInfo?.parent_type,
      caisses: createLines,
    });

    if (caisseSyncResult.skippedDuplicates.length > 0) {
      warnings.push(
        `Caisses non créées (doublons): ${caisseSyncResult.skippedDuplicates.join(", ")}`,
      );
    }

    if (caisseSyncResult.errors.length > 0) {
      warnings.push(
        `Erreurs création caisses: ${caisseSyncResult.errors
          .map((item) => `${item.code} (${item.message})`)
          .join(", ")}`,
      );
    }

    createdCount = caisseSyncResult.created.length;
  }

  return {
    createdCount,
    warnings,
    errors,
  };
};

const buildImportGroups = (rows: Array<{
  agenceNom: string;
  agenceCode: string;
  caisseNom: string;
  caisseCode: string;
}>) => {
  const groupedRows = new Map<string, {
    agenceNom: string;
    agenceCode: string;
    caisses: Array<{ caisseNom: string; caisseCode: string }>;
  }>();

  rows.forEach((row) => {
    const key = `${row.agenceNom}::${row.agenceCode}`;
    if (!groupedRows.has(key)) {
      groupedRows.set(key, {
        agenceNom: row.agenceNom,
        agenceCode: row.agenceCode,
        caisses: [],
      });
    }

    groupedRows.get(key)?.caisses.push({
      caisseNom: row.caisseNom,
      caisseCode: row.caisseCode,
    });
  });

  return groupedRows;
};

const refreshAgencesAfterImport = async (
  mergeAgencyCatalog: (items: Array<{ id: string; nom: string }>) => void,
  setAgences: Dispatch<SetStateAction<AgenceRead[]>>,
  setCaisseCountByAgency: Dispatch<SetStateAction<Record<string, number>>>,
) => {
  const [agencesData, caissesData] = await Promise.all([
    fetchAgences(),
    fetchCaisses(),
  ]);

  const activeAgences = agencesData;
  setAgences(activeAgences);
  setCaisseCountByAgency(buildCaisseCountMap(caissesData));
  mergeAgencyCatalog(activeAgences.map((item) => ({ id: item.id, nom: item.name })));
};



const buildImportPayload = ({
  group,
  structureId,
  normalizedForm,
}: {
  group: {
    agenceNom: string;
    agenceCode: string;
    caisses: Array<{ caisseNom: string; caisseCode: string }>;
  };
  structureId: string;
  normalizedForm: NormalizedAgencyForm;
}): AgenceCreate => {
  const payload: AgenceCreate = {
    name: group.agenceNom,
    code: group.agenceCode,
    parent_id: structureId,
    parent_type: "STRUCTURE",
  };

  if (normalizedForm.address) payload.address = normalizedForm.address;
  if (normalizedForm.city) payload.city = normalizedForm.city;
  if (normalizedForm.email) payload.contact_email = normalizedForm.email;
  if (normalizedForm.phone) payload.contact_phone = normalizedForm.phone;

  return payload;
};

const importAgencyGroup = async ({
  group,
  structureId,
  normalizedForm,
}: {
  group: {
    agenceNom: string;
    agenceCode: string;
    caisses: Array<{ caisseNom: string; caisseCode: string }>;
  };
  structureId: string;
  normalizedForm: NormalizedAgencyForm;
}) => {
  const payload = buildImportPayload({ group, structureId, normalizedForm });

  try {
    const createdAgence = await createAgence(payload);
    const caisseSyncResult = await createCaissesForAgency({
      agency_id: createdAgence.id,
      parent_id: createdAgence.parent_id,
      parent_type: createdAgence.parent_type,
      caisses: group.caisses.map((item) => ({
        name: item.caisseNom,
        code: item.caisseCode,
      })),
    });

    const warnings: string[] = [];

    if (caisseSyncResult.skippedDuplicates.length > 0) {
      warnings.push(
        `${group.agenceCode} - caisses dupliquées: ${caisseSyncResult.skippedDuplicates.join(", ")}`,
      );
    }

    if (caisseSyncResult.errors.length > 0) {
      warnings.push(
        `${group.agenceCode} - erreurs caisses: ${caisseSyncResult.errors
          .map((item) => `${item.code} (${item.message})`)
          .join(", ")}`,
      );
    }

    return {
      createdAgencesCount: 1,
      createdCaissesCount: caisseSyncResult.created.length,
      warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de créer l'agence";
    return {
      createdAgencesCount: 0,
      createdCaissesCount: 0,
      warnings: [`${group.agenceCode}: ${message}`],
    };
  }
};

const importAgencesFromGroups = async ({
  groups,
  structureId,
  normalizedForm,
}: {
  groups: Map<string, {
    agenceNom: string;
    agenceCode: string;
    caisses: Array<{ caisseNom: string; caisseCode: string }>;
  }>;
  structureId: string;
  normalizedForm: NormalizedAgencyForm;
}) => {
  let createdAgencesCount = 0;
  let createdCaissesCount = 0;
  const warnings: string[] = [];

  for (const group of groups.values()) {
    const importResult = await importAgencyGroup({
      group,
      structureId,
      normalizedForm,
    });

    createdAgencesCount += importResult.createdAgencesCount;
    createdCaissesCount += importResult.createdCaissesCount;
    warnings.push(...importResult.warnings);
  }

  return {
    createdAgencesCount,
    createdCaissesCount,
    warnings,
  };
};

const applyParentOptions = ({
  structuresData,
  distributorsData,
  connectedEntityContext,
  institutionId,
  distributorId,
  setStructureFormOptions,
  setDistributorFormOptions,
  replaceCatalog,
}: {
  structuresData: Array<{ id: string; name: string; is_deleted?: boolean }>;
  distributorsData: Array<{ id: string; name: string; is_deleted?: boolean }>;
  connectedEntityContext?: string;
  institutionId?: string | null;
  distributorId?: string | null;
  setStructureFormOptions: Dispatch<SetStateAction<Array<{ id: string; nom: string }>>>;
  setDistributorFormOptions: Dispatch<SetStateAction<Array<{ id: string; nom: string }>>>;
  replaceCatalog: (items: Array<{ id: string; nom: string }>) => void;
}) => {
  const allStructures = structuresData
    .filter((item) => !item.is_deleted)
    .map((item) => ({ id: item.id, nom: item.name }));

  const activeStructures = connectedEntityContext === "Structure" && institutionId
    ? allStructures.filter((structure) => structure.id === institutionId)
    : allStructures;

  const allDistributors = distributorsData
    .filter((item) => !item.is_deleted)
    .map((item) => ({ id: item.id, nom: item.name }));

  const activeDistributors = connectedEntityContext === "Distributeur" && distributorId
    ? allDistributors.filter((distributor) => distributor.id === distributorId)
    : allDistributors;

  setStructureFormOptions(activeStructures);
  setDistributorFormOptions(activeDistributors);
  replaceCatalog(allStructures);
};

export const resolveDefaultStructureId = (
  structureFormOptions: Array<{ id: string; nom: string }>,
  currentInstitutionId?: string | null,
): string => {
  if (structureFormOptions.length === 1) {
    return structureFormOptions[0].id;
  }

  return currentInstitutionId?.trim() ?? "";
};

export const filterAgencesForContext = (
  agencies: AgenceRead[],
  { connectedEntityContext, institutionId, distributorId }: AgenceContextFilterInput,
): AgenceRead[] => {
  const isStructureUser = connectedEntityContext === "Structure";
  const isDistributorUser = connectedEntityContext === "Distributeur";

  const targetParentId = (isStructureUser ? institutionId : isDistributorUser ? distributorId : null)?.trim().toLowerCase();

  if (isStructureUser || isDistributorUser) {
    if (!targetParentId) {
      return [];
    }

    return agencies.filter(
      (item) => item.parent_id?.trim().toLowerCase() === targetParentId
    );
  }

  return agencies;
};

export const useAgences = () => {
  const [listState, setListState] = useState({
    agences: [] as AgenceRead[],
    total: 0,
    summary: null as AgencySummary | null,
    structureFormOptions: [] as Array<{ id: string; nom: string }>,
    distributorFormOptions: [] as Array<{ id: string; nom: string }>,
    caisseCountByAgency: {} as Record<string, number>,
    loading: true,
    error: null as string | null,
    search: "",
    filterCity: "",
    filterStructure: "all",
    filterParentType: "all" as "all" | AgencyParentType,
    filterStatut: "all",
  });

  const [dialogState, setDialogState] = useState({
    dialogOpen: false,
    deleteDialogOpen: false,
    statusDialogOpen: false,
    importDialogOpen: false,
    editingAgence: null as AgenceRead | null,
    deletingAgence: null as AgenceRead | null,
    togglingAgence: null as AgenceRead | null,
  });

  const [importState, setImportState] = useState({
    importResult: null as {
      agences: number;
      caisses: number;
      errors: string[];
      rows: Array<{
        agenceNom: string;
        agenceCode: string;
        caisseNom: string;
        caisseCode: string;
      }>;
    } | null,
  });

  const [formState, setFormState] = useState<AgenceForm>(emptyForm);

  const {
    agences,
    total,
    summary,
    structureFormOptions,
    distributorFormOptions,
    caisseCountByAgency,
    loading,
    error,
    search,
    filterCity,
    filterStructure,
    filterParentType,
    filterStatut,
  } = listState;

  const {
    dialogOpen,
    deleteDialogOpen,
    statusDialogOpen,
    importDialogOpen,
    editingAgence,
    deletingAgence,
    togglingAgence,
  } = dialogState;

  const { importResult } = importState;
  const form = formState;

  const setAgences = (next: AgenceRead[] | ((prev: AgenceRead[]) => AgenceRead[])) =>
    setListState((prev) => ({
      ...prev,
      agences: typeof next === "function" ? next(prev.agences) : next,
    }));

  const setStructureFormOptions = (options: Array<{ id: string; nom: string }>) =>
    setListState((prev) => ({ ...prev, structureFormOptions: options }));

  const setDistributorFormOptions = (options: Array<{ id: string; nom: string }>) =>
    setListState((prev) => ({ ...prev, distributorFormOptions: options }));

  const setCaisseCountByAgency = (next: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) =>
    setListState((prev) => ({
      ...prev,
      caisseCountByAgency: typeof next === "function" ? next(prev.caisseCountByAgency) : next,
    }));

  const setLoading = (val: boolean) => setListState((prev) => ({ ...prev, loading: val }));
  const setError = (val: string | null) => setListState((prev) => ({ ...prev, error: val }));
  const setSearch = (val: string) => setListState((prev) => ({ ...prev, search: val }));
  const setFilterCity = (val: string) => setListState((prev) => ({ ...prev, filterCity: val }));
  const setFilterStructure = (val: string) => setListState((prev) => ({ ...prev, filterStructure: val }));
  const setFilterParentType = (val: "all" | AgencyParentType) =>
    setListState((prev) => ({ ...prev, filterParentType: val, filterStructure: "all" }));
  const setFilterStatut = (val: string) => setListState((prev) => ({ ...prev, filterStatut: val }));

  const {
    errors: formErrors,
    setErrors: setFormErrors,
    clearError: clearFormError,
    resetErrors: resetFormErrors,
  } = useFieldErrors<AgenceFormField>();

  const setDialogOpen = (open: boolean) => {
    // Chaque ouverture ou fermeture repart d'un formulaire sans erreur affichée
    resetFormErrors();
    setDialogState((prev) => ({ ...prev, dialogOpen: open }));
  };
  const setDeleteDialogOpen = (open: boolean) => setDialogState((prev) => ({ ...prev, deleteDialogOpen: open }));
  const setStatusDialogOpen = (open: boolean) => setDialogState((prev) => ({ ...prev, statusDialogOpen: open }));
  const setImportDialogOpen = (open: boolean) => setDialogState((prev) => ({ ...prev, importDialogOpen: open }));
  const setEditingAgence = (a: AgenceRead | null) => setDialogState((prev) => ({ ...prev, editingAgence: a }));
  const setDeletingAgence = (a: AgenceRead | null) => setDialogState((prev) => ({ ...prev, deletingAgence: a }));
  const setTogglingAgence = (a: AgenceRead | null) => setDialogState((prev) => ({ ...prev, togglingAgence: a }));

  const setImportResult = (res: typeof importResult) => setImportState({ importResult: res });
  const setForm = (nextForm: AgenceForm | ((prev: AgenceForm) => AgenceForm)) =>
    setFormState((prev) => (typeof nextForm === "function" ? nextForm(prev) : nextForm));

  const catalogItems = useStructureCatalogStore((state) => state.items);
  const replaceCatalog = useStructureCatalogStore((state) => state.replaceFromList);
  const mergeAgencyCatalog = useAgencyCatalogStore(
    (state) => state.mergeFromList,
  );
  const upsertAgencyCatalog = useAgencyCatalogStore((state) => state.upsert);

  const { currentActorRole, entityContext: connectedEntityContext, currentPermissions } = useCurrentActor();
  const entityContext = "Agence" as const;

  const permissions = {
    canRead: can(currentActorRole, "read", entityContext, currentPermissions),
    canCreate: can(currentActorRole, "create", entityContext, currentPermissions),
    canUpdate: can(currentActorRole, "update", entityContext, currentPermissions),
    canDelete: can(currentActorRole, "delete", entityContext, currentPermissions),
  };

  const structureOptions = structureFormOptions;
  const distributorOptions = distributorFormOptions;
  const parentOptions =
    filterParentType === "STRUCTURE"
      ? structureFormOptions
      : filterParentType === "DISTRIBUTOR"
        ? distributorFormOptions
        : [
            ...structureFormOptions.map((s) => ({ ...s, nom: `[Structure] ${s.nom}` })),
            ...distributorFormOptions.map((d) => ({ ...d, nom: `[Distributeur] ${d.nom}` })),
          ];

  // Chargement des entités parentes (Structures et Distributeurs) uniquement quand le formulaire est ouvert (comme dans structures)
  useEffect(() => {
    if (!dialogOpen) return;
    let active = true;

    const loadParentOptions = async () => {
      const institutionId = getCurrentInstitutionId();
      const distributorId = getCurrentDistributorId();

      try {
        const [structuresRes, distributorsRes] = await Promise.allSettled([
          httpClient.get<unknown>("/api/v1/organisation/structures/"),
          httpClient.get<unknown>("/api/v1/organisation/distributors/"),
        ]);

        if (!active) return;

        const rawStructures = structuresRes.status === "fulfilled" ? structuresRes.value.data : [];
        const structuresList = Array.isArray(rawStructures) ? rawStructures : (rawStructures as { items?: unknown } | null | undefined)?.items || [];
        const structuresData = Array.isArray(structuresList) ? structuresList : [];

        const rawDistributors = distributorsRes.status === "fulfilled" ? distributorsRes.value.data : [];
        const distributorsList = Array.isArray(rawDistributors) ? rawDistributors : (rawDistributors as { items?: unknown } | null | undefined)?.items || [];
        const distributorsData = Array.isArray(distributorsList) ? distributorsList : [];

        applyParentOptions({
          structuresData,
          distributorsData,
          connectedEntityContext,
          institutionId,
          distributorId,
          setStructureFormOptions,
          setDistributorFormOptions,
          replaceCatalog,
        });
      } catch (err) {
        console.warn("[useAgences] Erreur chargement entités parentes:", err);
      }
    };

    void loadParentOptions();

    return () => {
      active = false;
    };
  }, [dialogOpen, connectedEntityContext, replaceCatalog]);

  // Chargement principal de la liste des agences (direct via REST, comme dans structures)
  useEffect(() => {
    let active = true;
    setLoading(true);

    const initLoad = async () => {
      const institutionId = getCurrentInstitutionId();
      const distributorId = getCurrentDistributorId();
      const dataFilter = buildDataFilter({
        connectedEntityContext,
        institutionId,
        distributorId,
      });
      if (!dataFilter.parent_type && filterParentType !== "all") {
        dataFilter.parent_type = filterParentType;
      }

      try {
        const agencyQueryParams: FetchAgencesParams = {
          skip: 0,
          limit: 100,
          include_inactive: true,
          ...dataFilter,
        };
        if (filterStatut === "active") {
          agencyQueryParams.is_active = true;
        } else if (filterStatut === "inactive") {
          agencyQueryParams.is_active = false;
        }
        if (filterCity.trim()) agencyQueryParams.city = filterCity.trim();
        if (search.trim()) agencyQueryParams.search = search.trim();

        const agencesRes = await fetchAgences(agencyQueryParams);

        if (!active) return;

        const items = Array.isArray(agencesRes?.items)
          ? agencesRes.items
          : Array.isArray(agencesRes)
            ? agencesRes
            : [];
        const total = typeof agencesRes?.total === "number" ? agencesRes.total : items.length;
        const summary = agencesRes?.summary ?? {
          total: items.length,
          actifs: items.filter((a) => a.is_active).length,
          inactifs: items.filter((a) => !a.is_active).length,
        };

        setAgences(items);
        mergeAgencyCatalog(items.map((item) => ({ id: item.id, nom: item.name })));

        setListState((prev) => ({
          ...prev,
          summary,
          total,
          error: null,
          loading: false,
        }));
      } catch {
        if (!active) return;
        setAgences([]);
        setListState((prev) => ({
          ...prev,
          summary: { total: 0, actifs: 0, inactifs: 0 },
          total: 0,
          error: "Impossible de charger les agences",
          loading: false,
        }));
      }
    };

    void initLoad();

    return () => {
      active = false;
    };
  }, [search, filterCity, filterStatut, filterParentType, mergeAgencyCatalog, connectedEntityContext]);

  const resolveParentLabel = (parentId?: string, parentType?: AgencyParentType | string) => {
    if (!parentId) return "—";
    const targetId = parentId.toLowerCase();

    if (parentType === "DISTRIBUTOR") {
      const found = distributorFormOptions.find((item) => item.id.toLowerCase() === targetId);
      if (found) return found.nom;
    } else if (parentType === "STRUCTURE") {
      const found =
        structureFormOptions.find((item) => item.id.toLowerCase() === targetId) ??
        catalogItems.find((item) => item.id.toLowerCase() === targetId);
      if (found) return found.nom;
    } else {
      const foundStruct =
        structureFormOptions.find((item) => item.id.toLowerCase() === targetId) ??
        catalogItems.find((item) => item.id.toLowerCase() === targetId);
      if (foundStruct) return foundStruct.nom;

      const foundDist = distributorFormOptions.find((item) => item.id.toLowerCase() === targetId);
      if (foundDist) return foundDist.nom;
    }

    return "—";
  };

  const resolveStructureLabel = (structureId?: string) => resolveParentLabel(structureId, "STRUCTURE");

  const getCaisseCount = (agencyId: string) => caisseCountByAgency[agencyId] || 0;

  // Tous les filtres (search, city, is_active, parent_id, parent_type) sont appliqués côté backend
  const filtered = agences;

  const addCaisseLine = () => {
    setForm((prev) => ({
      ...prev,
      caisses: [
        ...prev.caisses,
        {
          name: "",
          code: "",
        },
      ],
    }));
  };

  const updateCaisseLine = (index: number, patch: Partial<AgenceCaisseFormLine>) => {
    setForm((prev) => ({
      ...prev,
      caisses: prev.caisses.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  };

  const removeCaisseLine = (index: number) => {
    setForm((prev) => ({
      ...prev,
      caisses: prev.caisses.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const selectParent = (parentId: string, parentType?: AgencyParentType) => {
    setForm((prev) => ({
      ...prev,
      parent_id: parentId,
      structureId: parentId,
      ...(parentType ? { parent_type: parentType } : {}),
    }));
  };

  const selectParentType = (parentType: AgencyParentType) => {
    const defaultId = parentType === "DISTRIBUTOR"
      ? (distributorFormOptions[0]?.id ?? "")
      : (structureFormOptions[0]?.id ?? "");
    setForm((prev) => ({
      ...prev,
      parent_type: parentType,
      parent_id: defaultId,
      structureId: defaultId,
    }));
  };

  const selectStructure = (structureId: string) => selectParent(structureId, "STRUCTURE");

  const openAdd = () => {
    if (!permissions.canCreate) {
      toast.error("Vous n'avez pas l'habilitation pour ajouter une agence");
      return;
    }

    const institutionId = getCurrentInstitutionId();
    const distributorId = getCurrentDistributorId();
    const isDistributorUser = connectedEntityContext === "Distributeur";

    const defaultParentType: AgencyParentType = isDistributorUser ? "DISTRIBUTOR" : "STRUCTURE";
    let defaultParentId = "";

    if (isDistributorUser) {
      defaultParentId = distributorId || (distributorFormOptions[0]?.id ?? "");
    } else if (connectedEntityContext === "Structure") {
      defaultParentId = institutionId || (structureFormOptions[0]?.id ?? "");
    } else {
      defaultParentId = structureFormOptions[0]?.id ?? "";
    }

    setEditingAgence(null);
    setForm({
      ...emptyForm,
      parent_type: defaultParentType,
      parent_id: defaultParentId,
      structureId: defaultParentId,
    });
    setDialogOpen(true);
  };

  const openEdit = async (a: AgenceRead) => {
    if (!permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour modifier une agence");
      return;
    }

    let caisses;
    try {
      caisses = await fetchCaisses();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de charger les caisses de l'agence";
      toast.error(message);
      return;
    }

    const agenceCaisses = caisses
      .filter((item) => !item.is_deleted && item.agency_id === a.id)
      .map((item) => ({
        existing_id: item.id,
        name: item.name,
        code: item.code,
      }));

    setEditingAgence(a);
    setForm({
      name: a.name || "",
      code: a.code || "",
      parent_id: a.parent_id || "",
      structureId: a.parent_id || "",
      parent_type: a.parent_type || "STRUCTURE",
      city: a.city || "",
      region: a.region || "",
      country: a.country || "Sénégal",
      address: a.address || "",
      contact_phone: a.contact_phone || "",
      contact_email: a.contact_email || "",
      is_active: a.is_active,
      caisses: agenceCaisses,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingAgence && !permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour modifier une agence");
      return;
    }

    if (!editingAgence && !permissions.canCreate) {
      toast.error("Vous n'avez pas l'habilitation pour ajouter une agence");
      return;
    }

    const validationErrors = validateAgenceForm(form);
    setFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    const normalizedForm = normalizeAgencyForm(form);

    try {
      if (editingAgence) {
        await saveUpdatedAgence({
          agencyId: editingAgence.id,
          form: normalizedForm,
          caisses: form.caisses,
          setAgences,
          setCaisseCountByAgency,
          upsertAgencyCatalog,
        });
      } else {
        await saveCreatedAgence({
          form: normalizedForm,
          caisses: form.caisses,
          setAgences,
          setCaisseCountByAgency,
          upsertAgencyCatalog,
        });
      }

      setDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'enregistrer l'agence";
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!permissions.canDelete) {
      toast.error("Vous n'avez pas l'habilitation pour supprimer une agence");
      return;
    }

    if (deletingAgence) {
      try {
        await deleteAgence(deletingAgence.id);
        setAgences((prev) => prev.filter((a) => a.id !== deletingAgence.id));
        setCaisseCountByAgency((prev) => {
          const next = { ...prev };
          delete next[deletingAgence.id];
          return next;
        });
        toast.success("Agence supprimée");
        setDeleteDialogOpen(false);
        setDeletingAgence(null);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Impossible de supprimer l'agence";
        toast.error(message);
      }
    }
  };

  const openDelete = (a: AgenceRead) => {
    if (!permissions.canDelete) {
      toast.error("Vous n'avez pas l'habilitation pour supprimer une agence");
      return;
    }

    setDeletingAgence(a);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = (agence: AgenceRead) => {
    openDelete(agence);
  };

  const confirmToggleStatut = (agence: AgenceRead) => {
    if (!permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour modifier le statut");
      return;
    }

    setTogglingAgence(agence);
    setStatusDialogOpen(true);
  };

  const toggleStatut = async (id: string) => {
    if (!permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour modifier le statut");
      return;
    }

    const current = agences.find((agence) => agence.id === id);
    if (!current) return;

    try {
      const nextActive = !current.is_active;
      const updated = await toggleAgenceStatus(id, nextActive);
      setAgences((prev) =>
        prev.map((a) => (a.id === id ? updated : a)),
      );
      setListState((prev) => {
        if (!prev.summary) return prev;
        const diff = updated.is_active ? 1 : -1;
        return {
          ...prev,
          summary: {
            ...prev.summary,
            actifs: Math.max(0, prev.summary.actifs + diff),
            inactifs: Math.max(0, prev.summary.inactifs - diff),
          },
        };
      });
      toast.success(updated.is_active ? "Agence activée avec succès" : "Agence désactivée avec succès");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de modifier le statut";
      toast.error(message);
    }
  };

  const handleToggleStatut = async () => {
    if (!togglingAgence) return;
    await toggleStatut(togglingAgence.id);
    setStatusDialogOpen(false);
    setTogglingAgence(null);
  };

  const handleImportFile = async (file: File) => {
    const content = await file.text();
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const rows: Array<{
      agenceNom: string;
      agenceCode: string;
      caisseNom: string;
      caisseCode: string;
    }> = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      const parts = line.split(",").map((item) => item.trim());
      if (parts.length < 4) {
        errors.push(`Ligne ${index + 1}: format invalide`);
        return;
      }

      const [agenceNom, agenceCode, caisseNom, caisseCode] = parts;
      if (!agenceNom || !agenceCode || !caisseNom || !caisseCode) {
        errors.push(`Ligne ${index + 1}: colonnes obligatoires manquantes`);
        return;
      }

      rows.push({ agenceNom, agenceCode, caisseNom, caisseCode });
    });

    const uniqueAgences = new Set(
      rows.map((row) => `${row.agenceNom}::${row.agenceCode}`),
    );
    setImportResult({
      agences: uniqueAgences.size,
      caisses: rows.length,
      errors,
      rows,
    });
  };

  const applyImport = async () => {
    if (!importResult || importResult.errors.length > 0) {
      return;
    }

    const structureId = form.structureId.trim();
    if (!structureId) {
      toast.error("Veuillez sélectionner une structure avant l'import");
      return;
    }

    const normalizedForm = normalizeAgencyForm(form);
    const groupedRows = buildImportGroups(importResult.rows);

    const importState = await importAgencesFromGroups({
      groups: groupedRows,
      structureId,
      normalizedForm,
    });

    try {
      await refreshAgencesAfterImport(
        mergeAgencyCatalog,
        setAgences,
        setCaisseCountByAgency,
      );
    } catch {
      toast.warning("Import terminé, mais impossible de rafraîchir la liste depuis l'API");
    }

    if (importState.warnings.length > 0) {
      toast.warning(`Import partiel: ${importState.warnings.join(" | ")}`);
    } else {
      toast.success(
        `Import effectué: ${importState.createdAgencesCount} agence(s), ${importState.createdCaissesCount} caisse(s)`,
      );
    }

    setImportDialogOpen(false);
    setImportResult(null);
  };

  return {
    currentActorRole,
    entityContext,
    permissions,
    structureOptions,
    filterStructure,
    setFilterStructure,
    filterStatut,
    setFilterStatut,
    filterCity,
    setFilterCity,
    search,
    setSearch,
    summary,
    total,
    agences,
    filtered,
    loading,
    error,
    dialogOpen,
    setDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    statusDialogOpen,
    setStatusDialogOpen,
    importDialogOpen,
    setImportDialogOpen,
    editingAgence,
    deletingAgence,
    setDeletingAgence,
    togglingAgence,
    importResult,
    selectStructure,
    form,
    setForm,
    formErrors,
    clearFormError,
    addCaisseLine,
    updateCaisseLine,
    removeCaisseLine,
    openAdd,
    openEdit,
    openDelete,
    confirmDelete,
    handleSave,
    handleDelete,
    toggleStatut,
    confirmToggleStatut,
    handleToggleStatut,
    handleImportFile,
    applyImport,
    getCaisseCount,
    resolveStructureLabel,
    resolveParentLabel,
    structureFormOptions,
    distributorFormOptions,
    distributorOptions,
    parentOptions,
    filterParentType,
    setFilterParentType,
    selectParent,
    selectParentType,
    singleStructureMode: structureFormOptions.length === 1,
    connectedEntityContext,
    isRestrictedContext: connectedEntityContext === "Structure" || connectedEntityContext === "Distributeur",
  };
};
