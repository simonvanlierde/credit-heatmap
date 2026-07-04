import type { Author, Contribution } from "../author.js";
import { isValidOrcid } from "../author.js";
import { CREDIT_ROLES } from "../credit-roles.js";
import { createAuthor, deduplicateAuthorInitials } from "../parse-authors.js";

/**
 * Parse a JATS4R XML string (as produced by `toJats4rXml()` or the original
 * Python app) back into an Author array.
 *
 * Runs in both browser (DOMParser) and Node (requires a DOM — see note below).
 *
 * Node note: this function uses the global `DOMParser`. In Node ≥ 19 there is
 * no built-in DOMParser, so callers that need server-side XML import should
 * pass in a pre-parsed Document via the overloaded `fromXmlDocument()` helper,
 * or use a lightweight DOM library such as `linkedom`.
 * In the browser this just works.
 */
export function fromJats4rXml(xmlString: string): Author[] {
  if (typeof DOMParser === "undefined") {
    throw new Error(
      "DOMParser is not available in this environment. " +
        "Use fromXmlDocument() with a server-side DOM parser instead.",
    );
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error(`XML parse error: ${parseError.textContent?.trim() ?? "invalid XML"}`);
  }

  return fromXmlDocument(doc);
}

/**
 * Extract authors from a pre-parsed XML Document.
 * Works in any environment — pass the Document from whatever DOM library you use.
 */
export function fromXmlDocument(doc: Document): Author[] {
  const roleNames = new Set<string>(CREDIT_ROLES.map((r) => r.name));

  const contributions = Array.from(doc.querySelectorAll("contrib"));
  if (contributions.length === 0) return [];

  const authors = contributions.flatMap((contrib) => {
    const givenNamesEl = contrib.querySelector("given-names");
    const surnameEl = contrib.querySelector("surname");

    const givenNames = givenNamesEl?.textContent?.trim() ?? "";
    const surname = surnameEl?.textContent?.trim() ?? "";

    const displayName = [givenNames, surname].filter(Boolean).join(" ");
    // Skip nameless contribs (e.g. a <collab> group, or a malformed entry)
    // rather than throwing and discarding every other valid author.
    if (!displayName) return [];

    // Parse role elements — `vocab-term` attribute is authoritative; fall back to text content
    const roleEls = Array.from(contrib.querySelectorAll("role"));
    const activeRoleNames = new Set(
      roleEls
        .map((el) => el.getAttribute("vocab-term") ?? el.textContent?.trim() ?? "")
        .filter((name) => roleNames.has(name)),
    );

    // JATS4R carries no score, only role presence — so every active role comes
    // back as 100. A score of e.g. 50 exported to XML re-imports as 100; this
    // lossy round-trip is by design (the format has no field for it).
    const contributions: Contribution[] = CREDIT_ROLES.map((r) => ({
      role: r.name,
      score: activeRoleNames.has(r.name) ? 100 : 0,
    }));

    // Try to read ORCID from an `<contrib-id contrib-id-type="orcid">` element
    const orcidEl = contrib.querySelector('contrib-id[contrib-id-type="orcid"]');
    const orcid = orcidEl?.textContent?.trim() ?? "";

    return [
      createAuthor(displayName, {
        contributions,
        // Drop an unparseable ORCID rather than aborting the whole import.
        ...(orcid && isValidOrcid(orcid) ? { orcid } : {}),
      }),
    ];
  });

  return deduplicateAuthorInitials(authors);
}
