import { describe, expect, it } from "vitest";

import {
  buildCreatePayload,
  emptyEnrollmentForm,
  normalizeDocumentTypeForComparison,
  validateCreateForm,
  validateCreateFormFields,
} from "./createEnrollmentHelpers";
import {
  buildEntrepriseIdentityPayload,
  buildParticulierIdentityPayload,
  hasExpectedIdentityNames,
  resolveIdentityUpdateContext,
  type IdentityUpdateFormValues,
} from "./identityUpdateHelpers";
import {
  buildEnrollmentMetaFromDetails,
  toValidationForm,
} from "./viewmodelMappers";
import {
  getDeleteEnrollmentBlockingError,
  getGenerateCodeBlockingError,
  getPendingUpdateBlockingError,
  getUpdateActionBlockingError,
} from "./clientsActionGuards";
import {
  readEnrollmentCustomerIdMap,
  resolveCustomerIdForEnrollment,
  withRememberedCustomerId,
  writeEnrollmentCustomerIdMap,
} from "./customerIdMapStore";
import type {
  CustomerEnrollmentDetailsResponseSchema,
  EnrollmentApplicationSchema,
} from "../models/types";

const makeParticulierForm = () => ({
  ...emptyEnrollmentForm,
  type: "PARTICULIER" as const,
  nom: "Diallo",
  prenom: "Aminata",
  telephone: "771234567",
  email: "aminata@example.com",
  codeClient: "CLI123",
  typePiece: "CNI",
  numeroPiece: "123456789",
  dateNaissance: "1990-05-10",
  dateDelivrance: "2020-01-01",
  dateExpiration: "2030-01-01",
});

const makeEntrepriseForm = () => ({
  ...emptyEnrollmentForm,
  type: "ENTREPRISE" as const,
  libelleEntreprise: "SENEGAL ENTREPRISE",
  telephone: "781234567",
  email: "contact@entreprise.sn",
  codeClient: "ENT001",
  ninea: "NINEA001",
  numeroIdentiteFiscale: "NIF12345",
});

const makeCommercantForm = () => ({
  ...emptyEnrollmentForm,
  type: "COMMERCANT" as const,
  nom: "Diallo",
  prenom: "Aminata",
  telephone: "771234567",
  email: "aminata@example.com",
  codeClient: "COM123",
  typePiece: "CNI",
  numeroPiece: "123456789",
  dateNaissance: "1990-05-10",
  dateDelivrance: "2020-01-01",
  dateExpiration: "2030-01-01",
  libelleEntreprise: "AMINATA BOUTIQUE",
  ninea: "NINEA777",
  numeroIdentiteFiscale: "NIF7777",
});

const makeIdentityFormValues = (): IdentityUpdateFormValues => ({
  firstName: "Aminata",
  lastName: "Diallo",
  dateOfBirth: "1990-05-10",
  pieceType: "CNI",
  pieceNumber: "123456789",
  fiscalIdentity: "",
  phone: "771234567",
  email: "aminata@example.com",
  deliveryDate: "2020-01-01",
  expiryDate: "2030-01-01",
});

const makeEnrollment = (
  overrides: Partial<EnrollmentApplicationSchema> = {},
): EnrollmentApplicationSchema => ({
  id: "enr-1",
  institutionLabel: "ALPHA",
  status: "PENDING",
  ...overrides,
});

const makeDetails = (
  overrides: Partial<CustomerEnrollmentDetailsResponseSchema> = {},
): CustomerEnrollmentDetailsResponseSchema => ({
  customerId: "cust-1",
  customer: {
    phone: "771234567",
    country: "SN",
    email: "aminata@example.com",
  },
  identity: {
    firstName: "Aminata",
    lastName: "Diallo",
    dateOfBirth: "1990-05-10",
    documentType: "CNI",
    documentNumber: "123456789",
    deliveryDate: "2020-01-01",
    expiryDate: "2030-01-01",
  },
  documents: [{ type: "CNI", uri: "piece://123456789" }],
  ...overrides,
});

describe("createEnrollmentHelpers", () => {
  it("normalise les variantes de type de pièce", () => {
    expect(normalizeDocumentTypeForComparison("Carte Nationale d’Identité")).toBe("cni");
    expect(normalizeDocumentTypeForComparison("passport")).toBe("passport");
  });

  it("valide un formulaire particulier correct", () => {
    expect(validateCreateForm(makeParticulierForm())).toBeNull();
  });

  it("bloque un particulier mineur", () => {
    const form = makeParticulierForm();
    form.dateNaissance = "2012-01-01";

    expect(validateCreateForm(form)).toBe("Le particulier doit être majeur (18 ans minimum)");
  });

  it("construit un payload particulier aligné contrat", () => {
    const payload = buildCreatePayload(makeParticulierForm(), "alpha", "AVIA", "CLI123");

    expect(payload.customer.clientType).toBe("PARTICULIER");
    expect(payload.identity.documentType).toBe("CNI");
    expect(payload.identity.documentNumber).toBe("123456789");
    expect(payload.identity.deliveryDate).toBe("2020-01-01");
    expect(payload.identity.expiryDate).toBe("2030-01-01");
    expect(payload.documents?.[0]).toEqual({ type: "CNI", uri: "piece://123456789" });
    expect(payload.institutions?.[0]).toEqual({ id: "alpha", label: "AVIA", codeClient: "CLI123" });
  });

  it("construit un payload entreprise aligné contrat", () => {
    const payload = buildCreatePayload(makeEntrepriseForm(), "alpha", "AVIA", "ENT001");

    expect(payload.customer.clientType).toBe("ENTREPRISE");
    expect(payload.identity.lastName).toBe("Entreprise");
    expect(payload.identity.label).toBe("SENEGAL ENTREPRISE");
    expect(payload.identity.ninea).toBe("NINEA001");
    expect(payload.identity.fiscalIdentity).toBe("NIF12345");
    expect(payload.documents?.[0]).toEqual({ type: "NINEA", uri: "ninea://NINEA001" });
  });

  it("valide un formulaire commerçant correct", () => {
    expect(validateCreateForm(makeCommercantForm())).toBeNull();
  });

  it("construit un payload commerçant aligné contrat", () => {
    const payload = buildCreatePayload(makeCommercantForm(), "alpha", "AVIA", "COM123");

    expect(payload.customer.clientType).toBe("COMMERCANT");
    expect(payload.identity.firstName).toBe("Aminata");
    expect(payload.identity.lastName).toBe("Diallo");
    expect(payload.identity.label).toBe("AMINATA BOUTIQUE");
    expect(payload.identity.ninea).toBe("NINEA777");
    expect(payload.identity.fiscalIdentity).toBe("NIF7777");
    expect(payload.documents?.[0]).toEqual({ type: "CNI", uri: "piece://123456789" });
    expect(payload.documents?.[1]).toEqual({ type: "NINEA", uri: "ninea://NINEA777" });
    expect(payload.institutions?.[0]).toEqual({ id: "alpha", label: "AVIA", codeClient: "COM123" });
  });
});

describe("identityUpdateHelpers", () => {
  it("résout le contexte de mise à jour avec customerId", () => {
    const ctx = resolveIdentityUpdateContext("enr-1", " cust-1 ", makeIdentityFormValues());

    expect(ctx).toEqual({
      customerId: "cust-1",
      enrollmentId: "enr-1",
      savedPhone: "771234567",
      savedEmail: "aminata@example.com",
    });
  });

  it("retourne une erreur explicite quand customerId est absent", () => {
    expect(() => resolveIdentityUpdateContext("enr-1", " ", makeIdentityFormValues())).toThrow(
      "Impossible de mettre à jour les données saisies: identifiant client introuvable",
    );
  });

  it("construit le payload particulier", () => {
    const payload = buildParticulierIdentityPayload(makeIdentityFormValues());
    expect(payload).toMatchObject({
      firstName: "Aminata",
      lastName: "Diallo",
      documentType: "CNI",
      documentNumber: "123456789",
    });
  });

  it("construit le payload entreprise", () => {
    const payload = buildEntrepriseIdentityPayload({
      ...makeIdentityFormValues(),
      firstName: "SENEGAL ENTREPRISE",
      pieceNumber: "NINEA001",
      fiscalIdentity: "NIF12345",
    });

    expect(payload).toMatchObject({
      lastName: "Entreprise",
      documentType: "NINEA",
      ninea: "NINEA001",
      fiscalIdentity: "NIF12345",
    });
  });

  it("vérifie la cohérence des noms après patch", () => {
    expect(hasExpectedIdentityNames(makeDetails(), makeIdentityFormValues())).toBe(true);
  });
});

describe("viewmodel mappers + action guards", () => {
  it("déduit ENTREPPRISE depuis le document NINEA", () => {
    const meta = buildEnrollmentMetaFromDetails(
      makeDetails({
        identity: {
          firstName: "SENEGAL ENTREPRISE",
          lastName: "Entreprise",
          dateOfBirth: "2000-01-01",
        },
        documents: [{ type: "NINEA", uri: "ninea://001" }],
      }),
    );

    expect(meta).toEqual({ type: "ENTREPRISE", nameLabel: "SENEGAL ENTREPRISE" });
  });

  it("mappe correctement le formulaire de validation", () => {
    const validation = toValidationForm(makeDetails(), { phone: "780000000" });

    expect(validation.phone).toBe("780000000");
    expect(validation.pieceNumber).toBe("123456789");
    expect(validation.pieceType).toBe("CNI");
  });

  it("applique les règles de blocage d'actions", () => {
    // 1. Generation de code
    expect(getGenerateCodeBlockingError(null, { canUpdate: true, canDelete: true })).toBe("Enrôlement introuvable");
    expect(getGenerateCodeBlockingError(makeEnrollment({ status: "REJECTED" }), { canUpdate: true, canDelete: true })).toBe(
      "La génération est autorisée uniquement pour un enrôlement en attente ou validé",
    );
    expect(getGenerateCodeBlockingError(makeEnrollment({ status: "PENDING" }), { canUpdate: false, canDelete: true, canGenerateCode: false })).toBe(
      "Vous n'avez pas l'habilitation pour générer un code",
    );
    expect(getGenerateCodeBlockingError(makeEnrollment({ status: "PENDING" }), { canUpdate: true, canDelete: true })).toBeNull();
    expect(getGenerateCodeBlockingError(makeEnrollment({ status: "PENDING" }), { canUpdate: false, canDelete: true, canGenerateCode: true })).toBeNull();

    // 2. Mise a jour en attente (Pending Update)
    expect(getPendingUpdateBlockingError(null)).toBe("Enrôlement introuvable");
    expect(getPendingUpdateBlockingError(makeEnrollment({ status: "VALIDATED" }))).toBe(
      "Mise à jour autorisée uniquement pour un enrôlement en attente",
    );
    expect(getPendingUpdateBlockingError(makeEnrollment({ status: "PENDING" }))).toBeNull();

    // 3. Suppression d'enrolement
    expect(getDeleteEnrollmentBlockingError(null, { canUpdate: true, canDelete: true })).toBe("Enrôlement introuvable");
    expect(getDeleteEnrollmentBlockingError(makeEnrollment({ status: "VALIDATED" }), { canUpdate: true, canDelete: true })).toBe(
      "Seul un enrôlement en attente peut être supprimé",
    );
    expect(getDeleteEnrollmentBlockingError(makeEnrollment({ status: "PENDING" }), { canUpdate: true, canDelete: false })).toBe(
      "Vous n'avez pas l'habilitation pour supprimer un enrôlement",
    );
    expect(getDeleteEnrollmentBlockingError(makeEnrollment({ status: "PENDING" }), { canUpdate: true, canDelete: true })).toBeNull();

    // 4. Mises a jour d'actions specifiques (deactivate, unsubscribe, confirm-unsubscribe)
    expect(getUpdateActionBlockingError(null, { canUpdate: true, canDelete: true }, "deactivate")).toBe("Enrôlement introuvable");
    
    // Deactivate
    expect(getUpdateActionBlockingError(makeEnrollment(), { canUpdate: false, canDelete: true, canDeactivate: false }, "deactivate")).toBe(
      "Vous n'avez pas l'habilitation pour désactiver un client",
    );
    expect(getUpdateActionBlockingError(makeEnrollment(), { canUpdate: true, canDelete: true, canDeactivate: false }, "deactivate")).toBeNull();
    expect(getUpdateActionBlockingError(makeEnrollment(), { canUpdate: false, canDelete: true, canDeactivate: true }, "deactivate")).toBeNull();

    // Unsubscribe
    expect(getUpdateActionBlockingError(makeEnrollment(), { canUpdate: false, canDelete: true, canUnsubscribe: false }, "unsubscribe")).toBe(
      "Vous n'avez pas l'habilitation pour désinscrire un client",
    );
    expect(getUpdateActionBlockingError(makeEnrollment(), { canUpdate: true, canDelete: true, canUnsubscribe: false }, "unsubscribe")).toBeNull();
    expect(getUpdateActionBlockingError(makeEnrollment(), { canUpdate: false, canDelete: true, canUnsubscribe: true }, "unsubscribe")).toBeNull();

    // Confirm Unsubscribe
    expect(getUpdateActionBlockingError(makeEnrollment(), { canUpdate: false, canDelete: true, canUnsubscribe: false }, "confirm-unsubscribe")).toBe(
      "Vous n'avez pas l'habilitation pour valider une désinscription",
    );
    expect(getUpdateActionBlockingError(makeEnrollment(), { canUpdate: true, canDelete: true, canUnsubscribe: false }, "confirm-unsubscribe")).toBeNull();
    expect(getUpdateActionBlockingError(makeEnrollment(), { canUpdate: false, canDelete: true, canUnsubscribe: true }, "confirm-unsubscribe")).toBeNull();
  });
});

describe("customerIdMapStore", () => {
  it("lit une map valide depuis localStorage", () => {
    globalThis.localStorage.setItem(
      "avia_enrollment_customer_id_map",
      JSON.stringify({ " enr-1 ": " cust-1 ", "enr-2": "cust-2", "enr-3": "" }),
    );

    expect(readEnrollmentCustomerIdMap()).toEqual({
      " enr-1 ": "cust-1",
      "enr-2": "cust-2",
    });
  });

  it("retourne un objet vide si le contenu localStorage est invalide", () => {
    globalThis.localStorage.setItem("avia_enrollment_customer_id_map", "{invalid json");
    expect(readEnrollmentCustomerIdMap()).toEqual({});
  });

  it("mémorise un customerId sans muter l'objet source", () => {
    const source = { "enr-1": "cust-1" };
    const next = withRememberedCustomerId(source, " enr-2 ", " cust-2 ");

    expect(next).toEqual({ "enr-1": "cust-1", "enr-2": "cust-2" });
    expect(next).not.toBe(source);
  });

  it("retourne la même référence si rien ne change", () => {
    const source = { "enr-1": "cust-1" };
    const next = withRememberedCustomerId(source, "enr-1", "cust-1");
    expect(next).toBe(source);
  });

  it("résout le customerId prioritairement depuis l'enrollment", () => {
    const enrollment = makeEnrollment({ customerId: " inline-1 " });
    const resolved = resolveCustomerIdForEnrollment(enrollment, { "enr-1": "mapped-1" });
    expect(resolved).toBe("inline-1");
  });

  it("résout le customerId depuis la map en fallback", () => {
    const enrollment = makeEnrollment({ customerId: "" });
    const resolved = resolveCustomerIdForEnrollment(enrollment, { "enr-1": " mapped-1 " });
    expect(resolved).toBe("mapped-1");
  });

  it("écrit la map dans localStorage", () => {
    writeEnrollmentCustomerIdMap({ "enr-9": "cust-9" });
    expect(globalThis.localStorage.getItem("avia_enrollment_customer_id_map")).toBe(
      JSON.stringify({ "enr-9": "cust-9" }),
    );
  });
});

describe("validateCreateFormFields", () => {
  it("signale tous les champs obligatoires d'un particulier en une fois", () => {
    const errors = validateCreateFormFields({ ...emptyEnrollmentForm, type: "PARTICULIER", typePiece: "" });
    expect(Object.keys(errors).sort()).toEqual(
      [
        "codeClient",
        "dateDelivrance",
        "dateExpiration",
        "dateNaissance",
        "email",
        "nom",
        "numeroPiece",
        "prenom",
        "telephone",
        "typePiece",
      ].sort(),
    );
    expect(errors.nom).toBe("Le nom est obligatoire");
  });

  it("signale les erreurs de format sous chaque champ concerné", () => {
    const errors = validateCreateFormFields({
      ...makeParticulierForm(),
      telephone: "77abc",
      email: "client@",
      codeClient: "CLI-1",
      dateNaissance: "2012-01-01",
    });
    expect(errors).toEqual({
      telephone: "Le téléphone doit être numérique",
      email: "L'adresse e-mail doit être au format valide",
      codeClient: "Le code client doit être alphanumérique",
      dateNaissance: "Le particulier doit être majeur (18 ans minimum)",
    });
  });

  it("vérifie les champs propres à une entreprise", () => {
    const errors = validateCreateFormFields({ ...emptyEnrollmentForm, type: "ENTREPRISE" });
    expect(Object.keys(errors).sort()).toEqual(
      ["codeClient", "email", "libelleEntreprise", "ninea", "numeroIdentiteFiscale", "telephone"].sort(),
    );
  });

  it("ne renvoie aucune erreur pour des formulaires valides", () => {
    expect(validateCreateFormFields(makeParticulierForm())).toEqual({});
    expect(validateCreateFormFields(makeCommercantForm())).toEqual({});
  });
});
