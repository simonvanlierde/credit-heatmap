"use client";

import type { Author, StatementFormat } from "@credit-generator/core";
import {
  generateStatement,
  toCsv,
  toJats4rXml,
  toJson,
  toMarkdown,
  validateContributions,
} from "@credit-generator/core";
import { Copy, Download, Info, TriangleAlert } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StepBadge } from "@/components/ui/step-badge";
import { contributorInkColor } from "@/lib/contributor-color";
import { useCopyStatus } from "@/lib/use-copy-status";
import { download } from "@/lib/utils";
import { useContributionStore } from "@/store/contribution-store";

type DataFormat = "xml" | "json" | "csv" | "markdown";

/** Machine-readable export formats, each able to be copied or downloaded. */
const DATA_FORMATS: Record<
  DataFormat,
  { label: string; serialize: (authors: Author[]) => string; filename: string; mime: string }
> = {
  xml: { label: "XML (JATS4R)", serialize: toJats4rXml, filename: "credit-contributors.xml", mime: "application/xml" },
  json: { label: "JSON", serialize: toJson, filename: "credit_result.json", mime: "application/json" },
  csv: { label: "CSV", serialize: toCsv, filename: "credit_result.csv", mime: "text/csv;charset=utf-8" },
  markdown: {
    label: "Markdown",
    serialize: toMarkdown,
    filename: "credit-contributors.md",
    mime: "text/markdown;charset=utf-8",
  },
};

/**
 * Wrap each author's name in the generated statement with their contributor
 * hue, so the same color identifies a person on the badge, heatmap, and here.
 * Longest names first, so a name that is a substring of another still matches
 * the right person.
 */
function colorizeStatement(text: string, authors: Author[]): ReactNode {
  if (authors.length === 0) return text;
  const named = authors
    .map((author, index) => ({ name: author.name, color: contributorInkColor(index) }))
    .sort((a, b) => b.name.length - a.name.length);
  const pattern = named.map((n) => n.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return text.split(new RegExp(`(${pattern})`, "g")).map((part, idx) => {
    const match = named.find((n) => n.name === part);
    return match ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: split segments are positional and stable for a given render.
      <strong key={idx} className="font-semibold" style={{ color: match.color }}>
        {part}
      </strong>
    ) : (
      part
    );
  });
}

export function StatementOutput() {
  const { authors } = useContributionStore();
  const [format, setFormat] = useState<StatementFormat>("by-author");
  const [showLevels, setShowLevels] = useState(false);
  const [copyStatus, copyText] = useCopyStatus();
  const [dataFormat, setDataFormat] = useState<DataFormat>("xml");

  const statement = generateStatement(authors, { format, showLevels });
  const issues = validateContributions(authors);
  const hasAuthors = authors.length > 0;

  function downloadData() {
    if (!hasAuthors) return;
    const { serialize, filename, mime } = DATA_FORMATS[dataFormat];
    download(new Blob([serialize(authors)], { type: mime }), filename);
  }

  const formats: { value: StatementFormat; label: string }[] = [
    { value: "by-author", label: "By author" },
    { value: "by-role", label: "By role" },
    { value: "by-author-short", label: "Short" },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md border border-outline-variant/10 p-8 flex flex-col gap-6">
      {/* Header */}
      <div>
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
          <StepBadge step={3} />
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
          <p className="text-base italic leading-relaxed text-on-surface">{colorizeStatement(statement, authors)}</p>
        ) : (
          <p className="text-sm text-on-surface-variant not-italic">
            No contributions assigned yet — select a contributor and toggle their roles.
          </p>
        )}
      </div>

      {/* Validation notices */}
      {issues.length > 0 && (
        <ul className="relative z-10 flex flex-col gap-1.5" aria-label="Statement checks">
          {issues.map((issue) => (
            <li
              key={issue.message}
              className={`flex items-start gap-2 text-xs rounded px-3 py-2 ${
                issue.level === "warning"
                  ? "bg-error-container/30 text-error"
                  : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {issue.level === "warning" ? (
                <TriangleAlert className="h-4 w-4 shrink-0 mt-px" />
              ) : (
                <Info className="h-4 w-4 shrink-0 mt-px" />
              )}
              <span>{issue.message}</span>
            </li>
          ))}
        </ul>
      )}

      <span className="sr-only" role="status" aria-live="polite">
        {copyStatus === "copied" ? "Copied to clipboard" : copyStatus === "error" ? "Copy failed" : ""}
      </span>

      {/* Primary action: copy the prose statement */}
      <div className="relative z-10 flex flex-col gap-4">
        <button
          type="button"
          onClick={() => copyText(statement)}
          disabled={!statement}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Copy className="h-[18px] w-[18px]" />
          {copyStatus === "copied" ? "Copied!" : copyStatus === "error" ? "Copy failed" : "Copy statement"}
        </button>

        {/* Secondary: pick a data format, then copy or download it */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mr-1">
            Export data
          </span>
          <Select value={dataFormat} onValueChange={(value) => setDataFormat(value as DataFormat)}>
            <SelectTrigger className="w-40 py-1.5 text-sm" aria-label="Export format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(DATA_FORMATS) as DataFormat[]).map((value) => (
                <SelectItem key={value} value={value} className="text-sm">
                  {DATA_FORMATS[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={() => copyText(DATA_FORMATS[dataFormat].serialize(authors))}
            disabled={!hasAuthors}
            className="flex items-center gap-1.5 px-3 py-2 border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Copy className="h-[18px] w-[18px]" />
            Copy
          </button>

          <button
            type="button"
            onClick={downloadData}
            disabled={!hasAuthors}
            className="flex items-center gap-1.5 px-3 py-2 border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="h-[18px] w-[18px]" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
