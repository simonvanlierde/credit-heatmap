/**
 * The one upstream JSON fetch both lookups share: same headers, same caching,
 * same deadline, same failure ladder. Each caller maps the kinds onto its own
 * error codes and messages and parses the body with its own schema.
 */
export type UpstreamResult = { kind: "ok"; body: unknown } | { kind: "not-found" } | { kind: "unavailable" };

/** Upstream deadline. Crossref and ORCID both normally answer well inside this. */
const UPSTREAM_TIMEOUT_MS = 5000;

export async function fetchUpstreamJson(url: string, fetcher: typeof fetch): Promise<UpstreamResult> {
  let response: Response;
  try {
    response = await fetcher(url, {
      headers: { Accept: "application/json" },
      cache: "force-cache",
      next: { revalidate: 3600 },
      // Without a deadline a hung upstream pins the request until the platform
      // kills it; the caller maps "unavailable" to a 502.
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    } as RequestInit);
  } catch {
    return { kind: "unavailable" };
  }

  if (response.status === 404) return { kind: "not-found" };
  if (!response.ok) return { kind: "unavailable" };

  try {
    return { kind: "ok", body: await response.json() };
  } catch {
    return { kind: "unavailable" };
  }
}
