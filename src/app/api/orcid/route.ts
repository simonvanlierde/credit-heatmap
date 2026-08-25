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
  let id = "";
  try {
    const body: unknown = await request.json();
    if (body !== null && typeof body === "object" && "id" in body && typeof body.id === "string") {
      id = body.id;
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!(ORCID_REGEX.test(id) && isValidOrcid(id))) {
    return NextResponse.json({ error: "Invalid ORCID iD format" }, { status: 400 });
  }

  const rateLimiter = getRateLimiter();
  if (rateLimiter) {
    const clientKey = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
    const { success } = await rateLimiter.limit({ key: clientKey.split(",")[0]?.trim() || "unknown" });
    if (!success) {
      return NextResponse.json({ error: "Too many ORCID lookups. Try again in a minute." }, { status: 429 });
    }
  }

  const result = await lookupOrcidPerson(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}

function getRateLimiter(): RateLimiter | null {
  try {
    const { env } = getCloudflareContext();
    return ((env as Record<string, unknown>).ORCID_RATE_LIMITER as RateLimiter | undefined) ?? null;
  } catch {
    // The binding is unavailable under `next dev`; production gets it from Wrangler.
    return null;
  }
}
