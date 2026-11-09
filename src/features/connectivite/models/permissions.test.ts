import { describe, expect, it } from "vitest";
import { buildConnectivitePermissions, hasBankingAccess, scopeConnectivitePermissions } from "./permissions";

const hasPermFrom = (perms: string[]) => (perm: string) => perms.includes(perm);

describe("hasBankingAccess", () => {
  it("accorde l'accès avec la permission historique ou une permission de sous-onglet", () => {
    expect(hasBankingAccess(["perm.bo.banking.list"])).toBe(true);
    expect(hasBankingAccess(["perm.bo.banking.endpoint.test"])).toBe(true);
  });

  it("refuse l'accès sans permission perm.bo.banking.*", () => {
    expect(hasBankingAccess(["perm.bo.workflow.list"])).toBe(false);
    expect(hasBankingAccess(undefined)).toBe(false);
  });
});

describe("buildConnectivitePermissions", () => {
  it("n'ouvre aucun sous-onglet avec la seule permission historique", () => {
    const perms = buildConnectivitePermissions(hasPermFrom(["perm.bo.banking.list"]));
    expect(perms.connection.view).toBe(false);
    expect(perms.operation.view).toBe(false);
    expect(perms.endpoint.view).toBe(false);
  });

  it("ouvre un sous-onglet en lecture seule avec sa permission de consultation", () => {
    const perms = buildConnectivitePermissions(hasPermFrom(["perm.bo.banking.connection.read"]));
    expect(perms.connection).toEqual({ view: true, update: false, delete: false });
  });

  it("rend un sous-onglet visible dès qu'une de ses actions est accordée", () => {
    const perms = buildConnectivitePermissions(hasPermFrom(["perm.bo.banking.endpoint.test"]));
    expect(perms.endpoint).toEqual({ view: true, update: false, test: true, delete: false });
    expect(perms.operation.view).toBe(false);
  });

  it("distingue activation et désactivation des opérations", () => {
    const perms = buildConnectivitePermissions(
      hasPermFrom(["perm.bo.banking.operation.list", "perm.bo.banking.operation.activate"]),
    );
    expect(perms.operation.activate).toBe(true);
    expect(perms.operation.deactivate).toBe(false);
  });
});

describe("scopeConnectivitePermissions", () => {
  const editor = [
    "perm.bo.banking.connection.update",
    "perm.bo.banking.connection.delete",
    "perm.bo.banking.endpoint.update",
    "perm.bo.banking.endpoint.delete",
    "perm.bo.banking.endpoint.test",
  ];

  it("conserve les droits sur une structure", () => {
    const perms = buildConnectivitePermissions(hasPermFrom(editor));
    expect(scopeConnectivitePermissions(perms, false)).toBe(perms);
  });

  it("retire les modifications sur les valeurs globales sans perm.bo.banking.defaults.update", () => {
    const scoped = scopeConnectivitePermissions(buildConnectivitePermissions(hasPermFrom(editor)), true);
    expect(scoped.connection).toEqual({ view: true, update: false, delete: false });
    expect(scoped.endpoint).toEqual({ view: true, update: false, test: true, delete: false });
  });

  it("autorise les modifications sur les valeurs globales avec perm.bo.banking.defaults.update", () => {
    const scoped = scopeConnectivitePermissions(
      buildConnectivitePermissions(hasPermFrom([...editor, "perm.bo.banking.defaults.update"])),
      true,
    );
    expect(scoped.connection.update).toBe(true);
    expect(scoped.endpoint.update).toBe(true);
  });
});
