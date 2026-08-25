import { isValidOrcid, normalizeOrcid, ORCID_REGEX } from "./author.js";

export type OrcidLookupResult =
  | { ok: true; firstName: string; surname: string; displayName: string }
  | { ok: false; status: 400 | 404 | 502; error: string };

/** Validate an ORCID iD and resolve its public name through an injected fetcher. */
export async function lookupOrcidPerson(id: string, fetcher: typeof fetch = fetch): Promise<OrcidLookupResult> {
  const normalized = normalizeOrcid(id);
  if (!(ORCID_REGEX.test(normalized) && isValidOrcid(normalized))) {
    return { ok: false, status: 400, error: "Invalid ORCID iD format" };
  }

  let response: Response;
  try {
    response = await fetcher(`https://pub.orcid.org/v3.0/${normalized}/person`, {
      headers: { Accept: "application/json" },
      cache: "force-cache",
      next: { revalidate: 3600 },
    } as RequestInit);
  } catch {
    return { ok: false, status: 502, error: "ORCID API unavailable" };
  }

  if (response.status === 404) return { ok: false, status: 404, error: "ORCID not found" };
  if (!response.ok) return { ok: false, status: 502, error: "ORCID API unavailable" };

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, status: 502, error: "ORCID API unavailable" };
  }

  const name = readNameObject(body);
  if (!name) return { ok: false, status: 404, error: "ORCID not found" };

  const firstName = readValue(name["given-names"]);
  const surname = readValue(name["family-name"]);
  const displayName = `${firstName} ${surname}`.trim();
  if (!displayName) return { ok: false, status: 404, error: "ORCID not found" };
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
