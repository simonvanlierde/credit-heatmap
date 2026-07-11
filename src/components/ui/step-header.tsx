import { StepNumber } from "@/components/ui/step-number";

/**
 * A numbered step heading: the badge plus a serif title. Shared by the three
 * workflow sections (contributors, matrix, output) so their numbering and
 * typography stay in lockstep. `className` sets the surrounding spacing.
 */
export function StepHeader({ n, title, className }: { n: number; title: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <StepNumber n={n} />
      <h2 className="font-headline text-xl italic font-semibold text-primary">{title}</h2>
    </div>
  );
}
