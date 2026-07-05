"use client";

import { luminance, OKABE_ITO } from "@credit-generator/core";
import { Check, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

function textColorOn(hex: string): string {
  return luminance(hex) > 0.6 ? "#16181c" : "#ffffff";
}

/**
 * A small color picker in a popover: the Okabe–Ito swatches, a native custom
 * picker, and (when `onReset` is given) a reset-to-default action. `trigger` is
 * the clickable element that opens it (e.g. an author's color badge).
 */
export function ColorPopover({
  value,
  onChange,
  onReset,
  trigger,
  label = "Choose color",
}: {
  value: string;
  onChange: (hex: string) => void;
  onReset?: () => void;
  trigger: ReactNode;
  label?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-56">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</p>
        <div className="grid grid-cols-8 gap-1.5">
          {OKABE_ITO.map((hex) => {
            const selected = hex.toLowerCase() === value.toLowerCase();
            return (
              <button
                key={hex}
                type="button"
                onClick={() => onChange(hex)}
                title={hex}
                aria-label={`Set color ${hex}`}
                aria-pressed={selected}
                className="flex h-5 w-5 items-center justify-center rounded-full ring-offset-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{ backgroundColor: hex }}
              >
                {selected && <Check className="h-3 w-3" style={{ color: textColorOn(hex) }} />}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <input
              type="color"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              aria-label="Custom color"
              className="h-6 w-6 cursor-pointer rounded border border-outline-variant bg-transparent p-0"
            />
            Custom
          </label>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 text-[11px] text-on-surface-variant transition-colors hover:text-primary"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
