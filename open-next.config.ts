import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default OpenNext config: the app has no incremental cache, queue, or tag
// store to wire up, so the defaults are all we need. Add an `incrementalCache`
// (e.g. R2) here later if ISR/SSG revalidation is introduced.
export default defineCloudflareConfig();
