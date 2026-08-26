"use client";

import { Code, ExternalLink, Info } from "lucide-react";
import { useTranslations } from "use-intl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** `version` is read from package.json by the (server) layout, so the manifest
 *  never reaches the client bundle. */
export function AboutPopover({ version }: { version: string }) {
  const t = useTranslations();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors"
          aria-label={t("aboutApp")}
        >
          <Info className="size-3.5" aria-hidden="true" />
          {t("about")}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-w-xs space-y-3 text-sm text-on-surface-variant">
        <div>
          <p className="font-semibold text-on-surface">
            CRediT Matrix <span className="font-mono text-xs font-normal text-on-surface-variant">v{version}</span>
          </p>
          <p className="mt-0.5">Draft CRediT contribution statements, and export the grid as a contribution heatmap.</p>
        </div>
        <a
          href="https://github.com/simonvanlierde/credit-heatmap"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
        >
          <Code className="size-4" aria-hidden="true" />
          Source code on GitHub
          <ExternalLink className="size-3" aria-hidden="true" />
          <span className="sr-only">(opens in new tab)</span>
        </a>
        <div className="border-t border-outline-variant/30 pt-2 text-xs space-y-1.5">
          <p>
            Inspired by the original{" "}
            <a
              href="https://github.com/IPHYS-Bioinformatics/CRediT-Generator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              Python/Dash CRediT Generator
              <ExternalLink className="size-3" aria-hidden="true" />
              <span className="sr-only">(opens in new tab)</span>
            </a>
            .
          </p>
          <p>
            Output translations by{" "}
            <a
              href="https://github.com/contributorshipcollaboration/credit-translation"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              credit-translation contributors
              <ExternalLink className="size-3" aria-hidden="true" />
              <span className="sr-only">(opens in new tab)</span>
            </a>
            , CC BY 4.0.
          </p>
          <p>
            The CRediT taxonomy is an ANSI/NISO standard, CC BY 4.0. This is an independent project, not affiliated with
            or endorsed by NISO.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
