/**
 * Canonical heatmap-color logic, shared by the live UI and the SVG/PNG export so
 * on-screen and exported heatmaps never drift. Heatmap intensity encodes the
 * contribution *level*; the single base hue (the chosen mono color) carries no
 * meaning beyond legibility — contributors are identified by the row/column labels.
 */

/** Default hue for the heatmap (the app's ink-blue accent). */
export const DEFAULT_MONO_COLOR = "#1f4e79";

/**
 * Okabe–Ito categorical palette, offered as preset hues in the color picker.
 * The palette's black is softened to a dark gray for on-screen legibility.
 */
export const OKABE_ITO = [
  "#0072b2",
  "#e69f00",
  "#009e73",
  "#cc79a7",
  "#d55e00",
  "#56b4e9",
  "#f0e442",
  "#404040",
] as const;

const NONE_FILL = "#ececea";
const MIX_TOWARD = "#ffffff";

/** CRediT score (0–100) → fraction of the base hue to show (0 = empty). */
function scoreFraction(score: number): number {
  if (score <= 0) return 0;
  if (score <= 33) return 0.25;
  if (score <= 66) return 0.6;
  return 1;
}

/** Heatmap cell fill. `hue` is the chosen base color; intensity scales by score. */
export function heatCellColor(hue: string, score: number): string {
  const fraction = scoreFraction(score);
  if (fraction === 0) return NONE_FILL;
  return mixHex(MIX_TOWARD, hue, fraction);
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
  // Expand shorthand (#abc → #aabbcc) and reject anything else so a malformed
  // color can't poison mixHex/luminance with NaN channels.
  const full = h.length === 3 ? h.replace(/./g, "$&$&") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return [0, 0, 0];
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}
