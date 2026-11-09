    import { describe, expect, it } from "vitest";
import { FrontFeatureKey, can, hasFrontFeatureAccess } from "@/core/permissions/permissions";

const adminStructurePermissions = [
  "perm.bo.enrollment.add",
  "perm.bo.caisse.add",
  "perm.bo.enrollment.resend-code",
  "perm.bo.caisse.deactivate",
  "perm.bo.enrollment.validate",
  "perm.bo.user.deactivate",
  "perm.bo.user.list",
  "perm.bo.enrollment.delete",
  "perm.bo.autonome-set.update",
  "perm.bo.user.add",
  "perm.bo.enrollment.password-update",
  "perm.bo.enrollment.unsubscribe",
  "perm.bo.autonome-set.delete",
  "profile.bo.structure-admin",
  "perm.bo.agence.deactivate",
  "perm.bo.agence.list",
  "perm.bo.autonome-set.list",
  "perm.bo.autonome-set.add",
  "perm.bo.caisse.delete",
  "perm.bo.caisse.list",
  "perm.bo.caisse.update",
  "perm.bo.enrollment.list",
  "perm.bo.agence.delete",
  "perm.bo.agence.update",
  "perm.bo.agence.add",
  "perm.bo.user.update",
  "perm.bo.autonome-set.deactivate",
  "perm.bo.user.delete",
] as const;

describe("hasFrontFeatureAccess", () => {
  it("shows only the modules allowed for an Admin Structure token", () => {
    const expectations: Record<FrontFeatureKey, boolean> = {
      dashboard: true,
      partenaires: false,
      produits: false,
      structures: false,
      agences: true,
      caisses: true,
      utilisateurs: true,
      clients: true,
      distributeurs: true,
      packages: false,
      parametres: true,
      tracking: false,
      releves: false,
    };

    for (const [feature, expected] of Object.entries(expectations) as Array<[FrontFeatureKey, boolean]>) {
      expect(hasFrontFeatureAccess(feature, adminStructurePermissions)).toBe(expected);
    }
  });

  it("does not grant Structures from enrollment.list alone", () => {
    expect(hasFrontFeatureAccess("structures", ["perm.bo.enrollment.list"])) .toBe(false);
    expect(hasFrontFeatureAccess("clients", ["perm.bo.enrollment.list"])) .toBe(true);
  });

  it("shows only the modules allowed for a Contrôleur Structure token", () => {
    const controleurStructurePermissions = [
      "perm.bo.enrollment.list",
      "perm.bo.agence.list",
      "profile.bo.structure-controller",
      "perm.bo.autonome-set.list",
      "perm.bo.caisse.list",
      "perm.bo.user.list",
    ] as const;

    const expectations: Record<FrontFeatureKey, boolean> = {
      dashboard: true,
      partenaires: false,
      produits: false,
      structures: false,
      agences: true,
      caisses: true,
      utilisateurs: true,
      clients: true,
      distributeurs: true,
      packages: false,
      parametres: false,
      tracking: false,
      releves: false,
    };

    for (const [feature, expected] of Object.entries(expectations) as Array<[FrontFeatureKey, boolean]>) {
      expect(hasFrontFeatureAccess(feature, controleurStructurePermissions)).toBe(expected);
    }
  });

  it("shows only the modules allowed for a Contrôleur Administration token", () => {
    const controleurAdministrationPermissions = [
      "perm.bo.enrollment.list",
      "perm.bo.agence.list",
      "perm.bo.produit.list",
      "perm.bo.autonome-set.list",
      "profile.bo-controller",
      "perm.bo.caisse.list",
      "perm.bo.structure.list",
      "perm.bo.user.list",
    ] as const;

    const expectations: Record<FrontFeatureKey, boolean> = {
      dashboard: true,
      partenaires: false,
      produits: true,
      structures: true,
      agences: true,
      caisses: true,
      utilisateurs: true,
      clients: true,
      distributeurs: true,
      packages: false,
      parametres: false,
      tracking: false,
      releves: false,
    };

    for (const [feature, expected] of Object.entries(expectations) as Array<[FrontFeatureKey, boolean]>) {
      expect(hasFrontFeatureAccess(feature, controleurAdministrationPermissions)).toBe(expected);
    }

    expect(can("Contrôleur", "read", "Produit", controleurAdministrationPermissions)).toBe(true);
    expect(can("Contrôleur", "create", "Produit", controleurAdministrationPermissions)).toBe(false);
    expect(hasFrontFeatureAccess("packages", ["perm.bo.package.list"])).toBe(true);
  });

  it("shows only the modules allowed for a Gestionnaire Produits Central token", () => {
    const gestionnaireProduitCentralPermissions = [
      "perm.bo.enrollment.list",
      "profile.bo.produit-central",
      "perm.bo.structure.list",
    ] as const;

    const expectations: Record<FrontFeatureKey, boolean> = {
      dashboard: true,
      partenaires: false,
      produits: false,
      structures: true,
      agences: false,
      caisses: false,
      utilisateurs: false,
      clients: true,
      distributeurs: false,
      packages: false,
      parametres: true,
      tracking: false,
      releves: false,
    };

    for (const [feature, expected] of Object.entries(expectations) as Array<[FrontFeatureKey, boolean]>) {
      expect(hasFrontFeatureAccess(feature, gestionnaireProduitCentralPermissions)).toBe(expected);
    }
  });

  it("shows only the modules allowed for an Agent Financier Structure token", () => {
    const agentFinancierStructurePermissions = [
      "profile.bo.structure-agent-fin",
    ] as const;

    const expectations: Record<FrontFeatureKey, boolean> = {
      dashboard: false,
      partenaires: false,
      produits: false,
      structures: false,
      agences: false,
      caisses: false,
      utilisateurs: false,
      clients: false,
      distributeurs: false,
      packages: false,
      parametres: false,
      tracking: false,
      releves: false,
    };

    for (const [feature, expected] of Object.entries(expectations) as Array<[FrontFeatureKey, boolean]>) {
      expect(hasFrontFeatureAccess(feature, agentFinancierStructurePermissions)).toBe(expected);
    }
  });

  it("does not grant front features from admin profiles alone", () => {
    expect(hasFrontFeatureAccess("dashboard", ["profile.bo-admin"])) .toBe(false);
    expect(hasFrontFeatureAccess("partenaires", ["profile.bo-admin"])).toBe(true);
    expect(hasFrontFeatureAccess("parametres", ["profile.bo-admin"])) .toBe(true);
  });

  it("shows only the modules allowed for an Agent Agence token", () => {
    const agentAgencePermissions = [
      "perm.bo.enrollment.list",
      "perm.bo.enrollment.add",
      "perm.bo.enrollment.password-update",
      "profile.bo.agence-agent",
    ] as const;

    const expectations: Record<FrontFeatureKey, boolean> = {
      dashboard: true,
      partenaires: false,
      produits: false,
      structures: false,
      agences: false,
      caisses: false,
      utilisateurs: false,
      clients: true,
      distributeurs: false,
      packages: false,
      parametres: false,
      tracking: false,
      releves: false,
    };

    for (const [feature, expected] of Object.entries(expectations) as Array<[FrontFeatureKey, boolean]>) {
      expect(hasFrontFeatureAccess(feature, agentAgencePermissions)).toBe(expected);
    }

    expect(can("Agent", "read", "Structure", agentAgencePermissions)).toBe(false);
    expect(can("Agent", "read", "Agence", agentAgencePermissions)).toBe(false);
    expect(can("Agent", "read", "Caisse", agentAgencePermissions)).toBe(false);
    expect(can("Agent", "read", "Utilisateurs", agentAgencePermissions)).toBe(false);
  });

  it("shows only the modules allowed for an Administrateur Distributeur token", () => {
    const autonomeAdminPermissions = [
      "perm.bo.agence.deactivate",
      "perm.bo.caisse.delete",
      "perm.bo.caisse.list",
      "perm.bo.caisse.add",
      "perm.bo.caisse.deactivate",
      "perm.bo.user.deactivate",
      "perm.bo.user.list",
      "perm.bo.caisse.update",
      "perm.bo.enrollment.list",
      "perm.bo.agence.delete",
      "perm.bo.agence.update",
      "profile.bo.autonome-set-admin",
      "perm.bo.agence.add",
      "perm.bo.user.update",
      "perm.bo.user.add",
      "perm.bo.user.delete",
    ] as const;

    const expectations: Record<FrontFeatureKey, boolean> = {
      dashboard: true,
      partenaires: false,
      produits: false,
      structures: false,
      agences: true,
      caisses: true,
      utilisateurs: true,
      clients: true,
      distributeurs: false,
      packages: false,
      parametres: true,
      tracking: false,
      releves: false,
    };

    for (const [feature, expected] of Object.entries(expectations) as Array<[FrontFeatureKey, boolean]>) {
      expect(hasFrontFeatureAccess(feature, autonomeAdminPermissions)).toBe(expected);
    }

    // profile.bo.autonome-set-admin seul ne donne ni visibilite ni CRUD sans perm.bo.autonome-set.*
    expect(can("Administrateur", "read", "Distributeur", autonomeAdminPermissions)).toBe(false);
    expect(can("Administrateur", "create", "Distributeur", autonomeAdminPermissions)).toBe(false);
    expect(can("Administrateur", "update", "Distributeur", autonomeAdminPermissions)).toBe(false);
    expect(can("Administrateur", "delete", "Distributeur", autonomeAdminPermissions)).toBe(false);
  });

  it("shows only the modules allowed for a Superviseur Distributeur token", () => {
    const autonomeSuperviseurPermissions = [
      "perm.bo.enrollment.list",
      "perm.bo.enrollment.delete",
      "perm.bo.agence.add",
      "profile.bo.autonome-set-superviseur",
      "perm.bo.enrollment.add",
      "perm.bo.caisse.list",
      "perm.bo.enrollment.resend-code",
      "perm.bo.enrollment.validate",
      "perm.bo.user.list",
      "perm.bo.enrollment.unsubscribe",
    ] as const;

    const expectations: Record<FrontFeatureKey, boolean> = {
      dashboard: true,
      partenaires: false,
      produits: false,
      structures: false,
      agences: true,
      caisses: true,
      utilisateurs: true,
      clients: true,
      distributeurs: false,
      packages: false,
      parametres: false,
      tracking: false,
      releves: false,
    };

    for (const [feature, expected] of Object.entries(expectations) as Array<[FrontFeatureKey, boolean]>) {
      expect(hasFrontFeatureAccess(feature, autonomeSuperviseurPermissions)).toBe(expected);
    }
  });

  it("shows only the modules allowed for an Agent Distributeur token", () => {
    const autonomeAgentPermissions = [
      "perm.bo.enrollment.list",
      "perm.bo.enrollment.add",
      "profile.bo.autonome-set-agent",
    ] as const;

    const expectations: Record<FrontFeatureKey, boolean> = {
      dashboard: true,
      partenaires: false,
      produits: false,
      structures: false,
      agences: false,
      caisses: false,
      utilisateurs: false,
      clients: true,
      distributeurs: false,
      packages: false,
      parametres: false,
      tracking: false,
      releves: false,
    };

    for (const [feature, expected] of Object.entries(expectations) as Array<[FrontFeatureKey, boolean]>) {
      expect(hasFrontFeatureAccess(feature, autonomeAgentPermissions)).toBe(expected);
    }
  });

  it("grants Distributeur CRUD only with explicit perm.bo.autonome-set.* permissions", () => {
    const withExplicitPerms = [
      "perm.bo.autonome-set.list",
      "perm.bo.autonome-set.add",
      "perm.bo.autonome-set.update",
      "perm.bo.autonome-set.delete",
      "profile.bo.autonome-set-admin",
    ] as const;
    expect(can("Administrateur", "read", "Distributeur", withExplicitPerms)).toBe(true);
    expect(can("Administrateur", "create", "Distributeur", withExplicitPerms)).toBe(true);
    expect(can("Administrateur", "update", "Distributeur", withExplicitPerms)).toBe(true);
    expect(can("Administrateur", "delete", "Distributeur", withExplicitPerms)).toBe(true);
    expect(hasFrontFeatureAccess("distributeurs", withExplicitPerms)).toBe(true);
  });

  it("shows only the modules allowed for a Superviseur Agence token", () => {
    const agenceSuperviseurPermissions = [
      "perm.bo.enrollment.list",
      "perm.bo.enrollment.delete",
      "perm.bo.agence.add",
      "perm.bo.enrollment.add",
      "perm.bo.caisse.list",
      "perm.bo.enrollment.resend-code",
      "perm.bo.enrollment.password-update",
      "profile.bo.agence-superviseur",
      "perm.bo.enrollment.validate",
      "perm.bo.user.list",
      "perm.bo.enrollment.unsubscribe",
    ] as const;

    const expectations: Record<FrontFeatureKey, boolean> = {
      dashboard: true,
      partenaires: false,
      produits: false,
      structures: false,
      agences: true,
      caisses: true,
      utilisateurs: true,
      clients: true,
      distributeurs: false,
      packages: false,
      parametres: false,
      tracking: false,
      releves: false,
    };

    for (const [feature, expected] of Object.entries(expectations) as Array<[FrontFeatureKey, boolean]>) {
      expect(hasFrontFeatureAccess(feature, agenceSuperviseurPermissions)).toBe(expected);
    }

    expect(can("Superviseur", "create", "Agence", agenceSuperviseurPermissions)).toBe(true);
    expect(can("Superviseur", "read", "Agence", agenceSuperviseurPermissions)).toBe(false);
    expect(can("Superviseur", "read", "Caisse", agenceSuperviseurPermissions)).toBe(true);
    expect(can("Superviseur", "read", "Utilisateurs", agenceSuperviseurPermissions)).toBe(true);
    expect(hasFrontFeatureAccess("clients", agenceSuperviseurPermissions)).toBe(true);
  });
  it("grants Tracking only with the dedicated perm.bo.tracking.list permission", () => {
    expect(hasFrontFeatureAccess("tracking", [...adminStructurePermissions, "perm.bo.tracking.list"])).toBe(true);
    expect(hasFrontFeatureAccess("tracking", ["perm.bo.tracking.export"])).toBe(false);
    expect(hasFrontFeatureAccess("tracking", ["profile.bo-admin"])).toBe(true);
    expect(hasFrontFeatureAccess("tracking", adminStructurePermissions)).toBe(false);
  });
});