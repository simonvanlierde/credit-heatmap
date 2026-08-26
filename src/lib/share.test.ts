import { createAuthor } from "@credit-generator/core";
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

describe("share links", () => {
  it("round-trips a plain draft with no claim and no draft id", () => {
    const decoded = decodeShareHash(hashOf(buildShareUrl(draft())));

    expect(decoded?.authors.map((author) => author.name)).toEqual(["Jane A. Smith", "Bob White"]);
    expect(decoded?.claimIndex).toBeNull();
    expect(decoded?.draftId).toBeNull();
  });

  it("carries the claim and the draft it was asked about", () => {
    const url = buildShareUrl(draft(), { claimIndex: 1, draftId: "paper-2" });
    expect(url).toContain("&c=1");
    expect(url).toContain("&d=paper-2");

    const decoded = decodeShareHash(hashOf(url));
    expect(decoded?.claimIndex).toBe(1);
    // Without this, a reply merges into whatever draft happens to be open.
    expect(decoded?.draftId).toBe("paper-2");
  });

  it("reads the parameters in either order", () => {
    const decoded = decodeShareHash(`${hashOf(buildShareUrl(draft()))}&d=paper-2&c=0`);
    expect(decoded?.claimIndex).toBe(0);
    expect(decoded?.draftId).toBe("paper-2");
    expect(decoded?.authors).toHaveLength(2);
  });

  it("still opens a link built before draft ids existed", () => {
    // Those links are in mailboxes already; a missing id means "the open draft".
    const decoded = decodeShareHash(`${hashOf(buildShareUrl(draft()))}&c=1`);
    expect(decoded?.claimIndex).toBe(1);
    expect(decoded?.draftId).toBeNull();
    expect(decoded?.authors).toHaveLength(2);
  });

  it("ignores parameters that are not what they claim to be", () => {
    const base = hashOf(buildShareUrl(draft()));
    expect(decodeShareHash(`${base}&c=notanumber`)?.claimIndex).toBeNull();
    expect(decodeShareHash(`${base}&c=99999`)?.claimIndex).toBeNull();
    // A hand-edited id is only ever used to look up a local draft, so a value
    // outside the expected shape is dropped rather than parsed.
    expect(decodeShareHash(`${base}&d=${"x".repeat(120)}`)?.draftId).toBeNull();
    expect(decodeShareHash(`${base}&d=../../etc`)?.draftId).toBeNull();
  });

  it("returns null for a hash that is not a share link", () => {
    expect(decodeShareHash("")).toBeNull();
    expect(decodeShareHash("#other=1")).toBeNull();
    expect(decodeShareHash("#s=not-base64!!")).toBeNull();
  });
});
