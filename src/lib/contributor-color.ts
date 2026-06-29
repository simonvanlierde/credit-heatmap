/**
 * Heatmap color helpers for the UI. The palette and heatmap-fill math live in
 * @credit-generator/core so the live heatmap and the SVG/PNG export can never
 * drift; this module re-exports them and adds the UI-only text-color helper
 * (which depends on luminance).
 */

import { luminance } from "@credit-generator/core";

export { DEFAULT_MONO_COLOR, heatCellColor } from "@credit-generator/core";

/** Readable text color (dark or light) for a filled swatch of `hex`. */
export function textColorOn(hex: string): string {
  return luminance(hex) > 0.6 ? "#16181c" : "#ffffff";
}
