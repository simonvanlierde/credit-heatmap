import { isValidOrcid, lookupOrcidPerson, ORCID_REGEX, type OrcidErrorCode } from "@credit-generator/core";
import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "../rate-limit";

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
    return errorResponse(400, "BAD_REQUEST", "The request body could not be read.");
  }

  if (!(ORCID_REGEX.test(id) && isValidOrcid(id))) {
    return errorResponse(400, "INVALID_ID", "That is not a valid ORCID iD. Check the digits and try again.");
  }

  const result = await lookupOrcidPerson(id);
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
type ApiErrorCode = OrcidErrorCode | "BAD_REQUEST";

function errorResponse(status: number, code: ApiErrorCode, error: string) {
  return NextResponse.json({ code, error }, { status });
}
