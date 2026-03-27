"use client";

import { AuthorPanel } from "@/components/AuthorPanel";
import { StatementPanel } from "@/components/StatementPanel";

export default function HomePage() {
  return (
    <div className="flex flex-col md:flex-row gap-0 min-h-[calc(100vh-4rem)]">
      {/* Left column: author list + role assignment */}
      <section className="flex-1 max-w-2xl border-r border-outline-variant/20 p-8 space-y-8">
        <AuthorPanel />
      </section>

      {/* Right column: live heatmap + statement */}
      <aside className="flex-1 p-8 space-y-8 bg-surface-container-low/40">
        <StatementPanel />
      </aside>
    </div>
  );
}
