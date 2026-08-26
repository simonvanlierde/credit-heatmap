// biome-ignore lint/correctness/noNodejsModules: Playwright tests run in Node.
import { readdirSync, readFileSync } from "node:fs";
// biome-ignore lint/correctness/noNodejsModules: Playwright tests run in Node.
import path from "node:path";
// biome-ignore lint/correctness/noNodejsModules: Playwright tests run in Node.
import process from "node:process";
import { AVAILABLE_LOCALES } from "@credit-generator/core";
import { expect, test } from "@playwright/test";

/**
 * Interface messages live in the app (`src/messages`), not in core: they are
 * chrome, not domain logic, and core stays dependency-free.
 *
 * These guard the failure modes the catalogs actually have — a locale the
 * picker offers but cannot load, a key left behind by a rename, a translated
 * proper noun, malformed ICU, and a dropped placeholder.
 */
const MESSAGES_DIR = path.join(process.cwd(), "src", "messages");

const read = (locale: string): Record<string, string> =>
  JSON.parse(readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8"));

const EN = read("en");
const LOCALES = readdirSync(MESSAGES_DIR)
  .filter((f: string) => f.endsWith(".json"))
  .map((f: string) => f.replace(".json", ""));
const TRANSLATED = LOCALES.filter((l: string) => l !== "en");

/** Placeholder names an ICU message declares: {name}, {count, plural, ...}. */
const placeholders = (s: string) => new Set([...s.matchAll(/\{(\w+)[,}]/g)].map((m) => m[1]));

test.describe("interface messages", () => {
  test("ships a catalog for every locale the language picker offers", () => {
    for (const { code } of AVAILABLE_LOCALES) {
      expect(LOCALES, `the picker offers "${code}" but src/messages/${code}.json is missing`).toContain(code);
    }
  });

  test("uses only keys English defines, so a rename cannot rot silently", () => {
    for (const locale of TRANSLATED) {
      const unknown = Object.keys(read(locale)).filter((key) => !(key in EN));
      expect(unknown, `${locale}.json has keys absent from en.json`).toEqual([]);
    }
  });

  test("never ships an empty string, which would render as a blank control", () => {
    for (const locale of LOCALES) {
      const blank = Object.entries(read(locale))
        .filter(([, value]) => value.trim() === "")
        .map(([key]) => key);
      expect(blank, `${locale}.json has blank values`).toEqual([]);
    }
  });

  test("keeps product and format names untranslated", () => {
    // A submission system will not accept a translated "ORCID" or "CRediT".
    for (const locale of TRANSLATED) {
      for (const [key, value] of Object.entries(read(locale))) {
        for (const term of ["ORCID", "CRediT"]) {
          if (EN[key]?.includes(term)) {
            expect(value, `${locale}.${key} dropped "${term}"`).toContain(term);
          }
        }
      }
    }
  });

  test("balances ICU braces, so a malformed plural cannot reach the runtime", () => {
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(read(locale))) {
        const open = (value.match(/\{/g) ?? []).length;
        const close = (value.match(/\}/g) ?? []).length;
        expect(open, `${locale}.${key} has unbalanced ICU braces: ${value}`).toBe(close);
      }
    }
  });

  test("keeps every placeholder English declares", () => {
    // Dropping {name} from a translation silently loses the contributor's name.
    for (const locale of TRANSLATED) {
      for (const [key, value] of Object.entries(read(locale))) {
        for (const name of placeholders(EN[key] ?? "")) {
          expect(placeholders(value), `${locale}.${key} dropped {${name}}`).toContain(name);
        }
      }
    }
  });
});
