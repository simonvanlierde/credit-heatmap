/**
 * UI-string translations — the non-role strings in human-facing output
 * (statement + heatmap): "Acknowledgements", the contribution-level labels, the
 * heatmap title, and the empty-state line.
 *
 * Mirrors the role-catalog setup (one lazy-loaded JSON per locale, code-split by
 * the bundler) so the live UI and exports share one mechanism and this can grow
 * to cover the whole app. English is the canonical source and the per-key
 * fallback; per-locale catalogs in ./ui/ hold only the overrides. Our strings,
 * not the community role repo's — hence a separate directory.
 */

export type UiKey =
  | "acknowledgements"
  | "lead"
  | "equal"
  | "supporting"
  | "none"
  | "contributed"
  | "heatmapTitle"
  | "emptyState";

export type UiTranslator = (key: UiKey) => string;

/** A locale's overrides; any missing key falls back to {@link EN_UI}. */
export type UiCatalog = Partial<Record<UiKey, string>>;

/** Canonical English — the source text and the fallback for any missing entry. */
const EN_UI: Record<UiKey, string> = {
  acknowledgements: "Acknowledgements",
  lead: "Lead",
  equal: "Equal",
  supporting: "Supporting",
  none: "None",
  contributed: "Contributed",
  heatmapTitle: "CRediT Contribution Heatmap",
  emptyState: "No contributions assigned yet.",
};

// One static import() per locale so bundlers code-split each catalog (only the
// selected language ships to the client). Add a line here for each new locale.
const LOADERS: Record<string, () => Promise<{ default: UiCatalog }>> = {
  fr: () => import("./ui/fr.json"),
  de: () => import("./ui/de.json"),
  es: () => import("./ui/es.json"),
  it: () => import("./ui/it.json"),
  pt: () => import("./ui/pt.json"),
  nl: () => import("./ui/nl.json"),
  zh: () => import("./ui/zh.json"),
  ja: () => import("./ui/ja.json"),
};

/** Load a locale's UI catalog. Returns null for `en` or any unknown locale (→ English). */
export async function loadUiCatalog(locale: string): Promise<UiCatalog | null> {
  const loader = LOADERS[locale];
  if (!loader) return null;
  const mod = await loader();
  return mod.default;
}

/**
 * Build a UI-string translator from a catalog. Falls back to canonical English
 * when the catalog is null/undefined or is missing the key.
 */
export function makeUiTranslator(catalog: UiCatalog | null | undefined): UiTranslator {
  if (!catalog) return (key) => EN_UI[key];
  return (key) => catalog[key] ?? EN_UI[key];
}

/** Canonical English UI translator (no catalog) — the default for all consumers. */
export const DEFAULT_UI_TRANSLATOR: UiTranslator = makeUiTranslator(null);
