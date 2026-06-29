/**
 * Contributor color system for the UI. The canonical palette and heatmap-fill
 * math live in @credit-generator/core so the live heatmap and the SVG/PNG
 * export can never drift; this module re-exports them and adds the UI-only
 * text-color helpers (which depend on luminance).
 *
 * ponytail: index-based assignment — stable while author order is. Move to a
 * stored color field on the author if reorder-stability ever matters.
 */

import { contributorColor, luminance, mixHex } from "@credit-generator/core";

export type { HeatmapColorMode } from "@credit-generator/core";
export { contributorColor, heatCellColor } from "@credit-generator/core";

/** Readable text color (dark or light) for a filled contributor swatch. */
export function contributorTextColor(index: number): string {
  return luminance(contributorColor(index)) > 0.6 ? "#16181c" : "#ffffff";
}

/**
 * Contributor hue darkened enough to read as colored text on a light surface
 * (the raw Okabe–Ito yellow/sky are too light to set as body text).
 */
export function contributorInkColor(index: number): string {
  const hex = contributorColor(index);
  return luminance(hex) > 0.5 ? mixHex(hex, "#000000", 0.45) : hex;
}

// ponytail: cheap dev-only self-check for the text-color thresholds.
if (process.env.NODE_ENV !== "production") {
  // Yellow (index 6) must flip to dark text and a dark ink.
  console.assert(contributorTextColor(6) === "#16181c", "light hue → dark text");
  console.assert(contributorInkColor(6) !== contributorColor(6), "light hue darkened for body text");
}
