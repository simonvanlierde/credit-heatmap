import { describe, expect, it } from "vitest";
import { toJson } from "../export/json.js";
import { createAuthor } from "../parse-authors.js";
import { fromSharePayload, toSharePayload } from "../share-payload.js";

function makeAuthors() {
  return [
    createAuthor("Jane A. Smith", {
      orcid: "0000-0002-1825-0097",
      corresponding: true,
      equalContribution: true,
      contributions: [
        { role: "Conceptualization", score: 100 },
        { role: "Software", score: 50 },
      ],
    }),
    createAuthor("Bob White", {
      contributorType: "non-author",
      contributions: [{ role: "Investigation", score: 100 }],
    }),
  ];
}

describe("share payload", () => {
  it("round-trips names, iDs, type, scores, and markers", () => {
    const restored = fromSharePayload(toSharePayload(makeAuthors()));

    expect(restored.map((author) => author.name)).toEqual(["Jane A. Smith", "Bob White"]);
    expect(restored[0]?.orcid).toBe("0000-0002-1825-0097");
    expect(restored[0]?.corresponding).toBe(true);
    expect(restored[0]?.equalContribution).toBe(true);
    expect(restored[1]?.contributorType).toBe("non-author");

    const jane = restored[0];
    if (!jane) throw new Error("expected Jane");
    expect(jane.contributions.find((c) => c.role === "Conceptualization")?.score).toBe(100);
    expect(jane.contributions.find((c) => c.role === "Software")?.score).toBe(50);
    expect(jane.contributions.find((c) => c.role === "Methodology")?.score).toBe(0);
  });

  it("is much smaller than the JSON export it replaces", () => {
    const authors = Array.from({ length: 10 }, (_, i) =>
      createAuthor(`Author ${i} Name`, { contributions: [{ role: "Software", score: 66 }] }),
    );

    // The exact ratio is not the contract; the order of magnitude is. A link is
    // useless if a mail client wraps it.
    expect(toSharePayload(authors).length).toBeLessThan(toJson(authors).length / 5);
  });

  it("still reads a link made before the compact payload existed", () => {
    // Those links are already in people's mailboxes.
    const restored = fromSharePayload(toJson(makeAuthors()));
    expect(restored.map((author) => author.name)).toEqual(["Jane A. Smith", "Bob White"]);
    expect(restored[0]?.orcid).toBe("0000-0002-1825-0097");
  });

  it("clamps a hand-edited score rather than trusting it", () => {
    const payload = JSON.stringify({ v: 1, a: [{ n: "Jane Smith", s: [900, -5, 50.4] }] });
    const restored = fromSharePayload(payload);
    const contributions = restored[0]?.contributions ?? [];

    expect(contributions[0]?.score).toBe(100);
    expect(contributions[1]?.score).toBe(0);
    expect(contributions[2]?.score).toBe(50);
  });

  it("treats roles missing from a shorter payload as unassigned", () => {
    const restored = fromSharePayload(JSON.stringify({ v: 1, a: [{ n: "Jane Smith", s: [100] }] }));
    expect(restored[0]?.contributions).toHaveLength(14);
    expect(restored[0]?.contributions[13]?.score).toBe(0);
  });

  it("rejects a payload that is not a share payload at all", () => {
    expect(() => fromSharePayload(JSON.stringify({ v: 2, a: [] }))).toThrow();
    expect(() => fromSharePayload("not json")).toThrow();
  });

  it("gives contributors unique initials, as the workspace does", () => {
    const payload = JSON.stringify({
      v: 1,
      a: [
        { n: "Jane Smith", s: [] },
        { n: "John Smith", s: [] },
      ],
    });
    const restored = fromSharePayload(payload);
    expect(restored[0]?.initials).not.toBe(restored[1]?.initials);
  });
});
