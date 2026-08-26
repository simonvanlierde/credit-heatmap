import type { Author } from "./author";
import { normalizeOrcid } from "./author";

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
 * Only their own row is taken, and on that row they are the authority: the
 * name, iD, type, roles, and markers they set on themselves replace yours. A
 * cleared value is an answer, and nobody spells a person's name better than
 * they do. Edits they made to anyone else are discarded on purpose: each
 * person answers for themselves, and a stale copy must not be able to
 * overwrite the rows they were not asked about. That is the whole conflict
 * story — there is no diff to review and no per-cell merge.
 *
 * `claimId` selects who answered, out of the list they returned. It is not
 * used to decide who they are in *your* list: matching runs by id, then
 * ORCID, then name, and reports them as unmatched when none hits. Falling
 * back to position would let a contributor nobody recognises overwrite
 * whoever happens to sit at that index.
 */
export function mergeContributorRow(current: Author[], incoming: Author[], claimId: string): MergeResult {
  const claimed = incoming.find((author) => author.id === claimId);
  if (!claimed) return { authors: current, merged: null, unmatched: null };

  const index = findRow(current, claimed);
  if (index === -1) return { authors: current, merged: null, unmatched: claimed };

  const existing = current[index];
  if (!existing) return { authors: current, merged: null, unmatched: claimed };

  // Their whole row replaces yours; only the id stays, so the row keeps its
  // place in every id-keyed lookup. The derived name fields travel with the
  // name and are re-derived by the store's normalization on load anyway.
  const merged: Author = { ...claimed, id: existing.id };

  const authors = [...current];
  authors[index] = merged;
  return { authors, merged, unmatched: null };
}

/** Id, then ORCID, then name. Returns -1 when none hits. */
function findRow(current: Author[], claimed: Author): number {
  const byId = current.findIndex((author) => author.id === claimed.id);
  if (byId !== -1) return byId;

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

/**
 * Case-, space- and normalization-insensitive, so "de Vries" and "De  Vries"
 * are one person, and so is "é" typed on a device that composes it as
 * "e" + combining accent. `toLowerCase`, not `toLocaleLowerCase`: the match
 * must not depend on the host's locale (under Turkish rules "I" lowercases to
 * "ı", so the same two names would merge on one device and not on another).
 */
function compareName(name: string): string {
  return name.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
}
