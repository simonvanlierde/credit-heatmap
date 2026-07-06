import { describe, expect, it } from "vitest";
import { toMarkdown } from "../export/markdown.js";
import { parseAuthorText } from "../parse-authors.js";

describe("toMarkdown", () => {
  it("renders a contributor → roles table with level annotations", () => {
    const authors = parseAuthorText("Jane Smith\nBob White");
    const [jane, bob] = authors;
    if (!(jane && bob)) throw new Error("expected 2 authors");
    const conc = jane.contributions.find((c) => c.role === "Conceptualization");
    const meth = jane.contributions.find((c) => c.role === "Methodology");
    if (!(conc && meth)) throw new Error("expected contributions");
    conc.score = 100; // lead → no annotation
    meth.score = 50; // equal → annotated

    const md = toMarkdown(authors);
    const lines = md.split("\n");
    expect(lines[0]).toBe("| Contributor | CRediT roles |");
    expect(lines[1]).toBe("| --- | --- |");
    // Level label uses the canonical English UI string (capitalized), matching
    // the statement and heatmap output.
    expect(md).toContain("| Jane Smith | Conceptualization, Methodology (Equal) |");
    // Bob has no roles → em dash placeholder
    expect(md).toContain("| Bob White | — |");
  });

  it("localizes role names and level labels via the translators", () => {
    const authors = parseAuthorText("Jane Smith");
    const [jane] = authors;
    if (!jane) throw new Error("expected author");
    const meth = jane.contributions.find((c) => c.role === "Methodology");
    if (!meth) throw new Error("expected contribution");
    meth.score = 50; // equal → annotated

    const md = toMarkdown(
      authors,
      (name) => `«${name}»`,
      (key) => (key === "equal" ? "Égal" : key),
    );
    expect(md).toContain("«Methodology» (Égal)");
  });

  it("escapes pipe characters that would break the table", () => {
    const authors = parseAuthorText("Jane Smith");
    const [jane] = authors;
    if (!jane) throw new Error("expected author");
    jane.name = "Jane | Smith";
    const conc = jane.contributions[0];
    if (!conc) throw new Error("expected contribution");
    conc.score = 100;

    expect(toMarkdown(authors)).toContain("Jane \\| Smith");
  });
});
