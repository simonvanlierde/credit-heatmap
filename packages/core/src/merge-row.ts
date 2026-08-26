import type { Author } from "./author.js";
import { normalizeOrcid } from "./author.js";

export interface MergeResult {
  /** The list with the claimed row replaced, or the original list unchanged. */
  authors: Author[];
  /** The contributor whose row was taken, once merged. */
  merged: Author | null;
  /** The returned contributor when nothing in the list matched them. */
  unmatched: Author | null;
}

/**
 * Fold one co-author's returned draft back into yours.
 *
 * Only their own row is taken. A co-author working from a copy of the draft can
 * change anyone's roles, and those edits are discarded on purpose: each person
 * answers for themselves, and a stale copy must not be able to overwrite the
 * eleven rows they were not asked about. That is the whole conflict story —
 * there is no diff to review and no per-cell merge.
 *
 * `claimIndex` selects who answered, out of the list they returned. It is not
 * used to decide who they are in *your* list: matching runs by ORCID, then by
 * name, and reports them as unmatched when neither hits. Falling back to the
 * position would let a contributor nobody recognises overwrite whoever happens
 * to sit at that index.
 */
export function mergeContributorRow(current: Author[], incoming: Author[], claimIndex: number): MergeResult {
  const claimed = incoming[claimIndex];
  if (!claimed) return { authors: current, merged: null, unmatched: null };

  const index = findRow(current, claimed);
  if (index === -1) return { authors: current, merged: null, unmatched: claimed };

  const existing = current[index];
  if (!existing) return { authors: current, merged: null, unmatched: claimed };

  const merged: Author = {
    ...existing,
    // Their contributions replace yours wholesale: a role they cleared is an
    // answer, and merging by "keep the higher score" would make it impossible
    // for anyone to correct a role you had guessed at.
    contributions: claimed.contributions,
    equalContribution: claimed.equalContribution,
    corresponding: claimed.corresponding,
    // Their name and iD fill a gap, but never overwrite what you already hold:
    // the corresponding author's spelling of the byline is the one that ships.
    ...(existing.orcid ? {} : claimed.orcid ? { orcid: claimed.orcid } : {}),
  };

  const authors = [...current];
  authors[index] = merged;
  return { authors, merged, unmatched: null };
}

/** ORCID, then name. Returns -1 when neither hits. */
function findRow(current: Author[], claimed: Author): number {
  if (claimed.orcid) {
    // ORCID first: a co-author may well correct the spelling of their own name,
    // and that correction should not cost them the match.
    const byOrcid = current.findIndex(
      (author) => author.orcid && normalizeOrcid(author.orcid) === normalizeOrcid(claimed.orcid ?? ""),
    );
    if (byOrcid !== -1) return byOrcid;
  }

  return current.findIndex((author) => compareName(author.name) === compareName(claimed.name));
}

/** Case- and space-insensitive, so "de Vries" and "De  Vries" are one person. */
function compareName(name: string): string {
  return name.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}
