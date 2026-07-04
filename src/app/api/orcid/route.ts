import { isValidOrcid, ORCID_REGEX } from "@credit-generator/core";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for ORCID public lookups.
 *
 * This is the one piece of the app that genuinely needs a server: the ORCID
 * public API does not send permissive CORS headers, so the browser cannot call
 * it directly. Everything else (statement, XML, CSV, JSON, heatmap SVG/PNG)
 * runs purely in the browser via `@credit-generator/core`.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";

  // Require bare format (so the upstream URL is well-formed) and a valid checksum.
  if (!ORCID_REGEX.test(id) || !isValidOrcid(id)) {
    return NextResponse.json({ error: "Invalid ORCID iD format" }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(`https://pub.orcid.org/v3.0/${id}/person`, {
      headers: { Accept: "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "ORCID API unavailable" }, { status: 502 });
  }

  if (response.status === 404) {
    return NextResponse.json({ error: "ORCID not found" }, { status: 404 });
  }

  if (!response.ok) {
    return NextResponse.json({ error: "ORCID API unavailable" }, { status: 502 });
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return NextResponse.json({ error: "ORCID API unavailable" }, { status: 502 });
  }

  if (body === null || typeof body !== "object" || !("name" in body) || body.name === null) {
    return NextResponse.json({ error: "ORCID not found" }, { status: 404 });
  }

  const nameObj = (body as Record<string, unknown>).name;
  if (nameObj === null || typeof nameObj !== "object") {
    return NextResponse.json({ error: "ORCID not found" }, { status: 404 });
  }

  const name = nameObj as Record<string, unknown>;
  const firstName = readValue(name["given-names"]);
  const surname = readValue(name["family-name"]);
  const displayName = `${firstName} ${surname}`.trim();

  return NextResponse.json({ firstName, surname, displayName });
}

/** ORCID wraps values as `{ value: string }`; pull the string out safely. */
function readValue(field: unknown): string {
  if (
    field !== null &&
    typeof field === "object" &&
    "value" in field &&
    typeof (field as Record<string, unknown>).value === "string"
  ) {
    return (field as Record<string, unknown>).value as string;
  }
  return "";
}
