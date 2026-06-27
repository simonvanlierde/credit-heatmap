import type { Author } from "../author.js";
import { CREDIT_ROLES } from "../credit-roles.js";
import { escapeXml } from "./escape-xml.js";

// Layout constants
const ROLE_LABEL_W = 200;
const AUTHOR_LABEL_H = 110;
const CELL = 22;
const GAP = 2;
const PAD = 24;
const FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";

// Brand colours (matching the UI)
const COLOR_EMPTY = "#d1e4ff";
const COLOR_TERTIARY = "#94ccff";
const COLOR_SECONDARY = "#0077b6";
const COLOR_LEAD = "#005d90";
const COLOR_TEXT = "#001d36";
const COLOR_TEXT_DIM = "#404850";
const COLOR_BG = "#f8f9ff";
const COLOR_BORDER = "#bfc7d1";

export interface HeatmapSvgOptions {
  /** Override the lead accent colour (hex); secondary/tertiary shades are derived from it. */
  colorScheme?: string;
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

  // Allow overriding the accent colour; derive secondary/tertiary shades
  let LEAD = COLOR_LEAD;
  let SECONDARY = COLOR_SECONDARY;
  let TERTIARY = COLOR_TERTIARY;
  if (opts?.colorScheme) {
    LEAD = normalizeHex(opts.colorScheme);
    SECONDARY = lightenHex(LEAD, -0.18);
    TERTIARY = lightenHex(LEAD, -0.36);
  }
  function scoreToFill(score: number): string {
    if (score === 0) return COLOR_EMPTY;
    if (score <= 33) return TERTIARY;
    if (score <= 66) return SECONDARY;
    return LEAD;
  }
  const nAuthors = authors.length;
  const nRoles = roles.length;

  // Apply scale to layout constants
  const ROLE_LABEL_W_S = ROLE_LABEL_W * scale;
  const AUTHOR_LABEL_H_S = AUTHOR_LABEL_H * scale;
  const CELL_S = CELL * scale;
  const GAP_S = GAP * scale;
  const PAD_S = PAD * scale;
  const LEGEND_EXTRA = 40 * scale;

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
        const score = authors[ai]?.contributions[ri]?.score ?? 0;
        const fill = scoreToFill(score);
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
        const score = authors[ai]?.contributions[ri]?.score ?? 0;
        const fill = scoreToFill(score);
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

  // Legend
  const legendY = totalH - PAD_S - 10 * scale;
  const legend: { label: string; color: string }[] = [
    { label: "Lead (67–100)", color: COLOR_LEAD },
    { label: "Secondary (34–66)", color: COLOR_SECONDARY },
    { label: "Tertiary (1–33)", color: COLOR_TERTIARY },
    { label: "None", color: COLOR_EMPTY },
  ];
  let lx = gridX;
  for (const { label, color } of legend) {
    lines.push(
      `<rect x="${lx}" y="${legendY - 10 * scale}" width="${14 * scale}" height="${14 * scale}" rx="${2 * scale}" ry="${2 * scale}" fill="${color}"/>`,
    );
    lines.push(
      `<text x="${lx + 18 * scale}" y="${legendY + 2 * scale}" font-family="${FONT}" font-size="${10 * scale}" fill="${COLOR_TEXT_DIM}">${label}</text>`,
    );
    lx += 130 * scale;
  }

  lines.push("</svg>");
  return lines.join("\n");
}

function normalizeHex(h: string): string {
  if (!h) return "#000000";
  if (h.startsWith("#") && (h.length === 7 || h.length === 4)) return h;
  // simple fallback: try to parse named colours or return as-is
  return h;
}

function lightenHex(hex: string, amt: number): string {
  // amt in [-1,1]; negative -> darker
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.min(255, Math.max(0, Math.round(rgb.r * (1 + amt))));
  const g = Math.min(255, Math.max(0, Math.round(rgb.g * (1 + amt))));
  const b = Math.min(255, Math.max(0, Math.round(rgb.b * (1 + amt))));
  return rgbToHex({ r, g, b });
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    const r = h.slice(0, 1);
    const g = h.slice(1, 2);
    const b = h.slice(2, 3);
    return {
      r: Number.parseInt(r + r, 16),
      g: Number.parseInt(g + g, 16),
      b: Number.parseInt(b + b, 16),
    };
  }
  if (h.length === 6) {
    return {
      r: Number.parseInt(h.slice(0, 2), 16),
      g: Number.parseInt(h.slice(2, 4), 16),
      b: Number.parseInt(h.slice(4, 6), 16),
    };
  }
  return null;
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
