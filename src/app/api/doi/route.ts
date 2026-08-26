import { DOI_INPUT_REGEX, type DoiErrorCode, lookupDoiWork, normalizeDoi } from "@credit-generator/core";
import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit, checkSameOrigin } from "../rate-limit";

/**
 * Contact address for Crossref's "polite pool", which gets faster and more
 * reliable service than the anonymous pool. Lives in this server route so it
 * cannot end up in a client bundle.
 */
const POLITE_MAILTO = "credit@duinlab.nl";

/**
 * Server-side proxy for Crossref DOI lookups.
 *
 * Crossref does send permissive CORS headers, so unlike ORCID this *could* run
 * from the browser. It does not, for two reasons: the Content-Security-Policy
 * keeps `connect-src 'self'`, and the polite-pool contact address belongs on
 * the server rather than in every client bundle.
 */
export async function POST(request: NextRequest) {
  // Another site must not be able to spend a visitor's rate-limit bucket.
  const crossSite = checkSameOrigin(request);
  if (crossSite) return crossSite;

  // Rate-limit before reading the body, so the most expensive step stays
  // inside the guard rather than charging CPU for requests we then reject.
  const limited = await checkRateLimit(request);
  if (limited) return limited;

  let doi = "";
  try {
    const body: unknown = await request.json();
    if (body !== null && typeof body === "object" && "doi" in body && typeof body.doi === "string") {
      doi = body.doi;
    }
  } catch {
    return errorResponse(400, "BAD_REQUEST", "The request body could not be read.");
  }

  if (!DOI_INPUT_REGEX.test(normalizeDoi(doi))) {
    return errorResponse(400, "INVALID_DOI", "That is not a valid DOI. It should look like 10.1234/abcde.");
  }

  const result = await lookupDoiWork(doi, fetch, POLITE_MAILTO);
  if (!result.ok) return errorResponse(result.status, result.code, result.error);
  return NextResponse.json(result);
}

/**
 * Every failure carries a stable `code` plus an English `error`.
 *
 * The client localizes from the code; the message is the fallback for a client
 * that meets a code it does not know, and what shows up in logs and `curl`.
 * Codes are API surface: add new ones rather than renaming existing ones.
 */
type ApiErrorCode = DoiErrorCode | "BAD_REQUEST";

function errorResponse(status: number, code: ApiErrorCode, error: string) {
  return NextResponse.json({ code, error }, { status });
}
