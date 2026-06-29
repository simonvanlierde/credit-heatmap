"use client";

import {
  DEFAULT_ROLE_TRANSLATOR,
  DEFAULT_UI_TRANSLATOR,
  loadRoleCatalog,
  loadUiCatalog,
  makeRoleTranslator,
  makeUiTranslator,
  type RoleTranslator,
  type UiTranslator,
} from "@credit-generator/core";
import { useEffect, useState } from "react";
import { useContributionStore } from "@/store/contribution-store";

/**
 * Resolves the current output locale (from the store) to the translators for
 * human-facing output: role names and the non-role UI strings ("Acknowledgements",
 * level labels, heatmap title). One concern — translating the output to a
 * language — so one hook: a single locale subscription, both catalogs loaded in
 * parallel and lazily (code-split per locale). Falls back to English (for `en`
 * and until the catalogs load).
 */
export function useOutputTranslators(): { translateRole: RoleTranslator; translateUi: UiTranslator } {
  const locale = useContributionStore((s) => s.outputLocale);
  const [translators, setTranslators] = useState(() => ({
    translateRole: DEFAULT_ROLE_TRANSLATOR,
    translateUi: DEFAULT_UI_TRANSLATOR,
  }));

  useEffect(() => {
    let active = true;
    // Keep the previous language rendered until the new catalogs resolve, rather
    // than flashing English between two non-English locales.
    Promise.all([loadRoleCatalog(locale), loadUiCatalog(locale)]).then(([role, ui]) => {
      if (active) {
        setTranslators({ translateRole: makeRoleTranslator(role), translateUi: makeUiTranslator(ui) });
      }
    });
    return () => {
      active = false;
    };
  }, [locale]);

  return translators;
}
