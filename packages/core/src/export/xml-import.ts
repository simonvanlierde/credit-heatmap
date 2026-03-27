import type { Author, Contribution } from "../author.js";
import { CREDIT_ROLES } from "../credit-roles.js";

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
        "Use fromXmlDocument() with a server-side DOM parser instead."
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

  const contribs = Array.from(doc.querySelectorAll("contrib"));
  if (contribs.length === 0) return [];

  const seen = new Set<string>();

  return contribs.map((contrib) => {
    const givenNamesEl = contrib.querySelector("given-names");
    const surnameEl = contrib.querySelector("surname");

    const givenNames = givenNamesEl?.textContent?.trim() ?? "";
    const surname = surnameEl?.textContent?.trim() ?? "";

    // Split given names into first + optional middle
    const parts = givenNames.split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? "";
    const middleName = parts.length > 1 ? (parts[1] ?? "") : "";

    const displayName = [firstName, middleName, surname].filter(Boolean).join(" ");

    // Build unique initials
    const baseInitials = [firstName, middleName, surname]
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");

    let initials = baseInitials;
    let extraIdx = 1;
    while (seen.has(initials)) {
      if (extraIdx < surname.length) {
        initials = baseInitials + (surname[extraIdx]?.toLowerCase() ?? String(extraIdx));
        extraIdx++;
      } else {
        initials = baseInitials + String(seen.size);
      }
    }
    seen.add(initials);

    // Parse role elements — `vocab-term` attribute is authoritative; fall back to text content
    const roleEls = Array.from(contrib.querySelectorAll("role"));
    const activeRoleNames = new Set(
      roleEls
        .map((el) => el.getAttribute("vocab-term") ?? el.textContent?.trim() ?? "")
        .filter((name) => roleNames.has(name))
    );

    const contributions: Contribution[] = CREDIT_ROLES.map((r) => ({
      role: r.name,
      score: activeRoleNames.has(r.name) ? 100 : 0,
    }));

    // Try to read ORCID from an `<contrib-id contrib-id-type="orcid">` element
    const orcidEl = contrib.querySelector('contrib-id[contrib-id-type="orcid"]');
    const orcid = orcidEl?.textContent?.trim() ?? "";

    const author: Author = {
      name: displayName,
      firstName,
      middleName,
      surname,
      initials,
      contributions,
    };

    // Attach ORCID only if the field exists on the type
    if (orcid) {
      (author as Author & { orcid?: string }).orcid = orcid;
    }

    return author;
  });
}
