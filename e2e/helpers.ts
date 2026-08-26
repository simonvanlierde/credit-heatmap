import type { Page } from "@playwright/test";
import { PERSIST_KEY, PERSIST_VERSION } from "../src/store/persist-meta";

/**
 * Seed the persisted store before the app boots. The key and version come from
 * the store, never restated here: a fixture stamped with a version the store no
 * longer accepts is silently discarded, and the failure surfaces as the welcome
 * modal eating the first click.
 */
export function seedStorage(
  page: Page,
  seededState: Record<string, unknown>,
  opts: { clearFirst?: boolean; onlyIfEmpty?: boolean } = {},
) {
  return page.addInitScript(
    ({ key, version, state, clearFirst, onlyIfEmpty }) => {
      if (onlyIfEmpty && window.localStorage.getItem(key)) return;
      if (clearFirst) window.localStorage.clear();
      window.localStorage.setItem(key, JSON.stringify({ state, version }));
    },
    {
      key: PERSIST_KEY,
      version: PERSIST_VERSION,
      state: seededState,
      clearFirst: opts.clearFirst ?? false,
      onlyIfEmpty: opts.onlyIfEmpty ?? false,
    },
  );
}

/**
 * Most flows exercise the workspace, not the first-run welcome. That welcome is
 * now a modal dialog, so leaving it open would intercept every click. Seeding
 * the "returning visitor" flag keeps it closed, and only when nothing is
 * stored yet, so the persistence and migration flows still own their own state.
 * The first-run modal itself is covered by its own tests.
 */
export function asReturningVisitor(page: Page) {
  return seedStorage(page, { authors: [], welcomeSeen: true }, { onlyIfEmpty: true });
}
