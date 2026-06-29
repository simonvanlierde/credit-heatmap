"use client";

import { type Author, buildHeatmapSvg, CREDIT_ROLES, scoreToLevel } from "@credit-generator/core";
import type { DefaultHeatMapDatum } from "@nivo/heatmap";
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
import { download as downloadBlob } from "@/lib/utils";
import {
  type InputMode,
  ROLE_NAMES,
  ROLE_PRESETS,
  type RolePreset,
  useContributionStore,
} from "@/store/contribution-store";

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
        <span className="material-symbols-outlined text-3xl text-outline-variant mb-3 block">person_search</span>
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
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-on-surface-variant bg-surface-container px-2 py-1 rounded-full">
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

function buildHeatData(authors: Author[]): HeatRow[] {
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
  const { authors } = useContributionStore();

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

  const data = buildHeatData(authors);
  const chartHeight = Math.max(220, ROLE_NAMES.length * 28 + 60);

  return (
    <div className="bg-surface-container rounded-lg border border-outline-variant/10 p-4 md:p-6 overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
          Real-time Contribution Heatmap
        </h3>
        <HeatmapExportButtons authors={authors} />
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
          margin={{ top: 40, right: 20, bottom: 10, left: 185 }}
          colors={(cell) => scoreToColor(cell.value ?? 0)}
          emptyColor="#d1e4ff"
          forceSquare={false}
          xInnerPadding={0.08}
          yInnerPadding={0.08}
          borderRadius={2}
          borderWidth={0}
          borderColor={{ from: "color", modifiers: [["darker", 0.4]] }}
          enableLabels={false}
          axisTop={{ tickSize: 0, tickPadding: 6, tickRotation: -30, legendOffset: -36 }}
          axisRight={null}
          axisBottom={null}
          axisLeft={{ tickSize: 0, tickPadding: 8, tickRotation: 0 }}
          theme={{
            axis: {
              ticks: {
                text: {
                  fontSize: 11,
                  fontFamily: "Inter, system-ui, sans-serif",
                  fill: "#404850",
                },
              },
            },
          }}
          tooltip={(props) => {
            const xValue = props.cell.data.x;
            const authorName = authors.find((author) => author.initials === String(xValue))?.name ?? String(xValue);
            // spell-checker: ignore serieId
            const roleName = props.cell.serieId;
            const score = props.cell.value ?? 0;
            const level = scoreToLevel(score);

            return (
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #bfc7d1",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  fontSize: "11px",
                  fontFamily: "Inter, system-ui, sans-serif",
                  color: "#001d36",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                  pointerEvents: "none",
                }}
              >
                <strong>{authorName}</strong>
                <span style={{ color: "#404850" }}> - {roleName}</span>
                <br />
                <span style={{ textTransform: "capitalize", color: "#005d90" }}>{level}</span>
                {level !== "none" && <span style={{ color: "#404850" }}> ({score})</span>}
              </div>
            );
          }}
          legends={[]}
          animate
        />
      </div>
    </div>
  );
}

function scoreToColor(score: number): string {
  if (score === 0) return "#d1e4ff";
  if (score <= 33) return "#94ccff";
  if (score <= 66) return "#0077b6";
  return "#005d90";
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

function HeatmapExportButtons({ authors }: { authors: Author[] }) {
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(format: ExportFormat) {
    setLoading(format);
    setError(null);
    try {
      const svg = buildHeatmapSvg(authors);
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
