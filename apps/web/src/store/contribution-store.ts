import type { Author, CreditRoleName } from "@credit-generator/core";
import { CREDIT_ROLES, createAuthor, deduplicateAuthorInitials, parseAuthorText } from "@credit-generator/core";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type InputMode = "toggle" | "levels" | "slider";
export type RolePreset = "equal-contribution" | "senior-author" | "data-only-contributor";

interface ContributionState {
  authors: Author[];
  selectedAuthorId: string | null;
  inputMode: InputMode;
  loadAuthors: (authors: Author[]) => void;
  setAuthorsFromText: (text: string) => void;
  addAuthor: (name: string) => void;
  removeAuthor: (authorId: string) => void;
  moveAuthor: (fromIndex: number, toIndex: number) => void;
  updateAuthorName: (authorId: string, name: string) => void;
  updateAuthorOrcid: (authorId: string, orcid: string) => void;
  setSelectedAuthor: (authorId: string | null) => void;
  setAuthorScore: (authorId: string, roleIndex: number, score: number) => void;
  toggleContribution: (authorId: string, roleIndex: number) => void;
  applyPreset: (authorId: string, preset: RolePreset) => void;
  setInputMode: (mode: InputMode) => void;
  reset: () => void;
}

export const ROLE_NAMES = CREDIT_ROLES.map((role) => role.name);

export const ROLE_PRESETS: Record<RolePreset, Partial<Record<(typeof ROLE_NAMES)[number], number>>> = {
  "equal-contribution": Object.fromEntries(ROLE_NAMES.map((role) => [role, 100])),
  "senior-author": {
    Conceptualization: 100,
    "Funding acquisition": 100,
    Methodology: 66,
    "Project administration": 100,
    Resources: 66,
    Supervision: 100,
    "Writing – review & editing": 100,
  },
  "data-only-contributor": {
    "Data curation": 100,
    "Formal Analysis": 100,
    Investigation: 100,
    Validation: 66,
    Visualization: 66,
  },
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
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

      loadAuthors: (authors) =>
        set((state) => {
          state.authors = normalizeAuthors(authors);
          state.selectedAuthorId = ensureSelectedAuthorId(state.authors, state.selectedAuthorId);
        }),

      setAuthorsFromText: (text) =>
        set((state) => {
          const parsed = parseAuthorText(text);
          const existing = new Map(state.authors.map((author) => [author.name, author]));
          state.authors = normalizeAuthors(parsed.map((author) => existing.get(author.name) ?? author));
          state.selectedAuthorId = ensureSelectedAuthorId(state.authors, state.selectedAuthorId);
        }),

      addAuthor: (name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) return;
          const nextAuthor = createAuthor(trimmed);
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
          if (!currentAuthor || !trimmed) return;
          state.authors[index] = createAuthor(trimmed, {
            id: currentAuthor.id,
            orcid: currentAuthor.orcid,
            contributions: currentAuthor.contributions,
          });
          state.authors = normalizeAuthors(state.authors);
        }),

      updateAuthorOrcid: (authorId, orcid) =>
        set((state) => {
          const index = findAuthorIndex(state.authors, authorId);
          const author = state.authors[index];
          if (!author) return;
          author.orcid = orcid.trim() || undefined;
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

      applyPreset: (authorId, preset) =>
        set((state) => {
          const index = findAuthorIndex(state.authors, authorId);
          const author = state.authors[index];
          if (!author) return;
          const presetScores = ROLE_PRESETS[preset];
          for (const contribution of author.contributions) {
            contribution.score = presetScores[contribution.role as CreditRoleName] ?? 0;
          }
        }),

      setInputMode: (mode) =>
        set((state) => {
          state.inputMode = mode;
        }),

      reset: () =>
        set((state) => {
          state.authors = [];
          state.selectedAuthorId = null;
          state.inputMode = "toggle";
        }),
    })),
    {
      name: "credit-generator-state",
      // spell-checker: ignore partialize
      partialize: (state) => ({
        authors: state.authors,
        inputMode: state.inputMode,
        selectedAuthorId: state.selectedAuthorId,
      }),
    },
  ),
);
