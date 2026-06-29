import { describe, expect, it } from "vitest";
import { createAuthor, deduplicateAuthorInitials, parseAuthorText, parseNameParts } from "../parse-authors.js";

describe("parseNameParts", () => {
  it("parses a three-part name", () => {
    expect(parseNameParts("Jane A Smith")).toEqual({
      firstName: "Jane",
      middleName: "A",
      surname: "Smith",
    });
  });

  it("parses a two-part name (no middle)", () => {
    expect(parseNameParts("Bob White")).toEqual({
      firstName: "Bob",
      middleName: "",
      surname: "White",
    });
  });

  it("keeps Unicode letters, apostrophes and hyphens; drops other punctuation", () => {
    // spell-checker: ignore Séan García
    expect(parseNameParts("José García")).toEqual({
      firstName: "José",
      middleName: "",
      surname: "García",
    });
    expect(parseNameParts("Mary-Jane Watson")).toEqual({
      firstName: "Mary-Jane",
      middleName: "",
      surname: "Watson",
    });
    // The comma is stripped, the apostrophe survives.
    expect(parseNameParts("O'Brien, Séan").firstName).toBe("O'Brien");
  });

  it("treats a single-token name as a first name with empty surname", () => {
    expect(parseNameParts("Madonna")).toEqual({
      firstName: "Madonna",
      middleName: "",
      surname: "",
    });
  });
});

describe("createAuthor", () => {
  it("throws when the name contains no letters", () => {
    expect(() => createAuthor("123")).toThrow(/at least one letter/);
    expect(() => createAuthor("!!!")).toThrow(/at least one letter/);
  });

  it("rejects a malformed ORCID but accepts bare and URL forms", () => {
    expect(() => createAuthor("Jane Smith", { orcid: "not-an-orcid" })).toThrow(/ORCID/);
    expect(createAuthor("Jane Smith", { orcid: "0000-0002-1825-0097" }).orcid).toBe("0000-0002-1825-0097");
    expect(createAuthor("Jane Smith", { orcid: "https://orcid.org/0000-0002-1825-0097" }).orcid).toBe(
      "https://orcid.org/0000-0002-1825-0097",
    );
  });
});

describe("deduplicateAuthorInitials", () => {
  it("does not mutate the input authors", () => {
    const original = [createAuthor("Alice Brown"), createAuthor("Amy Burke")];
    const beforeInitials = original.map((a) => a.initials);

    const deduped = deduplicateAuthorInitials(original);

    expect(original.map((a) => a.initials)).toEqual(beforeInitials);
    expect(deduped[0]).not.toBe(original[0]);
    expect(deduped[1]?.initials).not.toBe(deduped[0]?.initials);
  });
});

describe("parseAuthorText", () => {
  it("parses newline-separated names", () => {
    const authors = parseAuthorText("Alice Brown\nBob White\nCarol Ann Davis");
    expect(authors).toHaveLength(3);
    expect(authors[0]?.initials).toBe("AB");
    expect(authors[1]?.initials).toBe("BW");
    expect(authors[2]?.initials).toBe("CAD");
  });

  it("deduplicates initials when authors share them", () => {
    const authors = parseAuthorText("Alice Brown\nAmy Burke");
    expect(authors[0]?.initials).toBe("AB");
    // Second author "Amy Burke" also starts as AB — should be disambiguated
    expect(authors[1]?.initials).not.toBe("AB");
  });

  it("assigns 14 default zero-score contributions to each author", () => {
    const authors = parseAuthorText("Alice Brown");
    expect(authors[0]?.contributions).toHaveLength(14);
    expect(authors[0]?.contributions.every((c) => c.score === 0)).toBe(true);
  });
});
