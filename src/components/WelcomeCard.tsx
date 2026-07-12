"use client";

import { Fingerprint, Sparkles, TableProperties, TextQuote, X } from "lucide-react";
import { useEffect, useState } from "react";
import { StepNumber } from "@/components/ui/step-number";
import { useContributionStore } from "@/store/contribution-store";

const STEPS = [
  {
    n: 1,
    icon: Fingerprint,
    title: "Add contributors",
    body: "Type a name, or paste an ORCID iD to fill it in automatically.",
  },
  {
    n: 2,
    icon: TableProperties,
    title: "Assign roles",
    body: "Pick a contributor, then mark which of the 14 CRediT roles they took on.",
  },
  {
    n: 3,
    icon: TextQuote,
    title: "Review & export",
    body: "Watch the heatmap fill in, then copy a ready-to-paste statement or download XML, CSV, and more.",
  },
];

/**
 * First-run welcome — a non-blocking card above the workspace. Auto-opens once
 * for a new visitor (tracked by the persisted `welcomeSeen` flag) and is
 * re-openable from the header via the ephemeral `welcomeOpen` flag. When it is
 * re-opened over an already-populated workspace it drops the "Load sample data"
 * action, so a re-open can never overwrite real contributor data.
 */
export function WelcomeCard() {
  const welcomeOpen = useContributionStore((s) => s.welcomeOpen);
  const closeWelcome = useContributionStore((s) => s.closeWelcome);
  const loadSample = useContributionStore((s) => s.loadSample);
  const hasAuthors = useContributionStore((s) => s.authors.length > 0);

  // The store uses skipHydration (see contribution-store.ts), so the persisted
  // flags aren't known until HeaderActions triggers rehydration. Gate on that,
  // then auto-open exactly once for a first-time visitor.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const onHydrated = () => {
      setHydrated(true);
      const state = useContributionStore.getState();
      if (!state.welcomeSeen) state.openWelcome();
    };
    if (useContributionStore.persist.hasHydrated()) onHydrated();
    return useContributionStore.persist.onFinishHydration(onHydrated);
  }, []);

  if (!hydrated || !welcomeOpen) return null;

  return (
    <section
      aria-label="Getting started"
      className="animate-[welcome-in_0.4s_ease-out] border-b border-outline-variant/20 bg-surface-bright px-4 py-6 md:px-8 md:py-8"
    >
      <div className="relative flex flex-col gap-6">
        <button
          type="button"
          onClick={closeWelcome}
          aria-label="Dismiss getting started"
          className="absolute -top-1 right-0 flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="max-w-2xl pr-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Getting started</p>
          <h2 className="mt-2 font-headline text-2xl italic font-semibold text-primary md:text-3xl">
            Draft a manuscript-ready contribution statement in three steps.
          </h2>
        </div>

        <ol className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-3">
          {STEPS.map(({ n, icon: Icon, title, body }) => (
            <li key={n} className="flex gap-3">
              <StepNumber n={n} className="mt-0.5 h-7 w-7 text-sm" />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-on-surface">
                  <Icon className="h-3.5 w-3.5 text-on-surface-variant" aria-hidden="true" />
                  {title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {hasAuthors ? (
            // Re-opened over existing work — no data-replacing action.
            <button
              type="button"
              onClick={closeWelcome}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
            >
              Got it
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  loadSample();
                  closeWelcome();
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
              >
                <Sparkles className="h-4 w-4" />
                Load sample data
              </button>
              <button
                type="button"
                onClick={closeWelcome}
                className="text-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
              >
                Start fresh
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
