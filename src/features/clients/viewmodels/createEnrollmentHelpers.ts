import { EnrollmentApplicationCreateSchema } from "../models/types";

export type EnrollmentFormState = {
  type: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  codeClient: string;
  typePiece: string;
  numeroPiece: string;
  dateNaissance: string;
  dateDelivrance: string;
  dateExpiration: string;
  libelleEntreprise: string;
  ninea: string;
  numeroIdentiteFiscale: string;
};

export const emptyEnrollmentForm: EnrollmentFormState = {
  type: "PARTICULIER",
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

const alphaPattern = /^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/;
const alphanumericPattern = /^[A-Za-z0-9]+$/;
const numericPattern = /^\d+$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const diacriticPattern = /[\u0300-\u036f]/u;
const apostropheOrSeparatorPattern = /[’'_-]/u;

const toDateOnly = (value: string): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const normalizeCompareValue = (value: string): string =>
  Array.from(value.normalize("NFD"))
    .filter((char) => !diacriticPattern.test(char))
    .join("")
    .trim()
    .toLowerCase();

export const normalizeDocumentTypeForComparison = (value: string): string => {
  const normalized = normalizeCompareValue(value)
    .split("")
    .map((char) => (apostropheOrSeparatorPattern.test(char) ? " " : char))
    .join("")
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .join(" ")
    .trim();

  if (!normalized) {
    return "";
  }

  if (
    normalized === "cni"
    || normalized === "carte nationale d identite"
    || normalized === "national identity card"
    || normalized === "national id"
    || normalized === "id card"
  ) {
    return "cni";
  }

  if (normalized === "passport" || normalized === "passeport") {
    return "passport";
  }

  if (normalized === "ninea" || normalized === "ninea number") {
    return "ninea";
  }

  return normalized;
};

export type EnrollmentFormField = Exclude<keyof EnrollmentFormState, "type">;
export type EnrollmentFormErrors = Partial<Record<EnrollmentFormField, string>>;

const checkRequired = (
  errors: EnrollmentFormErrors,
  field: EnrollmentFormField,
  value: string,
  requiredMessage: string,
  pattern?: RegExp,
  patternMessage?: string,
) => {
  const trimmed = value.trim();
  if (!trimmed) errors[field] = requiredMessage;
  else if (pattern && patternMessage && !pattern.test(trimmed)) errors[field] = patternMessage;
};

const checkEmail = (errors: EnrollmentFormErrors, value: string) =>
  checkRequired(errors, "email", value, "L'adresse e-mail est obligatoire", emailPattern, "L'adresse e-mail doit être au format valide");

const checkTelephone = (errors: EnrollmentFormErrors, value: string) =>
  checkRequired(errors, "telephone", value, "Le téléphone est obligatoire", numericPattern, "Le téléphone doit être numérique");

const checkCodeClient = (errors: EnrollmentFormErrors, value: string) =>
  checkRequired(errors, "codeClient", value, "Le code client est obligatoire", alphanumericPattern, "Le code client doit être alphanumérique");

const checkCompanyIds = (errors: EnrollmentFormErrors, form: EnrollmentFormState) => {
  checkRequired(errors, "ninea", form.ninea, "Le Ninea est obligatoire", alphanumericPattern, "Le Ninea doit être alphanumérique");
  checkRequired(
    errors,
    "numeroIdentiteFiscale",
    form.numeroIdentiteFiscale,
    "Le numéro d'identité fiscale est obligatoire",
    alphanumericPattern,
    "Le numéro d'identité fiscale doit être alphanumérique",
  );
};

/** Pièce d'identité et dates (particulier, commerçant) : présence, format, majorité et cohérence des dates. */
const checkIdentityDocument = (
  errors: EnrollmentFormErrors,
  form: EnrollmentFormState,
  adultMessage: string,
  numeroPiecePattern?: RegExp,
) => {
  if (!form.typePiece.trim()) errors.typePiece = "Le type de pièce est obligatoire";
  checkRequired(
    errors,
    "numeroPiece",
    form.numeroPiece,
    "Le numéro de pièce est obligatoire",
    numeroPiecePattern,
    "Le numéro de pièce doit être alphanumérique",
  );

  const today = new Date();
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dates: Array<[EnrollmentFormField, string, string]> = [
    ["dateNaissance", form.dateNaissance, "La date de naissance est obligatoire"],
    ["dateDelivrance", form.dateDelivrance, "La date de délivrance est obligatoire"],
    ["dateExpiration", form.dateExpiration, "La date d'expiration est obligatoire"],
  ];
  for (const [field, value, requiredMessage] of dates) {
    if (!value) errors[field] = requiredMessage;
    else if (!toDateOnly(value)) errors[field] = "Format de date invalide";
  }

  const birthDate = toDateOnly(form.dateNaissance);
  const deliveryDate = toDateOnly(form.dateDelivrance);
  const expiryDate = toDateOnly(form.dateExpiration);

  if (birthDate) {
    const minimumAdultDate = new Date(todayDateOnly);
    minimumAdultDate.setFullYear(minimumAdultDate.getFullYear() - 18);
    if (birthDate >= todayDateOnly) errors.dateNaissance = "La date de naissance doit être antérieure à aujourd'hui";
    else if (birthDate > minimumAdultDate) errors.dateNaissance = adultMessage;
  }
  if (deliveryDate && deliveryDate > todayDateOnly) {
    errors.dateDelivrance = "La date de délivrance ne peut pas être dans le futur";
  }
  if (deliveryDate && expiryDate && expiryDate <= deliveryDate) {
    errors.dateExpiration = "La date d'expiration doit être postérieure à la date de délivrance";
  }
};

const checkPersonNames = (errors: EnrollmentFormErrors, form: EnrollmentFormState) => {
  checkRequired(errors, "nom", form.nom, "Le nom est obligatoire", alphaPattern, "Le nom doit être alphabétique");
  checkRequired(errors, "prenom", form.prenom, "Le prénom est obligatoire", alphaPattern, "Le prénom doit être alphabétique");
};

/** Valide le formulaire d'enrôlement et renvoie toutes les erreurs, par champ, selon le type de client. */
export const validateCreateFormFields = (form: EnrollmentFormState): EnrollmentFormErrors => {
  const errors: EnrollmentFormErrors = {};

  if (form.type === "ENTREPRISE") {
    checkRequired(
      errors,
      "libelleEntreprise",
      form.libelleEntreprise,
      "Le libellé est obligatoire",
      alphaPattern,
      "Le libellé doit contenir uniquement des lettres",
    );
    checkTelephone(errors, form.telephone);
    checkEmail(errors, form.email);
    checkCompanyIds(errors, form);
    checkCodeClient(errors, form.codeClient);
    return errors;
  }

  checkPersonNames(errors, form);
  checkTelephone(errors, form.telephone);
  checkEmail(errors, form.email);

  if (form.type === "COMMERCANT") {
    checkIdentityDocument(errors, form, "Le commerçant doit être majeur (18 ans minimum)", alphanumericPattern);
    checkRequired(
      errors,
      "libelleEntreprise",
      form.libelleEntreprise,
      "La dénomination commerciale est obligatoire",
      alphaPattern,
      "La dénomination doit contenir uniquement des lettres",
    );
    checkCompanyIds(errors, form);
  } else {
    checkIdentityDocument(errors, form, "Le particulier doit être majeur (18 ans minimum)");
  }

  checkCodeClient(errors, form.codeClient);
  return errors;
};

/** Première erreur du formulaire, ou null s'il est valide. */
export const validateCreateForm = (createForm: EnrollmentFormState): string | null =>
  Object.values(validateCreateFormFields(createForm)).find(Boolean) ?? null;

export const buildCreatePayload = (
  createForm: EnrollmentFormState,
  institutionId: string,
  institutionLabel: string | null,
  codeClient: string,
): EnrollmentApplicationCreateSchema => {
  const enrollmentInstitutionId = institutionId.trim();
  const resolvedInstitutionLabel = institutionLabel?.trim() || "";
  const institution = {
    id: enrollmentInstitutionId,
    ...(resolvedInstitutionLabel ? { label: resolvedInstitutionLabel } : {}),
    codeClient,
  };
  const normalizedDocumentType = normalizeDocumentTypeForComparison(createForm.typePiece);
  let documentTypeForApi = createForm.typePiece.trim();
  if (normalizedDocumentType === "passport") {
    documentTypeForApi = "passport";
  } else if (normalizedDocumentType === "cni") {
    documentTypeForApi = "CNI";
  }

  if (createForm.type === "PARTICULIER") {
    const documentNumber = createForm.numeroPiece.trim();
    const documentUri = `piece://${documentNumber}`;

    return {
      customer: {
        phone: createForm.telephone.trim(),
        country: "SN",
        email: createForm.email.trim() || null,
        clientType: "PARTICULIER",
      },
      identity: {
        firstName: createForm.prenom.trim(),
        lastName: createForm.nom.trim(),
        dateOfBirth: createForm.dateNaissance,
        documentType: documentTypeForApi,
        documentNumber,
        address: null,
        deliveryDate: createForm.dateDelivrance || null,
        expiryDate: createForm.dateExpiration || null,
      },
      documents: [
        {
          type: documentTypeForApi,
          uri: documentUri,
        },
      ],
      institutions: [
        institution,
      ],
    };
  }

  if (createForm.type === "COMMERCANT") {
    const documentNumber = createForm.numeroPiece.trim();
    const documentUri = `piece://${documentNumber}`;

    return {
      customer: {
        phone: createForm.telephone.trim(),
        country: "SN",
        email: createForm.email.trim() || null,
        clientType: "COMMERCANT",
      },
      identity: {
        firstName: createForm.prenom.trim(),
        lastName: createForm.nom.trim(),
        dateOfBirth: createForm.dateNaissance,
        documentType: documentTypeForApi,
        documentNumber,
        address: null,
        deliveryDate: createForm.dateDelivrance || null,
        expiryDate: createForm.dateExpiration || null,
        ninea: createForm.ninea.trim() || null,
        fiscalIdentity: createForm.numeroIdentiteFiscale.trim() || null,
        label: createForm.libelleEntreprise.trim() || null,
      },
      documents: [
        {
          type: documentTypeForApi,
          uri: documentUri,
        },
        {
          type: "NINEA",
          uri: `ninea://${createForm.ninea.trim()}`,
        }
      ],
      institutions: [
        institution,
      ],
    };
  }

  return {
    customer: {
      phone: createForm.telephone.trim(),
      country: "SN",
      email: createForm.email.trim() || null,
      clientType: "ENTREPRISE",
    },
    identity: {
      firstName: createForm.libelleEntreprise.trim(),
      lastName: "Entreprise",
      label: createForm.libelleEntreprise.trim(),
      dateOfBirth: new Date().toISOString().slice(0, 10),
      ninea: createForm.ninea.trim() || null,
      fiscalIdentity: createForm.numeroIdentiteFiscale.trim() || null,
      address: null,
    },
    documents: [
      {
        type: "NINEA",
        uri: `ninea://${createForm.ninea.trim()}`,
      },
    ],
    institutions: [
      institution,
    ],
  };
};
