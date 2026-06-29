"use client";

import { BadgeCheck, Check, Copy, Download, ImageDown } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { type CopyStatus, useCopyStatus } from "@/lib/use-copy-status";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const BADGE_SRC = "/credit-badge.png";
const CREDIT_URL = "https://credit.niso.org/";
const ALT = "CRediT — Contributor Roles Taxonomy";

/** The page's own origin, so a pasted snippet keeps working off this deployment. */
function origin() {
  return typeof window === "undefined" ? "" : window.location.origin;
}

function htmlSnippet() {
  return `<a href="${CREDIT_URL}" target="_blank" rel="noopener">\n  <img src="${origin()}${BADGE_SRC}" alt="${ALT}" width="88" height="88">\n</a>`;
}

/**
 * "Get the CRediT badge" popover: shows the official NISO mark and hands over
 * a ready-to-paste HTML embed (attribution link baked in), a copy of the PNG
 * itself, and a direct download. The badge signals an article used the taxonomy.
 *
 * `className` overrides the trigger's styling (e.g. a lighter secondary look).
 */
export function CreditBadge({ className }: { className?: string }) {
  const [htmlStatus, copyHtml] = useCopyStatus();
  const [pngStatus, setPngStatus] = useState<CopyStatus>("idle");

  // Copy the image bytes (not a URL) so it pastes straight into a doc/editor.
  async function copyPng() {
    try {
      const blob = await (await fetch(BADGE_SRC)).blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setPngStatus("copied");
    } catch {
      setPngStatus("error");
    }
    setTimeout(() => setPngStatus("idle"), 2000);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={
            className ??
            "flex items-center gap-1.5 px-3 py-2 border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary rounded-lg text-sm font-medium transition-colors"
          }
        >
          <BadgeCheck className="h-[18px] w-[18px]" />
          Get the CRediT badge
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">CRediT badge</p>

        {/* Live preview, exactly as the snippet renders it */}
        <a
          href={CREDIT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 flex flex-col items-center gap-2 rounded-md bg-surface-container-low p-4 transition-colors hover:bg-surface-container"
        >
          <Image src={BADGE_SRC} alt={ALT} width={88} height={88} />
          <span className="text-[11px] text-on-surface-variant">credit.niso.org</span>
        </a>

        <p className="mb-3 text-xs leading-relaxed text-on-surface-variant">
          Add this badge to your article to show it uses the taxonomy.
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => copyHtml(htmlSnippet())}
            className="flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
          >
            {htmlStatus === "copied" ? <Check className="h-[18px] w-[18px]" /> : <Copy className="h-[18px] w-[18px]" />}
            {htmlStatus === "copied" ? "Copied HTML!" : htmlStatus === "error" ? "Copy failed" : "Copy HTML"}
          </button>
          <button
            type="button"
            onClick={copyPng}
            className="flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
          >
            {pngStatus === "copied" ? (
              <Check className="h-[18px] w-[18px]" />
            ) : (
              <ImageDown className="h-[18px] w-[18px]" />
            )}
            {pngStatus === "copied" ? "Copied PNG!" : pngStatus === "error" ? "Copy failed" : "Copy PNG"}
          </button>
          <a
            href={BADGE_SRC}
            download="credit-badge.png"
            className="flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
          >
            <Download className="h-[18px] w-[18px]" />
            Download PNG
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}
