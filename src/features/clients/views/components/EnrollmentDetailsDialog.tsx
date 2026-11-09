import DetailDialog from "@/shared/components/DetailDialog";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Gauge, ShieldCheck, UserRound, ListChecks, type LucideIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState, useMemo } from "react";
import {
  CouplageAccountSchema,
  CustomerEnrollmentDetailsResponseSchema,
  EnrollmentApplicationSchema,
} from "@/features/clients/models/types";
import EnrollmentActionsPanel from "./EnrollmentActionsPanel";
import {
  canEditEnrollmentCodeStatus,
  isPendingEnrollmentStatus,
} from "@/features/clients/models/enrollmentStatus";
import {
  useEnrollmentCorrespondenceScore,
  getStringSimilarity,
  normalizeForScore,
} from "@/features/clients/viewmodels/useEnrollmentCorrespondenceScore";
import { StructureParamsResponse } from "@/features/structure-params/models/types";
import { SubscriptionResponse } from "@/features/abonnements/models/types";

type SectionTitleProps = {
  asPage: boolean;
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
};

/** En-tête de section : style des fiches détail en page, libellé simple dans le dialogue. */
const SectionTitle = ({ asPage, icon: Icon, title, description, children }: SectionTitleProps) => {
  if (!asPage) {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground">{title}</p>
        {children}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/40">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-accent" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
};

type ReadOnlyItem = { label: string; value?: string | null; mono?: boolean };

/** Date ISO (AAAA-MM-JJ…) affichée au format JJ/MM/AAAA ; autre valeur renvoyée telle quelle. */
const formatDisplayDate = (value?: string | null): string => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value ?? "";
};

const normalizeDirtyValue = (value: string | null | undefined): string => (value ?? "").trim();

const hasParticulierFormChanged = (
  form: ParticulierEnteredFormState,
  initialForm: ParticulierEnteredFormState | null,
): boolean => {
  if (!initialForm) {
    return false;
  }

  const fields: Array<keyof ParticulierEnteredFormState> = [
    "lastName",
    "firstName",
    "phone",
    "email",
    "pieceType",
    "pieceNumber",
    "dateOfBirth",
    "deliveryDate",
    "expiryDate",
  ];

  return fields.some((field) => normalizeDirtyValue(form[field]) !== normalizeDirtyValue(initialForm[field]));
};

const hasEnterpriseFormChanged = (
  form: EnterpriseEnteredFormState,
  initialForm: EnterpriseEnteredFormState | null,
): boolean => {
  if (!initialForm) {
    return false;
  }

  const fields: Array<keyof EnterpriseEnteredFormState> = [
    "label",
    "phone",
    "email",
    "ninea",
    "fiscalIdentity",
  ];

  return fields.some((field) => normalizeDirtyValue(form[field]) !== normalizeDirtyValue(initialForm[field]));
};

type ValidationFormState = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  pieceType: string;
  pieceNumber: string;
  fiscalIdentity: string;
  phone: string;
  email: string;
  deliveryDate: string;
  expiryDate: string;
  ninea?: string;
  label?: string;
};

type CorrespondenceScore = {
  percentage: number;
  matched: number;
  total: number;
};

type EnterpriseEnteredFormState = {
  label: string;
  phone: string;
  email: string;
  ninea: string;
  fiscalIdentity: string;
};

type ParticulierEnteredFormState = {
  lastName: string;
  firstName: string;
  phone: string;
  email: string;
  pieceType: string;
  pieceNumber: string;
  dateOfBirth: string;
  deliveryDate: string;
  expiryDate: string;
};

type EnrollmentDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asPage?: boolean;
  detailLoading: boolean;
  viewClient: EnrollmentApplicationSchema | null;
  viewClientDetails: CustomerEnrollmentDetailsResponseSchema | null;
  correspondenceScore: CorrespondenceScore | null;
  detailStructureParams: StructureParamsResponse | null;
  initiationTabLabel: string;
  validationForm: ValidationFormState;
  onValidationFormChange: (next: ValidationFormState) => void;
  enrollmentCodeInput: string;
  actionLoading: boolean;
  accountsLoading: boolean;
  canUpdate: boolean;
  canGenerateCode: boolean;
  canValidateEnrollment: boolean;
  canDeactivateEnrollment: boolean;
  canUnsubscribeEnrollment: boolean;
  canConfirmUnsubscription: boolean;
  canDeleteEnrollment: boolean;
  hasLoadedCouplageAccounts: boolean;
  couplageAccounts: CouplageAccountSchema[];
  availableSubscriptions?: SubscriptionResponse[];
  selectedSubscriptionId?: string;
  isLoadingSubscriptions?: boolean;
  onSubscriptionChange?: (subscriptionId: string) => void;
  onEnrollmentCodeChange: (value: string) => void;
  onGenerateCode: () => void;
  onUpdateEnteredData: () => Promise<void>;
  onValidateEnrollment: () => void;
  onDeactivateEnrollment: () => void;
  onUnsubscribeEnrollment: () => void;
  onConfirmUnsubscription: () => void;
  onDeleteEnrollment: () => void;
};

const EnrollmentDetailsDialog = ({
  open,
  onOpenChange,
  asPage = false,
  detailLoading,
  viewClient,
  viewClientDetails,
  correspondenceScore,
  detailStructureParams,
  initiationTabLabel,
  validationForm,
  onValidationFormChange,
  enrollmentCodeInput,
  actionLoading,
  accountsLoading,
  canUpdate,
  canGenerateCode,
  canValidateEnrollment,
  canDeactivateEnrollment,
  canUnsubscribeEnrollment,
  canConfirmUnsubscription,
  canDeleteEnrollment,
  hasLoadedCouplageAccounts,
  couplageAccounts,
  availableSubscriptions = [],
  selectedSubscriptionId = "",
  isLoadingSubscriptions = false,
  onSubscriptionChange,
  onEnrollmentCodeChange,
  onGenerateCode,
  onUpdateEnteredData,
  onValidateEnrollment,
  onDeactivateEnrollment,
  onUnsubscribeEnrollment,
  onConfirmUnsubscription,
  onDeleteEnrollment,
}: EnrollmentDetailsDialogProps) => {
  const readOnlyInputClassName = "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none";
  const readOnlyDisplayInputProps = {
    readOnly: true,
    tabIndex: -1,
    className: readOnlyInputClassName,
    onMouseDown: (event: React.MouseEvent<HTMLInputElement>) => {
      event.preventDefault();
    },
    onFocus: (event: React.FocusEvent<HTMLInputElement>) => {
      event.currentTarget.blur();
    },
  };
  const copyableReadOnlyInputProps = {
    readOnly: true,
    className: `${readOnlyInputClassName} select-text`,
  };

  const initiationDetailsLabel =
    initiationTabLabel === "Entreprise"
      ? "Informations saisies de l'Entreprise"
      : initiationTabLabel === "Commerçant"
        ? "Informations saisies du Commerçant"
        : "Informations saisies du particulier";
  const sectionClassName = asPage ? "glass-card rounded-xl p-6 space-y-4" : "space-y-3 rounded-md border border-border p-3";
  const firstDocument = viewClientDetails?.documents?.[0];
  const enterpriseNinea = firstDocument?.type?.toUpperCase() === "NINEA"
    ? (firstDocument.uri?.replace(/^ninea:\/\//i, "") || "")
    : "";
  const documentNumberFromUri = firstDocument?.uri
    ? firstDocument.uri.split("://")[1] || firstDocument.uri
    : "";
  const isPending = isPendingEnrollmentStatus(viewClient?.status);
  // Une fois l'enrôlement traité, ce ne sont plus des « informations saisies » à vérifier
  const enteredDataTitle = isPending ? initiationDetailsLabel : "Informations du client";
  const showSigData = isPending && Boolean(viewClientDetails?.sibKyc);
  const enterpriseFieldProps = isPending ? {} : readOnlyDisplayInputProps;

  const [enterpriseEnteredForm, setEnterpriseEnteredForm] = useState<EnterpriseEnteredFormState>({
    label: "",
    phone: "",
    email: "",
    ninea: "",
    fiscalIdentity: "",
  });
  const [particulierEnteredForm, setParticulierEnteredForm] = useState<ParticulierEnteredFormState>({
    lastName: "",
    firstName: "",
    phone: "",
    email: "",
    pieceType: "",
    pieceNumber: "",
    dateOfBirth: "",
    deliveryDate: "",
    expiryDate: "",
  });
  const [initialParticulierForm, setInitialParticulierForm] = useState<ParticulierEnteredFormState | null>(null);
  const [initialEnterpriseForm, setInitialEnterpriseForm] = useState<EnterpriseEnteredFormState | null>(null);

  // Wrapper: reset les snapshots initiaux après une mise à jour réussie
  // pour que hasChanges repasse à false et que le bouton Valider réapparaisse.
  const handleUpdateEnteredData = async () => {
    await onUpdateEnteredData();
    setInitialParticulierForm(null);
    setInitialEnterpriseForm(null);
  };

  useEffect(() => {
    setInitialParticulierForm(null);
    setInitialEnterpriseForm(null);
  }, [viewClient?.id]);

  useEffect(() => {
    if (!viewClientDetails || (initiationTabLabel !== "Entreprise" && initiationTabLabel !== "Commerçant")) {
      return;
    }

    const nextEnterpriseForm: EnterpriseEnteredFormState = {
      label: initiationTabLabel === "Commerçant"
        ? (validationForm.label || viewClientDetails.identity.label || "")
        : (validationForm.firstName || ""),
      phone: viewClientDetails.customer.phone || "",
      email: viewClientDetails.customer.email || "",
      ninea: validationForm.ninea || viewClientDetails.identity.ninea || enterpriseNinea,
      fiscalIdentity: validationForm.fiscalIdentity || viewClientDetails.identity.fiscalIdentity || viewClientDetails.identity.nationalId || "",
    };

    setEnterpriseEnteredForm(nextEnterpriseForm);
    setInitialEnterpriseForm((previous) => previous ?? nextEnterpriseForm);
  }, [viewClientDetails, initiationTabLabel, enterpriseNinea, validationForm.firstName, validationForm.label, validationForm.ninea, validationForm.fiscalIdentity]);

  useEffect(() => {
    if (initiationTabLabel !== "Entreprise" && initiationTabLabel !== "Commerçant") {
      return;
    }

    setEnterpriseEnteredForm((previous) => ({
      ...previous,
      label: initiationTabLabel === "Commerçant"
        ? (validationForm.label || "")
        : (validationForm.firstName || ""),
      ninea: validationForm.ninea || previous.ninea,
      fiscalIdentity: validationForm.fiscalIdentity || previous.fiscalIdentity,
    }));
  }, [initiationTabLabel, validationForm.firstName, validationForm.label, validationForm.ninea, validationForm.fiscalIdentity]);

  useEffect(() => {
    if (!viewClientDetails || initiationTabLabel === "Entreprise") {
      return;
    }

    const nextParticulierForm: ParticulierEnteredFormState = {
      lastName: validationForm.lastName || "",
      firstName: validationForm.firstName || "",
      phone: validationForm.phone || viewClientDetails.customer.phone || "",
      email: validationForm.email || viewClientDetails.customer.email || "",
      pieceType: validationForm.pieceType || viewClientDetails.identity.documentType || firstDocument?.type || "",
      pieceNumber: validationForm.pieceNumber || viewClientDetails.identity.documentNumber || documentNumberFromUri,
      dateOfBirth: validationForm.dateOfBirth || "",
      deliveryDate: validationForm.deliveryDate || viewClientDetails.identity.deliveryDate || "",
      expiryDate: validationForm.expiryDate || viewClientDetails.identity.expiryDate || "",
    };

    setParticulierEnteredForm(nextParticulierForm);
    setInitialParticulierForm((previous) => previous ?? nextParticulierForm);
  }, [
    viewClientDetails,
    initiationTabLabel,
    firstDocument?.type,
    documentNumberFromUri,
    validationForm.lastName,
    validationForm.firstName,
    validationForm.pieceType,
    validationForm.pieceNumber,
    validationForm.dateOfBirth,
    validationForm.phone,
    validationForm.email,
    validationForm.deliveryDate,
    validationForm.expiryDate,
  ]);

  useEffect(() => {
    if (initiationTabLabel === "Entreprise") {
      return;
    }

    setParticulierEnteredForm((previous) => ({
      ...previous,
      lastName: validationForm.lastName || "",
      firstName: validationForm.firstName || "",
      pieceType: validationForm.pieceType || previous.pieceType,
      pieceNumber: validationForm.pieceNumber || previous.pieceNumber,
      dateOfBirth: validationForm.dateOfBirth || "",
      phone: validationForm.phone || previous.phone,
      email: validationForm.email || previous.email,
      deliveryDate: validationForm.deliveryDate || previous.deliveryDate,
      expiryDate: validationForm.expiryDate || previous.expiryDate,
    }));
  }, [
    initiationTabLabel,
    validationForm.lastName,
    validationForm.firstName,
    validationForm.pieceType,
    validationForm.pieceNumber,
    validationForm.dateOfBirth,
    validationForm.phone,
    validationForm.email,
    validationForm.deliveryDate,
    validationForm.expiryDate,
  ]);

  const isEntreprise = initiationTabLabel === "Entreprise";

  const computedPendingScore = useEnrollmentCorrespondenceScore(
    isPending,
    isEntreprise,
    viewClientDetails,
    enterpriseEnteredForm,
    particulierEnteredForm,
    correspondenceScore,
    detailStructureParams,
  );

  const mismatchFlags = useMemo(() => {
    if (!showSigData || !viewClientDetails?.sibKyc) {
      return {
        lastName: false,
        firstName: false,
        dateOfBirth: false,
        label: false,
        ninea: false,
        fiscalIdentity: false,
      };
    }

    const sig = viewClientDetails.sibKyc;

    // Nom (lastName)
    let lastNameMismatch = false;
    if (detailStructureParams?.kyc_match_nom_pct !== null && detailStructureParams?.kyc_match_nom_pct !== undefined) {
      const sim = getStringSimilarity(particulierEnteredForm.lastName, sig.lastName || "");
      lastNameMismatch = sim < detailStructureParams.kyc_match_nom_pct;
    }

    // Prénom (firstName)
    let firstNameMismatch = false;
    if (detailStructureParams?.kyc_match_prenom_pct !== null && detailStructureParams?.kyc_match_prenom_pct !== undefined) {
      const sim = getStringSimilarity(particulierEnteredForm.firstName, sig.firstName || "");
      firstNameMismatch = sim < detailStructureParams.kyc_match_prenom_pct;
    }

    // Date de naissance
    let dateOfBirthMismatch = false;
    if (detailStructureParams?.kyc_match_date_naissance_pct !== null && detailStructureParams?.kyc_match_date_naissance_pct !== undefined) {
      const birthMatch = particulierEnteredForm.dateOfBirth === sig.dateOfBirth;
      dateOfBirthMismatch = (birthMatch ? 100 : 0) < detailStructureParams.kyc_match_date_naissance_pct;
    }

    // Label / Dénomination (Enterprise/Commerçant)
    let labelMismatch = false;
    if (detailStructureParams?.kyc_match_libelle_pct !== null && detailStructureParams?.kyc_match_libelle_pct !== undefined) {
      const targetSigLabel = sig.label || sig.firstName || sig.lastName || "";
      const sim = getStringSimilarity(enterpriseEnteredForm.label, targetSigLabel);
      labelMismatch = sim < detailStructureParams.kyc_match_libelle_pct;
    }

    // Ninea (Enterprise/Commerçant)
    let nineaMismatch = false;
    if (detailStructureParams?.kyc_match_ninea_pct !== null && detailStructureParams?.kyc_match_ninea_pct !== undefined) {
      const targetSigNinea = sig.ninea || sig.idNumber || sig.nationalId || "";
      const sim = getStringSimilarity(enterpriseEnteredForm.ninea, targetSigNinea);
      nineaMismatch = sim < detailStructureParams.kyc_match_ninea_pct;
    }

    // Fiscal Identity / NIF (Enterprise/Commerçant)
    let fiscalIdentityMismatch = false;
    if (detailStructureParams?.kyc_match_num_identite_fiscale_pct !== null && detailStructureParams?.kyc_match_num_identite_fiscale_pct !== undefined) {
      const targetSigNif = sig.fiscalIdentity || sig.nationalId || sig.idNumber || "";
      const sim = getStringSimilarity(enterpriseEnteredForm.fiscalIdentity, targetSigNif);
      fiscalIdentityMismatch = sim < detailStructureParams.kyc_match_num_identite_fiscale_pct;
    }

    return {
      lastName: lastNameMismatch,
      firstName: firstNameMismatch,
      dateOfBirth: dateOfBirthMismatch,
      label: labelMismatch,
      ninea: nineaMismatch,
      fiscalIdentity: fiscalIdentityMismatch,
    };
  }, [
    showSigData,
    viewClientDetails,
    detailStructureParams,
    particulierEnteredForm,
    enterpriseEnteredForm,
  ]);

  const hasParticulierChanges = hasParticulierFormChanged(particulierEnteredForm, initialParticulierForm);
  const hasEnterpriseChanges = hasEnterpriseFormChanged(enterpriseEnteredForm, initialEnterpriseForm);
  const hasChanges = initiationTabLabel === "Commerçant"
    ? (hasParticulierChanges || hasEnterpriseChanges)
    : initiationTabLabel === "Entreprise"
      ? hasEnterpriseChanges
      : hasParticulierChanges;

  const showUpdateEnteredDataButton = isPending;

  const particulierFieldProps = isPending ? {} : readOnlyDisplayInputProps;
  const mismatchInputClassName = "border-destructive/70 bg-destructive/5 text-destructive dark:bg-destructive/10 focus-visible:ring-destructive";

  let enteredDataContent = null;

  if (initiationTabLabel === "Commerçant") {
    enteredDataContent = (
      <div className={asPage ? `${sectionClassName} space-y-5` : "space-y-4 rounded-md border border-border p-3"}>
        <SectionTitle
          asPage={asPage}
          icon={UserRound}
          title={enteredDataTitle}
          description={isPending ? "Données renseignées lors de la demande, modifiables avant validation" : undefined}
        >
          {showUpdateEnteredDataButton && (
            <Button
              size="sm"
              onClick={handleUpdateEnteredData}
              disabled={actionLoading || !hasChanges}
              className={`gradient-accent text-accent-foreground font-semibold shadow-md transition-all duration-300 transform active:scale-95 flex items-center gap-1.5 px-4 h-9 rounded-lg text-xs border border-accent/20 ${
                !hasChanges ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5"
              }`}
            >
              {actionLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Mettre à jour
            </Button>
          )}
        </SectionTitle>

        {/* Section 1: Informations Personnelles */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground/80 border-b border-border/40 pb-1">Informations personnelles</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input
                value={particulierEnteredForm.lastName}
                readOnly={!isPending}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setParticulierEnteredForm((previous) => ({ ...previous, lastName: nextValue }));
                  onValidationFormChange({
                    ...validationForm,
                    lastName: nextValue,
                  });
                }}
                className={mismatchFlags.lastName ? mismatchInputClassName : ""}
                {...particulierFieldProps}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prénom</Label>
              <Input
                value={particulierEnteredForm.firstName}
                readOnly={!isPending}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setParticulierEnteredForm((previous) => ({ ...previous, firstName: nextValue }));
                  onValidationFormChange({
                    ...validationForm,
                    firstName: nextValue,
                  });
                }}
                className={mismatchFlags.firstName ? mismatchInputClassName : ""}
                {...particulierFieldProps}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date de naissance</Label>
              <Input
                type="date"
                value={particulierEnteredForm.dateOfBirth}
                readOnly={!isPending}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setParticulierEnteredForm((previous) => ({ ...previous, dateOfBirth: nextValue }));
                  onValidationFormChange({
                    ...validationForm,
                    dateOfBirth: nextValue,
                  });
                }}
                className={mismatchFlags.dateOfBirth ? mismatchInputClassName : ""}
                {...particulierFieldProps}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input
                value={particulierEnteredForm.phone}
                {...readOnlyDisplayInputProps}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Adresse mail</Label>
              <Input
                value={particulierEnteredForm.email}
                {...readOnlyDisplayInputProps}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Pièce d'identité */}
        <div className="space-y-3 pt-2">
          <p className="text-xs font-semibold text-foreground/80 border-b border-border/40 pb-1">Pièce d'identité</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type de document</Label>
              <Input value={particulierEnteredForm.pieceType} {...readOnlyDisplayInputProps} />
            </div>
            <div className="space-y-1.5">
              <Label>Numéro de document</Label>
              <Input
                value={particulierEnteredForm.pieceNumber}
                {...readOnlyDisplayInputProps}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date de délivrance</Label>
              <Input
                type="date"
                value={particulierEnteredForm.deliveryDate}
                {...readOnlyDisplayInputProps}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date d'expiration</Label>
              <Input
                type="date"
                value={particulierEnteredForm.expiryDate}
                {...readOnlyDisplayInputProps}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Informations professionnelles */}
        <div className="space-y-3 pt-2">
          <p className="text-xs font-semibold text-foreground/80 border-b border-border/40 pb-1">Informations professionnelles</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Dénomination commerciale (Libellé)</Label>
              <Input
                value={enterpriseEnteredForm.label}
                readOnly={!isPending}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setEnterpriseEnteredForm((previous) => ({ ...previous, label: nextValue }));
                  onValidationFormChange({
                    ...validationForm,
                    label: nextValue,
                  });
                }}
                className={mismatchFlags.label ? mismatchInputClassName : ""}
                {...enterpriseFieldProps}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ninea</Label>
              <Input
                value={enterpriseEnteredForm.ninea}
                readOnly={!isPending}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setEnterpriseEnteredForm((previous) => ({ ...previous, ninea: nextValue }));
                  onValidationFormChange({
                    ...validationForm,
                    ninea: nextValue,
                  });
                }}
                className={mismatchFlags.ninea ? mismatchInputClassName : ""}
                {...enterpriseFieldProps}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Numéro d'identité fiscale (NIF)</Label>
              <Input
                value={enterpriseEnteredForm.fiscalIdentity}
                readOnly={!isPending}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setEnterpriseEnteredForm((previous) => ({ ...previous, fiscalIdentity: nextValue }));
                  onValidationFormChange({
                    ...validationForm,
                    fiscalIdentity: nextValue,
                  });
                }}
                className={mismatchFlags.fiscalIdentity ? mismatchInputClassName : ""}
                {...enterpriseFieldProps}
              />
            </div>
          </div>
        </div>
      </div>
    );
  } else if (initiationTabLabel === "Entreprise") {
    enteredDataContent = (
    <div className={sectionClassName}>
      <SectionTitle
        asPage={asPage}
        icon={UserRound}
        title={enteredDataTitle}
        description={isPending ? "Données renseignées lors de la demande, modifiables avant validation" : undefined}
      >
        {showUpdateEnteredDataButton && (
          <Button
            size="sm"
            onClick={handleUpdateEnteredData}
            disabled={actionLoading || !hasChanges}
            className={`gradient-accent text-accent-foreground font-semibold shadow-md transition-all duration-300 transform active:scale-95 flex items-center gap-1.5 px-4 h-9 rounded-lg text-xs border border-accent/20 ${
              !hasChanges ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5"
            }`}
          >
            {actionLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Mettre à jour
          </Button>
        )}
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Éditable : concerné par le score */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Libellé</Label>
          <Input
            value={enterpriseEnteredForm.label}
            readOnly={!isPending}
            onChange={(event) => {
              const nextValue = event.target.value;
              setEnterpriseEnteredForm((previous) => ({ ...previous, label: nextValue }));
              onValidationFormChange({
                ...validationForm,
                firstName: nextValue,
                lastName: "Entreprise",
              });
            }}
            className={mismatchFlags.label ? mismatchInputClassName : ""}
            {...enterpriseFieldProps}
          />
        </div>
        {/* Lecture seule : non concerné par le score */}
        <div className="space-y-1.5">
          <Label>Téléphone</Label>
          <Input
            value={enterpriseEnteredForm.phone}
            {...readOnlyDisplayInputProps}
          />
        </div>
        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input
            value={enterpriseEnteredForm.email}
            {...readOnlyDisplayInputProps}
          />
        </div>
        {/* Éditable : concerné par le score */}
        <div className="space-y-1.5">
          <Label>Ninea</Label>
          <Input
            value={enterpriseEnteredForm.ninea}
            readOnly={!isPending}
            onChange={(event) => {
              const nextValue = event.target.value;
              setEnterpriseEnteredForm((previous) => ({ ...previous, ninea: nextValue }));
              onValidationFormChange({
                ...validationForm,
                pieceType: "NINEA",
                pieceNumber: nextValue,
              });
            }}
            className={mismatchFlags.ninea ? mismatchInputClassName : ""}
            {...enterpriseFieldProps}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Numéro d'identité fiscale</Label>
          <Input
            value={enterpriseEnteredForm.fiscalIdentity}
            readOnly={!isPending}
            onChange={(event) => {
              const nextValue = event.target.value;
              setEnterpriseEnteredForm((previous) => ({ ...previous, fiscalIdentity: nextValue }));
              onValidationFormChange({
                ...validationForm,
                fiscalIdentity: nextValue,
              });
            }}
            className={mismatchFlags.fiscalIdentity ? mismatchInputClassName : ""}
            {...enterpriseFieldProps}
          />
        </div>
      </div>
    </div>
  );
} else {
  enteredDataContent = (
    <div className={sectionClassName}>
      <SectionTitle
        asPage={asPage}
        icon={UserRound}
        title={enteredDataTitle}
        description={isPending ? "Données renseignées lors de la demande, modifiables avant validation" : undefined}
      >
        {showUpdateEnteredDataButton && (
          <Button
            size="sm"
            onClick={handleUpdateEnteredData}
            disabled={actionLoading || !hasChanges}
            className={`gradient-accent text-accent-foreground font-semibold shadow-md transition-all duration-300 transform active:scale-95 flex items-center gap-1.5 px-4 h-9 rounded-lg text-xs border border-accent/20 ${
              !hasChanges ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5"
            }`}
          >
            {actionLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Mettre à jour
          </Button>
        )}
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Éditables : concernés par le score */}
        <div className="space-y-1.5">
          <Label>Nom</Label>
          <Input
            value={particulierEnteredForm.lastName}
            readOnly={!isPending}
            onChange={(event) => {
              const nextValue = event.target.value;
              setParticulierEnteredForm((previous) => ({ ...previous, lastName: nextValue }));
              onValidationFormChange({
                ...validationForm,
                lastName: nextValue,
              });
            }}
            className={mismatchFlags.lastName ? mismatchInputClassName : ""}
            {...particulierFieldProps}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Prénom</Label>
          <Input
            value={particulierEnteredForm.firstName}
            readOnly={!isPending}
            onChange={(event) => {
              const nextValue = event.target.value;
              setParticulierEnteredForm((previous) => ({ ...previous, firstName: nextValue }));
              onValidationFormChange({
                ...validationForm,
                firstName: nextValue,
              });
            }}
            className={mismatchFlags.firstName ? mismatchInputClassName : ""}
            {...particulierFieldProps}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Date de naissance</Label>
          <Input
            type="date"
            value={particulierEnteredForm.dateOfBirth}
            readOnly={!isPending}
            onChange={(event) => {
              const nextValue = event.target.value;
              setParticulierEnteredForm((previous) => ({ ...previous, dateOfBirth: nextValue }));
              onValidationFormChange({
                ...validationForm,
                dateOfBirth: nextValue,
              });
            }}
            className={mismatchFlags.dateOfBirth ? mismatchInputClassName : ""}
            {...particulierFieldProps}
          />
        </div>
        {/* Lecture seule : non concernés par le score */}
        <div className="space-y-1.5">
          <Label>Téléphone</Label>
          <Input
            value={particulierEnteredForm.phone}
            {...readOnlyDisplayInputProps}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Adresse mail</Label>
          <Input
            value={particulierEnteredForm.email}
            {...readOnlyDisplayInputProps}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Type de document</Label>
          <Input value={particulierEnteredForm.pieceType} {...readOnlyDisplayInputProps} />
        </div>
        <div className="space-y-1.5">
          <Label>Numéro de document</Label>
          <Input
            value={particulierEnteredForm.pieceNumber}
            {...readOnlyDisplayInputProps}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Date de délivrance</Label>
          <Input
            type="date"
            value={particulierEnteredForm.deliveryDate}
            {...readOnlyDisplayInputProps}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Date d'expiration</Label>
          <Input
            type="date"
            value={particulierEnteredForm.expiryDate}
            {...readOnlyDisplayInputProps}
          />
        </div>
      </div>
    </div>
  );
}

  // Enrôlement traité : simple consultation, les valeurs sont affichées comme du texte et non comme des champs
  if (!isPending) {
    const personalItems: ReadOnlyItem[] = [
      { label: "Nom", value: particulierEnteredForm.lastName },
      { label: "Prénom", value: particulierEnteredForm.firstName },
      { label: "Date de naissance", value: formatDisplayDate(particulierEnteredForm.dateOfBirth) },
      { label: "Téléphone", value: particulierEnteredForm.phone, mono: true },
      { label: "Adresse mail", value: particulierEnteredForm.email },
    ];
    const documentItems: ReadOnlyItem[] = [
      { label: "Type de document", value: particulierEnteredForm.pieceType },
      { label: "Numéro de document", value: particulierEnteredForm.pieceNumber, mono: true },
      { label: "Date de délivrance", value: formatDisplayDate(particulierEnteredForm.deliveryDate) },
      { label: "Date d'expiration", value: formatDisplayDate(particulierEnteredForm.expiryDate) },
    ];
    const professionalItems: ReadOnlyItem[] = [
      { label: initiationTabLabel === "Entreprise" ? "Libellé" : "Dénomination commerciale", value: enterpriseEnteredForm.label },
      { label: "Ninea", value: enterpriseEnteredForm.ninea, mono: true },
      { label: "Numéro d'identité fiscale (NIF)", value: enterpriseEnteredForm.fiscalIdentity, mono: true },
    ];
    const enterpriseContactItems: ReadOnlyItem[] = [
      { label: "Téléphone", value: enterpriseEnteredForm.phone, mono: true },
      { label: "E-mail", value: enterpriseEnteredForm.email },
    ];

    let groups: Array<{ title?: string; items: ReadOnlyItem[] }>;
    if (initiationTabLabel === "Entreprise") {
      groups = [{ items: [...professionalItems, ...enterpriseContactItems] }];
    } else if (initiationTabLabel === "Commerçant") {
      groups = [
        { title: "Informations personnelles", items: personalItems },
        { title: "Pièce d'identité", items: documentItems },
        { title: "Informations professionnelles", items: professionalItems },
      ];
    } else {
      groups = [
        { title: "Informations personnelles", items: personalItems },
        { title: "Pièce d'identité", items: documentItems },
      ];
    }

    enteredDataContent = (
      <div className={sectionClassName}>
        <SectionTitle asPage={asPage} icon={UserRound} title={enteredDataTitle} />
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.title ?? "infos"} className="space-y-3">
              {group.title && (
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</p>
              )}
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                {group.items.map((item) => (
                  <div key={item.label} className="space-y-1 min-w-0">
                    <dt className="text-xs text-muted-foreground font-medium">{item.label}</dt>
                    <dd className={`text-sm font-semibold text-foreground break-words ${item.mono ? "font-mono" : ""}`}>
                      {item.value?.trim() || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const content = (
    <>
        {detailLoading && (
          <div className="py-10 flex items-center justify-center">
            <output
              className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin"
              aria-label="Chargement"
            />
          </div>
        )}
        {viewClient && viewClientDetails && !detailLoading && (
          <div className={asPage ? "space-y-6 text-sm" : "space-y-4 text-sm"}>
            {isPending && (
              <div className={sectionClassName}>
                <SectionTitle
                  asPage={asPage}
                  icon={Gauge}
                  title="Score de correspondance"
                  description={asPage ? "Concordance entre les informations saisies et les données SIG" : undefined}
                >
                  <p className={asPage ? "text-lg font-bold text-foreground" : "font-medium"}>
                    {computedPendingScore
                      ? `${computedPendingScore.percentage}% (${computedPendingScore.matched}/${computedPendingScore.total})`
                      : "Non disponible"}
                  </p>
                </SectionTitle>
                {computedPendingScore ? (
                  <Progress value={computedPendingScore.percentage} />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Les données SIG ne sont pas encore disponibles pour cet enrôlement.
                  </p>
                )}
              </div>
            )}

            {(() => {
              if (!showSigData || !viewClientDetails?.sibKyc) {
                return enteredDataContent;
              }

              const sigDataContent = initiationTabLabel === "Commerçant" ? (
                <div className={asPage ? `${sectionClassName} space-y-5` : "space-y-4 rounded-md border border-border p-3"}>
                  <SectionTitle asPage={asPage} icon={ShieldCheck} title="Données SIG" description="Données de référence comparées aux informations saisies" />

                  {/* Section 1: Informations Personnelles */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-foreground/80 border-b border-border/40 pb-1">Informations personnelles</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Nom</Label>
                        <Input
                          value={viewClientDetails.sibKyc.lastName || ""}
                          {...copyableReadOnlyInputProps}
                          className={`${copyableReadOnlyInputProps.className} ${mismatchFlags.lastName ? mismatchInputClassName : ""}`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Prénom</Label>
                        <Input
                          value={viewClientDetails.sibKyc.firstName || ""}
                          {...copyableReadOnlyInputProps}
                          className={`${copyableReadOnlyInputProps.className} ${mismatchFlags.firstName ? mismatchInputClassName : ""}`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Date de naissance</Label>
                        <Input
                          type="date"
                          value={viewClientDetails.sibKyc.dateOfBirth || ""}
                          {...copyableReadOnlyInputProps}
                          className={`${copyableReadOnlyInputProps.className} ${mismatchFlags.dateOfBirth ? mismatchInputClassName : ""}`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Téléphone</Label>
                        <Input value={viewClientDetails.sibKyc.phone || ""} {...copyableReadOnlyInputProps} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Adresse mail</Label>
                        <Input value={viewClientDetails.sibKyc.email || ""} {...copyableReadOnlyInputProps} />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Pièce d'identité */}
                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-semibold text-foreground/80 border-b border-border/40 pb-1">Pièce d'identité</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Type de document</Label>
                        <Input value={viewClientDetails.sibKyc.idType || ""} {...copyableReadOnlyInputProps} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Numéro de document</Label>
                        <Input value={viewClientDetails.sibKyc.idNumber || ""} {...copyableReadOnlyInputProps} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Date de délivrance</Label>
                        <Input type="date" value={viewClientDetails.sibKyc.issueDate || ""} {...copyableReadOnlyInputProps} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Date d'expiration</Label>
                        <Input type="date" value={viewClientDetails.sibKyc.expiryDate || ""} {...copyableReadOnlyInputProps} />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Informations professionnelles */}
                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-semibold text-foreground/80 border-b border-border/40 pb-1">Informations professionnelles</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Dénomination commerciale (Libellé)</Label>
                        <Input
                          value={viewClientDetails.sibKyc.label || ""}
                          {...copyableReadOnlyInputProps}
                          className={`${copyableReadOnlyInputProps.className} ${mismatchFlags.label ? mismatchInputClassName : ""}`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Ninea</Label>
                        <Input
                          value={viewClientDetails.sibKyc.ninea || ""}
                          {...copyableReadOnlyInputProps}
                          className={`${copyableReadOnlyInputProps.className} ${mismatchFlags.ninea ? mismatchInputClassName : ""}`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Numéro d'identité fiscale (NIF)</Label>
                        <Input
                          value={viewClientDetails.sibKyc.fiscalIdentity || ""}
                          {...copyableReadOnlyInputProps}
                          className={`${copyableReadOnlyInputProps.className} ${mismatchFlags.fiscalIdentity ? mismatchInputClassName : ""}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={sectionClassName}>
                  <SectionTitle asPage={asPage} icon={ShieldCheck} title="Données SIG" description="Données de référence comparées aux informations saisies" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Nom</Label>
                      <Input
                        value={viewClientDetails.sibKyc.lastName || ""}
                        {...copyableReadOnlyInputProps}
                        className={`${copyableReadOnlyInputProps.className} ${mismatchFlags.lastName ? mismatchInputClassName : ""}`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Prénom</Label>
                      <Input
                        value={viewClientDetails.sibKyc.firstName || ""}
                        {...copyableReadOnlyInputProps}
                        className={`${copyableReadOnlyInputProps.className} ${mismatchFlags.firstName ? mismatchInputClassName : ""}`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Téléphone</Label>
                      <Input value={viewClientDetails.sibKyc.phone || ""} {...copyableReadOnlyInputProps} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Adresse mail</Label>
                      <Input value={viewClientDetails.sibKyc.email || ""} {...copyableReadOnlyInputProps} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Type de pièce</Label>
                      <Input value={viewClientDetails.sibKyc.idType || ""} {...copyableReadOnlyInputProps} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Numéro pièce</Label>
                      <Input value={viewClientDetails.sibKyc.idNumber || ""} {...copyableReadOnlyInputProps} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Date de naissance</Label>
                      <Input
                        type="date"
                        value={viewClientDetails.sibKyc.dateOfBirth || ""}
                        {...copyableReadOnlyInputProps}
                        className={`${copyableReadOnlyInputProps.className} ${mismatchFlags.dateOfBirth ? mismatchInputClassName : ""}`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Date de délivrance</Label>
                      <Input type="date" value={viewClientDetails.sibKyc.issueDate || ""} {...copyableReadOnlyInputProps} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Date d'expiration</Label>
                      <Input type="date" value={viewClientDetails.sibKyc.expiryDate || ""} {...copyableReadOnlyInputProps} />
                    </div>
                    {(initiationTabLabel === "Entreprise" || initiationTabLabel === "Commerçant") && (
                      <>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label>Dénomination commerciale (Libellé)</Label>
                          <Input
                            value={viewClientDetails.sibKyc.label || ""}
                            {...copyableReadOnlyInputProps}
                            className={`${copyableReadOnlyInputProps.className} ${mismatchFlags.label ? mismatchInputClassName : ""}`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Ninea</Label>
                          <Input
                            value={viewClientDetails.sibKyc.ninea || ""}
                            {...copyableReadOnlyInputProps}
                            className={`${copyableReadOnlyInputProps.className} ${mismatchFlags.ninea ? mismatchInputClassName : ""}`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Numéro d'identité fiscale (NIF)</Label>
                          <Input
                            value={viewClientDetails.sibKyc.fiscalIdentity || ""}
                            {...copyableReadOnlyInputProps}
                            className={`${copyableReadOnlyInputProps.className} ${mismatchFlags.fiscalIdentity ? mismatchInputClassName : ""}`}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );

              return (
                <div className={`grid grid-cols-1 lg:grid-cols-2 ${asPage ? "gap-6" : "gap-3"}`}>
                  {enteredDataContent}
                  {sigDataContent}
                </div>
              );
            })()}

            {(isPending || canUnsubscribeEnrollment || canConfirmUnsubscription) && (
              <div className={asPage ? sectionClassName : undefined}>
              {asPage && (
                <SectionTitle
                  asPage
                  icon={ListChecks}
                  title="Actions"
                  description={isPending ? "Code d'enrôlement saisi par le client, abonnement et validation" : undefined}
                />
              )}
              <EnrollmentActionsPanel
                showEnrollmentCodeInput={isPending}
                enrollmentCodeInput={enrollmentCodeInput}
                canEditEnrollmentCode={canEditEnrollmentCodeStatus(viewClient.status)}
                actionLoading={actionLoading}
                accountsLoading={accountsLoading}
                canGenerateCode={canGenerateCode}
                canGenerateEnrollment={isPending}
                canValidateEnrollment={
                  canValidateEnrollment &&
                  (!computedPendingScore || computedPendingScore.matched === computedPendingScore.total)
                }
                isValidateDisabled={
                  hasChanges ||
                  Boolean(isPending && availableSubscriptions && availableSubscriptions.length > 0 && !selectedSubscriptionId)
                }
                canDeactivateEnrollment={canDeactivateEnrollment}
                canUnsubscribeEnrollment={canUnsubscribeEnrollment}
                canConfirmUnsubscription={canConfirmUnsubscription}
                canDeleteEnrollment={canDeleteEnrollment}
                hasLoadedCouplageAccounts={hasLoadedCouplageAccounts}
                couplageAccounts={couplageAccounts}
                availableSubscriptions={availableSubscriptions}
                selectedSubscriptionId={selectedSubscriptionId}
                isLoadingSubscriptions={isLoadingSubscriptions}
                onSubscriptionChange={onSubscriptionChange}
                onEnrollmentCodeChange={onEnrollmentCodeChange}
                onGenerateCode={onGenerateCode}
                onValidateEnrollment={onValidateEnrollment}
                onDeactivateEnrollment={onDeactivateEnrollment}
                onUnsubscribeEnrollment={onUnsubscribeEnrollment}
                onConfirmUnsubscription={onConfirmUnsubscription}
                onDeleteEnrollment={onDeleteEnrollment}
              />
              </div>
            )}
          </div>
        )}
    </>
  );

  if (asPage) {
    return content;
  }

  return (
    <DetailDialog open={open} onOpenChange={onOpenChange} title="Détails enrôlement" contentClassName="max-w-4xl">
      {content}
    </DetailDialog>
  );
};

export default EnrollmentDetailsDialog;
