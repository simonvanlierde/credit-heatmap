import type { Author, Contribution } from "./author.js";
import { CREDIT_ROLES } from "./credit-roles.js";

/**
 * Parse a single display name string into first / middle / surname parts.
 * Mirrors the logic from the original Python app's `extract_name_parts()`.
 *
 * Rules:
 *  - Strip non-alpha characters (keeps spaces)
 *  - First token  → firstName
 *  - Last token   → surname  (when >1 token)
 *  - Middle token → middleName (only when >2 tokens; first of any middle tokens)
 */
export function parseNameParts(name: string): {
  firstName: string;
  middleName: string;
  surname: string;
} {
  const cleaned = name.replace(/[^a-zA-Z\s]/g, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);

  const firstName = parts[0] ?? "";
  const surname = parts.length > 1 ? (parts.at(-1) ?? "") : "";
  const middleName = parts.length > 2 ? (parts[1] ?? "") : "";

  return { firstName, middleName, surname };
}

/**
 * Build initials from name parts (e.g. "Jane A. Smith" → "JAS").
 * Only uses first letter of each non-empty part.
 */
function buildInitials(firstName: string, middleName: string, surname: string): string {
  return [firstName, middleName, surname]
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Given a list of raw name strings, parse them and assign unique initials.
 *
 * When two authors would share the same initials, we disambiguate by
 * appending lowercase characters from the surname — matching the original
 * Python app's `generate_unique_initials()` strategy.
 */
export function createAuthor(
  name: string,
  overrides?: {
    id?: string;
    orcid?: string;
    contributions?: Contribution[];
  },
): Author {
  const { firstName, middleName, surname } = parseNameParts(name);

  return {
    id: overrides?.id ?? globalThis.crypto.randomUUID(),
    name,
    firstName,
    middleName,
    surname,
    initials: buildInitials(firstName, middleName, surname),
    ...(overrides?.orcid ? { orcid: overrides.orcid } : {}),
    contributions:
      overrides?.contributions?.map((contribution) => ({ ...contribution })) ??
      CREDIT_ROLES.map((r) => ({ role: r.name, score: 0 })),
  };
}

export function deduplicateAuthorInitials(authors: Author[]): Author[] {
  const existingInitials = new Set<string>();

  for (const author of authors) {
    const initials = buildInitials(author.firstName, author.middleName, author.surname);
    let attempt = initials;
    let extraIdx = 1;

    while (existingInitials.has(attempt)) {
      if (extraIdx < author.surname.length) {
        attempt = initials + (author.surname[extraIdx]?.toLowerCase() ?? String(extraIdx));
        extraIdx += 1;
      } else {
        attempt = initials + String(existingInitials.size);
      }
    }

    author.initials = attempt;
    existingInitials.add(attempt);
  }

  return authors;
}

export function parseAuthors(names: string[]): Author[] {
  return deduplicateAuthorInitials(names.map((name) => createAuthor(name)));
}

/**
 * Parse a newline- or comma-separated string of author names into Author objects.
 * Empty lines / entries are ignored.
 */
export function parseAuthorText(text: string): Author[] {
  const names = text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parseAuthors(names);
}
