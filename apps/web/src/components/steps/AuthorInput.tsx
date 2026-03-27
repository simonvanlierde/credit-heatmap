"use client";

import { useContributionStore } from "@/store/contribution-store";
import { useState } from "react";

/**
 * Author list — individual editable rows, matching the Stitch design.
 * Each author has a name field and a delete button.
 * "Add Author" appends a new row.
 */
export function AuthorList() {
  const {
    authors,
    addAuthor,
    removeAuthor,
    updateAuthorName,
    updateAuthorOrcid,
    selectedAuthorIndex,
    setSelectedAuthor,
  } = useContributionStore();

  const [newName, setNewName] = useState("");

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addAuthor(trimmed);
    setNewName("");
  }

  function handleNewNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleAdd();
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-outline-variant/20 p-8">
      {/* Card header */}
      <div className="flex items-center justify-between mb-6">
        <h2
          className="text-2xl italic font-semibold text-primary"
          style={{ fontFamily: "var(--font-headline)" }}
        >
          Contributors
        </h2>
        <span className="text-xs uppercase tracking-widest text-on-surface-variant">
          {authors.length} author{authors.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Author rows — keyed by deduplicated initials (unique by construction) */}
      <div className="space-y-2">
        {authors.map((author, i) => {
          const isSelected = selectedAuthorIndex === i;
          return (
            <div
              key={author.initials}
              className={`group flex items-center gap-3 p-4 rounded-lg border transition-colors duration-150 ${
                isSelected
                  ? "bg-surface-container-low border-primary/30 ring-1 ring-primary/20"
                  : "bg-surface border-transparent hover:bg-surface-container-low hover:border-outline-variant/30"
              }`}
            >
              {/* Selection indicator */}
              <button
                type="button"
                onClick={() => setSelectedAuthor(isSelected ? null : i)}
                aria-pressed={isSelected}
                aria-label={`Select ${author.name}`}
                className={`shrink-0 w-5 h-5 rounded-full border-2 transition-colors ${
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-outline-variant bg-transparent hover:border-primary"
                }`}
              />

              {/* Name + ORCID inputs */}
              <div className="flex-1 min-w-0 grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`author-name-${author.initials}`}
                    className="block text-[10px] uppercase tracking-widest font-bold mb-1 text-on-surface-variant"
                  >
                    Full Name
                  </label>
                  <input
                    id={`author-name-${author.initials}`}
                    type="text"
                    value={author.name}
                    onChange={(e) => updateAuthorName(i, e.target.value)}
                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-on-surface font-medium border-b border-primary/20 focus:border-primary outline-none text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`author-orcid-${author.initials}`}
                    className="block text-[10px] uppercase tracking-widest font-bold mb-1 text-on-surface-variant flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[12px]">fingerprint</span>
                    ORCID iD
                  </label>
                  <input
                    id={`author-orcid-${author.initials}`}
                    type="text"
                    value={author.orcid ?? ""}
                    onChange={(e) => updateAuthorOrcid(i, e.target.value)}
                    placeholder="0000-0000-0000-0000"
                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-on-surface-variant text-xs border-b border-outline-variant/40 focus:border-primary outline-none font-mono"
                  />
                </div>
              </div>

              {/* Initials badge */}
              <span className="shrink-0 text-xs font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                {author.initials}
              </span>

              {/* Delete */}
              <button
                type="button"
                onClick={() => removeAuthor(i)}
                className="shrink-0 text-outline-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                aria-label={`Remove ${author.name}`}
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Add new author */}
      <div className="mt-4 flex gap-2 items-center">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
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
