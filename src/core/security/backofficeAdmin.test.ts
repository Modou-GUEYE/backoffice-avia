import { describe, expect, it } from "vitest";
import { isBackofficeAdminActor } from "./backofficeAdmin";

describe("isBackofficeAdminActor", () => {
  it("reconnaît le rôle Administrateur de l'Administration et les profils admin", () => {
    expect(isBackofficeAdminActor("Administrateur", "Administration", [])).toBe(true);
    expect(isBackofficeAdminActor(undefined, undefined, ["profile.bo-admin"])).toBe(true);
  });

  it("ne confond pas l'administrateur de structure avec un administrateur back-office", () => {
    expect(isBackofficeAdminActor("Administrateur", "Structure", ["profile.bo.structure-admin"])).toBe(false);
  });
});
