/**
 * POST a JSON body to one of the app's lookup proxies (/api/doi, /api/orcid).
 *
 * Failures come back as a *code*, not a message: this runs outside React, so
 * it cannot translate. Each caller holds its own code → message-key map. An
 * error body without a usable code degrades to BAD_REQUEST.
 */
export async function postLookup<T extends object>(url: string, body: unknown): Promise<T | { code: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { code?: string } | null;
      return { code: data?.code ?? "BAD_REQUEST" };
    }
    return (await res.json()) as T;
  } catch {
    // The lookup proxies are the only paths that need a network; the rest of
    // the app works offline, so say which half is unavailable rather than
    // blaming the upstream service.
    return { code: navigator.onLine ? "UNREACHABLE" : "OFFLINE" };
  }
}
