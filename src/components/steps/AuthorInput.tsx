"use client";

import { ORCID_REGEX, splitNameList } from "@credit-generator/core";
import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Fingerprint,
  GripVertical,
  Plus,
  PlusCircle,
  Sparkles,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  UserSearch,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { StepHeader } from "@/components/ui/step-header";
import { announce } from "@/lib/announce";
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

/** Fetch the canonical display name for an ORCID iD; returns name or error text. */
async function fetchOrcidName(orcid: string): Promise<{ displayName: string } | { error: string }> {
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
      return { error: message };
    }
    const result = (await res.json()) as OrcidLookupResult;
    if (!result.displayName.trim()) return { error: "ORCID record has no name" };
    return { displayName: result.displayName };
  } catch {
    return { error: "Network error" };
  }
}

export function AuthorList() {
  const { authors, addAuthor, loadSample, moveAuthor, removeAuthor, updateAuthorName, welcomeOpen, welcomeSeen } =
    useContributionStore();

  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = authors.findIndex((a) => a.id === active.id);
    const to = authors.findIndex((a) => a.id === over.id);
    if (from !== -1 && to !== -1) moveAuthor(from, to);
  }

  // Announce reorder by contributor name; @dnd-kit's default announcements key
  // off the opaque author id, which reads as meaningless to a screen reader.
  const nameForId = (id: UniqueIdentifier) => authors.find((a) => a.id === id)?.name || "contributor";
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up contributor ${nameForId(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `Contributor ${nameForId(active.id)} is over ${nameForId(over.id)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Contributor ${nameForId(active.id)} was dropped onto ${nameForId(over.id)}.`
        : `Reorder of ${nameForId(active.id)} was cancelled.`,
    onDragCancel: ({ active }) => `Reorder of ${nameForId(active.id)} was cancelled.`,
  };

  /** Seed a row from an ORCID iD, then fill its name from the registry. */
  async function addOrcidAuthor(orcid: string): Promise<{ id: string | null; error: string | null }> {
    addAuthor(orcid, orcid);
    const id = useContributionStore.getState().authors.at(-1)?.id ?? null;
    if (!id) return { id, error: null };
    const result = await fetchOrcidName(orcid);
    if ("error" in result) return { id, error: result.error };
    updateAuthorName(id, result.displayName);
    return { id, error: null };
  }

  /** Add several contributors at once; ORCID tokens fill their names via lookup. */
  async function addMany(tokens: string[]) {
    const failed: string[] = [];
    for (const token of tokens) {
      const orcid = detectOrcid(token);
      if (!orcid) {
        addAuthor(token);
        continue;
      }
      // Keep the row on a failed lookup (named after its iD) so one bad token
      // doesn't silently vanish from a pasted list — but say which ones failed,
      // so the rows still named after an iD aren't mistaken for real names.
      const { error } = await addOrcidAuthor(orcid);
      if (error) failed.push(orcid);
    }

    const added = `Added ${tokens.length} contributors.`;
    if (failed.length === 0) {
      announce(added);
      return;
    }
    const message = `Could not look up ${failed.length} of ${tokens.length} ORCID iDs (${failed.join(", ")}). Those rows are named after their iD — rename them by hand.`;
    setAddError(message);
    announce(`${added} ${message}`, { assertive: true });
  }

  /** Add from the input: a bare ORCID seeds the row then fills its name from ORCID. */
  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAddError(null);
    const tokens = splitNameList(trimmed);
    if (tokens.length > 1) {
      setNewName("");
      await addMany(tokens);
      return;
    }
    const orcid = detectOrcid(trimmed);
    if (orcid) {
      setNewName("");
      const { id, error } = await addOrcidAuthor(orcid);
      if (error) {
        // No junk author named after the iD survives a failed lookup.
        if (id) removeAuthor(id);
        setAddError(error);
        announce(error, { assertive: true });
        setNewName(orcid);
      }
    } else {
      addAuthor(trimmed);
      setNewName("");
    }
  }

  function handleNewNameKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") void handleAdd();
  }

  /** Pasting a whole author list adds every name; single names paste normally. */
  function handleAddPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const tokens = splitNameList(event.clipboardData.getData("text"));
    if (tokens.length <= 1) return;
    event.preventDefault();
    setAddError(null);
    void addMany(tokens);
  }

  return (
    <div className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant/20 p-4 md:p-5">
      <StepHeader n={1} title="Contributors" className="mb-3" />

      {authors.length === 0 && (
        <div className="rounded-lg border border-dashed border-outline-variant/40 bg-surface-container-low/40 p-6 text-center">
          <UserPlus className="h-8 w-8 text-outline-variant mb-2 mx-auto" />
          <p className="text-sm text-on-surface-variant">
            No contributors yet. Add or paste names or an ORCID below, or use <strong>Import</strong> in the header.
          </p>
          {/* Only for returning/dismissed users (welcomeSeen) with the card closed —
              on a first run the welcome card owns this action, so the button is never
              duplicated and never flashes during hydration before the card opens. */}
          {welcomeSeen && !welcomeOpen && (
            <button
              type="button"
              onClick={loadSample}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary hover:text-on-primary hover:border-primary transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Load sample data
            </button>
          )}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        accessibility={{ announcements }}
      >
        <SortableContext items={authors.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {authors.map((author, index) => (
              <AuthorRow key={author.id} index={index} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {addError !== null && <p className="mt-4 -mb-2 text-xs text-error">{addError}</p>}

      <div className="mt-3 flex gap-2 items-center">
        <input
          type="text"
          value={newName}
          onChange={(event) => {
            setNewName(event.target.value);
            if (addError !== null) setAddError(null);
          }}
          onKeyDown={handleNewNameKeyDown}
          onPaste={handleAddPaste}
          placeholder="Add names or an ORCID iD…"
          aria-label="New author names or ORCID iD"
          className="flex-1 min-w-0 text-ellipsis bg-surface-container-low border-b-2 border-outline-variant/40 focus:border-primary focus:ring-0 outline-none px-3 py-2 text-sm rounded-t text-on-surface placeholder-outline transition-colors"
        />
        <button
          type="button"
          onClick={() => void handleAdd()}
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

/** A single draggable contributor row. ORCID UI state is local to the row. */
function AuthorRow({ index }: { index: number }) {
  const { authors, removeAuthor, updateAuthorName, updateAuthorOrcid, setAuthorType } = useContributionStore();
  const author = authors[index];

  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookedUp, setLookedUp] = useState<string | null>(null);
  // Revealed-but-empty ORCID input, and a guard so an Enter-commit's unmount
  // blur doesn't re-apply the iD.
  const [editingOrcid, setEditingOrcid] = useState(false);
  const committedRef = useRef(false);
  // Guard against setState after the row unmounts mid-lookup (delete/reorder).
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: author?.id ?? index,
  });

  // Transient ORCID status (success or error) clears itself after a few seconds.
  useEffect(() => {
    if (lookedUp === null && lookupError === null) return;
    const timer = setTimeout(() => {
      setLookedUp(null);
      setLookupError(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [lookedUp, lookupError]);

  if (!author) return null;

  const authorId = author.id;
  const orcidValue = author.orcid ?? "";
  const hasOrcid = orcidValue.length > 0;
  const orcidValid = ORCID_REGEX.test(orcidValue);
  const isNonAuthor = author.contributorType === "non-author";

  async function lookup(orcid: string) {
    setLoading(true);
    setLookupError(null);
    setLookedUp(null);
    const result = await fetchOrcidName(orcid);
    if (!mounted.current) return;
    setLoading(false);
    if ("error" in result) {
      setLookupError(result.error);
      announce(`ORCID lookup failed: ${result.error}`, { assertive: true });
    } else {
      updateAuthorName(authorId, result.displayName);
      setLookedUp(orcid);
      announce(`Name updated from ORCID: ${result.displayName}`);
    }
  }

  function applyOrcid(orcid: string) {
    updateAuthorOrcid(authorId, orcid);
    setEditingOrcid(false);
    setLookupError(null);
    setLookedUp(null);
    void lookup(orcid);
  }

  function clearOrcid() {
    updateAuthorOrcid(authorId, "");
    setLookupError(null);
    setLookedUp(null);
    setEditingOrcid(false);
  }

  function handleSmartPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const orcid = detectOrcid(event.clipboardData.getData("text"));
    if (!orcid) return;
    event.preventDefault();
    applyOrcid(orcid);
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-2 rounded-lg border border-transparent px-2 py-1 hover:border-outline-variant/30 hover:bg-surface-container-low transition-colors duration-150 ${
        isDragging ? "relative z-10 bg-surface shadow-md" : ""
      }`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${author.name}`}
        className="shrink-0 cursor-grab touch-none text-outline-variant hover:text-on-surface-variant transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span
        title={author.name}
        className="shrink-0 inline-flex items-center justify-center min-w-[2.5rem] h-6 px-1.5 rounded-md font-mono text-[11px] font-semibold bg-primary/10 text-primary"
      >
        {author.initials}
      </span>

      <div className="flex-1 min-w-0">
        <input
          id={`author-name-${author.id}`}
          type="text"
          aria-label="Name or ORCID iD"
          value={author.name}
          onChange={(event) => updateAuthorName(author.id, event.target.value)}
          onPaste={handleSmartPaste}
          className="w-full text-ellipsis bg-transparent border-none p-0 focus:ring-0 text-on-surface font-medium border-b border-primary/20 focus:border-primary outline-none text-sm"
        />

        {/* Meta row: contributor-type badge (always shown, click to swap) + ORCID. */}
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAuthorType(author.id, isNonAuthor ? "author" : "non-author")}
            aria-pressed={isNonAuthor}
            title={
              isNonAuthor
                ? "Acknowledged (non-author) contributor — click to mark as author"
                : "Author — click to mark as acknowledged (non-author) contributor"
            }
            className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-medium text-on-surface-variant hover:text-primary transition-colors"
          >
            {isNonAuthor ? <UserMinus className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
            {isNonAuthor ? "Contributor" : "Author"}
          </button>

          {/* ORCID: a chip when set, a reveal-on-demand input otherwise. */}
          {hasOrcid ? (
            <>
              <a
                href={`https://orcid.org/${orcidValue}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-mono text-on-surface-variant hover:text-primary transition-colors"
              >
                <Fingerprint className="h-3 w-3" />
                {orcidValue}
                {!orcidValid && (
                  <span className="text-error">
                    <span aria-hidden="true">✗</span>
                    <span className="sr-only">(invalid ORCID iD)</span>
                  </span>
                )}
                <span className="sr-only">(opens in new tab)</span>
              </a>
              {orcidValid && lookedUp !== orcidValue && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void lookup(orcidValue)}
                  aria-label="Look up name from ORCID"
                  title="Look up name from ORCID"
                  className="inline-flex items-center gap-1 text-[11px] text-primary transition-opacity hover:underline disabled:opacity-50 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <UserSearch className="h-3.5 w-3.5" />
                  {loading && "Looking up…"}
                </button>
              )}
              <button
                type="button"
                onClick={clearOrcid}
                aria-label="Remove ORCID iD"
                className="text-on-surface-variant hover:text-error transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {lookupError !== null && <span className="text-[10px] text-error leading-tight">{lookupError}</span>}
              {lookedUp === orcidValue && (
                <span className="text-[10px] text-primary leading-tight">Name updated from ORCID</span>
              )}
            </>
          ) : editingOrcid ? (
            <input
              // biome-ignore lint/a11y/noAutofocus: revealed on explicit user action, so focusing it is expected.
              autoFocus
              type="text"
              aria-label="ORCID iD"
              placeholder="0000-0000-0000-0000 or paste a URL"
              onPaste={handleSmartPaste}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                const orcid = detectOrcid(event.currentTarget.value);
                if (orcid) {
                  committedRef.current = true;
                  applyOrcid(orcid);
                }
              }}
              onBlur={(event) => {
                if (committedRef.current) {
                  committedRef.current = false;
                  return;
                }
                const orcid = detectOrcid(event.currentTarget.value);
                if (orcid) applyOrcid(orcid);
                else setEditingOrcid(false);
              }}
              className="w-full max-w-[15rem] bg-transparent p-0 focus:ring-0 text-on-surface-variant text-xs border-b border-outline-variant/40 focus:border-primary outline-none font-mono"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingOrcid(true)}
              className="inline-flex items-center gap-1 text-[11px] text-on-surface-variant hover:text-primary transition-[color,opacity] sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Plus className="h-3 w-3" />
              ORCID iD
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => removeAuthor(author.id)}
        className="shrink-0 flex items-center justify-center w-7 h-7 rounded text-on-surface-variant hover:text-error transition-colors"
        aria-label={`Remove ${author.name}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
