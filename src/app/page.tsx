import { AuthorList } from "@/components/steps/AuthorInput";
import { ContributionGrid } from "@/components/steps/ContributionGrid";
import { StatementOutput } from "@/components/steps/StatementOutput";
import { WelcomeCard } from "@/components/WelcomeCard";

export default function HomePage() {
  return (
    <>
      <WelcomeCard />
      {/* Steps 1–3 in DOM (and tab) order; on xl+ contributors and the grid
          share the top row and the statement runs full-width below, so it is
          never squeezed into a narrow column by a long contributor list. */}
      <div className="flex flex-col gap-3 p-3 md:gap-4 md:p-4 xl:grid xl:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)] xl:items-start">
        <section aria-label="Contributors">
          <AuthorList />
        </section>

        <section aria-label="Contribution grid">
          <ContributionGrid />
        </section>

        <section aria-label="Statement and export" className="xl:col-span-2">
          <StatementOutput />
        </section>
      </div>
    </>
  );
}
