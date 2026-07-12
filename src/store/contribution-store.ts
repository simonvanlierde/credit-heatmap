import type { Author, CreditRoleName } from "@credit-generator/core";
import {
  CREDIT_ROLES,
  createAuthor,
  DEFAULT_MONO_COLOR,
  deduplicateAuthorInitials,
  isValidOrcid,
  parseAuthorText,
} from "@credit-generator/core";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type InputMode = "toggle" | "levels";

interface ContributionState {
  authors: Author[];
  selectedAuthorId: string | null;
  inputMode: InputMode;
  heatmapMonoColor: string;
  /** Language for the generated statement + human-facing exports (role names only). */
  outputLocale: string;
  /** Whether the first-run welcome has ever been shown. Persisted; only ever set
   *  true, so returning users are never auto-greeted again. */
  welcomeSeen: boolean;
  /** Whether the welcome card is currently open. Ephemeral (not persisted), so a
   *  "How it works" re-open never survives a reload as a fake first run. */
  welcomeOpen: boolean;
  loadAuthors: (authors: Author[]) => void;
  loadSample: () => void;
  setAuthorsFromText: (text: string) => void;
  addAuthor: (name: string, orcid?: string) => void;
  removeAuthor: (authorId: string) => void;
  moveAuthor: (fromIndex: number, toIndex: number) => void;
  updateAuthorName: (authorId: string, name: string) => void;
  updateAuthorOrcid: (authorId: string, orcid: string) => void;
  setAuthorType: (authorId: string, contributorType: Author["contributorType"]) => void;
  setSelectedAuthor: (authorId: string | null) => void;
  setAuthorScore: (authorId: string, roleIndex: number, score: number) => void;
  toggleContribution: (authorId: string, roleIndex: number) => void;
  setInputMode: (mode: InputMode) => void;
  setHeatmapMonoColor: (color: string) => void;
  setOutputLocale: (locale: string) => void;
  openWelcome: () => void;
  closeWelcome: () => void;
  reset: () => void;
}

export const ROLE_NAMES = CREDIT_ROLES.map((role) => role.name);

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
  return deduplicateAuthorInitials(
    authors.map((author) =>
      createAuthor(author.name, {
        id: author.id,
        orcid: author.orcid,
        contributorType: author.contributorType,
        contributions: author.contributions,
      }),
    ),
  );
}

function ensureSelectedAuthorId(authors: Author[], selectedAuthorId: string | null): string | null {
  if (authors.length === 0) return null;
  if (selectedAuthorId && authors.some((author) => author.id === selectedAuthorId)) {
    return selectedAuthorId;
  }
  return authors[0]?.id ?? null;
}

export const useContributionStore = create<ContributionState>()(
  persist(
    immer((set) => ({
      authors: [],
      selectedAuthorId: null,
      inputMode: "toggle",
      heatmapMonoColor: DEFAULT_MONO_COLOR,
      outputLocale: "en",
      welcomeSeen: false,
      welcomeOpen: false,

      loadAuthors: (authors) =>
        set((state) => {
          state.authors = normalizeAuthors(authors);
          state.selectedAuthorId = ensureSelectedAuthorId(state.authors, state.selectedAuthorId);
        }),

      loadSample: () =>
        set((state) => {
          const authors = buildSampleAuthors();
          state.authors = normalizeAuthors(authors);
          state.selectedAuthorId = state.authors[0]?.id ?? null;
        }),

      setAuthorsFromText: (text) =>
        set((state) => {
          const parsed = parseAuthorText(text);
          const existing = new Map(state.authors.map((author) => [author.name, author]));
          state.authors = normalizeAuthors(parsed.map((author) => existing.get(author.name) ?? author));
          state.selectedAuthorId = ensureSelectedAuthorId(state.authors, state.selectedAuthorId);
        }),

      addAuthor: (name, orcid) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) return;
          const nextAuthor = createAuthor(trimmed, orcid ? { orcid } : undefined);
          state.authors = normalizeAuthors([...state.authors, nextAuthor]);
          state.selectedAuthorId = nextAuthor.id;
        }),

      removeAuthor: (authorId) =>
        set((state) => {
          const index = findAuthorIndex(state.authors, authorId);
          if (index === -1) return;
          state.authors.splice(index, 1);
          state.authors = normalizeAuthors(state.authors);
          state.selectedAuthorId =
            state.selectedAuthorId === authorId
              ? ensureSelectedAuthorId(state.authors, null)
              : ensureSelectedAuthorId(state.authors, state.selectedAuthorId);
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

      updateAuthorName: (authorId, name) =>
        set((state) => {
          const index = findAuthorIndex(state.authors, authorId);
          const currentAuthor = state.authors[index];
          const trimmed = name.trim();
          if (!(currentAuthor && trimmed)) return;
          state.authors[index] = createAuthor(trimmed, {
            id: currentAuthor.id,
            orcid: currentAuthor.orcid,
            contributorType: currentAuthor.contributorType,
            contributions: currentAuthor.contributions,
          });
          state.authors = normalizeAuthors(state.authors);
        }),

      updateAuthorOrcid: (authorId, orcid) =>
        set((state) => {
          const index = findAuthorIndex(state.authors, authorId);
          const author = state.authors[index];
          if (!author) return;
          const trimmed = orcid.trim();
          // Reject invalid values: an unvalidated iD here would make the next
          // normalizeAuthors() -> createAuthor() throw inside this reducer.
          if (trimmed && !isValidOrcid(trimmed)) return;
          author.orcid = trimmed || undefined;
        }),

      setAuthorType: (authorId, contributorType) =>
        set((state) => {
          const author = state.authors[findAuthorIndex(state.authors, authorId)];
          if (!author) return;
          author.contributorType = contributorType;
        }),

      setSelectedAuthor: (authorId) =>
        set((state) => {
          state.selectedAuthorId = authorId;
        }),

      setAuthorScore: (authorId, roleIndex, score) =>
        set((state) => {
          const index = findAuthorIndex(state.authors, authorId);
          const contribution = state.authors[index]?.contributions[roleIndex];
          if (contribution) {
            contribution.score = clampScore(score);
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

      reset: () =>
        set((state) => {
          state.authors = [];
          state.selectedAuthorId = null;
          state.inputMode = "toggle";
          state.heatmapMonoColor = DEFAULT_MONO_COLOR;
          state.outputLocale = "en";
        }),
    })),
    {
      name: "credit-generator-state",
      version: 3,
      // Don't read localStorage during store creation: the server renders the
      // empty initial state, so a synchronous rehydrate here would desync the
      // first client render (hydration mismatch). A client effect calls
      // rehydrate() after mount instead — see HeaderActions.
      skipHydration: true,
      // v0 persisted a now-removed "slider" input mode; fold it into "levels".
      // (The now-removed heatmapColorMode is simply ignored if present.)
      migrate: (persisted) => {
        const state = persisted as Partial<ContributionState> | undefined;
        if (state && (state.inputMode as string) === "slider") {
          state.inputMode = "levels";
        }
        // Returning users have already used the app; don't greet them with the
        // first-run welcome card.
        if (state && state.welcomeSeen === undefined) {
          state.welcomeSeen = true;
        }
        return state as ContributionState;
      },
      // spell-checker: ignore partialize
      partialize: (state) => ({
        authors: state.authors,
        inputMode: state.inputMode,
        heatmapMonoColor: state.heatmapMonoColor,
        outputLocale: state.outputLocale,
        selectedAuthorId: state.selectedAuthorId,
        welcomeSeen: state.welcomeSeen,
      }),
    },
  ),
);
