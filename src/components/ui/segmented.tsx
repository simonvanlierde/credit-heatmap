"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Optional accessible label when `label` is an icon/swatch. */
  title?: string;
}

/**
 * A pill-group segmented control — the app's standard for picking one of a few
 * mutually exclusive options (input mode, statement format, heatmap colors).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a toggle-button group, not a form fieldset; role=group + aria-label is the intended pattern.
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("inline-flex bg-surface-container-high p-1 rounded-lg gap-0.5", className)}
    >
      {options.map(({ value: optionValue, label, title }) => {
        const active = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            aria-pressed={active}
            title={title}
            onClick={() => onChange(optionValue)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded font-bold uppercase tracking-wider transition-all",
              size === "sm" ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]",
              active ? "bg-surface-bright text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
