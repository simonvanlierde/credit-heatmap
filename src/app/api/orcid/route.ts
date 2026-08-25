import { isValidOrcid, lookupOrcidPerson, ORCID_REGEX } from "@credit-generator/core";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { type NextRequest, NextResponse } from "next/server";

interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * Server-side proxy for ORCID public lookups.
 *
 * This is the one piece of the app that genuinely needs a server: the ORCID
 * public API does not send permissive CORS headers, so the browser cannot call
 * it directly. Everything else (statement, XML, CSV, JSON, heatmap SVG/PNG)
 * runs purely in the browser via `@credit-generator/core`.
 */
export async function POST(request: NextRequest) {
  // Rate-limit before reading the body. Parsing first charged CPU for an
  // arbitrarily large payload on every request, including the ones the limiter
  // was about to reject, so the most expensive step sat outside the guard.
  const limited = await checkRateLimit(request);
  if (limited) return limited;

  let id = "";
  try {
    const body: unknown = await request.json();
    if (body !== null && typeof body === "object" && "id" in body && typeof body.id === "string") {
      id = body.id;
    }
  } catch {
    return NextResponse.json({ error: "The request body could not be read." }, { status: 400 });
  }

  if (!(ORCID_REGEX.test(id) && isValidOrcid(id))) {
    return NextResponse.json(
      { error: "That is not a valid ORCID iD. Check the digits and try again." },
      { status: 400 },
    );
  }

  const result = await lookupOrcidPerson(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}

/** A 429 response when this client is over the limit, otherwise null. */
async function checkRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const rateLimiter = getRateLimiter();
  if (!rateLimiter) return null;

  // Behind the Cloudflare edge, `cf-connecting-ip` is set by the edge and
  // cannot be spoofed by the client. The `x-forwarded-for` fallback is only
  // reachable off-CF, where it would be client-controlled: take the first hop
  // and treat a missing value as one shared bucket rather than a free pass.
  const clientKey = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = await rateLimiter.limit({ key: clientKey.split(",")[0]?.trim() || "unknown" });
  if (success) return null;
  return NextResponse.json({ error: "Too many ORCID lookups. Try again in a minute." }, { status: 429 });
}

function getRateLimiter(): RateLimiter | null {
  let env: Record<string, unknown>;
  try {
    env = getCloudflareContext().env as Record<string, unknown>;
  } catch {
    // No Workers context at all: this is `next dev`. Expected, stay quiet.
    return null;
  }

  const limiter = (env.ORCID_RATE_LIMITER as RateLimiter | undefined) ?? null;
  if (!limiter) {
    // We *are* on Workers but the binding is missing (renamed in
    // wrangler.jsonc, or a deploy that predates it). Previously this failed
    // open silently and the proxy ran unthrottled; say so in the logs.
    // Workers has no other sink here, and a silently unthrottled public proxy
    // is worth a line in the invocation log.
    // biome-ignore lint/suspicious/noConsole: deliberate operational warning
    console.error("ORCID_RATE_LIMITER binding missing; ORCID proxy is running unthrottled.");
  }
  return limiter;
}
