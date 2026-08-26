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

/** A 429 response when this client is over the limit, otherwise null. */
export async function checkRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const rateLimiter = getRateLimiter();
  if (!rateLimiter) return null;

  // Behind the Cloudflare edge, `cf-connecting-ip` is set by the edge and
  // cannot be spoofed by the client. The `x-forwarded-for` fallback is only
  // reachable off-CF, where it would be client-controlled: take the first hop
  // and treat a missing value as one shared bucket rather than a free pass.
  const clientKey = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = await rateLimiter.limit({ key: clientKey.split(",")[0]?.trim() || "unknown" });
  if (success) return null;
  return NextResponse.json(
    { code: "RATE_LIMITED", error: "Too many lookups. Try again in a minute." },
    { status: 429 },
  );
}

function getRateLimiter(): RateLimiter | null {
  let env: Record<string, unknown>;
  try {
    env = getCloudflareContext().env as Record<string, unknown>;
  } catch {
    // No Workers context at all: this is `next dev`. Expected, stay quiet.
    return null;
  }

  const limiter = (env[BINDING] as RateLimiter | undefined) ?? null;
  if (!limiter) {
    // We *are* on Workers but the binding is missing (renamed in
    // wrangler.jsonc, or a deploy that predates it). Previously this failed
    // open silently and the proxy ran unthrottled; say so in the logs.
    // Workers has no other sink here, and a silently unthrottled public proxy
    // is worth a line in the invocation log.
    // biome-ignore lint/suspicious/noConsole: deliberate operational warning
    console.error(`${BINDING} binding missing; the upstream proxies are running unthrottled.`);
  }
  return limiter;
}
