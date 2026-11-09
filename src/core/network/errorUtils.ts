import axios from "axios";

export const translateBackendErrorMessage = (msg: string): string => {
  if (!msg || typeof msg !== "string") return msg;

  // Intégration référencée par des étapes de workflow
  const integMatch = msg.match(
    /Integration\s+['"]?([^'"]+)['"]?\s+cannot be deleted because one or more operations are referenced by workflow steps/i
  );
  if (integMatch) {
    return `L'intégration '${integMatch[1]}' ne peut pas être supprimée car une ou plusieurs de ses opérations sont référencées par des étapes de workflow.`;
  }

  // Opération référencée par des étapes de workflow
  const opMatch = msg.match(
    /Operation\s+['"]?([^'"]+)['"]?\s+cannot be deleted because (?:it is|one or more operations are) referenced by workflow steps/i
  );
  if (opMatch) {
    return `L'opération '${opMatch[1]}' ne peut pas être supprimée car elle est référencée par des étapes de workflow.`;
  }

  // Cas général : élément ne pouvant être supprimé car référencé par des étapes de workflow
  if (/cannot be deleted because/i.test(msg) && /referenced by workflow steps/i.test(msg)) {
    return "Suppression impossible : cet élément est référencé par une ou plusieurs étapes de workflow.";
  }

  // Archivage de package
  if (/An ACTIVE package cannot be archived directly/i.test(msg) || (/cannot be archived/i.test(msg) && /deactivate/i.test(msg))) {
    return "Un package actif ne peut pas être archivé directement. Veuillez d'abord le désactiver.";
  }
  if (/already archived/i.test(msg)) {
    return "Ce package est déjà archivé.";
  }

  // Utilisateur introuvable ou supprimé (ex: suppression de partenaire/entité)
  if (/user_not_found_or_deleted|user not found or deleted/i.test(msg)) {
    return "Ce compte utilisateur est introuvable ou a été supprimé. L'entité ou le partenaire associé a peut-être été supprimé. Veuillez contacter votre administrateur.";
  }


  // Flux de paiement introuvable (ex: activation d'un workflow sans flux de paiement configuré sur le service ou la structure)
  if (/ServicePaymentFlow\s+with\s+id\s+.*was not found/i.test(msg) || /ServicePaymentFlow\s+.*not found/i.test(msg)) {
    return "Le flux de paiement associé à ce service est introuvable. Veuillez configurer le flux de paiement avant d'activer ce workflow.";
  }

  // Flux de paiement sans moyens de paiement utilisables
  if (/(?:effective )?payment flow has no usable methods/i.test(msg)) {
    return "Le flux de paiement associé ne dispose d'aucun moyen de paiement valide (source ou destination). Veuillez configurer les moyens de paiement avant d'activer ce workflow.";
  }

  // Flux de paiement désactivé
  if (/(?:effective )?payment flow is disabled/i.test(msg)) {
    return "Le flux de paiement associé est désactivé. Veuillez l'activer avant d'activer ce workflow.";
  }

  // Validation des étapes de workflow (activation)
  if (/requires steps with unique keys and positive unique orders/i.test(msg)) {
    return "Le workflow doit contenir des étapes valides : chaque étape doit avoir une clé unique et un ordre strictement positif et unique.";
  }
  if (/requires at least one step/i.test(msg)) {
    return "Le workflow doit comporter au moins une étape pour être activé.";
  }

  return msg;
};

/** Forme minimale d'une erreur HTTP (axios ou assimilée) exploitée ci-dessous. */
type HttpLikeError = {
  response?: { status?: number; data?: unknown };
  code?: unknown;
  message?: unknown;
};

/** Champs possibles du corps d'erreur renvoyé par le backend. */
type BackendErrorPayload = {
  detail?: unknown;
  message?: unknown;
  error?: unknown;
  msg?: unknown;
};

/** Élément d'un tableau d'erreurs de validation FastAPI (422). */
type ValidationErrorItem = {
  loc?: Array<string | number>;
  msg?: string;
  message?: string;
};

export const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  const isAxiosErr =
    axios.isAxiosError(error) ||
    (typeof error === "object" && error !== null && ("response" in error || "isAxiosError" in error));

  if (isAxiosErr) {
    const axiosError = error as HttpLikeError;
    const response = axiosError.response;
    const status = response?.status;

    // 1. Traiter directement les erreurs serveur HTTP (>= 500 : 500, 502, 503, 504) : le code HTTP fait foi
    if (status && status >= 500) {
      if (status === 502 || status === 504) {
        return `Le serveur est temporairement indisponible (Erreur passerelle ${status}). Veuillez réessayer plus tard ou contacter l'équipe technique.`;
      }
      return `Une erreur s'est produite sur le serveur (Erreur serveur ${status}). Veuillez contacter l'équipe technique.`;
    }

    // 2. Extraire le message ou détail renvoyé directement par le serveur (FastAPI / backend pour erreurs 4xx)
    if (response?.data && typeof response.data === "object") {
      const data = response.data as BackendErrorPayload;
      const detail = data.detail || data.message || data.error || data.msg;

      if (typeof detail === "string" && detail.trim()) {
        return translateBackendErrorMessage(detail);
      }
      // Traiter les tableaux d'erreurs de validation FastAPI (422)
      if (Array.isArray(detail) && detail.length > 0) {
        const formatted = detail
          .map((item: string | ValidationErrorItem) => {
            if (typeof item === "string") return item;
            const field = item.loc ? item.loc[item.loc.length - 1] : "";
            return field ? `${field}: ${item.msg || item.message}` : item.msg || item.message || JSON.stringify(item);
          })
          .filter(Boolean)
          .join(", ");
        if (formatted.trim()) return formatted;
      }
    }

    // 3. Traiter l'absence de réponse serveur (serveur inaccessible, arrêté, coupure réseau, timeout)
    const code = String(axiosError.code || "").toUpperCase();
    const msg = String(axiosError.message || "").toLowerCase();

    if (
      !response ||
      code === "ECONNABORTED" ||
      code === "ERR_NETWORK" ||
      code.includes("NETWORK") ||
      msg.includes("network error") ||
      msg.includes("failed to fetch")
    ) {
      return "Le serveur est actuellement inaccessible. Veuillez vérifier la connexion ou contacter l'équipe technique.";
    }

    return `${fallbackMessage} (Code ${status || "inconnu"}).`;
  }

  if (error instanceof Error && error.message) {
    const msgLower = error.message.toLowerCase();
    if (msgLower.includes("502") || msgLower.includes("bad gateway")) {
      return "Le serveur est temporairement indisponible (Erreur passerelle 502). Veuillez contacter l'équipe technique.";
    }
    return translateBackendErrorMessage(error.message);
  }

  return fallbackMessage;
};
