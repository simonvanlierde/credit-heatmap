import type { Author } from "../author.js";
import { contributorColor, type HeatmapColorMode, heatCellColor } from "../contributor-color.js";
import { CREDIT_ROLES } from "../credit-roles.js";
import { escapeXml } from "./escape-xml.js";

// Layout constants
const ROLE_LABEL_W = 200;
const AUTHOR_LABEL_H = 110;
const CELL = 22;
const GAP = 2;
const PAD = 24;
const FONT = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";

// Ink-on-paper neutrals (matching the UI identity)
const COLOR_TEXT = "#16181c";
const COLOR_TEXT_DIM = "#595c63";
const COLOR_BG = "#fafaf9";
const COLOR_BORDER = "#e4e4e1";

export interface HeatmapSvgOptions {
  /** Heatmap color mode; defaults to by-author. */
  colorMode?: HeatmapColorMode;
  /** Swap axes: authors down the left, roles across the top. */
  transpose?: boolean;
  /** Scale all layout dimensions (min 0.1). */
  scale?: number;
}

/**
 * Render a contribution heatmap as a self-contained SVG string.
 *
 * Pure and dependency-free — runs in the browser (for live preview, SVG
 * download, and canvas→PNG export) and in Node (for tests). The SVG uses
 * system font stacks, so no font embedding is required.
 *
 * Layout:
 *   - Author initials across the top (rotated 45°)
 *   - CRediT role names down the left side
 *   - Coloured cells for each author × role intersection
 */
export function buildHeatmapSvg(authors: Author[], opts?: HeatmapSvgOptions): string {
  const roles = CREDIT_ROLES;
  const transpose = !!opts?.transpose;
  const scale = typeof opts?.scale === "number" ? Math.max(0.1, opts.scale) : 1;
  const colorMode: HeatmapColorMode = opts?.colorMode ?? "by-author";
  const byAuthor = colorMode === "by-author";

  const nAuthors = authors.length;
  const nRoles = roles.length;

  // Look up scores by role name so rendering doesn't assume the author's
  // contributions array is in CREDIT_ROLES order.
  const scoreFor = (author: Author | undefined, roleName: string): number =>
    author?.contributions.find((c) => c.role === roleName)?.score ?? 0;

  // Apply scale to layout constants
  const ROLE_LABEL_W_S = ROLE_LABEL_W * scale;
  const AUTHOR_LABEL_H_S = AUTHOR_LABEL_H * scale;
  const CELL_S = CELL * scale;
  const GAP_S = GAP * scale;
  const PAD_S = PAD * scale;
  // By-author mode adds a second legend row mapping each hue to a contributor.
  const LEGEND_EXTRA = (byAuthor ? 70 : 40) * scale;

  const gridW = (transpose ? nRoles : nAuthors) * (CELL_S + GAP_S) - GAP_S;
  const gridH = (transpose ? nAuthors : nRoles) * (CELL_S + GAP_S) - GAP_S;

  const totalW = PAD_S + ROLE_LABEL_W_S + GAP_S * 2 + gridW + PAD_S;
  const totalH = PAD_S + AUTHOR_LABEL_H_S + GAP_S * 2 + gridH + PAD_S + LEGEND_EXTRA; // +legend

  const gridX = PAD_S + ROLE_LABEL_W_S + GAP_S * 2;
  const gridY = PAD_S + AUTHOR_LABEL_H_S + GAP_S * 2;

  const lines: string[] = [];

  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">`,
  );

  // Background
  lines.push(`<rect width="${totalW}" height="${totalH}" fill="${COLOR_BG}"/>`);

  // Title
  lines.push(
    `<text x="${PAD_S}" y="${PAD_S + 14}" font-family="${FONT}" font-size="13" font-weight="600" fill="${COLOR_TEXT}">CRediT Contribution Heatmap</text>`,
  );

  // Author labels (rotated, placed above grid)
  if (!transpose) {
    for (let ai = 0; ai < nAuthors; ai++) {
      const cx = gridX + ai * (CELL_S + GAP_S) + CELL_S / 2;
      const cy = gridY - GAP_S - 4 * scale;
      lines.push(
        `<text transform="translate(${cx},${cy}) rotate(-45)" text-anchor="start" font-family="${FONT}" font-size="${11 * scale}" font-weight="500" fill="${COLOR_TEXT}">${escapeXml(
          authors[ai]?.initials ?? "",
        )}</text>`,
      );
    }
  } else {
    // When transposed, role labels go across the top
    for (let ri = 0; ri < nRoles; ri++) {
      const cx = gridX + ri * (CELL_S + GAP_S) + CELL_S / 2;
      const cy = gridY - GAP_S - 4 * scale;
      lines.push(
        `<text transform="translate(${cx},${cy}) rotate(-45)" text-anchor="start" font-family="${FONT}" font-size="${11 * scale}" font-weight="500" fill="${COLOR_TEXT}">${escapeXml(
          roles[ri]?.name ?? "",
        )}</text>`,
      );
    }
  }

  // Role labels + cells
  if (!transpose) {
    for (let ri = 0; ri < nRoles; ri++) {
      const cy = gridY + ri * (CELL_S + GAP_S);
      const labelY = cy + CELL_S / 2 + 4 * scale; // vertically centred

      // Role label
      lines.push(
        `<text x="${PAD_S + ROLE_LABEL_W_S}" y="${labelY}" text-anchor="end" font-family="${FONT}" font-size="${10.5 * scale}" fill="${COLOR_TEXT_DIM}">${escapeXml(
          roles[ri]?.name ?? "",
        )}</text>`,
      );

      // Cells
      for (let ai = 0; ai < nAuthors; ai++) {
        const cx = gridX + ai * (CELL_S + GAP_S);
        const score = scoreFor(authors[ai], roles[ri]?.name ?? "");
        const fill = heatCellColor(colorMode, ai, score);
        const rx = 3 * scale;
        lines.push(
          `<rect x="${cx}" y="${cy}" width="${CELL_S}" height="${CELL_S}" rx="${rx}" ry="${rx}" fill="${fill}"/>`,
        );
      }
    }
  } else {
    // Transposed: authors down the left, roles across the top
    for (let ai = 0; ai < nAuthors; ai++) {
      const cy = gridY + ai * (CELL_S + GAP_S);

      // Author label (initials) on the left
      lines.push(
        `<text x="${PAD_S + ROLE_LABEL_W_S - 6 * scale}" y="${cy + CELL_S / 2 + 4 * scale}" text-anchor="end" font-family="${FONT}" font-size="${10.5 * scale}" fill="${COLOR_TEXT_DIM}">${escapeXml(
          authors[ai]?.initials ?? "",
        )}</text>`,
      );

      for (let ri = 0; ri < nRoles; ri++) {
        const cx = gridX + ri * (CELL_S + GAP_S);
        const score = scoreFor(authors[ai], roles[ri]?.name ?? "");
        const fill = heatCellColor(colorMode, ai, score);
        const rx = 3 * scale;
        lines.push(
          `<rect x="${cx}" y="${cy}" width="${CELL_S}" height="${CELL_S}" rx="${rx}" ry="${rx}" fill="${fill}"/>`,
        );
      }
    }
  }

  // Grid border
  lines.push(
    `<rect x="${gridX - 1}" y="${gridY - 1}" width="${gridW + 2}" height="${gridH + 2}" rx="${3 * scale}" ry="${3 * scale}" fill="none" stroke="${COLOR_BORDER}" stroke-width="${0.5 * scale}"/>`,
  );

  // Legend. Level row (intensity → contribution level) always; in by-author
  // mode a second row maps each hue to a contributor.
  const authorRowY = totalH - PAD_S - 10 * scale;
  const levelRowY = byAuthor ? authorRowY - 26 * scale : authorRowY;

  const levelKey: { label: string; score: number }[] = [
    { label: "Lead (67–100)", score: 100 },
    { label: "Secondary (34–66)", score: 66 },
    { label: "Tertiary (1–33)", score: 33 },
    { label: "None", score: 0 },
  ];
  let lx = gridX;
  for (const { label, score } of levelKey) {
    lines.push(
      `<rect x="${lx}" y="${levelRowY - 10 * scale}" width="${14 * scale}" height="${14 * scale}" rx="${2 * scale}" ry="${2 * scale}" fill="${heatCellColor(colorMode, 0, score)}"/>`,
    );
    lines.push(
      `<text x="${lx + 18 * scale}" y="${levelRowY + 2 * scale}" font-family="${FONT}" font-size="${10 * scale}" fill="${COLOR_TEXT_DIM}">${label}</text>`,
    );
    lx += 130 * scale;
  }

  if (byAuthor) {
    let ax = gridX;
    for (let ai = 0; ai < nAuthors; ai++) {
      const initials = authors[ai]?.initials ?? "";
      lines.push(
        `<rect x="${ax}" y="${authorRowY - 10 * scale}" width="${14 * scale}" height="${14 * scale}" rx="${2 * scale}" ry="${2 * scale}" fill="${contributorColor(ai)}"/>`,
      );
      lines.push(
        `<text x="${ax + 18 * scale}" y="${authorRowY + 2 * scale}" font-family="${FONT}" font-size="${10 * scale}" fill="${COLOR_TEXT_DIM}">${escapeXml(initials)}</text>`,
      );
      ax += 70 * scale;
    }
  }

  lines.push("</svg>");
  return lines.join("\n");
}
