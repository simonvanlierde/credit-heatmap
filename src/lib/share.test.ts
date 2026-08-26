// biome-ignore lint/correctness/noNodejsModules: tests run in Node; zlib hand-builds hostile payloads
import { deflateRawSync } from "node:zlib";
import { createAuthor, toSharePayload } from "@credit-generator/core";
import { describe, expect, it } from "vitest";
import { buildShareUrl, decodeShareHash } from "./share";

function draft() {
  return [
    createAuthor("Jane A. Smith", { contributions: [{ role: "Conceptualization", score: 100 }] }),
    createAuthor("Bob White", { contributions: [{ role: "Investigation", score: 100 }] }),
  ];
}

/** The fragment of a built URL, which is what `decodeShareHash` takes. */
function hashOf(url: string): string {
  return url.slice(url.indexOf("#"));
}

/** Deflate + base64url, as buildShareUrl does, for hand-built payloads. */
function compressedHash(payload: string): string {
  return `#s=${deflateRawSync(Buffer.from(payload)).toString("base64url")}`;
}

describe("share links", () => {
  it("round-trips a plain draft with no claim and no draft id", async () => {
    const decoded = await decodeShareHash(hashOf(await buildShareUrl(draft())));

    expect(decoded?.authors.map((author) => author.name)).toEqual(["Jane A. Smith", "Bob White"]);
    expect(decoded?.claimIndex).toBeNull();
    expect(decoded?.draftId).toBeNull();
  });

  it("compresses the payload, not just encodes it", async () => {
    const authors = Array.from({ length: 10 }, (_, i) =>
      createAuthor(`Author ${i} Name`, { contributions: [{ role: "Software", score: 66 }] }),
    );
    const fragment = hashOf(await buildShareUrl(authors));
    const uncompressed = Buffer.from(toSharePayload(authors)).toString("base64url");

    // The exact ratio is not the contract; shorter than plain base64 is.
    expect(fragment.length).toBeLessThan(uncompressed.length / 2);
  });

  it("carries the claim and the draft it was asked about", async () => {
    const url = await buildShareUrl(draft(), { claimIndex: 1, draftId: "paper-2" });
    expect(url).toContain("&c=1");
    expect(url).toContain("&d=paper-2");

    const decoded = await decodeShareHash(hashOf(url));
    expect(decoded?.claimIndex).toBe(1);
    // Without this, a reply merges into whatever draft happens to be open.
    expect(decoded?.draftId).toBe("paper-2");
  });

  it("reads the parameters in either order", async () => {
    const decoded = await decodeShareHash(`${hashOf(await buildShareUrl(draft()))}&d=paper-2&c=0`);
    expect(decoded?.claimIndex).toBe(0);
    expect(decoded?.draftId).toBe("paper-2");
    expect(decoded?.authors).toHaveLength(2);
  });

  it("still opens a link built before draft ids existed", async () => {
    // A missing id means "the open draft".
    const decoded = await decodeShareHash(`${hashOf(await buildShareUrl(draft()))}&c=1`);
    expect(decoded?.claimIndex).toBe(1);
    expect(decoded?.draftId).toBeNull();
    expect(decoded?.authors).toHaveLength(2);
  });

  it("ignores parameters that are not what they claim to be", async () => {
    const base = hashOf(await buildShareUrl(draft()));
    expect((await decodeShareHash(`${base}&c=notanumber`))?.claimIndex).toBeNull();
    expect((await decodeShareHash(`${base}&c=99999`))?.claimIndex).toBeNull();
    // A hand-edited id is only ever used to look up a local draft, so a value
    // outside the expected shape is dropped rather than parsed.
    expect((await decodeShareHash(`${base}&d=${"x".repeat(120)}`))?.draftId).toBeNull();
    expect((await decodeShareHash(`${base}&d=../../etc`))?.draftId).toBeNull();
  });

  it("degrades a truncated percent escape to a missing draft id, not a throw", async () => {
    // A mail client can cut a link mid-escape; decodeURIComponent would throw
    // URIError on "%", and this is called from a mount effect.
    const base = hashOf(await buildShareUrl(draft()));
    const decoded = await decodeShareHash(`${base}&c=1&d=%`);
    expect(decoded?.claimIndex).toBe(1);
    expect(decoded?.draftId).toBeNull();
  });

  it("returns null for a hash that is not a share link", async () => {
    expect(await decodeShareHash("")).toBeNull();
    expect(await decodeShareHash("#other=1")).toBeNull();
    expect(await decodeShareHash("#s=not-base64!!")).toBeNull();
    // Valid base64url, but not deflate data.
    expect(await decodeShareHash("#s=aGVsbG8")).toBeNull();
  });

  it("refuses a decompression bomb instead of inflating it", async () => {
    // ~2 MB of zeros deflates to a few kB but must not decode past the cap.
    const bomb = compressedHash("0".repeat(2_000_000));
    expect(await decodeShareHash(bomb)).toBeNull();
  });
});
