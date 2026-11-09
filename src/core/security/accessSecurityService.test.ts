import { describe, it, expect, vi, beforeEach } from "vitest";

const { post, get } = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));

vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  const instance = { post, get, put: vi.fn(), patch: vi.fn(), delete: vi.fn(), interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } };
  return { ...actual, default: { ...actual.default, create: () => instance, isAxiosError: actual.default.isAxiosError } };
});

import { createBackofficeUser, listHierarchyMembers, normalizeRefTypeForBackend } from "./accessSecurityService";

describe("Access Security : type de rattachement agence conforme au contrat (AGENCY)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalise AGENCE et AGENCY en AGENCY, sans toucher aux autres types", () => {
    expect(normalizeRefTypeForBackend("AGENCE")).toBe("AGENCY");
    expect(normalizeRefTypeForBackend("AGENCY")).toBe("AGENCY");
    expect(normalizeRefTypeForBackend("STRUCTURE")).toBe("STRUCTURE");
    expect(normalizeRefTypeForBackend("CAISSE")).toBe("CAISSE");
  });

  it("envoie AGENCY pour chaque agence du target_scope à la création", async () => {
    post.mockResolvedValue({ data: {} });
    await createBackofficeUser({
      username: "a.diop",
      email: "a.diop@example.com",
      profiles: ["profile.bo.agence-superviseur"],
      target_scope: [
        { ref_type: "STRUCTURE", ref_id: "s-1" },
        { ref_type: "AGENCE", ref_id: "ag-1" },
        { ref_type: "AGENCE", ref_id: "ag-2" },
      ],
    });
    expect(post.mock.calls[0][1].target_scope).toEqual([
      { ref_type: "STRUCTURE", ref_id: "s-1" },
      { ref_type: "AGENCY", ref_id: "ag-1" },
      { ref_type: "AGENCY", ref_id: "ag-2" },
    ]);
  });

  it("interroge les membres d'une agence avec AGENCY dans le chemin", async () => {
    get.mockResolvedValue({ data: { users: [] } });
    await listHierarchyMembers("AGENCE", "ag-1");
    expect(get.mock.calls[0][0]).toBe("/v1/users/hierarchy/AGENCY/ag-1/members");
  });
});
