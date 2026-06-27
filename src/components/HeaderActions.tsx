"use client";

import type { Author } from "@credit-generator/core";
import { useEffect, useState } from "react";
import { ImportModal } from "@/components/ImportModal";
import { buildShareUrl, decodeShareHash } from "@/lib/share";
import { useContributionStore } from "@/store/contribution-store";

/**
 * Import / Share buttons rendered in the nav bar.
 * Lives in its own Client Component so layout.tsx can stay a Server Component.
 */
export function HeaderActions() {
  const [importOpen, setImportOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");
  const authors = useContributionStore((s) => s.authors);
  const loadAuthors = useContributionStore((s) => s.loadAuthors);

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
      await navigator.clipboard.writeText(buildShareUrl(authors));
      setShareStatus("copied");
    } catch {
      setShareStatus("error");
    }
    setTimeout(() => setShareStatus("idle"), 2000);
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
          <span className="material-symbols-outlined text-lg">
            {shareStatus === "copied" ? "check" : shareStatus === "error" ? "error" : "link"}
          </span>
          {shareStatus === "copied" ? "Link copied" : shareStatus === "error" ? "Copy failed" : "Share"}
        </button>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-primary text-on-primary hover:bg-primary-container transition-colors rounded-lg shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">upload_file</span>
          Import
        </button>
      </div>

      <ImportModal open={importOpen} onImport={handleImport} onClose={() => setImportOpen(false)} />
    </>
  );
}
