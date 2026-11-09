import { EnrollmentApplicationSchema } from "../models/types";
import {
  canDeleteEnrollmentStatus,
  canGenerateEnrollmentCodeStatus,
  canValidateEnrollmentStatus,
  isPendingEnrollmentStatus,
} from "../models/enrollmentStatus";

export type ClientsPermissions = {
  canUpdate: boolean;
  canDelete: boolean;
  canGenerateCode?: boolean;
  canUnsubscribe?: boolean;
  canDeactivate?: boolean;
};

export const getGenerateCodeBlockingError = (
  enrollment: EnrollmentApplicationSchema | null,
  permissions: ClientsPermissions,
): string | null => {
  if (!enrollment) {
    return "Enrôlement introuvable";
  }

  if (!canGenerateEnrollmentCodeStatus(enrollment.status)) {
    return "La génération est autorisée uniquement pour un enrôlement en attente ou validé";
  }

  if (!permissions.canGenerateCode && !permissions.canUpdate) {
    return "Vous n'avez pas l'habilitation pour générer un code";
  }

  return null;
};

export const getPendingUpdateBlockingError = (
  enrollment: EnrollmentApplicationSchema | null,
): string | null => {
  if (!enrollment) {
    return "Enrôlement introuvable";
  }

  if (!isPendingEnrollmentStatus(enrollment.status)) {
    return "Mise à jour autorisée uniquement pour un enrôlement en attente";
  }

  return null;
};

export const getDeleteEnrollmentBlockingError = (
  enrollment: EnrollmentApplicationSchema | null,
  permissions: ClientsPermissions,
): string | null => {
  if (!enrollment) {
    return "Enrôlement introuvable";
  }

  if (!canDeleteEnrollmentStatus(enrollment.status)) {
    return "Seul un enrôlement en attente peut être supprimé";
  }

  if (!permissions.canDelete) {
    return "Vous n'avez pas l'habilitation pour supprimer un enrôlement";
  }

  return null;
};

export const getUpdateActionBlockingError = (
  enrollment: EnrollmentApplicationSchema | null,
  permissions: ClientsPermissions,
  action: "deactivate" | "unsubscribe" | "confirm-unsubscribe",
): string | null => {
  if (!enrollment) {
    return "Enrôlement introuvable";
  }

  if (action === "deactivate" && !permissions.canDeactivate && !permissions.canUpdate) {
    return "Vous n'avez pas l'habilitation pour désactiver un client";
  }
  if (action === "unsubscribe" && !permissions.canUnsubscribe && !permissions.canUpdate) {
    return "Vous n'avez pas l'habilitation pour désinscrire un client";
  }
  if (action === "confirm-unsubscribe" && !permissions.canUnsubscribe && !permissions.canUpdate) {
    return "Vous n'avez pas l'habilitation pour valider une désinscription";
  }

  return null;
};
