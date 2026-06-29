/**
 * Canonical contributor-color logic, shared by the live UI and the SVG/PNG
 * export so on-screen and exported heatmaps never drift. Color identifies
 * *people*: each contributor gets one Okabe–Ito hue (colorblind-safe, the
 * palette of scientific figures). Heatmap intensity encodes the contribution
 * *level*; hue encodes who (in by-author mode).
 */

export type HeatmapColorMode = "by-author" | "monochrome" | "grayscale";

/** Okabe–Ito categorical palette; cycles after 8 contributors. */
export const OKABE_ITO = [
  "#0072b2",
  "#e69f00",
  "#009e73",
  "#cc79a7",
  "#d55e00",
  "#56b4e9",
  "#f0e442",
  "#000000",
] as const;

const ACCENT = "#1f4e79";
const NONE_FILL = "#ececea";
const MIX_TOWARD = "#ffffff";

/** Stable hue for a contributor by their position in the author list. */
export function contributorColor(index: number): string {
  const n = OKABE_ITO.length;
  return OKABE_ITO[((index % n) + n) % n] ?? OKABE_ITO[0];
}

/** CRediT score (0–100) → fraction of the base hue to show (0 = empty). */
function scoreFraction(score: number): number {
  if (score <= 0) return 0;
  if (score <= 33) return 0.25;
  if (score <= 66) return 0.6;
  return 1;
}

/** Heatmap cell fill for the selected mode. */
export function heatCellColor(mode: HeatmapColorMode, index: number, score: number): string {
  const fraction = scoreFraction(score);
  if (fraction === 0) return NONE_FILL;
  const base = mode === "by-author" ? contributorColor(index) : mode === "monochrome" ? ACCENT : "#000000";
  return mixHex(MIX_TOWARD, base, fraction);
}

/** Linear mix of two hex colors; t=0 → a, t=1 → b. */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const round = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[round(ar, br), round(ag, bg), round(ab, bb)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Relative luminance (0–1), sRGB approximation. */
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
