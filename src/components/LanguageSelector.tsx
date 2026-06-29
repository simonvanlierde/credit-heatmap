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
      <SelectTrigger
        aria-label="Output language"
        className="size-9 justify-center rounded-lg border-0 bg-transparent p-0 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary [&>svg:last-child]:hidden"
      >
        <Languages className="size-4" />
      </SelectTrigger>
      <SelectContent className="max-w-[17rem]">
        <p className="px-2 py-1.5 text-[11px] leading-snug text-on-surface-variant">
          Sets the language of the generated statement &amp; exports. UI translations are on the roadmap.
        </p>
        {AVAILABLE_LOCALES.map((locale) => (
          <SelectItem key={locale.code} value={locale.code}>
            {locale.name}
          </SelectItem>
        ))}
        <a
          href="https://github.com/contributorshipcollaboration/credit-translation"
          target="_blank"
          rel="noreferrer"
          className="mt-1 block whitespace-nowrap border-t border-outline-variant/30 px-2 py-1.5 text-[10px] leading-snug text-on-surface-variant hover:text-primary"
        >
          Translations: credit-translation contributors, CC BY 4.0
        </a>
      </SelectContent>
    </Select>
  );
}
