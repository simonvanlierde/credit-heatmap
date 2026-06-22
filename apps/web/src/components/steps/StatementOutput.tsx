"use client";

import type { StatementFormat } from "@credit-generator/core";
import { generateStatement, toCsv, toJats4rXml, toJson } from "@credit-generator/core";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useContributionStore } from "@/store/contribution-store";

export function StatementOutput() {
  const { authors } = useContributionStore();
  const [format, setFormat] = useState<StatementFormat>("by-author");
  const [showLevels, setShowLevels] = useState(false);
  const [copied, setCopied] = useState(false);

  const statement = generateStatement(authors, { format, showLevels });

  async function handleCopy() {
    await navigator.clipboard.writeText(statement);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadFile(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const formats: { value: StatementFormat; label: string }[] = [
    { value: "by-author", label: "By author" },
    { value: "by-role", label: "By role" },
    { value: "by-author-short", label: "Short" },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md border border-outline-variant/10 p-8 relative flex flex-col gap-6">
      {/* Decorative quote mark */}
      <div className="absolute top-5 left-5 text-primary/10 select-none pointer-events-none">
        <span
          className="text-7xl font-bold leading-none"
          style={{ fontFamily: "var(--font-headline)" }}
          aria-hidden="true"
        >
          "
        </span>
      </div>

      {/* Header */}
      <div className="relative z-10">
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
          Author Contribution Statement
        </h3>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          {/* Format switcher */}
          <div className="flex gap-1">
            {formats.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormat(value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  format === value
                    ? "bg-primary text-on-primary border-primary"
                    : "border-outline-variant text-on-surface-variant hover:border-primary/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Show levels toggle */}
          <div className="flex items-center gap-1.5">
            <Checkbox id="show-levels" checked={showLevels} onCheckedChange={(v) => setShowLevels(v === true)} />
            <Label htmlFor="show-levels" className="text-xs text-on-surface-variant cursor-pointer">
              Show levels
            </Label>
          </div>
        </div>
      </div>

      {/* Statement preview */}
      <div
        className="relative z-10 min-h-[7rem] bg-surface-container-low border-l-2 border-primary p-5 rounded-r"
        style={{ fontFamily: "var(--font-headline)" }}
      >
        {statement ? (
          <p className="text-base italic leading-relaxed text-on-surface">{statement}</p>
        ) : (
          <p className="text-sm text-on-surface-variant not-italic">
            No contributions assigned yet — select a contributor and toggle their roles.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="relative z-10 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(toJson(authors));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          disabled={authors.length === 0}
          className="flex items-center gap-2 px-3 py-2 border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Copy JSON
        </button>

        <button
          type="button"
          onClick={async () => {
            if (authors.length === 0) return;
            await navigator.clipboard.writeText(toJats4rXml(authors));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          disabled={authors.length === 0}
          className="flex items-center gap-2 px-3 py-2 border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Copy XML
        </button>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!statement}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant text-primary hover:bg-primary hover:text-on-primary hover:border-primary rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[18px]">content_copy</span>
          {copied ? "Copied!" : "Copy text"}
        </button>

        <button
          type="button"
          disabled={authors.length === 0}
          onClick={() => downloadFile(toJats4rXml(authors), "credit-contributors.xml", "application/xml")}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary-container transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          XML (JATS4R)
        </button>

        <button
          type="button"
          onClick={() => downloadFile(toJson(authors), "credit_result.json", "application/json")}
          disabled={authors.length === 0}
          className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[18px]">data_object</span>
          JSON
        </button>

        <button
          type="button"
          onClick={() => downloadFile(toCsv(authors), "credit_result.csv", "text/csv;charset=utf-8")}
          disabled={authors.length === 0}
          className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[18px]">table_view</span>
          CSV
        </button>
      </div>
    </div>
  );
}
