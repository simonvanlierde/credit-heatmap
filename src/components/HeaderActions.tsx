"use client";

import type { Author } from "@credit-generator/core";
import { mergeContributorRow } from "@credit-generator/core";
import { Check, CircleAlert, Link2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { DraftPicker } from "@/components/DraftPicker";
import { ImportModal } from "@/components/ImportModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { announce } from "@/lib/announce";
import { buildShareUrl, decodeShareHash, type SharedDraft } from "@/lib/share";
import { useCopyStatus } from "@/lib/use-copy-status";
import { MAX_DRAFTS, useContributionStore } from "@/store/contribution-store";

/**
 * Import / Share buttons rendered in the nav bar.
 * Lives in its own Client Component so layout.tsx can stay a Server Component.
 */
export function HeaderActions() {
  const t = useTranslations();
  const [importOpen, setImportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareStatus, copyShareUrl] = useCopyStatus({
    copied: t("annLinkCopied"),
    error: t("copyFailedMessage"),
  });
  const authors = useContributionStore((s) => s.authors);
  const loadAuthors = useContributionStore((s) => s.loadAuthors);
  const setTitle = useContributionStore((s) => s.setTitle);
  const setClaim = useContributionStore((s) => s.setClaim);
  const activeDraftId = useContributionStore((s) => s.activeDraftId);
  const drafts = useContributionStore((s) => s.drafts);
  const createDraft = useContributionStore((s) => s.createDraft);
  const switchDraft = useContributionStore((s) => s.switchDraft);

  // Rehydrate persisted state on the client (the store skips hydration at
  // creation to avoid an SSR mismatch). Runs before the share-hash effect below
  // so a `#s=…` link still wins over whatever was restored from localStorage.
  useEffect(() => {
    void useContributionStore.persist.rehydrate();
  }, []);

  // On first load, a `#s=…` share link opens beside whatever was persisted
  // rather than over it: the person following the link may already have a paper
  // of their own in this browser. The hash is then cleared so later edits and
  // reloads aren't reverted.
  //
  // Adding `t` to the deps would re-run this on every language change; on the
  // failure path the hash is deliberately left in place, so it would
  // re-announce the error each time someone switches language.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only by design
  useEffect(() => {
    const fromHash = decodeShareHash(window.location.hash);
    if (fromHash && fromHash.authors.length > 0) {
      // decodeShareHash validates against the schema, but loadAuthors rebuilds
      // every author through createAuthor, which can still reject one. Throwing
      // here would take down the whole page render on a bad link, so degrade to
      // the persisted draft and say why.
      try {
        // Own work already here? Give the link its own draft — and refuse the
        // link when the draft cap makes that impossible, because falling
        // through would load it over the paper that is open.
        const occupied = useContributionStore.getState().authors.length > 0;
        if (occupied && createDraft() === null) {
          announce(t("draftLimitReached", { count: MAX_DRAFTS }), { assertive: true });
          return;
        }
        // The payload carries no title: loading in place must not keep the
        // previous paper's title above the shared roster.
        if (!occupied) setTitle("");
        loadAuthors(fromHash.authors);
        // Says whose row this link is asking for, and which paper it came from;
        // the banner reads the first and the reply carries the second back.
        setClaim(fromHash.claimIndex, fromHash.draftId);
      } catch {
        announce(t("errShareLinkBroken"), { assertive: true });
        return;
      }
      // Drop only the fragment; keep any query string intact.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [createDraft, loadAuthors, setClaim, setTitle]);

  function handleImport(importedAuthors: Author[], importedTitle?: string) {
    // Errors surface in ImportModal, which keeps the dialog open on failure.
    loadAuthors(importedAuthors);
    // Only the DOI path carries a title. Guard on it rather than on emptiness,
    // so a record with no title still clears a stale one from the last import.
    if (importedTitle !== undefined) setTitle(importedTitle);
  }

  /**
   * Take a pasted share link, without ever overwriting the paper you are on.
   *
   * Three cases, and the difference matters once more than one draft exists:
   *
   * - A reply to a request (it carries a claim) lands on the draft it was asked
   *   about, switching to that draft first. A reply whose draft is not here is
   *   reported rather than merged, because merging it into the paper that
   *   happens to be open would quietly rewrite the wrong one.
   * - A whole draft someone shared opens as a *new* draft, so the work in front
   *   of you survives.
   * - An empty workspace takes the shared draft in place; there is nothing to
   *   protect, and a stray empty draft is just clutter.
   */
  function handleLink(url: string): "errShareLinkBroken" | null {
    const hashAt = url.indexOf("#");
    const shared = hashAt === -1 ? null : decodeShareHash(url.slice(hashAt));
    if (!shared || shared.authors.length === 0) return "errShareLinkBroken";

    if (shared.claimIndex !== null) return mergeReply(shared);
    return openSharedDraft(shared);
  }

  /** Fold a co-author's reply into the draft it belongs to. */
  function mergeReply(shared: SharedDraft): "errShareLinkBroken" | null {
    if (shared.claimIndex === null) return "errShareLinkBroken";

    // A link built before draft ids existed has no home to name, so it lands
    // on the open draft, which is what it always did.
    const target = shared.draftId;
    if (target && target !== activeDraftId) {
      if (!drafts[target]) {
        announce(t("mergeWrongDraft"), { assertive: true });
        return null;
      }
      switchDraft(target);
    }

    // Read the roster after any switch: `authors` above is last render's.
    const current = useContributionStore.getState().authors;
    const result = mergeContributorRow(current, shared.authors, shared.claimIndex);
    if (result.unmatched) {
      announce(t("mergeUnmatched", { name: result.unmatched.name }), { assertive: true });
      return null;
    }
    if (!result.merged) return "errShareLinkBroken";

    try {
      loadAuthors(result.authors);
    } catch {
      return "errShareLinkBroken";
    }
    announce(t("mergedRow", { name: result.merged.name }));
    return null;
  }

  /** Open a whole shared draft beside your own work, never on top of it. */
  function openSharedDraft(shared: SharedDraft): "errShareLinkBroken" | null {
    const occupied = useContributionStore.getState().authors.length > 0;
    if (occupied && createDraft() === null) {
      announce(t("draftLimitReached", { count: MAX_DRAFTS }), { assertive: true });
      return null;
    }

    try {
      // In place, the previous paper's title would otherwise sit above the
      // shared roster: the payload carries no title of its own.
      if (!occupied) setTitle("");
      loadAuthors(shared.authors);
    } catch {
      return "errShareLinkBroken";
    }
    announce(occupied ? t("sharedDraftOpened") : t("mergeNotAClaim"));
    return null;
  }

  async function handleShare() {
    try {
      await copyShareUrl(buildShareUrl(authors));
      setShareOpen(false);
    } catch {
      announce(t("errShareTooLarge"), { assertive: true });
    }
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <DraftPicker />
        <Popover open={shareOpen} onOpenChange={setShareOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={authors.length === 0}
              aria-label={t("a11yShareLink")}
              title={t("a11yShareLink")}
              className="touch-target flex size-9 items-center justify-center gap-2 rounded-lg border border-primary/30 text-sm font-medium text-primary transition-colors hover:border-primary hover:bg-primary hover:text-on-primary disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-4"
            >
              {shareStatus === "copied" ? (
                <Check className="h-4 w-4" />
              ) : shareStatus === "error" ? (
                <CircleAlert className="h-4 w-4" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              <span className="sr-only sm:not-sr-only">
                {shareStatus === "copied"
                  ? t("linkCopied")
                  : shareStatus === "error"
                    ? t("copyFailedMessage")
                    : t("share")}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 max-w-[calc(100vw-1.5rem)]">
            <p className="text-sm font-semibold text-on-surface">{t("shareWarningTitle")}</p>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{t("shareWarningBody")}</p>
            <button
              type="button"
              onClick={() => void handleShare()}
              className="mt-3 inline-flex min-h-9 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container"
            >
              {t("copyDataLink")}
            </button>
          </PopoverContent>
        </Popover>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          aria-label={t("import")}
          className="touch-target flex size-9 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-on-primary shadow-sm transition-colors hover:bg-primary-container sm:w-auto sm:px-5"
        >
          <Upload className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">{t("import")}</span>
        </button>
      </div>

      <ImportModal
        open={importOpen}
        existingContributorCount={authors.length}
        onImport={handleImport}
        onLink={handleLink}
        onClose={() => setImportOpen(false)}
      />
    </>
  );
}
