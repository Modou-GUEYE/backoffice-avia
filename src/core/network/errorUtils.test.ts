import { describe, it, expect } from "vitest";
import { translateBackendErrorMessage, getErrorMessage } from "./errorUtils";

describe("errorUtils", () => {
  describe("translateBackendErrorMessage", () => {
    it("translates ServicePaymentFlow not found message to French", () => {
      const backendMsg =
        "ServicePaymentFlow with id 'default/c8b7e0d8-fefc-4bd9-88a7-8a3bd9879564' was not found.";
      const translated = translateBackendErrorMessage(backendMsg);
      expect(translated).toBe(
        "Le flux de paiement associé à ce service est introuvable. Veuillez configurer le flux de paiement avant d'activer ce workflow."
      );
    });

    it("translates ServicePaymentFlow with custom id not found", () => {
      const backendMsg = "ServicePaymentFlow with id 'flow-123' was not found.";
      const translated = translateBackendErrorMessage(backendMsg);
      expect(translated).toBe(
        "Le flux de paiement associé à ce service est introuvable. Veuillez configurer le flux de paiement avant d'activer ce workflow."
      );
    });

    it("translates payment flow with no usable methods message", () => {
      const backendMsg = "The effective payment flow has no usable methods in one or both directions.";
      const translated = translateBackendErrorMessage(backendMsg);
      expect(translated).toBe(
        "Le flux de paiement associé ne dispose d'aucun moyen de paiement valide (source ou destination). Veuillez configurer les moyens de paiement avant d'activer ce workflow."
      );
    });

    it("translates package and user errors correctly", () => {
      expect(translateBackendErrorMessage("user_not_found_or_deleted")).toContain(
        "Ce compte utilisateur est introuvable"
      );
      expect(translateBackendErrorMessage("An ACTIVE package cannot be archived directly")).toContain(
        "Un package actif ne peut pas être archivé directement"
      );
    });
  });

  describe("getErrorMessage", () => {
    it("extracts and translates detail from axios-like 404 response", () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 404,
          data: {
            type: "about:blank",
            title: "Resource Not Found",
            status: 404,
            detail: "ServicePaymentFlow with id 'default/c8b7e0d8-fefc-4bd9-88a7-8a3bd9879564' was not found.",
          },
        },
      };

      const message = getErrorMessage(error, "Impossible d'activer le workflow");
      expect(message).toBe(
        "Le flux de paiement associé à ce service est introuvable. Veuillez configurer le flux de paiement avant d'activer ce workflow."
      );
    });

    it("extracts and translates detail from axios-like 422 response", () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 422,
          data: {
            type: "about:blank",
            title: "Unprocessable Entity",
            status: 422,
            detail: "The effective payment flow has no usable methods in one or both directions.",
          },
        },
      };

      const message = getErrorMessage(error, "Impossible d'activer le workflow");
      expect(message).toBe(
        "Le flux de paiement associé ne dispose d'aucun moyen de paiement valide (source ou destination). Veuillez configurer les moyens de paiement avant d'activer ce workflow."
      );
    });

    it("extracts and translates detail from workflow steps validation 422 error", () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 422,
          data: {
            type: "about:blank",
            title: "Unprocessable Entity",
            status: 422,
            detail: "A workflow requires steps with unique keys and positive unique orders.",
          },
        },
      };

      const message = getErrorMessage(error, "Impossible d'activer le workflow");
      expect(message).toBe(
        "Le workflow doit contenir des étapes valides : chaque étape doit avoir une clé unique et un ordre strictement positif et unique."
      );
    });

    it("translates 502 Keycloak Integration Error to French", () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 502,
          data: {
            type: "about:blank",
            title: "Keycloak Integration Error",
            status: 502,
            detail: {
              error: "unknown_error",
              error_description: "For more on this error consult the server log.",
            },
            instance: "/api/v1/security/tokens/login",
          },
        },
      };

      const message = getErrorMessage(error, "Impossible de se connecter");
      expect(message).toBe(
        "Le serveur est temporairement indisponible (Erreur passerelle 502). Veuillez réessayer plus tard ou contacter l'équipe technique."
      );
    });
  });
});
