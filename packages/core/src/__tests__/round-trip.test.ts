import { DOMParser } from "linkedom";
import { describe, expect, it } from "vitest";
import { fromJson, toJson } from "../export/json.js";
import { toJats4rXml } from "../export/xml.js";
import { fromXmlDocument } from "../export/xml-import.js";
import { parseAuthorText } from "../parse-authors.js";

describe("round-trip exports", () => {
  it("XML round-trip preserves names, initials, contributions, and ORCID", () => {
    const authors = parseAuthorText("Jane Smith\nBob White");
    // set some scores and an ORCID
    const [jane, bob] = authors;
    if (!jane || !bob) throw new Error("expected 2 authors");

    const jc0 = jane.contributions[0];
    if (!jc0) throw new Error("expected contribution 0 for jane");
    jc0.score = 100;
    const jc8 = jane.contributions[8];
    if (!jc8) throw new Error("expected contribution 8 for jane");
    jc8.score = 50;
    const bc0 = bob.contributions[0];
    if (!bc0) throw new Error("expected contribution 0 for bob");
    bc0.score = 20;
    const bc4 = bob.contributions[4];
    if (!bc4) throw new Error("expected contribution 4 for bob");
    bc4.score = 100;
    jane.orcid = "0000-0002-1825-0097";

    const xml = toJats4rXml(authors);
    // Node environment: parse with linkedom DOMParser and use fromXmlDocument
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const parsed = fromXmlDocument(doc as unknown as Document);

    expect(parsed).toHaveLength(2);
    const [pJane, pBob] = parsed;
    expect(pJane?.surname).toBe(jane.surname);
    expect(pJane?.firstName).toBe(jane.firstName);
    expect(pJane?.initials).toBe(jane.initials);
    expect(pJane?.orcid).toBe(jane.orcid);

    expect(pBob?.surname).toBe(bob.surname);
    expect(pBob?.initials).toBe(bob.initials);

    // contributions should be present and have the active ones set to 100
    const janeActive = pJane?.contributions.filter((c) => c.score > 0).map((c) => c.role);
    expect(janeActive).toContain("Conceptualization");
    expect(janeActive).toContain("Software");

    // JATS4R has no score field, so the round-trip is lossy by design: a
    // score of 50 (Software) comes back as 100, not the original value.
    const reSoftware = pJane?.contributions.find((c) => c.role === "Software");
    expect(jc8.score).toBe(50);
    expect(reSoftware?.score).toBe(100);
  });

  it("JSON round-trip preserves all fields including id", () => {
    const authors = parseAuthorText("Jane Smith\nBob White");
    const [jane] = authors;
    if (!jane) throw new Error("expected at least one author");

    const jc = jane.contributions[0];
    if (!jc) throw new Error("expected contribution 0 for jane");
    jc.score = 100;
    const json = toJson(authors);
    const parsed = fromJson(json);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.id).toBeDefined();
    expect(parsed[0]?.name).toBe(jane.name);
    expect(parsed[0]?.contributions[0]?.score).toBe(100);
  });

  it("XML round-trip preserves ORCID value", () => {
    const authors = parseAuthorText("Jane Smith");
    const [jane] = authors;
    if (!jane) throw new Error("expected author");

    jane.orcid = "0000-0001-2345-6789";
    const xml = toJats4rXml(authors);

    // Use fromJats4rXml path that throws if DOMParser absent — but in Node we'll parse
    // with linkedom and call fromXmlDocument instead
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const parsed = fromXmlDocument(doc as unknown as Document);
    expect(parsed[0]?.orcid).toBe("0000-0001-2345-6789");
  });
});
