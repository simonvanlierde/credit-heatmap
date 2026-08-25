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
import {
  Check,
  Columns3,
  Copy,
  Download,
  ExternalLink,
  Info,
  ListChecks,
  Rows3,
  Settings2,
  UserPlus,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { ColorPopover } from "@/components/ui/color-popover";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SegmentedControl } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StepHeader } from "@/components/ui/step-header";
import { Switch } from "@/components/ui/switch";
import { announce } from "@/lib/announce";
import type { CopyStatus } from "@/lib/use-copy-status";
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

// "None" is what Clear does, so the bulk picker offers only the assignable levels.
const ASSIGNABLE_LEVELS = LEVEL_KEY.filter(({ score }) => score > 0);
// Equal, not Lead: bulk-marking everyone as Lead overstates every one of them.
const DEFAULT_BULK_LEVEL = 66;

const INPUT_MODE_OPTIONS: { value: InputMode; label: string }[] = [
  { value: "toggle", label: "Yes / no" },
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
    setAllAuthorScores,
    setRoleScores,
    toggleContribution,
    welcomeOpen,
  } = useContributionStore();
  const { translateUi } = useOutputTranslators();
  const [acronyms, setAcronyms] = useState(true);
  const [selectedAuthorId, setSelectedAuthorId] = useState("");
  const [bulkAuthorId, setBulkAuthorId] = useState("");
  const [transpose, setTranspose] = useState(false);
  const [bulkRoleIndex, setBulkRoleIndex] = useState("0");
  const [bulkLevel, setBulkLevel] = useState(String(DEFAULT_BULK_LEVEL));

  // Graded (level) colors and labels follow the input mode, so the legend and
  // cells always match the way clicks behave.
  const graded = inputMode === "levels";
  const modeHint = "Click a cell repeatedly: None → Supporting → Equal → Lead.";

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
      <div className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant/20 p-3 md:p-4">
        <StepHeader n={2} title="Contributions" className="mb-3" />
        {welcomeOpen ? (
          <p className="text-sm text-on-surface-variant">Your contribution workspace will appear here.</p>
        ) : (
          <div className="rounded-lg border border-dashed border-outline-variant/40 bg-surface-container-low/40 p-6 text-center">
            <UserPlus className="h-8 w-8 text-outline-variant mb-2 mx-auto" />
            <p className="text-sm text-on-surface-variant">
              Add contributors to start assigning the 14 CRediT roles in this grid.
            </p>
          </div>
        )}
      </div>
    );
  }

  const firstAuthor = authors[0];
  if (!firstAuthor) return null;
  const selectedAuthor = authors.find((author) => author.id === selectedAuthorId) ?? firstAuthor;
  const bulkAuthor = authors.find((author) => author.id === bulkAuthorId) ?? firstAuthor;
  const parsedBulkRoleIndex = Number.parseInt(bulkRoleIndex, 10);
  // Yes/no has one "assigned" value; levels asks which one.
  const assignScore = graded ? Number.parseInt(bulkLevel, 10) : 100;

  const renderCell = (author: Author, roleIndex: number) => {
    const role = CREDIT_ROLES[roleIndex];
    const score = author.contributions[roleIndex]?.score ?? 0;
    const level = translateUi(graded ? scoreToLevel(score) : score > 0 ? "contributed" : "none");
    return (
      <td key={`${author.id}-${role?.name}`} className="min-w-11 p-0">
        <button
          type="button"
          aria-pressed={score > 0}
          aria-label={`${role?.name} for ${author.name}: ${level}`}
          title={`${author.name} — ${role?.name}: ${level}`}
          onClick={() => handleCellClick(author, roleIndex, score)}
          className="contribution-cell flex h-7 w-full items-center justify-center rounded transition-shadow hover:ring-2 hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{
            backgroundColor:
              score > 0 ? heatCellColor(heatmapMonoColor, graded ? score : 100) : "var(--color-surface-container-high)",
          }}
        >
          {score > 0 && (
            <Check
              aria-hidden="true"
              className="size-3.5 text-white [filter:drop-shadow(0_1px_1px_rgb(0_0_0/0.8))]"
              strokeWidth={3}
            />
          )}
        </button>
      </td>
    );
  };

  return (
    <div className="flex min-w-0 max-w-full flex-col bg-surface-bright rounded-lg shadow-sm border border-outline-variant/20 p-3 md:p-4 desk:h-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <StepHeader n={2} title="Contributions" />
        <div className="flex flex-wrap items-start gap-2">
          <SegmentedControl
            ariaLabel="Role assignment mode"
            options={INPUT_MODE_OPTIONS}
            value={inputMode}
            onChange={setInputMode}
          />
          <Popover>
            <PopoverTrigger className="flex min-h-9 items-center gap-1.5 rounded-lg border border-outline-variant/60 px-3 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary data-[state=open]:border-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary">
              <ListChecks className="size-3.5" aria-hidden="true" />
              Bulk assign
            </PopoverTrigger>
            <PopoverContent align="end" className="grid w-72 max-w-[calc(100vw-2rem)] gap-4">
              {graded && (
                <div className="grid gap-2 text-xs font-semibold text-on-surface">
                  <span id="bulk-level">Level to assign</span>
                  <Select value={bulkLevel} onValueChange={setBulkLevel}>
                    <SelectTrigger className="w-full text-xs font-normal" aria-labelledby="bulk-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_LEVELS.map(({ key, score }) => (
                        <SelectItem key={key} value={String(score)}>
                          {translateUi(key)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* A <legend> renders unreliably inside a `display: grid` fieldset,
                  so the group is labelled by a plain heading instead. */}
              <fieldset aria-labelledby="bulk-one-contributor" className="grid gap-2">
                <p id="bulk-one-contributor" className="mb-1 text-xs font-semibold text-on-surface">
                  One contributor
                </p>
                <Select value={bulkAuthor?.id} onValueChange={setBulkAuthorId}>
                  <SelectTrigger className="w-full text-xs" aria-label="Contributor for bulk assignment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {authors.map((author) => (
                      <SelectItem key={author.id} value={author.id}>
                        {author.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <BulkButton onClick={() => setAllAuthorScores(bulkAuthor.id, assignScore)}>Assign all</BulkButton>
                  <BulkButton onClick={() => setAllAuthorScores(bulkAuthor.id, 0)}>Clear all</BulkButton>
                </div>
              </fieldset>
              <fieldset aria-labelledby="bulk-one-role" className="grid gap-2 border-t border-outline-variant/30 pt-3">
                <p id="bulk-one-role" className="mb-1 text-xs font-semibold text-on-surface">
                  One role
                </p>
                <Select value={bulkRoleIndex} onValueChange={setBulkRoleIndex}>
                  <SelectTrigger className="w-full text-xs" aria-label="Role for bulk assignment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CREDIT_ROLES.map((role, roleIndex) => (
                      <SelectItem key={role.name} value={String(roleIndex)}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <BulkButton onClick={() => setRoleScores(parsedBulkRoleIndex, assignScore)}>Assign to all</BulkButton>
                  <BulkButton onClick={() => setRoleScores(parsedBulkRoleIndex, 0)}>Clear role</BulkButton>
                </div>
              </fieldset>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger className="flex min-h-9 items-center gap-1.5 rounded-lg border border-outline-variant/60 px-3 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary data-[state=open]:border-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary">
              <Settings2 className="size-3.5" aria-hidden="true" />
              Heatmap options
            </PopoverTrigger>
            <PopoverContent align="end" className="flex w-64 flex-wrap items-center gap-3">
              <ColorPopover
                value={heatmapMonoColor}
                onChange={setHeatmapMonoColor}
                label="Grid color"
                trigger={
                  <button
                    type="button"
                    aria-label="Grid color"
                    title="Grid color"
                    className="flex min-h-9 items-center gap-1.5 rounded-lg border border-outline-variant/60 px-3 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                title="Swap the row and column axes"
                className={`flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
                  transpose
                    ? "border-primary text-primary"
                    : "border-outline-variant/60 text-on-surface-variant hover:border-primary hover:text-primary"
                }`}
              >
                Transpose
                {transpose ? <Columns3 className="h-3.5 w-3.5" /> : <Rows3 className="h-3.5 w-3.5" />}
              </button>
              <span className="flex min-h-9 items-center gap-1.5 text-xs text-on-surface-variant">
                <Switch checked={acronyms} onCheckedChange={setAcronyms} aria-label="Use contributor initials" />
                Use initials
              </span>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="md:hidden">
        <div className="sticky top-13 z-20 -mx-1 mb-2 bg-surface-bright px-1 py-2">
          <label className="mb-1.5 block text-xs font-semibold text-on-surface" htmlFor="mobile-contributor">
            Contributor to assign
          </label>
          <Select value={selectedAuthor.id} onValueChange={setSelectedAuthorId}>
            <SelectTrigger id="mobile-contributor" className="w-full" aria-label="Contributor to assign">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {authors.map((author) => (
                <SelectItem key={author.id} value={author.id}>
                  {author.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ul className="divide-y divide-outline-variant/25" aria-label={`Roles for ${selectedAuthor.name}`}>
          {CREDIT_ROLES.map((role, roleIndex) => {
            const score = selectedAuthor.contributions[roleIndex]?.score ?? 0;
            const level = translateUi(graded ? scoreToLevel(score) : score > 0 ? "contributed" : "none");
            return (
              <li key={role.name} className="flex min-h-14 items-center gap-2 py-1.5">
                <span className="flex min-w-0 flex-1 items-center gap-1">
                  <span className="text-sm font-medium text-on-surface">{role.name}</span>
                  <RoleInfo role={role} />
                </span>
                <button
                  type="button"
                  aria-pressed={score > 0}
                  aria-label={`${role.name} for ${selectedAuthor.name}: ${level}`}
                  onClick={() => handleCellClick(selectedAuthor, roleIndex, score)}
                  className={`flex min-h-11 min-w-24 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    score > 0 ? "text-white shadow-sm" : "bg-surface-container-high text-on-surface-variant"
                  }`}
                  style={
                    score > 0 ? { backgroundColor: heatCellColor(heatmapMonoColor, graded ? score : 100) } : undefined
                  }
                >
                  {score > 0 && <Check aria-hidden="true" className="size-4" strokeWidth={3} />}
                  {level}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* A bounded viewport makes both sticky axes persistent during long desktop matrices. */}
      <div
        className={`hidden max-h-[min(70vh,44rem)] max-w-full overflow-auto md:block desk:max-h-none desk:min-h-0 desk:flex-1 ${
          // Right padding lets the last angled label overhang its own column:
          // a 9.5rem label rotated 45° reaches ~107px past its own centre.
          transpose || !acronyms ? "pr-32" : ""
        }`}
      >
        <table className="w-max min-w-full table-auto border-separate border-spacing-[3px]">
          <thead>
            <tr>
              <th
                scope="col"
                className={`sticky left-0 top-0 z-40 bg-surface-bright pb-1 text-left align-bottom font-mono text-xs font-medium uppercase tracking-wider text-on-surface-variant ${
                  // Transposed with initials, the row headers are 40px chips —
                  // let the axis title size the column instead of reserving the
                  // width a full role name needs.
                  transpose && acronyms ? "" : "min-w-40 md:min-w-48"
                }`}
              >
                {transpose ? "Contributor" : "Role"}
              </th>
              {transpose
                ? CREDIT_ROLES.map((role, columnIndex) => (
                    <th
                      key={role.name}
                      scope="col"
                      // An angled label overhangs its own column to the right, so
                      // without a reversed paint order the next header's opaque
                      // background covers all but its first few characters.
                      style={{ zIndex: 20 + (CREDIT_ROLES.length - columnIndex) }}
                      className="sticky top-0 min-w-[2rem] bg-surface-bright pb-1 align-bottom"
                    >
                      <span className="flex flex-col items-center gap-1">
                        <AngledLabel text={role.name} />
                        <RoleInfo role={role} />
                      </span>
                    </th>
                  ))
                : authors.map((author, columnIndex) => (
                    <th
                      key={author.id}
                      scope="col"
                      style={{ zIndex: 20 + (authors.length - columnIndex) }}
                      className="sticky top-0 min-w-[2.75rem] bg-surface-bright pb-1 align-bottom"
                    >
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
                    <th scope="row" className="sticky left-0 z-10 bg-surface-bright py-0 text-left">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <InitialsChip author={author} />
                        {!acronyms && (
                          <span
                            className="max-w-36 truncate text-[13px] font-medium text-on-surface"
                            title={author.name}
                          >
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
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-surface-bright py-0 text-left font-medium text-[13px] text-on-surface"
                    >
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

      {/* No flex-wrap here: the export buttons stay pinned right in both modes,
          and the legend — which is longer in Levels — wraps inside its own share
          of the row instead of displacing them.
          `w-0 min-w-full` keeps this row out of the card's max-content width, so
          switching modes cannot resize the whole column to fit a longer legend. */}
      <div className="mt-2 flex w-0 min-w-full items-center justify-between gap-3">
        <GridLegend monoColor={heatmapMonoColor} graded={graded} hint={modeHint} translateUi={translateUi} />
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

function BulkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-9 rounded-lg border border-outline-variant/60 px-2 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {children}
    </button>
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
 * top axis. The label overhangs its own column, so the table wrapper pads the
 * right edge for the last one and the header cells paint in reverse order (see
 * the thead) so a neighbour's background cannot cover it.
 */
function AngledLabel({ text }: { text: string }) {
  return (
    <span className="relative block h-28 w-full">
      <span
        title={text}
        className="absolute bottom-0 left-1/2 max-w-[9.5rem] origin-bottom-left -rotate-45 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-medium text-on-surface-variant"
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
          className="touch-target flex size-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
  hint,
  translateUi,
}: {
  monoColor: string;
  graded: boolean;
  hint: string;
  translateUi: UiTranslator;
}) {
  return (
    // The label heads the legend rather than sharing its line, so the entries
    // get the full width and no longer dangle onto a second row in Levels. Both
    // modes are two lines, so switching them cannot change the row's height.
    <div className="flex min-w-0 flex-col gap-1 text-xs text-on-surface-variant">
      <span className="flex items-center gap-3">
        <span className="font-mono text-xs uppercase tracking-wider">{graded ? "Level" : "Key"}</span>
        {/* Yes/no needs no hint — the grid says it. Levels does, because the click
            cycle isn't visible. It sits here rather than beside the mode control,
            where switching modes reflowed the whole header and shifted the matrix. */}
        {graded && <span title={hint}>Click to cycle</span>}
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
      </span>
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
  const [loading, setLoading] = useState<ExportFormat | "copy" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

  function renderSvg() {
    return buildHeatmapSvg(authors, { transpose, monoColor, showLevels, acronyms, translateRole, translateUi });
  }

  function fail(err: unknown, what: string) {
    const message = err instanceof Error ? err.message : "Export failed";
    setError(message);
    announce(`Heatmap ${what} failed: ${message}`, { assertive: true });
  }

  async function download(format: ExportFormat) {
    setLoading(format);
    setError(null);
    try {
      const svg = renderSvg();
      if (format === "svg") {
        downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "credit-heatmap.svg");
      } else {
        downloadBlob(await svgToPngBlob(svg), "credit-heatmap.png");
      }
    } catch (err) {
      fail(err, "export");
    } finally {
      setLoading(null);
    }
  }

  // Copy the image bytes (not a URL) so it pastes straight into a doc or slide —
  // the same move the CRediT badge makes. PNG, because that is what editors take.
  async function copyPng() {
    setLoading("copy");
    setError(null);
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": svgToPngBlob(renderSvg()) })]);
      setCopyStatus("copied");
      announce("Heatmap PNG copied to clipboard");
    } catch (err) {
      setCopyStatus("error");
      fail(err, "copy");
    } finally {
      setLoading(null);
      setTimeout(() => setCopyStatus("idle"), 2000);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="font-mono uppercase tracking-wider text-[10px] text-on-surface-variant">Heatmap</span>
      {error && (
        <span className="text-[10px] text-error max-w-[120px] truncate" title={error}>
          {error}
        </span>
      )}
      <button
        type="button"
        disabled={loading !== null}
        onClick={() => void copyPng()}
        title="Copy the heatmap as a PNG image"
        className="flex items-center gap-1.5 px-2.5 py-1 border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary rounded-lg text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Copy className="h-3.5 w-3.5" />
        {copyStatus === "copied" ? "Copied!" : copyStatus === "error" ? "Failed" : "Copy"}
      </button>
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
