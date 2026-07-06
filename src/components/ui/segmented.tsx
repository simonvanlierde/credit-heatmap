"use client";

import { type KeyboardEvent, type ReactNode, useRef } from "react";
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
 *
 * Implemented as a radiogroup: one tab stop, arrow keys move between (and select)
 * options, per the WAI-ARIA radio-group pattern.
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
  const groupRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const back = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!(forward || back)) return;
    event.preventDefault();
    const current = options.findIndex((option) => option.value === value);
    const nextIndex = (current + (forward ? 1 : options.length - 1)) % options.length;
    const next = options[nextIndex];
    if (!next) return;
    onChange(next.value);
    // Roving tabindex: move focus to the newly selected radio.
    // biome-ignore lint/security/noSecrets: this is a CSS attribute selector, not a credential.
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus();
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn("inline-flex bg-surface-container-high p-1 rounded-lg gap-0.5", className)}
    >
      {options.map(({ value: optionValue, label, title }) => {
        const active = value === optionValue;
        return (
          // biome-ignore lint/a11y/useSemanticElements: styled pill buttons, not native <input type="radio">; role=radio + roving tabindex is the intended pattern.
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
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
