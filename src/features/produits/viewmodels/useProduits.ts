import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { can } from "@/core/permissions/permissions";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import { emptyForm, emptyUserDraft, DEFAULT_BRANDING_COLORS } from "../models/data";
import { ProduitForm, ProduitRead, ProduitUtilisateurForm, ProduitUserDraft, ProductSummary } from "../models/types";
import { fetchStructures, updateStructure, extractStructuresList } from "@/features/structures/services/structuresService";
import type { StructureRead } from "@/features/structures/models/types";
import {
  AccessSecurityRefType,
  createBackofficeUser,
  listHierarchyMembers,
  listClientCompositeRoles,
  updateAccessSecurityUser,
  TargetScopeRef,
} from "@/core/security/accessSecurityService";
import { getCurrentInstitutionId } from "@/core/security/authStore";
import { isProfileRole, isProfileRoleForEntityContext } from "@/features/utilisateurs/models/profileLabels";
import { FieldErrors, hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import {
  ProduitFormField,
  ProduitUserDraftField,
  validateProduitForm as validateProduitFormFields,
  validateProduitUserDraft,
} from "../models/validation";
import {
  archiveProduit,
  createProduit,
  fetchProductStructures,
  fetchProduits,
  toggleProduitStatus,
  updateProduit,
  mapApiProductToUi,
} from "../services/produitsService";

const ACCESS_SECURITY_CLIENT_ID = import.meta.env.VITE_ACCESS_SECURITY_CLIENT_ID ?? "backoffice-web";
const ACCESS_SECURITY_PRODUCT_SCOPE_REF_TYPE: AccessSecurityRefType = "PRODUCT";

const normalizeLoginPart = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

const normalizeProductCode = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 20) || "PRODUIT";

type ProductHierarchyMembers = Awaited<ReturnType<typeof listHierarchyMembers>>;
type ProduitMutationPayload = Omit<ProduitRead, "id" | "dateCreation" | "archived"> & {
  file?: File | null;
  logoFile?: File | null;
};

const wait = (delayMs: number): Promise<void> =>
  new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });

const findHierarchyMemberByUsername = (
  members: ProductHierarchyMembers | null,
  username: string,
) => members?.users.find((member) => (member.username?.trim().toLowerCase() ?? "") === username.toLowerCase()) ?? null;

const buildResolvedContractUser = (
  user: ProduitUtilisateurForm,
  accountUserId: string,
  username: string,
  email: string,
): ProduitUtilisateurForm => ({
  id: accountUserId,
  username,
  email,
  nom: user.nom,
  prenom: user.prenom,
  matricule: user.matricule ?? "",
  profil: user.profil,
  isPendingCreation: false,
});

const isAlreadyExistingUserError = (message: string): boolean =>
  message.includes("already exist") || message.includes("déjà") || message.includes("resource already exists in keycloak");

const getContractUserCreationError = (username: string, produitId: string, rawMessage: string): Error => {
  const message = rawMessage.toLowerCase();

  if (message.includes("invalid target scope reference")) {
    return new Error(
      `Utilisateur ${username}: scope cible invalide (ref_type=${ACCESS_SECURITY_PRODUCT_SCOPE_REF_TYPE}, ref_id=${produitId}). Vérifiez la configuration Access Security.`,
    );
  }

  if (message.includes("unable to validate referential from im")) {
    return new Error(`Utilisateur ${username}: le service référentiel IM est indisponible côté backend.`);
  }

  return new Error(`Impossible de créer l'utilisateur ${username}: ${rawMessage}`);
};

const formatProduitPdfUser = (user: ProduitUtilisateurForm): string => {
  const matriculeSuffix = user.matricule ? `, ${user.matricule}` : "";
  return `${user.nom} ${user.prenom} (${user.profil}${matriculeSuffix})`;
};

const formatPasswordResetWarning = (failures: string[]): string =>
  failures.length === 1
    ? `L'email de réinitialisation du mot de passe n'a pas pu être envoyé à ${failures[0]}.`
    : `Les emails de réinitialisation de mot de passe n'ont pas pu être envoyés pour : ${failures.join(", ")}.`;

export interface UseProduitsOptions {
  /** Appelé une fois le produit créé (ex. enregistrement des répartitions de commission saisies). */
  onProductCreated?: (productId: string) => Promise<void>;
}

export const useProduits = (options?: UseProduitsOptions) => {
  const loginPattern = /^[A-Za-z0-9._-]+$/;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const [listState, setListState] = useState({
    produits: [] as ProduitRead[],
    loading: true,
    error: null as string | null,
    actionLoading: false,
    partiallyCreatedProductId: null as string | null,
    availableUserRoles: [] as string[],
    structureOptions: [] as Array<{ id: string; nom: string }>,
    structureRefAliases: {} as Record<string, string>,
    structureLabels: {} as Record<string, string>,
    filterStatut: "all",
    search: "",
    summary: null as ProductSummary | null,
    total: 0,
  });

  const [dialogState, setDialogState] = useState({
    dialogOpen: false,
    deleteDialogOpen: false,
    toggleDialogOpen: false,
    updateDialogOpen: false,
    editingProduit: null as ProduitRead | null,
    deletingProduit: null as ProduitRead | null,
    togglingProduit: null as ProduitRead | null,
  });

  const [formState, setFormState] = useState<ProduitForm>(emptyForm);
  const [userDraftState, setUserDraftState] = useState<ProduitUserDraft>(emptyUserDraft);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  const {
    produits,
    loading,
    error,
    actionLoading,
    partiallyCreatedProductId,
    availableUserRoles,
    structureOptions,
    structureRefAliases,
    structureLabels,
    filterStatut,
    search,
    summary,
    total,
  } = listState;

  const {
    dialogOpen,
    deleteDialogOpen,
    toggleDialogOpen,
    updateDialogOpen,
    editingProduit,
    deletingProduit,
    togglingProduit,
  } = dialogState;

  const form = formState;
  const userDraft = userDraftState;

  // Compatible setters
  const setProduits = (next: ProduitRead[] | ((prev: ProduitRead[]) => ProduitRead[])) =>
    setListState((prev) => ({
      ...prev,
      produits: typeof next === "function" ? next(prev.produits) : next,
    }));

  const setLoading = (val: boolean) => setListState((prev) => ({ ...prev, loading: val }));
  const setError = (val: string | null) => setListState((prev) => ({ ...prev, error: val }));
  const setActionLoading = (val: boolean) => setListState((prev) => ({ ...prev, actionLoading: val }));
  const setPartiallyCreatedProductId = (id: string | null) => setListState((prev) => ({ ...prev, partiallyCreatedProductId: id }));
  const setAvailableUserRoles = (next: string[] | ((prev: string[]) => string[])) =>
    setListState((prev) => ({
      ...prev,
      availableUserRoles: typeof next === "function" ? next(prev.availableUserRoles) : next,
    }));
  const setStructureOptions = (next: Array<{ id: string; nom: string }> | ((prev: Array<{ id: string; nom: string }>) => Array<{ id: string; nom: string }>)) =>
    setListState((prev) => ({
      ...prev,
      structureOptions: typeof next === "function" ? next(prev.structureOptions) : next,
    }));
  const setStructureRefAliases = (aliases: Record<string, string>) => setListState((prev) => ({ ...prev, structureRefAliases: aliases }));
  const setStructureLabels = (labels: Record<string, string>) => setListState((prev) => ({ ...prev, structureLabels: labels }));
  const setFilterStatut = (val: string) => setListState((prev) => ({ ...prev, filterStatut: val }));
  const setSearch = (val: string) => setListState((prev) => ({ ...prev, search: val }));
  const setSummary = (val: ProductSummary | null) => setListState((prev) => ({ ...prev, summary: val }));
  const setTotal = (val: number) => setListState((prev) => ({ ...prev, total: val }));
  const {
    errors: formErrors,
    setErrors: setFormErrors,
    clearError: clearFormError,
    resetErrors: resetFormErrors,
  } = useFieldErrors<ProduitFormField>();
  const {
    errors: userDraftErrors,
    setErrors: setUserDraftErrors,
    clearError: clearUserDraftError,
    resetErrors: resetUserDraftErrors,
  } = useFieldErrors<ProduitUserDraftField>();

  const setDialogOpen = (open: boolean) => {
    // Chaque ouverture ou fermeture repart d'un formulaire sans erreur affichée
    resetFormErrors();
    resetUserDraftErrors();
    setDialogState((prev) => ({ ...prev, dialogOpen: open }));
  };
  const setDeleteDialogOpen = (open: boolean) => setDialogState((prev) => ({ ...prev, deleteDialogOpen: open }));
  const setToggleDialogOpen = (open: boolean) => setDialogState((prev) => ({ ...prev, toggleDialogOpen: open }));
  const setUpdateDialogOpen = (open: boolean) => setDialogState((prev) => ({ ...prev, updateDialogOpen: open }));
  const setEditingProduit = (p: ProduitRead | null) => setDialogState((prev) => ({ ...prev, editingProduit: p }));
  const setDeletingProduit = (p: ProduitRead | null) => setDialogState((prev) => ({ ...prev, deletingProduit: p }));
  const setTogglingProduit = (p: ProduitRead | null) => setDialogState((prev) => ({ ...prev, togglingProduit: p }));

  const setForm = (nextForm: ProduitForm | ((prev: ProduitForm) => ProduitForm)) =>
    setFormState((prev) => (typeof nextForm === "function" ? nextForm(prev) : nextForm));
  const setUserDraft = (nextDraft: typeof userDraft | ((prev: typeof userDraft) => typeof userDraft)) =>
    setUserDraftState((prev) => (typeof nextDraft === "function" ? nextDraft(prev) : nextDraft));

  const { currentActorRole, currentPermissions } = useCurrentActor();
  const entityContext = "Produit" as const;
  const permissions = {
    canRead: can(currentActorRole, "read", entityContext, currentPermissions),
    canCreate: can(currentActorRole, "create", entityContext, currentPermissions),
    canUpdate: can(currentActorRole, "update", entityContext, currentPermissions),
    canDelete: can(currentActorRole, "delete", entityContext, currentPermissions),
  };

  const normalizeStructureRefs = (refs: string[]): string[] => {
    const normalized = refs
      .map((ref) => structureRefAliases[ref] ?? ref)
      .filter((ref, index, values) => ref.trim().length > 0 && values.indexOf(ref) === index);

    return normalized;
  };

  const formatStructureNames = (refs: string[]): string => {
    const names = normalizeStructureRefs(refs).map((ref) => structureLabels[ref] ?? ref);
    return names.join(", ");
  };

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

  useEffect(() => {
    let active = true;
    setLoading(true);

    const initLoad = async () => {
      try {
        const { items: productsMapped, total: nextTotal, summary: nextSummary } =
          await fetchProduits({
            skip: 0,
            limit: 100,
            include_inactive: true,
            search: search.trim() || undefined,
            is_active: filterStatut === "active" ? true : filterStatut === "inactive" ? false : undefined,
          });

        if (!active) return;

        setProduits(productsMapped);
        setSummary(nextSummary);
        setTotal(nextTotal);
        setError(null);
        setLoading(false);
      } catch (error) {
        if (!active) return;
        setProduits([]);
        const message = error instanceof Error ? error.message : "Impossible de charger les produits";
        setError(message);
        toast.error(message);
        setLoading(false);
      }
    };

    initLoad();

    return () => {
      active = false;
    };
  }, [filterStatut, search]);

  useEffect(() => {
    if (!dialogOpen) {
      setPartiallyCreatedProductId(null);
      return;
    }
    refreshStructures();
  }, [dialogOpen]);

  useEffect(() => {
    if (!dialogOpen) return;
    let active = true;

    listClientCompositeRoles(ACCESS_SECURITY_CLIENT_ID)
      .then((roles) => {
        if (!active) return;
        const filteredRoles = roles.filter((role) => isProfileRoleForEntityContext(role, "Produit"));
        setAvailableUserRoles(filteredRoles);
      })
      .catch((error) => {
        if (!active) return;
        setAvailableUserRoles([]);
        const message = error instanceof Error
          ? error.message
          : "Service Access Security indisponible côté backend.";
        toast.error(message);
      });

    return () => {
      active = false;
    };
  }, [dialogOpen]);

  const processStructuresData = (data: unknown) => {
    const list: StructureRead[] = Array.isArray(data) ? data : extractStructuresList(data);
    const nextAliases = list.reduce((acc: Record<string, string>, item: StructureRead) => {
      if (typeof item.id === "string" && item.id.trim().length > 0) {
        acc[item.id] = item.id;
      }

      if (typeof item.code === "string" && item.code.trim().length > 0) {
        acc[item.code.trim()] = item.id;
      }

      return acc;
    }, {});

    const nextLabels = list.reduce((acc: Record<string, string>, item: StructureRead) => {
      if (typeof item.id === "string" && item.id.trim().length > 0) {
        acc[item.id] = item.name;
      }
      return acc;
    }, {});

    setStructureRefAliases(nextAliases);
    setStructureLabels(nextLabels);
    setStructureOptions(
      list
        .filter((item) => !item.is_deleted)
        .map((item) => ({
          id: item.id,
          nom: item.name,
        }))
    );
  };

  const refreshStructures = async () => {
    try {
      const data = await fetchStructures();
      processStructuresData(data);
    } catch {
      setStructureOptions([]);
    }
  };

  const syncProductStructures = async (productId: string, nextStructureIds: string[]) => {
    try {
      const allStructures = await fetchStructures();
      const currentLinked = allStructures.filter((s) => s.product_id === productId);
      const currentLinkedIds = currentLinked.map((s) => s.id);

      const toLink = nextStructureIds.filter((id) => !currentLinkedIds.includes(id));
      const toUnlink = currentLinkedIds.filter((id) => !nextStructureIds.includes(id));

      // delier les structures qui ne sont plus associées
      for (const id of toUnlink) {
        await updateStructure(id, { product_id: null });
      }

      // lier les structures qui sont nouvellement associées
      for (const id of toLink) {
        await updateStructure(id, { product_id: productId });
      }

      // rafraîchir les labels des structures, les comptes et les options
      await refreshStructures();
    } catch (error) {
      console.error("Erreur lors de la synchronisation des structures du produit:", error);
      toast.error("Erreur lors de la mise à jour des liaisons structures du produit");
    }
  };

  const filtered = produits.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.nom.toLowerCase().includes(q) ||
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.libelleExpediteur && p.libelleExpediteur.toLowerCase().includes(q));
    const matchesStatut =
      filterStatut === "all" ||
      (filterStatut === "active" && p.statut === "active") ||
      (filterStatut === "inactive" && p.statut === "inactive");
    return matchesSearch && matchesStatut;
  });

  const openAdd = () => {
    if (!permissions.canCreate) {
      toast.error("Vous n'avez pas l'habilitation pour ajouter un produit");
      return;
    }

    setEditingProduit(null);
    setSelectedUserId(null);
    setForm({ ...emptyForm, utilisateurs: [] });
    setUserDraft({ nom: "", prenom: "", username: "", email: "", role: "" });
    setDialogOpen(true);
  };

  /**
   * Structures réellement rattachées au produit en cours de modification (structure.product_id, comme la fiche détail).
   * null tant qu'elles ne sont pas chargées : l'enregistrement ne touche alors pas aux rattachements.
   */
  const linkedStructuresProductIdRef = useRef<string | null>(null);

  const loadLinkedStructures = async (productId: string) => {
    linkedStructuresProductIdRef.current = null;
    try {
      const linked = await fetchProductStructures(productId);
      setForm((previous) => ({ ...previous, structuresAssociees: linked.map((structure) => structure.id) }));
      linkedStructuresProductIdRef.current = productId;
    } catch {
      toast.error("Impossible de charger les structures rattachées au produit : elles ne seront pas modifiées.");
    }
  };

  const openEdit = (p: ProduitRead) => {
    if (!permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour modifier un produit");
      return;
    }

    // Les structures viennent des rattachements réels (chargés ci-dessous), pas de la copie gardée dans les paramètres du produit
    const normalizedStructures: string[] = [];
    void loadLinkedStructures(p.id);
    const branding = (p.brandingConfig || {}) as Record<string, unknown>;
    setEditingProduit(p);
    setSelectedUserId(null);
    setForm({
      nom: p.nom,
      code: p.code,
      description: p.description,
      libelleExpediteur: p.libelleExpediteur,
      logo: p.logo,
      logoFile: null,
      mediaUrl: p.mediaUrl,
      structuresAssociees: normalizedStructures,
      statut: p.statut,
      utilisateurs: p.utilisateurs.map((u) => ({ ...u, isPendingCreation: false })),
      faviconUrl: (branding.faviconUrl as string) || "",
      apsfdLogoUrl: (branding.apsfdLogoUrl as string) || "",
      primaryColor: (branding.primaryColor as string) || DEFAULT_BRANDING_COLORS.primaryColor,
      secondaryColor: (branding.secondaryColor as string) || DEFAULT_BRANDING_COLORS.secondaryColor,
      accentColor: (branding.accentColor as string) || DEFAULT_BRANDING_COLORS.accentColor,
      sidebarColor: (branding.sidebarColor as string) || DEFAULT_BRANDING_COLORS.sidebarColor,
      borderColor: (branding.borderColor as string) || DEFAULT_BRANDING_COLORS.borderColor,
      loginBgUrl: (branding.loginBgUrl as string) || "",
      brandingConfig: p.brandingConfig,
    });
    const initialUser = p.utilisateurs?.[0];
    setUserDraft({
      nom: initialUser?.nom || "",
      prenom: initialUser?.prenom || "",
      username: initialUser?.username || "",
      email: initialUser?.email || "",
      role: initialUser?.profil || "",
    });
    setDialogOpen(true);

    listHierarchyMembers(ACCESS_SECURITY_PRODUCT_SCOPE_REF_TYPE, p.id, ACCESS_SECURITY_CLIENT_ID)
      .then((res) => {
        if (res.users && res.users.length > 0) {
          const keycloakUsers: ProduitUtilisateurForm[] = res.users.map((u) => ({
            id: u.user_id,
            nom: u.last_name || "",
            prenom: u.first_name || "",
            username: u.username || "",
            email: u.email || "",
            matricule: u.matricule || "",
            profil: u.profiles?.[0] || "",
            isPendingCreation: false,
          }));

          setForm((prev) => ({
            ...prev,
            utilisateurs: keycloakUsers,
          }));

          const targetUser = res.users[0];
          setUserDraft({
            nom: targetUser.last_name || "",
            prenom: targetUser.first_name || "",
            username: targetUser.username || "",
            email: targetUser.email || "",
            role: targetUser.profiles?.[0] || "",
          });
        } else {
          setUserDraft({ nom: "", prenom: "", username: "", email: "", role: "" });
        }
      })
      .catch(() => {
        setUserDraft({ nom: "", prenom: "", username: "", email: "", role: "" });
      });
  };

  const validateContractUser = (user: ProduitUtilisateurForm, index: number): string | null => {
    const line = index + 1;
    const username = user.username?.trim() ?? "";
    const email = user.email?.trim().toLowerCase() ?? "";
    const role = user.profil?.trim() ?? "";

    if (!username) {
      return `Utilisateur #${line}: login obligatoire`;
    }
    if (!loginPattern.test(username)) {
      return `Utilisateur #${line}: login invalide`;
    }
    if (!email) {
      return `Utilisateur #${line}: e-mail obligatoire`;
    }
    if (!emailPattern.test(email)) {
      return `Utilisateur #${line}: e-mail invalide`;
    }
    if (!isProfileRole(role)) {
      return `Utilisateur #${line}: profil technique invalide`;
    }
    if (availableUserRoles.length > 0 && !availableUserRoles.includes(role)) {
      return `Utilisateur #${line}: profil non autorisé par le client Access Security`;
    }

    return null;
  };

  const findExistingInProductHierarchyWithRetry = async (
    produitId: string,
    username: string,
    initialMembers: ProductHierarchyMembers | null,
  ): Promise<ProductHierarchyMembers["users"][number] | null> => {
    const maxAttempts = 6;
    let productHierarchyMembers = initialMembers;

    const existingInCurrentMembers = findHierarchyMemberByUsername(productHierarchyMembers, username);
    if (existingInCurrentMembers?.user_id) {
      return existingInCurrentMembers;
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      productHierarchyMembers = await listHierarchyMembers(
        ACCESS_SECURITY_PRODUCT_SCOPE_REF_TYPE,
        produitId,
        ACCESS_SECURITY_CLIENT_ID,
      ).catch(() => productHierarchyMembers);

      const existing = findHierarchyMemberByUsername(productHierarchyMembers, username);
      if (existing?.user_id) {
        return existing;
      }

      if (attempt < maxAttempts) {
        await wait(500 * attempt);
      }
    }

    return null;
  };

  const createOrReuseContractUser = async (
    produitId: string,
    user: ProduitUtilisateurForm,
    email: string,
    initialMembers: ProductHierarchyMembers | null,
  ): Promise<ProduitUtilisateurForm> => {
    const username = user.username?.trim() ?? "";

    try {
      const created = await createBackofficeUser({
        username,
        email,
        target_scope: [{
          ref_type: ACCESS_SECURITY_PRODUCT_SCOPE_REF_TYPE,
          ref_id: produitId,
        }],
        profiles: [user.profil],
        matricule: user.matricule?.trim() || null,
        first_name: user.prenom?.trim() || null,
        last_name: user.nom?.trim() || null,
      });

      return buildResolvedContractUser(user, created.account_user_id, created.account_username, email);
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Erreur inconnue";
      if (!isAlreadyExistingUserError(rawMessage.toLowerCase())) {
        throw getContractUserCreationError(username, produitId, rawMessage);
      }

      const existing = await findExistingInProductHierarchyWithRetry(produitId, username, initialMembers);
      if (!existing?.user_id) {
        throw new Error(
          `Le login '${username}' est déjà réservé par un autre utilisateur dans Keycloak. Veuillez le modifier (par exemple '${username}1') pour ce nouvel utilisateur.`,
        );
      }

      const existingUsername = existing.username?.trim() || username;

      return buildResolvedContractUser(user, existing.user_id, existingUsername, email);
    }
  };

  const userAlreadyExists = (draft: { username: string; email: string; role: string }): boolean => {
    const draftUsername = draft.username.trim().toLowerCase();
    const draftEmail = draft.email.trim().toLowerCase();
    const draftRole = draft.role.trim().toLowerCase();

    const inCurrentForm = form.utilisateurs.some((user: ProduitUtilisateurForm) => {
      return (
        (user.username?.trim().toLowerCase() ?? "") === draftUsername
        || (user.email?.trim().toLowerCase() ?? "") === draftEmail
        || (
          (user.username?.trim().toLowerCase() ?? "") === draftUsername
          && user.profil.trim().toLowerCase() === draftRole
        )
      );
    });

    if (inCurrentForm) {
      return true;
    }

    return produits.some((product: ProduitRead) =>
      product.utilisateurs.some((user: ProduitUtilisateurForm) => {
        return (
          (user.username?.trim().toLowerCase() ?? "") === draftUsername
          || (user.email?.trim().toLowerCase() ?? "") === draftEmail
          || (
            (user.username?.trim().toLowerCase() ?? "") === draftUsername
            && user.profil.trim().toLowerCase() === draftRole
          )
        );
      })
    );
  };

  const addUserToForm = (): boolean => {
    if (availableUserRoles.length === 0) {
      toast.error("Aucun profil Access Security disponible. Vérifiez la connexion à Access Security.");
      return false;
    }

    const username = (userDraft.username.trim() || deriveLogin(userDraft.prenom, userDraft.nom, form.utilisateurs.map((u) => u.username))).trim();
    const draftWithGeneratedLogin = {
      ...userDraft,
      username,
    };

    const validationErrors = validateProduitUserDraft(draftWithGeneratedLogin);
    setUserDraftErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) {
      return false;
    }

    if (userAlreadyExists(draftWithGeneratedLogin)) {
      toast.error("L’utilisateur existe déjà!");
      return false;
    }

    const email = userDraft.email.trim().toLowerCase();
    const prenom = userDraft.prenom.trim();
    const nom = userDraft.nom.trim();

    setForm((previous) => ({
      ...previous,
      utilisateurs: [
        ...previous.utilisateurs,
        {
          id: crypto.randomUUID(),
          username,
          email,
          nom,
          prenom,
          matricule: "",
          profil: userDraft.role.trim(),
          isPendingCreation: true,
        },
      ],
    }));
    setUserDraft(emptyUserDraft);
    resetUserDraftErrors();
    return true;
  };

  const removeUserFromForm = (userId: string) => {
    setForm((previous) => ({
      ...previous,
      utilisateurs: previous.utilisateurs.filter((user: ProduitUtilisateurForm) => user.id !== userId),
    }));
  };

  const editUserInForm = (userId: string) => {
    const user = form.utilisateurs.find((u) => u.id === userId);
    if (!user) return;
    setSelectedUserId(user.id);
    resetUserDraftErrors();
    setUserDraft({
      nom: user.nom,
      prenom: user.prenom,
      username: user.username || "",
      email: user.email || "",
      role: user.profil,
    });
  };

  const cancelEditUser = () => {
    setSelectedUserId(null);
    setUserDraft(emptyUserDraft);
    resetUserDraftErrors();
  };

  const updateProduitUser = async () => {
    if (!selectedUserId) {
      toast.error("Sélectionnez un utilisateur à modifier");
      return;
    }

    const firstName = userDraft.prenom.trim();
    const lastName = userDraft.nom.trim();
    const email = userDraft.email.trim().toLowerCase();
    const validationErrors = validateProduitUserDraft(userDraft, "update");
    setUserDraftErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) {
      return;
    }

    const existingUser = form.utilisateurs.find((u) => u.id === selectedUserId);
    if (existingUser?.isPendingCreation) {
      setForm((prev) => ({
        ...prev,
        utilisateurs: prev.utilisateurs.map((u) =>
          u.id === selectedUserId
            ? { ...u, prenom: firstName, nom: lastName, email, profil: userDraft.role.trim() }
            : u
        ),
      }));
      setSelectedUserId(null);
      setUserDraft(emptyUserDraft);
      toast.success("Utilisateur modifié avec succès");
      return;
    }

    if (!editingProduit) {
      toast.error("Produit introuvable");
      return;
    }

    setIsUpdatingUser(true);
    try {
      const updatedUser = await updateAccessSecurityUser(selectedUserId, {
        login: userDraft.username.trim(),
        profiles: [userDraft.role.trim()],
        profile_client_id: "backoffice-web",
        first_name: firstName,
        last_name: lastName,
        email,
        matricule: form.utilisateurs.find((user) => user.id === selectedUserId)?.matricule || null,
        telephone: null,
        agence: null,
        caisse: null,
      });
      setForm((prev) => ({
        ...prev,
        utilisateurs: prev.utilisateurs.map((user) => user.id === selectedUserId
          ? { ...user, prenom: updatedUser.first_name || firstName, nom: updatedUser.last_name || lastName, email: updatedUser.email || email, profil: userDraft.role.trim() }
          : user),
      }));
      setSelectedUserId(null);
      setUserDraft(emptyUserDraft);
      toast.success("Utilisateur modifié avec succès");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier l'utilisateur");
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const onLogoFileSelected = (file: File | null) => {
    if (!file) {
      setForm((previous) => ({ ...previous, logo: undefined, logoFile: null }));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setForm((previous) => ({ ...previous, logo: previewUrl, logoFile: file }));
  };

  const onLogoSelectedFromDataUrl = (dataUrl: string | null) => {
    setForm((previous) => ({ ...previous, logo: dataUrl ?? undefined, logoFile: null }));
  };

  const isDuplicate = (nom: string, excludeId?: string) => {
    const normalizedNom = nom.trim().toLowerCase();
    const normalizedCode = normalizeProductCode(nom);

    return produits.some((p: ProduitRead) => {
      if (p.id === excludeId) {
        return false;
      }

      const sameNom = p.nom.trim().toLowerCase() === normalizedNom;
      const sameCode = normalizeProductCode(p.nom) === normalizedCode;
      return sameNom || sameCode;
    });
  };

  const resolveContractUsers = async (produitId: string): Promise<{
    users: ProduitUtilisateurForm[];
  }> => {
    console.log(`[resolveContractUsers] Début pour produit: ${produitId}, utilisateurs à traiter: ${form.utilisateurs.length}`);

    const productHierarchyMembers = await listHierarchyMembers(
      ACCESS_SECURITY_PRODUCT_SCOPE_REF_TYPE,
      produitId,
      ACCESS_SECURITY_CLIENT_ID,
    ).catch(() => null);

    const resolvedUsers: ProduitUtilisateurForm[] = [];

    try {
      for (let index = 0; index < form.utilisateurs.length; index++) {
        const user = form.utilisateurs[index];
        if (user.isPendingCreation === false) {
          resolvedUsers.push(user);
          continue;
        }

        const contractError = validateContractUser(user, index);
        if (contractError) {
          throw new Error(contractError);
        }

        const username = user.username?.trim() ?? "";
        const email = user.email?.trim().toLowerCase() ?? "";
        const isNewUser = user.isPendingCreation === true && username && email;

        if (!isNewUser) {
          resolvedUsers.push(user);
          continue;
        }

        const resolvedUser = await createOrReuseContractUser(
          produitId,
          user,
          email,
          productHierarchyMembers,
        );
        resolvedUsers.push(resolvedUser);
      }
    } catch (error) {
      const failedIndex = resolvedUsers.length;
      const remainingUsers = form.utilisateurs.slice(failedIndex);
      setForm((prev) => ({
        ...prev,
        utilisateurs: [...resolvedUsers, ...remainingUsers],
      }));
      throw error;
    }

    console.log(
      `[resolveContractUsers] Fin: ${resolvedUsers.length} utilisateur(s) résolus`,
      { utilisateurs: resolvedUsers.map((u) => u.username) }
    );
    return { users: resolvedUsers };
  };

  /** Valide le formulaire produit et affiche les erreurs sous les champs concernés. */
  const validateProduitForm = (): FieldErrors<ProduitFormField> => {
    const errors = validateProduitFormFields(form, {
      isDuplicate: isDuplicate(form.nom, editingProduit?.id || partiallyCreatedProductId),
    });
    setFormErrors(errors);
    return errors;
  };

  const notifyPasswordResetFailures = (passwordResetFailures: string[]) => {
    if (passwordResetFailures.length === 0) {
      return;
    }

    console.warn("[Email] Utilisateurs sans email envoyé:", passwordResetFailures);
    toast.warning(formatPasswordResetWarning(passwordResetFailures), { duration: 8000 });
  };

  const buildProduitPayload = (): ProduitMutationPayload => {
    const mediaUrlToSend = form.mediaUrl || (form.logo && !form.logo.startsWith("blob:") && !form.logo.startsWith("data:") ? form.logo : undefined);
    const branding_config = {
      entityName: form.nom.trim(),
      mediaUrl: mediaUrlToSend || "",
      logoUrl: mediaUrlToSend || "",
      faviconUrl: form.faviconUrl || "",
      apsfdLogoUrl: form.apsfdLogoUrl || "",
      primaryColor: form.primaryColor || DEFAULT_BRANDING_COLORS.primaryColor,
      secondaryColor: form.secondaryColor || DEFAULT_BRANDING_COLORS.secondaryColor,
      accentColor: form.accentColor || DEFAULT_BRANDING_COLORS.accentColor,
      sidebarColor: form.sidebarColor || DEFAULT_BRANDING_COLORS.sidebarColor,
      borderColor: form.borderColor || DEFAULT_BRANDING_COLORS.borderColor,
      loginBgUrl: form.loginBgUrl || "",
    };

    return {
      nom: form.nom.trim(),
      code: form.code?.trim() || undefined,
      shortCode: form.libelleExpediteur?.trim() || undefined,
      description: form.description?.trim() || undefined,
      libelleExpediteur: form.libelleExpediteur,
      logo: form.logo,
      logoFile: form.logoFile || undefined,
      file: form.logoFile || undefined,
      mediaUrl: mediaUrlToSend,
      structuresAssociees: normalizeStructureRefs(form.structuresAssociees),
      statut: form.statut,
      utilisateurs: [],
      brandingConfig: branding_config,
    };
  };

  const syncResolvedUsersInForm = (resolvedUsers: ProduitUtilisateurForm[]) => {
    setForm((previous) => ({ ...previous, utilisateurs: resolvedUsers }));
  };

  const handleUpdateProduit = async (basePayload: ProduitMutationPayload) => {
    if (!editingProduit) {
      return;
    }

    const { users: resolvedUsers } = await resolveContractUsers(editingProduit.id);
    const updated = await updateProduit(editingProduit.id, { ...basePayload, utilisateurs: resolvedUsers });
    // Sans la liste réelle des rattachements, on ne délie ni ne lie aucune structure
    if (linkedStructuresProductIdRef.current === editingProduit.id) {
      await syncProductStructures(editingProduit.id, basePayload.structuresAssociees);
    }
    setProduits((prev) => prev.map((item) => (
      item.id === editingProduit.id
        ? { ...updated, structuresAssociees: normalizeStructureRefs(updated.structuresAssociees) }
        : item
    )));
    syncResolvedUsersInForm(resolvedUsers);
    toast.success("Produit modifié avec succès");
  };

  const handleCreateProduit = async (basePayload: ProduitMutationPayload) => {
    let productId = partiallyCreatedProductId;
    if (!productId) {
      const createdProduit = await createProduit(basePayload);
      productId = createdProduit.id;
      setPartiallyCreatedProductId(productId);
      console.log(`[Product] Créé avec ID: ${productId}`);
    } else {
      await updateProduit(productId, basePayload);
      console.log(`[Product] Déjà créé, mis à jour avec ID: ${productId}`);
    }

    const { users: resolvedUsers } = await resolveContractUsers(productId);
    console.log(`[Product Users] ${resolvedUsers.length} utilisateur(s) résolus.`);

    await syncProductStructures(productId, basePayload.structuresAssociees);

    const finalProduit = await updateProduit(productId, {
      ...basePayload,
      utilisateurs: resolvedUsers,
    });

    setProduits((prev) => [
      { ...finalProduit, structuresAssociees: normalizeStructureRefs(finalProduit.structuresAssociees) },
      ...prev,
    ]);
    syncResolvedUsersInForm(resolvedUsers);
    setPartiallyCreatedProductId(null);
    await options?.onProductCreated?.(productId);
    toast.success("Produit ajouté avec succès");
  };

  const saveProduit = async (basePayload: ProduitMutationPayload) => {
    if (editingProduit) {
      await handleUpdateProduit(basePayload);
      return;
    }

    await handleCreateProduit(basePayload);
  };

  const handleProduitSaveError = async (error: unknown) => {
    const rawMessage = error instanceof Error ? error.message : "Impossible d'enregistrer le produit";
    const messageLC = rawMessage.toLowerCase();
    const isProductConflict =
      messageLC.includes("conflict")
      || messageLC.includes("product avec code")
      || (messageLC.includes("product") && (messageLC.includes("existe déjà") || messageLC.includes("already exists")));

    if (!isProductConflict) {
      toast.error(rawMessage);
      return;
    }

    const refreshedProduits = await fetchProduits().catch(() => null);
    if (refreshedProduits) {
      setProduits(refreshedProduits);
    }

    const normalizedMessage = rawMessage.trim();
    if (normalizedMessage.length > 0 && normalizedMessage !== "Impossible d'enregistrer le produit") {
      toast.error(`${normalizedMessage} Vérifiez les produits archivés ou les créations concurrentes.`);
      return;
    }

    toast.error("Ce produit existe déjà. Vérifiez les produits archivés ou les créations concurrentes.");
  };

  const executeSave = async () => {
    if (hasFieldErrors(validateProduitForm())) {
      return;
    }

    const basePayload = buildProduitPayload();

    setActionLoading(true);
    try {
      await saveProduit(basePayload);
      setDialogOpen(false);
    } catch (error: unknown) {
      await handleProduitSaveError(error);
    } finally {
      setActionLoading(false);
    }
  };

  /** Renvoie les erreurs de validation éventuelles, pour que la vue affiche l'onglet concerné. */
  const handleSave = (): FieldErrors<ProduitFormField> => {
    if (editingProduit && !permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour modifier un produit");
      return {};
    }

    if (!editingProduit && !permissions.canCreate) {
      toast.error("Vous n'avez pas l'habilitation pour ajouter un produit");
      return {};
    }

    // Les erreurs de saisie sont signalées avant la confirmation de modification
    const validationErrors = validateProduitForm();
    if (hasFieldErrors(validationErrors)) {
      return validationErrors;
    }

    if (editingProduit) {
      setUpdateDialogOpen(true);
      return {};
    }

    void executeSave();
    return {};
  };

  const confirmUpdateSave = () => {
    setUpdateDialogOpen(false);
    void executeSave();
  };

  const confirmToggle = (p: ProduitRead) => {
    if (!permissions.canUpdate) {
      toast.error("Vous n'avez pas l'habilitation pour modifier un produit");
      return;
    }

    setTogglingProduit(p);
    setToggleDialogOpen(true);
  };

  const handleToggle = async () => {
    if (togglingProduit) {
      setActionLoading(true);
      try {
        const nextActive = togglingProduit.statut !== "active";
        const updated = await toggleProduitStatus(togglingProduit.id, nextActive);
        setProduits((prev) => prev.map((item) => (item.id === togglingProduit.id ? updated : item)));
        toast.success("Statut du produit mis à jour");
        setToggleDialogOpen(false);
        setTogglingProduit(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Impossible de modifier le statut du produit";
        toast.error(message);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const confirmDelete = (p: ProduitRead) => {
    if (!permissions.canDelete) {
      toast.error("Vous n'avez pas l'habilitation pour supprimer un produit");
      return;
    }

    setDeletingProduit(p);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingProduit) return;

    setActionLoading(true);
    try {
      await archiveProduit(deletingProduit.id);
      setProduits((prev) =>
        prev.map((p) => (p.id === deletingProduit.id ? { ...p, archived: true } : p))
      );
      toast.success("Produit supprimé (archivé)");
      setDeleteDialogOpen(false);
      setDeletingProduit(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de supprimer le produit";
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleStructure = (structureId: string) => {
    setForm((prev) => ({
      ...prev,
      structuresAssociees: prev.structuresAssociees.includes(structureId)
        ? prev.structuresAssociees.filter((id) => id !== structureId)
        : [...prev.structuresAssociees, structureId],
    }));
  };

  return {
    produits,
    filtered,
    loading,
    error,
    actionLoading,
    availableUserRoles,
    permissions,
    structureOptions,
    filterStatut,
    setFilterStatut,
    search,
    setSearch,
    summary,
    total,
    dialogOpen, setDialogOpen,
    deleteDialogOpen, setDeleteDialogOpen,
    toggleDialogOpen, setToggleDialogOpen,
    updateDialogOpen, setUpdateDialogOpen,
    editingProduit, deletingProduit, togglingProduit,
    form, setForm,
    formErrors, clearFormError,
    userDraft, setUserDraft,
    userDraftErrors, clearUserDraftError,
    openAdd, openEdit,
    handleSave, confirmUpdateSave, handleDelete,
    confirmToggle, handleToggle,
    confirmDelete,
    toggleStructure,
    deriveLogin,
    addUserToForm,
    removeUserFromForm,
    editUserInForm,
    cancelEditUser,
    updateProduitUser,
    selectedUserId,
    isUpdatingUser,
    onLogoFileSelected,
    onLogoSelectedFromDataUrl,
  };
};
