import { useState, useCallback, useMemo } from "react";
import {
  CouplageAccountSchema,
  CustomerEnrollmentDetailsResponseSchema,
  EnrollmentApplicationSchema,
} from "../models/types";
import { EnrollmentListMeta } from "./viewmodelMappers";
import { EnrollmentFormState, emptyEnrollmentForm } from "./createEnrollmentHelpers";

const emptyValidationForm = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  pieceType: "",
  pieceNumber: "",
  fiscalIdentity: "",
  phone: "",
  email: "",
  deliveryDate: "",
  expiryDate: "",
};

export type DetailClientAction = "deactivate" | "unsubscribe" | "confirm-unsubscribe" | null;
export type ValidationFormState = typeof emptyValidationForm;

export const useClientsListState = () => {
  const [clients, setClients] = useState<EnrollmentApplicationSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatut, setFilterStatut] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterInstitution, setFilterInstitution] = useState("");
  const [enrollmentListMetaById, setEnrollmentListMetaById] =
    useState<Record<string, EnrollmentListMeta>>({});

  const updateClients = useCallback((newClients: EnrollmentApplicationSchema[]) => {
    setClients(newClients);
  }, []);

  const updateClient = useCallback((updatedEnrollment: EnrollmentApplicationSchema) => {
    setClients((previous) =>
      previous.map((enrollment) =>
        enrollment.id === updatedEnrollment.id ? updatedEnrollment : enrollment,
      ),
    );
  }, []);

  const removeClient = useCallback((enrollmentId: string) => {
    setClients((previous) => previous.filter((enrollment) => enrollment.id !== enrollmentId));
    setEnrollmentListMetaById((previous) => {
      const next = { ...previous };
      delete next[enrollmentId];
      return next;
    });
  }, []);

  const updateMeta = useCallback((metaEntry: Record<string, EnrollmentListMeta>) => {
    setEnrollmentListMetaById((previous) => ({ ...previous, ...metaEntry }));
  }, []);

  const resetSearchAndFilter = useCallback(() => {
    setFilterStatut("");
    setFilterType("");
    setFilterInstitution("");
  }, []);

  return {
    clients, setClients,
    loading, setLoading,
    error, setError,
    filterStatut, setFilterStatut,
    filterType, setFilterType,
    filterInstitution, setFilterInstitution,
    enrollmentListMetaById, setEnrollmentListMetaById,
    updateClients,
    updateClient,
    removeClient,
    updateMeta,
    resetSearchAndFilter,
  };
};

const initialParticulierData = {
  nom: "",
  prenom: "",
  telephone: "",
  email: "",
  codeClient: "",
  typePiece: "CNI",
  numeroPiece: "",
  dateNaissance: "",
  dateDelivrance: "",
  dateExpiration: "",
};

const initialEntrepriseData = {
  libelleEntreprise: "",
  telephone: "",
  email: "",
  codeClient: "",
  ninea: "",
  numeroIdentiteFiscale: "",
};

const initialCommercantData = {
  nom: "",
  prenom: "",
  telephone: "",
  email: "",
  codeClient: "",
  typePiece: "CNI",
  numeroPiece: "",
  dateNaissance: "",
  dateDelivrance: "",
  dateExpiration: "",
  libelleEntreprise: "",
  ninea: "",
  numeroIdentiteFiscale: "",
};

export const useCreateEnrollmentDialogState = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"PARTICULIER" | "ENTREPRISE" | "COMMERCANT">("PARTICULIER");
  const [particulierForm, setParticulierForm] = useState(initialParticulierData);
  const [entrepriseForm, setEntrepriseForm] = useState(initialEntrepriseData);
  const [commercantForm, setCommercantForm] = useState(initialCommercantData);

  const createForm = useMemo((): EnrollmentFormState => {
    if (activeTab === "PARTICULIER") {
      return {
        type: "PARTICULIER",
        ...particulierForm,
        libelleEntreprise: "",
        ninea: "",
        numeroIdentiteFiscale: "",
      };
    } else if (activeTab === "ENTREPRISE") {
      return {
        type: "ENTREPRISE",
        ...entrepriseForm,
        nom: "",
        prenom: "",
        typePiece: "CNI",
        numeroPiece: "",
        dateNaissance: "",
        dateDelivrance: "",
        dateExpiration: "",
      };
    } else {
      return {
        type: "COMMERCANT",
        ...commercantForm,
      };
    }
  }, [activeTab, particulierForm, entrepriseForm, commercantForm]);

  const setCreateForm = useCallback((update: EnrollmentFormState | ((prev: EnrollmentFormState) => EnrollmentFormState)) => {
    const currentForm = activeTab === "PARTICULIER" 
      ? { type: "PARTICULIER", ...particulierForm, libelleEntreprise: "", ninea: "", numeroIdentiteFiscale: "" }
      : activeTab === "ENTREPRISE"
        ? { type: "ENTREPRISE", ...entrepriseForm, nom: "", prenom: "", typePiece: "CNI", numeroPiece: "", dateNaissance: "", dateDelivrance: "", dateExpiration: "" }
        : { type: "COMMERCANT", ...commercantForm };
    
    const nextForm = typeof update === "function" ? update(currentForm as EnrollmentFormState) : update;

    if (nextForm.type !== activeTab) {
      setActiveTab(nextForm.type as "PARTICULIER" | "ENTREPRISE" | "COMMERCANT");
      return;
    }

    if (activeTab === "PARTICULIER") {
      setParticulierForm({
        nom: nextForm.nom,
        prenom: nextForm.prenom,
        telephone: nextForm.telephone,
        email: nextForm.email,
        codeClient: nextForm.codeClient,
        typePiece: nextForm.typePiece,
        numeroPiece: nextForm.numeroPiece,
        dateNaissance: nextForm.dateNaissance,
        dateDelivrance: nextForm.dateDelivrance,
        dateExpiration: nextForm.dateExpiration,
      });
    } else if (activeTab === "ENTREPRISE") {
      setEntrepriseForm({
        libelleEntreprise: nextForm.libelleEntreprise,
        telephone: nextForm.telephone,
        email: nextForm.email,
        codeClient: nextForm.codeClient,
        ninea: nextForm.ninea,
        numeroIdentiteFiscale: nextForm.numeroIdentiteFiscale,
      });
    } else {
      setCommercantForm({
        nom: nextForm.nom,
        prenom: nextForm.prenom,
        telephone: nextForm.telephone,
        email: nextForm.email,
        codeClient: nextForm.codeClient,
        typePiece: nextForm.typePiece,
        numeroPiece: nextForm.numeroPiece,
        dateNaissance: nextForm.dateNaissance,
        dateDelivrance: nextForm.dateDelivrance,
        dateExpiration: nextForm.dateExpiration,
        libelleEntreprise: nextForm.libelleEntreprise,
        ninea: nextForm.ninea,
        numeroIdentiteFiscale: nextForm.numeroIdentiteFiscale,
      });
    }
  }, [activeTab, particulierForm, entrepriseForm, commercantForm]);

  const openDialog = useCallback(() => {
    setActiveTab("PARTICULIER");
    setParticulierForm(initialParticulierData);
    setEntrepriseForm(initialEntrepriseData);
    setCommercantForm(initialCommercantData);
    setCreateLoading(false);
    setCreateDialogOpen(true);
  }, []);

  const closeDialog = useCallback((open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      setActiveTab("PARTICULIER");
      setParticulierForm(initialParticulierData);
      setEntrepriseForm(initialEntrepriseData);
      setCommercantForm(initialCommercantData);
      setCreateLoading(false);
    }
  }, []);

  return {
    createDialogOpen,
    createLoading, setCreateLoading,
    createForm, setCreateForm,
    openDialog,
    closeDialog,
  };
};

export const useDetailViewState = () => {
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewClient, setViewClient] = useState<EnrollmentApplicationSchema | null>(null);
  const [viewClientDetails, setViewClientDetails] =
    useState<CustomerEnrollmentDetailsResponseSchema | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [validationForm, setValidationForm] = useState<ValidationFormState>(emptyValidationForm);
  const [enrollmentCodeInput, setEnrollmentCodeInput] = useState("");
  const [detailClientAction, setDetailClientAction] = useState<DetailClientAction>(null);
  const closeDetail = useCallback((open: boolean) => {
    setDetailOpen(open);
    if (!open) {
      setDetailLoading(false);
      setViewClient(null);
      setViewClientDetails(null);
      setActionLoading(false);
      setEnrollmentCodeInput("");
      setValidationForm(emptyValidationForm);
      setDetailClientAction(null);
    }
  }, []);

  return {
    detailOpen, setDetailOpen,
    viewClient, setViewClient,
    viewClientDetails, setViewClientDetails,
    detailLoading, setDetailLoading,
    actionLoading, setActionLoading,
    validationForm, setValidationForm,
    enrollmentCodeInput, setEnrollmentCodeInput,
    detailClientAction, setDetailClientAction,
    closeDetail,
  };
};

export const useCouplageAccountsState = () => {
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [hasLoadedCouplageAccounts, setHasLoadedCouplageAccounts] = useState(false);
  const [couplageIdInput, setCouplageIdInput] = useState("");
  const [couplageAccounts, setCouplageAccounts] = useState<CouplageAccountSchema[]>([]);

  return {
    accountsLoading, setAccountsLoading,
    hasLoadedCouplageAccounts, setHasLoadedCouplageAccounts,
    couplageIdInput, setCouplageIdInput,
    couplageAccounts, setCouplageAccounts,
  };
};
