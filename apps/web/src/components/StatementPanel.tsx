"use client";

import { ContributionHeatmap } from "@/components/steps/ContributionMatrix";
import { StatementOutput } from "@/components/steps/StatementOutput";

/**
 * Right panel: overview heatmap (top) + live statement preview + export (bottom).
 */
export function StatementPanel() {
  return (
    <>
      <ContributionHeatmap />
      <StatementOutput />
    </>
  );
}
