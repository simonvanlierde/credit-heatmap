import { getRoleByName } from "../credit-roles.js";

/**
 * Localized CRediT role names/descriptions, sourced from the community
 * credit-translation repo and keyed by the canonical NISO role URL:
 *   https://github.com/contributorshipcollaboration/credit-translation
 *
 * Output-only: this localizes the *displayed* role names in the generated
 * statement and human-facing exports (markdown, heatmap SVG). The data model,
 * CSV/XML/JSON interchange, and app UI chrome stay in canonical English.
 */

export interface RoleTranslation {
  name: string;
  description: string;
}

/** A locale's catalog, keyed by NISO role URL — matches the upstream `translations` object. */
export type RoleCatalog = Record<string, RoleTranslation>;

/** Maps a canonical English role name to its localized display name. */
export type RoleTranslator = (englishName: string) => string;

interface CatalogFile {
  default: { translations: RoleCatalog };
}

// One static import() per vendored locale so bundlers code-split each catalog
// (only the selected language ships to the client). Regenerate the JSON with
// scripts/fetch-credit-translations.mjs; add a line here for each new locale.
const LOADERS: Record<string, () => Promise<CatalogFile>> = {
  fr: () => import("./translations/fr.json"),
  de: () => import("./translations/de.json"),
  es: () => import("./translations/es.json"),
  it: () => import("./translations/it.json"),
  pt: () => import("./translations/pt.json"),
  nl: () => import("./translations/nl.json"),
  zh: () => import("./translations/zh.json"),
  ja: () => import("./translations/ja.json"),
};

export interface LocaleInfo {
  code: string;
  name: string;
}

/** Locales offered in the output language picker. `en` is the canonical source (no catalog). */
export const AVAILABLE_LOCALES: LocaleInfo[] = [
  { code: "en", name: "English" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "es", name: "Español" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "nl", name: "Nederlands" },
  { code: "zh", name: "中文" },
  { code: "ja", name: "日本語" },
];

/** Load a locale's role catalog. Returns null for `en` or any unknown locale (→ identity translator). */
export async function loadRoleCatalog(locale: string): Promise<RoleCatalog | null> {
  const loader = LOADERS[locale];
  if (!loader) return null;
  const mod = await loader();
  return mod.default.translations;
}

/**
 * Build a role-name translator from a catalog. Maps English name → NISO URL →
 * localized name, falling back to the English name when the catalog is null or
 * lacks the role. Safe to call with any string (unknown names pass through).
 */
export function makeRoleTranslator(catalog: RoleCatalog | null | undefined): RoleTranslator {
  if (!catalog) return (name) => name;
  return (name) => {
    try {
      return catalog[getRoleByName(name).url]?.name ?? name;
    } catch {
      return name;
    }
  };
}

/** Identity role translator (no catalog) — the canonical English default. */
export const DEFAULT_ROLE_TRANSLATOR: RoleTranslator = makeRoleTranslator(null);
