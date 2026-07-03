"use client";

import {
  type Author,
  buildHeatmapSvg,
  CREDIT_ROLES,
  heatCellColor,
  isAllBinary,
  rolesWithContributions,
  scoreToLevel,
  type UiKey,
  type UiTranslator,
} from "@credit-generator/core";
import type { DefaultHeatMapDatum } from "@nivo/heatmap";
import { CheckCheck, Columns3, Download, Eraser, Info, Rows3, UserSearch } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ColorPopover } from "@/components/ui/color-popover";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SegmentedControl } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useOutputTranslators } from "@/lib/use-output-translators";
import { download as downloadBlob } from "@/lib/utils";
import { type InputMode, useContributionStore } from "@/store/contribution-store";

const ResponsiveHeatMap = dynamic(() => import("@nivo/heatmap").then((m) => m.ResponsiveHeatMap), {
  ssr: false,
});

// Canonical level↔score mapping, ordered lead→none for the legend. The picker
// looks scores up by level name (LEVEL_SCORES), derived from the same source.
const LEVEL_KEY: { key: UiKey; score: number }[] = [
  { key: "lead", score: 100 },
  { key: "equal", score: 66 },
  { key: "supporting", score: 33 },
  { key: "none", score: 0 },
];
const LEVEL_SCORES: Record<string, number> = Object.fromEntries(LEVEL_KEY.map(({ key, score }) => [key, score]));

const INPUT_MODE_OPTIONS: { value: InputMode; label: string }[] = [
  { value: "toggle", label: "Binary" },
  { value: "levels", label: "Levels" },
];

export function RoleAssignment() {
  const { authors, selectedAuthorId, inputMode, setInputMode, setAuthorScore, toggleContribution } =
    useContributionStore();

  const authorIndex = authors.findIndex((candidate) => candidate.id === selectedAuthorId);
  const author = authorIndex >= 0 ? authors[authorIndex] : null;

  /** Bulk set every role to one score (Select all / Clear all). */
  function setAllScores(score: number) {
    if (!author) return;
    CREDIT_ROLES.forEach((_, roleIndex) => {
      setAuthorScore(author.id, roleIndex, score);
    });
  }

  if (!author) {
    return (
      <div className="bg-surface-bright rounded-lg border border-outline-variant/20 p-8 text-center">
        <UserSearch className="h-8 w-8 text-outline-variant mb-3 mx-auto" />
        <p className="text-sm text-on-surface-variant">Select a contributor above to assign their CRediT roles.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant/20 p-5 md:p-8">
      <div className="flex flex-col gap-3 mb-6">
        {/* Row 1: title + mode toggle */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl italic font-semibold text-primary" style={{ fontFamily: "var(--font-headline)" }}>
            Contribution Matrix
          </h2>
          <SegmentedControl
            ariaLabel="Role input mode"
            options={INPUT_MODE_OPTIONS}
            value={inputMode}
            onChange={setInputMode}
          />
        </div>
        {/* Row 2: subtitle + bulk actions */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="flex items-center gap-1.5 text-sm text-on-surface-variant">
            Assign CRediT roles for
            <span className="inline-flex items-center justify-center min-w-[1.75rem] h-5 px-1.5 rounded font-mono text-[10px] font-semibold bg-primary/10 text-primary">
              {author.initials}
            </span>
            <span className="font-semibold text-on-surface">{author.name}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAllScores(100)}
              aria-label="Select all roles"
              title="Select all"
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Select all
            </button>
            <button
              type="button"
              onClick={() => setAllScores(0)}
              aria-label="Clear all roles"
              title="Clear all"
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors"
            >
              <Eraser className="h-3.5 w-3.5" />
              Clear all
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6">
        {CREDIT_ROLES.map((role, roleIndex) => {
          const score = author.contributions[roleIndex]?.score ?? 0;
          const active = score > 0;

          return (
            <div
              key={role.name}
              className="flex items-center justify-between gap-3 py-2.5 border-b border-surface-container-high hover:bg-surface-container-low px-2 -mx-2 rounded transition-colors"
            >
              <div className="flex flex-1 items-center gap-1.5 min-w-0">
                <span className="text-sm font-medium text-on-surface truncate">{role.name}</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label={`About ${role.name}`}
                      className="shrink-0 text-on-surface-variant hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="max-w-xs text-xs leading-relaxed text-on-surface-variant">
                    <strong className="text-on-surface">{role.name}.</strong> {role.description}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Fixed-height slot so rows don't resize when switching Binary ⇄ Levels. */}
              <div className="flex h-7 shrink-0 items-center justify-end">
                {inputMode === "toggle" ? (
                  <Switch
                    checked={active}
                    onCheckedChange={() => toggleContribution(author.id, roleIndex)}
                    aria-label={`${role.name}: ${active ? "on" : "off"}`}
                  />
                ) : (
                  <Select
                    value={scoreToLevel(score)}
                    onValueChange={(value) => setAuthorScore(author.id, roleIndex, LEVEL_SCORES[value] ?? 0)}
                  >
                    <SelectTrigger className="w-24 shrink-0" aria-label={`${role.name} level`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="supporting">Supporting</SelectItem>
                      <SelectItem value="equal">Equal</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type HeatDatum = DefaultHeatMapDatum & { value: number };
type HeatRow = { id: string; data: HeatDatum[] };

function scoreByRole(author: Author, role: string): number {
  return author.contributions.find((c) => c.role === role)?.score ?? 0;
}

/** Build the Nivo matrix over the given (already-filtered) roles. */
function buildHeatData(authors: Author[], roleNames: string[], transpose: boolean): HeatRow[] {
  if (transpose) {
    // Rows = authors, columns = roles.
    return authors.map((author) => ({
      id: author.initials,
      data: roleNames.map((role) => {
        const score = scoreByRole(author, role);
        return { x: role, y: score, value: score };
      }),
    }));
  }
  // Rows = roles, columns = authors.
  return roleNames.map((role) => ({
    id: role,
    data: authors.map((author) => {
      const score = scoreByRole(author, role);
      return { x: author.initials, y: score, value: score };
    }),
  }));
}

export function ContributionHeatmap() {
  const { authors, heatmapMonoColor, setHeatmapMonoColor, toggleContribution } = useContributionStore();
  const { translateRole, translateUi } = useOutputTranslators();
  // Heatmap-local output controls (independent of the statement's).
  const [transpose, setTranspose] = useState(false);
  const [acronyms, setAcronyms] = useState(true);
  const [showLevels, setShowLevels] = useState(false);

  // Axis labels stay keyed by initials (stable, unique); display swaps to full
  // names when acronyms is off.
  const nameByInitials = new Map(authors.map((author) => [author.initials, author.name]));
  const formatAuthorTick = (value: string | number): string =>
    acronyms ? String(value) : (nameByInitials.get(String(value)) ?? String(value));
  // Role IDs stay canonical English (stable keys); only the label is localized.
  const formatRoleTick = (value: string | number): string => translateRole(String(value));

  // Only roles someone contributed to.
  const activeRoles = rolesWithContributions(authors);

  if (authors.length === 0 || activeRoles.length === 0) {
    return (
      <div className="bg-surface-container rounded-lg border border-outline-variant/10 p-8">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-2">
          Contribution Heatmap
        </h3>
        <p className="text-sm text-on-surface-variant">
          {authors.length === 0 ? "Add contributors to see the heatmap." : "Assign contributions to see the heatmap."}
        </p>
      </div>
    );
  }

  const data = buildHeatData(authors, activeRoles, transpose);
  const rowCount = transpose ? authors.length : activeRoles.length;
  const chartHeight = Math.max(220, rowCount * 28 + 60);
  // Left axis holds row labels, top axis holds (rotated) column labels — role
  // names are long, initials are short, so the margins swap with orientation.
  // The author-bearing axis also grows when showing full names (acronyms off).
  const margin = transpose
    ? { top: 130, right: 90, bottom: 10, left: acronyms ? 70 : 170 }
    : { top: acronyms ? 40 : 130, right: 20, bottom: 10, left: 185 };

  return (
    <div className="bg-surface-container rounded-lg border border-outline-variant/10 p-4 md:p-6 overflow-hidden">
      <div className="flex flex-col gap-3 mb-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Contribution Heatmap</h3>
        <HeatmapControls
          authors={authors}
          transpose={transpose}
          onTransposeChange={setTranspose}
          acronyms={acronyms}
          onAcronymsChange={setAcronyms}
          showLevels={showLevels}
          onShowLevelsChange={setShowLevels}
          monoColor={heatmapMonoColor}
          onMonoColorChange={setHeatmapMonoColor}
        />
      </div>

      {/* Text alternative for screen readers — the SVG heatmap below is decorative to AT. */}
      <ul className="sr-only">
        {authors.map((author) => {
          const active = author.contributions.filter((c) => c.score > 0);
          return (
            <li key={author.id}>
              {author.name}:{" "}
              {active.length === 0
                ? "no contributions assigned"
                : active.map((c) => `${c.role} (${scoreToLevel(c.score)})`).join(", ")}
            </li>
          );
        })}
      </ul>

      <div style={{ height: chartHeight, width: "100%", cursor: "pointer" }} aria-hidden="true">
        <ResponsiveHeatMap
          data={data}
          margin={margin}
          onClick={(cell) => {
            const xValue = String(cell.data.x);
            const serie = String(cell.serieId);
            const authorInitials = transpose ? serie : xValue;
            const roleName = transpose ? xValue : serie;
            const authorId = authors.find((author) => author.initials === authorInitials)?.id;
            const roleIndex = CREDIT_ROLES.findIndex((role) => role.name === roleName);
            if (authorId && roleIndex >= 0) toggleContribution(authorId, roleIndex);
          }}
          colors={(cell) => {
            const raw = cell.value ?? 0;
            // Flat fill (contributed/none) when levels are hidden.
            const score = showLevels ? raw : raw > 0 ? 100 : 0;
            return heatCellColor(heatmapMonoColor, score);
          }}
          emptyColor="var(--color-surface-container-high)"
          forceSquare={false}
          xInnerPadding={0.08}
          yInnerPadding={0.08}
          borderRadius={2}
          borderWidth={0}
          borderColor={{ from: "color", modifiers: [["darker", 0.4]] }}
          enableLabels={false}
          axisTop={{
            tickSize: 0,
            tickPadding: 6,
            tickRotation: transpose ? -45 : -30,
            legendOffset: -36,
            format: transpose ? formatRoleTick : formatAuthorTick,
          }}
          axisRight={null}
          axisBottom={null}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            tickRotation: 0,
            format: transpose ? formatAuthorTick : formatRoleTick,
          }}
          theme={{
            axis: {
              ticks: {
                text: {
                  fontSize: 11,
                  fontFamily: "var(--font-plex-sans), system-ui, sans-serif",
                  fill: "var(--color-on-surface-variant)",
                },
              },
            },
          }}
          tooltip={(props) => {
            // spell-checker: ignore serieId
            // Axes swap with `transpose`, so resolve which of x / serieId is which.
            const xValue = String(props.cell.data.x);
            const serie = String(props.cell.serieId);
            const authorInitials = transpose ? serie : xValue;
            const roleName = transpose ? xValue : serie;
            const authorName = authors.find((author) => author.initials === authorInitials)?.name ?? authorInitials;
            const score = props.cell.value ?? 0;
            const label = showLevels
              ? translateUi(scoreToLevel(score))
              : translateUi(score > 0 ? "contributed" : "none");

            return (
              <div
                style={{
                  background: "var(--color-surface-bright)",
                  border: "1px solid var(--color-outline-variant)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  fontSize: "11px",
                  fontFamily: "var(--font-plex-sans), system-ui, sans-serif",
                  color: "var(--color-on-surface)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                  pointerEvents: "none",
                }}
              >
                <strong>{authorName}</strong>
                <span style={{ color: "var(--color-on-surface-variant)" }}> - {translateRole(roleName)}</span>
                <br />
                <span style={{ color: "var(--color-primary)" }}>{label}</span>
                <span style={{ color: "var(--color-on-surface-variant)", opacity: 0.7 }}> · click to toggle</span>
              </div>
            );
          }}
          legends={[]}
          animate
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <HeatmapLegend monoColor={heatmapMonoColor} showLevels={showLevels} translateUi={translateUi} />
        <HeatmapExports
          authors={authors}
          transpose={transpose}
          monoColor={heatmapMonoColor}
          showLevels={showLevels}
          acronyms={acronyms}
        />
      </div>
    </div>
  );
}

const FLAT_KEY: { key: UiKey; score: number }[] = [
  { key: "contributed", score: 100 },
  { key: "none", score: 0 },
];

/** A single key mapping heatmap intensity to its contribution level. */
function HeatmapLegend({
  monoColor,
  showLevels,
  translateUi,
}: {
  monoColor: string;
  showLevels: boolean;
  translateUi: UiTranslator;
}) {
  return (
    <div className="flex flex-col gap-2 text-[11px] text-on-surface-variant">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono uppercase tracking-wider text-[10px]">{showLevels ? "Level" : "Key"}</span>
        {(showLevels ? LEVEL_KEY : FLAT_KEY).map(({ key, score }) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm border border-outline-variant"
              style={{ backgroundColor: heatCellColor(monoColor, score) }}
            />
            {translateUi(key)}
          </span>
        ))}
      </div>
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

/** Heatmap display controls (how the chart looks) — exports live below the chart. */
function HeatmapControls({
  authors,
  transpose,
  onTransposeChange,
  acronyms,
  onAcronymsChange,
  showLevels,
  onShowLevelsChange,
  monoColor,
  onMonoColorChange,
}: {
  authors: Author[];
  transpose: boolean;
  onTransposeChange: (transpose: boolean) => void;
  acronyms: boolean;
  onAcronymsChange: (acronyms: boolean) => void;
  showLevels: boolean;
  onShowLevelsChange: (showLevels: boolean) => void;
  monoColor: string;
  onMonoColorChange: (color: string) => void;
}) {
  const canShowLevels = !isAllBinary(authors);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <ColorPopover
        value={monoColor}
        onChange={onMonoColorChange}
        label="Heatmap color"
        trigger={
          <button
            type="button"
            aria-label="Heatmap color"
            title="Heatmap color"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-outline-variant/60 text-[11px] font-medium text-on-surface-variant hover:text-primary hover:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Color
            <span
              className="h-3 w-3 rounded-full border border-outline-variant/50"
              style={{ backgroundColor: monoColor }}
            />
          </button>
        }
      />
      <button
        type="button"
        aria-pressed={transpose}
        onClick={() => onTransposeChange(!transpose)}
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
        <Switch checked={acronyms} onCheckedChange={onAcronymsChange} aria-label="Label axis with initials" />
        Acronyms
      </span>
      {canShowLevels && (
        <span className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
          <Switch checked={showLevels} onCheckedChange={onShowLevelsChange} aria-label="Show contribution levels" />
          Show levels
        </span>
      )}
    </div>
  );
}

/** Export the heatmap as SVG/PNG — sits in the footer beside the legend. */
function HeatmapExports({
  authors,
  transpose,
  monoColor,
  showLevels,
  acronyms,
}: {
  authors: Author[];
  transpose: boolean;
  monoColor: string;
  showLevels: boolean;
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
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-[10px] text-error max-w-[120px] truncate" title={error}>
          {error}
        </span>
      )}
      {(["svg", "png"] as ExportFormat[]).map((format) => (
        <button
          key={format}
          type="button"
          disabled={loading !== null || authors.length === 0}
          onClick={() => download(format)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="h-3.5 w-3.5" />
          {loading === format ? "…" : format.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
