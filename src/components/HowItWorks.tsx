"use client";

import { HelpCircle } from "lucide-react";
import { useContributionStore } from "@/store/contribution-store";

/** Re-opens the welcome card and scrolls it into view. Ephemeral — the re-open
 *  isn't persisted, so it never resurfaces as a fake first run on the next visit. */
export function HowItWorks() {
  const openWelcome = useContributionStore((s) => s.openWelcome);
  return (
    <button
      type="button"
      onClick={() => {
        openWelcome();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className="inline-flex items-center gap-1 text-sm text-on-surface-variant transition-colors hover:text-primary"
    >
      <HelpCircle className="size-3.5" aria-hidden="true" />
      How it works
    </button>
  );
}
