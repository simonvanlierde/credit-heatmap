import { describe, expect, it } from "vitest";
import { mergeContributorRow } from "../merge-row";
import { createAuthor } from "../parse-authors";

const JANE_ORCID = "0000-0002-1825-0097";

function draft() {
  return [
    createAuthor("Jane A. Smith", { orcid: JANE_ORCID, contributions: [{ role: "Conceptualization", score: 100 }] }),
    createAuthor("Bob White", { contributions: [{ role: "Investigation", score: 50 }] }),
    createAuthor("Carol Davis", { contributions: [{ role: "Software", score: 100 }] }),
  ];
}

/** What a co-author sends back: the whole draft, with their own row filled in. */
function returned(edit: (authors: ReturnType<typeof draft>) => void) {
  const authors = draft();
  edit(authors);
  return authors;
}

function scoreFor(author: { contributions: { role: string; score: number }[] }, role: string): number {
  return author.contributions.find((contribution) => contribution.role === role)?.score ?? 0;
}

describe("mergeContributorRow", () => {
  it("takes the claimed row and discards their edits to everyone else", () => {
    const incoming = returned((authors) => {
      const [, bob, carol] = authors;
      if (!(bob && carol)) throw new Error("expected the draft");
      bob.contributions = [{ role: "Investigation", score: 100 }];
      // Bob has opinions about Carol. They are not collected.
      carol.contributions = [{ role: "Software", score: 0 }];
    });

    const result = mergeContributorRow(draft(), incoming, 1);

    expect(result.merged?.name).toBe("Bob White");
    expect(scoreFor(result.authors[1] as never, "Investigation")).toBe(100);
    expect(scoreFor(result.authors[2] as never, "Software")).toBe(100);
  });

  it("lets a co-author clear a role you had guessed at", () => {
    const incoming = returned((authors) => {
      const bob = authors[1];
      if (!bob) throw new Error("expected the draft");
      bob.contributions = [];
    });

    const result = mergeContributorRow(draft(), incoming, 1);
    expect(scoreFor(result.authors[1] as never, "Investigation")).toBe(0);
  });

  it("does not fall back to the claimed position", () => {
    // The position says who answered, never who they are in your list: an
    // unrecognised contributor must not land on whoever sits at that index.
    const incoming = [createAuthor("Erik Nilsson", { contributions: [{ role: "Software", score: 100 }] })];
    const result = mergeContributorRow(draft(), incoming, 0);

    expect(result.authors[0]?.name).toBe("Jane A. Smith");
    expect(scoreFor(result.authors[0] as never, "Conceptualization")).toBe(100);
    expect(result.unmatched?.name).toBe("Erik Nilsson");
  });

  it("matches on ORCID even when they corrected their own name", () => {
    const incoming = returned((authors) => {
      const jane = authors[0];
      if (!jane) throw new Error("expected the draft");
      jane.name = "Jane Alexandra Smith";
      jane.contributions = [{ role: "Supervision", score: 100 }];
    });

    const result = mergeContributorRow(draft(), incoming, 0);

    expect(result.merged).not.toBeNull();
    // Their roles land; your spelling of the byline stands.
    expect(scoreFor(result.authors[0] as never, "Supervision")).toBe(100);
    expect(result.authors[0]?.name).toBe("Jane A. Smith");
  });

  it("matches on name when neither side carries an iD, ignoring case and spacing", () => {
    const current = [createAuthor("Anne de Vries")];
    const incoming = [createAuthor("anne  DE vries", { contributions: [{ role: "Methodology", score: 100 }] })];

    const result = mergeContributorRow(current, incoming, 0);
    expect(scoreFor(result.authors[0] as never, "Methodology")).toBe(100);
  });

  it("fills an ORCID you do not have, but never overwrites one you do", () => {
    const current = [createAuthor("Bob White")];
    const incoming = [createAuthor("Bob White", { orcid: JANE_ORCID })];
    expect(mergeContributorRow(current, incoming, 0).authors[0]?.orcid).toBe(JANE_ORCID);

    const held = [createAuthor("Bob White", { orcid: "0000-0001-5109-3700" })];
    expect(mergeContributorRow(held, incoming, 0).authors[0]?.orcid).toBe("0000-0001-5109-3700");
  });

  it("carries the markers the co-author set on themselves", () => {
    const incoming = returned((authors) => {
      const bob = authors[1];
      if (!bob) throw new Error("expected the draft");
      bob.corresponding = true;
      bob.equalContribution = true;
    });

    const result = mergeContributorRow(draft(), incoming, 1);
    expect(result.authors[1]?.corresponding).toBe(true);
    expect(result.authors[1]?.equalContribution).toBe(true);
  });

  it("reports someone who matches nobody, rather than silently doing nothing", () => {
    const incoming = [createAuthor("Erik Nilsson", { contributions: [{ role: "Software", score: 100 }] })];

    const result = mergeContributorRow(draft(), incoming, 0);

    expect(result.merged).toBeNull();
    expect(result.unmatched?.name).toBe("Erik Nilsson");
    expect(result.authors).toHaveLength(3);
  });

  it("does nothing when the claim points past the returned list", () => {
    const result = mergeContributorRow(draft(), draft(), 9);
    expect(result).toEqual({ authors: expect.any(Array), merged: null, unmatched: null });
    expect(result.authors).toHaveLength(3);
  });

  it("does nothing with an empty return", () => {
    const result = mergeContributorRow(draft(), [], 0);
    expect(result.merged).toBeNull();
    expect(result.unmatched).toBeNull();
  });

  it("leaves the rest of the list in its original order", () => {
    const result = mergeContributorRow(draft(), draft(), 1);
    expect(result.authors.map((author) => author.name)).toEqual(["Jane A. Smith", "Bob White", "Carol Davis"]);
  });
});

describe("name matching robustness", () => {
  it("matches across Unicode normalization forms and is host-locale independent", () => {
    // "é" typed as NFC on one device and as NFD (e + combining accent) on
    // another is the same person; toLocaleLowerCase would additionally make
    // the match depend on the host's locale (Turkish "I" → "ı").
    const current = [createAuthor("Renée Dupont", { contributions: [{ role: "Software", score: 0 }] })];
    const incoming = [createAuthor("Renée DUPONT", { contributions: [{ role: "Software", score: 100 }] })];

    const result = mergeContributorRow(current, incoming, 0);
    expect(result.unmatched).toBeNull();
    expect(result.merged?.name).toBe("Renée Dupont");
    expect(result.authors[0]?.contributions.find((c) => c.role === "Software")?.score).toBe(100);
  });
});
