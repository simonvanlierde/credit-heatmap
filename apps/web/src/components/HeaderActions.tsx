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
  const [shared, setShared] = useState(false);
  const authors = useContributionStore((s) => s.authors);
  const loadAuthors = useContributionStore((s) => s.loadAuthors);

  // On first load, a `#s=…` share link overrides the persisted/local state.
  // The hash is then cleared so later edits and reloads aren't reverted.
  useEffect(() => {
    const fromHash = decodeShareHash(window.location.hash);
    if (fromHash && fromHash.length > 0) {
      loadAuthors(fromHash);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [loadAuthors]);

  function handleImport(importedAuthors: Author[]) {
    loadAuthors(importedAuthors);
  }

  async function handleShare() {
    await navigator.clipboard.writeText(buildShareUrl(authors));
    setShared(true);
    setTimeout(() => setShared(false), 2000);
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
          <span className="material-symbols-outlined text-lg">{shared ? "check" : "link"}</span>
          {shared ? "Link copied" : "Share"}
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
