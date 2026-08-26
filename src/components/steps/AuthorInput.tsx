"use client";

import {
  type Author,
  isValidOrcid,
  MAX_AUTHOR_NAME_LENGTH,
  MAX_AUTHORS,
  normalizeOrcid,
  ORCID_REGEX,
  splitNameList,
} from "@credit-generator/core";
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
import { useTranslations } from "use-intl";
import { StepHeader } from "@/components/ui/step-header";
import { announce } from "@/lib/announce";
import { useSettled } from "@/lib/use-settled";
import { useContributionStore } from "@/store/contribution-store";

const ORCID_EXTRACT_REGEX = /(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])/i;

/** Pull a valid ORCID iD out of arbitrary text (a raw id or an orcid.org URL). */
function detectOrcid(text: string): string | null {
  const candidate = text.trim().match(ORCID_EXTRACT_REGEX)?.[1]?.toUpperCase() ?? "";
  return ORCID_REGEX.test(candidate) ? candidate : null;
}

/** Written once: the same advice is reachable from the add field and from a row. */
const ORCID_CHECKSUM_ERROR = "That ORCID iD has an invalid checksum. Check the digits and try again.";

interface OrcidLookupResult {
  firstName: string;
  surname: string;
  displayName: string;
}

/** Fetch the canonical display name for an ORCID iD; returns name or error text. */
/**
 * Resolve an ORCID iD to a display name.
 *
 * Returns a failure *code*, not a message: this runs outside React, so it
 * cannot translate. The caller holds `t` and renders the code. The server's
 * English text rides along as `fallback` for a code this client does not know
 * — new server codes then degrade to readable English instead of a blank.
 */
type OrcidFailure = { code: string; fallback: string };

async function fetchOrcidName(orcid: string): Promise<{ displayName: string } | OrcidFailure> {
  try {
    const res = await fetch("/api/orcid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: normalizeOrcid(orcid) }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { code?: string; error?: string } | null;
      return {
        code: data?.code ?? "BAD_REQUEST",
        fallback: data?.error ?? "The ORCID lookup failed. Try again, or type the name.",
      };
    }
    const result = (await res.json()) as OrcidLookupResult;
    if (!result.displayName.trim()) {
      return { code: "NO_NAME", fallback: "That ORCID record lists no name. Type the name instead." };
    }
    return { displayName: result.displayName };
  } catch {
    // The ORCID proxy is the one path that needs a network: the rest of the app
    // works offline, so say which half is unavailable rather than blaming ORCID.
    return navigator.onLine
      ? { code: "UNREACHABLE", fallback: "Could not reach ORCID. Check your connection and try again." }
      : { code: "OFFLINE", fallback: "You are offline, so ORCID lookups are unavailable. Type the name instead." };
  }
}

/**
 * Failure code → message key. Explicit rather than built by string
 * concatenation, so the typed-message guarantee still holds: a key removed
 * from en.json breaks the build here instead of silently rendering a key name.
 */
const ORCID_ERROR_KEYS = {
  INVALID_ID: "errOrcidINVALID_ID",
  NOT_FOUND: "errOrcidNOT_FOUND",
  UNAVAILABLE: "errOrcidUNAVAILABLE",
  RATE_LIMITED: "errOrcidRATE_LIMITED",
  BAD_REQUEST: "errOrcidBAD_REQUEST",
  NO_NAME: "errOrcidNO_NAME",
  UNREACHABLE: "errOrcidUNREACHABLE",
  OFFLINE: "errOffline",
} as const;

/** Render an ORCID failure in the interface language. */
function orcidErrorText(failure: OrcidFailure, t: ReturnType<typeof useTranslations>): string {
  const key = ORCID_ERROR_KEYS[failure.code as keyof typeof ORCID_ERROR_KEYS];
  // An unknown code means the server is newer than this client: show the
  // English text it sent rather than nothing.
  return key ? t(key) : failure.fallback;
}

/** `plural(1, "entry", "entries")`: the counted noun, matched to its count. */
function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count === 1 ? singular : pluralForm;
}

async function forEachWithConcurrency<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      if (item !== undefined) await task(item);
    }
  });
  await Promise.all(workers);
}

export function AuthorList() {
  const t = useTranslations();
  const {
    authors,
    addAuthor,
    loadSample,
    moveAuthor,
    removeAuthor,
    reset,
    restoreAuthor,
    updateAuthorName,
    welcomeOpen,
    welcomeSeen,
  } = useContributionStore();

  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [removed, setRemoved] = useState<{ author: Author; index: number } | null>(null);
  const [clearPending, setClearPending] = useState(false);
  const [focusAfterRemove, setFocusAfterRemove] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const clearDraftRef = useRef<HTMLButtonElement>(null);
  const cancelClearRef = useRef<HTMLButtonElement>(null);
  // Rows that arrive after the app has settled animate in; a restored draft does not.
  const settled = useSettled();

  useEffect(() => {
    if (!removed) return;
    const timer = window.setTimeout(() => setRemoved(null), 8000);
    return () => window.clearTimeout(timer);
  }, [removed]);

  // The "Clear local draft" button is replaced by the Cancel/Clear draft pair,
  // so activating it unmounts the focused element. Carry focus across the swap
  // in both directions instead of letting it fall back to <body>.
  const clearWasPending = useRef(false);
  useEffect(() => {
    if (clearPending === clearWasPending.current) return;
    clearWasPending.current = clearPending;
    if (clearPending) {
      cancelClearRef.current?.focus();
      return;
    }
    // After an actual clear the list is empty, which disables the trigger;
    // focusing it would silently do nothing, so fall through to the add field.
    const trigger = clearDraftRef.current;
    if (trigger && !trigger.disabled) trigger.focus();
    else addInputRef.current?.focus();
  }, [clearPending]);

  // Runs after the removed row has left the DOM, so the buttons queried here
  // are the surviving ones. Falls back to the add field when the list empties.
  useEffect(() => {
    if (focusAfterRemove === null) return;
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("[data-remove-author]");
    const target = buttons?.length ? buttons[Math.min(focusAfterRemove, buttons.length - 1)] : undefined;
    (target ?? addInputRef.current)?.focus();
    setFocusAfterRemove(null);
  }, [focusAfterRemove]);

  function handleRemove(author: Author, index: number) {
    removeAuthor(author.id);
    setRemoved({ author, index });
    // The button that was just activated is unmounting, which drops focus to
    // <body> and sends a keyboard user back to the top of the document. Hand
    // focus to the row that takes its place instead.
    setFocusAfterRemove(index);
    announce(`${author.name} removed. Undo is available.`);
  }

  function undoRemove() {
    if (!removed) return;
    restoreAuthor(removed.author, removed.index);
    announce(`${removed.author.name} restored.`);
    setRemoved(null);
  }

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
    const id = addAuthor(orcid, orcid);
    if (!id) return { id, error: null };
    const result = await fetchOrcidName(orcid);
    if ("code" in result) return { id, error: orcidErrorText(result, t) };
    updateAuthorName(id, result.displayName);
    return { id, error: null };
  }

  /**
   * Add several contributors at once. Every row lands immediately, in the pasted
   * order; ORCID names then fill in from concurrent lookups.
   */
  async function addMany(tokens: string[]) {
    const pending: { id: string; orcid: string }[] = [];
    const rejected: string[] = [];
    const capacity = Math.max(0, MAX_AUTHORS - authors.length);
    const acceptedTokens = tokens.slice(0, capacity);
    const skippedForLimit = tokens.length - acceptedTokens.length;

    // An iD with the right shape but a bad check digit used to fall through to
    // addAuthor, throw inside createAuthor, and land in `rejected`; reported
    // as "no name in them", which is the wrong diagnosis. The single-add path
    // already checks the checksum, so bucket it the same way here.
    const badChecksum: string[] = [];
    for (const token of acceptedTokens) {
      const orcid = detectOrcid(token);
      if (orcid && !isValidOrcid(orcid)) {
        badChecksum.push(orcid);
        continue;
      }
      const id = addAuthor(orcid ?? token, orcid ?? undefined);
      if (!id) rejected.push(token);
      else if (orcid) pending.push({ id, orcid });
    }

    // Keep the row on a failed lookup (named after its iD) so one bad token
    // doesn't silently vanish from a pasted list, but say which ones failed,
    // so the rows still named after an iD aren't mistaken for real names.
    const failed: string[] = [];
    await forEachWithConcurrency(pending, 4, async ({ id, orcid }) => {
      const result = await fetchOrcidName(orcid);
      if ("code" in result) failed.push(orcid);
      else updateAuthorName(id, result.displayName);
    });

    const addedCount = acceptedTokens.length - rejected.length - badChecksum.length;
    const added = `Added ${addedCount} ${plural(addedCount, "contributor")}.`;
    const problems = [
      rejected.length > 0 &&
        `Skipped ${rejected.length} ${plural(rejected.length, "entry", "entries")} with no name (${rejected.join(", ")}).`,
      badChecksum.length > 0 &&
        `Skipped ${badChecksum.length} ORCID ${plural(badChecksum.length, "iD")} with an invalid check digit (${badChecksum.join(", ")}).`,
      failed.length > 0 &&
        `Could not look up ${failed.length} ORCID ${plural(failed.length, "iD")} (${failed.join(", ")}). Those rows are named after their iD; rename them by hand.`,
      skippedForLimit > 0 &&
        `Skipped ${skippedForLimit} ${plural(skippedForLimit, "contributor")}: a draft holds at most ${MAX_AUTHORS}.`,
    ].filter(Boolean);

    if (problems.length === 0) {
      announce(added);
      return;
    }
    const message = problems.join(" ");
    setAddError(message);
    announce(`${added} ${message}`, { assertive: true });
  }

  /** Add from the input: a bare ORCID seeds the row then fills its name from ORCID. */
  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAddError(null);
    // addAuthor returns null both for an unparseable name and for a full list,
    // so check the cap here. Without it, adding at the limit either reported
    // "that doesn't look like a name" (false) or, for an ORCID, cleared the
    // input and silently did nothing. addMany already reports this separately.
    if (authors.length >= MAX_AUTHORS) {
      const message = `A draft holds at most ${MAX_AUTHORS} contributors. Remove one to add another.`;
      setAddError(message);
      announce(message, { assertive: true });
      return;
    }
    const tokens = splitNameList(trimmed);
    if (tokens.length > 1) {
      setNewName("");
      await addMany(tokens);
      return;
    }
    const orcid = detectOrcid(trimmed);
    if (orcid) {
      if (!isValidOrcid(orcid)) {
        setAddError(ORCID_CHECKSUM_ERROR);
        announce(ORCID_CHECKSUM_ERROR, { assertive: true });
        return;
      }
      setNewName("");
      const { id, error } = await addOrcidAuthor(orcid);
      if (error) {
        // No junk author named after the iD survives a failed lookup.
        if (id) removeAuthor(id);
        setAddError(error);
        announce(error, { assertive: true });
        setNewName(orcid);
      }
    } else if (addAuthor(trimmed)) {
      setNewName("");
    } else {
      setAddError("That doesn’t look like a name. It needs at least one letter.");
    }
  }

  function handleNewNameKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") void handleAdd();
  }

  function handleClearDraft() {
    reset();
    useContributionStore.persist.clearStorage();
    setClearPending(false);
    announce("Local draft cleared.");
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
    <div className="flex flex-col bg-surface-bright rounded-lg shadow-sm border border-outline-variant/20 p-3 md:p-4 desk:h-full desk:overflow-y-auto">
      <StepHeader n={1} title={t("stepContributors")} className="mb-3" />

      {authors.length === 0 && !welcomeOpen && (
        <div className="rounded-lg border border-dashed border-outline-variant/40 bg-surface-container-low/40 p-6 text-center">
          <UserPlus className="h-8 w-8 text-outline-variant mb-2 mx-auto" />
          <p className="text-sm text-on-surface-variant">
            {t("noContributorsYet")} Add a name or an ORCID iD below, paste a whole author list, or use{" "}
            <strong>Import</strong> in the header.
          </p>
          {/* Only for returning/dismissed users (welcomeSeen) with the card closed:
              on a first run the welcome card owns this action, so the button is never
              duplicated and never flashes during hydration before the card opens. */}
          {welcomeSeen && !welcomeOpen && (
            <button
              type="button"
              onClick={loadSample}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary hover:text-on-primary hover:border-primary transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              {t("loadSample")}
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
          {/* A real list, so assistive tech announces the item count and each
              row's position; the ordering a sighted user reads straight off
              the layout. Tailwind's preflight already strips the markers. */}
          <ul ref={listRef} className="space-y-1 desk:min-h-0 desk:flex-1 desk:overflow-y-auto">
            {authors.map((author, index) => (
              <AuthorRow key={author.id} index={index} onRemove={handleRemove} enter={settled} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {/* The two wrappers are the height transition, not layout: the grid row
          opens from 0fr and the inner div clips what overflows while it does. */}
      {removed && (
        <div className="undo-enter grid">
          <div className="overflow-hidden">
            <div
              role="status"
              className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-surface-container px-3 py-2 text-sm text-on-surface"
            >
              <span className="min-w-0 truncate">{t("removedContributor", { name: removed.author.name })}</span>
              <button
                type="button"
                onClick={undoRemove}
                className="shrink-0 rounded-md px-2 py-1 font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t("undo")}
              </button>
            </div>
          </div>
        </div>
      )}

      {addError !== null && <p className="mt-4 -mb-2 text-xs text-error">{addError}</p>}

      <div className="mt-3 flex gap-2 items-center">
        <input
          ref={addInputRef}
          type="text"
          maxLength={MAX_AUTHOR_NAME_LENGTH}
          value={newName}
          onChange={(event) => {
            setNewName(event.target.value);
            if (addError !== null) setAddError(null);
          }}
          onKeyDown={handleNewNameKeyDown}
          onPaste={handleAddPaste}
          placeholder={t("addPlaceholder")}
          aria-label={t("addContributor")}
          className="flex-1 min-w-0 text-ellipsis bg-surface-container-low border-b-2 border-outline-variant/40 focus:border-primary focus:ring-0 outline-none px-3 py-2 text-sm rounded-t text-on-surface placeholder-outline transition-colors"
        />
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={!newName.trim()}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary hover:text-on-primary hover:bg-primary border border-primary/30 hover:border-primary rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <PlusCircle className="h-4 w-4" />
          {t("addButton")}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/20 pt-3">
        <p className="text-xs text-on-surface-variant">{t("draftStaysLocal")}</p>
        {clearPending ? (
          <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
            <span className="text-on-surface">{t("clearDraftQuestion")}</span>
            <button
              ref={cancelClearRef}
              type="button"
              onClick={() => setClearPending(false)}
              className="min-h-6 rounded px-2 font-medium text-on-surface-variant hover:text-on-surface"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={handleClearDraft}
              className="min-h-6 rounded bg-error-container px-2 font-semibold text-on-error-container"
            >
              {t("clearDraftConfirm")}
            </button>
          </div>
        ) : (
          <button
            ref={clearDraftRef}
            type="button"
            onClick={() => setClearPending(true)}
            disabled={authors.length === 0}
            className="inline-flex min-h-6 items-center gap-1.5 rounded text-xs font-medium text-on-surface-variant transition-colors hover:text-error disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            {t("clearDraft")}
          </button>
        )}
      </div>
    </div>
  );
}

/** A single draggable contributor row. ORCID UI state is local to the row. */
function AuthorRow({
  index,
  onRemove,
  enter,
}: {
  index: number;
  onRemove: (author: Author, index: number) => void;
  enter: boolean;
}) {
  const t = useTranslations();
  const { authors, updateAuthorName, updateAuthorOrcid, setAuthorType } = useContributionStore();
  const author = authors[index];

  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookedUp, setLookedUp] = useState<string | null>(null);
  // Revealed-but-empty ORCID input, and a guard so an Enter-commit's unmount
  // blur doesn't re-apply the iD.
  const [editingOrcid, setEditingOrcid] = useState(false);
  const [nameDraft, setNameDraft] = useState(author?.name ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const committedRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  // Guard against setState after the row unmounts mid-lookup (delete/reorder).
  const mounted = useRef(true);
  useEffect(() => {
    // Set on mount, not just at creation: React re-runs effects on a StrictMode
    // remount, and the cleanup would otherwise leave this false for good, so every
    // later lookup would bail out before clearing "Looking up…".
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Keyed on the stored name, not the author object: normalizeAuthors rebuilds
  // every author on any list mutation, so an identity-keyed effect overwrote
  // whatever the user was typing whenever an unrelated ORCID lookup resolved.
  const storedName = author?.name;
  useEffect(() => {
    if (storedName !== undefined) setNameDraft(storedName);
  }, [storedName]);

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
  const bareOrcid = normalizeOrcid(orcidValue);
  const hasOrcid = orcidValue.length > 0;
  const orcidValid = isValidOrcid(orcidValue);
  const isNonAuthor = author.contributorType === "non-author";

  async function lookup(orcid: string) {
    setLoading(true);
    setLookupError(null);
    setLookedUp(null);
    const result = await fetchOrcidName(orcid);
    if (!mounted.current) return;
    setLoading(false);
    if ("code" in result) {
      const message = orcidErrorText(result, t);
      setLookupError(message);
      announce(message, { assertive: true });
    } else {
      updateAuthorName(authorId, result.displayName);
      setLookedUp(orcid);
      announce(`Name updated from ORCID: ${result.displayName}`);
    }
  }

  /** Returns true when the iD was accepted and the editor closed. */
  function applyOrcid(orcid: string): boolean {
    if (!isValidOrcid(orcid)) {
      setLookupError(ORCID_CHECKSUM_ERROR);
      announce(ORCID_CHECKSUM_ERROR, { assertive: true });
      setEditingOrcid(true);
      return false;
    }
    updateAuthorOrcid(authorId, orcid);
    setEditingOrcid(false);
    setLookupError(null);
    setLookedUp(null);
    void lookup(orcid);
    return true;
  }

  function clearOrcid() {
    updateAuthorOrcid(authorId, "");
    setLookupError(null);
    setLookedUp(null);
    setEditingOrcid(false);
    // This unmounts the whole ORCID line, including the button that was just
    // activated. Put focus on the row's name field rather than losing it.
    nameInputRef.current?.focus();
  }

  function handleSmartPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const orcid = detectOrcid(event.clipboardData.getData("text"));
    if (!orcid) return;
    event.preventDefault();
    applyOrcid(orcid);
  }

  function commitName() {
    // A long name leaves the input scrolled to its tail. Rewind it so the
    // truncation reads from the start ("Maximiliana Feathersto…") the moment
    // the field is left, rather than whenever the row next re-renders.
    nameInputRef.current?.scrollTo({ left: 0 });
    if (updateAuthorName(authorId, nameDraft)) {
      setNameError(null);
      return;
    }
    setNameError("Enter a name with at least one letter and no more than 500 characters.");
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group rounded-lg border border-transparent px-2 py-0.5 hover:border-outline-variant/30 hover:bg-surface-container-low transition-colors duration-150 ${
        isDragging ? "relative z-10 bg-surface shadow-md" : ""
      }`}
    >
      {/* The entrance lives on this wrapper, not on the row: @dnd-kit owns the
          sortable node's inline transform and transition, and an inline
          transition beats anything a class can say. The stagger is capped so a
          pasted list of thirty names still finishes in a fifth of a second. */}
      <div className={enter ? "enter-rise" : undefined} style={{ transitionDelay: `${Math.min(index, 5) * 40}ms` }}>
        {/* Identity line: everything that is one-per-contributor and short. */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`${t("reorderContributor")} ${author.name}`}
            className="flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-outline-variant transition-colors hover:text-on-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
              ref={nameInputRef}
              id={`author-name-${author.id}`}
              type="text"
              maxLength={MAX_AUTHOR_NAME_LENGTH}
              aria-label={t("nameLabel")}
              value={nameDraft}
              onChange={(event) => {
                setNameDraft(event.target.value);
                setNameError(null);
              }}
              onBlur={commitName}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  setNameDraft(author.name);
                  setNameError(null);
                  event.currentTarget.blur();
                }
              }}
              onPaste={handleSmartPaste}
              aria-invalid={nameError !== null}
              aria-describedby={nameError ? `author-name-error-${author.id}` : undefined}
              className="w-full text-ellipsis bg-transparent border-none p-0 focus:ring-0 text-on-surface font-medium border-b border-primary/20 focus:border-primary outline-none text-sm"
            />
            {nameError && (
              <span id={`author-name-error-${author.id}`} className="mt-1 block text-[11px] text-error">
                {nameError}
              </span>
            )}

            {/* Type badge, plus the ORCID trigger while there is nothing to show. */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAuthorType(author.id, isNonAuthor ? "author" : "non-author")}
                aria-pressed={isNonAuthor}
                title={
                  isNonAuthor
                    ? "Acknowledged (non-author) contributor. Click to mark as author."
                    : "Author. Click to mark as acknowledged (non-author) contributor."
                }
                className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-medium text-on-surface-variant hover:text-primary transition-colors"
              >
                {isNonAuthor ? <UserMinus className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                {isNonAuthor ? t("contributorTypeNonAuthor") : t("contributorTypeAuthor")}
              </button>
              {!hasOrcid && !editingOrcid && (
                // Short label: the trigger is hover-revealed but still occupies its
                // width, and "ORCID iD" pushed this row onto a second line in the
                // narrow contributors column.
                <button
                  type="button"
                  onClick={() => setEditingOrcid(true)}
                  aria-label={t("addOrcid")}
                  className="inline-flex items-center gap-1 text-[11px] text-on-surface-variant hover:text-primary transition-[color,opacity] sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Plus className="h-3 w-3" />
                  {t("orcidShort")}
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            data-remove-author=""
            onClick={() => onRemove(author, index)}
            className="touch-target shrink-0 flex items-center justify-center size-8 rounded text-on-surface-variant hover:bg-error-container/30 hover:text-error transition-colors"
            aria-label={`${t("removeContributor")} ${author.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* ORCID line. A 19-character iD never fits beside the type badge in this
          column, so it gets a line of its own, indented to the name column so it
          shares a left edge with the type badge above it, and with its actions on
          the same line instead of wrapping into a ragged fourth one. */}
        {(hasOrcid || editingOrcid || lookupError !== null) && (
          <div className="mt-1 flex items-center gap-1.5 pl-20">
            {hasOrcid ? (
              <>
                <a
                  href={`https://orcid.org/${bareOrcid}`}
                  target="_blank"
                  rel="noreferrer"
                  title={bareOrcid}
                  className="inline-flex min-w-0 items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 font-mono text-[11px] text-on-surface-variant transition-colors hover:text-primary"
                >
                  <Fingerprint className="h-3 w-3 shrink-0" />
                  <span className="truncate">{bareOrcid}</span>
                  {!orcidValid && (
                    <span className="shrink-0 text-error">
                      <span aria-hidden="true">✗</span>
                      <span className="sr-only">(invalid ORCID iD)</span>
                    </span>
                  )}
                  <span className="sr-only">(opens in new tab)</span>
                </a>
                {orcidValid && lookedUp !== bareOrcid && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void lookup(bareOrcid)}
                    aria-label={t("lookupOrcidName")}
                    title={t("lookupOrcidName")}
                    className="ml-auto inline-flex shrink-0 items-center gap-1 text-[11px] text-primary transition-opacity hover:underline disabled:opacity-50 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <UserSearch className="h-3.5 w-3.5" />
                    {loading && t("lookingUp")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearOrcid}
                  aria-label={t("removeOrcid")}
                  className="ml-auto shrink-0 text-on-surface-variant transition-colors hover:text-error"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {lookedUp === bareOrcid && (
                  <span className="shrink-0 text-[10px] leading-tight text-primary">{t("nameUpdated")}</span>
                )}
              </>
            ) : editingOrcid ? (
              <input
                // biome-ignore lint/a11y/noAutofocus: revealed on explicit user action, so focusing it is expected.
                autoFocus
                type="text"
                aria-label="ORCID iD"
                placeholder="0000-0000-0000-0000"
                title="Type an ORCID iD, or paste one as an iD or an orcid.org URL"
                onPaste={handleSmartPaste}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  const orcid = detectOrcid(event.currentTarget.value);
                  // Only suppress the follow-up blur when the apply actually
                  // took. On a checksum failure the input stays mounted, and a
                  // latched ref made the next blur discard the corrected iD.
                  if (orcid) committedRef.current = applyOrcid(orcid);
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
                className="w-full min-w-0 border-b border-outline-variant/40 bg-transparent p-0 font-mono text-xs text-on-surface-variant outline-none focus:border-primary focus:ring-0"
              />
            ) : null}
          </div>
        )}
        {lookupError !== null && <p className="mt-1 pl-20 text-[10px] leading-tight text-error">{lookupError}</p>}
      </div>
    </li>
  );
}
