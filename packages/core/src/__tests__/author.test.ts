import { describe, expect, it } from "vitest";
import {
  AuthorSchema,
  activeContributions,
  ContributionSchema,
  hasContributions,
  ORCID_REGEX,
  scoreToLevel,
} from "../author.js";
import { parseAuthorText } from "../parse-authors.js";

describe("scoreToLevel", () => {
  it("maps scores to levels at the tier boundaries", () => {
    expect(scoreToLevel(0)).toBe("none");
    expect(scoreToLevel(1)).toBe("tertiary");
    expect(scoreToLevel(33)).toBe("tertiary");
    expect(scoreToLevel(34)).toBe("secondary");
    expect(scoreToLevel(66)).toBe("secondary");
    expect(scoreToLevel(67)).toBe("lead");
    expect(scoreToLevel(100)).toBe("lead");
  });
});

describe("hasContributions / activeContributions", () => {
  it("reports false and an empty list when all scores are zero", () => {
    const [author] = parseAuthorText("Alice Brown");
    if (!author) throw new Error("expected author");
    expect(hasContributions(author)).toBe(false);
    expect(activeContributions(author)).toEqual([]);
  });

  it("returns only the non-zero contributions", () => {
    const [author] = parseAuthorText("Alice Brown");
    if (!author) throw new Error("expected author");
    const first = author.contributions[0];
    const third = author.contributions[2];
    if (!first || !third) throw new Error("expected contributions");
    first.score = 100;
    third.score = 40;

    expect(hasContributions(author)).toBe(true);
    const active = activeContributions(author);
    expect(active).toHaveLength(2);
    expect(active.map((c) => c.score)).toEqual([100, 40]);
  });
});

describe("ORCID_REGEX", () => {
  it("accepts well-formed iDs, including a trailing X checksum", () => {
    expect(ORCID_REGEX.test("0000-0002-1825-0097")).toBe(true);
    expect(ORCID_REGEX.test("0000-0001-2345-678X")).toBe(true);
  });

  it("rejects malformed iDs", () => {
    expect(ORCID_REGEX.test("1234")).toBe(false);
    expect(ORCID_REGEX.test("0000-0002-1825-009")).toBe(false); // too short
    expect(ORCID_REGEX.test("0000-0001-2345-678x")).toBe(false); // lowercase x
    expect(ORCID_REGEX.test("https://orcid.org/0000-0002-1825-0097")).toBe(false); // URL form
  });
});

describe("schemas", () => {
  it("defaults a random id and accepts a minimal valid author", () => {
    const author = AuthorSchema.parse({
      name: "Jane Smith",
      firstName: "Jane",
      middleName: "",
      surname: "Smith",
      initials: "JS",
      contributions: [],
    });
    expect(author.id).toMatch(/[0-9a-f-]{36}/);
  });

  it("rejects an empty name", () => {
    expect(() =>
      AuthorSchema.parse({
        name: "",
        firstName: "",
        middleName: "",
        surname: "",
        initials: "",
        contributions: [],
      }),
    ).toThrow();
  });

  it("rejects out-of-range or non-integer scores", () => {
    expect(() => ContributionSchema.parse({ role: "Software", score: 101 })).toThrow();
    expect(() => ContributionSchema.parse({ role: "Software", score: -1 })).toThrow();
    expect(() => ContributionSchema.parse({ role: "Software", score: 12.5 })).toThrow();
  });

  it("rejects an unknown role name", () => {
    expect(() => ContributionSchema.parse({ role: "Not A Role", score: 50 })).toThrow();
  });
});
