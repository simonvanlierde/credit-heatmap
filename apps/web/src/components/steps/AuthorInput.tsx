"use client";

import { useState } from "react";
import { useContributionStore } from "@/store/contribution-store";

const ORCID_REGEX = /^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/;
const ORCID_EXTRACT_REGEX = /(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])/i;

interface OrcidLookupResult {
  firstName: string;
  surname: string;
  displayName: string;
}

interface OrcidRowState {
  loading: boolean;
  successFor: string | null;
  error: string | null;
}

export function AuthorList() {
  const {
    authors,
    addAuthor,
    moveAuthor,
    removeAuthor,
    updateAuthorName,
    updateAuthorOrcid,
    selectedAuthorId,
    setSelectedAuthor,
  } = useContributionStore();

  const [newName, setNewName] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [orcidStates, setOrcidStates] = useState<Record<string, OrcidRowState>>({});

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addAuthor(trimmed);
    setNewName("");
  }

  function handleNewNameKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      handleAdd();
    }
  }

  function getOrcidState(authorId: string): OrcidRowState {
    return orcidStates[authorId] ?? { loading: false, successFor: null, error: null };
  }

  function setOrcidState(authorId: string, patch: Partial<OrcidRowState>) {
    setOrcidStates((prev) => ({
      ...prev,
      [authorId]: {
        ...(prev[authorId] ?? { loading: false, successFor: null, error: null }),
        ...patch,
      },
    }));
  }

  async function handleOrcidLookup(authorId: string, orcid: string) {
    setOrcidState(authorId, { loading: true, error: null, successFor: null });
    try {
      const res = await fetch(`/api/orcid?id=${encodeURIComponent(orcid)}`);
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null);
        const message =
          data !== null &&
          typeof data === "object" &&
          "error" in data &&
          typeof (data as Record<string, unknown>).error === "string"
            ? ((data as Record<string, unknown>).error as string)
            : "Lookup failed";
        setOrcidState(authorId, { loading: false, error: message, successFor: null });
        return;
      }

      const result = (await res.json()) as OrcidLookupResult;
      updateAuthorName(authorId, result.displayName);
      setOrcidState(authorId, { loading: false, successFor: orcid, error: null });
    } catch {
      setOrcidState(authorId, { loading: false, error: "Network error", successFor: null });
    }
  }

  function handleOrcidPaste(event: React.ClipboardEvent<HTMLInputElement>, authorId: string) {
    const pastedText = event.clipboardData.getData("text").trim();
    const orcid = pastedText.match(ORCID_EXTRACT_REGEX)?.[1]?.toUpperCase() ?? "";
    if (!ORCID_REGEX.test(orcid)) return;

    event.preventDefault();
    updateAuthorOrcid(authorId, orcid);
    setOrcidState(authorId, { error: null, successFor: null });
    void handleOrcidLookup(authorId, orcid);
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-outline-variant/20 p-5 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl italic font-semibold text-primary" style={{ fontFamily: "var(--font-headline)" }}>
          Contributors
        </h2>
        <span className="text-xs uppercase tracking-widest text-on-surface-variant">
          {authors.length} author{authors.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2">
        {authors.map((author, index) => {
          const isSelected = selectedAuthorId === author.id;
          const orcidValue = author.orcid ?? "";
          const orcidNonEmpty = orcidValue.length > 0;
          const orcidValid = ORCID_REGEX.test(orcidValue);
          const rowState = getOrcidState(author.id);

          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: drag-to-reorder is a mouse-only progressive enhancement layered on the row.
            <div
              key={author.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex === null) return;
                moveAuthor(dragIndex, index);
                setDragIndex(null);
              }}
              className={`group flex items-start gap-3 p-4 rounded-lg border transition-colors duration-150 ${
                isSelected
                  ? "bg-surface-container-low border-primary/30 ring-1 ring-primary/20"
                  : "bg-surface border-transparent hover:bg-surface-container-low hover:border-outline-variant/30"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedAuthor(isSelected ? null : author.id)}
                aria-pressed={isSelected}
                aria-label={`Select ${author.name}`}
                className={`shrink-0 mt-1 w-5 h-5 rounded-full border-2 transition-colors ${
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-outline-variant bg-transparent hover:border-primary"
                }`}
              />

              <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`author-name-${author.id}`}
                    className="block text-[10px] uppercase tracking-widest font-bold mb-1 text-on-surface-variant"
                  >
                    Full Name
                  </label>
                  <input
                    id={`author-name-${author.id}`}
                    type="text"
                    value={author.name}
                    onChange={(event) => updateAuthorName(author.id, event.target.value)}
                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-on-surface font-medium border-b border-primary/20 focus:border-primary outline-none text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`author-orcid-${author.id}`}
                    className="block text-[10px] uppercase tracking-widest font-bold mb-1 text-on-surface-variant flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[12px]">fingerprint</span>
                    ORCID iD
                  </label>
                  <div className="flex items-center gap-1">
                    <div className="relative flex-1">
                      <input
                        id={`author-orcid-${author.id}`}
                        type="text"
                        value={orcidValue}
                        onPaste={(event) => handleOrcidPaste(event, author.id)}
                        onChange={(event) => {
                          updateAuthorOrcid(author.id, event.target.value);
                          setOrcidState(author.id, { error: null, successFor: null });
                        }}
                        placeholder="0000-0000-0000-0000"
                        className="w-full bg-transparent border-none p-0 pr-4 focus:ring-0 text-on-surface-variant text-xs border-b border-outline-variant/40 focus:border-primary outline-none font-mono"
                      />
                      {orcidNonEmpty && (
                        <span
                          className={`absolute right-0 top-0 text-xs leading-none select-none ${
                            orcidValid ? "text-primary" : "text-error"
                          }`}
                          aria-hidden="true"
                        >
                          {orcidValid ? "✓" : "✗"}
                        </span>
                      )}
                    </div>
                    {orcidValid && (
                      <button
                        type="button"
                        disabled={rowState.loading}
                        onClick={() => handleOrcidLookup(author.id, orcidValue)}
                        aria-label="Look up name from ORCID"
                        className="shrink-0 flex items-center justify-center w-5 h-5 text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Look up name from ORCID"
                      >
                        {rowState.loading ? (
                          <span className="text-xs leading-none">…</span>
                        ) : (
                          <span className="material-symbols-outlined text-base leading-none">person_search</span>
                        )}
                      </button>
                    )}
                  </div>
                  {rowState.error !== null && (
                    <p className="mt-0.5 text-[10px] text-error leading-tight">{rowState.error}</p>
                  )}
                  {rowState.successFor === orcidValue && rowState.successFor !== null && (
                    <p className="mt-0.5 text-[10px] text-primary leading-tight">Name updated from ORCID</p>
                  )}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Drag to reorder ${author.name}`}
                  className="text-outline-variant cursor-grab active:cursor-grabbing"
                >
                  <span className="material-symbols-outlined text-lg">drag_indicator</span>
                </button>
                <span className="text-xs font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                  {author.initials}
                </span>
              </div>

              <button
                type="button"
                onClick={() => removeAuthor(author.id)}
                className="shrink-0 text-outline-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                aria-label={`Remove ${author.name}`}
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2 items-center">
        <input
          type="text"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={handleNewNameKeyDown}
          placeholder="Add author name…"
          aria-label="New author name"
          className="flex-1 bg-surface-container-low border-b-2 border-outline-variant/40 focus:border-primary focus:ring-0 outline-none px-3 py-2 text-sm rounded-t text-on-surface placeholder-outline transition-colors"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary hover:text-on-primary hover:bg-primary border border-primary/30 hover:border-primary rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          Add
        </button>
      </div>
    </div>
  );
}
