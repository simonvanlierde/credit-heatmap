import { describe, expect, it } from "vitest";
import { loadRoleCatalog, makeRoleTranslator, normalizeLocaleCode } from "../credit-i18n/index";
import { DEFAULT_UI_TRANSLATOR, loadUiCatalog, makeUiTranslator, type UiKey } from "../credit-i18n/ui-strings";
import { generateStatement } from "../generate-statement";
import { parseAuthorText } from "../parse-authors";

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

describe("normalizeLocaleCode", () => {
  it("migrates legacy locale aliases to explicit BCP 47 tags", () => {
    expect(normalizeLocaleCode("pt")).toBe("pt-PT");
    expect(normalizeLocaleCode("zh")).toBe("zh-Hans");
  });

  it("falls back to English for unsupported or malformed values", () => {
    expect(normalizeLocaleCode("xx")).toBe("en");
    expect(normalizeLocaleCode(null)).toBe("en");
  });
});

// Every locale that ships a UI catalog, and every key one may contain.
const UI_LOCALES = ["fr", "de", "es", "it", "pt-PT", "nl", "zh-Hans", "ja"];
const UI_KEYS: UiKey[] = [
  "acknowledgements",
  "lead",
  "equal",
  "supporting",
  "none",
  "contributed",
  "emptyState",
  "equalContributionNote",
  "correspondenceNote",
  "nameListSeparator",
  "segmentSeparator",
  "levelAnnotation",
];

describe("loadUiCatalog", () => {
  it("returns null for en (canonical source) and unknown locales", async () => {
    expect(await loadUiCatalog("en")).toBeNull();
    expect(await loadUiCatalog("xx")).toBeNull();
  });

  it.each(UI_LOCALES)("loads %s with every known key populated", async (locale) => {
    const catalog = await loadUiCatalog(locale);
    expect(catalog).not.toBeNull();

    const entries = Object.entries(catalog ?? {});
    expect(entries).toHaveLength(UI_KEYS.length);
    for (const [key, value] of entries) {
      // Catches a key left behind after a rename or removal, which would
      // otherwise sit in the catalogs untranslated and unnoticed.
      expect(UI_KEYS).toContain(key);
      expect(value.trim()).not.toBe("");
    }
  });
});

describe("makeUiTranslator", () => {
  it("falls back to English for a missing or blank override", () => {
    const t = makeUiTranslator({ lead: "Principal", equal: "" });
    expect(t("lead")).toBe("Principal");
    expect(t("equal")).toBe("Equal"); // blank override → English, not a blank label
    expect(t("none")).toBe("None"); // absent from the catalog → English
    expect(DEFAULT_UI_TRANSLATOR("acknowledgements")).toBe("Acknowledgements");
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
