import { CREDIT_ROLES } from "@credit-generator/core";
import type { Author } from "@credit-generator/core";

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

function scoreToFill(score: number): string {
  if (score === 0) return COLOR_EMPTY;
  if (score <= 33) return COLOR_TERTIARY;
  if (score <= 66) return COLOR_SECONDARY;
  return COLOR_LEAD;
}

/**
 * Render a contribution heatmap as an SVG string.
 *
 * Layout:
 *   - Author initials across the top (rotated 45°)
 *   - CRediT role names down the left side
 *   - Coloured cells for each author × role intersection
 *
 * No external font files or runtime dependencies required —
 * the SVG uses system font stacks that render correctly in all browsers
 * and most SVG viewers. For high-fidelity PNG export (where fonts must
 * be embedded), swap this renderer for a Satori-based one.
 */
export function buildHeatmapSvg(authors: Author[]): string {
  const roles = CREDIT_ROLES;
  const nAuthors = authors.length;
  const nRoles = roles.length;

  const gridW = nAuthors * (CELL + GAP) - GAP;
  const gridH = nRoles * (CELL + GAP) - GAP;

  const totalW = PAD + ROLE_LABEL_W + GAP * 2 + gridW + PAD;
  const totalH = PAD + AUTHOR_LABEL_H + GAP * 2 + gridH + PAD + 40; // +40 for legend

  const gridX = PAD + ROLE_LABEL_W + GAP * 2;
  const gridY = PAD + AUTHOR_LABEL_H + GAP * 2;

  const lines: string[] = [];

  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">`
  );

  // Background
  lines.push(`<rect width="${totalW}" height="${totalH}" fill="${COLOR_BG}"/>`);

  // Title
  lines.push(
    `<text x="${PAD}" y="${PAD + 14}" font-family="${FONT}" font-size="13" font-weight="600" fill="${COLOR_TEXT}">CRediT Contribution Heatmap</text>`
  );

  // Author labels (rotated, placed above grid)
  for (let ai = 0; ai < nAuthors; ai++) {
    const cx = gridX + ai * (CELL + GAP) + CELL / 2;
    const cy = gridY - GAP - 4;
    lines.push(
      `<text transform="translate(${cx},${cy}) rotate(-45)" text-anchor="start" font-family="${FONT}" font-size="11" font-weight="500" fill="${COLOR_TEXT}">${escXml(authors[ai]?.initials ?? "")}</text>`
    );
  }

  // Role labels + cells
  for (let ri = 0; ri < nRoles; ri++) {
    const cy = gridY + ri * (CELL + GAP);
    const labelY = cy + CELL / 2 + 4; // vertically centred

    // Role label
    lines.push(
      `<text x="${PAD + ROLE_LABEL_W}" y="${labelY}" text-anchor="end" font-family="${FONT}" font-size="10.5" fill="${COLOR_TEXT_DIM}">${escXml(roles[ri]?.name ?? "")}</text>`
    );

    // Cells
    for (let ai = 0; ai < nAuthors; ai++) {
      const cx = gridX + ai * (CELL + GAP);
      const score = authors[ai]?.contributions[ri]?.score ?? 0;
      const fill = scoreToFill(score);
      const rx = 3;
      lines.push(
        `<rect x="${cx}" y="${cy}" width="${CELL}" height="${CELL}" rx="${rx}" ry="${rx}" fill="${fill}"/>`
      );
    }
  }

  // Grid border
  lines.push(
    `<rect x="${gridX - 1}" y="${gridY - 1}" width="${gridW + 2}" height="${gridH + 2}" rx="3" ry="3" fill="none" stroke="${COLOR_BORDER}" stroke-width="0.5"/>`
  );

  // Legend
  const legendY = totalH - PAD - 10;
  const legend: { label: string; color: string }[] = [
    { label: "Lead (67–100)", color: COLOR_LEAD },
    { label: "Secondary (34–66)", color: COLOR_SECONDARY },
    { label: "Tertiary (1–33)", color: COLOR_TERTIARY },
    { label: "None", color: COLOR_EMPTY },
  ];
  let lx = gridX;
  for (const { label, color } of legend) {
    lines.push(
      `<rect x="${lx}" y="${legendY - 10}" width="14" height="14" rx="2" ry="2" fill="${color}"/>`
    );
    lines.push(
      `<text x="${lx + 18}" y="${legendY + 2}" font-family="${FONT}" font-size="10" fill="${COLOR_TEXT_DIM}">${label}</text>`
    );
    lx += 130;
  }

  lines.push("</svg>");
  return lines.join("\n");
}

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
