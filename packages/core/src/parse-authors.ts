import type { Author, Contribution, ContributorType } from "./author.js";
import { ORCID_INPUT_REGEX } from "./author.js";
import { CREDIT_ROLES } from "./credit-roles.js";

/**
 * Parse a single display name string into first / middle / surname parts.
 * Mirrors the logic from the original Python app's `extract_name_parts()`.
 *
 * Rules:
 *  - Strip punctuation/digits, keeping Unicode letters, combining marks,
 *    apostrophes, hyphens and whitespace (so "José", "O'Brien" and
 *    "Mary-Jane" survive intact)
 *  - First token  → firstName
 *  - Last token   → surname  (when >1 token)
 *  - Middle token → middleName (only when >2 tokens; first of any middle tokens)
 *
 * A single-token name (e.g. "Madonna") yields a firstName with empty
 * middleName and surname — that is intentional, not an error.
 */
export function parseNameParts(name: string): {
  firstName: string;
  middleName: string;
  surname: string;
} {
  const cleaned = name.replace(/[^\p{L}\p{M}'\-\s]/gu, "").trim();
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
    contributorType?: ContributorType;
    contributions?: Contribution[];
  },
): Author {
  const { firstName, middleName, surname } = parseNameParts(name);

  if (!firstName && !middleName && !surname) {
    throw new Error("Author name must contain at least one letter.");
  }

  if (overrides?.orcid && !ORCID_INPUT_REGEX.test(overrides.orcid)) {
    throw new Error(`Invalid ORCID iD: "${overrides.orcid}"`);
  }

  return {
    id: overrides?.id ?? globalThis.crypto.randomUUID(),
    name,
    firstName,
    middleName,
    surname,
    initials: buildInitials(firstName, middleName, surname),
    ...(overrides?.orcid ? { orcid: overrides.orcid } : {}),
    contributorType: overrides?.contributorType ?? "author",
    contributions: normalizeContributions(overrides?.contributions),
  };
}

/**
 * Project an arbitrary contributions list onto the canonical CREDIT_ROLES order
 * and length, keyed by role name. Imported, shared, or older-export data may
 * carry contributions in a different order or with roles missing; the matrix and
 * heatmap index contributions positionally, so they must be canonicalized here.
 */
function normalizeContributions(contributions?: Contribution[]): Contribution[] {
  const scoreByRole = new Map(contributions?.map((c) => [c.role, c.score]));
  return CREDIT_ROLES.map((r) => ({ role: r.name, score: scoreByRole.get(r.name) ?? 0 }));
}

/**
 * Assign unique initials across a list of authors without mutating the input.
 * Returns a new array of authors; the originals are left untouched.
 */
export function deduplicateAuthorInitials(authors: Author[]): Author[] {
  const existingInitials = new Set<string>();

  return authors.map((author) => {
    const initials = author.initials;
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

    existingInitials.add(attempt);
    return { ...author, initials: attempt };
  });
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
