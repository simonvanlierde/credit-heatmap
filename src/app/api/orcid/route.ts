import { lookupOrcidPerson } from "@credit-generator/core";
import { type NextRequest, NextResponse } from "next/server";
import { errorResponse, readStringField } from "../lookup-route";
import { checkRateLimit, checkSameOrigin } from "../rate-limit";

/**
 * Server-side proxy for ORCID public lookups.
 *
 * This is the one piece of the app that genuinely needs a server: the ORCID
 * public API does not send permissive CORS headers, so the browser cannot call
 * it directly. Everything else (statement, XML, CSV, JSON, heatmap SVG/PNG)
 * runs purely in the browser via `@credit-generator/core`.
 */
export async function POST(request: NextRequest) {
  // Another site must not be able to spend a visitor's rate-limit bucket.
  const crossSite = checkSameOrigin(request);
  if (crossSite) return crossSite;

  // Rate-limit before reading the body, so the most expensive step stays
  // inside the guard rather than charging CPU for requests we then reject.
  const limited = await checkRateLimit(request);
  if (limited) return limited;

  const id = await readStringField(request, "id");
  if (id === null) return errorResponse(400, "BAD_REQUEST", "The request body could not be read.");

  const result = await lookupOrcidPerson(id);
  if (!result.ok) return errorResponse(result.status, result.code, result.error);
  return NextResponse.json(result);
}
