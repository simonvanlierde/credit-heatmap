import { ClaimBanner } from "@/components/ClaimBanner";
import { LabelledSection } from "@/components/LabelledSection";
import { AuthorList } from "@/components/steps/AuthorInput";
import { ContributionGrid } from "@/components/steps/ContributionGrid";
import { StatementOutput } from "@/components/steps/StatementOutput";
import { WelcomeCard } from "@/components/WelcomeCard";

export default function HomePage() {
  return (
    <>
      <WelcomeCard />
      <ClaimBanner />
      {/* Steps 1–3 in DOM (and tab) order. Below xl they stack and the page
          scrolls; from xl each step gets its own column, so the workflow reads
          left to right and fits one desktop viewport.

          The statement never spans a full-width row: its prose is capped at 75ch
          for readability, so a 1200px-wide row would wrap the text at half its
          width and leave the rest empty. The matrix column is sized to the
          matrix (max-content) and the statement absorbs whatever horizontal
          space the matrix does not need, down to a 26rem floor.

          `desk` additionally locks the row to the viewport height; each pane
          scrolls its own content from there. */}
      <div className="flex flex-col gap-3 p-3 md:gap-4 md:p-4 xl:grid xl:grid-cols-[21rem_minmax(0,max-content)_minmax(26rem,1fr)] xl:items-start desk:h-full desk:items-stretch desk:overflow-hidden">
        <LabelledSection labelKey="stepContributors" className="min-w-0 desk:min-h-0">
          <AuthorList />
        </LabelledSection>

        <LabelledSection labelKey="a11yContributionGrid" className="min-w-0 desk:min-h-0">
          <ContributionGrid />
        </LabelledSection>

        <LabelledSection labelKey="a11yStatementExport" className="min-w-0 desk:min-h-0">
          <StatementOutput />
        </LabelledSection>
      </div>
    </>
  );
}
