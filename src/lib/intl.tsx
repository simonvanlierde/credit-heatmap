"use client";

import { type ReactNode, useEffect, useState } from "react";
import { IntlProvider } from "use-intl";
import en from "@/messages/en.json";
import { useContributionStore } from "@/store/contribution-store";

/**
 * Interface translation, on `use-intl`.
 *
 * The locale comes from the store, not the URL: it is a display preference that
 * belongs to the person, and it is deliberately independent of `outputLocale`
 * (someone may want a Dutch interface and an English statement). That is why
 * this is `use-intl` rather than its `next-intl` wrapper — the routing,
 * middleware, and server-message machinery has nothing to do here, and would
 * add native build dependencies for no gain.
 *
 * English is bundled as the source and the fallback. Other locales load lazily,
 * one chunk each, so only the selected language ships.
 */

/** Messages are flat key → ICU string; English defines the shape. */
export type Messages = typeof en;

const LOADERS: Record<string, () => Promise<{ default: Partial<Messages> }>> = {
  fr: () => import("@/messages/fr.json"),
  de: () => import("@/messages/de.json"),
  es: () => import("@/messages/es.json"),
  it: () => import("@/messages/it.json"),
  pt: () => import("@/messages/pt.json"),
  nl: () => import("@/messages/nl.json"),
  zh: () => import("@/messages/zh.json"),
  ja: () => import("@/messages/ja.json"),
};

export function AppIntlProvider({ children }: { children: ReactNode }) {
  const locale = useContributionStore((s) => s.uiLocale);
  const [messages, setMessages] = useState<Messages>(en);

  useEffect(() => {
    let active = true;
    const load = LOADERS[locale];
    if (!load) {
      setMessages(en);
      return;
    }
    load()
      // Merge over English so a key a locale has not translated renders English
      // rather than the key name.
      .then((mod) => {
        if (active) setMessages({ ...en, ...mod.default });
      })
      .catch(() => {
        // A locale chunk failed to load (e.g. a stale deploy). English is a
        // working interface; a missing-message crash is not.
        if (active) setMessages(en);
      });
    return () => {
      active = false;
    };
  }, [locale]);

  // Keep the document's declared language in step with the interface. The page
  // is server-rendered as `en`, and the store only knows the reader's choice
  // after it rehydrates, so this is a client-side correction rather than an SSR
  // attribute. Without it a Dutch interface still announces itself as English
  // and a screen reader applies English pronunciation to every label.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <IntlProvider
      locale={locale}
      messages={messages}
      // Never blank a control: fall back to the English text, then the key.
      getMessageFallback={({ key }) => (en as Record<string, string>)[key] ?? key}
      onError={() => {
        // use-intl logs missing keys to the console by default. The fallback
        // above already renders something sensible, so stay quiet.
      }}
    >
      {children}
    </IntlProvider>
  );
}
