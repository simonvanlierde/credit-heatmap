import { z } from "zod";
import { CREDIT_ROLES } from "./credit-roles.js";

/**
 * A contribution is a 0–100 integer score for one CRediT role.
 *
 * Score semantics (used by UI and statement generation):
 *   0       = no contribution
 *   1–33    = tertiary
 *   34–66   = secondary
 *   67–100  = lead
 *
 * Storing a continuous score (not just a boolean) lets us express
 * contribution levels without committing to a fixed tier count in
 * the data model — the UI input mode is a presentation concern only.
 */
export const ContributionSchema = z.object({
  role: z.enum(CREDIT_ROLES.map((r) => r.name) as [string, ...string[]]),
  score: z.number().int().min(0).max(100),
});

export type Contribution = z.infer<typeof ContributionSchema>;

export const AuthorSchema = z.object({
  /** Stable unique identifier for UI state and persistence */
  id: z
    .string()
    .min(1)
    .default(() => globalThis.crypto.randomUUID()),
  /** Display name as entered by the user (e.g. "Jane A. Smith") */
  name: z.string().min(1),
  /** Parsed first name */
  firstName: z.string(),
  /** Parsed middle name (may be empty) */
  middleName: z.string(),
  /** Parsed surname */
  surname: z.string(),
  /**
   * Unique initials (e.g. "JAS"). Generated automatically, deduplicated
   * across the author list. Used in the short statement format.
   */
  initials: z.string(),
  /**
   * ORCID iD in URL form (e.g. "https://orcid.org/0000-0002-1825-0097")
   * or bare 16-digit format ("0000-0002-1825-0097"). Optional.
   */
  orcid: z.string().optional(),
  /** Scores for each of the 14 CRediT roles, keyed by role name */
  contributions: z.array(ContributionSchema),
});

export type Author = z.infer<typeof AuthorSchema>;

/** ORCID iD bare format: 0000-0001-2345-678X */
export const ORCID_REGEX = /^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/;

/** Contribution level derived from a 0-100 score */
export type ContributionLevel = "none" | "tertiary" | "secondary" | "lead";

export function scoreToLevel(score: number): ContributionLevel {
  if (score === 0) return "none";
  if (score <= 33) return "tertiary";
  if (score <= 66) return "secondary";
  return "lead";
}

/** True if the author has any non-zero contribution */
export function hasContributions(author: Author): boolean {
  return author.contributions.some((c) => c.score > 0);
}

/** Return only roles where score > 0 for a given author */
export function activeContributions(author: Author): Contribution[] {
  return author.contributions.filter((c) => c.score > 0);
}
