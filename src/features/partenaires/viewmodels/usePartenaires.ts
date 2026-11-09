import { useEffect, useState } from "react";
import {
  CatalogServiceItem,
  Partenaire,
  PartenaireForm,
  PartenaireSummary,
  PartenaireUserForm,
} from "../models/types";

import { emptyPartenaireForm, profilsMarchand, profilsFacturier } from "../models/data";
import {
  type PartenaireFormField,
  type PartenaireUserFormField,
  validatePartenaireForm,
  validatePartenaireUserForm,
} from "../models/validation";
import { hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import {
  createBackofficeUser,
  HierarchyMemberUser,
  listHierarchyMembers,
  updateAccessSecurityUser,
  TargetScopeRef,
} from "@/core/security/accessSecurityService";
import {
  archivePartenaire,
  createPartenaire,
  fetchCatalogServices,
  fetchPartenaires,
  fetchPartnerServices,
  replacePartnerServices,
  togglePartenaireStatus,
  updatePartenaire,
} from "../services/partenairesService";
import { toast } from "sonner";

const defaultUserForm = (categorie: string) => ({
  prenom: "",
  nom: "",
  username: "",
  email: "",
  profil: categorie === "marchand" ? "profile.bo.partenaire-admin" : "profile.bo.partenaire-facturier",
});

const normalizeLoginPart = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

export const deriveLogin = (prenom: string, nom?: string, existingUsernames?: string[]): string => {
  const normalizedPrenom = normalizeLoginPart(prenom);
  const normalizedNom = nom ? normalizeLoginPart(nom) : "";

  if (!normalizedPrenom && !normalizedNom) {
    return "";
  }

  const base = normalizedNom
    ? `${normalizedPrenom.charAt(0)}.${normalizedPrenom}${normalizedNom}`
    : normalizedPrenom;

  let candidate = base;
  let counter = 1;

  if (existingUsernames && existingUsernames.length > 0) {
    const existingSet = new Set(
      existingUsernames
        .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
        .map((u) => u.toLowerCase())
    );

    while (existingSet.has(candidate.toLowerCase())) {
      candidate = `${base}${counter}`;
      counter += 1;
    }
  }

  return candidate;
};

export const usePartenaires = () => {
  const [summary, setSummary] = useState<PartenaireSummary | null>(null);
  const [listState, setListState] = useState({

    partenaires: [] as Partenaire[],
    loading: true,
    error: null as string | null,
    search: "",
    filterCategorie: "all",
    filterType: "all",
    filterStatut: "all",
  });

  const [dialogState, setDialogState] = useState({
    dialogOpen: false,
    deleteDialogOpen: false,
    toggleDialogOpen: false,
    savingPartner: false,
    savingPartnerUser: false,
  });

  const [selectionState, setSelectionState] = useState({
    editing: null as Partenaire | null,
    deleting: null as Partenaire | null,
    toggling: null as Partenaire | null,
    selectedPartnerUserId: null as string | null,
  });

  const [partnerUsers, setPartnerUsers] = useState<HierarchyMemberUser[]>([]);
  const [catalogServices, setCatalogServices] = useState<CatalogServiceItem[]>([]);

  const [formsState, setFormsState] = useState<{
    particulierForm: PartenaireForm;
    entrepriseForm: PartenaireForm;
    formType: "particulier" | "entreprise";
    userForm: PartenaireUserForm;
    showUserForm: boolean;
  }>({
    particulierForm: { ...emptyPartenaireForm, type: "particulier" },
    entrepriseForm: { ...emptyPartenaireForm, type: "entreprise" },
    formType: "particulier",
    userForm: defaultUserForm("marchand"),
    showUserForm: false,
  });

  const [activeTab, setActiveTab] = useState<"particulier" | "entreprise" | "utilisateur">("particulier");

  const {
    errors: formErrors,
    setErrors: setFormErrors,
    clearError: clearFormError,
    resetErrors: resetFormErrors,
  } = useFieldErrors<PartenaireFormField>();
  const {
    errors: userFormErrors,
    setErrors: setUserFormErrors,
    clearError: clearUserFormError,
    resetErrors: resetUserFormErrors,
  } = useFieldErrors<PartenaireUserFormField>();

  const {
    partenaires,
    loading,
    error,
    search,
    filterCategorie,
    filterType,
    filterStatut,
  } = listState;

  const {
    dialogOpen,
    deleteDialogOpen,
    toggleDialogOpen,
    savingPartner,
    savingPartnerUser,
  } = dialogState;

  const {
    editing,
    deleting,
    toggling,
    selectedPartnerUserId,
  } = selectionState;

  const { particulierForm, entrepriseForm, formType, userForm, showUserForm } = formsState;
  const form = formType === "particulier" ? particulierForm : entrepriseForm;

  const setShowUserForm = (value: boolean) =>
    setFormsState((prev) => ({ ...prev, showUserForm: value }));

  const setPartenaires = (next: Partenaire[] | ((prev: Partenaire[]) => Partenaire[])) =>
    setListState((prev) => ({
      ...prev,
      partenaires: typeof next === "function" ? next(prev.partenaires) : next,
    }));

  const setLoading = (val: boolean) => setListState((prev) => ({ ...prev, loading: val }));
  const setError = (val: string | null) => setListState((prev) => ({ ...prev, error: val }));
  const setSearch = (val: string) => setListState((prev) => ({ ...prev, search: val }));
  const setFilterCategorie = (val: string) => setListState((prev) => ({ ...prev, filterCategorie: val }));
  const setFilterType = (val: string) => setListState((prev) => ({ ...prev, filterType: val }));
  const setFilterStatut = (val: string) => setListState((prev) => ({ ...prev, filterStatut: val }));

  // Ouverture/fermeture du formulaire : les erreurs de validation repartent de zéro
  const setDialogOpen = (open: boolean) => {
    resetFormErrors();
    resetUserFormErrors();
    setDialogState((prev) => ({ ...prev, dialogOpen: open }));
  };
  const setDeleteDialogOpen = (open: boolean) => setDialogState((prev) => ({ ...prev, deleteDialogOpen: open }));
  const setToggleDialogOpen = (open: boolean) => setDialogState((prev) => ({ ...prev, toggleDialogOpen: open }));
  const setSavingPartner = (saving: boolean) => setDialogState((prev) => ({ ...prev, savingPartner: saving }));
  const setSavingPartnerUser = (saving: boolean) => setDialogState((prev) => ({ ...prev, savingPartnerUser: saving }));

  const setEditing = (p: Partenaire | null) => setSelectionState((prev) => ({ ...prev, editing: p }));
  const setDeleting = (p: Partenaire | null) => setSelectionState((prev) => ({ ...prev, deleting: p }));
  const setToggling = (p: Partenaire | null) => setSelectionState((prev) => ({ ...prev, toggling: p }));

  const setFormType = (type: "particulier" | "entreprise") =>
    setFormsState((prev) => {
      const sourceForm = prev.formType === "particulier" ? prev.particulierForm : prev.entrepriseForm;
      const commonFields = {
        code: sourceForm.code,
        categorie: sourceForm.categorie,
        telephone: sourceForm.telephone,
        email: sourceForm.email,
        serviceIds: sourceForm.serviceIds,
      };
      return {
        ...prev,
        formType: type,
        particulierForm: { ...prev.particulierForm, ...commonFields },
        entrepriseForm: { ...prev.entrepriseForm, ...commonFields },
      };
    });

  const setForm = (nextForm: PartenaireForm | ((prev: PartenaireForm) => PartenaireForm)) =>
    setFormsState((prev) => {
      const currentForm = prev.formType === "particulier" ? prev.particulierForm : prev.entrepriseForm;
      const updated = typeof nextForm === "function" ? nextForm(currentForm) : nextForm;
      const commonFields = {
        code: updated.code,
        categorie: updated.categorie,
        telephone: updated.telephone,
        email: updated.email,
        serviceIds: updated.serviceIds,
      };
      return prev.formType === "particulier"
        ? {
            ...prev,
            particulierForm: { ...updated, type: "particulier" },
            entrepriseForm: { ...prev.entrepriseForm, ...commonFields },
          }
        : {
            ...prev,
            entrepriseForm: { ...updated, type: "entreprise" },
            particulierForm: { ...prev.particulierForm, ...commonFields },
          };
    });

  const setUserForm = (nextForm: PartenaireUserForm | ((prev: PartenaireUserForm) => PartenaireUserForm)) =>
    setFormsState((prev) => ({
      ...prev,
      userForm: typeof nextForm === "function" ? nextForm(prev.userForm) : nextForm,
    }));

  const toggleService = (serviceId: string) => {
    setForm((prev) => {
      const current = prev.serviceIds || [];
      const next = current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId];
      return { ...prev, serviceIds: next };
    });
  };

  const clearServices = () => {
    setForm((prev) => ({
      ...prev,
      serviceIds: [],
    }));
  };

  const selectPartnerUser = (user: HierarchyMemberUser) => {
    setSelectionState((prev) => ({ ...prev, selectedPartnerUserId: user.user_id }));
    setUserForm({
      prenom: user.first_name || "",
      nom: user.last_name || "",
      username: user.username || "",
      email: user.email || "",
      profil: user.profiles?.[0] || "",
    });
    resetUserFormErrors();
    setShowUserForm(true);
  };

  const openAddUserForm = () => {
    setSelectionState((prev) => ({ ...prev, selectedPartnerUserId: null }));
    setUserForm(defaultUserForm(form.categorie));
    resetUserFormErrors();
    setShowUserForm(true);
  };

  const removeUser = (userId: string) => {
    setPartnerUsers((prev) => prev.filter((u) => u.user_id !== userId));
    setSelectionState((prev) => ({ ...prev, selectedPartnerUserId: null }));
    setUserForm(defaultUserForm(form.categorie));
    resetUserFormErrors();
  };

  const addUser = async () => {
    const prenom = userForm.prenom.trim();
    const nom = userForm.nom.trim();
    const username = (userForm.username.trim() || deriveLogin(prenom, nom, partnerUsers.map((u) => u.username))).trim();
    const email = userForm.email.trim().toLowerCase();

    const validationErrors = validatePartenaireUserForm({ prenom, nom, username, email, profil: userForm.profil });
    setUserFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    if (editing) {
      setSavingPartnerUser(true);
      try {
        const createdUser = await createBackofficeUser({
          username,
          email,
          first_name: prenom,
          last_name: nom,
          target_scope: [{ ref_type: "PARTNER", ref_id: editing.id }],
          profiles: [userForm.profil],
        });
        setPartnerUsers((previous) => [...previous, {
          user_id: createdUser.account_user_id,
          username: createdUser.account_username,
          email,
          first_name: prenom,
          last_name: nom,
          profiles: [userForm.profil],
          active: true,
        }]);
        setUserForm(defaultUserForm(form.categorie));
        setShowUserForm(false);
        toast.success("Utilisateur ajouté avec succès");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible d'ajouter l'utilisateur");
      } finally {
        setSavingPartnerUser(false);
      }
      return;
    }

    // Mode création : ajout dans la liste des utilisateurs à créer avec le partenaire
    setPartnerUsers((previous) => [
      ...previous,
      {
        user_id: `pending-${Date.now()}`,
        username,
        email,
        first_name: prenom,
        last_name: nom,
        profiles: [userForm.profil],
        active: true,
      },
    ]);
    setUserForm(defaultUserForm(form.categorie));
    setShowUserForm(false);
    toast.success("Utilisateur ajouté à la liste");
  };

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchPartenaires({
      category: filterCategorie,
      entityType: filterType,
      includeInactive: filterStatut !== "actif",
      isActive: filterStatut === "all" ? undefined : filterStatut === "actif",
      includeArchived: false,
      search: search,
    })
      .then((data) => {
        if (!active) {
          return;
        }

        setPartenaires(Array.isArray(data?.partenaires) ? data.partenaires : []);
        setSummary(data?.summary ?? null);
        setError(null);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setPartenaires([]);
        setSummary(null);

        const message = error instanceof Error ? error.message : "Impossible de charger les partenaires";
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!active) {
          return;
        }

        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filterCategorie, filterType, filterStatut, search]);

  useEffect(() => {
    let active = true;
    const ownerCode = form.code?.trim();

    if (!ownerCode) {
      setCatalogServices([]);
      return () => {
        active = false;
      };
    }

    fetchCatalogServices({ owner_code: ownerCode })
      .then((data) => {
        if (!active) return;
        setCatalogServices(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) {
          setCatalogServices([]);
        }
      });

    return () => {
      active = false;
    };
  }, [form.code]);

  const buildEditedPartner = (partner: Partenaire): Partenaire => ({
    ...partner,
    code: form.code?.trim() || undefined,
    type: form.type,
    categorie: form.categorie,
    nom: form.nom.trim() || undefined,
    prenom: form.prenom.trim() || undefined,
    dateNaissance: form.dateNaissance || undefined,
    typePiece: form.typePiece || undefined,
    dateDelivrance: form.dateDelivrance || undefined,
    dateExpiration: form.dateExpiration || undefined,
    libelle: form.libelle.trim() || undefined,
    ninea: form.ninea.trim() || undefined,
    numeroIdentiteFiscale: form.numeroIdentiteFiscale.trim() || undefined,
    telephone: form.telephone.trim(),
    email: form.email.trim(),
    profil: partner.profil,
    serviceIds: form.serviceIds || [],
  });

  const buildNewPartner = (): Partenaire => {
    return {
      id: String(Date.now()),
      code: form.code?.trim() || undefined,
      type: form.type,
      categorie: form.categorie,
      nom: form.type === "particulier" ? form.nom.trim() : undefined,
      prenom: form.type === "particulier" ? form.prenom.trim() : undefined,
      dateNaissance: form.type === "particulier" ? form.dateNaissance : undefined,
      typePiece: form.type === "particulier" ? form.typePiece : undefined,
      dateDelivrance: form.type === "particulier" ? form.dateDelivrance : undefined,
      dateExpiration: form.type === "particulier" ? form.dateExpiration : undefined,
      libelle: form.type === "entreprise" ? form.libelle.trim() : undefined,
      ninea: form.type === "entreprise" ? form.ninea.trim() : undefined,
      numeroIdentiteFiscale:
        form.type === "entreprise" ? form.numeroIdentiteFiscale.trim() : undefined,
      login: "",
      telephone: form.telephone.trim(),
      email: form.email.trim(),
      profil: userForm.profil || (form.categorie === "marchand" ? "profile.bo.partenaire-admin" : "profile.bo.partenaire-facturier"),
      statut: "actif",
      dateCreation: new Date().toISOString().split("T")[0],
      pointsDeVente: [],
      serviceIds: form.serviceIds || [],
    };
  };

  const saveEdition = async (): Promise<void> => {
    if (!editing) {
      return;
    }

    const candidatePartner = buildEditedPartner(editing);
    const updatedPartner = await updatePartenaire(candidatePartner);

    try {
      await replacePartnerServices(editing.id, form.serviceIds || []);
      updatedPartner.serviceIds = form.serviceIds || [];
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur lors de la mise à jour des services";
      toast.error(`Partenaire modifié, mais échec sur les services: ${errorMsg}`);
    }

    setPartenaires((prev) =>
      prev.map((p) => (p.id === editing.id ? updatedPartner : p))
    );

    toast.success("Modification effectuée!");
  };

  const saveCreation = async (): Promise<void> => {
    const candidatePartner = buildNewPartner();
    const createdPartner = await createPartenaire(candidatePartner);

    if (form.serviceIds && form.serviceIds.length > 0) {
      try {
        await replacePartnerServices(createdPartner.id, form.serviceIds);
        createdPartner.serviceIds = form.serviceIds;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Erreur lors de l'assignation des services";
        toast.error(`Partenaire créé, mais échec sur l'assignation des services: ${errorMsg}`);
      }
    }

    setPartenaires((prev) => [createdPartner, ...prev]);

    // Option B : Ne créer d'utilisateurs QUE si l'utilisateur en a ajouté explicitement dans l'onglet Utilisateurs
    if (partnerUsers.length > 0) {
      let createdCount = 0;
      for (const u of partnerUsers) {
        try {
          await createBackofficeUser({
            username: u.username,
            email: u.email || "",
            first_name: u.first_name || "",
            last_name: u.last_name || "",
            target_scope: [{
              ref_type: "PARTNER",
              ref_id: createdPartner.id,
            }],
            profiles: u.profiles && u.profiles.length > 0 ? u.profiles : [profilsForCategorie(form.categorie)[0]],
          });

          createdCount++;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Erreur lors de la création du compte";
          toast.error(`Partenaire créé, mais échec sur l'utilisateur ${u.username}: ${errorMsg}`);
        }
      }
      if (createdCount > 0) {
        toast.success(`Partenaire et ${createdCount} utilisateur(s) créés avec succès.`);
      }
    } else {
      toast.success("Partenaire créé avec succès");
    }
  };

  const withToggledPartnerStatus = (partner: Partenaire): Partenaire => {
    const nextStatus = partner.statut === "actif" ? "inactif" : "actif";

    return {
      ...partner,
      statut: nextStatus,
    };
  };

  const getDisplayName = (p: Partenaire) =>
    p.type === "entreprise" ? p.libelle || "" : `${p.nom || ""} ${p.prenom || ""}`.trim();

  const profilsForCategorie = (cat: string) =>
    cat === "marchand" ? profilsMarchand : profilsFacturier;

  // --- Partner CRUD ---
  const openCreate = () => {
    setEditing(null);
    setPartnerUsers([]);
    setSelectionState((prev) => ({ ...prev, selectedPartnerUserId: null }));
    setFormsState({
      particulierForm: { ...emptyPartenaireForm, type: "particulier", serviceIds: [] },
      entrepriseForm: { ...emptyPartenaireForm, type: "entreprise", serviceIds: [] },
      formType: "particulier",
      userForm: defaultUserForm("marchand"),
      showUserForm: false,
    });
    setActiveTab("particulier");
    setDialogOpen(true);
  };

  const openEdit = (p: Partenaire) => {
    setEditing(p);
    setPartnerUsers([]);
    setSelectionState((prev) => ({ ...prev, selectedPartnerUserId: null }));
    const initialServices = p.serviceIds ?? (p.services ? p.services.map((s) => s.id) : []);
    const populatedForm = {
      code: p.code || "",
      categorie: p.categorie,
      nom: p.nom || "",
      prenom: p.prenom || "",
      dateNaissance: p.dateNaissance || "",
      typePiece: p.typePiece || "",
      dateDelivrance: p.dateDelivrance || "",
      dateExpiration: p.dateExpiration || "",
      libelle: p.libelle || "",
      ninea: p.ninea || "",
      numeroIdentiteFiscale: p.numeroIdentiteFiscale || "",
      telephone: p.telephone,
      email: p.email,
      profil: p.profil,
      serviceIds: initialServices,
    };
    setFormsState({
      particulierForm: { ...populatedForm, type: "particulier" as const, serviceIds: initialServices },
      entrepriseForm: { ...populatedForm, type: "entreprise" as const, serviceIds: initialServices },
      formType: p.type as "particulier" | "entreprise",
      userForm: defaultUserForm(p.categorie),
      showUserForm: false,
    });
    setActiveTab(p.type as "particulier" | "entreprise");

    const clientId = import.meta.env.VITE_ACCESS_SECURITY_CLIENT_ID || "backoffice-web";

    listHierarchyMembers("PARTNER", p.id, clientId)
      .then((res) => {
        if (res.users && res.users.length > 0) {
          setPartnerUsers(res.users);
        } else {
          setPartnerUsers([]);
        }
      })
      .catch(() => {
        setPartnerUsers([]);
      });

    fetchPartnerServices(p.id)
      .then((services) => {
        if (services && services.length > 0) {
          const ids = services.map((s) => s.id);
          setFormsState((prev) => ({
            ...prev,
            particulierForm: { ...prev.particulierForm, serviceIds: ids },
            entrepriseForm: { ...prev.entrepriseForm, serviceIds: ids },
          }));
        }
      })
      .catch(() => {});

    setActiveTab(p.type as "particulier" | "entreprise");
    setDialogOpen(true);
  };


  const updatePartnerUser = async (): Promise<void> => {
    if (!editing || !selectedPartnerUserId) {
      toast.error("Sélectionnez un utilisateur à modifier");
      return;
    }

    const firstName = userForm.prenom.trim();
    const lastName = userForm.nom.trim();
    const email = userForm.email.trim().toLowerCase();

    const validationErrors = validatePartenaireUserForm({
      prenom: firstName,
      nom: lastName,
      username: userForm.username,
      email,
      profil: userForm.profil,
    });
    setUserFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    setSavingPartnerUser(true);
    try {
      const updatedUser = await updateAccessSecurityUser(selectedPartnerUserId, {
        login: userForm.username.trim(),
        profiles: [userForm.profil],
        profile_client_id: "backoffice-web",
        first_name: firstName,
        last_name: lastName,
        telephone: form.telephone.trim() || null,
        matricule: null,
        agence: null,
        caisse: null,
        email,
      });

      setPartnerUsers((prev) => prev.map((user) => user.user_id === selectedPartnerUserId
        ? { ...user, first_name: updatedUser.first_name, last_name: updatedUser.last_name, email: updatedUser.email }
        : user));
      toast.success("Utilisateur modifié avec succès");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier l'utilisateur");
    } finally {
      setSavingPartnerUser(false);
    }
  };



  const save = async () => {
    if (savingPartner) {
      return;
    }

    const validationErrors = validatePartenaireForm(form);
    setFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    setSavingPartner(true);
    try {
      if (editing) {
        await saveEdition();
      } else {
        await saveCreation();
      }
      setDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'enregistrer le partenaire";
      toast.error(message);
    } finally {
      setSavingPartner(false);
    }
  };

  const confirmToggle = (p: Partenaire) => { setToggling(p); setToggleDialogOpen(true); };
  const handleToggle = async () => {
    if (!toggling) return;

    const localCandidate = withToggledPartnerStatus(toggling);
    const successMessage = localCandidate.statut === "actif"
      ? "Activation effectuée!"
      : "Désactivation effectuée!";

    try {
      const persisted = await togglePartenaireStatus(toggling);
      setPartenaires((prev) =>
        prev.map((p) => (p.id === toggling.id ? persisted : p))
      );
      toast.success(successMessage);
      setToggleDialogOpen(false);
      setToggling(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de modifier le statut du partenaire";
      toast.error(message);
    }
  };

  const confirmDelete = (p: Partenaire) => { setDeleting(p); setDeleteDialogOpen(true); };
  const handleDelete = async () => {
    if (!deleting) return;
    if (deleting.hasTransactions) {
      toast.error("Impossible de supprimer le partenaire");
      setDeleteDialogOpen(false);
      setDeleting(null);
      return;
    }

    try {
      await archivePartenaire(String(deleting.id));
      setPartenaires((prev) => prev.filter((p) => p.id !== deleting.id));
      toast.success("Suppression effectuée!");
      setDeleteDialogOpen(false);
      setDeleting(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de supprimer le partenaire";
      toast.error(message);
    }
  };

  return {
    // List
    partenaires, summary, loading, error, filtered: partenaires, search, setSearch,
    filterCategorie, setFilterCategorie, filterType, setFilterType, filterStatut, setFilterStatut,
    getDisplayName,
    // Partner CRUD
    dialogOpen, setDialogOpen, form, setForm, setFormType, formType, particulierForm, entrepriseForm, userForm, setUserForm,
    formErrors, clearFormError, userFormErrors, clearUserFormError, activeTab, setActiveTab, deriveLogin, editing,
    openCreate, openEdit, save, updatePartnerUser, selectPartnerUser, profilsForCategorie, savingPartner, savingPartnerUser, partnerUsers, selectedPartnerUserId, showUserForm, setShowUserForm, openAddUserForm, removeUser, addUser,
    // Services
    catalogServices, toggleService, clearServices,
    // Toggle
    toggleDialogOpen, setToggleDialogOpen, toggling, confirmToggle, handleToggle,
    // Delete
    deleteDialogOpen, setDeleteDialogOpen, deleting, confirmDelete, handleDelete,
  };
};
