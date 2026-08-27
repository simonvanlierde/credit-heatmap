import { ClaimBanner } from "@/components/ClaimBanner";
import { LabelledSection } from "@/components/LabelledSection";
import { AuthorList } from "@/components/steps/AuthorInput";
import { ContributionGrid } from "@/components/steps/ContributionGrid";
import { StatementOutput } from "@/components/steps/StatementOutput";
import { WelcomeCard } from "@/components/WelcomeCard";
// Server component: only the version string crosses into the client bundle.
import packageJson from "../../package.json";

export default function HomePage() {
  return (
    <>
      <WelcomeCard version={packageJson.version} />
      <ClaimBanner />
      {/* Steps 1–3 in DOM (and tab) order. Below xl they stack and the page
          scrolls; from xl each step gets its own column, so the workflow reads
          left to right and fits one desktop viewport.

          The statement never spans a full-width row: its prose is capped at 75ch
          for readability, so a wide column would wrap the text at half its
          width and leave the rest empty. Contributors and statement are
          therefore clamped, and the matrix column takes exactly the width its
          roster needs (minmax(0,max-content)): a wide monitor goes to more
          visible columns when there are many contributors, and to centered
          gutters (justify-center) when there are not. Narrower windows shrink
          the matrix into its own scroller instead of overflowing the page.

          `desk` additionally locks the row to the viewport height; each pane
          scrolls its own content from there. */}
      <div className="flex flex-col gap-3 p-3 md:gap-4 md:p-4 xl:grid xl:grid-cols-[20rem_minmax(0,max-content)_minmax(26rem,29rem)] xl:items-start xl:justify-center desk:h-full desk:items-stretch desk:overflow-hidden">
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
