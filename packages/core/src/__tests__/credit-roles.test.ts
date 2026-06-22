import { describe, expect, it } from "vitest";
import { CREDIT_ROLES, getRoleByName } from "../credit-roles.js";

describe("CREDIT_ROLES", () => {
  it("defines exactly the 14 NISO roles with unique names and official URLs", () => {
    expect(CREDIT_ROLES).toHaveLength(14);

    const names = CREDIT_ROLES.map((r) => r.name);
    expect(new Set(names).size).toBe(14);

    for (const role of CREDIT_ROLES) {
      expect(role.description.length).toBeGreaterThan(0);
      expect(role.url).toMatch(/^https:\/\/credit\.niso\.org\/contributor-roles\//);
    }
  });
});

describe("getRoleByName", () => {
  it("returns the matching role", () => {
    expect(getRoleByName("Software").url).toBe("https://credit.niso.org/contributor-roles/software/");
  });

  it("throws on an unknown role", () => {
    expect(() => getRoleByName("Nonexistent")).toThrow(/Unknown CRediT role/);
  });
});
