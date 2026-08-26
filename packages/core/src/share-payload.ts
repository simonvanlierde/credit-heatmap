import { z } from "zod";
import type { Author } from "./author.js";
import { MAX_AUTHORS } from "./author.js";
import { CREDIT_ROLES } from "./credit-roles.js";
import { createAuthor, deduplicateAuthorInitials } from "./parse-authors.js";

/**
 * A draft squeezed small enough to travel in a URL.
 *
 * The JSON export repeats all fourteen role names for every contributor, which
 * is roughly nine tenths of its bytes and puts a ten-author link past 18 kB —
 * fine in a browser, but long enough that mail clients start wrapping it. Here
 * the scores are positional, in `CREDIT_ROLES` order, and every key is one
 * character. The same ten authors come out near 1.7 kB.
 *
 * Names are the only thing that cannot be shortened, so they are the floor.
 */
const SharePayloadSchema = z.object({
  /** Payload version. Bump when the field letters change meaning. */
  v: z.literal(1),
  a: z
    .array(
      z.object({
        /** name */
        n: z.string(),
        /** ORCID iD, omitted when there is none */
        o: z.string().optional(),
        /** 1 for a non-author contributor; omitted for a named author */
        t: z.literal(1).optional(),
        /** scores, in CREDIT_ROLES order */
        s: z.array(z.number()),
        /** shares first authorship */
        e: z.literal(1).optional(),
        /** corresponding author */
        c: z.literal(1).optional(),
      }),
    )
    .max(MAX_AUTHORS),
});

/** Serialize authors into the compact share shape. Minified, never pretty. */
export function toSharePayload(authors: Author[]): string {
  const scoreByRole = (author: Author) => {
    const scores = new Map(author.contributions.map((contribution) => [contribution.role, contribution.score]));
    return CREDIT_ROLES.map((role) => scores.get(role.name) ?? 0);
  };

  return JSON.stringify({
    v: 1,
    a: authors.map((author) => ({
      n: author.name,
      ...(author.orcid ? { o: author.orcid } : {}),
      ...(author.contributorType === "non-author" ? { t: 1 } : {}),
      s: scoreByRole(author),
      ...(author.equalContribution ? { e: 1 } : {}),
      ...(author.corresponding ? { c: 1 } : {}),
    })),
  });
}

/**
 * Read the compact share shape. Throws on anything else, which the caller
 * turns into "that link could not be opened".
 */
export function fromSharePayload(json: string): Author[] {
  const payload = SharePayloadSchema.parse(JSON.parse(json));
  return deduplicateAuthorInitials(
    payload.a.map((entry) =>
      createAuthor(entry.n, {
        ...(entry.o ? { orcid: entry.o } : {}),
        contributorType: entry.t === 1 ? "non-author" : "author",
        contributions: CREDIT_ROLES.map((role, index) => ({
          role: role.name,
          // A payload from a build with fewer roles simply has a shorter array;
          // the roles it did not know about read as unassigned.
          score: clampScore(entry.s[index] ?? 0),
        })),
        equalContribution: entry.e === 1,
        corresponding: entry.c === 1,
      }),
    ),
  );
}

/** Scores are integers 0–100 everywhere else; a hand-edited link is not trusted. */
function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.round(Math.max(0, Math.min(100, score)));
}
