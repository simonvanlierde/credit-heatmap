"use client";

import type { Author, RoleTranslator, StatementFormat, UiTranslator } from "@credit-generator/core";
import {
  generateStatement,
  isAllBinary,
  toCsv,
  toJats4rXml,
  toJson,
  toMarkdown,
  validateContributions,
} from "@credit-generator/core";
import { Copy, Download, Info, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { CreditBadge } from "@/components/ui/credit-badge";
import { SegmentedControl } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCopyStatus } from "@/lib/use-copy-status";
import { useOutputTranslators } from "@/lib/use-output-translators";
import { download } from "@/lib/utils";
import { useContributionStore } from "@/store/contribution-store";

type DataFormat = "xml" | "json" | "csv" | "markdown";

/** Machine-readable export formats, each able to be copied or downloaded. */
const DATA_FORMATS: Record<
  DataFormat,
  {
    label: string;
    serialize: (authors: Author[], translateRole: RoleTranslator, translateUi: UiTranslator) => string;
    filename: string;
    mime: string;
  }
> = {
  // XML/JSON/CSV are machine round-trip formats — kept in canonical English.
  // Only Markdown (a human-facing paste artifact) follows the output language.
  xml: { label: "XML (JATS4R)", serialize: toJats4rXml, filename: "credit-contributors.xml", mime: "application/xml" },
  json: { label: "JSON", serialize: toJson, filename: "credit_result.json", mime: "application/json" },
  csv: { label: "CSV", serialize: toCsv, filename: "credit_result.csv", mime: "text/csv;charset=utf-8" },
  markdown: {
    label: "Markdown",
    serialize: (authors, translateRole, translateUi) => toMarkdown(authors, translateRole, translateUi),
    filename: "credit-contributors.md",
    mime: "text/markdown;charset=utf-8",
  },
};

export function StatementOutput() {
  const { authors } = useContributionStore();
  const { translateRole, translateUi } = useOutputTranslators();
  const [copyStatus, copyText] = useCopyStatus();
  const [dataFormat, setDataFormat] = useState<DataFormat>("xml");
  // Statement-local output controls (independent of the heatmap's).
  const [grouping, setGrouping] = useState<"by-author" | "by-role">("by-author");
  const [acronyms, setAcronyms] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const [separateAck, setSeparateAck] = useState(true);

  const format: StatementFormat =
    grouping === "by-role" ? (acronyms ? "by-role-short" : "by-role") : acronyms ? "by-author-short" : "by-author";

  const statement = generateStatement(authors, {
    format,
    showLevels,
    translateRole,
    translateUi,
    separateAcknowledgements: separateAck,
  });
  const issues = validateContributions(authors);
  const hasAuthors = authors.length > 0;
  // Levels only mean something when contributions aren't purely binary.
  const canShowLevels = !isAllBinary(authors);
  // The split control only matters once someone is marked a non-author contributor.
  const hasNonAuthors = authors.some((author) => author.contributorType === "non-author");

  function downloadData() {
    if (!hasAuthors) return;
    const { serialize, filename, mime } = DATA_FORMATS[dataFormat];
    download(new Blob([serialize(authors, translateRole, translateUi)], { type: mime }), filename);
  }

  return (
    <div className="bg-surface-bright rounded-lg shadow-md border border-outline-variant/10 p-8 flex flex-col gap-6">
      {/* Header — the statement continues the output side (Step 3, marked on the heatmap above). */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
          Author Contribution Statement
        </h3>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <SegmentedControl
            ariaLabel="Statement grouping"
            size="sm"
            value={grouping}
            onChange={setGrouping}
            options={[
              { value: "by-author", label: "By author" },
              { value: "by-role", label: "By role" },
            ]}
          />
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <Switch
                checked={acronyms}
                onCheckedChange={setAcronyms}
                aria-label="Acronyms — use initials instead of names"
              />
              Acronyms
            </span>
            {canShowLevels && (
              <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <Switch
                  checked={showLevels}
                  onCheckedChange={setShowLevels}
                  aria-label="Show levels — annotate roles with contribution levels"
                />
                Show levels
              </span>
            )}
            {hasNonAuthors && (
              <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <Switch
                  checked={separateAck}
                  onCheckedChange={setSeparateAck}
                  aria-label="Separate acknowledgements — credit non-author contributors on their own line"
                />
                Separate acknowledgements
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Statement preview */}
      <div
        className="relative z-10 min-h-[7rem] bg-surface-container-low border-l-2 border-primary p-5 rounded-r"
        style={{ fontFamily: "var(--font-headline)" }}
      >
        {statement ? (
          <p className="whitespace-pre-line text-base italic leading-relaxed text-on-surface">{statement}</p>
        ) : (
          <p className="text-sm text-on-surface-variant not-italic">
            No contributions assigned yet — select a contributor and toggle their roles.
          </p>
        )}
      </div>

      {/* Validation notices — a live region so changes are announced as authors edit. */}
      {issues.length > 0 && (
        <ul className="relative z-10 flex flex-col gap-1.5" aria-label="Statement checks" aria-live="polite">
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

      {/* Primary action: copy the prose statement (copy result is announced via the global live region). */}
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

        <hr className="border-t border-outline-variant/20" />

        {/* Secondary: pick a data format, then copy or download it */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
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
              onClick={() => copyText(DATA_FORMATS[dataFormat].serialize(authors, translateRole, translateUi))}
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

          <CreditBadge className="flex items-center gap-1.5 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors" />
        </div>
      </div>
    </div>
  );
}
