"use client";

import { HelpCircle } from "lucide-react";
import { useContributionStore } from "@/store/contribution-store";

/** Re-opens the welcome card and scrolls it into view. Ephemeral — the re-open
 *  isn't persisted, so it never resurfaces as a fake first run on the next visit. */
export function HowItWorks() {
  const openWelcome = useContributionStore((s) => s.openWelcome);
  const welcomeOpen = useContributionStore((s) => s.welcomeOpen);
  return (
    <button
      type="button"
      aria-expanded={welcomeOpen}
      aria-controls="getting-started"
      onClick={() => {
        openWelcome();
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      }}
      className="inline-flex items-center gap-1 text-sm text-on-surface-variant transition-colors hover:text-primary"
    >
      <HelpCircle className="size-3.5" aria-hidden="true" />
      How it works
    </button>
  );
}
