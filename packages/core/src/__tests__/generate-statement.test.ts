import { describe, expect, it } from "vitest";
import { makeUiTranslator } from "../credit-i18n/ui-strings.js";
import { generateStatement } from "../generate-statement.js";
import { parseAuthorText } from "../parse-authors.js";

function makeAuthors() {
  const authors = parseAuthorText("Jane Smith\nBob White");
  const [jane, bob] = authors;
  if (!(jane && bob)) throw new Error("expected 2 authors");

  const janeConc = jane.contributions[0];
  const janeSoft = jane.contributions[8];
  const bobConc = bob.contributions[0];
  const bobInv = bob.contributions[4];
  if (!(janeConc && janeSoft && bobConc && bobInv)) throw new Error("expected contributions");

  janeConc.score = 100; // Conceptualization lead
  janeSoft.score = 50; // Software equal
  bobConc.score = 20; // Conceptualization supporting
  bobInv.score = 100; // Investigation lead
  return authors;
}

describe("generateStatement", () => {
  it("by-role format uses full names", () => {
    const stmt = generateStatement(makeAuthors(), { format: "by-role" });
    expect(stmt).toMatch(/^CRediT: /);
    expect(stmt).toContain("Conceptualization: Jane Smith, Bob White");
    expect(stmt).toContain("Software: Jane Smith");
    expect(stmt).toContain("Investigation: Bob White");
  });

  it("by-role-short format uses initials", () => {
    const stmt = generateStatement(makeAuthors(), { format: "by-role-short" });
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

  it("appends level labels for non-lead scores when showLevels is set", () => {
    const stmt = generateStatement(makeAuthors(), { format: "by-author", showLevels: true });
    // Jane: Conceptualization is lead (100) → no label; Software is equal (50) → labelled
    expect(stmt).toContain("Conceptualization, Software (Equal)");
    // Bob: Conceptualization is supporting (20) → labelled
    expect(stmt).toContain("Conceptualization (Supporting)");
  });

  it("ignores showLevels for the by-role formats", () => {
    const withLevels = generateStatement(makeAuthors(), { format: "by-role", showLevels: true });
    const without = generateStatement(makeAuthors(), { format: "by-role" });
    expect(withLevels).toBe(without);
  });

  it("credits non-author contributors on a separate Acknowledgements line", () => {
    const authors = makeAuthors();
    const bob = authors[1];
    if (!bob) throw new Error("expected Bob");
    bob.contributorType = "non-author";

    const stmt = generateStatement(authors, { format: "by-author" });
    const [creditLine, ackLine, ...rest] = stmt.split("\n\n");
    expect(rest).toHaveLength(0);
    // Authors only on the CRediT line; Bob moves to Acknowledgements.
    expect(creditLine).toMatch(/^CRediT: /);
    expect(creditLine).toContain("Jane Smith:");
    expect(creditLine).not.toContain("Bob White");
    expect(ackLine).toBe("Acknowledgements: Bob White: Conceptualization, Investigation");
  });

  it("keeps everyone on one CRediT line when separateAcknowledgements is false", () => {
    const authors = makeAuthors();
    const bob = authors[1];
    if (!bob) throw new Error("expected Bob");
    bob.contributorType = "non-author";

    const stmt = generateStatement(authors, { format: "by-author", separateAcknowledgements: false });
    expect(stmt).not.toContain("\n");
    expect(stmt).not.toContain("Acknowledgements:");
    expect(stmt).toContain("Jane Smith:");
    expect(stmt).toContain("Bob White:");
  });

  it("emits by-role in canonical CRediT order, not author-encounter order", () => {
    // First author contributes only a late-order role (Investigation); the
    // second contributes an early-order role (Conceptualization). The output
    // must still list Conceptualization first.
    const authors = parseAuthorText("Alan Adams\nBeth Brooks");
    const [alan, beth] = authors;
    if (!(alan && beth)) throw new Error("expected 2 authors");
    const alanInv = alan.contributions[4];
    const bethConc = beth.contributions[0];
    if (!(alanInv && bethConc)) throw new Error("expected contributions");
    alanInv.score = 100; // Investigation
    bethConc.score = 100; // Conceptualization

    const stmt = generateStatement(authors, { format: "by-role" });
    expect(stmt).toBe("CRediT: Conceptualization: Beth Brooks; Investigation: Alan Adams");
  });

  it("omits the CRediT line when every contributor is a non-author", () => {
    const authors = makeAuthors();
    for (const a of authors) a.contributorType = "non-author";

    const stmt = generateStatement(authors, { format: "by-author" });
    expect(stmt).not.toMatch(/^CRediT:/);
    expect(stmt).toMatch(/^Acknowledgements: /);
  });

  it("localizes the Acknowledgements prefix and level labels via translateUi", () => {
    const authors = makeAuthors();
    const bob = authors[1];
    if (!bob) throw new Error("expected Bob");
    bob.contributorType = "non-author";

    const translateUi = makeUiTranslator({
      acknowledgements: "Remerciements",
      equal: "Égal",
      supporting: "Secondaire",
    });
    const stmt = generateStatement(authors, { format: "by-author", showLevels: true, translateUi });
    // "CRediT:" stays English (proper noun); Acknowledgements + level labels localize.
    expect(stmt).toContain("CRediT: Jane Smith: Conceptualization, Software (Égal)");
    expect(stmt).toContain("Remerciements: Bob White: Conceptualization (Secondaire)");
  });
});
