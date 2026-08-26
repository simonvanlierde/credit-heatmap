import type { Author, CreditRoleName } from "@credit-generator/core";
import {
  CREDIT_ROLES,
  createAuthor,
  DEFAULT_MONO_COLOR,
  deduplicateAuthorInitials,
  isUsableAuthorName,
  isValidOrcid,
  MAX_AUTHOR_NAME_LENGTH,
  MAX_AUTHORS,
  normalizeOrcid,
  parseAuthorText,
} from "@credit-generator/core";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { announce } from "@/lib/announce";

export type InputMode = "toggle" | "levels";

/**
 * One paper's worth of work.
 *
 * Everything describing *this paper* lives here; everything describing *this
 * person's preferences* (interface language, whether the welcome has been seen)
 * stays outside it, so switching drafts never changes the interface.
 */
export interface Draft {
  id: string;
  title: string;
  authors: Author[];
  inputMode: InputMode;
  heatmapMonoColor: string;
  outputLocale: string;
  /** Last write, in epoch milliseconds. Orders the picker. */
  updatedAt: number;
}

/** More than anyone writes at once, and well inside what localStorage holds. */
export const MAX_DRAFTS = 50;

interface ContributionState {
  authors: Author[];
  /** The work's title, filled by a DOI import. Draft data, so `reset` clears it. */
  title: string;
  inputMode: InputMode;
  heatmapMonoColor: string;
  /** Language for the generated statement + human-facing exports (role names only). */
  outputLocale: string;
  /**
   * Language for the app's own interface. Separate from `outputLocale` on
   * purpose: a researcher may want a Dutch interface while submitting an
   * English statement to an English-language journal.
   */
  uiLocale: string;
  /** Whether the first-run welcome has ever been shown. Persisted; only ever set
   *  true, so returning users are never auto-greeted again. */
  welcomeSeen: boolean;
  /** Whether the welcome card is currently open. Ephemeral (not persisted), so a
   *  "How it works" re-open never survives a reload as a fake first run. */
  welcomeOpen: boolean;
  /**
   * Every draft *except* the live one, which is held in the top-level fields
   * above so no component has to reach through a map to read its authors.
   * Storage sees the normalized form: `partialize` folds the live fields back
   * into this map on the way out, and `merge` unpacks the active one on the
   * way in.
   */
  drafts: Record<string, Draft>;
  activeDraftId: string;
  loadAuthors: (authors: Author[]) => void;
  setTitle: (title: string) => void;
  /** Start an empty draft and switch to it. Returns its id, or null at the cap. */
  createDraft: () => string | null;
  switchDraft: (draftId: string) => void;
  renameDraft: (draftId: string, title: string) => void;
  /** Copy a draft, contributions and all. Returns the new id, or null at the cap. */
  duplicateDraft: (draftId: string) => string | null;
  deleteDraft: (draftId: string) => void;
  loadSample: () => void;
  setAuthorsFromText: (text: string) => void;
  /** Adds a contributor and returns its id; null when the name has no letters to parse. */
  addAuthor: (name: string, orcid?: string) => string | null;
  removeAuthor: (authorId: string) => void;
  restoreAuthor: (author: Author, index: number) => void;
  moveAuthor: (fromIndex: number, toIndex: number) => void;
  updateAuthorName: (authorId: string, name: string) => boolean;
  updateAuthorOrcid: (authorId: string, orcid: string) => void;
  setAuthorType: (authorId: string, contributorType: Author["contributorType"]) => void;
  /** Toggle one of the two markers that sit outside the CRediT taxonomy. */
  setAuthorMarker: (authorId: string, marker: "equalContribution" | "corresponding", value: boolean) => void;
  setAuthorScore: (authorId: string, roleIndex: number, score: number) => void;
  setAllAuthorScores: (authorId: string, score: number) => void;
  setRoleScores: (roleIndex: number, score: number) => void;
  toggleContribution: (authorId: string, roleIndex: number) => void;
  setInputMode: (mode: InputMode) => void;
  setHeatmapMonoColor: (color: string) => void;
  setOutputLocale: (locale: string) => void;
  setUiLocale: (locale: string) => void;
  openWelcome: () => void;
  closeWelcome: () => void;
  reset: () => void;
}

export const ROLE_NAMES = CREDIT_ROLES.map((role) => role.name);

/** Cap on the stored work title. Long enough for any real one, short enough
 *  that a pasted document cannot bloat the persisted draft. */
const MAX_TITLE_LENGTH = 500;

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

/** A small, realistic three-author dataset for the first-run "Load sample" action. */
function buildSampleAuthors(): Author[] {
  const scores: Record<string, Partial<Record<CreditRoleName, number>>> = {
    "Jane A. Smith": {
      Conceptualization: 100,
      Methodology: 66,
      "Writing – original draft": 100,
      Supervision: 33,
    },
    "Bob White": {
      Investigation: 100,
      "Data curation": 100,
      Software: 66,
      "Formal analysis": 66,
    },
    "Carol Davis": {
      "Funding acquisition": 100,
      "Project administration": 100,
      "Writing – review & editing": 100,
      Resources: 66,
    },
  };

  return Object.entries(scores).map(([name, roleScores]) =>
    createAuthor(name, {
      contributions: ROLE_NAMES.map((role) => ({
        role,
        score: roleScores[role as CreditRoleName] ?? 0,
      })),
    }),
  );
}

function findAuthorIndex(authors: Author[], authorId: string): number {
  return authors.findIndex((author) => author.id === authorId);
}

function normalizeAuthors(authors: Author[]): Author[] {
  if (authors.length > MAX_AUTHORS) {
    throw new Error(`A draft can contain at most ${MAX_AUTHORS} contributors.`);
  }
  return deduplicateAuthorInitials(
    authors.map((author) =>
      createAuthor(author.name, {
        id: author.id,
        orcid: author.orcid,
        contributorType: author.contributorType,
        contributions: author.contributions,
        equalContribution: author.equalContribution,
        corresponding: author.corresponding,
      }),
    ),
  );
}

/** Snapshot the live top-level fields as a draft record. */
function liveDraft(state: ContributionState): Draft {
  return {
    id: state.activeDraftId,
    title: state.title,
    authors: state.authors,
    inputMode: state.inputMode,
    heatmapMonoColor: state.heatmapMonoColor,
    outputLocale: state.outputLocale,
    updatedAt: Date.now(),
  };
}

/** Write a draft record into the live top-level fields. */
function applyDraft(state: ContributionState, draft: Draft): void {
  state.activeDraftId = draft.id;
  state.title = draft.title;
  state.authors = draft.authors;
  state.inputMode = draft.inputMode;
  state.heatmapMonoColor = draft.heatmapMonoColor;
  state.outputLocale = draft.outputLocale;
}

/** A fresh, empty draft. */
function emptyDraft(title = ""): Draft {
  return {
    id: globalThis.crypto.randomUUID(),
    title,
    authors: [],
    inputMode: "toggle",
    heatmapMonoColor: DEFAULT_MONO_COLOR,
    outputLocale: "en",
    updatedAt: Date.now(),
  };
}

/** Park the live draft in the map, so a switch does not lose it. */
function stashLive(state: ContributionState): void {
  state.drafts[state.activeDraftId] = liveDraft(state);
}

/** Current persisted shape. See the `version` note in the persist config. */
const PERSIST_VERSION = 1;

/**
 * One entry per version bump, keyed by the version it produces.
 *
 * Empty until launch. A step receives the state as the previous version left
 * it and returns it in its own shape, e.g.
 *   2: (state) => ({ ...state, heatmapMonoColor: state.color ?? DEFAULT_MONO_COLOR }),
 */
const MIGRATIONS: Record<number, (state: Record<string, unknown>) => Record<string, unknown>> = {};

/** Run every migration between the persisted version and the current one. */
function migratePersisted(persisted: unknown, from: number): unknown {
  if (persisted === null || typeof persisted !== "object") return {};
  // A draft from a *newer* build may hold fields this one does not understand,
  // and no step exists to walk backwards. Start fresh rather than guess.
  if (from > PERSIST_VERSION) return {};

  let state = persisted as Record<string, unknown>;
  for (let version = from + 1; version <= PERSIST_VERSION; version += 1) {
    const step = MIGRATIONS[version];
    if (step) state = step(state);
  }
  return state;
}

/** Drop anything from a draft's contributor list that would make a later edit throw. */
function repairAuthors(authors: unknown): Author[] {
  if (!Array.isArray(authors)) return [];
  return authors
    .filter((author): author is Author => {
      if (author === null || typeof author !== "object") return false;
      const name = (author as { name?: unknown }).name;
      // The exact rule createAuthor enforces; anything else throws on the next
      // list edit rather than at load, which is far harder to diagnose.
      return typeof name === "string" && name.length <= MAX_AUTHOR_NAME_LENGTH && isUsableAuthorName(name);
    })
    .slice(0, MAX_AUTHORS);
}

/** Rebuild one persisted draft, filling anything missing or malformed. */
function repairSingleDraft(value: unknown, id: string): Draft {
  const raw = (value !== null && typeof value === "object" ? value : {}) as Partial<Draft>;
  return {
    id,
    title: typeof raw.title === "string" ? raw.title.slice(0, MAX_TITLE_LENGTH) : "",
    authors: repairAuthors(raw.authors),
    inputMode: raw.inputMode === "levels" ? "levels" : "toggle",
    heatmapMonoColor: typeof raw.heatmapMonoColor === "string" ? raw.heatmapMonoColor : DEFAULT_MONO_COLOR,
    outputLocale: typeof raw.outputLocale === "string" ? raw.outputLocale : "en",
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0,
  };
}

/**
 * Turn the persisted, normalized shape back into the live one.
 *
 * Repair runs on every load, not just on a version change: a draft can be
 * malformed without its version being wrong — localStorage edited by hand, a
 * half-written value from a crashed tab, or a field this build no longer
 * accepts. `normalizeAuthors` throws on a contributor it cannot rebuild, and it
 * runs inside the reducer for *every* list edit, so one bad row means adding,
 * removing or renaming anything throws uncaught and the workspace is unusable
 * until localStorage is cleared. Dropping the bad rows costs those rows;
 * keeping them costs the app.
 */
function hydrateDrafts(persisted: unknown): Partial<ContributionState> {
  if (persisted === null || typeof persisted !== "object") return {};
  const state = persisted as Record<string, unknown>;

  const rawDrafts = (state.drafts !== null && typeof state.drafts === "object" ? state.drafts : {}) as Record<
    string,
    unknown
  >;
  const drafts: Record<string, Draft> = {};
  for (const [id, value] of Object.entries(rawDrafts)) drafts[id] = repairSingleDraft(value, id);

  // "No active draft" is not a renderable state. Prefer the stored choice, then
  // the most recently touched survivor, then a fresh empty one.
  const storedId = typeof state.activeDraftId === "string" ? state.activeDraftId : "";
  const active = drafts[storedId] ?? Object.values(drafts).sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? emptyDraft();
  drafts[active.id] = active;

  return {
    drafts,
    activeDraftId: active.id,
    title: active.title,
    authors: active.authors,
    inputMode: active.inputMode,
    heatmapMonoColor: active.heatmapMonoColor,
    outputLocale: active.outputLocale,
    ...(typeof state.uiLocale === "string" ? { uiLocale: state.uiLocale } : {}),
    ...(typeof state.welcomeSeen === "boolean" ? { welcomeSeen: state.welcomeSeen } : {}),
  };
}

/**
 * localStorage, but a failed write says so.
 *
 * A quota error is the realistic failure once several drafts are held, and
 * zustand's default storage swallows it into a console message nobody reads:
 * the app keeps working, the drafts keep growing, and nothing has been saved
 * since some point the user cannot identify. Saying it once, when it happens,
 * is the difference between losing this edit and losing the afternoon.
 */
function announcingStorage(): StateStorage {
  let warned = false;
  return {
    // Guarded rather than assumed: this module is imported during the server
    // render, where there is no localStorage at all.
    getItem: (key) => (typeof window === "undefined" ? null : window.localStorage.getItem(key)),
    removeItem: (key) => {
      if (typeof window !== "undefined") window.localStorage.removeItem(key);
    },
    setItem: (key, value) => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(key, value);
        warned = false;
      } catch {
        // Every keystroke retries the write; announcing each one would flood
        // the live region. Say it once per run of failures.
        if (warned) return;
        warned = true;
        announce(
          "This draft could not be saved: the browser's storage is full. Export it, or delete a draft you no longer need.",
          { assertive: true },
        );
      }
    },
  };
}

/**
 * The id the very first draft carries before anything is persisted. A constant
 * rather than a fresh uuid, so the server render and the first client render
 * agree (see `skipHydration`).
 */
const INITIAL_DRAFT_ID = "draft-1";

export const useContributionStore = create<ContributionState>()(
  persist(
    immer((set) => ({
      authors: [],
      title: "",
      // One empty draft always exists: "no active draft" is not a renderable
      // state, so the store never allows it.
      drafts: {},
      activeDraftId: INITIAL_DRAFT_ID,
      inputMode: "toggle",
      heatmapMonoColor: DEFAULT_MONO_COLOR,
      outputLocale: "en",
      uiLocale: "en",
      welcomeSeen: false,
      welcomeOpen: false,

      createDraft: () => {
        let created: string | null = null;
        set((state) => {
          // Stash first: only then does the map certainly contain the live
          // draft, which makes the count exact rather than off by one.
          stashLive(state);
          if (Object.keys(state.drafts).length >= MAX_DRAFTS) return;
          const draft = emptyDraft();
          state.drafts[draft.id] = draft;
          applyDraft(state, draft);
          created = draft.id;
        });
        return created;
      },

      switchDraft: (draftId) =>
        set((state) => {
          if (draftId === state.activeDraftId) return;
          const target = state.drafts[draftId];
          if (!target) return;
          stashLive(state);
          applyDraft(state, target);
        }),

      renameDraft: (draftId, title) =>
        set((state) => {
          const trimmed = title.trim().slice(0, MAX_TITLE_LENGTH);
          // The live draft's title is the top-level one; the map copy is
          // refreshed on the way out, so writing only here would be lost.
          if (draftId === state.activeDraftId) {
            state.title = trimmed;
            return;
          }
          const target = state.drafts[draftId];
          if (!target) return;
          target.title = trimmed;
          target.updatedAt = Date.now();
        }),

      duplicateDraft: (draftId) => {
        let created: string | null = null;
        set((state) => {
          stashLive(state);
          if (Object.keys(state.drafts).length >= MAX_DRAFTS) return;
          const source = state.drafts[draftId];
          if (!source) return;
          const copy: Draft = {
            ...source,
            id: globalThis.crypto.randomUUID(),
            // Fresh ids throughout: two drafts sharing a contributor id would
            // make every id-keyed lookup ambiguous once both are in memory.
            authors: source.authors.map((author) => ({ ...author, id: globalThis.crypto.randomUUID() })),
            updatedAt: Date.now(),
          };
          state.drafts[copy.id] = copy;
          created = copy.id;
        });
        return created;
      },

      deleteDraft: (draftId) =>
        set((state) => {
          stashLive(state);
          if (!state.drafts[draftId]) return;
          delete state.drafts[draftId];

          if (draftId !== state.activeDraftId) return;
          // Deleting what you are looking at lands on the most recently touched
          // survivor, or on a fresh empty draft when there is none.
          const next = Object.values(state.drafts).sort((a, b) => b.updatedAt - a.updatedAt)[0];
          const target = next ?? emptyDraft();
          state.drafts[target.id] = target;
          applyDraft(state, target);
        }),

      loadAuthors: (authors) =>
        set((state) => {
          state.authors = normalizeAuthors(authors);
        }),

      setTitle: (title) =>
        set((state) => {
          state.title = title.trim().slice(0, MAX_TITLE_LENGTH);
        }),

      loadSample: () =>
        set((state) => {
          state.authors = normalizeAuthors(buildSampleAuthors());
        }),

      setAuthorsFromText: (text) =>
        set((state) => {
          const parsed = parseAuthorText(text);
          const existing = new Map(state.authors.map((author) => [author.name, author]));
          state.authors = normalizeAuthors(parsed.map((author) => existing.get(author.name) ?? author));
        }),

      addAuthor: (name, orcid) => {
        const trimmed = name.trim();
        if (!trimmed) return null;
        let nextAuthor: Author;
        try {
          nextAuthor = createAuthor(trimmed, orcid ? { orcid } : undefined);
        } catch {
          // Unparseable as a name (a stray affiliation marker in a pasted list,
          // say). Reject it here rather than letting it throw through the caller.
          return null;
        }
        let added = false;
        set((state) => {
          if (state.authors.length >= MAX_AUTHORS) return;
          state.authors = normalizeAuthors([...state.authors, nextAuthor]);
          added = true;
        });
        return added ? nextAuthor.id : null;
      },

      removeAuthor: (authorId) =>
        set((state) => {
          const index = findAuthorIndex(state.authors, authorId);
          if (index === -1) return;
          state.authors.splice(index, 1);
          state.authors = normalizeAuthors(state.authors);
        }),

      restoreAuthor: (author, index) =>
        set((state) => {
          if (state.authors.some((candidate) => candidate.id === author.id)) return;
          // Undo can arrive after the list refilled to the cap; without this
          // the splice pushes past MAX_AUTHORS and normalizeAuthors throws
          // uncaught inside the reducer. Matches addAuthor's guard.
          if (state.authors.length >= MAX_AUTHORS) return;
          state.authors.splice(Math.max(0, Math.min(index, state.authors.length)), 0, author);
          state.authors = normalizeAuthors(state.authors);
        }),

      moveAuthor: (fromIndex, toIndex) =>
        set((state) => {
          if (
            fromIndex < 0 ||
            toIndex < 0 ||
            fromIndex >= state.authors.length ||
            toIndex >= state.authors.length ||
            fromIndex === toIndex
          ) {
            return;
          }
          const [movedAuthor] = state.authors.splice(fromIndex, 1);
          if (!movedAuthor) return;
          state.authors.splice(toIndex, 0, movedAuthor);
          state.authors = normalizeAuthors(state.authors);
        }),

      updateAuthorName: (authorId, name) => {
        let updated = false;
        set((state) => {
          const index = findAuthorIndex(state.authors, authorId);
          const currentAuthor = state.authors[index];
          const trimmed = name.trim();
          if (!(currentAuthor && trimmed)) return;
          try {
            state.authors[index] = createAuthor(trimmed, {
              id: currentAuthor.id,
              orcid: currentAuthor.orcid,
              contributorType: currentAuthor.contributorType,
              contributions: currentAuthor.contributions,
              equalContribution: currentAuthor.equalContribution,
              corresponding: currentAuthor.corresponding,
            });
          } catch {
            return;
          }
          state.authors = normalizeAuthors(state.authors);
          updated = true;
        });
        return updated;
      },

      updateAuthorOrcid: (authorId, orcid) =>
        set((state) => {
          const index = findAuthorIndex(state.authors, authorId);
          const author = state.authors[index];
          if (!author) return;
          const trimmed = orcid.trim();
          // Reject invalid values: an unvalidated iD here would make the next
          // normalizeAuthors() -> createAuthor() throw inside this reducer.
          if (trimmed && !isValidOrcid(trimmed)) return;
          author.orcid = trimmed ? normalizeOrcid(trimmed) : undefined;
        }),

      setAuthorType: (authorId, contributorType) =>
        set((state) => {
          const author = state.authors[findAuthorIndex(state.authors, authorId)];
          if (!author) return;
          author.contributorType = contributorType;
        }),

      setAuthorMarker: (authorId, marker, value) =>
        set((state) => {
          const author = state.authors[findAuthorIndex(state.authors, authorId)];
          if (!author) return;
          author[marker] = value;
        }),

      setAuthorScore: (authorId, roleIndex, score) =>
        set((state) => {
          const index = findAuthorIndex(state.authors, authorId);
          const contribution = state.authors[index]?.contributions[roleIndex];
          if (contribution) {
            contribution.score = clampScore(score);
          }
        }),

      setAllAuthorScores: (authorId, score) =>
        set((state) => {
          const author = state.authors[findAuthorIndex(state.authors, authorId)];
          if (!author) return;
          const nextScore = clampScore(score);
          for (const contribution of author.contributions) {
            contribution.score = nextScore;
          }
        }),

      setRoleScores: (roleIndex, score) =>
        set((state) => {
          if (roleIndex < 0 || roleIndex >= ROLE_NAMES.length) return;
          const nextScore = clampScore(score);
          for (const author of state.authors) {
            const contribution = author.contributions[roleIndex];
            if (contribution) contribution.score = nextScore;
          }
        }),

      toggleContribution: (authorId, roleIndex) =>
        set((state) => {
          const index = findAuthorIndex(state.authors, authorId);
          const contribution = state.authors[index]?.contributions[roleIndex];
          if (contribution) {
            contribution.score = contribution.score > 0 ? 0 : 100;
          }
        }),

      setInputMode: (mode) =>
        set((state) => {
          state.inputMode = mode;
        }),

      setHeatmapMonoColor: (color) =>
        set((state) => {
          state.heatmapMonoColor = color;
        }),

      setOutputLocale: (locale) =>
        set((state) => {
          state.outputLocale = locale;
        }),

      setUiLocale: (locale) =>
        set((state) => {
          state.uiLocale = locale;
        }),

      // Open marks it seen too: once the card has been shown (first run or an
      // explicit re-open), the user is never auto-greeted on a later visit.
      openWelcome: () =>
        set((state) => {
          state.welcomeOpen = true;
          state.welcomeSeen = true;
        }),

      closeWelcome: () =>
        set((state) => {
          state.welcomeOpen = false;
          state.welcomeSeen = true;
        }),

      // Clears the workspace, not the user's history: welcomeSeen stays true, so
      // a reset doesn't stage a fake first run. The open card is dismissed with
      // it. Left up over an emptied workspace it would re-offer "Load sample
      // data", quietly undoing the reset.
      reset: () =>
        set((state) => {
          state.authors = [];
          state.title = "";
          state.inputMode = "toggle";
          state.heatmapMonoColor = DEFAULT_MONO_COLOR;
          state.outputLocale = "en";
          // uiLocale is a display preference, not draft data: a workspace reset
          // should not silently switch the interface back to English.
          state.welcomeOpen = false;
          // Empties the draft you are in; the other drafts are untouched.
          // Discarding them would make one button destroy a year of papers.
          state.drafts[state.activeDraftId] = liveDraft(state);
        }),
    })),
    {
      name: "credit-generator-state",
      storage: createJSONStorage(announcingStorage),
      /**
       * Stays at 1 until launch. There are no users, so the persisted shape can
       * change freely without a migration step for a version nobody holds.
       *
       * After launch: bump this and add the matching step to MIGRATIONS. The
       * chain runs one hop at a time, so each step only describes its own
       * change and never has to know the whole history.
       */
      version: PERSIST_VERSION,
      migrate: migratePersisted,
      /** Unpack the stored drafts and repair them; see `hydrateDrafts`. */
      merge: (persisted, current) => ({ ...current, ...hydrateDrafts(persisted) }),
      // Don't read localStorage during store creation: the server renders the
      // empty initial state, so a synchronous rehydrate here would desync the
      // first client render (hydration mismatch). A client effect calls
      // rehydrate() after mount instead; see HeaderActions.
      skipHydration: true,
      // spell-checker: ignore partialize
      partialize: (state) => ({
        // Storage sees the normalized shape: every draft in one map, with the
        // live top-level fields folded back into the active entry. Memory keeps
        // them unpacked so components read `authors` directly.
        drafts: { ...state.drafts, [state.activeDraftId]: liveDraft(state) },
        activeDraftId: state.activeDraftId,
        uiLocale: state.uiLocale,
        welcomeSeen: state.welcomeSeen,
      }),
    },
  ),
);
