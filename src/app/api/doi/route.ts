import { lookupDoiWork } from "@credit-generator/core";
import { type NextRequest, NextResponse } from "next/server";
import { errorResponse, readStringField } from "../lookup-route";
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

  const doi = await readStringField(request, "doi");
  if (doi === null) return errorResponse(400, "BAD_REQUEST", "The request body could not be read.");

  const result = await lookupDoiWork(doi, fetch, POLITE_MAILTO);
  if (!result.ok) return errorResponse(result.status, result.code, result.error);
  return NextResponse.json(result);
}
