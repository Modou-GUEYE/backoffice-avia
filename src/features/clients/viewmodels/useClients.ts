import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getCurrentInstitutionId, getCurrentInstitutionLabel } from "@/core/security/authStore";
import { useCurrentActor } from "@/core/security/useCurrentActor";
import {
  EnrollmentApplicationSchema,
  CustomerEnrollmentDetailsResponseSchema,
} from "../models/types";
import {
  assignEnrollmentSubscription,
  confirmUnsubscription,
  createEnrollmentApplication,
  deactivateCustomer,
  deleteEnrollment,
  fetchCouplageAccounts,
  fetchEnrollmentDetails,
  fetchPendingEnrollmentsByInstitution,
  fetchEnrollmentsByIdentifier,
  generateEnrollmentCode,
  unsubscribeEnrollment,
  updateCustomerIdentity,
  validateEnrollment,
} from "../services/clientsService";
import { fetchSubscriptions } from "@/features/abonnements/services/abonnementsService";
import { SubscriptionResponse } from "@/features/abonnements/models/types";
import { fetchStructureById, fetchStructures } from "@/features/structures/services/structuresService";
import { fetchDefaultStructureParams, fetchStructureParams } from "@/features/structure-params/services/structureParamsService";
import { StructureParamsResponse } from "@/features/structure-params/models/types";
import {
  buildCommercantIdentityPayload,
  buildEntrepriseIdentityPayload,
  buildParticulierIdentityPayload,
  hasExpectedIdentityNames,
  resolveIdentityUpdateContext,
} from "./identityUpdateHelpers";
import {
  buildCreatePayload,
  normalizeCompareValue,
  normalizeDocumentTypeForComparison,
  validateCreateFormFields,
  type EnrollmentFormField,
} from "./createEnrollmentHelpers";
import { hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";
import {
  buildEnrollmentMetaFromDetails,
  toValidationForm,
} from "./viewmodelMappers";
import {
  canDeleteEnrollmentStatus,
  canValidateEnrollmentStatus,
  isApprovedEnrollmentStatus,
  isPendingEnrollmentStatus,
  isValidatedEnrollmentStatus,
  normalizeEnrollmentStatus,
} from "../models/enrollmentStatus";
import {
  getDeleteEnrollmentBlockingError,
  getGenerateCodeBlockingError,
  getPendingUpdateBlockingError,
  getUpdateActionBlockingError,
} from "./clientsActionGuards";
import {
  DetailClientAction,
  useClientsListState,
  useCreateEnrollmentDialogState,
  useDetailViewState,
  useCouplageAccountsState,
} from "./useClientsFeatureState";
import { useCustomerIdMapState } from "./useCustomerIdMapState";
import { readEnrollmentStatusOverrideMap, setEnrollmentStatusOverride } from "./customerIdMapStore";

const alphanumericPattern = /^[A-Za-z0-9]+$/;
const enrollmentValidityDays = 3;

const getLevenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const getStringSimilarity = (s1: string, s2: string): number => {
  const norm1 = normalizeCompareValue(s1);
  const norm2 = normalizeCompareValue(s2);
  if (!norm1 && !norm2) return 100;
  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 100;

  const distance = getLevenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  return Math.round((1 - distance / maxLength) * 100);
};

type CorrespondenceScore = {
  matched: number;
  total: number;
  percentage: number;
};

type OpenDetailOptions = {
  bypassPermissionCheck?: boolean;
  clientAction?: DetailClientAction;
};

type LoadPendingEnrollmentsOptions = {
  hydrateMeta?: boolean;
};

export const useClients = () => {
  const listState = useClientsListState();
  const createState = useCreateEnrollmentDialogState();
  const detailState = useDetailViewState();
  const couplageState = useCouplageAccountsState();
  const customerIdState = useCustomerIdMapState();
  const [detailStructureParams, setDetailStructureParams] = useState<StructureParamsResponse | null>(null);

  const {
    clients,
    setClients,
    setLoading,
    error,
    setError,
    filterStatut,
    filterType,
    filterInstitution,
    updateMeta,
    enrollmentListMetaById,
  } = listState;

  const {
    setCreateLoading,
    createForm,
    openDialog,
    closeDialog,
  } = createState;

  const {
    viewClient,
    viewClientDetails,
    validationForm,
    setValidationForm,
  } = detailState;

  const {
    setAccountsLoading,
    setHasLoadedCouplageAccounts,
    setCouplageAccounts,
  } = couplageState;

  const {
    customerIdByEnrollmentId,
    referenceLinkByEnrollmentId,
    resolveCustomerId,
    rememberCustomerId,
    rememberReferenceLink,
  } = customerIdState;

  const [availableSubscriptions, setAvailableSubscriptions] = useState<SubscriptionResponse[]>([]);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>("");
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState<boolean>(false);

  const { currentPermissions, entityContext } = useCurrentActor();

  const hasBackendPerm = useCallback(
    (perm: string) =>
      currentPermissions?.some(
        (p) => p === "*" || p === "all" || p.toLowerCase() === perm.toLowerCase(),
      ) ?? false,
    [currentPermissions],
  );


  const permissions = useMemo(
    () => ({
      canRead: hasBackendPerm("perm.bo.enrollment.list"),
      canCreate: hasBackendPerm("perm.bo.enrollment.add"),
      canUpdate: hasBackendPerm("perm.bo.enrollment.update"),
      canDelete: hasBackendPerm("perm.bo.enrollment.delete"),
      canUnsubscribe: hasBackendPerm("perm.bo.enrollment.unsubscribe"),
      canDeactivate: hasBackendPerm("perm.bo.enrollment.deactivate"),
      canGenerateCode:
        hasBackendPerm("perm.bo.enrollment.resend-code") ||
        hasBackendPerm("perm.bo.enrollment.generate-code"),
    }),
    [hasBackendPerm],
  );



  const loadPendingEnrollments = useCallback(
    async (
      institutionId: string,
      filters?: { status?: string; client_type?: string; institution_label?: string },
    ) => {
      let data: EnrollmentApplicationSchema[] = [];
      const query = filters?.institution_label?.trim();

      const isCustomerQuery = (q?: string): boolean => {
        if (!q) return false;
        return (
          /^[+]?[0-9\s-]{6,20}$/.test(q) ||
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q) ||
          /^CL-/i.test(q) ||
          /^CLI/i.test(q) ||
          /^ENT/i.test(q)
        );
      };

      if (isCustomerQuery(query)) {
        data = await fetchEnrollmentsByIdentifier(query!);
        if (filters?.status) {
          data = data.filter((e) => e.status.toUpperCase() === filters.status!.toUpperCase());
        }
      } else {
        data = await fetchPendingEnrollmentsByInstitution(institutionId, filters);
      }

      const enrichedData = data;

      // Preserve customerId that was stored at creation time — the list API never returns it.
      // Also apply any locally projected status overrides (e.g. after deactivation, before
      // the backend list API reflects the change).
      const statusOverrides = readEnrollmentStatusOverrideMap();
      setClients((existing) => {
        const existingById = new Map(existing.map((enrollment) => [enrollment.id, enrollment]));

        return enrichedData.map((enrollment) => ({
          ...enrollment,
          customerId:
            existingById.get(enrollment.id)?.customerId
            ?? customerIdByEnrollmentId[enrollment.id]
            ?? enrollment.customerId
            ?? null,
          referenceLink:
            existingById.get(enrollment.id)?.referenceLink
            ?? referenceLinkByEnrollmentId[enrollment.id]
            ?? enrollment.referenceLink
            ?? null,
          status: statusOverrides[enrollment.id] ?? enrollment.status,
        }));
      });

      return enrichedData;
    },
    [customerIdByEnrollmentId, referenceLinkByEnrollmentId, setClients],
  );

  const normalizeCreateEnrollmentErrorMessage = useCallback((error: unknown): string => {
    if (!(error instanceof Error)) {
      return "Impossible de créer l'enrôlement";
    }

    const normalizedMessage = error.message.trim().toLowerCase();
    const isAlreadyExistingCustomer =
      normalizedMessage.includes("client existe") ||
      normalizedMessage.includes("existe déjà") ||
      normalizedMessage.includes("already exists") ||
      normalizedMessage.includes("already enrolled");

    if (isAlreadyExistingCustomer) {
      return "Le client existe déjà";
    }

    return error.message;
  }, []);

  const getEnrollmentExpiryDate = useCallback(
    (enrollment: EnrollmentApplicationSchema): string | null => {
      if (!enrollment.createdAt) {
        return null;
      }

      const createdAtTime = new Date(enrollment.createdAt).getTime();
      if (Number.isNaN(createdAtTime)) {
        return null;
      }

      const validityDurationMs = enrollmentValidityDays * 24 * 60 * 60 * 1000;
      return new Date(createdAtTime + validityDurationMs).toISOString();
    },
    [],
  );

  const hydrateValidationForm = useCallback(
    (
      detailsData: CustomerEnrollmentDetailsResponseSchema,
      overrides?: {
        phone?: string;
        email?: string;
        deliveryDate?: string;
        expiryDate?: string;
      },
    ) => {
      setValidationForm(toValidationForm(detailsData, overrides));
    },
    [setValidationForm],
  );

  const checkValidationFormAgainstSig = useCallback((): string | null => {
    if (!viewClientDetails?.sibKyc) {
      return null;
    }

    const isBusinessEnrollment =
      normalizeCompareValue(validationForm.lastName) === "entreprise"
      || normalizeCompareValue(validationForm.pieceType) === "ninea";
    
    if (isBusinessEnrollment) {
      return null;
    }

    const sig = viewClientDetails.sibKyc;

    const firstNameMatches =
      normalizeCompareValue(validationForm.firstName) === normalizeCompareValue(sig.firstName);
    const lastNameMatches =
      normalizeCompareValue(validationForm.lastName) === normalizeCompareValue(sig.lastName);
    const dobMatches = validationForm.dateOfBirth === sig.dateOfBirth;

    const mismatchedFields: string[] = [];

    if (!lastNameMatches) {
      mismatchedFields.push("nom");
    }
    if (!firstNameMatches) {
      mismatchedFields.push("prénom");
    }
    if (!dobMatches) {
      mismatchedFields.push("date de naissance");
    }

    if (mismatchedFields.length > 0) {
      return `Les données ne correspondent pas (${mismatchedFields.join(", ")})`;
    }

    return null;
  }, [validationForm, viewClientDetails]);

  const correspondenceScore: CorrespondenceScore | null = (() => {
    if (!viewClientDetails?.sibKyc) {
      return null;
    }

    const sig = viewClientDetails.sibKyc;
    const checks: boolean[] = [];

    if (detailStructureParams?.kyc_match_prenom_pct !== null && detailStructureParams?.kyc_match_prenom_pct !== undefined) {
      const prenomSimilarity = getStringSimilarity(validationForm.firstName || "", sig.firstName || "");
      checks.push(prenomSimilarity >= detailStructureParams.kyc_match_prenom_pct);
    }
    if (detailStructureParams?.kyc_match_nom_pct !== null && detailStructureParams?.kyc_match_nom_pct !== undefined) {
      const nomSimilarity = getStringSimilarity(validationForm.lastName || "", sig.lastName || "");
      checks.push(nomSimilarity >= detailStructureParams.kyc_match_nom_pct);
    }
    if (detailStructureParams?.kyc_match_date_naissance_pct !== null && detailStructureParams?.kyc_match_date_naissance_pct !== undefined) {
      const birthSimilarity = validationForm.dateOfBirth === sig.dateOfBirth ? 100 : 0;
      checks.push(birthSimilarity >= detailStructureParams.kyc_match_date_naissance_pct);
    }

    if (sig.idType) {
      checks.push(
        normalizeDocumentTypeForComparison(validationForm.pieceType)
          === normalizeDocumentTypeForComparison(sig.idType),
      );
    }

    if (sig.idNumber) {
      checks.push(normalizeCompareValue(validationForm.pieceNumber) === normalizeCompareValue(sig.idNumber));
    }

    const matched = checks.filter(Boolean).length;
    const total = checks.length;

    return {
      matched,
      total,
      percentage: total > 0 ? Math.round((matched / total) * 100) : 0,
    };
  })();

  const isBusinessEnrollment =
    normalizeCompareValue(validationForm.lastName) === "entreprise"
    || normalizeCompareValue(validationForm.pieceType) === "ninea";
  const initiationTabLabel = viewClient?.clientType === "COMMERCANT" || viewClientDetails?.customer.clientType === "COMMERCANT"
    ? "Commerçant"
    : (isBusinessEnrollment ? "Entreprise" : "Particulier");
  const isMobileBanking = Boolean(viewClientDetails?.sibKyc);
  const canValidateCurrentEnrollment =
    canValidateEnrollmentStatus(viewClient?.status) &&
    hasBackendPerm("perm.bo.enrollment.validate");
  const canUnsubscribeCurrentEnrollment = Boolean(viewClient);
  const canDeleteCurrentEnrollment = canDeleteEnrollmentStatus(viewClient?.status) && permissions.canDelete;

  const {
    errors: createFormErrors,
    setErrors: setCreateFormErrors,
    clearError: clearCreateFormError,
    resetErrors: resetCreateFormErrors,
  } = useFieldErrors<EnrollmentFormField>();

  const openCreateEnrollment = useCallback(() => {
    resetCreateFormErrors();
    openDialog();
  }, [openDialog, resetCreateFormErrors]);

  const closeCreateEnrollment = useCallback(
    (open: boolean) => {
      resetCreateFormErrors();
      closeDialog(open);
    },
    [closeDialog, resetCreateFormErrors],
  );

  const getCreatePrecheckError = useCallback(
    async (
      _institutionId: string,
      _normalizedClientCode: string,
    ): Promise<string | null> => {
      // Les doublons de téléphone ou de CNI sont gérés directement par le backend.
      return null;
    },
    [],
  );

  const submitCreateEnrollment = useCallback(async (): Promise<void> => {
    const validationErrors = validateCreateFormFields(createForm);
    setCreateFormErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) {
      return;
    }

    const institutionId = getCurrentInstitutionId();
    if (!institutionId) {
      toast.error("Institution introuvable dans la session backend");
      return;
    }

    const institutionLabel = getCurrentInstitutionLabel() ?? institutionId;

    setCreateLoading(true);
    try {
      const normalizedClientCode = createForm.codeClient.trim().toUpperCase();

      const precheckError = await getCreatePrecheckError(institutionId, normalizedClientCode);
      if (precheckError) {
        toast.error(precheckError);
        return;
      }

      let payloadInstitutionLabel = institutionLabel;
      if (payloadInstitutionLabel.trim().toLowerCase() === institutionId.trim().toLowerCase()) {
        try {
          const structure = await fetchStructureById(institutionId);
          if (structure.name?.trim()) {
            payloadInstitutionLabel = structure.name.trim();
          }
        } catch {
          // Keep the fallback label as the institution ID.
        }
      }

      const payload = buildCreatePayload(
        createForm,
        institutionId,
        payloadInstitutionLabel,
        normalizedClientCode,
      );
      const created = await createEnrollmentApplication(payload);

      if (!Array.isArray(created.enrollments) || created.enrollments.length === 0) {
        throw new Error(
          `Création acceptée mais aucun enrôlement généré par le backend (customerId=${created.customerId || "inconnu"}, institutionId=${institutionId}).`,
        );
      }

      for (const enrollment of created.enrollments) {
        rememberCustomerId(enrollment.id, created.customerId);
        rememberReferenceLink(enrollment.id, enrollment.referenceLink);
      }

      listState.resetSearchAndFilter();
      toast.success("Enrôlement initié avec succès");
      closeCreateEnrollment(false);
    } catch (createError) {
      const message = normalizeCreateEnrollmentErrorMessage(createError);
      toast.error(message);
    } finally {
      setCreateLoading(false);
    }
  }, [
    createForm,
    setCreateFormErrors,
    setCreateLoading,
    getCreatePrecheckError,
    listState,
    closeCreateEnrollment,
    normalizeCreateEnrollmentErrorMessage,
    rememberCustomerId,
    rememberReferenceLink,
  ]);

  const removeEnrollmentFromList = useCallback(
    (enrollmentId: string) => {
      listState.removeClient(enrollmentId);
    },
    [listState],
  );

  const extractCouplageId = useCallback((referenceLink?: string | null): string => {
    if (!referenceLink) {
      return "";
    }

    const rawValue = referenceLink.trim();
    if (!rawValue) {
      return "";
    }

    try {
      const parsedUrl = new URL(rawValue);
      const pathnameParts = parsedUrl.pathname.split("/").filter(Boolean);
      return pathnameParts.at(-1) ?? rawValue;
    } catch {
      const plainParts = rawValue.split("/").filter(Boolean);
      return plainParts.at(-1) ?? rawValue;
    }
  }, []);

  const updateEnrollmentInList = useCallback(
    (updatedEnrollment: EnrollmentApplicationSchema) => {
      const resolvedCustomerId = customerIdState.resolveCustomerId(updatedEnrollment);
      const resolvedReferenceLink = customerIdState.resolveReferenceLink(updatedEnrollment);

      const mergePreferredField = (currentValue?: string | null, incomingValue?: string | null) => {
        const normalizedIncoming = incomingValue?.trim();
        if (normalizedIncoming) {
          return incomingValue;
        }

        return currentValue;
      };

      const mergeEnrollment = (
        current: EnrollmentApplicationSchema,
        incoming: EnrollmentApplicationSchema,
      ): EnrollmentApplicationSchema => ({
        ...current,
        ...incoming,
        institutionLabel: mergePreferredField(current.institutionLabel, incoming.institutionLabel) || current.institutionLabel,
        enrollmentCode: mergePreferredField(current.enrollmentCode, incoming.enrollmentCode),
        rejectionReason: mergePreferredField(current.rejectionReason, incoming.rejectionReason),
        createdAt: mergePreferredField(current.createdAt, incoming.createdAt),
        updatedAt: mergePreferredField(current.updatedAt, incoming.updatedAt),
        customerId: mergePreferredField(current.customerId, resolvedCustomerId),
        referenceLink: mergePreferredField(current.referenceLink, resolvedReferenceLink ?? incoming.referenceLink),
      });

      const existingFromList = listState.clients.find((item) => item.id === updatedEnrollment.id);
      const mergedForList = existingFromList
        ? mergeEnrollment(existingFromList, updatedEnrollment)
        : {
            ...updatedEnrollment,
            customerId: resolvedCustomerId,
            referenceLink: resolvedReferenceLink ?? updatedEnrollment.referenceLink,
          };

      listState.updateClient(mergedForList);

      detailState.setViewClient((previous) => {
        if (previous?.id !== updatedEnrollment.id) {
          return previous;
        }

        return mergeEnrollment(previous, updatedEnrollment);
      });

      // Ne pas pré-remplir le champ code d'enrôlement automatiquement.

      const referenceLinkToUse = mergedForList.referenceLink ?? updatedEnrollment.referenceLink;
      if (referenceLinkToUse) {
        customerIdState.rememberReferenceLink(updatedEnrollment.id, referenceLinkToUse);
        const parsedCouplageId = extractCouplageId(referenceLinkToUse);
        if (parsedCouplageId) {
          couplageState.setCouplageIdInput(parsedCouplageId);
        }
      }
    },
    [customerIdState, listState, detailState, couplageState, extractCouplageId],
  );

  const openDetail = useCallback(
    async (
      enrollment: EnrollmentApplicationSchema,
      options: OpenDetailOptions = {},
    ) => {
      detailState.setDetailLoading(true);
      detailState.setActionLoading(false);
      setSelectedSubscriptionId("");
      setAvailableSubscriptions([]);
      setIsLoadingSubscriptions(true);
      const enrollmentWithCustomerId: EnrollmentApplicationSchema = {
        ...enrollment,
        customerId: customerIdState.resolveCustomerId(enrollment),
        referenceLink: customerIdState.resolveReferenceLink(enrollment) ?? enrollment.referenceLink,
      };
      detailState.setViewClient(enrollmentWithCustomerId);
      detailState.setViewClientDetails(null);
      detailState.setDetailClientAction(options.clientAction ?? null);
      detailState.setEnrollmentCodeInput("");
      couplageState.setCouplageAccounts([]);
      couplageState.setHasLoadedCouplageAccounts(false);

      const couplageId = extractCouplageId(enrollmentWithCustomerId.referenceLink);
      couplageState.setCouplageIdInput(couplageId);

      try {
        let matchingStructureId: string | null = null;
        // Load structure parameters for KYC matching thresholds
        try {
          const structures = await fetchStructures();
          const matchingStructure = structures.find(
            (s) => !s.is_deleted && s.name.trim().toLowerCase() === enrollment.institutionLabel.trim().toLowerCase()
          );
          matchingStructureId = matchingStructure?.id ?? null;
          let params: StructureParamsResponse;
          if (matchingStructure) {
            params = await fetchStructureParams(matchingStructure.id);
          } else {
            params = await fetchDefaultStructureParams();
          }
          setDetailStructureParams(params);
        } catch (err) {
          console.error("Error loading structure parameters for matching thresholds:", err);
          try {
            const defaultParams = await fetchDefaultStructureParams();
            setDetailStructureParams(defaultParams);
          } catch {
            setDetailStructureParams({
              badge: "",
              compte_beneficiaire_format: "NUMERIC",
              compte_beneficiaire_length: null,
              double_auth_enabled: false,
              kyc_match_date_naissance_pct: null,
              kyc_match_nom_pct: null,
              kyc_match_prenom_pct: null,
              kyc_match_libelle_pct: null,
              kyc_match_ninea_pct: null,
              kyc_match_num_identite_fiscale_pct: null,
              ouverture_mutualisation: false,
              structure_id: "",
              structure_name: "",
              tenant_level: "GLOBAL",
            });
          }
        }

        const details = await fetchEnrollmentDetails(enrollmentWithCustomerId.id);

        // Update customerId cache with the one from API response if available
        if (details.customerId) {
          customerIdState.rememberCustomerId(enrollmentWithCustomerId.id, details.customerId);
        }

        detailState.setViewClientDetails(details);
        hydrateValidationForm(details);

        // Load subscriptions for structure if available
        try {
          const targetStructureId = matchingStructureId || getCurrentInstitutionId();
          if (targetStructureId) {
            const allSubs = await fetchSubscriptions();
            const structureSubs = allSubs.filter(
              (s) => s.structure_id === targetStructureId && s.status === "ACTIVE"
            );
            setAvailableSubscriptions(structureSubs);
            // Champ non typé par le contrat : présent selon la version de l'API d'enrôlement
            type WithSubscription = { subscriptionId?: string; subscription_id?: string };
            const detailsSub = details as WithSubscription | null | undefined;
            const enrollmentSub = enrollment as WithSubscription | null | undefined;
            const existingSubId =
              detailsSub?.subscriptionId ||
              detailsSub?.subscription_id ||
              enrollmentSub?.subscriptionId ||
              enrollmentSub?.subscription_id ||
              "";
            if (existingSubId && structureSubs.some((s) => s.id === existingSubId)) {
              setSelectedSubscriptionId(existingSubId);
            } else if (structureSubs.length === 1) {
              setSelectedSubscriptionId(structureSubs[0].id);
            }
          } else {
            setAvailableSubscriptions([]);
          }
        } catch (subErr) {
          console.warn("Could not load subscriptions for structure:", subErr);
          setAvailableSubscriptions([]);
        } finally {
          setIsLoadingSubscriptions(false);
        }

        if (couplageId) {
          couplageState.setAccountsLoading(true);
          try {
            const accounts = await fetchCouplageAccounts(couplageId);
            couplageState.setCouplageAccounts(accounts);
          } catch {
            couplageState.setCouplageAccounts([]);
          } finally {
            couplageState.setAccountsLoading(false);
            couplageState.setHasLoadedCouplageAccounts(true);
          }
        }

        detailState.setDetailOpen(true);
      } catch (detailError) {
        setIsLoadingSubscriptions(false);
        const message =
          detailError instanceof Error
            ? detailError.message
            : "Impossible de charger les détails d'enrôlement";
        toast.error(message);
        detailState.closeDetail(false);
        return;
      } finally {
        detailState.setDetailLoading(false);
      }
    },
    [customerIdState, couplageState, detailState, extractCouplageId, hydrateValidationForm],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);

    const institutionId = getCurrentInstitutionId();

    if (!institutionId && entityContext !== "Administration") {
      setError("Institution introuvable dans la session backend");
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const filters = {
      status: filterStatut || undefined,
      client_type: filterType || undefined,
      institution_label: filterInstitution || undefined,
    };

    loadPendingEnrollments(institutionId || "ALL", filters)
      .then(() => {
        if (!active) return;
        setError(null);
      })
      .catch((fetchError) => {
        if (!active) return;
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Impossible de charger les enrôlements";
        setError(message);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadPendingEnrollments, setError, setLoading, filterStatut, filterType, filterInstitution, entityContext]);

  const hasActiveFilters = [
    listState.filterStatut !== "",
    listState.filterType !== "",
    listState.filterInstitution !== "",
  ].some(Boolean);

  const filtered = clients
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getActionErrorMessage = useCallback((actionError: unknown, fallback: string): string =>
    actionError instanceof Error ? actionError.message : fallback,
  []);

  const runActionWithLoading = useCallback(
    async (
      action: () => Promise<void>,
      fallbackErrorMessage: string,
    ): Promise<void> => {
      detailState.setActionLoading(true);
      try {
        await action();
      } catch (actionError) {
        toast.error(getActionErrorMessage(actionError, fallbackErrorMessage));
      } finally {
        detailState.setActionLoading(false);
      }
    },
    [detailState, getActionErrorMessage],
  );

  const hasBlockingError = useCallback((blockingError: string | null): boolean => {
    if (!blockingError) {
      return false;
    }

    if (blockingError !== "Enrôlement introuvable") {
      toast.error(blockingError);
    }

    return true;
  }, []);

  const generateCode = useCallback(async () => {
    const blockingError = getGenerateCodeBlockingError(detailState.viewClient, {
      canUpdate: permissions.canUpdate,
      canDelete: permissions.canDelete,
      canGenerateCode: permissions.canGenerateCode,
    });
    if (hasBlockingError(blockingError)) {
      return;
    }

    await runActionWithLoading(async () => {
      if (!detailState.viewClient) {
        return;
      }

      const response = await generateEnrollmentCode(detailState.viewClient.id);
      if (!response.enrollmentCode?.trim()) {
        throw new Error("Aucun code d'enrôlement retourné");
      }

      const updatedEnrollment: EnrollmentApplicationSchema = {
        ...detailState.viewClient,
        enrollmentCode: response.enrollmentCode,
      };
      updateEnrollmentInList(updatedEnrollment);
      detailState.setEnrollmentCodeInput("");
      toast.success("Code d'enrôlement généré et envoyé par e-mail avec succès");
    }, "Impossible de générer un nouveau code");
  }, [detailState, permissions, hasBlockingError, runActionWithLoading, updateEnrollmentInList]);

  const resolveUpdateContext = useCallback(() => {
    if (!detailState.viewClient) {
      throw new Error("Enrôlement introuvable");
    }

    if (!detailState.viewClientDetails) {
      throw new Error("Détails client indisponibles");
    }

    return resolveIdentityUpdateContext(
      detailState.viewClient.id,
      customerIdState.resolveCustomerId(detailState.viewClient),
      detailState.validationForm,
    );
  }, [detailState, customerIdState]);

  const refreshDetailsAfterIdentityUpdate = useCallback(
    async (
      enrollmentId: string,
      savedPhone: string,
      savedEmail: string,
      showSuccessToast: boolean,
    ): Promise<CustomerEnrollmentDetailsResponseSchema> => {
      const detailsAfterIdentityPatch = await fetchEnrollmentDetails(enrollmentId);
      const reloadedPhone = detailsAfterIdentityPatch.customer.phone?.trim() ?? "";
      const reloadedEmail = detailsAfterIdentityPatch.customer.email?.trim() ?? "";
      const submittedPhone = savedPhone.trim();
      const submittedEmail = savedEmail.trim();
      const mismatchedContactFields: string[] = [];

      if (submittedPhone !== reloadedPhone) {
        mismatchedContactFields.push("téléphone");
      }
      if (submittedEmail !== reloadedEmail) {
        mismatchedContactFields.push("email");
      }

      // Update customerId cache with the one from API response if available
      if (detailsAfterIdentityPatch.customerId) {
        customerIdState.rememberCustomerId(enrollmentId, detailsAfterIdentityPatch.customerId);
      }
      detailState.setViewClientDetails(detailsAfterIdentityPatch);
      hydrateValidationForm(detailsAfterIdentityPatch);
      if (detailState.viewClient) {
        updateEnrollmentInList({
          ...detailState.viewClient,
          firstName: detailsAfterIdentityPatch.identity.firstName,
          lastName: detailsAfterIdentityPatch.identity.lastName,
          clientType: detailState.viewClient.clientType === "COMMERCANT"
                        ? "COMMERCANT"
                        : (detailsAfterIdentityPatch.identity.lastName?.trim().toLowerCase() === "entreprise" ||
                           detailsAfterIdentityPatch.documents?.[0]?.type?.trim().toUpperCase() === "NINEA"
                            ? "ENTREPRISE"
                            : "PARTICULIER"),
        });
      }

      if (mismatchedContactFields.length > 0) {
        toast.warning(
          `Mise à jour partielle: ${mismatchedContactFields.join(", ")} non enregistré(s) par le backend`,
        );
      } else if (showSuccessToast) {
        toast.success("Données saisies mises à jour");
      }

      return detailsAfterIdentityPatch;
    },
    [customerIdState, detailState, hydrateValidationForm, updateEnrollmentInList],
  );

  const syncParticulierEnteredData = useCallback(
    async (showSuccessToast: boolean): Promise<void> => {
      const { customerId, enrollmentId, savedPhone, savedEmail } = resolveUpdateContext();
      const identityPayload = {
        ...buildParticulierIdentityPayload(detailState.validationForm),
        // Include contact data in the identity payload to verify backend support.
        phone: detailState.validationForm.phone || null,
        email: detailState.validationForm.email || null,
      };

      await updateCustomerIdentity(customerId, identityPayload);

      const detailsAfterIdentityPatch = await refreshDetailsAfterIdentityUpdate(
        enrollmentId,
        savedPhone,
        savedEmail,
        showSuccessToast,
      );

      if (!hasExpectedIdentityNames(detailsAfterIdentityPatch, detailState.validationForm)) {
        throw new Error("Les mises à jour des données saisies ne sont pas prises en compte par le backend");
      }
    },
    [resolveUpdateContext, detailState, refreshDetailsAfterIdentityUpdate],
  );

  const syncEntrepriseEnteredData = useCallback(
    async (showSuccessToast: boolean): Promise<void> => {
      const { customerId, enrollmentId, savedPhone, savedEmail } = resolveUpdateContext();
      const identityPayload = {
        ...buildEntrepriseIdentityPayload(detailState.validationForm),
        // Include contact data in the identity payload to verify backend support.
        phone: detailState.validationForm.phone || null,
        email: detailState.validationForm.email || null,
      };

      await updateCustomerIdentity(customerId, identityPayload);
      await refreshDetailsAfterIdentityUpdate(enrollmentId, savedPhone, savedEmail, showSuccessToast);
    },
    [resolveUpdateContext, detailState, refreshDetailsAfterIdentityUpdate],
  );

  const syncCommercantEnteredData = useCallback(
    async (showSuccessToast: boolean): Promise<void> => {
      const { customerId, enrollmentId, savedPhone, savedEmail } = resolveUpdateContext();
      const identityPayload = {
        ...buildCommercantIdentityPayload(detailState.validationForm),
        phone: detailState.validationForm.phone || null,
        email: detailState.validationForm.email || null,
      };

      await updateCustomerIdentity(customerId, identityPayload);
      await refreshDetailsAfterIdentityUpdate(enrollmentId, savedPhone, savedEmail, showSuccessToast);
    },
    [resolveUpdateContext, detailState, refreshDetailsAfterIdentityUpdate],
  );

  const getEnrollmentValidationBlockingError = useCallback(
    (enrollment: EnrollmentApplicationSchema, enrollmentCode: string): string | null => {
      if (!isPendingEnrollmentStatus(enrollment.status)) {
        return "Seul un enrôlement en attente peut être validé";
      }

      if (availableSubscriptions.length > 0 && !selectedSubscriptionId) {
        return "Veuillez choisir obligatoirement un abonnement pour cet enrôlement";
      }

      if (!enrollmentCode) {
        return "Le code enrôlement est obligatoire";
      }

      if (!alphanumericPattern.test(enrollmentCode)) {
        return "Le code enrôlement doit être alphanumérique";
      }

      return checkValidationFormAgainstSig();
    },
    [checkValidationFormAgainstSig, availableSubscriptions, selectedSubscriptionId],
  );

  const validateSelectedEnrollment = useCallback(async () => {
    if (!detailState.viewClient) {
      return;
    }

    const enrollmentCode = detailState.enrollmentCodeInput.trim();

    const blockingError = getEnrollmentValidationBlockingError(detailState.viewClient, enrollmentCode);
    if (blockingError) {
      toast.error(blockingError);
      return;
    }

    await runActionWithLoading(async () => {
      if (!detailState.viewClient) {
        return;
      }

      // Assigner l'abonnement si sélectionné
      if (selectedSubscriptionId) {
        await assignEnrollmentSubscription(detailState.viewClient.id, selectedSubscriptionId);
      }

      const updatedEnrollment = await validateEnrollment(detailState.viewClient.id, {
        enrollmentCode,
      });
      const normalizedStatus = normalizeEnrollmentStatus(updatedEnrollment.status);
      updateEnrollmentInList(updatedEnrollment);

      try {
        const refreshedDetails = await fetchEnrollmentDetails(updatedEnrollment.id);
        detailState.setViewClientDetails(refreshedDetails);
        hydrateValidationForm(refreshedDetails);
      } catch {
        // Ignore details refresh failure here; validation itself already succeeded.
      }

      if (isApprovedEnrollmentStatus(normalizedStatus)) {
        toast.success("Enrôlement validé et activé avec succès");
      } else if (isValidatedEnrollmentStatus(normalizedStatus)) {
        toast.success("Enrôlement validé avec succès");
      } else {
        toast.success(`Enrôlement traité avec succès (statut: ${updatedEnrollment.status || "inconnu"})`);
      }
      detailState.closeDetail(false);
    }, "Impossible de valider l'enrôlement");
  }, [
    detailState,
    selectedSubscriptionId,
    getEnrollmentValidationBlockingError,
    runActionWithLoading,
    updateEnrollmentInList,
    hydrateValidationForm,
  ]);

  const updatePendingEnteredData = useCallback(async () => {
    const blockingError = getPendingUpdateBlockingError(detailState.viewClient);
    if (hasBlockingError(blockingError)) {
      return;
    }

    await runActionWithLoading(async () => {
      if (detailState.viewClient?.clientType === "COMMERCANT" || detailState.viewClientDetails?.customer.clientType === "COMMERCANT") {
        await syncCommercantEnteredData(true);
      } else if (isBusinessEnrollment) {
        await syncEntrepriseEnteredData(true);
      } else {
        await syncParticulierEnteredData(true);
      }
    }, "Impossible de mettre à jour les données saisies");
  }, [
    detailState,
    hasBlockingError,
    isBusinessEnrollment,
    runActionWithLoading,
    syncCommercantEnteredData,
    syncEntrepriseEnteredData,
    syncParticulierEnteredData,
  ]);

  const deleteSelectedEnrollment = useCallback(async () => {
    const blockingError = getDeleteEnrollmentBlockingError(detailState.viewClient, {
      canUpdate: permissions.canUpdate,
      canDelete: permissions.canDelete,
    });
    if (hasBlockingError(blockingError)) {
      return;
    }

    await runActionWithLoading(async () => {
      if (!detailState.viewClient) {
        return;
      }

      await deleteEnrollment(detailState.viewClient.id);
      removeEnrollmentFromList(detailState.viewClient.id);
      detailState.closeDetail(false);
      toast.success("Enrôlement supprimé avec succès");
    }, "Impossible de supprimer l'enrôlement");
  }, [detailState, permissions, hasBlockingError, runActionWithLoading, removeEnrollmentFromList]);

  const deactivateSelectedEnrollment = useCallback(async () => {
    const blockingError = getUpdateActionBlockingError(
      detailState.viewClient,
      {
        canUpdate: permissions.canUpdate,
        canDelete: permissions.canDelete,
        canDeactivate: permissions.canDeactivate,
      },
      "deactivate",
    );
    if (hasBlockingError(blockingError)) {
      return;
    }

    await runActionWithLoading(async () => {
      if (!detailState.viewClient) {
        return;
      }

      const resolvedCustomerId = resolveCustomerId(detailState.viewClient);
      if (!resolvedCustomerId) {
        throw new Error("Identifiant client introuvable pour la désactivation");
      }

      const deactivationResult = await deactivateCustomer(resolvedCustomerId);
      const nextStatus = normalizeEnrollmentStatus(deactivationResult.status);
      if (!nextStatus) {
        throw new Error("Le backend n'a pas retourné de statut de désactivation");
      }

      // L'endpoint retourne un Customer schema, pas un Enrollment.
      // On projette son statut sur l'enrôlement affiché.
      const patchedEnrollment: EnrollmentApplicationSchema = {
        ...detailState.viewClient,
        status: nextStatus,
      };
      updateEnrollmentInList(patchedEnrollment);
      toast.success("Client désactivé avec succès");
    }, "Impossible de désactiver le client");
    }, [detailState, permissions, hasBlockingError, runActionWithLoading, resolveCustomerId, updateEnrollmentInList]);
  const unsubscribeSelectedEnrollment = useCallback(async () => {
    const blockingError = getUpdateActionBlockingError(
      detailState.viewClient,
      {
        canUpdate: permissions.canUpdate,
        canDelete: permissions.canDelete,
        canUnsubscribe: permissions.canUnsubscribe,
      },
      "unsubscribe",
    );
    if (hasBlockingError(blockingError)) {
      return;
    }

    await runActionWithLoading(async () => {
      if (!detailState.viewClient) {
        return;
      }

      const unsubscriptionResult = await unsubscribeEnrollment(detailState.viewClient.id);
      const nextStatus = normalizeEnrollmentStatus(unsubscriptionResult.status);
      const patchedEnrollment: EnrollmentApplicationSchema = {
        ...detailState.viewClient,
        status: unsubscriptionResult.status,
        referenceLink: unsubscriptionResult.referenceLink,
        rejectionReason: unsubscriptionResult.rejectionReason,
        updatedAt: unsubscriptionResult.updatedAt,
      };
      if (nextStatus) {
        setEnrollmentStatusOverride(detailState.viewClient.id, nextStatus);
      }
      updateEnrollmentInList(patchedEnrollment);
      toast.success("Demande de désinscription effectuée avec succès");
    }, "Impossible d'effectuer la désinscription");
    }, [detailState, permissions, hasBlockingError, runActionWithLoading, updateEnrollmentInList]);
  const confirmSelectedUnsubscription = useCallback(async () => {
    const blockingError = getUpdateActionBlockingError(
      detailState.viewClient,
      {
        canUpdate: permissions.canUpdate,
        canDelete: permissions.canDelete,
        canUnsubscribe: permissions.canUnsubscribe,
      },
      "confirm-unsubscribe",
    );
    if (hasBlockingError(blockingError)) {
      return;
    }

    await runActionWithLoading(async () => {
      if (!detailState.viewClient) {
        return;
      }

      const confirmationResult = await confirmUnsubscription(detailState.viewClient.id);
      const nextStatus = normalizeEnrollmentStatus(confirmationResult.status);
      const patchedEnrollment: EnrollmentApplicationSchema = {
        ...detailState.viewClient,
        status: confirmationResult.status,
        referenceLink: confirmationResult.referenceLink,
        rejectionReason: confirmationResult.rejectionReason,
        updatedAt: confirmationResult.updatedAt,
      };
      if (nextStatus) {
        setEnrollmentStatusOverride(detailState.viewClient.id, nextStatus);
      }
      updateEnrollmentInList(patchedEnrollment);
      toast.success("Désinscription validée avec succès");
      detailState.closeDetail(false);
    }, "Impossible de valider la désinscription");
  }, [detailState, permissions, hasBlockingError, runActionWithLoading, updateEnrollmentInList]);

  return {
    permissions,
    loading: listState.loading, error: listState.error,
    clients: listState.clients, filtered,
    hasActiveFilters,
    filterStatut: listState.filterStatut, setFilterStatut: listState.setFilterStatut,
    filterType: listState.filterType, setFilterType: listState.setFilterType,
    filterInstitution: listState.filterInstitution, setFilterInstitution: listState.setFilterInstitution,
    resetFilters: listState.resetSearchAndFilter,
    getEnrollmentExpiryDate,
    createDialogOpen: createState.createDialogOpen, setCreateDialogOpen: closeCreateEnrollment,
    createLoading: createState.createLoading,
    createForm: createState.createForm, setCreateForm: createState.setCreateForm,
    createFormErrors, clearCreateFormError, resetCreateFormErrors,
    openCreateEnrollment,
    submitCreateEnrollment,
    detailOpen: detailState.detailOpen, setDetailOpen: detailState.closeDetail,
    viewClient: detailState.viewClient, viewClientDetails: detailState.viewClientDetails, detailLoading: detailState.detailLoading,
    actionLoading: detailState.actionLoading,
    accountsLoading: couplageState.accountsLoading,
    enrollmentCodeInput: detailState.enrollmentCodeInput, setEnrollmentCodeInput: detailState.setEnrollmentCodeInput,
    couplageIdInput: couplageState.couplageIdInput, setCouplageIdInput: couplageState.setCouplageIdInput,
    couplageAccounts: couplageState.couplageAccounts,
    hasLoadedCouplageAccounts: couplageState.hasLoadedCouplageAccounts,
    validationForm: detailState.validationForm,
    setValidationForm: detailState.setValidationForm,
    correspondenceScore,
    detailStructureParams,
    initiationTabLabel,
    isMobileBanking,
    detailClientAction: detailState.detailClientAction,
    availableSubscriptions,
    selectedSubscriptionId,
    setSelectedSubscriptionId,
    isLoadingSubscriptions,
    hasStructureSubscriptions: availableSubscriptions.length > 0,
    canValidateCurrentEnrollment,
    canUnsubscribeCurrentEnrollment,
    canDeleteCurrentEnrollment,
    openDetail,
    generateCode,
    validateSelectedEnrollment,
    updatePendingEnteredData,
    deactivateSelectedEnrollment,
    unsubscribeSelectedEnrollment,
    confirmSelectedUnsubscription,
    deleteSelectedEnrollment,
  };
};
