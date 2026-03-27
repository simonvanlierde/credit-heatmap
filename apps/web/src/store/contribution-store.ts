import { CREDIT_ROLES, parseAuthorText, parseNameParts } from "@credit-generator/core";
import type { Author, Contribution } from "@credit-generator/core";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type InputMode = "toggle" | "levels" | "slider";

interface ContributionState {
  authors: Author[];
  selectedAuthorIndex: number | null;
  inputMode: InputMode;

  // Author list actions
  loadAuthors: (authors: Author[]) => void;
  setAuthorsFromText: (text: string) => void;
  addAuthor: (name: string) => void;
  removeAuthor: (index: number) => void;
  updateAuthorName: (index: number, name: string) => void;
  updateAuthorOrcid: (index: number, orcid: string) => void;
  setSelectedAuthor: (index: number | null) => void;

  // Contribution actions
  setAuthorScore: (authorIndex: number, roleIndex: number, score: number) => void;
  toggleContribution: (authorIndex: number, roleIndex: number) => void;
  setInputMode: (mode: InputMode) => void;

  reset: () => void;
}

function makeDefaultContributions(): Contribution[] {
  return CREDIT_ROLES.map((r) => ({ role: r.name, score: 0 }));
}

function buildAuthor(name: string): Author {
  const { firstName, middleName, surname } = parseNameParts(name);
  // Simple initials — uniqueness is guaranteed when building from the full list
  const initials = [firstName, middleName, surname]
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return {
    name,
    firstName,
    middleName,
    surname,
    initials,
    contributions: makeDefaultContributions(),
  };
}

/** Re-deduplicate initials across the full author list in-place. */
function deduplicateInitials(authors: Author[]): void {
  const seen = new Set<string>();
  for (const author of authors) {
    const base = [author.firstName, author.middleName, author.surname]
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");

    let attempt = base;
    let extraIdx = 1;
    while (seen.has(attempt)) {
      if (extraIdx < author.surname.length) {
        attempt = base + (author.surname[extraIdx]?.toLowerCase() ?? String(extraIdx));
        extraIdx++;
      } else {
        attempt = base + String(seen.size);
      }
    }
    author.initials = attempt;
    seen.add(attempt);
  }
}

export const useContributionStore = create<ContributionState>()(
  persist(
    immer((set) => ({
      authors: [],
      selectedAuthorIndex: null,
      inputMode: "toggle",

      loadAuthors: (authors) =>
        set((state) => {
          state.authors = authors;
          deduplicateInitials(state.authors);
          state.selectedAuthorIndex = authors.length > 0 ? 0 : null;
        }),

      setAuthorsFromText: (text) =>
        set((state) => {
          const parsed = parseAuthorText(text);
          const existing = new Map(state.authors.map((a) => [a.name, a]));
          state.authors = parsed.map((a) => existing.get(a.name) ?? a);
          deduplicateInitials(state.authors);
          if (
            state.selectedAuthorIndex !== null &&
            state.selectedAuthorIndex >= state.authors.length
          ) {
            state.selectedAuthorIndex = state.authors.length > 0 ? 0 : null;
          }
        }),

      addAuthor: (name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) return;
          state.authors.push(buildAuthor(trimmed));
          deduplicateInitials(state.authors);
          state.selectedAuthorIndex = state.authors.length - 1;
        }),

      removeAuthor: (index) =>
        set((state) => {
          state.authors.splice(index, 1);
          deduplicateInitials(state.authors);
          if (state.selectedAuthorIndex === index) {
            state.selectedAuthorIndex = state.authors.length > 0 ? Math.max(0, index - 1) : null;
          } else if (state.selectedAuthorIndex !== null && state.selectedAuthorIndex > index) {
            state.selectedAuthorIndex -= 1;
          }
        }),

      updateAuthorName: (index, name) =>
        set((state) => {
          const author = state.authors[index];
          if (!author) return;
          const { firstName, middleName, surname } = parseNameParts(name);
          author.name = name;
          author.firstName = firstName;
          author.middleName = middleName;
          author.surname = surname;
          deduplicateInitials(state.authors);
        }),

      updateAuthorOrcid: (index, orcid) =>
        set((state) => {
          const author = state.authors[index];
          if (!author) return;
          author.orcid = orcid.trim() || undefined;
        }),

      setSelectedAuthor: (index) =>
        set((state) => {
          state.selectedAuthorIndex = index;
        }),

      setAuthorScore: (authorIndex, roleIndex, score) =>
        set((state) => {
          const contrib = state.authors[authorIndex]?.contributions[roleIndex];
          if (contrib) contrib.score = Math.max(0, Math.min(100, score));
        }),

      toggleContribution: (authorIndex, roleIndex) =>
        set((state) => {
          const contrib = state.authors[authorIndex]?.contributions[roleIndex];
          if (contrib) contrib.score = contrib.score > 0 ? 0 : 100;
        }),

      setInputMode: (mode) =>
        set((state) => {
          state.inputMode = mode;
        }),

      reset: () =>
        set((state) => {
          state.authors = [];
          state.selectedAuthorIndex = null;
          state.inputMode = "toggle";
        }),
    })),
    {
      name: "credit-generator-state",
      partialize: (state) => ({
        authors: state.authors,
        inputMode: state.inputMode,
        selectedAuthorIndex: state.selectedAuthorIndex,
      }),
    }
  )
);

export const ROLE_NAMES = CREDIT_ROLES.map((r) => r.name);
