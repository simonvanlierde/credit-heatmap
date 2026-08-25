"use client";

import type { Author } from "@credit-generator/core";
import { Check, CircleAlert, Link2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { ImportModal } from "@/components/ImportModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { announce } from "@/lib/announce";
import { buildShareUrl, decodeShareHash } from "@/lib/share";
import { useCopyStatus } from "@/lib/use-copy-status";
import { useContributionStore } from "@/store/contribution-store";

/**
 * Import / Share buttons rendered in the nav bar.
 * Lives in its own Client Component so layout.tsx can stay a Server Component.
 */
export function HeaderActions() {
  const [importOpen, setImportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareStatus, copyShareUrl] = useCopyStatus({
    copied: "Share link copied to clipboard",
    error: "Could not copy share link",
  });
  const authors = useContributionStore((s) => s.authors);
  const loadAuthors = useContributionStore((s) => s.loadAuthors);

  // Rehydrate persisted state on the client (the store skips hydration at
  // creation to avoid an SSR mismatch). Runs before the share-hash effect below
  // so a `#s=…` link still wins over whatever was restored from localStorage.
  useEffect(() => {
    void useContributionStore.persist.rehydrate();
  }, []);

  // On first load, a `#s=…` share link overrides the persisted/local state.
  // The hash is then cleared so later edits and reloads aren't reverted.
  useEffect(() => {
    const fromHash = decodeShareHash(window.location.hash);
    if (fromHash && fromHash.length > 0) {
      loadAuthors(fromHash);
      // Drop only the fragment; keep any query string intact.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [loadAuthors]);

  function handleImport(importedAuthors: Author[]) {
    loadAuthors(importedAuthors);
  }

  async function handleShare() {
    try {
      await copyShareUrl(buildShareUrl(authors));
      setShareOpen(false);
    } catch {
      announce("This draft is too large to share as a link.", { assertive: true });
    }
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <Popover open={shareOpen} onOpenChange={setShareOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={authors.length === 0}
              aria-label="Share"
              title="Copy a link containing all contributor data"
              className="flex size-9 items-center justify-center gap-2 rounded-lg border border-primary/30 text-sm font-medium text-primary transition-colors hover:border-primary hover:bg-primary hover:text-on-primary disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-4"
            >
              {shareStatus === "copied" ? (
                <Check className="h-4 w-4" />
              ) : shareStatus === "error" ? (
                <CircleAlert className="h-4 w-4" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              <span className="sr-only sm:not-sr-only">
                {shareStatus === "copied" ? "Link copied" : shareStatus === "error" ? "Copy failed" : "Share"}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 max-w-[calc(100vw-1.5rem)]">
            <p className="text-sm font-semibold text-on-surface">Copy a data-bearing link?</p>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              Anyone with this link can read every contributor name, ORCID iD, contributor type, and role assignment.
            </p>
            <button
              type="button"
              onClick={() => void handleShare()}
              className="mt-3 inline-flex min-h-9 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container"
            >
              Copy data link
            </button>
          </PopoverContent>
        </Popover>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          aria-label="Import"
          className="flex size-9 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-on-primary shadow-sm transition-colors hover:bg-primary-container sm:w-auto sm:px-5"
        >
          <Upload className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">Import</span>
        </button>
      </div>

      <ImportModal
        open={importOpen}
        existingContributorCount={authors.length}
        onImport={handleImport}
        onClose={() => setImportOpen(false)}
      />
    </>
  );
}
