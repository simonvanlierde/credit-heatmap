"use client";

import { type Author, buildHeatmapSvg, CREDIT_ROLES, scoreToLevel } from "@credit-generator/core";
import type { DefaultHeatMapDatum } from "@nivo/heatmap";
import { UserSearch } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StepBadge } from "@/components/ui/step-badge";
import { contributorColor, contributorTextColor, type HeatmapColorMode, heatCellColor } from "@/lib/contributor-color";
import { download as downloadBlob } from "@/lib/utils";
import {
  type InputMode,
  ROLE_NAMES,
  ROLE_PRESETS,
  type RolePreset,
  useContributionStore,
} from "@/store/contribution-store";

const COLOR_MODE_LABELS: Record<HeatmapColorMode, string> = {
  "by-author": "By author",
  monochrome: "Monochrome",
  grayscale: "Grayscale",
};

const ResponsiveHeatMap = dynamic(() => import("@nivo/heatmap").then((m) => m.ResponsiveHeatMap), {
  ssr: false,
});

const LEVEL_SCORES: Record<string, number> = { none: 0, tertiary: 33, secondary: 66, lead: 100 };

const PRESET_LABELS: Record<RolePreset, string> = {
  "equal-contribution": "Equal contribution",
  "senior-author": "Senior author",
  "data-only-contributor": "Data-only contributor",
};

export function RoleAssignment() {
  const { authors, selectedAuthorId, inputMode, setInputMode, setAuthorScore, toggleContribution, applyPreset } =
    useContributionStore();
  // A preset awaiting confirmation because it would overwrite existing scores.
  const [pendingPreset, setPendingPreset] = useState<RolePreset | null>(null);

  const author = authors.find((candidate) => candidate.id === selectedAuthorId) ?? null;

  function handlePreset(preset: RolePreset) {
    if (!author) return;
    const hasScores = author.contributions.some((contribution) => contribution.score > 0);
    if (hasScores) {
      setPendingPreset(preset);
    } else {
      applyPreset(author.id, preset);
    }
  }

  if (!author) {
    return (
      <div className="bg-white rounded-lg border border-outline-variant/20 p-8 text-center">
        <UserSearch className="h-8 w-8 text-outline-variant mb-3 mx-auto" />
        <p className="text-sm text-on-surface-variant">Select a contributor above to assign their CRediT roles.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-outline-variant/20 p-5 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <h2
            className="flex items-center gap-2 text-2xl italic font-semibold text-primary"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            <StepBadge step={2} />
            Contribution Matrix
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Assign CRediT roles for <span className="font-semibold text-on-surface">{author.name}</span>
          </p>
        </div>
        <InputModeSwitcher current={inputMode} onChange={setInputMode} />
      </div>

      <div className="mb-5">
        <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-2">Role presets</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ROLE_PRESETS) as RolePreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePreset(preset)}
              className="px-3 py-2 rounded-full text-xs font-medium border border-outline-variant/40 text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
            >
              {PRESET_LABELS[preset]}
            </button>
          ))}
        </div>
      </div>

      <Dialog open={pendingPreset !== null} onOpenChange={(open) => !open && setPendingPreset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace contributions?</DialogTitle>
            <DialogDescription>
              Applying the <strong>{pendingPreset ? PRESET_LABELS[pendingPreset] : ""}</strong> preset overwrites all
              current CRediT scores for <strong>{author.name}</strong>. This can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className="px-4 py-2 rounded-lg text-sm font-medium border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors">
              Cancel
            </DialogClose>
            <button
              type="button"
              onClick={() => {
                if (pendingPreset) applyPreset(author.id, pendingPreset);
                setPendingPreset(null);
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-on-primary hover:bg-primary-container transition-colors"
            >
              Replace
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8">
        {CREDIT_ROLES.map((role, roleIndex) => {
          const score = author.contributions[roleIndex]?.score ?? 0;
          const active = score > 0;

          return (
            <div
              key={role.name}
              className="py-3 border-b border-surface-container-high hover:bg-surface-container-low px-3 -mx-3 rounded transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-on-surface">{role.name}</p>
                  <p className="text-[11px] text-on-surface-variant mt-1 line-clamp-2">{role.description}</p>
                </div>
                <span
                  className={`shrink-0 font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
                    active ? "bg-primary/10 text-primary font-medium" : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {scoreToLevel(score)}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                {inputMode === "toggle" && (
                  <button
                    type="button"
                    onClick={() => toggleContribution(author.id, roleIndex)}
                    aria-pressed={active}
                    aria-label={`${role.name}: ${active ? "on" : "off"}`}
                    className={`shrink-0 w-11 h-6 rounded-full relative transition-colors duration-200 ${
                      active ? "bg-primary/20" : "bg-surface-container-highest"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full transition-all duration-200 ${
                        active ? "right-1 bg-primary" : "left-1 bg-outline-variant"
                      }`}
                    />
                  </button>
                )}

                {inputMode === "levels" && (
                  <Select
                    value={scoreToLevel(score)}
                    onValueChange={(value) => setAuthorScore(author.id, roleIndex, LEVEL_SCORES[value] ?? 0)}
                  >
                    <SelectTrigger className="w-full sm:w-32 shrink-0" aria-label={`${role.name} level`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="tertiary">Tertiary</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
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

function InputModeSwitcher({ current, onChange }: { current: InputMode; onChange: (mode: InputMode) => void }) {
  const modes: { value: InputMode; label: string }[] = [
    { value: "toggle", label: "Binary" },
    { value: "levels", label: "Levels" },
  ];

  return (
    <div className="flex w-full md:w-auto overflow-x-auto bg-surface-container-high p-1 rounded-lg gap-0.5">
      {modes.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`flex-1 md:flex-none px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
            current === value ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

type HeatDatum = DefaultHeatMapDatum & { value: number };
type HeatRow = { id: string; data: HeatDatum[] };

function buildHeatData(authors: Author[], transpose: boolean): HeatRow[] {
  if (transpose) {
    // Rows = authors, columns = roles.
    return authors.map((author) => ({
      id: author.initials,
      data: ROLE_NAMES.map((role, roleIndex) => ({
        x: role,
        y: author.contributions[roleIndex]?.score ?? 0,
        value: author.contributions[roleIndex]?.score ?? 0,
      })),
    }));
  }
  // Rows = roles, columns = authors.
  return ROLE_NAMES.map((role, roleIndex) => ({
    id: role,
    data: authors.map((author) => ({
      x: author.initials,
      y: author.contributions[roleIndex]?.score ?? 0,
      value: author.contributions[roleIndex]?.score ?? 0,
    })),
  }));
}

// Tooltip rendering is inlined in the chart to avoid generic type mismatches

export function ContributionHeatmap() {
  const { authors, heatmapColorMode, setHeatmapColorMode } = useContributionStore();
  const [transpose, setTranspose] = useState(false);

  // Resolve a cell's author (by initials) to its position, so its hue matches
  // the badge and statement byline regardless of heatmap orientation.
  const indexByInitials = new Map(authors.map((author, index) => [author.initials, index]));

  if (authors.length === 0) {
    return (
      <div className="bg-surface-container rounded-lg border border-outline-variant/10 p-8">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-2">
          Real-time Contribution Heatmap
        </h3>
        <p className="text-sm text-on-surface-variant">Add contributors to see the heatmap.</p>
      </div>
    );
  }

  const data = buildHeatData(authors, transpose);
  const rowCount = transpose ? authors.length : ROLE_NAMES.length;
  const chartHeight = Math.max(220, rowCount * 28 + 60);
  // Left axis holds row labels, top axis holds (rotated) column labels — role
  // names are long, initials are short, so the margins swap with orientation.
  const margin = transpose
    ? { top: 130, right: 90, bottom: 10, left: 70 }
    : { top: 40, right: 20, bottom: 10, left: 185 };

  return (
    <div className="bg-surface-container rounded-lg border border-outline-variant/10 p-4 md:p-6 overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
          Real-time Contribution Heatmap
        </h3>
        <HeatmapExportButtons
          authors={authors}
          transpose={transpose}
          onTransposeChange={setTranspose}
          colorMode={heatmapColorMode}
          onColorModeChange={setHeatmapColorMode}
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

      <div style={{ height: chartHeight, width: "100%" }} aria-hidden="true">
        <ResponsiveHeatMap
          data={data}
          margin={margin}
          colors={(cell) => {
            const initials = transpose ? String(cell.serieId) : String(cell.data.x);
            return heatCellColor(heatmapColorMode, indexByInitials.get(initials) ?? 0, cell.value ?? 0);
          }}
          emptyColor="#ececea"
          forceSquare={false}
          xInnerPadding={0.08}
          yInnerPadding={0.08}
          borderRadius={2}
          borderWidth={0}
          borderColor={{ from: "color", modifiers: [["darker", 0.4]] }}
          enableLabels={false}
          axisTop={{ tickSize: 0, tickPadding: 6, tickRotation: transpose ? -45 : -30, legendOffset: -36 }}
          axisRight={null}
          axisBottom={null}
          axisLeft={{ tickSize: 0, tickPadding: 8, tickRotation: 0 }}
          theme={{
            axis: {
              ticks: {
                text: {
                  fontSize: 11,
                  fontFamily: "var(--font-plex-sans), system-ui, sans-serif",
                  fill: "#595c63",
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
            const level = scoreToLevel(score);

            return (
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e4e4e1",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  fontSize: "11px",
                  fontFamily: "var(--font-plex-sans), system-ui, sans-serif",
                  color: "#16181c",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                  pointerEvents: "none",
                }}
              >
                <strong>{authorName}</strong>
                <span style={{ color: "#595c63" }}> - {roleName}</span>
                <br />
                <span style={{ textTransform: "capitalize", color: "#1f4e79" }}>{level}</span>
                {level !== "none" && <span style={{ color: "#595c63" }}> ({score})</span>}
              </div>
            );
          }}
          legends={[]}
          animate
        />
      </div>

      <HeatmapLegend authors={authors} colorMode={heatmapColorMode} />
    </div>
  );
}

const LEVEL_KEY: { label: string; score: number }[] = [
  { label: "Lead", score: 100 },
  { label: "Secondary", score: 66 },
  { label: "Tertiary", score: 33 },
  { label: "None", score: 0 },
];

/**
 * Two keys: how intensity maps to contribution level (always), and — in
 * by-author mode — which hue belongs to which contributor.
 */
function HeatmapLegend({ authors, colorMode }: { authors: Author[]; colorMode: HeatmapColorMode }) {
  return (
    <div className="mt-4 flex flex-col gap-2 text-[11px] text-on-surface-variant">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono uppercase tracking-wider text-[10px]">Level</span>
        {LEVEL_KEY.map(({ label, score }) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm border border-outline-variant"
              style={{ backgroundColor: heatCellColor(colorMode, 0, score) }}
            />
            {label}
          </span>
        ))}
      </div>
      {colorMode === "by-author" && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono uppercase tracking-wider text-[10px]">Hue = contributor</span>
          {authors.map((author, index) => (
            <span key={author.id} className="inline-flex items-center gap-1.5">
              <span
                className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                style={{ backgroundColor: contributorColor(index), color: contributorTextColor(index) }}
              >
                {author.initials}
              </span>
              {author.name}
            </span>
          ))}
        </div>
      )}
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

function HeatmapExportButtons({
  authors,
  transpose,
  onTransposeChange,
  colorMode,
  onColorModeChange,
}: {
  authors: Author[];
  transpose: boolean;
  onTransposeChange: (transpose: boolean) => void;
  colorMode: HeatmapColorMode;
  onColorModeChange: (mode: HeatmapColorMode) => void;
}) {
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(format: ExportFormat) {
    setLoading(format);
    setError(null);
    try {
      const svg = buildHeatmapSvg(authors, { transpose, colorMode });
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

  const formats: { format: ExportFormat; label: string }[] = [
    { format: "svg", label: "SVG" },
    { format: "png", label: "PNG" },
  ];

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {error && (
        <span className="text-[10px] text-error mr-1 max-w-[120px] truncate" title={error}>
          {error}
        </span>
      )}
      <Select value={colorMode} onValueChange={(value) => onColorModeChange(value as HeatmapColorMode)}>
        <SelectTrigger className="h-[26px] w-[7.5rem] py-0 text-[10px]" aria-label="Heatmap color mode">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(COLOR_MODE_LABELS) as HeatmapColorMode[]).map((mode) => (
            <SelectItem key={mode} value={mode} className="text-xs">
              {COLOR_MODE_LABELS[mode]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        type="button"
        aria-pressed={transpose}
        onClick={() => onTransposeChange(!transpose)}
        title="Swap axes: authors down the left, roles across the top"
        className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border transition-colors ${
          transpose
            ? "border-primary text-primary"
            : "border-outline-variant/40 text-on-surface-variant hover:text-primary hover:border-primary"
        }`}
      >
        Transpose
      </button>
      {formats.map(({ format, label }) => (
        <button
          key={format}
          type="button"
          disabled={loading !== null || authors.length === 0}
          onClick={() => download(format)}
          className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border border-outline-variant/40 text-on-surface-variant hover:text-primary hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading === format ? "…" : label}
        </button>
      ))}
    </div>
  );
}
