import { getCloudflareContext } from "@opennextjs/cloudflare";
import { type NextRequest, NextResponse } from "next/server";

interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * One limiter for the whole API surface. Both upstream proxies (ORCID, DOI)
 * are cheap lookups on behalf of the same person filling in one draft, so a
 * shared bucket is the honest unit: it caps what a single client can push
 * through us, rather than granting a fresh allowance per endpoint.
 */
const BINDING = "API_RATE_LIMITER";

/**
 * Reject a request another site made a visitor's browser send.
 *
 * The proxies hold no state and no credentials, but a drive-by page could
 * otherwise burn a visitor's rate-limit bucket and use their IP to scrape
 * Crossref/ORCID through this domain. Browsers always attach `Origin` to a
 * cross-origin POST; a missing header is a same-origin fetch or a non-browser
 * client, both of which spend only their own bucket.
 */
export function checkSameOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const host = request.headers.get("host");
  try {
    if (host && new URL(origin).host === host) return null;
  } catch {
    // An unparseable Origin ("null", garbage) is nothing we serve.
  }
  return NextResponse.json({ code: "FORBIDDEN", error: "Cross-site requests are not accepted." }, { status: 403 });
}

/** A 429 response when this client is over the limit, otherwise null. */
export async function checkRateLimit(request: NextRequest): Promise<NextResponse | null> {
  let env: Record<string, unknown>;
  try {
    env = getCloudflareContext().env as Record<string, unknown>;
  } catch {
    // No Workers context at all: `next dev` or a local `next start`. Expected
    // off Workers, stay quiet. The deployed Worker always has a context, so
    // this branch cannot swallow a production fault.
    return null;
  }

  const limiter = (env[BINDING] as RateLimiter | undefined) ?? null;
  if (!limiter) {
    // We *are* on Workers but the binding is missing (renamed in
    // wrangler.jsonc, or a deploy that predates it). That is a persistent
    // misconfiguration, and an unthrottled public proxy is not an acceptable
    // fallback: refuse lookups so the fault is seen and fixed.
    // biome-ignore lint/suspicious/noConsole: deliberate operational warning
    console.error(`${BINDING} binding missing; refusing lookups rather than proxying unthrottled.`);
    return NextResponse.json({ code: "UNAVAILABLE", error: "Lookups are temporarily unavailable." }, { status: 503 });
  }

  // Behind the Cloudflare edge, `cf-connecting-ip` is set by the edge and
  // cannot be spoofed by the client. The `x-forwarded-for` fallback is only
  // reachable off-CF, where it would be client-controlled: take the first hop
  // and treat a missing value as one shared bucket rather than a free pass.
  const clientKey = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  let success: boolean;
  try {
    ({ success } = await limiter.limit({ key: clientKey.split(",")[0]?.trim() || "unknown" }));
  } catch {
    // A transient limiter fault is not the client's fault: unlike the missing
    // binding above, this heals on its own, so fail open for this request
    // rather than turning a working lookup into a 500.
    // biome-ignore lint/suspicious/noConsole: deliberate operational warning
    console.error(`${BINDING} limit() failed; letting this request through.`);
    return null;
  }
  if (success) return null;
  return NextResponse.json(
    { code: "RATE_LIMITED", error: "Too many lookups. Try again in a minute." },
    { status: 429 },
  );
}
