"use client";

import { useTranslations } from "use-intl";

/** First focusable element: lets keyboard users bypass the header nav. */
export function SkipLink() {
  const t = useTranslations();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-on-primary focus:shadow-lg"
    >
      {t("skipToContent")}
    </a>
  );
}
