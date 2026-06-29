import type { Author } from "../author.js";
import { rolesWithContributions } from "../author.js";
import { DEFAULT_MONO_COLOR, heatCellColor } from "../contributor-color.js";
import type { RoleTranslator } from "../credit-i18n/index.js";
import { makeUiTranslator, type UiTranslator } from "../credit-i18n/ui-strings.js";
import { CREDIT_ROLES } from "../credit-roles.js";
import { escapeXml } from "./escape-xml.js";

// Layout constants (unscaled)
const CELL = 22;
const GAP = 2;
const PAD = 24;
const TITLE_H = 26;
const FONT = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";

// Ink-on-paper neutrals (matching the UI identity)
const COLOR_TEXT = "#16181c";
const COLOR_TEXT_DIM = "#595c63";
const COLOR_BG = "#fafaf9";
const COLOR_BORDER = "#e4e4e1";

export interface HeatmapSvgOptions {
  /** Base hue for the heatmap; defaults to the app accent. */
  monoColor?: string;
  /** Swap axes: authors down the left, roles across the top. */
  transpose?: boolean;
  /**
   * Grade cell fills by contribution level. When false, fills are flat
   * (contributed/none) and the legend collapses to two keys. Defaults to true.
   */
  showLevels?: boolean;
  /**
   * Label authors by their initials (true) or full names (false) on the axis.
   * Defaults to true. The legend always uses initials badges.
   */
  acronyms?: boolean;
  /** Scale all layout dimensions (min 0.1). */
  scale?: number;
  /** Localize displayed role names. Defaults to identity; lookups stay canonical English. */
  translateRole?: RoleTranslator;
  /** Localize the title, level legend, and empty-state line. Defaults to English. */
  translateUi?: UiTranslator;
}

/**
 * Render a contribution heatmap as a self-contained SVG string.
 *
 * Pure and dependency-free — runs in the browser (for live preview, SVG
 * download, and canvas→PNG export) and in Node (for tests). The SVG uses
 * system font stacks, so no font embedding is required.
 *
 * The label bands are orientation-aware: the axis carrying long role names gets
 * a wide/tall band, the one carrying short initials gets a small one, so the
 * grid sits tight under the title and nothing overflows the viewBox. Roles that
 * no author contributed to are omitted, matching the live chart.
 */
export function buildHeatmapSvg(authors: Author[], opts?: HeatmapSvgOptions): string {
  const transpose = !!opts?.transpose;
  const scale = typeof opts?.scale === "number" ? Math.max(0.1, opts.scale) : 1;
  const monoColor = opts?.monoColor ?? DEFAULT_MONO_COLOR;
  const showLevels = opts?.showLevels ?? true;
  const translateRole = opts?.translateRole ?? ((name: string) => name);
  const translateUi = opts?.translateUi ?? makeUiTranslator(null);
  const acronyms = opts?.acronyms ?? true;
  const authorLabel = (ai: number): string =>
    (acronyms ? authors[ai]?.initials : authors[ai]?.name) ?? authors[ai]?.initials ?? "";

  // Only roles someone contributed to (matches the live chart).
  const activeRoleNames = new Set(rolesWithContributions(authors));
  const roles = CREDIT_ROLES.filter((r) => activeRoleNames.has(r.name));

  const PAD_S = PAD * scale;
  const TITLE_S = TITLE_H * scale;

  // Nothing to show — render a small titled placeholder rather than a 0-row grid.
  if (roles.length === 0) {
    const w = 320 * scale;
    const h = 84 * scale;
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
      `<rect width="${w}" height="${h}" fill="${COLOR_BG}"/>`,
      `<text x="${PAD_S}" y="${PAD_S + 14}" font-family="${FONT}" font-size="13" font-weight="600" fill="${COLOR_TEXT}">${escapeXml(translateUi("heatmapTitle"))}</text>`,
      `<text x="${PAD_S}" y="${PAD_S + 40}" font-family="${FONT}" font-size="${11 * scale}" fill="${COLOR_TEXT_DIM}">${escapeXml(translateUi("emptyState"))}</text>`,
      "</svg>",
    ].join("\n");
  }

  const nAuthors = authors.length;
  const nRoles = roles.length;

  const scoreFor = (author: Author | undefined, roleName: string): number =>
    author?.contributions.find((c) => c.role === roleName)?.score ?? 0;
  // Flat mode collapses any contribution to full intensity.
  const fillScore = (score: number): number => (showLevels ? score : score > 0 ? 100 : 0);

  const CELL_S = CELL * scale;
  const GAP_S = GAP * scale;

  // Approx rendered width of the longest author label (≈0.62em per char @ 11px).
  const authorMaxChars = Math.max(1, ...authors.map((_, ai) => authorLabel(ai).length));
  const authorLabelW = authorMaxChars * 11 * 0.62 * scale;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  // Orientation-aware label bands. Role names are long (need a wide/tall band);
  // author labels are short as initials but long as full names, so the
  // author-bearing axis grows when acronyms are off.
  const topBand = transpose
    ? 120 * scale // role names rotated above grid
    : acronyms
      ? 40 * scale
      : clamp(authorLabelW * 0.72 + 14 * scale, 40 * scale, 220 * scale); // rotated author names
  const leftBand = transpose
    ? acronyms
      ? 64 * scale
      : clamp(authorLabelW + 14 * scale, 64 * scale, 260 * scale) // author names down the left
    : 200 * scale; // role names down the left
  const rightOverhang = transpose
    ? 112 * scale // rotated role names overhang right
    : acronyms
      ? 16 * scale
      : clamp(authorLabelW * 0.72, 16 * scale, 180 * scale); // rotated author names overhang

  const gridW = (transpose ? nRoles : nAuthors) * (CELL_S + GAP_S) - GAP_S;
  const gridH = (transpose ? nAuthors : nRoles) * (CELL_S + GAP_S) - GAP_S;

  const gridX = PAD_S + leftBand + GAP_S * 2;
  const gridY = PAD_S + TITLE_S + topBand + GAP_S * 2;

  // Legend geometry (placed below the grid). Ensure the canvas is wide enough
  // for whichever is wider: the grid+labels or the level legend row.
  const LEGEND_EXTRA = 40 * scale;
  const levelKeyCount = showLevels ? 4 : 2;
  const levelSpacing = 100 * scale;
  const legendRight = PAD_S + levelKeyCount * levelSpacing;

  const contentRight = gridX + gridW + rightOverhang;
  const totalW = Math.max(contentRight, legendRight) + PAD_S;
  const totalH = gridY + gridH + PAD_S + LEGEND_EXTRA;

  const lines: string[] = [];
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">`,
  );
  lines.push(`<rect width="${totalW}" height="${totalH}" fill="${COLOR_BG}"/>`);
  lines.push(
    `<text x="${PAD_S}" y="${PAD_S + 14}" font-family="${FONT}" font-size="13" font-weight="600" fill="${COLOR_TEXT}">${escapeXml(translateUi("heatmapTitle"))}</text>`,
  );

  // Top labels (rotated): author labels when normal, role names when transposed.
  const topLabels = transpose ? roles.map((r) => translateRole(r.name)) : authors.map((_, ai) => authorLabel(ai));
  for (let i = 0; i < topLabels.length; i++) {
    const cx = gridX + i * (CELL_S + GAP_S) + CELL_S / 2;
    const cy = gridY - GAP_S - 4 * scale;
    lines.push(
      `<text transform="translate(${cx},${cy}) rotate(-45)" text-anchor="start" font-family="${FONT}" font-size="${11 * scale}" font-weight="500" fill="${COLOR_TEXT}">${escapeXml(
        topLabels[i] ?? "",
      )}</text>`,
    );
  }

  // Rows: roles when normal, authors when transposed.
  const rowCount = transpose ? nAuthors : nRoles;
  for (let r = 0; r < rowCount; r++) {
    const cy = gridY + r * (CELL_S + GAP_S);
    const leftLabel = transpose ? authorLabel(r) : translateRole(roles[r]?.name ?? "");
    lines.push(
      `<text x="${gridX - GAP_S * 2 - 4 * scale}" y="${cy + CELL_S / 2 + 4 * scale}" text-anchor="end" font-family="${FONT}" font-size="${10.5 * scale}" fill="${COLOR_TEXT_DIM}">${escapeXml(
        leftLabel,
      )}</text>`,
    );

    const colCount = transpose ? nRoles : nAuthors;
    for (let c = 0; c < colCount; c++) {
      const cx = gridX + c * (CELL_S + GAP_S);
      const ai = transpose ? r : c;
      const role = transpose ? roles[c] : roles[r];
      const score = scoreFor(authors[ai], role?.name ?? "");
      const rx = 3 * scale;
      lines.push(
        `<rect x="${cx}" y="${cy}" width="${CELL_S}" height="${CELL_S}" rx="${rx}" ry="${rx}" fill="${heatCellColor(monoColor, fillScore(score))}"/>`,
      );
    }
  }

  // Grid border
  lines.push(
    `<rect x="${gridX - 1}" y="${gridY - 1}" width="${gridW + 2}" height="${gridH + 2}" rx="${3 * scale}" ry="${3 * scale}" fill="none" stroke="${COLOR_BORDER}" stroke-width="${0.5 * scale}"/>`,
  );

  // Legend: a single level/intensity row below the grid.
  const levelRowY = totalH - PAD_S - 10 * scale;

  const levelKey: { label: string; score: number }[] = showLevels
    ? [
        { label: translateUi("lead"), score: 100 },
        { label: translateUi("equal"), score: 66 },
        { label: translateUi("supporting"), score: 33 },
        { label: translateUi("none"), score: 0 },
      ]
    : [
        { label: translateUi("contributed"), score: 100 },
        { label: translateUi("none"), score: 0 },
      ];
  let lx = PAD_S;
  for (const { label, score } of levelKey) {
    lines.push(
      `<rect x="${lx}" y="${levelRowY - 10 * scale}" width="${14 * scale}" height="${14 * scale}" rx="${2 * scale}" ry="${2 * scale}" fill="${heatCellColor(monoColor, score)}"/>`,
    );
    lines.push(
      `<text x="${lx + 18 * scale}" y="${levelRowY + 2 * scale}" font-family="${FONT}" font-size="${10 * scale}" fill="${COLOR_TEXT_DIM}">${escapeXml(label)}</text>`,
    );
    lx += levelSpacing;
  }

  lines.push("</svg>");
  return lines.join("\n");
}
