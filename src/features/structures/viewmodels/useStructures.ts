import { EntityBranding, useTheme } from "@/core/theme/ThemeContext";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { can } from "@/core/permissions/permissions";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import {
  AccessSecurityRefType,
  TargetScopeRef,
  createBackofficeUser,
  importBackofficeUsers,
  listClientCompositeRoles,
  listHierarchyMembers,
  updateAccessSecurityUser,
} from "@/core/security/accessSecurityService";
import { useStructureCatalogStore } from "@/core/references/structureCatalogStore";
import { useStructureUsersStore } from "@/core/references/structureUsersStore";
import { fetchAgences } from "@/features/agences/services/agencesService";
import { fetchCaisses } from "@/features/caisses/services/caissesService";
import { fetchProduits } from "@/features/produits/services/produitsService";
import { isProfileRole, isProfileRoleForEntityContext, requiresAgence, requiresCaisse } from "@/features/utilisateurs/models/profileLabels";
import { fetchPackages, assignPackageToStructure, changeStructurePackage } from "@/features/parametres/services/packagesService";
import {
  FetchStructuresParams,
  Structure,
  StructureForm,
  StructureRead,
  StructureSummary,
  StructureUser,
  StructureUserForm,
} from "../models/types";
import { emptyForm, emptyBranding, emptyUserForm, DEFAULT_BRANDING_COLORS } from "../models/data";
import type { UserFormData } from "../views/components/StructureDetailUserDialog";
import { FieldErrors, hasFieldErrors, isValidEmail, useFieldErrors } from "@/shared/forms/fieldErrors";
import {
  archiveStructure,
  createStructure,
  deleteStructure,
  fetchStructures,
  toggleStructureStatus,
  updateStructure,
  extractStructuresList,
} from "../services/structuresService";

const mapStructureType = (type?: StructureRead["type"]): Structure["type"] => {
  if (!type) return "OTHER";
  return type;
};

const mapReadTypeToUiType = (structure: StructureRead): Structure["type"] => {
  return mapStructureType(structure.type);
};

const enrichStructure = (structure: StructureRead, existing?: Structure): Structure => ({
  ...existing,
  id: structure.id,
  code: structure.code ?? existing?.code ?? "",
  name: structure.name,
  type: mapReadTypeToUiType(structure),
  description: structure.description ?? existing?.description ?? null,
  legal_name: structure.legal_name ?? existing?.legal_name ?? null,
  registration_number: structure.registration_number ?? existing?.registration_number ?? null,
  address: structure.address || existing?.address || "",
  contact_email: structure.contact_email ?? existing?.contact_email ?? null,
  contact_phone: structure.contact_phone ?? existing?.contact_phone ?? null,
  is_active: structure.is_active,
  activated_at: structure.activated_at ?? existing?.activated_at ?? null,
  deactivated_at: structure.deactivated_at ?? existing?.deactivated_at ?? null,
  productId: structure.product_id ?? existing?.productId,
  produitId: structure.product_id ?? existing?.produitId,
  nombreAgences: existing?.nombreAgences ?? 0,
  utilisateurs: existing?.utilisateurs || [],
  branding: structure.branding_config
    ? (structure.branding_config as unknown as Partial<EntityBranding>)
    : existing?.branding,
  media_url: structure.media_url ?? null,
  mediaUrl: structure.media_url ?? "",
  libelleExpediteurSMS: structure.sender_label ?? existing?.libelleExpediteurSMS ?? "",
  packageId: structure.package ?? existing?.packageId ?? "",
});

const normalize = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();
const ACCESS_SECURITY_CLIENT_ID = import.meta.env.VITE_ACCESS_SECURITY_CLIENT_ID ?? "backoffice-web";
const ACCESS_SECURITY_STRUCTURE_SCOPE_REF_TYPE: AccessSecurityRefType = "STRUCTURE";
const normalizeLoginPart = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

const deriveLogin = (prenom: string, nom: string, existingUsernames?: string[]): string => {
  const normalizedPrenom = normalizeLoginPart(prenom);
  const normalizedNom = normalizeLoginPart(nom);

  if (!normalizedPrenom || !normalizedNom) {
    return "";
  }

  const base = `${normalizedPrenom.charAt(0)}.${normalizedPrenom}${normalizedNom}`;
  let candidate = base;
  let counter = 1;

  if (existingUsernames && existingUsernames.length > 0) {
    const existingSet = new Set(
      existingUsernames
        .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
        .map((u) => u.toLowerCase())
    );
    while (existingSet.has(candidate)) {
      candidate = `${base}${counter}`;
      counter++;
    }
  }

  return candidate;
};

const buildPendingUserId = (username: string, email: string): string =>
  `pending:${normalize(username)}:${normalize(email)}`;

type RegistryUsersEntry = {
  structureId?: string;
  structureCode?: string;
  structureName?: string;
  users?: StructureUser[];
};

type NormalizedStructureFormInput = {
  name: string;
  code: string;
  type: Structure["type"];
  description: string;
  legalName: string;
  registrationNumber: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  libelleExpediteurSMS: string;
  packageId: string;
  produitId: string;
};

const getPersistedUsers = (
  structureUsersRegistry: RegistryUsersEntry[],
  structure: StructureRead,
): StructureUser[] => {
  const match = structureUsersRegistry.find((registryItem) => {
    const normalizedRegistryCode = normalize(registryItem.structureCode);
    const normalizedRegistryName = normalize(registryItem.structureName);
    return (
      registryItem.structureId === structure.id
      || normalizedRegistryCode === normalize(structure.code)
      || normalizedRegistryName === normalize(structure.name)
    );
  });

  return match?.users || [];
};

const mapStructuresFromApi = (
  data: StructureRead[],
  previousStructures: Structure[],
  structureUsersRegistry: RegistryUsersEntry[],
): Structure[] => data.map((item) => {
  const existing = previousStructures.find(
    (structure) => structure.id === item.id || structure.code === item.code,
  );

  const persistedUsers = getPersistedUsers(structureUsersRegistry, item);
  const mapped = enrichStructure(item, existing);

  return {
    ...mapped,
    utilisateurs: existing?.utilisateurs?.length ? existing.utilisateurs : persistedUsers,
  };
});

const toCatalogItems = (structures: Structure[]): Array<{ id: string; nom: string }> => {
  const result: Array<{ id: string; nom: string }> = [];
  for (const structure of structures) {
    result.push({ id: structure.id, nom: structure.name });
  }
  return result;
};

export type StructureFormField = "name" | "type" | "address" | "produitId";

/** Valide le formulaire structure et renvoie toutes les erreurs, par champ. */
export const validateStructureForm = (
  form: Pick<StructureForm, "name" | "type" | "address" | "produitId" | "ajouterProduit">,
  isEditing: boolean,
): FieldErrors<StructureFormField> => {
  const errors: FieldErrors<StructureFormField> = {};

  if (!form.name.trim()) errors.name = "Le nom est obligatoire";
  if (!form.type.trim()) errors.type = "Le type est obligatoire";
  if (!form.address.trim()) errors.address = "Le pays est obligatoire";
  // Le produit est exigé à la création (schéma backend) et en modification tant qu'il n'a pas été retiré
  if ((!isEditing || form.ajouterProduit) && !form.produitId.trim()) {
    errors.produitId = "Le produit est obligatoire";
  }

  return errors;
};

export type StructureUserFormField = "prenom" | "nom" | "username" | "email" | "profil";

/** Valide un utilisateur de structure (prénom, nom, login, e-mail, profil) et renvoie toutes les erreurs, par champ. */
export const validateStructureUserForm = (
  form: Pick<StructureUserForm, StructureUserFormField>,
): FieldErrors<StructureUserFormField> => {
  const errors: FieldErrors<StructureUserFormField> = {};

  if (!form.prenom.trim()) errors.prenom = "Le prénom est obligatoire";
  if (!form.nom.trim()) errors.nom = "Le nom est obligatoire";
  if (!form.username.trim()) errors.username = "Le login est obligatoire";
  if (!form.email.trim()) errors.email = "L'e-mail est obligatoire";
  else if (!isValidEmail(form.email)) errors.email = "L'adresse e-mail n'est pas valide";
  if (!form.profil.trim()) errors.profil = "Le profil est obligatoire";

  return errors;
};

export type StructureDetailUserFormField = keyof UserFormData;

/** Même validation pour le dialogue utilisateur du détail de structure (champs nommés différemment). */
export const validateStructureDetailUserForm = (
  form: UserFormData,
): FieldErrors<StructureDetailUserFormField> => {
  const errors = validateStructureUserForm({
    prenom: form.firstName,
    nom: form.lastName,
    username: form.username,
    email: form.email,
    profil: form.profile,
  });

  return {
    firstName: errors.prenom,
    lastName: errors.nom,
    username: errors.username,
    email: errors.email,
    profile: errors.profil,
  };
};

export const useStructures = () => {
  const [listState, setListState] = useState({
    structures: [] as Structure[],
    total: 0,
    summary: null as StructureSummary | null,
    loading: true,
    error: null as string | null,
    search: "",
    filterStatut: "all" as string,
  });

  const [dialogState, setDialogState] = useState({
    dialogOpen: false,
    deleteDialogOpen: false,
    statutDialogOpen: false,
    editingStructure: null as Structure | null,
    deletingStructure: null as Structure | null,
    togglingStructure: null as Structure | null,
    partiallyCreatedStructureId: null as string | null,
  });

  const [formState, setFormState] = useState({
    form: emptyForm,
    brandingForm: emptyBranding as Partial<EntityBranding>,
    users: [] as StructureUser[],
    pendingImportFile: null as File | null,
    pendingImportUsersCount: 0,
    userForm: emptyUserForm,
    availableUserRoles: [] as string[],
    showUserForm: false,
    produitOptions: [] as Array<{ id: string; nom: string }>,
    packageOptions: [] as Array<{ id: string; nom: string }>,
    isSaving: false,
    pendingLogoFile: null as File | null,
    selectedUserId: null as string | null,
    isUpdatingUser: false,
    structureAgences: [] as Array<{ id: string; nom: string }>,
    structureCaisses: [] as Array<{ id: string; nom: string }>,
  });

  const { structures, total, summary, loading, error, search, filterStatut } = listState;
  const {
    dialogOpen,
    deleteDialogOpen,
    statutDialogOpen,
    editingStructure,
    deletingStructure,
    togglingStructure,
    partiallyCreatedStructureId,
  } = dialogState;
  const {
    form,
    brandingForm,
    users,
    pendingImportFile,
    pendingImportUsersCount,
    userForm,
    availableUserRoles,
    showUserForm,
    produitOptions,
    packageOptions,
    isSaving,
    pendingLogoFile,
    selectedUserId,
    isUpdatingUser,
    structureAgences,
    structureCaisses,
  } = formState;

  const setStructures = (next: Structure[] | ((prev: Structure[]) => Structure[])) =>
    setListState((prev) => ({
      ...prev,
      structures: typeof next === "function" ? next(prev.structures) : next,
    }));

  const setLoading = (value: boolean) =>
    setListState((prev) => ({ ...prev, loading: value }));

  const setError = (value: string | null) =>
    setListState((prev) => ({ ...prev, error: value }));

  const setSearch = (value: string) =>
    setListState((prev) => ({ ...prev, search: value }));

  const setFilterStatut = (value: string) =>
    setListState((prev) => ({ ...prev, filterStatut: value }));

  const {
    errors: formErrors,
    setErrors: setFormErrors,
    clearError: clearFormError,
    resetErrors: resetFormErrors,
  } = useFieldErrors<StructureFormField>();

  const {
    errors: userFormErrors,
    setErrors: setUserFormErrors,
    clearError: clearUserFormError,
    resetErrors: resetUserFormErrors,
  } = useFieldErrors<StructureUserFormField>();

  const setDialogOpen = (open: boolean) => {
    // Chaque ouverture ou fermeture repart d'un formulaire sans erreur affichée
    resetFormErrors();
    resetUserFormErrors();
    setDialogState((prev) => ({ ...prev, dialogOpen: open }));
  };

  const setDeleteDialogOpen = (open: boolean) =>
    setDialogState((prev) => ({ ...prev, deleteDialogOpen: open }));

  const setStatutDialogOpen = (open: boolean) =>
    setDialogState((prev) => ({ ...prev, statutDialogOpen: open }));

  const setEditingStructure = (structure: Structure | null) =>
    setDialogState((prev) => ({ ...prev, editingStructure: structure }));

  const setDeletingStructure = (structure: Structure | null) =>
    setDialogState((prev) => ({ ...prev, deletingStructure: structure }));

  const setTogglingStructure = (structure: Structure | null) =>
    setDialogState((prev) => ({ ...prev, togglingStructure: structure }));

  const setPartiallyCreatedStructureId = (value: string | null) =>
    setDialogState((prev) => ({ ...prev, partiallyCreatedStructureId: value }));

  const setForm = (nextForm: StructureForm | ((prev: StructureForm) => StructureForm)) =>
    setFormState((prev) => ({
      ...prev,
      form: typeof nextForm === "function" ? nextForm(prev.form) : nextForm,
    }));

  const setBrandingForm = (next: Partial<EntityBranding> | ((prev: Partial<EntityBranding>) => Partial<EntityBranding>)) =>
    setFormState((prev) => ({
      ...prev,
      brandingForm: typeof next === "function" ? next(prev.brandingForm) : next,
    }));

  const setUsers = (next: StructureUser[] | ((prev: StructureUser[]) => StructureUser[])) =>
    setFormState((prev) => ({
      ...prev,
      users: typeof next === "function" ? next(prev.users) : next,
    }));

  const setPendingImportFile = (file: File | null) =>
    setFormState((prev) => ({ ...prev, pendingImportFile: file }));

  const setPendingImportUsersCount = (count: number) =>
    setFormState((prev) => ({ ...prev, pendingImportUsersCount: count }));

  const setUserForm = (nextForm: StructureUserForm | ((prev: StructureUserForm) => StructureUserForm)) =>
    setFormState((prev) => ({
      ...prev,
      userForm: typeof nextForm === "function" ? nextForm(prev.userForm) : nextForm,
    }));

  const setAvailableUserRoles = (next: string[] | ((prev: string[]) => string[])) =>
    setFormState((prev) => ({
      ...prev,
      availableUserRoles: typeof next === "function" ? next(prev.availableUserRoles) : next,
    }));

  const setShowUserForm = (value: boolean) =>
    setFormState((prev) => ({ ...prev, showUserForm: value }));

  const setProduitOptions = (next: Array<{ id: string; nom: string }> | ((prev: Array<{ id: string; nom: string }>) => Array<{ id: string; nom: string }>)) =>
    setFormState((prev) => ({
      ...prev,
      produitOptions: typeof next === "function" ? next(prev.produitOptions) : next,
    }));

  const setPackageOptions = (next: Array<{ id: string; nom: string }> | ((prev: Array<{ id: string; nom: string }>) => Array<{ id: string; nom: string }>)) =>
    setFormState((prev) => ({
      ...prev,
      packageOptions: typeof next === "function" ? next(prev.packageOptions) : next,
    }));

  const setIsSaving = (value: boolean) =>
    setFormState((prev) => ({ ...prev, isSaving: value }));

  const setPendingLogoFile = (file: File | null) =>
    setFormState((prev) => ({ ...prev, pendingLogoFile: file }));

  const setSelectedUserId = (value: string | null) =>
    setFormState((prev) => ({ ...prev, selectedUserId: value }));

  const setIsUpdatingUser = (value: boolean) =>
    setFormState((prev) => ({ ...prev, isUpdatingUser: value }));

  const onLogoFileSelected = (file: File | null) => {
    setPendingLogoFile(file);
    if (!file) {
      setForm((prev) => ({ ...prev, logoUrl: "", logoFile: null }));
      return;
    }

    const previewUrl = typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : "";
    setForm((prev) => ({ ...prev, logoUrl: previewUrl, logoFile: file }));
  };

  const handleLogoFileChange = onLogoFileSelected;

  const { saveBranding } = useTheme();
  const mergeCatalog = useStructureCatalogStore((state) => state.mergeFromList);
  const upsertCatalog = useStructureCatalogStore((state) => state.upsert);
  const structureUsersRegistry = useStructureUsersStore((state) => state.items);
  const upsertStructureUsers = useStructureUsersStore((state) => state.upsertForStructure);
  const removeStructureUsers = useStructureUsersStore((state) => state.removeForStructure);
  const mergeStructureUsersInLocalStore = (_users: StructureUser[]) => { };

  const { currentActorRole, currentPermissions } = useCurrentActor();
  const entityContext = "Structure" as const;

  const permissions = {
    canRead: can(currentActorRole, "read", entityContext, currentPermissions),
    canCreate: can(currentActorRole, "create", entityContext, currentPermissions),
    canUpdate: can(currentActorRole, "update", entityContext, currentPermissions),
    canDelete: can(currentActorRole, "delete", entityContext, currentPermissions),
  };

  const getStructurePayload = (input: NormalizedStructureFormInput, includeCode: boolean) => {
    const fileToUpload = form.logoFile || pendingLogoFile;

    return {
      name: input.name,
      type: input.type,
      ...(includeCode && input.code ? { code: input.code } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.legalName ? { legal_name: input.legalName } : {}),
      ...(input.registrationNumber ? { registration_number: input.registrationNumber } : {}),
      ...(input.address ? { address: input.address } : {}),
      ...(input.contactEmail ? { contact_email: input.contactEmail } : {}),
      ...(input.contactPhone ? { contact_phone: input.contactPhone } : {}),
      ...(input.produitId ? { product_id: input.produitId } : {}),
      sender_label: input.libelleExpediteurSMS || null,
      package: input.packageId || null,
      file: fileToUpload || undefined,
      branding_config: {
        primaryColor: form.primaryColor || DEFAULT_BRANDING_COLORS.primaryColor,
        secondaryColor: form.secondaryColor || DEFAULT_BRANDING_COLORS.secondaryColor,
        accentColor: form.accentColor || DEFAULT_BRANDING_COLORS.accentColor,
        sidebarColor: form.sidebarColor || DEFAULT_BRANDING_COLORS.sidebarColor,
        borderColor: form.borderColor || DEFAULT_BRANDING_COLORS.borderColor,
      },
    };
  };

  const validateAndNormalizeFormInput = (): NormalizedStructureFormInput | null => {
    const normalized: NormalizedStructureFormInput = {
      name: form.name.trim(),
      code: editingStructure?.code ?? "",
      type: normalizeFormType(form.type.trim()),
      description: form.description.trim(),
      legalName: form.legal_name.trim(),
      registrationNumber: form.registration_number.trim(),
      address: form.address.trim(),
      contactEmail: form.contact_email.trim(),
      contactPhone: form.contact_phone.trim(),
      libelleExpediteurSMS: form.libelleExpediteurSMS.trim(),
      packageId: form.packageId.trim(),
      produitId: form.produitId.trim(),
    };

    if (!editingStructure && !form.ajouterProduit) {
      // Le produit est obligatoire selon le schéma backend
      setForm((prev) => ({ ...prev, ajouterProduit: true }));
    }

    const validationErrors = validateStructureForm(form, Boolean(editingStructure));
    setFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) {
      return null;
    }

    return normalized;
  };

  const findHierarchyMemberByUsername = (
    members: Awaited<ReturnType<typeof listHierarchyMembers>> | null,
    username: string,
  ) => members?.users.find((member) => (member.username?.trim().toLowerCase() ?? "") === username.toLowerCase());

  const resolveExistingHierarchyMember = async (
    hierarchyMembers: Awaited<ReturnType<typeof listHierarchyMembers>>,
    structureId: string,
    username: string,
  ) => {
    let existing = findHierarchyMemberByUsername(hierarchyMembers, username);
    if (existing?.user_id) {
      return existing;
    }

    const refreshed = await listHierarchyMembers(
      ACCESS_SECURITY_STRUCTURE_SCOPE_REF_TYPE,
      structureId,
      ACCESS_SECURITY_CLIENT_ID,
    );

    existing = findHierarchyMemberByUsername(refreshed, username);
    if (!existing?.user_id) {
      throw new Error(
        `L'identifiant '${username}' est déjà utilisé. Veuillez en choisir un autre.`,
      );
    }

    return existing;
  };

  const toResolvedStructureUser = (
    user: StructureUser,
    accountUserId: string,
    username: string,
    email: string,
  ): StructureUser => ({
    id: accountUserId,
    username,
    email,
    isPendingCreation: false,
    nom: user.nom,
    prenom: user.prenom,
    matricule: user.matricule,
    profil: user.profil,
  });

  const mapStructureUserCreationError = (username: string, rawMessage: string): Error => {
    const message = rawMessage.toLowerCase();

    if (message.includes("invalid target scope reference")) {
      return new Error(
        `Utilisateur ${username}: scope cible invalide (ref_type=${ACCESS_SECURITY_STRUCTURE_SCOPE_REF_TYPE}, ref_id=${editingStructure?.id ?? ""}). Vérifiez la configuration Access Security.`,
      );
    }

    if (message.includes("unable to validate referential from im")) {
      return new Error(`Utilisateur ${username}: le service référentiel IM est indisponible côté backend.`);
    }

    return new Error(`Impossible de créer l'utilisateur ${username}: ${rawMessage}`);
  };

  useEffect(() => {
    if (!dialogOpen) {
      setPartiallyCreatedStructureId(null);
    }
  }, [dialogOpen]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const buildUpdatedStructures = (
      previousStructures: Structure[],
      structuresData: StructureRead[],
      registry: RegistryUsersEntry[],
    ) => {
      const mappedStructures = mapStructuresFromApi(
        structuresData,
        previousStructures,
        registry,
      );
      mergeCatalog(toCatalogItems(mappedStructures));
      return mappedStructures;
    };

    const initLoad = async () => {
      try {
        const params: FetchStructuresParams = {
          skip: 0,
          limit: 100,
          search: search.trim() || undefined,
          include_inactive: filterStatut === "all" || filterStatut === "inactive",
          is_active: filterStatut === "active" ? true : filterStatut === "inactive" ? false : undefined,
        };

        const structuresRes = await fetchStructures(params);

        if (!active) return;

        const items = Array.isArray(structuresRes?.items)
          ? structuresRes.items
          : Array.isArray(structuresRes)
            ? structuresRes
            : [];
        const total = typeof structuresRes?.total === "number" ? structuresRes.total : items.length;
        const summary = structuresRes?.summary ?? null;

        setListState((prev) => ({
          ...prev,
          structures: buildUpdatedStructures(
            prev.structures,
            items,
            structureUsersRegistry as RegistryUsersEntry[],
          ),
          total,
          summary,
          error: null,
          loading: false,
        }));
      } catch {
        if (!active) return;
        setListState((prev) => ({
          ...prev,
          structures: [],
          total: 0,
          summary: null,
          error: "Impossible de charger les structures",
          loading: false,
        }));
      }
    };

    initLoad();

    return () => {
      active = false;
    };
  }, [filterStatut, mergeCatalog, search, structureUsersRegistry]);

  useEffect(() => {
    if (!dialogOpen) return;
    let active = true;

    listClientCompositeRoles(ACCESS_SECURITY_CLIENT_ID)
      .then((roles) => {
        if (!active) return;
        const filteredRoles = roles
          .filter(isProfileRole)
          .filter((role) => isProfileRoleForEntityContext(role, "Structure"));
        setAvailableUserRoles(filteredRoles);
      })
      .catch(() => {
        if (!active) return;
        setAvailableUserRoles([]);
      });

    return () => {
      active = false;
    };
  }, [dialogOpen]);

  useEffect(() => {
    if (availableUserRoles.length === 0) {
      return;
    }

    setUserForm((previous) => {
      if (availableUserRoles.includes(previous.profil)) {
        return previous;
      }

      return {
        ...previous,
        profil: availableUserRoles[0],
      };
    });
  }, [availableUserRoles]);

  useEffect(() => {
    if (formState.userForm.agenceId) {
      fetchCaisses({ agency_id: formState.userForm.agenceId })
        .then((c) => {
          setFormState((prev) => ({
            ...prev,
            structureCaisses: c.map((item) => ({ id: item.id, nom: item.name })),
          }));
        })
        .catch(() => {
          setFormState((prev) => ({ ...prev, structureCaisses: [] }));
        });
    } else {
      setFormState((prev) => ({ ...prev, structureCaisses: [] }));
    }
  }, [formState.userForm.agenceId]);

  useEffect(() => {
    if (!dialogOpen) return;
    let active = true;

    fetchProduits()
      .then((data) => {
        if (!active) return;
        setProduitOptions(
          data.map((item) => ({ id: String(item.id), nom: item.nom }))
        );
      })
      .catch(() => {
        if (!active) return;
        setProduitOptions([]);
      });

    fetchPackages()
      .then((data) => {
        if (!active) return;
        setPackageOptions(
          data.filter(pkg => pkg.status === "active").map((pkg) => ({ id: String(pkg.id), nom: pkg.label }))
        );
      })
      .catch(() => {
        if (!active) return;
        setPackageOptions([]);
      });

    return () => {
      active = false;
    };
  }, [dialogOpen]);

  const filtered = structures;

  const openAdd = () => {
    if (!permissions.canCreate) {
      toast.error("Vous n'avez pas l'habilitation pour ajouter une structure");
      return;
    }

    setEditingStructure(null);
    setSelectedUserId(null);
    setPendingLogoFile(null);
    setForm({
      ...emptyForm,
      logoUrl: "",
      logoFile: null,
      ajouterProduit: true,
      produitId: produitOptions[0]?.id ?? "",
    });
    setUsers([]);
    setUserForm({
      ...emptyUserForm,
      profil: availableUserRoles[0] ?? emptyUserForm.profil,
    });
    setFormState((prev) => ({
      ...prev,
      structureAgences: [],
      structureCaisses: [],
    }));
    setShowUserForm(false);
    setBrandingForm({ ...emptyBranding });
    setDialogOpen(true);
  };

  const confirmToggleStatut = (structure: Structure) => {
    if (!permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour modifier le statut");
      return;
    }

    setTogglingStructure(structure);
    setStatutDialogOpen(true);
  };

  const openEdit = (s: Structure) => {
    if (!permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour modifier une structure");
      return;
    }

    setEditingStructure(s);
    setSelectedUserId(null);
    setPendingLogoFile(null);
    setForm({
      code: s.code,
      name: s.name,
      type: s.type,
      description: s.description || "",
      legal_name: s.legal_name || "",
      registration_number: s.registration_number || "",
      address: s.address,
      contact_email: s.contact_email || "",
      contact_phone: s.contact_phone || "",
      is_active: s.is_active,
      logoUrl: s.media_url || "",
      logoFile: null,
      libelleExpediteurSMS: s.libelleExpediteurSMS || "",
      packageId: s.packageId || "",
      ajouterProduit: !!s.produitId,
      produitId: s.produitId || "",
      primaryColor: s.branding?.primaryColor || DEFAULT_BRANDING_COLORS.primaryColor,
      secondaryColor: s.branding?.secondaryColor || DEFAULT_BRANDING_COLORS.secondaryColor,
      accentColor: s.branding?.accentColor || DEFAULT_BRANDING_COLORS.accentColor,
      sidebarColor: s.branding?.sidebarColor || DEFAULT_BRANDING_COLORS.sidebarColor,
      borderColor: s.branding?.borderColor || DEFAULT_BRANDING_COLORS.borderColor,
    });
    setUsers(s.utilisateurs.map((u) => ({ ...u, isPendingCreation: false })));
    setUserForm({
      ...emptyUserForm,
      profil: availableUserRoles[0] ?? emptyUserForm.profil,
    });
    setShowUserForm(false);
    setBrandingForm(s.branding || { ...emptyBranding, entityName: s.name });
    setDialogOpen(true);

    fetchAgences({ parent_id: s.id, parent_type: "STRUCTURE" })
      .then((ag) => {
        setFormState((prev) => ({
          ...prev,
          structureAgences: ag.map((a) => ({ id: a.id, nom: a.name })),
        }));
      })
      .catch(() => {
        setFormState((prev) => ({ ...prev, structureAgences: [] }));
      });

    listHierarchyMembers(ACCESS_SECURITY_STRUCTURE_SCOPE_REF_TYPE, s.id, ACCESS_SECURITY_CLIENT_ID)
      .then((res) => {
        if (res.users && res.users.length > 0) {
          const keycloakUsers: StructureUser[] = res.users.map((u) => ({
            id: u.user_id,
            nom: u.last_name || "",
            prenom: u.first_name || "",
            username: u.username || "",
            email: u.email || "",
            matricule: u.matricule || "",
            profil: u.profiles?.[0] || "",
            agenceId: u.agence || "",
            caisseId: u.caisse || "",
            isPendingCreation: false,
          }));

          setUsers(keycloakUsers);
        }
      })
      .catch(() => { });
  };

  const openAddUserForm = () => {
    setSelectedUserId(null);
    setUserForm({
      ...emptyUserForm,
      profil: availableUserRoles[0] ?? emptyUserForm.profil,
    });
    resetUserFormErrors();
    setShowUserForm(true);
  };

  const cancelUserForm = () => {
    resetUserFormErrors();
    setSelectedUserId(null);
    setUserForm(emptyUserForm);
    setShowUserForm(false);
  };

  const addUser = () => {
    const prenom = userForm.prenom.trim();
    const nom = userForm.nom.trim();
    const username = (userForm.username.trim() || deriveLogin(prenom, nom, users.map((u) => u.username))).trim();
    const email = userForm.email.trim().toLowerCase();

    const validationErrors = validateStructureUserForm({ prenom, nom, username, email, profil: userForm.profil });
    setUserFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) {
      return;
    }

    setUsers((prev) => {
      const existingIndex = prev.findIndex(
        (u) =>
          (u.username && u.username.toLowerCase() === username.toLowerCase()) ||
          (email && u.email && u.email.toLowerCase() === email),
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          nom,
          prenom,
          username,
          email,
          profil: userForm.profil,
          agenceId: userForm.agenceId,
          caisseId: userForm.caisseId,
        };
        return updated;
      }

      const newUser: StructureUser = {
        id: buildPendingUserId(username, email),
        username,
        email,
        isPendingCreation: true,
        nom,
        prenom,
        matricule: userForm.matricule?.trim() || undefined,
        profil: userForm.profil,
        agenceId: userForm.agenceId,
        caisseId: userForm.caisseId,
      };
      return [...prev, newUser];
    });

    setUserForm(emptyUserForm);
    setSelectedUserId(null);
    setShowUserForm(false);
    toast.success("Utilisateur enregistré");
  };

  const removeUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const editUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    setUserForm({
      nom: user.nom,
      prenom: user.prenom,
      username: user.username || "",
      email: user.email || "",
      profil: user.profil,
      matricule: user.matricule || "",
      agenceId: user.agenceId || "",
      caisseId: user.caisseId || "",
    });
    resetUserFormErrors();
    setSelectedUserId(user.isPendingCreation ? null : user.id);
    setShowUserForm(true);
  };

  const updateStructureUser = async () => {
    if (!editingStructure || !selectedUserId) {
      toast.error("Sélectionnez un utilisateur à modifier");
      return;
    }

    const firstName = userForm.prenom.trim();
    const lastName = userForm.nom.trim();
    const email = userForm.email.trim().toLowerCase();
    const validationErrors = validateStructureUserForm({
      prenom: firstName,
      nom: lastName,
      username: userForm.username,
      email,
      profil: userForm.profil,
    });
    setUserFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) {
      return;
    }

    setIsUpdatingUser(true);
    try {
      const updatedUser = await updateAccessSecurityUser(selectedUserId, {
        login: userForm.username.trim(),
        profiles: [userForm.profil],
        profile_client_id: "backoffice-web",
        first_name: firstName,
        last_name: lastName,
        email,
        matricule: userForm.matricule?.trim() || null,
        telephone: null,
        agence: userForm.agenceId || null,
        caisse: userForm.caisseId || null,
      });
      setUsers((prev) => prev.map((user) => user.id === selectedUserId
        ? { ...user, prenom: updatedUser.first_name || firstName, nom: updatedUser.last_name || lastName, email: updatedUser.email || email, profil: userForm.profil, agenceId: userForm.agenceId, caisseId: userForm.caisseId }
        : user));
      setSelectedUserId(null);
      toast.success("Utilisateur modifié avec succès");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier l'utilisateur");
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const executeImportBackofficeUsers = async (file: File, structureId: string) => {
    try {
      const response = await importBackofficeUsers(file, [{ ref_type: "STRUCTURE", ref_id: structureId }]);
      if (response.failures > 0) {
        const translateReason = (reason: string) => {
          if (reason.includes("Resource already exists") || reason.includes("already exists")) {
            return "Ce login ou e-mail existe déjà";
          }
          return reason;
        };

        const errorDetails = response.failure_details.slice(0, 3).map(d => `- Ligne ${d.row_number} (${d.username}): ${translateReason(d.reason)}`).join("\n");

        if (response.successful_imports === 0) {
          toast.error(`Import échoué: 0 importé, ${response.failures} erreur(s).\n${errorDetails}`, { duration: 5000, style: { whiteSpace: 'pre-line' } });
        } else {
          toast.warning(`Import partiel: ${response.successful_imports} importé(s), ${response.failures} erreur(s).\n${errorDetails}`, { duration: 5000, style: { whiteSpace: 'pre-line' } });
        }
      } else {
        toast.success(`${response.successful_imports} utilisateur(s) importé(s) avec succès`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error(`Erreur lors de l'import: ${msg}`);
    }
  };

  const importUsersFromFile = async (file: File) => {
    if (!editingStructure) return;
    await executeImportBackofficeUsers(file, editingStructure.id);

    // Reload structure users
    const resolvedUsers = await resolveStructureUsers(editingStructure.id);
    setUsers(resolvedUsers);
  };

  const buildBrandingEntity = (brandingData: Partial<EntityBranding>, id: string, name: string): EntityBranding => ({
    id,
    entityName: brandingData.entityName || name,
    logoUrl: brandingData.logoUrl || "",
    faviconUrl: brandingData.faviconUrl || "",
    primaryColor: brandingData.primaryColor || "220 70% 18%",
    secondaryColor: brandingData.secondaryColor || "220 15% 93%",
    accentColor: brandingData.accentColor || "160 84% 39%",
    sidebarColor: brandingData.sidebarColor || "220 70% 12%",
    borderColor: brandingData.borderColor || "220 75% 15%",
    fontFamily: brandingData.fontFamily || "Inter",
    loginBgUrl: brandingData.loginBgUrl || "",
    tagline: brandingData.tagline || "",
  });

  const normalizeFormType = (value: string): Structure["type"] => {
    const allowedTypes: Structure["type"][] = ["BANK", "IMF", "PARTNER", "OTHER"];
    if (allowedTypes.includes(value as Structure["type"])) {
      return value as Structure["type"];
    }
    return "OTHER";
  };

  const resolveStructureUsers = async (structureId: string): Promise<StructureUser[]> => {
    if (users.length === 0 && !pendingImportFile) {
      return [];
    }

    const shouldCreatePendingUser = (user: StructureUser): boolean => {
      const username = user.username?.trim() ?? "";
      const email = user.email?.trim().toLowerCase() ?? "";
      const isPending = user.isPendingCreation === true;
      const isImported = user.id.startsWith("pending-import-");
      return isPending && username && email && !(isImported && pendingImportFile);
    };

    const hasPendingUsers = users.some(shouldCreatePendingUser) || Boolean(pendingImportFile);
    if (!hasPendingUsers) {
      return users;
    }

    const hierarchyMembers = await listHierarchyMembers(
      ACCESS_SECURITY_STRUCTURE_SCOPE_REF_TYPE,
      structureId,
      ACCESS_SECURITY_CLIENT_ID,
    );

    const resolvedUsers: StructureUser[] = [];

    const createOrReuseUser = async (user: StructureUser): Promise<StructureUser> => {
      const username = user.username?.trim() ?? "";
      const email = user.email?.trim().toLowerCase() ?? "";

      try {
        const targetScope: TargetScopeRef[] = [
          {
            ref_type: ACCESS_SECURITY_STRUCTURE_SCOPE_REF_TYPE,
            ref_id: structureId,
          },
        ];

        if (user.agenceId?.trim()) {
          targetScope.push({
            ref_type: "AGENCE",
            ref_id: user.agenceId.trim(),
          });
        }

        if (user.caisseId?.trim()) {
          targetScope.push({
            ref_type: "CAISSE",
            ref_id: user.caisseId.trim(),
          });
        }

        const createPayload = {
          username,
          email,
          target_scope: targetScope,
          profiles: [user.profil],
          matricule: user.matricule?.trim() || null,
          first_name: user.prenom?.trim() || null,
          last_name: user.nom?.trim() || null,
          agence: user.agenceId || null,
          caisse: user.caisseId || null,
        };
        const created = await createBackofficeUser(createPayload);
        return toResolvedStructureUser(user, created.account_user_id, created.account_username, email);
      } catch (error) {
        const rawMessage = error instanceof Error ? error.message : "Erreur inconnue";
        const message = rawMessage.toLowerCase();

        if (message.includes("already exist") || message.includes("déjà") || message.includes("resource already exists in keycloak")) {
          const existing = await resolveExistingHierarchyMember(hierarchyMembers, structureId, username);
          return toResolvedStructureUser(user, existing.user_id, username, email);
        }

        const mappedError = mapStructureUserCreationError(username, rawMessage);
        if (mappedError.message.includes("scope cible invalide")) {
          throw new Error(
            `Utilisateur ${username}: scope cible invalide (ref_type=${ACCESS_SECURITY_STRUCTURE_SCOPE_REF_TYPE}, ref_id=${structureId}). Vérifiez la configuration Access Security.`,
          );
        }
        throw mappedError;
      }
    };

    try {
      for (const user of users) {
        const isImported = user.id.startsWith("pending-import-");
        if (!shouldCreatePendingUser(user)) {
          if (!isImported) {
            resolvedUsers.push(user);
          }
          continue;
        }

        resolvedUsers.push(await createOrReuseUser(user));
      }
    } catch (error) {
      const failedIndex = resolvedUsers.length;
      const remainingUsers = users.slice(failedIndex);
      setUsers([...resolvedUsers, ...remainingUsers]);
      throw error;
    }

    return resolvedUsers;
  };

  const saveEditingStructure = async (
    input: NormalizedStructureFormInput,
    brandingData: Partial<EntityBranding>,
  ) => {
    if (!editingStructure) {
      return;
    }

    const hasStructureFieldChanges =
      normalize(editingStructure.name) !== normalize(input.name)
      || editingStructure.type !== input.type
      || normalize(editingStructure.description || "") !== normalize(input.description)
      || normalize(editingStructure.legal_name || "") !== normalize(input.legalName)
      || normalize(editingStructure.registration_number || "") !== normalize(input.registrationNumber)
      || normalize(editingStructure.address || "") !== normalize(input.address)
      || normalize(editingStructure.contact_email || "") !== normalize(input.contactEmail)
      || normalize(editingStructure.contact_phone || "") !== normalize(input.contactPhone)
      || normalize(editingStructure.produitId || "") !== normalize(form.ajouterProduit ? input.produitId : "")
      || editingStructure.media_url !== form.logoUrl
      || normalize(editingStructure.libelleExpediteurSMS || "") !== normalize(input.libelleExpediteurSMS)
      || normalize(editingStructure.packageId || "") !== normalize(input.packageId)
      || editingStructure.branding?.primaryColor !== form.primaryColor
      || editingStructure.branding?.secondaryColor !== form.secondaryColor
      || editingStructure.branding?.accentColor !== form.accentColor
      || editingStructure.branding?.sidebarColor !== form.sidebarColor
      || editingStructure.branding?.borderColor !== form.borderColor;

    const structureToUpdate: Structure = {
      ...editingStructure,
      code: input.code,
      name: input.name,
      type: input.type,
      description: input.description || null,
      legal_name: input.legalName || null,
      registration_number: input.registrationNumber || null,
      address: input.address,
      contact_email: input.contactEmail || null,
      contact_phone: input.contactPhone || null,
      is_active: form.is_active,
      media_url: form.logoUrl,
      mediaUrl: form.logoUrl,
      libelleExpediteurSMS: input.libelleExpediteurSMS,
      packageId: input.packageId,
      produitId: form.ajouterProduit ? input.produitId : undefined,
      utilisateurs: users,
      branding: brandingData,
    };

    const payload = getStructurePayload(input, false);
    const fileToUpload = form.logoFile || pendingLogoFile;

    let updated = null;
    if (hasStructureFieldChanges || (editingStructure.media_url !== form.logoUrl && !form.logoUrl.startsWith("blob:") && !form.logoUrl.startsWith("data:")) || fileToUpload) {
      updated = await updateStructure(editingStructure.id, payload, fileToUpload);
      setPendingLogoFile(null);
    }

    const hasPackageChanged = editingStructure.packageId !== input.packageId;
    if (hasPackageChanged && input.packageId) {
      if (!editingStructure.packageId) {
        await assignPackageToStructure(editingStructure.id, input.packageId);
      } else {
        await changeStructurePackage(editingStructure.id, input.packageId);
      }
    }

    const finalMediaUrl = updated?.media_url ?? "";
    const finalBrandingData = {
      ...brandingData,
      mediaUrl: finalMediaUrl,
      logoUrl: finalMediaUrl,
    };

    const resolvedUsers = await resolveStructureUsers(editingStructure.id);
    const updatedStructure = {
      ...(updated ? enrichStructure(updated, structureToUpdate) : structureToUpdate),
      utilisateurs: resolvedUsers,
      branding: finalBrandingData,
      media_url: finalMediaUrl,
      mediaUrl: finalMediaUrl,
      libelleExpediteurSMS: input.libelleExpediteurSMS,
      packageId: input.packageId,
      produitId: form.ajouterProduit ? input.produitId : undefined,
    };

    setStructures((prev) => prev.map((structure) => (structure.id === editingStructure.id ? updatedStructure : structure)));
    upsertStructureUsers({
      structureId: updatedStructure.id,
      structureCode: updatedStructure.code,
      structureName: updatedStructure.name,
      users: resolvedUsers,
    });
    mergeStructureUsersInLocalStore(resolvedUsers);
    saveBranding(buildBrandingEntity(finalBrandingData, editingStructure.id, input.name));
    upsertCatalog({ id: editingStructure.id, nom: input.name });
    toast.success("Structure modifiée avec succès");
  };

  const saveNewStructure = async (
    input: NormalizedStructureFormInput,
    brandingData: Partial<EntityBranding>,
  ) => {
    const fileToUpload = form.logoFile || pendingLogoFile;
    let structureId = partiallyCreatedStructureId;
    let created;
    if (!structureId) {
      created = await createStructure(getStructurePayload(input, true), fileToUpload);
      structureId = created.id;
      setPartiallyCreatedStructureId(structureId);
      setPendingLogoFile(null);
    } else {
      created = await updateStructure(structureId, getStructurePayload(input, false), fileToUpload);
      setPendingLogoFile(null);
    }

    if (input.packageId) {
      try {
        await assignPackageToStructure(structureId, input.packageId);
      } catch (pkgError) {
        console.error("[saveNewStructure] Failed to assign package:", pkgError);
      }
    }

    if (pendingImportFile) {
      await executeImportBackofficeUsers(pendingImportFile, structureId);
      setPendingImportFile(null);
      setPendingImportUsersCount(0);
    }

    const finalMediaUrl = created?.media_url ?? "";
    const finalBrandingData = {
      ...brandingData,
      mediaUrl: finalMediaUrl,
      logoUrl: finalMediaUrl,
    };

    const hasUsersToProcess = users.length > 0 || Boolean(pendingImportFile);
    const resolvedUsers = hasUsersToProcess ? await resolveStructureUsers(structureId) : [];
    const createdStructure: Structure = {
      id: structureId,
      code: created.code ?? input.code,
      name: created.name,
      type: mapReadTypeToUiType(created),
      description: created.description ?? (input.description || null),
      legal_name: created.legal_name ?? (input.legalName || null),
      registration_number: created.registration_number ?? (input.registrationNumber || null),
      address: created.address || input.address,
      contact_email: created.contact_email ?? (input.contactEmail || null),
      contact_phone: created.contact_phone ?? (input.contactPhone || null),
      is_active: created.is_active,
      activated_at: created.activated_at ?? null,
      deactivated_at: created.deactivated_at ?? null,
      nombreAgences: 0,
      utilisateurs: resolvedUsers,
      branding: finalBrandingData,
      media_url: finalMediaUrl,
      mediaUrl: finalMediaUrl,
      libelleExpediteurSMS: input.libelleExpediteurSMS,
      packageId: input.packageId,
      produitId: form.ajouterProduit ? input.produitId : undefined,
    };

    setListState((prev) => ({
      ...prev,
      structures: [createdStructure, ...prev.structures],
      total: prev.total + 1,
      summary: prev.summary
        ? {
            ...prev.summary,
            total: prev.summary.total + 1,
            actifs: createdStructure.is_active ? prev.summary.actifs + 1 : prev.summary.actifs,
            inactifs: !createdStructure.is_active ? prev.summary.inactifs + 1 : prev.summary.inactifs,
          }
        : null,
    }));
    if (resolvedUsers.length > 0) {
      upsertStructureUsers({
        structureId: createdStructure.id,
        structureCode: createdStructure.code,
        structureName: createdStructure.name,
        users: resolvedUsers,
      });
      mergeStructureUsersInLocalStore(resolvedUsers);
    }
    saveBranding(buildBrandingEntity(finalBrandingData, createdStructure.id, input.name));
    upsertCatalog({ id: createdStructure.id, nom: input.name });
    setPartiallyCreatedStructureId(null);
    toast.success("Structure ajoutée avec succès");
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    if (editingStructure && !permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour modifier une structure");
      return;
    }

    if (!editingStructure && !permissions.canCreate) {
      toast.error("Vous n'avez pas l'habilitation pour ajouter une structure");
      return;
    }

    const normalizedInput = validateAndNormalizeFormInput();
    if (!normalizedInput) {
      return;
    }

    const brandingData: Partial<EntityBranding> = {
      ...brandingForm,
      entityName: brandingForm.entityName || normalizedInput.name,
    };

    try {
      setIsSaving(true);

      if (editingStructure) {
        await saveEditingStructure(normalizedInput, brandingData);
      } else {
        await saveNewStructure(normalizedInput, brandingData);
      }

      setDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'enregistrer la structure";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!permissions.canDelete) {
      toast.error("Vous n'avez pas l'habilitation pour supprimer une structure");
      return;
    }

    if (deletingStructure) {
      try {
        await deleteStructure(deletingStructure.id);

        setListState((prev) => ({
          ...prev,
          structures: prev.structures.filter((s) => s.id !== deletingStructure.id),
          total: Math.max(0, prev.total - 1),
          summary: prev.summary
            ? {
                ...prev.summary,
                total: Math.max(0, prev.summary.total - 1),
                actifs: deletingStructure.is_active ? Math.max(0, prev.summary.actifs - 1) : prev.summary.actifs,
                inactifs: !deletingStructure.is_active ? Math.max(0, prev.summary.inactifs - 1) : prev.summary.inactifs,
              }
            : null,
        }));
        removeStructureUsers(deletingStructure.id);
        toast.success("Structure supprimée avec succès");
        setDeleteDialogOpen(false);
        setDeletingStructure(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Impossible de supprimer la structure";
        toast.error(message);
      }
    }
  };

  const toggleStatut = async () => {
    if (!permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour modifier le statut");
      return;
    }

    if (!togglingStructure) {
      return;
    }

    try {
      const nextActive = !togglingStructure.is_active;
      const updated = await toggleStructureStatus(togglingStructure.id, nextActive);
      const mapped = enrichStructure(updated, togglingStructure);

      setListState((prev) => ({
        ...prev,
        structures: prev.structures.map((structure) =>
          structure.id === togglingStructure.id
            ? { ...mapped, utilisateurs: structure.utilisateurs, branding: structure.branding }
            : structure
        ),
        summary: prev.summary
          ? {
              ...prev.summary,
              actifs: nextActive ? prev.summary.actifs + 1 : Math.max(0, prev.summary.actifs - 1),
              inactifs: !nextActive ? prev.summary.inactifs + 1 : Math.max(0, prev.summary.inactifs - 1),
            }
          : null,
      }));

      toast.success("Statut mis à jour");
      setStatutDialogOpen(false);
      setTogglingStructure(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de modifier le statut";
      toast.error(message);
    }
  };

  return {
    currentActorRole, entityContext, permissions,
    structures, filtered, total, summary, search, setSearch, loading, error,
    filterStatut, setFilterStatut,
    dialogOpen, setDialogOpen, deleteDialogOpen, setDeleteDialogOpen,
    statutDialogOpen, setStatutDialogOpen,
    editingStructure, deletingStructure, setDeletingStructure, togglingStructure,
    form, setForm, formErrors, clearFormError, brandingForm, setBrandingForm,
    users, setUsers, userForm, setUserForm, userFormErrors, clearUserFormError, showUserForm, setShowUserForm,
    availableUserRoles,
    produitOptions, packageOptions, isSaving,
    addUser, removeUser, editUser, updateStructureUser, openAddUserForm, importUsersFromFile,
    selectedUserId, isUpdatingUser,
    structureAgences, structureCaisses,
    cancelUserForm,
    pendingImportFile, setPendingImportFile,
    pendingImportUsersCount, setPendingImportUsersCount,
    openAdd, openEdit, confirmToggleStatut, handleSave, handleDelete, toggleStatut,
    handleLogoFileChange,
    onLogoFileSelected,
    pendingLogoFile,
    deriveLogin,
  };
};
