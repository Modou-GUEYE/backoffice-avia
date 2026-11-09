import { describe, expect, it } from "vitest";
import { buildHabilitationAccess, getProfileRowRights, hasHabilitationAccess } from "./permissions";

describe("hasHabilitationAccess", () => {
  it("n'accorde plus d'accès automatique à l'administrateur de structure", () => {
    expect(hasHabilitationAccess(["profile.bo.structure-admin"], false)).toBe(false);
  });

  it("accorde l'accès aux administrateurs ou avec une permission perm.bo.habilitation.*", () => {
    expect(hasHabilitationAccess([], true)).toBe(true);
    expect(hasHabilitationAccess(["perm.bo.habilitation.permission.list"], false)).toBe(true);
  });
});

describe("buildHabilitationAccess", () => {
  it("sépare les sous-onglets selon les permissions", () => {
    const access = buildHabilitationAccess(["perm.bo.habilitation.permission.list"], false);
    expect(access.permission.view).toBe(true);
    expect(access.profile.view).toBe(false);
    expect(access.mobile).toBe(false);
  });
});

describe("getProfileRowRights", () => {
  const editor = [
    "profile.bo.structure-admin",
    "perm.bo.habilitation.profile.update",
    "perm.bo.habilitation.profile.assign",
    "perm.bo.habilitation.profile.delete",
  ];
  const access = buildHabilitationAccess(editor, false);

  it("autorise toutes les actions sur un profil tiers", () => {
    expect(getProfileRowRights(access, "profile.bo.controleur", editor)).toEqual({
      edit: true,
      updateDetails: true,
      assign: true,
      delete: true,
    });
  });

  it("interdit de modifier les permissions ou de supprimer ses propres profils", () => {
    expect(getProfileRowRights(access, "profile.bo.structure-admin", editor)).toEqual({
      edit: true,
      updateDetails: true,
      assign: false,
      delete: false,
    });
  });

  it("réserve les profils administrateurs aux administrateurs back-office", () => {
    expect(getProfileRowRights(access, "profile.bo-admin", editor).edit).toBe(false);
    const admin = buildHabilitationAccess([], true);
    expect(getProfileRowRights(admin, "profile.bo-admin", []).assign).toBe(true);
  });
});
