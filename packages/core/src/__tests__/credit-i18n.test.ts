import { describe, expect, it } from "vitest";
import { loadRoleCatalog, makeRoleTranslator } from "../credit-i18n/index.js";
import { generateStatement } from "../generate-statement.js";
import { parseAuthorText } from "../parse-authors.js";

function makeAuthors() {
  const authors = parseAuthorText("Jane Smith\nBob White");
  const [jane, bob] = authors;
  if (!(jane && bob)) throw new Error("expected 2 authors");
  const janeConc = jane.contributions[0]; // Conceptualization
  const bobInv = bob.contributions[4]; // Investigation
  if (!(janeConc && bobInv)) throw new Error("expected contributions");
  janeConc.score = 100;
  bobInv.score = 100;
  return authors;
}

describe("makeRoleTranslator", () => {
  it("falls back to English when catalog is null", () => {
    const t = makeRoleTranslator(null);
    expect(t("Conceptualization")).toBe("Conceptualization");
  });

  it("passes through unknown role names without throwing", () => {
    const t = makeRoleTranslator({});
    expect(t("Not A Role")).toBe("Not A Role");
  });
});

describe("loadRoleCatalog", () => {
  it("returns null for en (canonical source) and unknown locales", async () => {
    expect(await loadRoleCatalog("en")).toBeNull();
    expect(await loadRoleCatalog("xx")).toBeNull();
  });

  it("localizes role names for a vendored locale", async () => {
    const catalog = await loadRoleCatalog("fr");
    const t = makeRoleTranslator(catalog);
    // From the credit-translation repo's fr_Latn.json.
    expect(t("Conceptualization")).toBe("Conceptualisation");
  });
});

describe("generateStatement with translateRole", () => {
  it("translates role names while keeping the CRediT: scaffolding English", async () => {
    const t = makeRoleTranslator(await loadRoleCatalog("fr"));
    const stmt = generateStatement(makeAuthors(), { format: "by-role", translateRole: t });
    expect(stmt).toMatch(/^CRediT: /);
    expect(stmt).toContain("Conceptualisation: Jane Smith");
    expect(stmt).not.toContain("Conceptualization:");
  });
});
