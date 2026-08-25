"use client";

import { useEffect, useState } from "react";
import { useContributionStore } from "@/store/contribution-store";

/**
 * False through the first painted frame of a restored draft, true from the next
 * frame on. Gate an entrance class on this and a page load stays still while a
 * later arrival (an import, the sample data, a share link) animates: adding a
 * class to an element that is already on screen changes no property and re-runs
 * no `@starting-style`, so nothing plays retroactively.
 *
 * It waits on rehydration rather than on mount alone. The store uses
 * skipHydration (see contribution-store.ts), so contributors restored from
 * localStorage land in a render *after* the first one, so a plain frame counter
 * would race them and animate the whole draft on every reload.
 */
export function useSettled(): boolean {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const settle = () => {
      frame = requestAnimationFrame(() => setSettled(true));
    };
    if (useContributionStore.persist.hasHydrated()) settle();
    const unsubscribe = useContributionStore.persist.onFinishHydration(settle);
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
    };
  }, []);

  return settled;
}
