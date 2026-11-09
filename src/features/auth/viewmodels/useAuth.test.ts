import { describe, expect, it } from "vitest";
import { deriveActorFromBackendRoles } from "./useAuth";
import { hasBackofficeAccess, parseEntityContextFromToken, parseDistributorIdFromToken, parseInstitutionIdFromToken, useAuthStore } from "@/core/security/authStore";
import { getProfileRoleDisplayLabel, getProfileDisplayName } from "@/features/utilisateurs/models/profileLabels";

const STRUCTURE_TOKEN = (() => {
  const payload = {
    aud: ["backoffice-web", "account"],
    resource_access: {
      "backoffice-web": {
        roles: ["perm.bo.agence.list", "profile.bo.structure-admin"],
      },
    },
    groups: [
      "/PRODUCT:76cc91bf-a5b5-4c26-89af-253a7d61915a/STRUCTURE:d9e56eab-12c9-4cfa-bd83-fdecf931c46f",
    ],
  };
  return `header.${btoa(JSON.stringify(payload))}.sig`;
})();

const DISTRIBUTOR_TOKEN =
  "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJESV9EM2p4NDVZX0lNS2g2QjBLbmtrbm1WYWRublNseGk3d3FVVGVYN2dNIn0.eyJleHAiOjE3OTAwMTE1MDQsImlhdCI6MTc5MDAxMDYwNCwianRpIjoiZDNkYzZlZjUtNDdhOS00OWUzLTkyYzgtMjVkZDlhNzRkNTQ0IiwiaXNzIjoiaHR0cDovLzEwLjIzLjEuMTAxOjgwODIvcmVhbG1zL2FjY2Vzcy1zZWN1cml0eSIsImF1ZCI6WyJiYWNrb2ZmaWNlLXdlYiIsImFjY291bnQiXSwic3ViIjoiNzI1N2E5MTAtMDJlNS00NDhlLTk1NGItMGZiNDFkMzA1ZjZjIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoibW9iaWxlLWFwcCIsInNpZCI6IjY4MDZjMTRkLTc4M2QtNDk2Zi1iNThiLWI1MGY2MzZkZDMwYiIsImFjciI6IjEiLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiIsImRlZmF1bHQtcm9sZXMtYWNjZXNzLXNlY3VyaXR5Il19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYmFja29mZmljZS13ZWIiOnsicm9sZXMiOlsicGVybS5iby5hZ2VuY2UuZGVhY3RpdmF0ZSIsInBlcm0uYm8uY2Fpc3NlLmRlbGV0ZSIsInBlcm0uYm8uY2Fpc3NlLmxpc3QiLCJwZXJtLmJvLmNhaXNzZS5hZGQiLCJwZXJtLmJvLmNhaXNzZS5kZWFjdGl2YXRlIiwicGVybS5iby51c2VyLmRlYWN0aXZhdGUiLCJwZXJtLmJvLnVzZXIubGlzdCIsInBlcm0uYm8uY2Fpc3NlLnVwZGF0ZSIsInBlcm0uYm8uZW5yb2xsbWVudC5saXN0IiwicGVybS5iby5hZ2VuY2UuZGVsZXRlIiwicGVybS5iby5hZ2VuY2UudXBkYXRlIiwicHJvZmlsZS5iby5hdXRvbm9tZS1zZXQtYWRtaW4iLCJwZXJtLmJvLmFnZW5jZS5hZGQiLCJwZXJtLmJvLnVzZXIudXBkYXRlIiwicGVybS5iby51c2VyLmFkZCIsInBlcm0uYm8udXNlci5kZWxldGUiXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibmFtZSI6InVzZXIgaW50b3VjaCIsImdyb3VwcyI6WyIvUFJPRFVDVDo3NmNjOTFiZi1hNWI1LTRjMjYtODlhZi0yNTNhN2Q2MTkxNWEvU1RSVUNUVVJFOjlhZWY4MTUxLTU2YjEtNDcwMy1iMzM2LWExNjRiYjA2YTM5ZS9ESVNUUklCVVRPUjozZGJkMTA0My0yN2VjLTQ5YWUtOTM0NS1jOWIxMmE3MjFhODUiLCIvUFJPRFVDVDo3NmNjOTFiZi1hNWI1LTRjMjYtODlhZi0yNTNhN2Q2MTkxNWEvU1RSVUNUVVJFOjlhZWY4MTUxLTU2YjEtNDcwMy1iMzM2LWExNjRiYjA2YTM5ZSJdLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJ1LnVzZXJpbnRvdWNoIiwiZ2l2ZW5fbmFtZSI6InVzZXIiLCJmYW1pbHlfbmFtZSI6ImludG91Y2giLCJlbWFpbCI6ImludG91Y2hAeW9wbWFpbC5jb20ifQ.XKQmiM0cwcCTqOdod23iFI6zegVmqcXIX5o02mh4Pycaw6QUMH6_83mfRKwR0_a64VZID1UlxU8-Cy5WB4OMR5rebq1lbq6HrrC96w1KfBXYdjcRuzSgmY1xNwphoffQDRFT8QxH32BGzuRST4AJknRyehEjhYN3N8XumgPE4EobwEHDMII6fHRPdvD7ELrpbtpOcOlkBPnxgDO0xxn1YtuwPTrNXoUH4tMcjklMROSHjshHcd7oU-30eEd8RUktH__zQ1vKepb8Sp8bQy7AeddOMRCw9CfwrdnypFU1f4zB7Q5IcBkvGyFx1GcJvDmvgAQwa-6npnconxNZJm-j0g";

const BACKOFFICE_TOKEN =
  "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJESV9EM2p4NDVZX0lNS2g2QjBLbmtrbm1WYWRublNseGk3d3FVVGVYN2dNIn0.eyJleHAiOjE3OTAwMDI2MDEsImlhdCI6MTc5MDAwMTcwMSwianRpIjoiMzlhODI4NGUtZWQxMS00NTg2LWI4ODItZGRjYjI1YmJhYjJmIiwiaXNzIjoiaHR0cDovLzEwLjIzLjEuMTAxOjgwODIvcmVhbG1zL2FjY2Vzcy1zZWN1cml0eSIsImF1ZCI6WyJiYWNrb2ZmaWNlLXdlYiIsImFjY291bnQiXSwic3ViIjoiMjJiNjIxZjctYWNhYy00NTllLTlmNmEtNjAzNTc5ZDQyMTk1IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoibW9iaWxlLWFwcCIsInNpZCI6ImU3ODVjYjg2LWZjMzItNGYzYS04NTVkLWIxZjY0ZTlhYjQzOSIsImFjciI6IjEiLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiIsImRlZmF1bHQtcm9sZXMtYWNjZXNzLXNlY3VyaXR5Il19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYmFja29mZmljZS13ZWIiOnsicm9sZXMiOlsicGVybS5iby5zZXJ2aWNlLmxpc3QiLCJwZXJtLmJvLmZpZWxkLmRlbGV0ZSIsInBlcm0uYm8uZmllbGQucmVhZCIsInBlcm0uYm8uc3RydWN0dXJlLmFkZCIsInBlcm0uYm8ucGFja2FnZS5kZWxldGUiLCJwZXJtLmJvLmZvcm0udXBkYXRlIiwicGVybS5iby5mb3JtLnJlYWQiLCJwZXJtLmJvLnN0cnVjdHVyZS51cGRhdGUiLCJwZXJtLmJvLnN0cnVjdHVyZS5saXN0IiwicGVybS5iby51c2VyLmRlYWN0aXZhdGUiLCJwZXJtLmJvLmZvcm0uZGVsZXRlIiwicGVybS5iby51c2VyLmxpc3QiLCJwZXJtLmJvLmZpZWxkLmxpc3QiLCJwZXJtLmJvLmZpZWxkLmNyZWF0ZSIsInBlcm0uYm8ucGFja2FnZS5kZWFjdGl2YXRlIiwicGVybS5iby5wcm9kdWl0LmFkZCIsInBlcm0uYm8udXNlci5hZGQiLCJwZXJtLmJvLnByb2R1aXQudXBkYXRlIiwicGVybS5iby5zdHJ1Y3R1cmUuZGVsZXRlIiwicGVybS5iby5wYWNrYWdlLmR1cGxpY2F0ZSIsInBlcm0uYm8ucHJvZHVpdC5kZWxldGUiLCJwZXJtLmJvLnBhY2thZ2UudXBkYXRlIiwicGVybS5iby5wYWNrYWdlLmFyY2hpdmUiLCJwZXJtLmJvLmFnZW5jZS5saXN0IiwicGVybS5iby5wcm9kdWl0Lmxpc3QiLCJwZXJtLmJvLmF1dG9ub21lLXNldC5saXN0IiwicGVybS5iby5jYWlzc2UubGlzdCIsInBlcm0uYm8uc3RydWN0dXJlLmRlYWN0aXZhdGUiLCJwZXJtLmJvLnBhY2thZ2UubGlzdCIsInByb2ZpbGUuYm8tYWRtaW4iLCJwZXJtLmJvLmVucm9sbG1lbnQubGlzdCIsInBlcm0uYm8ucHJvZHVpdC5kZWFjdGl2YXRlIiwicGVybS5iby5mb3JtLmxpc3QiLCJwZXJtLmJvLnBhY2thZ2UuY3JlYXRlIiwicGVybS5iby51c2VyLnVwZGF0ZSIsInBlcm0uYm8ucGFja2FnZS5hY3RpdmF0ZSIsInBlcm0uYm8ucGF5bWVudC1tZXRob2QubGlzdCIsInBlcm0uYm8uZmllbGQudXBkYXRlIiwicGVybS5iby51c2VyLmRlbGV0ZSIsInBlcm0uYm8uZm9ybS5jcmVhdGUiXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibmFtZSI6IlRlc3RldXIgQXZpYSIsImdyb3VwcyI6WyIvQURNSU46OGM4NjBjYWMtYWQzYy00ZmNjLTgyZjEtMzA2MWE2ODE0MjQ1Il0sInByZWZlcnJlZF91c2VybmFtZSI6InQudGVzdGV1cmF2aWEiLCJnaXZlbl9uYW1lIjoiVGVzdGV1ciIsImZhbWlseV9uYW1lIjoiQXZpYSIsImVtYWlsIjoidXNlcjJhdmlhdjJAeW9wbWFpbC5jb20ifQ.u1dcpuyx2Wu4ahI61jEuhAPecpr84K6cWSqRff4PBHRo8vLeny6_7TiDDKTixC6yLnXtkaxaVvrL-n23R2p4LlZQxNjX9eTt6IK94I4o6_eACfPOEvmCn7RCIfaRBu6Pap1SuVUBLRq8Ifrq4jv4Da0I1SzLWEt8Hb4jX3LwfYkRxfQCFfC94lsNP8jupIDLJCEBwlpkdgUhT5faMZLzcBzGPg25K7cQyUaGwr_znxoNOEMDQPOA-n4L2LXNUFb-fuZunzBMrbbQ5oVRTXv3RkmCZi9ql6ncxx9E05Xs7vbPaoyp7ZJQBhIR-vGI0z8ne4oDj4MUkKg7E1wtjAT7lA";

const MOBILE_TOKEN =
  "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJESV9EM2p4NDVZX0lNS2g2QjBLbmtrbm1WYWRublNseGk3d3FVVGVYN2dNIn0.eyJleHAiOjE3OTAwMDQ0MjQsImlhdCI6MTc5MDAwMzUyNCwianRpIjoiNThiNjc2NzUtMDQwMi00YTMxLWI0N2UtYTMzMzM4MzQwN2M1IiwiaXNzIjoiaHR0cDovLzEwLjIzLjEuMTAxOjgwODIvcmVhbG1zL2FjY2Vzcy1zZWN1cml0eSIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiJjYzg4ODE4Zi1jOWE0LTQzNmItYTU4My02MTIwMjBhZTk2OTAiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJtb2JpbGUtYXBwIiwic2lkIjoiNmRhZWViNzktNzM2OS00MDAzLWFmNjMtNzhmMzk1NjVkOGI5IiwiYWNyIjoiMSIsInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJvZmZsaW5lX2FjY2VzcyIsInVtYV9hdXRob3JpemF0aW9uIiwiZGVmYXVsdC1yb2xlcy1hY2Nlc3Mtc2VjdXJpdHkiXX0sInJlc291cmNlX2FjY2VzcyI6eyJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50IiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJ2aWV3LXByb2ZpbGUiXX19LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJBTEkgQkEiLCJncm91cHMiOlsiL1BST0RVQ1Q6NzZjYzkxYmYtYTViNS00YzI2LTg5YWYtMjUzYTdkNjE5MTVhL1NUUlVDVFVSRTpkOWU1NmVhYi0xMmM5LTRjZmEtYmQ4My1mZGVjZjkzMWM0NmYiXSwicHJlZmVycmVkX3VzZXJuYW1lIjoiYWxpYmEiLCJnaXZlbl9uYW1lIjoiQUxJIiwiZmFtaWx5X25hbWUiOiJCQSIsImVtYWlsIjoiYWxpYmFAeW9wbWFpbC5jb20ifQ.toyin7hhINdj5Ka0iNwauyc3a1TIALqmBh9RmeAhM4uXQJF1l9RUUMHL0XQgHd3MQyUYUyORMf--tEUnnOHFT6N9IqcAkqY-BGpGKQBrFtp1tCF954yosMiwq0y1hUBlBLBpO3xDdlUzXU83L502FOg4do7S8E_KrOvDlMOpIkgKkoxwweUFKP9-GAc6QkyCEuQHlSuhDWJyADLdze8dFSy_yugM0XA5aNiiQya15tF0XXOxunVNAE6uv9zrPI8oDQIZdX759oIUqJf_xvMfWx86-5n9ZLnZuewrKcJwJsUSB90SUxo7ogvdgi4nhGR6EM_apFzBCoy79KryIYKl3g";

describe("hasBackofficeAccess", () => {
  it("allows access for a valid backoffice token with backoffice-web client roles", () => {
    expect(hasBackofficeAccess(BACKOFFICE_TOKEN)).toBe(true);
  });

  it("allows access for a token with single string aud 'backoffice-web'", () => {
    const payload = { aud: "backoffice-web" };
    const token = `header.${btoa(JSON.stringify(payload))}.sig`;
    expect(hasBackofficeAccess(token)).toBe(true);
  });

  it("blocks access for a mobile client token with aud 'account'", () => {
    expect(hasBackofficeAccess(MOBILE_TOKEN)).toBe(false);
  });

  it("blocks access for null, undefined, empty, or invalid tokens", () => {
    expect(hasBackofficeAccess(null)).toBe(false);
    expect(hasBackofficeAccess(undefined)).toBe(false);
    expect(hasBackofficeAccess("")).toBe(false);
    expect(hasBackofficeAccess("invalid.token")).toBe(false);
  });

  it("blocks access when aud does not include backoffice-web", () => {
    const payload = { aud: ["account", "mobile-app"] };
    const token = `header.${btoa(JSON.stringify(payload))}.sig`;
    expect(hasBackofficeAccess(token)).toBe(false);
  });
});

describe("parseEntityContextFromToken", () => {
  it("extracts Distributeur context from DISTRIBUTOR group", () => {
    expect(parseEntityContextFromToken(DISTRIBUTOR_TOKEN)).toBe("Distributeur");
  });

  it("extracts Structure context from STRUCTURE group", () => {
    expect(parseEntityContextFromToken(STRUCTURE_TOKEN)).toBe("Structure");
  });

  it("extracts Administration context from ADMIN group", () => {
    expect(parseEntityContextFromToken(BACKOFFICE_TOKEN)).toBe("Administration");
  });

  it("correctly extracts distributorId and institutionId from hierarchical groups", () => {
    expect(parseDistributorIdFromToken(DISTRIBUTOR_TOKEN)).toBe("3dbd1043-27ec-49ae-9345-c9b12a721a85");
    expect(parseInstitutionIdFromToken(DISTRIBUTOR_TOKEN)).toBe("9aef8151-56b1-4703-b336-a164bb06a39e");
  });

  it("returns null for invalid or missing token", () => {
    expect(parseEntityContextFromToken(undefined)).toBeNull();
    expect(parseEntityContextFromToken("")).toBeNull();
  });
});

describe("deriveActorFromBackendRoles", () => {
  it("prefers the distributeur context when both structure and autonome-set roles are present", () => {
    const actor = deriveActorFromBackendRoles([
      "profile.bo.structure-admin",
      "profile.bo.autonome-set-admin",
    ]);

    expect(actor).toEqual({
      role: "Administrateur",
      entityContext: "Distributeur",
    });
  });

  it("returns null when backendRoles is empty", () => {
    expect(deriveActorFromBackendRoles([])).toBeNull();
  });

  it("correctly derives actor for structure-controller", () => {
    const actor = deriveActorFromBackendRoles(["profile.bo.structure-controller"]);
    expect(actor).toEqual({
      role: "Contrôleur",
      entityContext: "Structure",
    });
  });
});

describe("useAuthStore login restriction", () => {
  it("rejects login if token is a mobile token", () => {
    useAuthStore.getState().logout();

    useAuthStore.getState().login({
      email: "aliba@example.com",
      token: MOBILE_TOKEN,
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("accepts login if token is a valid backoffice token", () => {
    useAuthStore.getState().logout();

    useAuthStore.getState().login({
      email: "user2aviav2@example.com",
      token: BACKOFFICE_TOKEN,
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.email).toBe("user2aviav2@example.com");
  });
});

describe("getProfileRoleDisplayLabel", () => {
  it("formats AGENT AGENCE for standard agence agent", () => {
    const label = getProfileRoleDisplayLabel({
      role: "Agent",
      entityContext: "Agence",
      permissions: ["perm.bo.agence.list", "profile.bo.agence-agent"],
    });
    expect(label).toBe("AGENT AGENCE");
  });

  it("returns Agent Agence display name for profile.bo.agence-agent", () => {
    expect(getProfileDisplayName("profile.bo.agence-agent")).toBe("Agent Agence");
  });

  it("formats ADMINISTRATEUR DISTRIBUTEUR directly from profile.bo.autonome-set-admin in permissions", () => {
    const label = getProfileRoleDisplayLabel({
      role: "Administrateur",
      entityContext: "Distributeur",
      permissions: ["perm.bo.user.list", "profile.bo.autonome-set-admin"],
    });
    expect(label).toBe("ADMINISTRATEUR DISTRIBUTEUR");
  });
});

describe("user_not_found_or_deleted translation", () => {
  it("translates user_not_found_or_deleted via normalizeIntegrationError into a user-friendly message", async () => {
    const { normalizeIntegrationError } = await import("@/core/security/accessSecurityService");
    const result = normalizeIntegrationError("user_not_found_or_deleted");
    expect(result).toBe(
      "Ce compte utilisateur est introuvable ou a été supprimé. L'entité ou le partenaire associé a peut-être été supprimé. Veuillez contacter votre administrateur."
    );
  });

  it("translates user_not_found_or_deleted via translateBackendErrorMessage", async () => {
    const { translateBackendErrorMessage } = await import("@/core/network/errorUtils");
    const result = translateBackendErrorMessage("user_not_found_or_deleted");
    expect(result).toBe(
      "Ce compte utilisateur est introuvable ou a été supprimé. L'entité ou le partenaire associé a peut-être été supprimé. Veuillez contacter votre administrateur."
    );
  });

  it("maps HTTP 502 to user-friendly message without string guessing", async () => {
    const { getErrorMessageFromStatus } = await import("@/core/security/accessSecurityService");
    expect(getErrorMessageFromStatus(502, "Erreur")).toBe(
      "Le serveur est temporairement indisponible. Veuillez réessayer dans quelques instants."
    );
  });

  it("normalizes invalid user credentials and invalid_grant to french error message", async () => {
    const { normalizeIntegrationError } = await import("@/core/security/accessSecurityService");
    expect(normalizeIntegrationError("Invalid user credentials")).toBe(
      "Identifiant ou mot de passe incorrect."
    );
    expect(normalizeIntegrationError("invalid_grant")).toBe(
      "Identifiant ou mot de passe incorrect."
    );
  });

  it("parseAuthError parses Keycloak invalid_grant on 502 as login failure", async () => {
    const { parseAuthError } = await import("@/core/security/accessSecurityService");
    const error = {
      isAxiosError: true,
      response: {
        status: 502,
        data: {
          title: "Keycloak Integration Error",
          status: 502,
          detail: {
            error: "invalid_grant",
            error_description: "Invalid user credentials",
          },
        },
      },
    };
    const parsed = parseAuthError(error);
    expect(parsed.title).toBe("Échec de connexion");
    expect(parsed.message).toBe("Identifiant ou mot de passe incorrect.");
    expect(parsed.requiresPasswordReset).toBeFalsy();
  });

  it("parseAuthError parses generic 502 as service unavailable", async () => {
    const { parseAuthError } = await import("@/core/security/accessSecurityService");
    const error = {
      isAxiosError: true,
      response: {
        status: 502,
        data: {
          title: "Keycloak Integration Error",
          status: 502,
          detail: {
            error: "unknown_error",
            error_description: "For more on this error consult the server log.",
          },
        },
      },
    };
    const parsed = parseAuthError(error);
    expect(parsed.title).toBe("Service indisponible");
    expect(parsed.message).toBe("Le serveur est temporairement indisponible. Veuillez réessayer dans quelques instants.");
  });

  it("parseAuthError detects password reset required on first login", async () => {
    const { parseAuthError } = await import("@/core/security/accessSecurityService");
    const error = {
      isAxiosError: true,
      response: {
        status: 502,
        data: {
          title: "Keycloak Integration Error",
          status: 502,
          detail: {
            error: "invalid_grant",
            error_description: "Account is not fully set up",
          },
        },
      },
    };
    const parsed = parseAuthError(error);
    expect(parsed.title).toBe("Mot de passe requis");
    expect(parsed.requiresPasswordReset).toBe(true);
  });
});


