import { isValidOrcid, normalizeOrcid, ORCID_REGEX } from "./author.js";

/** User-facing lookup failures. Each states the problem and what to do next. */
const INVALID_ID = "That is not a valid ORCID iD. Check the digits and try again.";
const UNAVAILABLE = "The ORCID service is unavailable. Try again shortly, or type the name.";
const NO_RECORD = "No ORCID record matches that iD.";

/** Upstream deadline. ORCID's public API normally answers well inside this. */
const ORCID_TIMEOUT_MS = 5000;

export type OrcidLookupResult =
  | { ok: true; firstName: string; surname: string; displayName: string }
  | { ok: false; status: 400 | 404 | 502; error: string };

/** Validate an ORCID iD and resolve its public name through an injected fetcher. */
export async function lookupOrcidPerson(id: string, fetcher: typeof fetch = fetch): Promise<OrcidLookupResult> {
  const normalized = normalizeOrcid(id);
  if (!(ORCID_REGEX.test(normalized) && isValidOrcid(normalized))) {
    return { ok: false, status: 400, error: INVALID_ID };
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
    return { ok: false, status: 502, error: UNAVAILABLE };
  }

  if (response.status === 404) return { ok: false, status: 404, error: NO_RECORD };
  if (!response.ok) return { ok: false, status: 502, error: UNAVAILABLE };

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, status: 502, error: UNAVAILABLE };
  }

  const name = readNameObject(body);
  if (!name) return { ok: false, status: 404, error: NO_RECORD };

  const firstName = readValue(name["given-names"]);
  const surname = readValue(name["family-name"]);
  const displayName = `${firstName} ${surname}`.trim();
  if (!displayName) return { ok: false, status: 404, error: NO_RECORD };
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
