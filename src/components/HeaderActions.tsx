"use client";

import type { Author } from "@credit-generator/core";
import { Check, CircleAlert, Link2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { ImportModal } from "@/components/ImportModal";
import { buildShareUrl, decodeShareHash } from "@/lib/share";
import { useCopyStatus } from "@/lib/use-copy-status";
import { useContributionStore } from "@/store/contribution-store";

/**
 * Import / Share buttons rendered in the nav bar.
 * Lives in its own Client Component so layout.tsx can stay a Server Component.
 */
export function HeaderActions() {
  const [importOpen, setImportOpen] = useState(false);
  const [shareStatus, copyShareUrl] = useCopyStatus();
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

  function handleShare() {
    void copyShareUrl(buildShareUrl(authors));
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleShare}
          disabled={authors.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary border border-primary/30 hover:bg-primary hover:text-on-primary hover:border-primary transition-colors rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {shareStatus === "copied" ? (
            <Check className="h-4 w-4" />
          ) : shareStatus === "error" ? (
            <CircleAlert className="h-4 w-4" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
          {shareStatus === "copied" ? "Link copied" : shareStatus === "error" ? "Copy failed" : "Share"}
        </button>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-primary text-on-primary hover:bg-primary-container transition-colors rounded-lg shadow-sm"
        >
          <Upload className="h-4 w-4" />
          Import
        </button>
      </div>

      <ImportModal open={importOpen} onImport={handleImport} onClose={() => setImportOpen(false)} />
    </>
  );
}
