"use client";

import { useEffect } from "react";

/**
 * Registers `public/sw.js` so the app keeps working without a network.
 *
 * Development is excluded: the dev server serves unhashed modules and a cache
 * in front of them fights HMR. Renders nothing.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    // biome-ignore lint/correctness/noProcessGlobal: Next inlines process.env.NODE_ENV at build time; there is no node:process in the browser.
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    // A failed registration (private mode, an unsupported context) costs the
    // app nothing but offline support, so it stays quiet.
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return null;
}
