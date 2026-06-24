import { describe, expect, it } from "vitest";
import { parseAuthorText } from "../parse-authors.js";
import { validateContributions } from "../validate.js";

function setScore(authors: ReturnType<typeof parseAuthorText>, index: number, role: string, score: number) {
  const author = authors[index];
  if (!author) throw new Error("expected author");
  const contribution = author.contributions.find((c) => c.role === role);
  if (!contribution) throw new Error(`expected role ${role}`);
  contribution.score = score;
}

describe("validateContributions", () => {
  it("returns no issues for an empty author list", () => {
    expect(validateContributions([])).toEqual([]);
  });

  it("warns about an author with no assigned roles", () => {
    const authors = parseAuthorText("Jane Smith\nBob White");
    setScore(authors, 0, "Conceptualization", 100);
    setScore(authors, 0, "Writing – original draft", 100);
    // Bob has nothing assigned.

    const issues = validateContributions(authors);
    expect(issues).toContainEqual({
      level: "warning",
      message: "Bob White has no assigned CRediT roles.",
    });
  });

  it("flags missing expected roles", () => {
    const authors = parseAuthorText("Jane Smith");
    setScore(authors, 0, "Investigation", 100); // present, but not an expected role

    const messages = validateContributions(authors).map((i) => i.message);
    expect(messages).toContain('No contributor is assigned "Conceptualization".');
    expect(messages).toContain('No contributor is assigned "Writing – original draft".');
  });

  it("is clean when expected roles are covered and everyone contributes", () => {
    const authors = parseAuthorText("Jane Smith");
    setScore(authors, 0, "Conceptualization", 100);
    setScore(authors, 0, "Writing – original draft", 100);

    expect(validateContributions(authors)).toEqual([]);
  });
});
