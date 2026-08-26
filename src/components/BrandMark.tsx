"use client";

import { useContributionStore } from "@/store/contribution-store";

/**
 * The mark for CRediT Matrix: a 3x3 crop of the contribution matrix, lead on the diagonal.
 * Cells are drawn in `currentColor` at the app's three intensity tiers, and the
 * color is the workspace's own heatmap hue, so the mark is a live swatch of the
 * grid rather than a fixed sticker. The wordmark beside it stays on the primary
 * token: a hue is chosen for cell legibility, and some of the presets would not
 * carry text contrast.
 *
 * The store skips hydration, so server and first client render both use the
 * default ink-blue; the transition covers the swap to a stored hue.
 *
 * The favicon (`src/app/icon.svg`) carries the same geometry with literal fills.
 */
export function BrandMark({ className }: { className?: string }) {
  const monoColor = useContributionStore((state) => state.heatmapMonoColor);
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      style={{ color: monoColor, transition: "color 200ms ease-out" }}
      aria-hidden="true"
      focusable="false"
    >
      <g fill="currentColor">
        <rect x="3" y="3" width="8" height="8" rx="1" />
        <rect x="12" y="3" width="8" height="8" rx="1" fillOpacity="0.62" />
        <rect x="21" y="3" width="8" height="8" rx="1" fillOpacity="0.32" />
        <rect x="3" y="12" width="8" height="8" rx="1" fillOpacity="0.62" />
        <rect x="12" y="12" width="8" height="8" rx="1" />
        <rect x="21" y="12" width="8" height="8" rx="1" fillOpacity="0.12" />
        <rect x="3" y="21" width="8" height="8" rx="1" fillOpacity="0.32" />
        <rect x="12" y="21" width="8" height="8" rx="1" fillOpacity="0.12" />
        <rect x="21" y="21" width="8" height="8" rx="1" />
      </g>
    </svg>
  );
}
