"use client";

import {
  type Author,
  buildHeatmapSvg,
  CREDIT_ROLES,
  heatCellColor,
  scoreToLevel,
  type UiKey,
  type UiTranslator,
} from "@credit-generator/core";
import { Columns3, Download, ExternalLink, Info, Rows3, UserPlus } from "lucide-react";
import { useState } from "react";
import { ColorPopover } from "@/components/ui/color-popover";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SegmentedControl } from "@/components/ui/segmented";
import { StepHeader } from "@/components/ui/step-header";
import { Switch } from "@/components/ui/switch";
import { announce } from "@/lib/announce";
import { useOutputTranslators } from "@/lib/use-output-translators";
import { download as downloadBlob } from "@/lib/utils";
import { type InputMode, useContributionStore } from "@/store/contribution-store";

// Canonical level↔score mapping. Clicks in Levels mode cycle through it
// ascending; the legend renders it descending (lead→none).
const LEVEL_CYCLE = [0, 33, 66, 100];
const LEVEL_KEY: { key: UiKey; score: number }[] = [
  { key: "lead", score: 100 },
  { key: "equal", score: 66 },
  { key: "supporting", score: 33 },
  { key: "none", score: 0 },
];
const FLAT_KEY: { key: UiKey; score: number }[] = [
  { key: "contributed", score: 100 },
  { key: "none", score: 0 },
];

const INPUT_MODE_OPTIONS: { value: InputMode; label: string }[] = [
  { value: "toggle", label: "Binary" },
  { value: "levels", label: "Levels" },
];

/**
 * The contribution matrix as one editable grid: roles as rows, contributors as
 * columns (or transposed), every cell a toggle. This doubles as the live
 * heatmap — cell fills use the same color scale as the downloadable SVG/PNG.
 */
export function ContributionGrid() {
  const {
    authors,
    inputMode,
    setInputMode,
    heatmapMonoColor,
    setHeatmapMonoColor,
    setAuthorScore,
    toggleContribution,
  } = useContributionStore();
  const { translateUi } = useOutputTranslators();
  const [transpose, setTranspose] = useState(false);
  const [acronyms, setAcronyms] = useState(true);

  // Graded (level) colors and labels follow the input mode, so the legend and
  // cells always match the way clicks behave.
  const graded = inputMode === "levels";

  function handleCellClick(author: Author, roleIndex: number, score: number) {
    if (inputMode === "levels") {
      // Step up to the next level, wrapping at the top. An off-cycle score from
      // imported data (say 50) simply steps up to the level above it.
      const next = LEVEL_CYCLE.find((step) => step > score) ?? 0;
      setAuthorScore(author.id, roleIndex, next);
      // The pressed state alone can't convey a 4-level value to screen readers.
      announce(`${CREDIT_ROLES[roleIndex]?.name} for ${author.name}: ${translateUi(scoreToLevel(next))}`);
    } else {
      toggleContribution(author.id, roleIndex);
    }
  }

  if (authors.length === 0) {
    return (
      <div className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant/20 p-4 md:p-5">
        <StepHeader n={2} title="Contributions" className="mb-3" />
        <div className="rounded-lg border border-dashed border-outline-variant/40 bg-surface-container-low/40 p-6 text-center">
          <UserPlus className="h-8 w-8 text-outline-variant mb-2 mx-auto" />
          <p className="text-sm text-on-surface-variant">
            Add contributors to start assigning the 14 CRediT roles in this grid.
          </p>
        </div>
      </div>
    );
  }

  const renderCell = (author: Author, roleIndex: number) => {
    const role = CREDIT_ROLES[roleIndex];
    const score = author.contributions[roleIndex]?.score ?? 0;
    const level = translateUi(graded ? scoreToLevel(score) : score > 0 ? "contributed" : "none");
    return (
      <td key={`${author.id}-${role?.name}`} className="p-0">
        <button
          type="button"
          aria-pressed={score > 0}
          aria-label={`${role?.name} for ${author.name}: ${level}`}
          title={`${author.name} — ${role?.name}: ${level}`}
          onClick={() => handleCellClick(author, roleIndex, score)}
          className="block h-6 w-full rounded transition-shadow hover:ring-2 hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{
            backgroundColor:
              score > 0 ? heatCellColor(heatmapMonoColor, graded ? score : 100) : "var(--color-surface-container-high)",
          }}
        />
      </td>
    );
  };

  return (
    <div className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant/20 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <StepHeader n={2} title="Contributions" />
        <div className="flex flex-wrap items-center gap-3">
          <ColorPopover
            value={heatmapMonoColor}
            onChange={setHeatmapMonoColor}
            label="Grid color"
            trigger={
              <button
                type="button"
                aria-label="Grid color"
                title="Grid color"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-outline-variant/60 text-[11px] font-medium text-on-surface-variant hover:text-primary hover:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Color
                <span
                  className="h-3 w-3 rounded-full border border-outline-variant/50"
                  style={{ backgroundColor: heatmapMonoColor }}
                />
              </button>
            }
          />
          <button
            type="button"
            aria-pressed={transpose}
            onClick={() => setTranspose(!transpose)}
            title="Transpose — swap the row and column axes"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
              transpose
                ? "border-primary text-primary"
                : "border-outline-variant/60 text-on-surface-variant hover:text-primary hover:border-primary"
            }`}
          >
            Transpose
            {transpose ? <Columns3 className="h-3.5 w-3.5" /> : <Rows3 className="h-3.5 w-3.5" />}
          </button>
          <span className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
            <Switch
              checked={acronyms}
              onCheckedChange={setAcronyms}
              aria-label="Acronyms — label contributors with initials"
            />
            Acronyms
          </span>
          <SegmentedControl
            ariaLabel="Role input mode"
            options={INPUT_MODE_OPTIONS}
            value={inputMode}
            onChange={setInputMode}
          />
        </div>
      </div>

      {/* Right padding reserves overhang room for angled column labels. */}
      <div className={`overflow-x-auto ${transpose || !acronyms ? "pr-24" : ""}`}>
        <table className="w-full table-fixed border-separate border-spacing-1">
          <thead>
            <tr>
              <th
                scope="col"
                className="w-40 md:w-48 text-left align-bottom text-[10px] font-mono uppercase tracking-wider font-medium text-on-surface-variant pb-1"
              >
                {transpose ? "Contributor" : "Role"}
              </th>
              {transpose
                ? CREDIT_ROLES.map((role) => (
                    <th key={role.name} scope="col" className="min-w-[2rem] pb-1 align-bottom">
                      <span className="flex flex-col items-center gap-1">
                        <AngledLabel text={role.name} />
                        <RoleInfo role={role} />
                      </span>
                    </th>
                  ))
                : authors.map((author) => (
                    <th key={author.id} scope="col" className="min-w-[2.75rem] pb-1 align-bottom">
                      {acronyms ? (
                        <>
                          <InitialsChip author={author} />
                          <span className="sr-only">{author.name}</span>
                        </>
                      ) : (
                        <AngledLabel text={author.name} />
                      )}
                    </th>
                  ))}
            </tr>
          </thead>
          <tbody>
            {transpose
              ? authors.map((author) => (
                  <tr key={author.id}>
                    <th scope="row" className="text-left py-0">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <InitialsChip author={author} />
                        {!acronyms && (
                          <span className="truncate text-[13px] font-medium text-on-surface" title={author.name}>
                            {author.name}
                          </span>
                        )}
                        {acronyms && <span className="sr-only">{author.name}</span>}
                      </span>
                    </th>
                    {CREDIT_ROLES.map((_, roleIndex) => renderCell(author, roleIndex))}
                  </tr>
                ))
              : CREDIT_ROLES.map((role, roleIndex) => (
                  <tr key={role.name}>
                    <th scope="row" className="text-left font-medium text-[13px] text-on-surface py-0">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate" title={role.name}>
                          {role.name}
                        </span>
                        <RoleInfo role={role} />
                      </span>
                    </th>
                    {authors.map((author) => renderCell(author, roleIndex))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <GridLegend monoColor={heatmapMonoColor} graded={graded} translateUi={translateUi} />
        <HeatmapExports
          authors={authors}
          monoColor={heatmapMonoColor}
          showLevels={graded}
          transpose={transpose}
          acronyms={acronyms}
        />
      </div>
    </div>
  );
}

/** A contributor's initials badge, with the full name as a tooltip. */
function InitialsChip({ author }: { author: Author }) {
  return (
    <span
      title={author.name}
      className="inline-flex items-center justify-center min-w-[2.5rem] h-6 px-1.5 rounded-md font-mono text-[11px] font-semibold bg-primary/10 text-primary"
    >
      {author.initials}
    </span>
  );
}

/**
 * A 45°-angled column label for long names in narrow columns, leaning up-right
 * from the column's bottom center — the same style as the downloaded heatmap's
 * top axis. The table wrapper adds right padding so the last column's label
 * has room to overhang.
 */
function AngledLabel({ text }: { text: string }) {
  return (
    <span className="relative block h-28 w-full">
      <span
        title={text}
        className="absolute bottom-0 left-1/2 origin-bottom-left -rotate-45 max-w-[9.5rem] overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-medium text-on-surface-variant"
      >
        {text}
      </span>
    </span>
  );
}

/** The role's short description with a link to its full NISO definition. */
function RoleInfo({ role }: { role: (typeof CREDIT_ROLES)[number] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`About ${role.name}`}
          className="shrink-0 rounded-full text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs text-xs leading-relaxed text-on-surface-variant">
        <strong className="text-on-surface">{role.name}.</strong> {role.description}{" "}
        <a
          href={role.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-primary hover:underline whitespace-nowrap"
        >
          Full definition
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          <span className="sr-only">(opens in new tab)</span>
        </a>
      </PopoverContent>
    </Popover>
  );
}

/** A single key mapping cell intensity to its contribution level. */
function GridLegend({
  monoColor,
  graded,
  translateUi,
}: {
  monoColor: string;
  graded: boolean;
  translateUi: UiTranslator;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-on-surface-variant">
      <span className="font-mono uppercase tracking-wider text-[10px]">{graded ? "Level" : "Key"}</span>
      {(graded ? LEVEL_KEY : FLAT_KEY).map(({ key, score }) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-sm border border-outline-variant"
            style={{
              // Zero-score swatch matches the grid's theme-aware empty cells,
              // not the download SVG's fixed paper-white fill.
              backgroundColor: score > 0 ? heatCellColor(monoColor, score) : "var(--color-surface-container-high)",
            }}
          />
          {translateUi(key)}
        </span>
      ))}
    </div>
  );
}

type ExportFormat = "svg" | "png";

/**
 * Rasterise an SVG string to a PNG Blob entirely in the browser, with no
 * server round-trip. Renders at 2× for crisp output suitable for slides/docs.
 */
function svgToPngBlob(svg: string, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round((img.naturalWidth || img.width) * scale);
      canvas.height = Math.round((img.naturalHeight || img.height) * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("PNG encoding failed"));
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not render SVG"));
    };
    img.src = url;
  });
}

/** Download the grid as a heatmap image, mirroring the on-screen display options. */
function HeatmapExports({
  authors,
  monoColor,
  showLevels,
  transpose,
  acronyms,
}: {
  authors: Author[];
  monoColor: string;
  showLevels: boolean;
  transpose: boolean;
  acronyms: boolean;
}) {
  const { translateRole, translateUi } = useOutputTranslators();
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(format: ExportFormat) {
    setLoading(format);
    setError(null);
    try {
      const svg = buildHeatmapSvg(authors, {
        transpose,
        monoColor,
        showLevels,
        acronyms,
        translateRole,
        translateUi,
      });
      if (format === "svg") {
        downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "credit-heatmap.svg");
      } else {
        downloadBlob(await svgToPngBlob(svg), "credit-heatmap.png");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      setError(message);
      announce(`Heatmap export failed: ${message}`, { assertive: true });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono uppercase tracking-wider text-[10px] text-on-surface-variant">Heatmap</span>
      {error && (
        <span className="text-[10px] text-error max-w-[120px] truncate" title={error}>
          {error}
        </span>
      )}
      {(["svg", "png"] as ExportFormat[]).map((format) => (
        <button
          key={format}
          type="button"
          disabled={loading !== null}
          onClick={() => download(format)}
          className="flex items-center gap-1.5 px-2.5 py-1 border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary rounded-lg text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="h-3.5 w-3.5" />
          {loading === format ? "…" : format.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
