import { describe, expect, it } from "vitest";
import { parseAuthorText, parseNameParts } from "../parse-authors.js";

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

  it("strips non-alpha characters", () => {
    // spell-checker: ignore O'Brien Séan
    const result = parseNameParts("O'Brien, Séan");
    expect(result.firstName).toBe("OBrien");
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
