"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type InputMode, ROLE_NAMES, useContributionStore } from "@/store/contribution-store";
import { type Author, scoreToLevel } from "@credit-generator/core";
import { CREDIT_ROLES } from "@credit-generator/core";
import { useState } from "react";

// ─── Per-author role assignment ───────────────────────────────────────────────

const LEVEL_SCORES: Record<string, number> = { none: 0, tertiary: 33, secondary: 66, lead: 100 };

/**
 * Role assignment panel for the currently selected author.
 * Renders as a 2-column grid of toggleable role rows.
 */
export function RoleAssignment() {
  const {
    authors,
    selectedAuthorIndex,
    inputMode,
    setInputMode,
    setAuthorScore,
    toggleContribution,
  } = useContributionStore();

  const author = selectedAuthorIndex !== null ? authors[selectedAuthorIndex] : null;

  if (selectedAuthorIndex === null || !author) {
    return (
      <div className="bg-white rounded-lg border border-outline-variant/20 p-8 text-center">
        <span className="material-symbols-outlined text-3xl text-outline-variant mb-3 block">
          person_search
        </span>
        <p className="text-sm text-on-surface-variant">
          Select a contributor above to assign their CRediT roles.
        </p>
      </div>
    );
  }

  const ai = selectedAuthorIndex;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-outline-variant/20 p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2
            className="text-2xl italic font-semibold text-primary"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            Contribution Matrix
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Assign CRediT roles for{" "}
            <span className="font-semibold text-on-surface">{author.name}</span>
          </p>
        </div>
        <InputModeSwitcher current={inputMode} onChange={setInputMode} />
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-1">
        {CREDIT_ROLES.map((role, ri) => {
          const score = author.contributions[ri]?.score ?? 0;
          const active = score > 0;
          return (
            <div
              key={role.name}
              className="flex items-center justify-between py-3 border-b border-surface-container-high group hover:bg-surface-container-low -mx-2 px-2 rounded transition-colors"
            >
              <span className="text-sm font-medium text-on-surface truncate mr-3">{role.name}</span>

              {inputMode === "toggle" && (
                <button
                  type="button"
                  onClick={() => toggleContribution(ai, ri)}
                  aria-pressed={active}
                  aria-label={`${role.name}: ${active ? "on" : "off"}`}
                  className={`shrink-0 w-10 h-5 rounded-full relative transition-colors duration-200 ${
                    active ? "bg-primary/20" : "bg-surface-container-highest"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-3 h-3 rounded-full transition-all duration-200 ${
                      active ? "right-1 bg-primary" : "left-1 bg-outline-variant"
                    }`}
                  />
                </button>
              )}

              {inputMode === "levels" && (
                <Select
                  value={scoreToLevel(score)}
                  onValueChange={(v) => setAuthorScore(ai, ri, LEVEL_SCORES[v] ?? 0)}
                >
                  <SelectTrigger className="w-24 shrink-0" aria-label={`${role.name} level`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">–</SelectItem>
                    <SelectItem value="tertiary">Tertiary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {inputMode === "slider" && (
                <div className="shrink-0 flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={score}
                    onChange={(e) => setAuthorScore(ai, ri, Number(e.target.value))}
                    aria-label={`${role.name} score`}
                    className="w-20 accent-primary"
                  />
                  <span className="text-xs text-on-surface-variant w-6 text-right">{score}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InputModeSwitcher({
  current,
  onChange,
}: {
  current: InputMode;
  onChange: (m: InputMode) => void;
}) {
  const modes: { value: InputMode; label: string }[] = [
    { value: "toggle", label: "Binary" },
    { value: "levels", label: "Granular" },
    { value: "slider", label: "Slider" },
  ];
  return (
    <div className="flex bg-surface-container-high p-1 rounded-lg gap-0.5">
      {modes.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
            current === value
              ? "bg-white text-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Overview heatmap table ───────────────────────────────────────────────────

/**
 * Compact heatmap table — all authors × all roles, shown as coloured squares.
 * Custom HTML/CSS, no Nivo dependency needed for this overview.
 */
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

  return (
    <div className="bg-surface-container rounded-lg border border-outline-variant/10 p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
          Real-time Contribution Heatmap
        </h3>
        <HeatmapExportButtons authors={authors} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="text-[9px] uppercase tracking-wider text-on-surface-variant">
              <th className="pb-3 font-bold pr-3 whitespace-nowrap">Role</th>
              {authors.map((a) => (
                <th key={a.initials} className="pb-3 px-1 font-bold text-center">
                  {a.initials}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[11px] font-medium">
            {ROLE_NAMES.map((role, ri) => (
              <tr key={role} className="border-b border-surface-container-highest/50">
                <td className="py-2 pr-3 whitespace-nowrap text-on-surface">{role}</td>
                {authors.map((author) => {
                  const score = author.contributions[ri]?.score ?? 0;
                  return (
                    <td key={author.initials} className="p-1 text-center">
                      <div
                        className="w-4 h-4 mx-auto rounded-sm"
                        style={{ backgroundColor: scoreToColor(score) }}
                        title={`${author.name} – ${role}: ${score}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Map 0–100 score to a shade of the brand blue. */
function scoreToColor(score: number): string {
  if (score === 0) return "#d1e4ff"; // surface-container-highest (empty)
  if (score <= 33) return "#94ccff"; // primary-fixed-dim (tertiary)
  if (score <= 66) return "#0077b6"; // primary-container (secondary)
  return "#005d90"; // primary (lead)
}

// ─── Heatmap export buttons ───────────────────────────────────────────────────

type ExportFormat = "svg" | "png" | "pdf";

const EXPORT_FORMATS: { format: ExportFormat; label: string; accept: string; ext: string }[] = [
  { format: "svg", label: "SVG", accept: "image/svg+xml", ext: "svg" },
  { format: "png", label: "PNG", accept: "image/png", ext: "png" },
  { format: "pdf", label: "PDF", accept: "application/pdf", ext: "pdf" },
];

function HeatmapExportButtons({ authors }: { authors: Author[] }) {
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(format: ExportFormat, accept: string, ext: string) {
    setLoading(format);
    setError(null);
    try {
      const res = await fetch("/api/v1/heatmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: accept },
        body: JSON.stringify({ authors }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `credit-heatmap.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-1">
      {error && (
        <span className="text-[10px] text-error mr-1 max-w-[120px] truncate" title={error}>
          {error}
        </span>
      )}
      {EXPORT_FORMATS.map(({ format, label, accept, ext }) => (
        <button
          key={format}
          type="button"
          disabled={loading !== null || authors.length === 0}
          onClick={() => download(format, accept, ext)}
          className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border border-outline-variant/40 text-on-surface-variant hover:text-primary hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading === format ? "…" : label}
        </button>
      ))}
    </div>
  );
}
