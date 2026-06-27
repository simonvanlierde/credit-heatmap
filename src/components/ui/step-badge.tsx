/** Small numbered badge marking a step in the add → assign → export journey. */
export function StepBadge({ step }: { step: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center w-5 h-5 rounded-full bg-primary text-on-primary text-[11px] font-bold not-italic">
      {step}
    </span>
  );
}
