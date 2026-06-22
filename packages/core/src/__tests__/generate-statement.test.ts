import { describe, expect, it } from "vitest";
import { generateStatement } from "../generate-statement.js";
import { parseAuthorText } from "../parse-authors.js";

function makeAuthors() {
  const authors = parseAuthorText("Jane Smith\nBob White");
  const [jane, bob] = authors;
  if (!jane || !bob) throw new Error("expected 2 authors");

  const janeConc = jane.contributions[0];
  const janeSoft = jane.contributions[8];
  const bobConc = bob.contributions[0];
  const bobInv = bob.contributions[4];
  if (!janeConc || !janeSoft || !bobConc || !bobInv) throw new Error("expected contributions");

  janeConc.score = 100; // Conceptualization lead
  janeSoft.score = 50; // Software secondary
  bobConc.score = 20; // Conceptualization tertiary
  bobInv.score = 100; // Investigation lead
  return authors;
}

describe("generateStatement", () => {
  it("by-role format", () => {
    const stmt = generateStatement(makeAuthors(), { format: "by-role" });
    expect(stmt).toMatch(/^CRediT: /);
    expect(stmt).toContain("Conceptualization: JS, BW");
    expect(stmt).toContain("Software: JS");
    expect(stmt).toContain("Investigation: BW");
  });

  it("by-author format", () => {
    const stmt = generateStatement(makeAuthors(), { format: "by-author" });
    expect(stmt).toMatch(/^CRediT: /);
    expect(stmt).toContain("Jane Smith: Conceptualization, Software");
    expect(stmt).toContain("Bob White: Conceptualization, Investigation");
  });

  it("by-author-short format", () => {
    const stmt = generateStatement(makeAuthors(), { format: "by-author-short" });
    expect(stmt).toContain("JS:");
    expect(stmt).toContain("BW:");
  });

  it("returns empty string when no contributions", () => {
    const authors = parseAuthorText("Alice Brown");
    expect(generateStatement(authors, { format: "by-role" })).toBe("");
  });
});
