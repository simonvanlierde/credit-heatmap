import { describe, expect, it, vi } from "vitest";
import { lookupOrcidPerson } from "../orcid-lookup.js";

describe("lookupOrcidPerson", () => {
  it("rejects invalid IDs without calling upstream", async () => {
    const fetcher = vi.fn<typeof fetch>();

    expect(await lookupOrcidPerson("0000-0002-1825-0098", fetcher)).toEqual({
      ok: false,
      status: 400,
      error: "Invalid ORCID iD format",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("maps network, upstream, missing-name, and valid responses", async () => {
    const unavailable = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
    expect(await lookupOrcidPerson("0000-0002-1825-0097", unavailable)).toMatchObject({ status: 502 });

    const notFound = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 404 }));
    expect(await lookupOrcidPerson("0000-0002-1825-0097", notFound)).toMatchObject({ status: 404 });

    const malformed = vi.fn<typeof fetch>().mockResolvedValue(new Response("not json", { status: 200 }));
    expect(await lookupOrcidPerson("0000-0002-1825-0097", malformed)).toMatchObject({ status: 502 });

    const nameless = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ name: null }), { status: 200 }));
    expect(await lookupOrcidPerson("0000-0002-1825-0097", nameless)).toMatchObject({ status: 404 });

    const valid = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ name: { "given-names": { value: "Jane" }, "family-name": { value: "Smith" } } }),
          { status: 200 },
        ),
      );
    expect(await lookupOrcidPerson("0000-0002-1825-0097", valid)).toEqual({
      ok: true,
      firstName: "Jane",
      surname: "Smith",
      displayName: "Jane Smith",
    });
  });
});
