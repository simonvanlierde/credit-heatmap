import { isValidOrcid, normalizeOrcid, ORCID_REGEX } from "./author";

/**
 * Stable machine-readable failure codes.
 *
 * The client localizes from the code; the `error` string beside it stays
 * English and exists for logs, `curl`, and any client that meets a code it
 * does not recognise yet. Codes are part of the API contract — rename one and
 * you break older clients, so add rather than rename.
 */
export type OrcidErrorCode = "INVALID_ID" | "NOT_FOUND" | "UNAVAILABLE";

/** English fallback text, one per code. Not the localized copy the UI renders. */
const MESSAGES: Record<OrcidErrorCode, string> = {
  INVALID_ID: "That is not a valid ORCID iD. Check the digits and try again.",
  NOT_FOUND: "No ORCID record matches that iD.",
  UNAVAILABLE: "The ORCID service is unavailable. Try again shortly, or type the name.",
};

/** Upstream deadline. ORCID's public API normally answers well inside this. */
const ORCID_TIMEOUT_MS = 5000;

export type OrcidLookupResult =
  | { ok: true; firstName: string; surname: string; displayName: string }
  | { ok: false; status: 400 | 404 | 502; code: OrcidErrorCode; error: string };

/** Build a failure carrying both the code and its English description. */
function fail(status: 400 | 404 | 502, code: OrcidErrorCode): OrcidLookupResult {
  return { ok: false, status, code, error: MESSAGES[code] };
}

/** Validate an ORCID iD and resolve its public name through an injected fetcher. */
export async function lookupOrcidPerson(id: string, fetcher: typeof fetch = fetch): Promise<OrcidLookupResult> {
  const normalized = normalizeOrcid(id);
  if (!(ORCID_REGEX.test(normalized) && isValidOrcid(normalized))) {
    return fail(400, "INVALID_ID");
  }

  let response: Response;
  try {
    response = await fetcher(`https://pub.orcid.org/v3.0/${normalized}/person`, {
      headers: { Accept: "application/json" },
      cache: "force-cache",
      next: { revalidate: 3600 },
      // Without a deadline a hung upstream pins the request until the platform
      // kills it; the catch below already maps the abort to a 502.
      signal: AbortSignal.timeout(ORCID_TIMEOUT_MS),
    } as RequestInit);
  } catch {
    return fail(502, "UNAVAILABLE");
  }

  if (response.status === 404) return fail(404, "NOT_FOUND");
  if (!response.ok) return fail(502, "UNAVAILABLE");

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return fail(502, "UNAVAILABLE");
  }

  const name = readNameObject(body);
  if (!name) return fail(404, "NOT_FOUND");

  const firstName = readValue(name["given-names"]);
  const surname = readValue(name["family-name"]);
  const displayName = `${firstName} ${surname}`.trim();
  if (!displayName) return fail(404, "NOT_FOUND");
  return { ok: true, firstName, surname, displayName };
}

function readNameObject(body: unknown): Record<string, unknown> | null {
  if (body === null || typeof body !== "object" || !("name" in body)) return null;
  const name = (body as Record<string, unknown>).name;
  return name !== null && typeof name === "object" ? (name as Record<string, unknown>) : null;
}

function readValue(field: unknown): string {
  if (field !== null && typeof field === "object" && "value" in field) {
    const value = (field as Record<string, unknown>).value;
    if (typeof value === "string") return value;
  }
  return "";
}
