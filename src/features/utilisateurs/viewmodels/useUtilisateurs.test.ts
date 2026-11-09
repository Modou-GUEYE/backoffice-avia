import { describe, expect, it } from "vitest";
import {
  filterRolesByActorPermissions,
  resolveCreateTargetScope,
  getScopeRefIdFromToken,
  resolveHierarchyScopeFromToken,
  deriveLogin,
  buildUsersFromHierarchyMembers,
  buildAgencesFilter,
  validateUtilisateurForm,
} from "@/features/utilisateurs/viewmodels/useUtilisateurs";
import {
  getDefaultProfileRoles,
  DEFAULT_PROFILE_ROLES,
} from "@/features/utilisateurs/models/profileLabels";

describe("filterRolesByActorPermissions", () => {
  const roles = [
    "profile.bo-admin",
    "profile.bo-controller",
    "profile.bo-profil-technique",
    "profile.bo.produit-central",
    "profile.bo.structure-admin",
    "profile.bo.structure-controller",
    "profile.bo.agence-agent",
    "profile.bo.autonome-set-admin",
    "profile.bo.autonome-set-agent",
    "profile.bo.autonome-set-superviseur",
  ];

  it("hides backoffice and produit central profiles for Admin Structure", () => {
    expect(
      filterRolesByActorPermissions(
        roles,
        "Administrateur",
        "Structure",
        ["profile.bo.structure-admin"],
      ),
    ).toEqual([
      "profile.bo.structure-admin",
      "profile.bo.structure-controller",
      "profile.bo.agence-agent",
      "profile.bo.autonome-set-admin",
      "profile.bo.autonome-set-agent",
      "profile.bo.autonome-set-superviseur",
    ]);
  });

  it("ne propose à l'Admin Structure que les profils de son périmètre (structure, agence, distributeur)", () => {
    expect(
      filterRolesByActorPermissions(
        [
          ...roles,
          "profile.bo.partenaire-admin",
          "profile.bo.partenaire-marchand",
          "profile.bo.superviseur",
          "profile.bo.admin",
        ],
        "Administrateur",
        "Structure",
        ["profile.bo.structure-admin"],
      ),
    ).toEqual([
      "profile.bo.structure-admin",
      "profile.bo.structure-controller",
      "profile.bo.agence-agent",
      "profile.bo.autonome-set-admin",
      "profile.bo.autonome-set-agent",
      "profile.bo.autonome-set-superviseur",
    ]);
  });

  it("restreint les profils à bo-admin, bo-controller et bo-profil-technique pour Admin Backoffice", () => {
    expect(
      filterRolesByActorPermissions(
        roles,
        "Administrateur",
        "Administration",
        ["profile.bo-admin"],
      ),
    ).toEqual([
      "profile.bo-admin",
      "profile.bo-controller",
      "profile.bo-profil-technique",
    ]);
  });

  it("keeps only autonome-set profiles for Admin Distributeur", () => {
    expect(
      filterRolesByActorPermissions(
        roles,
        "Administrateur",
        "Distributeur",
        ["profile.bo.autonome-set-admin"],
      ),
    ).toEqual([
      "profile.bo.autonome-set-admin",
      "profile.bo.autonome-set-agent",
      "profile.bo.autonome-set-superviseur",
    ]);
  });
});

describe("resolveCreateTargetScope", () => {
  const STRUCTURE_ID = "struct-aaa-111";
  const AGENCE_ID = "agence-bbb-222";
  const CAISSE_ID = "caisse-ccc-333";

  it("plusieurs agences → une entrée par agence, sans doublon", () => {
    expect(
      resolveCreateTargetScope({
        parentRefType: "STRUCTURE",
        parentRefId: STRUCTURE_ID,
        role: "profile.bo.agence-superviseur",
        agenceIds: [AGENCE_ID, "agence-ddd-444", AGENCE_ID],
      }),
    ).toEqual([
      { ref_type: "STRUCTURE", ref_id: STRUCTURE_ID },
      { ref_type: "AGENCE", ref_id: AGENCE_ID },
      { ref_type: "AGENCE", ref_id: "agence-ddd-444" },
    ]);
  });

  it("liste d'agences vide → rattaché au siège (structure seule)", () => {
    expect(
      resolveCreateTargetScope({
        parentRefType: "STRUCTURE",
        parentRefId: STRUCTURE_ID,
        role: "profile.bo.agence-agent",
        agenceIds: [],
      }),
    ).toEqual([{ ref_type: "STRUCTURE", ref_id: STRUCTURE_ID }]);
  });

  it("structure-agent-fin → [STRUCTURE, AGENCE, CAISSE] quand agenceId et caisseId fournis", () => {
    expect(
      resolveCreateTargetScope({
        parentRefType: "STRUCTURE",
        parentRefId: STRUCTURE_ID,
        role: "profile.bo.structure-agent-fin",
        agenceId: AGENCE_ID,
        caisseId: CAISSE_ID,
      }),
    ).toEqual([
      { ref_type: "STRUCTURE", ref_id: STRUCTURE_ID },
      { ref_type: "AGENCE", ref_id: AGENCE_ID },
      { ref_type: "CAISSE", ref_id: CAISSE_ID },
    ]);
  });

  it("structure-superviseur-fin → [STRUCTURE, AGENCE] quand agenceId fourni", () => {
    expect(
      resolveCreateTargetScope({
        parentRefType: "STRUCTURE",
        parentRefId: STRUCTURE_ID,
        role: "profile.bo.structure-superviseur-fin",
        agenceId: AGENCE_ID,
      }),
    ).toEqual([
      { ref_type: "STRUCTURE", ref_id: STRUCTURE_ID },
      { ref_type: "AGENCE", ref_id: AGENCE_ID },
    ]);
  });

  it("agence-superviseur → [STRUCTURE, AGENCE] quand agenceId fourni", () => {
    expect(
      resolveCreateTargetScope({
        parentRefType: "STRUCTURE",
        parentRefId: STRUCTURE_ID,
        role: "profile.bo.agence-superviseur",
        agenceId: AGENCE_ID,
      }),
    ).toEqual([
      { ref_type: "STRUCTURE", ref_id: STRUCTURE_ID },
      { ref_type: "AGENCE", ref_id: AGENCE_ID },
    ]);
  });

  it("agence-agent → [STRUCTURE, AGENCE, CAISSE] quand agenceId et caisseId fournis", () => {
    expect(
      resolveCreateTargetScope({
        parentRefType: "STRUCTURE",
        parentRefId: STRUCTURE_ID,
        role: "profile.bo.agence-agent",
        agenceId: AGENCE_ID,
        caisseId: CAISSE_ID,
      }),
    ).toEqual([
      { ref_type: "STRUCTURE", ref_id: STRUCTURE_ID },
      { ref_type: "AGENCE", ref_id: AGENCE_ID },
      { ref_type: "CAISSE", ref_id: CAISSE_ID },
    ]);
  });

  it("structure-agent-fin sans agenceId (rattaché au siège) → [STRUCTURE] avec accès global à toutes les agences", () => {
    expect(
      resolveCreateTargetScope({
        parentRefType: "STRUCTURE",
        parentRefId: STRUCTURE_ID,
        role: "profile.bo.structure-agent-fin",
      }),
    ).toEqual([{ ref_type: "STRUCTURE", ref_id: STRUCTURE_ID }]);
  });

  it("agence-superviseur sans agenceId (rattaché au siège) → [STRUCTURE] avec accès global à toutes les agences", () => {
    expect(
      resolveCreateTargetScope({
        parentRefType: "STRUCTURE",
        parentRefId: STRUCTURE_ID,
        role: "profile.bo.agence-superviseur",
      }),
    ).toEqual([{ ref_type: "STRUCTURE", ref_id: STRUCTURE_ID }]);
  });

  it("agence-agent sans agenceId (rattaché au siège) → [STRUCTURE] avec accès global à toutes les agences", () => {
    expect(
      resolveCreateTargetScope({
        parentRefType: "STRUCTURE",
        parentRefId: STRUCTURE_ID,
        role: "profile.bo.agence-agent",
      }),
    ).toEqual([{ ref_type: "STRUCTURE", ref_id: STRUCTURE_ID }]);
  });

  it("profil admin → [ADMIN] avec administrationRefId", () => {
    expect(
      resolveCreateTargetScope({
        parentRefType: "ADMIN",
        parentRefId: "admin-id",
        role: "profile.bo-admin",
        administrationRefId: "admin-scope-id",
      }),
    ).toEqual([{ ref_type: "ADMIN", ref_id: "admin-scope-id" }]);
  });

  it("profil structure-admin → [STRUCTURE] quand le créateur est ADMIN et qu'une structure est fournie", () => {
    expect(
      resolveCreateTargetScope({
        parentRefType: "ADMIN",
        parentRefId: "admin-id",
        role: "profile.bo.structure-admin",
        administrationRefId: "admin-scope-id",
        structureId: STRUCTURE_ID,
      }),
    ).toEqual([{ ref_type: "STRUCTURE", ref_id: STRUCTURE_ID }]);
  });

  it("profil autonome-set-admin → [STRUCTURE, DISTRIBUTOR] quand structure et distributeur fournis", () => {
    expect(
      resolveCreateTargetScope({
        parentRefType: "STRUCTURE",
        parentRefId: STRUCTURE_ID,
        role: "profile.bo.autonome-set-admin",
        structureId: STRUCTURE_ID,
        distributorId: "distrib-444",
      }),
    ).toEqual([
      { ref_type: "STRUCTURE", ref_id: STRUCTURE_ID },
      { ref_type: "DISTRIBUTOR", ref_id: "distrib-444" },
    ]);
  });

  it("profil partenaire → [PARTNER] au même niveau hiérarchique racine que ADMIN", () => {
    expect(
      resolveCreateTargetScope({
        parentRefType: "PARTNER",
        parentRefId: "partner-555",
        role: "profile.bo.partenaire-admin",
        structureId: STRUCTURE_ID,
      }),
    ).toEqual([
      { ref_type: "PARTNER", ref_id: "partner-555" },
    ]);
  });

  it("profil produit → [PRODUCT] au même niveau hiérarchique racine que ADMIN et PARTENAIRE", () => {
    expect(
      resolveCreateTargetScope({
        parentRefType: "PRODUCT",
        parentRefId: "prod-777",
        role: "profile.bo.produit-admin",
        administrationRefId: "admin-root",
        structureId: STRUCTURE_ID,
      }),
    ).toEqual([
      { ref_type: "PRODUCT", ref_id: "prod-777" },
    ]);
  });
});

describe("getScopeRefIdFromToken", () => {
  const encodeTokenPayload = (payload: unknown): string => {
    const base64 = btoa(JSON.stringify(payload));
    const base64url = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    return "header." + base64url + ".signature";
  };

  it("should return null for null token", () => {
    expect(getScopeRefIdFromToken(null, "ADMIN")).toBeNull();
  });

  it("should parse STRUCTURE ref type from token groups", () => {
    const token = encodeTokenPayload({
      groups: ["/STRUCTURE:a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d", "/SOME_OTHER_GROUP"],
    });
    expect(getScopeRefIdFromToken(token, "STRUCTURE")).toBe("a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d");
  });

  it("should parse ADMIN ref type from ADMIN prefix in groups", () => {
    const token = encodeTokenPayload({
      groups: ["/ADMIN:d4c3b2a1-f6e5-8b7a-0d9c-6d5c4b3a2f1e"],
    });
    expect(getScopeRefIdFromToken(token, "ADMIN")).toBe("d4c3b2a1-f6e5-8b7a-0d9c-6d5c4b3a2f1e");
  });


  it("should parse STRUCTURE from hierarchical Keycloak group /PRODUCT:.../STRUCTURE:...", () => {
    const token = encodeTokenPayload({
      groups: [
        "/PRODUCT:76cc91bf-a5b5-4c26-89af-253a7d61915a/STRUCTURE:d9e56eab-12c9-4cfa-bd83-fdecf931c46f",
      ],
    });
    expect(getScopeRefIdFromToken(token, "STRUCTURE")).toBe("d9e56eab-12c9-4cfa-bd83-fdecf931c46f");
  });

  it("should return null if no matching group prefix is found", () => {
    const token = encodeTokenPayload({
      groups: ["/OTHER:some-id"],
    });
    expect(getScopeRefIdFromToken(token, "ADMIN")).toBeNull();
  });
});

describe("resolveHierarchyScopeFromToken", () => {
  const encodeTokenPayload = (payload: unknown): string => {
    const base64 = btoa(JSON.stringify(payload));
    const base64url = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    return "header." + base64url + ".signature";
  };

  it("résout automatiquement le type et l'ID de structure à partir du profil et groupe du token", () => {
    const token = encodeTokenPayload({
      resource_access: {
        "backoffice-web": {
          roles: ["profile.bo.structure-admin", "perm.bo.user.list"],
        },
      },
      groups: [
        "/PRODUCT:76cc91bf-a5b5-4c26-89af-253a7d61915a/STRUCTURE:d9e56eab-12c9-4cfa-bd83-fdecf931c46f",
      ],
    });

    expect(resolveHierarchyScopeFromToken(token)).toEqual({
      refType: "STRUCTURE",
      refId: "d9e56eab-12c9-4cfa-bd83-fdecf931c46f",
    });
  });

  it("résout automatiquement le type ADMIN pour profile.bo-admin", () => {
    const token = encodeTokenPayload({
      resource_access: {
        "backoffice-web": {
          roles: ["profile.bo-admin"],
        },
      },
      groups: ["/ADMIN:8c860cac-ad3c-4fcc-82f1-3061a6814245"],
    });

    expect(resolveHierarchyScopeFromToken(token)).toEqual({
      refType: "ADMIN",
      refId: "8c860cac-ad3c-4fcc-82f1-3061a6814245",
    });
  });

  it("retourne null sans deviner s'il n'y a pas de profil reconnu", () => {
    const token = encodeTokenPayload({
      resource_access: {
        "backoffice-web": {
          roles: ["other.unknown.role"],
        },
      },
      groups: ["/SOME_GROUP:123"],
    });

    expect(resolveHierarchyScopeFromToken(token)).toBeNull();
  });

  it("retourne null sans deviner si le groupe du profil est manquant", () => {
    const token = encodeTokenPayload({
      resource_access: {
        "backoffice-web": {
          roles: ["profile.bo.structure-admin"],
        },
      },
      groups: ["/SOME_OTHER_GROUP:123"],
    });

    expect(resolveHierarchyScopeFromToken(token)).toBeNull();
  });
});

describe("deriveLogin", () => {
  it("génère un login à partir de prénom et nom", () => {
    expect(deriveLogin("Jean", "Dupont")).toBe("j.jeandupont");
  });

  it("génère un suffixe incrémental si le login existe déjà", () => {
    expect(deriveLogin("Jean", "Dupont", ["j.jeandupont"])).toBe("j.jeandupont1");
    expect(deriveLogin("Jean", "Dupont", ["j.jeandupont", "j.jeandupont1"])).toBe("j.jeandupont2");
  });

  it("gère les accents et caractères spéciaux proprement", () => {
    expect(deriveLogin("Élodie", "M'Bappe")).toBe("e.elodiembappe");
  });

  it("retourne une chaîne vide si prénom ou nom manquant", () => {
    expect(deriveLogin("", "Dupont")).toBe("");
    expect(deriveLogin("Jean", "")).toBe("");
  });
});

describe("getDefaultProfileRoles", () => {
  it("retourne les profils par défaut pour Structure", () => {
    const roles = getDefaultProfileRoles("Structure");
    expect(roles).toContain("profile.bo.structure-admin");
    expect(roles).toContain("profile.bo.structure-superviseur-fin");
    expect(roles).toContain("profile.bo.structure-agent-fin");
    expect(roles).toContain("profile.bo.agence-superviseur");
    expect(roles).toContain("profile.bo.agence-agent");
  });

  it("retourne les profils par défaut pour Agence", () => {
    const roles = getDefaultProfileRoles("Agence");
    expect(roles).toEqual([
      "profile.bo.agence-superviseur",
      "profile.bo.agence-agent",
    ]);
  });

  it("retourne les profils par défaut pour Administration", () => {
    const roles = getDefaultProfileRoles("Administration");
    expect(roles).toEqual([
      "profile.bo-admin",
      "profile.bo-controller",
      "profile.bo-profil-technique",
    ]);
  });

  it("retourne les profils par défaut pour Distributeur", () => {
    const roles = getDefaultProfileRoles("Distributeur");
    expect(roles).toEqual([
      "profile.bo.autonome-set-admin",
      "profile.bo.autonome-set-superviseur",
      "profile.bo.autonome-set-agent",
    ]);
  });

  it("retourne les profils par défaut si le contexte est indéfini ou inconnu", () => {
    expect(getDefaultProfileRoles(undefined)).toEqual(DEFAULT_PROFILE_ROLES);
    expect(getDefaultProfileRoles("Inconnu")).toEqual(DEFAULT_PROFILE_ROLES);
  });

  it("filtre correctement les profils par défaut pour un Admin Structure", () => {
    const defaultRoles = getDefaultProfileRoles("Structure");
    const allowed = filterRolesByActorPermissions(
      defaultRoles,
      "Administrateur",
      "Structure",
      ["profile.bo.structure-admin"],
    );
    expect(allowed.length).toBeGreaterThan(0);
    expect(allowed).toContain("profile.bo.structure-admin");
    expect(allowed).toContain("profile.bo.structure-agent-fin");
    expect(allowed).not.toContain("profile.bo-admin");
  });
});
describe("buildUsersFromHierarchyMembers", () => {
  it("préremplit l'agence et la caisse du formulaire de modification", () => {
    // Réponse réelle de GET /hierarchy/STRUCTURE/{id}/members pour a.agentdiop
    const [user] = buildUsersFromHierarchyMembers(
      {
        ref_type: "STRUCTURE",
        ref_id: "9aef8151-56b1-4703-b336-a164bb06a39e",
        ref_label: "STRUCTURE:9aef8151-56b1-4703-b336-a164bb06a39e",
        users: [
          {
            user_id: "63c2fa19-3a0e-4bcd-b85e-b4abdcc448b7",
            username: "a.agentdiop",
            active: true,
            first_name: "AGENT",
            last_name: "Diop",
            profiles: ["profile.bo.agence-agent"],
            agence: "d4e9f121-ab93-4279-a877-5ff00ae37e8c",
            caisse: "caisse-1",
            email: "diop@example.com",
          },
        ],
      },
      "9aef8151-56b1-4703-b336-a164bb06a39e",
    );

    expect(user.agenceId).toBe("d4e9f121-ab93-4279-a877-5ff00ae37e8c");
    expect(user.caisseId).toBe("caisse-1");
  });
});

describe("buildAgencesFilter", () => {
  it("limite les agences à la structure via parent_id / parent_type", () => {
    expect(buildAgencesFilter("STRUCTURE", "9aef8151-56b1-4703-b336-a164bb06a39e")).toEqual({
      parent_id: "9aef8151-56b1-4703-b336-a164bb06a39e",
      parent_type: "STRUCTURE",
    });
  });

  it("ne filtre pas côté API pour les autres niveaux (filtrage fait ensuite sur la liste)", () => {
    expect(buildAgencesFilter("AGENCE", "agence-1")).toBeUndefined();
  });
});

describe("validateUtilisateurForm", () => {
  const emptyForm = {
    username: "",
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    role: "",
    structure: "",
    statut: "Actif" as const,
  };

  it("signale tous les champs obligatoires manquants en une fois", () => {
    expect(validateUtilisateurForm(emptyForm, ["profile.bo.agence-agent"])).toEqual({
      prenom: "Le prénom est obligatoire",
      nom: "Le nom est obligatoire",
      email: "L'e-mail est obligatoire",
      role: "Le profil est obligatoire",
    });
  });

  it("signale un e-mail invalide et la structure manquante pour un admin", () => {
    const errors = validateUtilisateurForm(
      { ...emptyForm, prenom: "Agent", nom: "Diop", email: "diop@", role: "profile.bo.agence-agent" },
      ["profile.bo.agence-agent"],
      true,
    );
    expect(errors).toEqual({
      email: "L'adresse e-mail n'est pas valide",
      structure: "La structure est obligatoire pour ce profil",
    });
  });

  it("ne renvoie aucune erreur pour un formulaire valide", () => {
    expect(
      validateUtilisateurForm(
        { ...emptyForm, prenom: "Agent", nom: "Diop", email: "diop@example.com", role: "profile.bo.agence-agent" },
        ["profile.bo.agence-agent"],
      ),
    ).toEqual({});
  });
});
