/**
 * Where the draft is persisted, and under which version.
 *
 * Its own module, with no imports, so a test can seed `localStorage` without
 * pulling in the store — and, more to the point, without restating the version
 * as a literal. A fixture stamped with a version the store no longer accepts is
 * discarded on load, which means the test seeds *nothing* and then fails
 * somewhere unrelated: the welcome modal reappears and swallows the first
 * click. That has cost real debugging time; importing these two names is what
 * stops it recurring.
 *
 * Bump `PERSIST_VERSION` when the persisted shape changes. There is no
 * migration registry until launch: the repair pass in contribution-store.ts
 * normalizes on every load, and a bump only invalidates newer drafts.
 */
export const PERSIST_VERSION = 2;

/** localStorage key the store persists under. */
export const PERSIST_KEY = "credit-generator-state";
