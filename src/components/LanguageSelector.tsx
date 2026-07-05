"use client";

import { AVAILABLE_LOCALES } from "@credit-generator/core";
import { Languages } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { useContributionStore } from "@/store/contribution-store";

/**
 * Header control for the *output* language — localizes role names in the
 * generated statement, Markdown, and heatmap. The note makes clear this is not
 * a UI translation (that's on the roadmap). Icon-only trigger to sit next to
 * the theme toggle; the appended Select chevron is hidden.
 */
export function LanguageSelector() {
  const outputLocale = useContributionStore((s) => s.outputLocale);
  const setOutputLocale = useContributionStore((s) => s.setOutputLocale);

  return (
    <Select value={outputLocale} onValueChange={setOutputLocale}>
      {/* Only SelectItems may live inside the listbox — the explanatory note moved
          to this tooltip and the translation credit to the About popover, so the
          dropdown stays a valid listbox (no interactive/non-option children). */}
      <SelectTrigger
        aria-label="Output language"
        title="Sets the language of the generated statement & exports. UI translations are on the roadmap."
        className="size-9 justify-center rounded-lg border-0 bg-transparent p-0 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary [&>svg:last-child]:hidden"
      >
        <Languages className="size-4" />
      </SelectTrigger>
      <SelectContent className="max-w-[17rem]">
        {AVAILABLE_LOCALES.map((locale) => (
          <SelectItem key={locale.code} value={locale.code}>
            {locale.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
