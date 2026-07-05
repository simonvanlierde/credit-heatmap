import { AuthorList } from "@/components/steps/AuthorInput";
import { ContributionHeatmap, RoleAssignment } from "@/components/steps/ContributionMatrix";
import { StatementOutput } from "@/components/steps/StatementOutput";

export default function HomePage() {
  return (
    <div className="flex flex-col xl:flex-row gap-0 min-h-[calc(100vh-4rem)]">
      {/* Left: author entry + role assignment for the selected author */}
      <section
        aria-label="Contributors and role assignment"
        className="flex-1 max-w-3xl border-b xl:border-b-0 xl:border-r border-outline-variant/20 p-4 md:p-8 space-y-6 md:space-y-8"
      >
        <AuthorList />
        <RoleAssignment />
      </section>

      {/* Right: overview heatmap + live statement preview + export */}
      <aside
        aria-label="Contribution heatmap and statement output"
        className="flex-1 p-4 md:p-8 space-y-6 md:space-y-8 bg-surface-container-low/40"
      >
        <ContributionHeatmap />
        <StatementOutput />
      </aside>
    </div>
  );
}
