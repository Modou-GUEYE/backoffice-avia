import { describe, it, expect, beforeEach } from "vitest";
import { computeUserPerimeter } from "./useUserPerimeter";
import {
  parseAgencyIdFromToken,
  parseAgencyIdsFromToken,
  parseCaisseIdFromToken,
  parseProductIdFromToken,
  parseEntityContextFromToken,
  useAuthStore,
} from "./authStore";

describe("useUserPerimeter & authStore perimeter helpers", () => {
  describe("Token parsing for Agency and Caisse", () => {
    it("parses direct agency_id and agence_id from JWT payload", () => {
      // Base64 encoding for payload {"agency_id": "agency-123"}
      const payload1 = btoa(JSON.stringify({ agency_id: "agency-123" }));
      const token1 = `header.${payload1}.signature`;
      expect(parseAgencyIdFromToken(token1)).toBe("agency-123");

      const payload2 = btoa(JSON.stringify({ agence_id: "agency-456" }));
      const token2 = `header.${payload2}.signature`;
      expect(parseAgencyIdFromToken(token2)).toBe("agency-456");
    });

    it("parses agency from group tags like /STRUCTURE:.../AGENCE:uuid", () => {
      const payload = btoa(
        JSON.stringify({
          groups: [
            "/STRUCTURE:11111111-1111-1111-1111-111111111111/AGENCE:22222222-2222-2222-2222-222222222222",
          ],
        })
      );
      const token = `header.${payload}.signature`;
      expect(parseAgencyIdFromToken(token)).toBe(
        "22222222-2222-2222-2222-222222222222"
      );
    });

    it("parses caisse_id from direct claim or group tags", () => {
      const payloadDirect = btoa(JSON.stringify({ caisse_id: "caisse-789" }));
      const tokenDirect = `header.${payloadDirect}.signature`;
      expect(parseCaisseIdFromToken(tokenDirect)).toBe("caisse-789");

      const payloadGroup = btoa(
        JSON.stringify({
          groups: ["/AGENCE:.../CAISSE:33333333-3333-3333-3333-333333333333"],
        })
      );
      const tokenGroup = `header.${payloadGroup}.signature`;
      expect(parseCaisseIdFromToken(tokenGroup)).toBe(
        "33333333-3333-3333-3333-333333333333"
      );
    });
  });

  describe("computeUserPerimeter", () => {
    it("identifies global admin with no enforced filters", () => {
      const user = {
        email: "admin@example.com",
        role: "Administrateur" as const,
        entityContext: "Administration" as const,
      };
      const perimeter = computeUserPerimeter(user);
      expect(perimeter.isGlobalAdmin).toBe(true);
      expect(perimeter.enforcedStructureId).toBeNull();
      expect(perimeter.enforcedAgencyId).toBeNull();
      expect(perimeter.enforcedDistributorId).toBeNull();
      expect(perimeter.contextHeaders["X-User-Role"]).toBe("Administrateur");
    });

    it("identifies Structure user: enforces structureId but leaves agency and distributor open within perimeter", () => {
      const user = {
        email: "bank_admin@coris.com",
        role: "Administrateur" as const,
        entityContext: "Structure" as const,
        institutionId: "struct-coris-123",
        institutionLabel: "Coris Bank International",
      };
      const perimeter = computeUserPerimeter(user);
      expect(perimeter.isGlobalAdmin).toBe(false);
      expect(perimeter.isStructureUser).toBe(true);
      expect(perimeter.enforcedStructureId).toBe("struct-coris-123");
      expect(perimeter.enforcedAgencyId).toBeNull();
      expect(perimeter.enforcedDistributorId).toBeNull();
      expect(perimeter.contextHeaders["X-Structure-Id"]).toBe("struct-coris-123");
      expect(perimeter.contextHeaders["X-Structure"]).toBe("Coris Bank International");
    });

    it("identifies Structure user even if agencyId is present in token groups (e.g. Agent Financier Structure)", () => {
      const user = {
        email: "agentfinancier@example.com",
        role: "Initiateur financier" as const,
        entityContext: "Structure" as const,
        institutionId: "9aef8151-56b1-4703-b336-a164bb06a39e",
        agencyId: "d4e9f121-ab93-4279-a877-5ff00ae37e8c",
      };
      const perimeter = computeUserPerimeter(user);
      expect(perimeter.isGlobalAdmin).toBe(false);
      expect(perimeter.isStructureUser).toBe(true);
      expect(perimeter.isAgencyUser).toBe(false);
      expect(perimeter.enforcedStructureId).toBe("9aef8151-56b1-4703-b336-a164bb06a39e");
      expect(perimeter.enforcedAgencyId).toBeNull();
      expect(perimeter.enforcedDistributorId).toBeNull();
    });

    it("identifies Distributor user: enforces distributorId and structureId", () => {
      const user = {
        email: "distrib@westerneunion.com",
        role: "Superviseur" as const,
        entityContext: "Distributeur" as const,
        institutionId: "struct-partner-1",
        distributorId: "dist-wu-999",
      };
      const perimeter = computeUserPerimeter(user);
      expect(perimeter.isGlobalAdmin).toBe(false);
      expect(perimeter.isDistributorUser).toBe(true);
      expect(perimeter.enforcedDistributorId).toBe("dist-wu-999");
      expect(perimeter.enforcedStructureId).toBe("struct-partner-1");
      expect(perimeter.enforcedAgencyId).toBeNull();
    });

    it("identifies Agency user: strictly enforces agencyId", () => {
      const user = {
        email: "agent@agence-nord.com",
        role: "Agent" as const,
        entityContext: "Agence" as const,
        institutionId: "struct-coris-123",
        agencyId: "agency-nord-456",
        agencyLabel: "Agence Nord",
      };
      const perimeter = computeUserPerimeter(user);
      expect(perimeter.isGlobalAdmin).toBe(false);
      expect(perimeter.isAgencyUser).toBe(true);
      expect(perimeter.enforcedAgencyId).toBe("agency-nord-456");
      expect(perimeter.enforcedStructureId).toBe("struct-coris-123");
    });

    it("identifies Caisse user: strictly enforces caisseId and agencyId", () => {
      const user = {
        email: "caissier@coris.com",
        userId: "user-agent-007",
        role: "Superviseur" as const,
        entityContext: "Caisse" as const,
        institutionId: "struct-coris-123",
        agencyId: "agency-nord-456",
        caisseId: "caisse-guichet-1",
      };
      const perimeter = computeUserPerimeter(user);
      expect(perimeter.isGlobalAdmin).toBe(false);
      expect(perimeter.isCaisseUser).toBe(true);
      expect(perimeter.enforcedCaisseId).toBe("caisse-guichet-1");
      expect(perimeter.enforcedAgencyId).toBe("agency-nord-456");
    });

    it("identifies a cashier (profile.bo.agence-agent with a CAISSE group) and restricts to its caisse operations", () => {
      // Valeurs du jeton réel de l'agent caissier (profil agence-agent, groupes AGENCE + CAISSE)
      const user = {
        userId: "8106df8e-4c56-4735-ba64-d70bb8584c5c",
        email: "agentcaissier@example.com",
        role: "Agent" as const,
        entityContext: "Agence" as const,
        institutionId: "d9e56eab-12c9-4cfa-bd83-fdecf931c46f",
        agencyId: "722a9882-afa7-43c6-be61-df714abf4388",
        caisseId: "ea135124-3277-4cce-9084-78236c1ca48a",
        productId: "76cc91bf-a5b5-4c26-89af-253a7d61915a",
      };
      const perimeter = computeUserPerimeter(user);
      expect(perimeter.isAgencyUser).toBe(true);
      expect(perimeter.isCashier).toBe(true);
      expect(perimeter.enforcedStructureId).toBe("d9e56eab-12c9-4cfa-bd83-fdecf931c46f");
      expect(perimeter.enforcedAgencyId).toBe("722a9882-afa7-43c6-be61-df714abf4388");
      expect(perimeter.enforcedCaisseId).toBe("ea135124-3277-4cce-9084-78236c1ca48a");
      // Le Reporting déduit le périmètre du jeton : plus d'en-tête X-Agent-Id
      expect(perimeter.contextHeaders["X-Agent-Id"]).toBeUndefined();
    });

    it("does not restrict an agency supervisor to his own operations, even with a caisse", () => {
      const perimeter = computeUserPerimeter({
        userId: "sup-1",
        email: "sup@agence.com",
        role: "Superviseur" as const,
        entityContext: "Agence" as const,
        institutionId: "struct-1",
        agencyId: "agence-1",
        caisseId: "caisse-1",
      });
      expect(perimeter.isCashier).toBe(false);
      expect(perimeter.enforcedCaisseId).toBeNull();
      expect(perimeter.contextHeaders["X-Agent-Id"]).toBeUndefined();
    });

    it("identifies Superviseur Agence from Keycloak token", () => {
      const user = {
        userId: "1d9d45c5-9960-4470-ae3d-b76a1b01f138",
        email: "agentsuperviseur@example.com",
        role: "Superviseur" as const,
        entityContext: "Agence" as const,
        institutionId: "9aef8151-56b1-4703-b336-a164bb06a39e",
        agencyId: "d4e9f121-ab93-4279-a877-5ff00ae37e8c",
      };
      const perimeter = computeUserPerimeter(user);
      expect(perimeter.isGlobalAdmin).toBe(false);
      expect(perimeter.isStructureUser).toBe(false);
      expect(perimeter.isDistributorUser).toBe(false);
      expect(perimeter.isAgencyUser).toBe(true);
      expect(perimeter.isCaisseUser).toBe(false);
      expect(perimeter.enforcedAgencyId).toBe("d4e9f121-ab93-4279-a877-5ff00ae37e8c");
      expect(perimeter.enforcedStructureId).toBe("9aef8151-56b1-4703-b336-a164bb06a39e");
      expect(perimeter.enforcedDistributorId).toBeNull();
      expect(perimeter.enforcedCaisseId).toBeNull();
      expect(perimeter.contextHeaders["X-Structure-Id"]).toBe("9aef8151-56b1-4703-b336-a164bb06a39e");
      expect(perimeter.contextHeaders["X-User-Role"]).toBe("Superviseur");
      expect(perimeter.contextHeaders["X-User-Id"]).toBe("1d9d45c5-9960-4470-ae3d-b76a1b01f138");
    });

    it("parses product_id and entityContext from token groups or claims", () => {
      const payloadDirect = btoa(JSON.stringify({ product_id: "prod-demopay-123" }));
      const tokenDirect = `header.${payloadDirect}.signature`;
      expect(parseProductIdFromToken(tokenDirect)).toBe("prod-demopay-123");

      const payloadGroup = btoa(
        JSON.stringify({
          groups: ["/PRODUCT:76cc91bf-a5b5-4c26-89af-253a7d61915a"],
          resource_access: {
            "backoffice-web": {
              roles: ["profile.bo.produit-central"],
            },
          },
        })
      );
      const tokenGroup = `header.${payloadGroup}.signature`;
      expect(parseProductIdFromToken(tokenGroup)).toBe("76cc91bf-a5b5-4c26-89af-253a7d61915a");
      expect(parseEntityContextFromToken(tokenGroup)).toBe("Produit");
    });

    it("identifies Product user: strictly enforces enforcedProductId and header X-Product-Id", () => {
      const user = {
        userId: "user-prod-central",
        email: "gestionnaire.produit@example.com",
        role: "Profil central" as const,
        entityContext: "Produit" as const,
        productId: "76cc91bf-a5b5-4c26-89af-253a7d61915a",
        productLabel: "DEMOPAY",
      };
      const perimeter = computeUserPerimeter(user);
      expect(perimeter.isGlobalAdmin).toBe(false);
      expect(perimeter.isProductUser).toBe(true);
      expect(perimeter.isStructureUser).toBe(false);
      expect(perimeter.isDistributorUser).toBe(false);
      expect(perimeter.isAgencyUser).toBe(false);
      expect(perimeter.isCaisseUser).toBe(false);
      expect(perimeter.productId).toBe("76cc91bf-a5b5-4c26-89af-253a7d61915a");
      expect(perimeter.productLabel).toBe("DEMOPAY");
      expect(perimeter.enforcedProductId).toBe("76cc91bf-a5b5-4c26-89af-253a7d61915a");
      expect(perimeter.enforcedProductLabel).toBe("DEMOPAY");
      expect(perimeter.contextHeaders["X-Product-Id"]).toBe("76cc91bf-a5b5-4c26-89af-253a7d61915a");
      expect(perimeter.contextHeaders["X-User-Role"]).toBe("Profil central");
    });

    it("correctly parses real Gestionnaire Produit token from Keycloak", () => {
      const realToken =
        "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJESV9EM2p4NDVZX0lNS2g2QjBLbmtrbm1WYWRublNseGk3d3FVVGVYN2dNIn0.eyJleHAiOjE3OTE0MDUxOTksImlhdCI6MTc5MTQwNDI5OSwianRpIjoiOWUzMjA3MTgtMjE0OS00OWZlLThkOWEtZGU3MzVlZGU1NDdhIiwiaXNzIjoiaHR0cDovLzEwLjIzLjEuMTAxOjgwODIvcmVhbG1zL2FjY2Vzcy1zZWN1cml0eSIsImF1ZCI6WyJiYWNrb2ZmaWNlLXdlYiIsImFjY291bnQiXSwic3ViIjoiZGNmNWI5NTktYjllYy00ZDk2LThhN2QtMDYxMTMxYmJjNGZmIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoibW9iaWxlLWFwcCIsInNpZCI6ImVkY2YxZDQyLTY0ZjctNGFiYy1iYmFjLTdmNjI1ZjQwZTVlZSIsImFjciI6IjEiLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiIsImRlZmF1bHQtcm9sZXMtYWNjZXNzLXNlY3VyaXR5Il19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYmFja29mZmljZS13ZWIiOnsicm9sZXMiOlsicGVybS5iby5zZXJ2aWNlLmxpc3QiLCJwZXJtLmJvLmRhc2hib2FyZC5yZWFkIiwicGVybS5iby5lbnJvbGxtZW50Lmxpc3QiLCJwZXJtLmJvLnRyYW5zYWN0aW9uLmxpc3QiLCJwZXJtLmJvLmJhbmtpbmcubGlzdCIsInBlcm0uYm8udHJhbnNhY3Rpb24uZXhwb3J0IiwicHJvZmlsZS5iby5wcm9kdWl0LWNlbnRyYWwiLCJwZXJtLmJvLnN0cnVjdHVyZS5saXN0IiwicGVybS5iby50cmFuc2FjdGlvbi5yZWFkIiwicGVybS5iby5ydWxlLmxpc3QiXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibmFtZSI6Ikdlc3Rpb25uYWlyZSBwcm9kdWl0IiwiZ3JvdXBzIjpbIi9QUk9EVUNUOjc2Y2M5MWJmLWE1YjUtNGMyNi04OWFmLTI1M2E3ZDYxOTE1YSJdLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJnLnByb2R1aXQiLCJnaXZlbl9uYW1lIjoiR2VzdGlvbm5haXJlIiwiZmFtaWx5X25hbWUiOiJwcm9kdWl0IiwiZW1haWwiOiJwcm9kdWl0QHlvcG1haWwuY29tIn0.V3VrJFY44ZEU_F5Cnk3JFzc7KreEJenjFqFBNfcOK90O_AEABQKzbVsNDcfKULc0lxZ9h5O4lT52i1EU4_Bre4V5Zvulzem0SiNBBR9bQjNfoxro_wvVc9ONT3kVTLUDohDwrVuOZE386QY28ey0PbtOyUcJE3wDCwoR9_Ey2qRhTZFbgNTchEHgwd3LAAb7oDUs_rKW1ivVpwLIPz42gjoa4cBF_lJBS8UI1bN0mQk-hyGC4PnS34qugyy9ZYvR_IoJhGuHt3W79fVakJnnSWMqmEHkM9TKEb-Wq7JRR1as1zd2AIXvkTwliHvR00Kd0Y6CGyenTtyYoZDuzDoVGw";

      expect(parseEntityContextFromToken(realToken)).toBe("Produit");
      expect(parseProductIdFromToken(realToken)).toBe("76cc91bf-a5b5-4c26-89af-253a7d61915a");
    });
  });

  describe("Utilisateur rattaché à plusieurs agences", () => {
    // Groupes réels du jeton de a.agentagences (profil agence-agent, 2 agences + structure parente)
    const groups = [
      "/PRODUCT:76cc91bf-a5b5-4c26-89af-253a7d61915a/STRUCTURE:9aef8151-56b1-4703-b336-a164bb06a39e/AGENCE:971b86de-b20c-4bda-b0b2-91fbcc2b38cc",
      "/PRODUCT:76cc91bf-a5b5-4c26-89af-253a7d61915a/STRUCTURE:9aef8151-56b1-4703-b336-a164bb06a39e/AGENCE:d4e9f121-ab93-4279-a877-5ff00ae37e8c",
      "/PRODUCT:76cc91bf-a5b5-4c26-89af-253a7d61915a/STRUCTURE:9aef8151-56b1-4703-b336-a164bb06a39e",
    ];
    const token = `header.${btoa(JSON.stringify({ groups }))}.signature`;

    it("lit toutes les agences des groupes du jeton", () => {
      expect(parseAgencyIdsFromToken(token)).toEqual([
        "971b86de-b20c-4bda-b0b2-91fbcc2b38cc",
        "d4e9f121-ab93-4279-a877-5ff00ae37e8c",
      ]);
      expect(parseEntityContextFromToken(token)).toBe("Agence");
    });

    it("n'impose aucune agence seule mais limite le périmètre à ses agences", () => {
      const perimeter = computeUserPerimeter({
        email: "agentagences@example.com",
        role: "Agent",
        entityContext: "Agence",
        institutionId: "9aef8151-56b1-4703-b336-a164bb06a39e",
        agencyId: "971b86de-b20c-4bda-b0b2-91fbcc2b38cc",
        agencyIds: ["971b86de-b20c-4bda-b0b2-91fbcc2b38cc", "d4e9f121-ab93-4279-a877-5ff00ae37e8c"],
      });
      expect(perimeter.enforcedAgencyId).toBeNull();
      expect(perimeter.enforcedAgencyIds).toEqual([
        "971b86de-b20c-4bda-b0b2-91fbcc2b38cc",
        "d4e9f121-ab93-4279-a877-5ff00ae37e8c",
      ]);
      expect(perimeter.enforcedStructureId).toBe("9aef8151-56b1-4703-b336-a164bb06a39e");
    });

    it("une seule agence reste imposée comme avant", () => {
      const perimeter = computeUserPerimeter({
        email: "agent@example.com",
        role: "Agent",
        entityContext: "Agence",
        institutionId: "s-1",
        agencyId: "ag-1",
        agencyLabel: "Agence 1",
      });
      expect(perimeter.enforcedAgencyId).toBe("ag-1");
      expect(perimeter.enforcedAgencyLabel).toBe("Agence 1");
      expect(perimeter.enforcedAgencyIds).toEqual(["ag-1"]);
    });
  });
});
