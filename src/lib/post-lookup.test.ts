import { describe, expect, it, vi } from "vitest";
import { postLookup } from "./post-lookup";

/** A fetch that resolves to one canned response. */
function respondWith(response: Partial<Response>) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(response as Response);
}

describe("postLookup", () => {
  it("posts JSON and returns the parsed body", async () => {
    const fetchSpy = respondWith({ ok: true, json: async () => ({ title: "Eel cognition" }) });

    expect(await postLookup("/api/doi", { doi: "10.1/2" })).toEqual({ title: "Eel cognition" });
    expect(fetchSpy).toHaveBeenCalledWith("/api/doi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doi: "10.1/2" }),
    });
  });

  it("passes the upstream failure code through, for the caller to translate", async () => {
    respondWith({ ok: false, json: async () => ({ code: "NOT_FOUND" }) });
    expect(await postLookup("/api/doi", {})).toEqual({ code: "NOT_FOUND" });
  });

  it("degrades an error body with no usable code to BAD_REQUEST", async () => {
    respondWith({ ok: false, json: async () => ({}) });
    expect(await postLookup("/api/doi", {})).toEqual({ code: "BAD_REQUEST" });

    // An HTML error page from a proxy, say: the body does not parse at all.
    respondWith({
      ok: false,
      json: () => Promise.reject(new SyntaxError("not JSON")),
    });
    expect(await postLookup("/api/doi", {})).toEqual({ code: "BAD_REQUEST" });
  });

  it("names the half that is unavailable when the request never lands", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    expect(await postLookup("/api/orcid", {})).toEqual({ code: "UNREACHABLE" });

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    expect(await postLookup("/api/orcid", {})).toEqual({ code: "OFFLINE" });
  });
});
