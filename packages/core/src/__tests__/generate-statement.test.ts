import { describe, expect, it } from "vitest";
import { generateStatement } from "../generate-statement.js";
import { parseAuthorText } from "../parse-authors.js";

function makeAuthors() {
  const authors = parseAuthorText("Jane Smith\nBob White");
  // Give Jane: Conceptualization (lead=100), Software (secondary=50)
  authors[0]?.contributions[0]!.score = 100; // Conceptualization
  authors[0]?.contributions[8]!.score = 50; // Software
  // Give Bob: Conceptualization (tertiary=20), Investigation (lead=100)
  authors[1]?.contributions[0]!.score = 20; // Conceptualization
  authors[1]?.contributions[4]!.score = 100; // Investigation
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
