"use client";

import { ExternalLink, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function AboutPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors"
          aria-label="About this app"
        >
          <Info className="size-3.5" aria-hidden="true" />
          About
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-w-xs space-y-2 text-sm text-on-surface-variant">
        <p>
          A tool for building CRediT author contribution statements, inspired by the original{" "}
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
        <p className="text-xs">
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
      </PopoverContent>
    </Popover>
  );
}
