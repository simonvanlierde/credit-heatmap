"use client";

import type { Author } from "@credit-generator/core";
import { useState } from "react";
import { ImportModal } from "@/components/ImportModal";
import { useContributionStore } from "@/store/contribution-store";

/**
 * Import / Export buttons rendered in the nav bar.
 * Lives in its own Client Component so layout.tsx can stay a Server Component.
 */
export function HeaderActions() {
  const [importOpen, setImportOpen] = useState(false);
  const loadAuthors = useContributionStore((s) => s.loadAuthors);

  function handleImport(importedAuthors: Author[]) {
    loadAuthors(importedAuthors);
  }

  return (
    <>
      <div className="flex items-center gap-3">
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
