"use client";

import { AVAILABLE_LOCALES, type LocaleCode } from "@credit-generator/core";
import { Languages } from "lucide-react";
import { useTranslations } from "use-intl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContributionStore } from "@/store/contribution-store";

/**
 * Header control for the two languages, which are deliberately independent: a
 * researcher may want a Dutch interface while submitting an English statement
 * to an English-language journal.
 *
 * - Interface: the app's own chrome.
 * - Output: role names in the generated statement, Markdown, and heatmap.
 *
 * A popover rather than a single dropdown, because a listbox may hold only
 * options — two labelled selects cannot live inside one.
 */
export function LanguageSelector() {
  const uiLocale = useContributionStore((s) => s.uiLocale);
  const setUiLocale = useContributionStore((s) => s.setUiLocale);
  const outputLocale = useContributionStore((s) => s.outputLocale);
  const setOutputLocale = useContributionStore((s) => s.setOutputLocale);
  const t = useTranslations();

  return (
    <Popover>
      {/* Broader than "Interface language": the panel also sets the output
          language, and that is the name people hunt for in the control list. */}
      <PopoverTrigger
        aria-label={t("languageSettings")}
        className="touch-target flex size-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
      >
        <Languages className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="grid gap-3">
          {/* A Radix trigger is a button, not a form control, so <label> cannot
              associate with it. Point the trigger at the visible text instead. */}
          <div className="grid gap-1.5 text-xs font-medium text-on-surface">
            <span id="ui-locale-label">{t("interfaceLanguage")}</span>
            <Select value={uiLocale} onValueChange={(value) => setUiLocale(value as LocaleCode)}>
              <SelectTrigger aria-labelledby="ui-locale-label" className="w-full text-xs font-normal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_LOCALES.map((locale) => (
                  <SelectItem key={locale.code} value={locale.code}>
                    {locale.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5 text-xs font-medium text-on-surface">
            <span id="output-locale-label">{t("outputLanguage")}</span>
            <Select value={outputLocale} onValueChange={(value) => setOutputLocale(value as LocaleCode)}>
              <SelectTrigger aria-labelledby="output-locale-label" className="w-full text-xs font-normal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_LOCALES.map((locale) => (
                  <SelectItem key={locale.code} value={locale.code}>
                    {locale.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
