import { AuthorPanel } from "@/components/AuthorPanel";
import { StatementPanel } from "@/components/StatementPanel";

export default function HomePage() {
  return (
    <div className="flex flex-col xl:flex-row gap-0 min-h-[calc(100vh-4rem)]">
      <section className="flex-1 max-w-3xl border-b xl:border-b-0 xl:border-r border-outline-variant/20 p-4 md:p-8 space-y-6 md:space-y-8">
        <AuthorPanel />
      </section>

      <aside className="flex-1 p-4 md:p-8 space-y-6 md:space-y-8 bg-surface-container-low/40">
        <StatementPanel />
      </aside>
    </div>
  );
}
