"use client";

import { ORCID_REGEX } from "@credit-generator/core";
import { ChevronDown, ChevronUp, Fingerprint, Plus, PlusCircle, Sparkles, Trash2, UserPlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { StepBadge } from "@/components/ui/step-badge";
import { contributorColor, contributorTextColor } from "@/lib/contributor-color";
import { useContributionStore } from "@/store/contribution-store";

const ORCID_EXTRACT_REGEX = /(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])/i;

/** Pull a valid ORCID iD out of arbitrary text (a raw id or an orcid.org URL). */
function detectOrcid(text: string): string | null {
  const candidate = text.trim().match(ORCID_EXTRACT_REGEX)?.[1]?.toUpperCase() ?? "";
  return ORCID_REGEX.test(candidate) ? candidate : null;
}

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

const EMPTY_ROW_STATE: OrcidRowState = { loading: false, successFor: null, error: null };

export function AuthorList() {
  const {
    authors,
    addAuthor,
    loadSample,
    moveAuthor,
    removeAuthor,
    updateAuthorName,
    updateAuthorOrcid,
    selectedAuthorId,
    setSelectedAuthor,
  } = useContributionStore();

  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [orcidStates, setOrcidStates] = useState<Record<string, OrcidRowState>>({});
  // Rows where the user has revealed the ORCID input but not yet entered an iD.
  const [orcidEditing, setOrcidEditing] = useState<Record<string, boolean>>({});
  // Set just before an Enter-commit so the unmount blur doesn't re-apply the iD.
  const orcidCommittedRef = useRef(false);

  function getOrcidState(authorId: string): OrcidRowState {
    return orcidStates[authorId] ?? EMPTY_ROW_STATE;
  }

  function setOrcidState(authorId: string, patch: Partial<OrcidRowState>) {
    setOrcidStates((prev) => ({
      ...prev,
      [authorId]: { ...(prev[authorId] ?? EMPTY_ROW_STATE), ...patch },
    }));
  }

  /**
   * Look up the canonical name for an ORCID and apply it to the row.
   *
   * When `rollbackOnFailure` is set (a row that was *added* from a bare iD and so
   * has the raw iD as its placeholder name), a failed or name-less lookup removes
   * the junk row and surfaces the error on the add field instead of leaving an
   * author literally named after the ORCID.
   */
  async function lookupOrcid(authorId: string, orcid: string, rollbackOnFailure = false) {
    function fail(message: string) {
      if (rollbackOnFailure) {
        removeAuthor(authorId);
        setAddError(message);
        setNewName(orcid);
      } else {
        setOrcidState(authorId, { loading: false, error: message, successFor: null });
      }
    }

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
        fail(message);
        return;
      }

      const result = (await res.json()) as OrcidLookupResult;
      if (!result.displayName.trim()) {
        fail("ORCID record has no name");
        return;
      }
      updateAuthorName(authorId, result.displayName);
      setOrcidState(authorId, { loading: false, successFor: orcid, error: null });
    } catch {
      fail("Network error");
    }
  }

  /** Attach an ORCID to a row and look up the canonical name. */
  function applyOrcid(authorId: string, orcid: string) {
    updateAuthorOrcid(authorId, orcid);
    setOrcidEditing((prev) => ({ ...prev, [authorId]: false }));
    setOrcidState(authorId, { error: null, successFor: null });
    void lookupOrcid(authorId, orcid);
  }

  function clearOrcid(authorId: string) {
    updateAuthorOrcid(authorId, "");
    setOrcidState(authorId, EMPTY_ROW_STATE);
    setOrcidEditing((prev) => ({ ...prev, [authorId]: false }));
  }

  /** Pasting an ORCID into any field attaches it instead of dropping in raw text. */
  function handleSmartPaste(event: React.ClipboardEvent<HTMLInputElement>, authorId: string) {
    const orcid = detectOrcid(event.clipboardData.getData("text"));
    if (!orcid) return;
    event.preventDefault();
    applyOrcid(authorId, orcid);
  }

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAddError(null);
    const orcid = detectOrcid(trimmed);
    if (orcid) {
      // Seed the row with the iD as a placeholder name, then fill it from ORCID.
      // If the lookup fails, the row is rolled back so no junk author survives.
      addAuthor(orcid, orcid);
      const newId = useContributionStore.getState().selectedAuthorId;
      if (newId) void lookupOrcid(newId, orcid, true);
    } else {
      addAuthor(trimmed);
    }
    setNewName("");
  }

  function handleNewNameKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") handleAdd();
  }

  /** Select the row when the user clicks its background (not an input/button/link). */
  function handleRowClick(event: React.MouseEvent<HTMLDivElement>, authorId: string) {
    if ((event.target as HTMLElement).closest("input, button, a")) return;
    setSelectedAuthor(authorId);
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-outline-variant/20 p-5 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2
          className="flex items-center gap-2 text-2xl italic font-semibold text-primary"
          style={{ fontFamily: "var(--font-headline)" }}
        >
          <StepBadge step={1} />
          Contributors
        </h2>
        <span className="text-xs uppercase tracking-widest text-on-surface-variant">
          {authors.length} author{authors.length !== 1 ? "s" : ""}
        </span>
      </div>

      {authors.length === 0 && (
        <div className="rounded-lg border border-dashed border-outline-variant/40 bg-surface-container-low/40 p-6 text-center">
          <UserPlus className="h-8 w-8 text-outline-variant mb-2 mx-auto" />
          <p className="text-sm text-on-surface-variant">
            No contributors yet. Add a name or ORCID below, use <strong>Import</strong> in the header, or
          </p>
          <button
            type="button"
            onClick={loadSample}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary hover:text-on-primary hover:border-primary transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Load sample data
          </button>
        </div>
      )}

      <div className="space-y-2">
        {authors.map((author, index) => {
          const isSelected = selectedAuthorId === author.id;
          const orcidValue = author.orcid ?? "";
          const hasOrcid = orcidValue.length > 0;
          const orcidValid = ORCID_REGEX.test(orcidValue);
          const rowState = getOrcidState(author.id);
          const editingOrcid = orcidEditing[author.id] ?? false;

          return (
            // biome-ignore lint/a11y/useKeyWithClickEvents: the radio button below is the keyboard-accessible selector; the row click is a pointer-only convenience.
            // biome-ignore lint/a11y/noStaticElementInteractions: same as above — keyboard selection is handled by the radio button, this is a pointer affordance only.
            <div
              key={author.id}
              onClick={(event) => handleRowClick(event, author.id)}
              className={`group flex items-start gap-3 p-4 rounded-lg border transition-colors duration-150 ${
                isSelected
                  ? "bg-surface-container-low border-primary/40 ring-1 ring-primary/30"
                  : "cursor-pointer bg-surface border-transparent hover:bg-surface-container-low hover:border-outline-variant/30"
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

              <div className="flex-1 min-w-0">
                <label
                  htmlFor={`author-name-${author.id}`}
                  className="block text-[10px] uppercase tracking-widest font-bold mb-1 text-on-surface-variant"
                >
                  Name or ORCID iD
                </label>
                <input
                  id={`author-name-${author.id}`}
                  type="text"
                  value={author.name}
                  onChange={(event) => updateAuthorName(author.id, event.target.value)}
                  onPaste={(event) => handleSmartPaste(event, author.id)}
                  className="w-full bg-transparent border-none p-0 focus:ring-0 text-on-surface font-medium border-b border-primary/20 focus:border-primary outline-none text-sm"
                />

                {/* ORCID: a chip when set, a reveal-on-demand input otherwise. */}
                {hasOrcid ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <a
                      href={`https://orcid.org/${orcidValue}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-mono text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <Fingerprint className="h-3 w-3" />
                      {orcidValue}
                      {!orcidValid && <span className="text-error">✗</span>}
                    </a>
                    {orcidValid && rowState.successFor !== orcidValue && (
                      <button
                        type="button"
                        disabled={rowState.loading}
                        onClick={() => lookupOrcid(author.id, orcidValue)}
                        className="text-[11px] text-primary hover:underline disabled:opacity-50"
                      >
                        {rowState.loading ? "Looking up…" : "Look up name"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => clearOrcid(author.id)}
                      aria-label="Remove ORCID iD"
                      className="text-on-surface-variant hover:text-error transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {rowState.error !== null && (
                      <span className="text-[10px] text-error leading-tight">{rowState.error}</span>
                    )}
                    {rowState.successFor === orcidValue && (
                      <span className="text-[10px] text-primary leading-tight">Name updated from ORCID</span>
                    )}
                  </div>
                ) : editingOrcid ? (
                  <input
                    // biome-ignore lint/a11y/noAutofocus: revealed on explicit user action, so focusing it is expected.
                    autoFocus
                    type="text"
                    aria-label="ORCID iD"
                    placeholder="0000-0000-0000-0000 or paste a URL"
                    onPaste={(event) => handleSmartPaste(event, author.id)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      const orcid = detectOrcid(event.currentTarget.value);
                      if (orcid) {
                        // Mark the commit so the unmount blur below doesn't re-apply it.
                        orcidCommittedRef.current = true;
                        applyOrcid(author.id, orcid);
                      }
                    }}
                    onBlur={(event) => {
                      if (orcidCommittedRef.current) {
                        orcidCommittedRef.current = false;
                        return;
                      }
                      const orcid = detectOrcid(event.currentTarget.value);
                      if (orcid) applyOrcid(author.id, orcid);
                      else setOrcidEditing((prev) => ({ ...prev, [author.id]: false }));
                    }}
                    className="mt-1.5 w-full max-w-[15rem] bg-transparent p-0 focus:ring-0 text-on-surface-variant text-xs border-b border-outline-variant/40 focus:border-primary outline-none font-mono"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setOrcidEditing((prev) => ({ ...prev, [author.id]: true }))}
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-on-surface-variant hover:text-primary transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    ORCID iD
                  </button>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-1">
                {isSelected && (
                  <span className="hidden sm:inline text-[10px] uppercase tracking-wider font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Editing
                  </span>
                )}
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveAuthor(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`Move ${author.name} up`}
                    className="flex items-center justify-center w-6 h-6 text-outline-variant hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveAuthor(index, index + 1)}
                    disabled={index === authors.length - 1}
                    aria-label={`Move ${author.name} down`}
                    className="flex items-center justify-center w-6 h-6 text-outline-variant hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
                <span
                  className="text-xs font-mono font-medium px-2 py-0.5 rounded"
                  style={{ backgroundColor: contributorColor(index), color: contributorTextColor(index) }}
                  title={`${author.name}'s color`}
                >
                  {author.initials}
                </span>
              </div>

              <button
                type="button"
                onClick={() => removeAuthor(author.id)}
                className="shrink-0 text-outline-variant hover:text-error transition-colors"
                aria-label={`Remove ${author.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {addError !== null && <p className="mt-4 -mb-2 text-xs text-error">{addError}</p>}

      <div className="mt-4 flex gap-2 items-center">
        <input
          type="text"
          value={newName}
          onChange={(event) => {
            setNewName(event.target.value);
            if (addError !== null) setAddError(null);
          }}
          onKeyDown={handleNewNameKeyDown}
          placeholder="Add author name or ORCID iD…"
          aria-label="New author name or ORCID iD"
          className="flex-1 bg-surface-container-low border-b-2 border-outline-variant/40 focus:border-primary focus:ring-0 outline-none px-3 py-2 text-sm rounded-t text-on-surface placeholder-outline transition-colors"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary hover:text-on-primary hover:bg-primary border border-primary/30 hover:border-primary rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <PlusCircle className="h-4 w-4" />
          Add
        </button>
      </div>
    </div>
  );
}
