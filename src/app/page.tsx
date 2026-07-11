import { AuthorList } from "@/components/steps/AuthorInput";
import { ContributionHeatmap, RoleAssignment } from "@/components/steps/ContributionMatrix";
import { StatementOutput } from "@/components/steps/StatementOutput";
import { StepHeader } from "@/components/ui/step-header";
import { WelcomeCard } from "@/components/WelcomeCard";

export default function HomePage() {
  return (
    <>
      <WelcomeCard />
      <div className="flex flex-col xl:flex-row gap-0 min-h-[calc(100vh-4rem)]">
        {/* Left: author entry + role assignment for the selected author */}
        <section
          aria-label="Contributors and role assignment"
          className="flex-1 max-w-3xl border-b xl:border-b-0 xl:border-r border-outline-variant/20 p-4 md:p-8 space-y-6 md:space-y-8"
        >
          <AuthorList />
          <RoleAssignment />
        </section>

        {/* Right (Step 3): the tinted output region — heatmap + statement + export.
            The step number heads the whole group, since one step spans both panels. */}
        <aside aria-label="Review and export" className="flex-1 p-4 md:p-8 bg-surface-container-low/40">
          <StepHeader n={3} title="Review & export" className="mb-4 md:mb-6" />
          <div className="space-y-6 md:space-y-8">
            <ContributionHeatmap />
            <StatementOutput />
          </div>
        </aside>
      </div>
    </>
  );
}
