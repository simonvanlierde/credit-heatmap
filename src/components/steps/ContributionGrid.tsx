"use client";

import {
  type Author,
  buildHeatmapSvg,
  CREDIT_ROLES,
  heatCellColor,
  onColor,
  type RoleDescriber,
  type RoleTranslator,
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
import { useTranslations } from "use-intl";
import { ColorPopover } from "@/components/ui/color-popover";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SegmentedControl } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StepHeader } from "@/components/ui/step-header";
import { Switch } from "@/components/ui/switch";
import { announce } from "@/lib/announce";
import { useCopyStatus } from "@/lib/use-copy-status";
import { useCreditTranslators } from "@/lib/use-credit-translators";
import { useSettled } from "@/lib/use-settled";
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

/**
 * The contribution matrix as one editable grid: roles as rows, contributors as
 * columns (or transposed), every cell a toggle. This doubles as the live
 * heatmap: cell fills use the same color scale as the downloadable SVG/PNG.
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
  const { translateRole, translateUi, describeRole } = useCreditTranslators();
  const t = useTranslations();
  // Second beat of the population sequence; see .enter-fade in globals.css.
  const settled = useSettled();
  const [acronyms, setAcronyms] = useState(true);
  const [selectedAuthorId, setSelectedAuthorId] = useState("");
  const [bulkAuthorId, setBulkAuthorId] = useState("");
  const [transpose, setTranspose] = useState(false);
  const [bulkRoleIndex, setBulkRoleIndex] = useState("0");
  const [bulkLevel, setBulkLevel] = useState(String(DEFAULT_BULK_LEVEL));
  // The single tab stop in the matrix; arrow keys move it. Reset when the
  // orientation flips, since row/col swap meaning.
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 });

  // Graded (level) colors and labels follow the input mode, so the legend and
  // cells always match the way clicks behave.
  const graded = inputMode === "levels";
  const inputModeOptions: { value: InputMode; label: string }[] = [
    { value: "toggle", label: t("modeYesNo") },
    { value: "levels", label: t("modeLevels") },
  ];

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
        <StepHeader n={2} title={t("stepContributions")} className="mb-3" />
        {welcomeOpen ? (
          <p className="text-sm text-on-surface-variant">
            Add a contributor and this grid fills with the 14 CRediT roles.
          </p>
        ) : (
          <div className="rounded-lg border border-dashed border-outline-variant/40 bg-surface-container-low/40 p-6 text-center">
            <UserPlus className="h-8 w-8 text-outline-variant mb-2 mx-auto" />
            <p className="text-sm text-on-surface-variant">{t("gridEmptyHint")}</p>
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

  // Grid extent, in the current orientation: transposed puts contributors on
  // rows and roles on columns, otherwise the reverse.
  const rowCount = transpose ? authors.length : CREDIT_ROLES.length;
  const colCount = transpose ? CREDIT_ROLES.length : authors.length;
  // Clamp at render rather than resetting in an effect, so flipping the
  // orientation or removing a contributor can never leave the only tab stop
  // pointing at a cell that no longer exists.
  const active = {
    row: Math.min(activeCell.row, Math.max(0, rowCount - 1)),
    col: Math.min(activeCell.col, Math.max(0, colCount - 1)),
  };

  function handleCellKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, row: number, col: number) {
    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    let next: { row: number; col: number } | null = null;
    const delta = moves[event.key];
    if (delta) next = { row: row + delta[0], col: col + delta[1] };
    else if (event.key === "Home") next = { row, col: 0 };
    else if (event.key === "End") next = { row, col: colCount - 1 };
    if (!next) return;

    // Clamp rather than wrap: running off the edge should stop, not jump to
    // the far side of a 200-column matrix.
    next.row = Math.max(0, Math.min(next.row, rowCount - 1));
    next.col = Math.max(0, Math.min(next.col, colCount - 1));
    if (next.row === row && next.col === col) return;

    event.preventDefault();
    setActiveCell(next);
    const target = event.currentTarget
      .closest("table")
      ?.querySelector<HTMLButtonElement>(`[data-cell="${next.row}-${next.col}"]`);
    target?.focus();
  }

  const renderCell = (author: Author, roleIndex: number, row: number, col: number) => {
    const role = CREDIT_ROLES[roleIndex];
    const score = author.contributions[roleIndex]?.score ?? 0;
    const level = translateUi(graded ? scoreToLevel(score) : score > 0 ? "contributed" : "none");
    const fill = score > 0 ? heatCellColor(heatmapMonoColor, graded ? score : 100) : null;
    return (
      <td key={`${author.id}-${role?.name}`} className="min-w-11 p-0">
        <button
          type="button"
          data-cell={`${row}-${col}`}
          // One tab stop for the whole matrix; arrows move within it. Without
          // this a keyboard user tabs through every cell, up to 14 x 200.
          tabIndex={row === active.row && col === active.col ? 0 : -1}
          onFocus={() => setActiveCell({ row, col })}
          onKeyDown={(event) => handleCellKeyDown(event, row, col)}
          aria-pressed={score > 0}
          aria-label={`${role?.name} for ${author.name}: ${level}`}
          title={`${role?.name} for ${author.name}: ${level}`}
          onClick={() => handleCellClick(author, roleIndex, score)}
          // The fill transitions, and deliberately nothing moves: in Levels mode
          // a click's only result is the shade stepping up, and at this cadence
          // (hundreds a session, in a 3px-gapped grid) a press scale would read
          // as the matrix twitching rather than as feedback.
          className="contribution-cell flex h-7 w-full items-center justify-center rounded transition-[background-color,box-shadow] duration-[120ms] ease-[var(--ease-out)] hover:ring-2 hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ backgroundColor: fill ?? "var(--color-surface-container-high)" }}
        >
          {fill && (
            // The check is the state indicator, so it must clear 3:1 against
            // the fill it sits on (WCAG 1.4.11). Hardcoded white failed that on
            // every pale fill; at the default hue's "supporting" level, and at
            // every level of the lighter presets. onColor measures instead.
            <Check aria-hidden="true" className="size-3.5" style={{ color: onColor(fill) }} strokeWidth={3} />
          )}
        </button>
      </td>
    );
  };

  return (
    <div className="flex min-w-0 max-w-full flex-col bg-surface-bright rounded-lg shadow-sm border border-outline-variant/20 p-3 md:p-4 desk:h-full desk:overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <StepHeader n={2} title={t("stepContributions")} />
        <div className="flex flex-wrap items-start gap-2">
          <SegmentedControl
            ariaLabel={t("assignmentMode")}
            options={inputModeOptions}
            value={inputMode}
            onChange={setInputMode}
          />
          <Popover>
            <PopoverTrigger className="flex min-h-9 items-center gap-1.5 rounded-lg border border-outline-variant/60 px-3 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary data-[state=open]:border-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary">
              <ListChecks className="size-3.5" aria-hidden="true" />
              {t("bulkAssign")}
            </PopoverTrigger>
            <PopoverContent align="end" className="grid w-72 max-w-[calc(100vw-2rem)] gap-4">
              {graded && (
                <div className="grid gap-2 text-xs font-semibold text-on-surface">
                  <span id="bulk-level">{t("bulkAssignLevel")}</span>
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
                  {t("bulkOneContributor")}
                </p>
                <Select value={bulkAuthor?.id} onValueChange={setBulkAuthorId}>
                  <SelectTrigger className="w-full text-xs" aria-label={t("a11yBulkContributor")}>
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
                  <BulkButton onClick={() => setAllAuthorScores(bulkAuthor.id, assignScore)}>
                    {t("bulkAssignAll")}
                  </BulkButton>
                  <BulkButton onClick={() => setAllAuthorScores(bulkAuthor.id, 0)}>{t("bulkClearAll")}</BulkButton>
                </div>
              </fieldset>
              <fieldset aria-labelledby="bulk-one-role" className="grid gap-2 border-t border-outline-variant/30 pt-3">
                <p id="bulk-one-role" className="mb-1 text-xs font-semibold text-on-surface">
                  {t("bulkOneRole")}
                </p>
                <Select value={bulkRoleIndex} onValueChange={setBulkRoleIndex}>
                  <SelectTrigger className="w-full text-xs" aria-label={t("a11yBulkRole")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CREDIT_ROLES.map((role, roleIndex) => (
                      <SelectItem key={role.name} value={String(roleIndex)}>
                        {translateRole(role.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <BulkButton onClick={() => setRoleScores(parsedBulkRoleIndex, assignScore)}>
                    {t("bulkAssignToAll")}
                  </BulkButton>
                  <BulkButton onClick={() => setRoleScores(parsedBulkRoleIndex, 0)}>{t("bulkClearRole")}</BulkButton>
                </div>
              </fieldset>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger className="flex min-h-9 items-center gap-1.5 rounded-lg border border-outline-variant/60 px-3 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary data-[state=open]:border-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary">
              <Settings2 className="size-3.5" aria-hidden="true" />
              {t("heatmapOptions")}
            </PopoverTrigger>
            <PopoverContent align="end" className="flex w-64 flex-wrap items-center gap-3">
              <ColorPopover
                value={heatmapMonoColor}
                onChange={setHeatmapMonoColor}
                label={t("gridColor")}
                trigger={
                  <button
                    type="button"
                    aria-label={t("gridColor")}
                    title={t("gridColor")}
                    className="flex min-h-9 items-center gap-1.5 rounded-lg border border-outline-variant/60 px-3 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {t("colorLabel")}
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
                title={t("transposeHint")}
                className={`flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
                  transpose
                    ? "border-primary text-primary"
                    : "border-outline-variant/60 text-on-surface-variant hover:border-primary hover:text-primary"
                }`}
              >
                {t("transpose")}
                {transpose ? <Columns3 className="h-3.5 w-3.5" /> : <Rows3 className="h-3.5 w-3.5" />}
              </button>
              <span className="flex min-h-9 items-center gap-1.5 text-xs text-on-surface-variant">
                <Switch checked={acronyms} onCheckedChange={setAcronyms} aria-label={t("useContributorInitials")} />
                {t("useInitials")}
              </span>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className={`md:hidden ${settled ? "enter-fade" : ""}`} style={{ transitionDelay: "120ms" }}>
        <div className="sticky top-13 z-20 -mx-1 mb-2 bg-surface-bright px-1 py-2">
          <label className="mb-1.5 block text-xs font-semibold text-on-surface" htmlFor="mobile-contributor">
            {t("contributorToAssign")}
          </label>
          <Select value={selectedAuthor.id} onValueChange={setSelectedAuthorId}>
            <SelectTrigger id="mobile-contributor" className="w-full" aria-label={t("contributorToAssign")}>
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
                  <span className="text-sm font-medium text-on-surface">{translateRole(role.name)}</span>
                  <RoleInfo role={role} translateRole={translateRole} describeRole={describeRole} />
                </span>
                <button
                  type="button"
                  aria-pressed={score > 0}
                  aria-label={`${role.name} for ${selectedAuthor.name}: ${level}`}
                  onClick={() => handleCellClick(selectedAuthor, roleIndex, score)}
                  className={`contribution-cell flex min-h-11 min-w-24 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-[background-color,box-shadow] duration-[120ms] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
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
        style={{ transitionDelay: "120ms" }}
        className={`hidden max-h-[min(70vh,44rem)] max-w-full overflow-auto md:block desk:max-h-none desk:min-h-0 desk:flex-1 ${
          settled ? "enter-fade " : ""
        }${
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
                  // Transposed with initials, the row headers are 40px chips,
                  // let the axis title size the column instead of reserving the
                  // width a full role name needs.
                  transpose && acronyms ? "" : "min-w-40 md:min-w-48"
                }`}
              >
                {transpose ? t("contributorColumn") : t("roleColumn")}
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
                        <RoleInfo role={role} translateRole={translateRole} describeRole={describeRole} />
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
              ? authors.map((author, authorRow) => (
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
                    {CREDIT_ROLES.map((_, roleIndex) => renderCell(author, roleIndex, authorRow, roleIndex))}
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
                        <RoleInfo role={role} translateRole={translateRole} describeRole={describeRole} />
                      </span>
                    </th>
                    {authors.map((author, authorCol) => renderCell(author, roleIndex, roleIndex, authorCol))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* No flex-wrap here: the export buttons stay pinned right in both modes,
          and the legend (which is longer in Levels) wraps inside its own share
          of the row instead of displacing them.
          `w-0 min-w-full` keeps this row out of the card's max-content width, so
          switching modes cannot resize the whole column to fit a longer legend. */}
      <div className="mt-2 flex w-0 min-w-full items-center justify-between gap-3">
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
 * from the column's bottom center, the same style as the downloaded heatmap's
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
function RoleInfo({
  role,
  translateRole,
  describeRole,
}: {
  role: (typeof CREDIT_ROLES)[number];
  translateRole: RoleTranslator;
  describeRole: RoleDescriber;
}) {
  const t = useTranslations();
  // The name follows the output language (it must match the statement); the
  // description follows the interface language (it is help, never exported).
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("aboutRole", { role: translateRole(role.name) })}
          className="touch-target flex size-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs text-xs leading-relaxed text-on-surface-variant">
        <strong className="text-on-surface">{translateRole(role.name)}.</strong> {describeRole(role.name)}{" "}
        <a
          href={role.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-primary hover:underline whitespace-nowrap"
        >
          {t("fullDefinition")}
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          <span className="sr-only">{t("opensInNewTab")}</span>
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
  const t = useTranslations();
  return (
    // The label heads the legend rather than sharing its line, so the entries
    // get the full width and no longer dangle onto a second row in Levels. Both
    // modes are two lines, so switching them cannot change the row's height.
    <div className="flex min-w-0 flex-col gap-1 text-xs text-on-surface-variant">
      <span className="flex items-center gap-3">
        <span className="font-mono text-xs uppercase tracking-wider">{graded ? t("legendLevel") : t("legendKey")}</span>
        {/* Yes/no needs no hint: the grid says it. Levels does, because the click
            cycle isn't visible. It sits here rather than beside the mode control,
            where switching modes reflowed the whole header and shifted the matrix. */}
        {graded && <span>{t("clickToCycle")}</span>}
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
  const { translateRole, translateUi } = useCreditTranslators();
  const t = useTranslations();
  const [loading, setLoading] = useState<ExportFormat | "copy" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, copy] = useCopyStatus({
    copied: t("annHeatmapCopied"),
    error: "Heatmap copy failed",
  });

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

  // Copy the image bytes (not a URL) so it pastes straight into a doc or slide,
  // the same move the CRediT badge makes. PNG, because that is what editors take.
  async function copyPng() {
    setLoading("copy");
    setError(null);
    try {
      // useCopyStatus owns the status, the announce and the 2s reset; this only
      // supplies the clipboard write and the inline error text.
      await copy(async () => {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": svgToPngBlob(renderSvg()) })]);
      });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="font-mono uppercase tracking-wider text-[10px] text-on-surface-variant">
        {t("heatmapLabel")}
      </span>
      {error && (
        <span className="text-[10px] text-error max-w-[120px] truncate" title={error}>
          {error}
        </span>
      )}
      <button
        type="button"
        disabled={loading !== null}
        onClick={() => void copyPng()}
        title={t("copyHeatmapHint")}
        className="flex items-center gap-1.5 px-2.5 py-1 border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary rounded-lg text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Copy className="h-3.5 w-3.5" />
        {copyStatus === "copied" ? t("copied") : copyStatus === "error" ? t("copyFailed") : t("copy")}
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
