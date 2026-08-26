import { isValidOrcid, normalizeOrcid, ORCID_REGEX } from "./author";
import { fetchUpstreamJson } from "./upstream-fetch";

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

  const upstream = await fetchUpstreamJson(`https://pub.orcid.org/v3.0/${normalized}/person`, fetcher);
  if (upstream.kind === "not-found") return fail(404, "NOT_FOUND");
  if (upstream.kind !== "ok") return fail(502, "UNAVAILABLE");

  const name = readNameObject(upstream.body);
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
