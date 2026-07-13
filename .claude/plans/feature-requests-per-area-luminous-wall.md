# UI refinement pass — Contributors, Matrix, Heatmap, Statement

## Context

The web app's four step-cards (Contributors → Contribution Matrix → Real-time Heatmap → Author
Contribution Statement) work but carry several UI papercuts: ambiguous affordances (a selection
circle that doesn't read as one), redundant chrome (numbered step badges, author counts), controls
that don't read as toggles, and clusters of buttons that mix inputs with outputs. This pass resolves
the user's per-area feature requests while staying inside the existing visual identity (ink-blue
`#1f4e79`, Newsreader italic headings, IBM Plex Sans/Mono, colorblind-safe Okabe–Ito contributor
hues). Outcome: clearer interaction model, modern 2026-standard toggles/popovers, editable
per-author color, drag reordering, and a visible flow from contributors into the matrix.

Confirmed decisions: editable author colors (touches core), drag handle + keyboard reorder
(@dnd-kit), presets moved to a menu plus a Select/Clear-all toggle, and removal of the numbered step
badges.

## Shared primitives to add (reuse everywhere below)

Establish these once in `src/components/ui/` so the redesign composes from consistent parts:

- **`switch.tsx`** — wrap `@radix-ui/react-switch` (new dep) in the existing `cn()` + token style.
  Used for: per-role binary toggle, heatmap Transpose, statement Short, statement Show levels.
- **`segmented.tsx`** — extract the existing `InputModeSwitcher` markup (ContributionMatrix.tsx:203-225)
  into a reusable `SegmentedControl<T>` (pill group, active = white bg + shadow). Used for: matrix
  Binary/Levels, statement By author/By role, heatmap color scheme.
- **`hover-card.tsx`** (or `popover.tsx`) — wrap `@radix-ui/react-hover-card` (new dep) for role
  descriptions behind an info icon (hover + focus + tap accessible).
- **`color-popover.tsx`** — a small popover (built on the hover-card/popover primitive, trigger =
  the colored badge) showing the 8 Okabe–Ito swatches + a native `<input type="color">` for a custom
  hue + a "Reset to default" action. No color-picker dependency — native input covers it.

New dependencies: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@radix-ui/react-switch`,
`@radix-ui/react-hover-card`.

## Core changes — editable color (`packages/core/`)

Color is currently derived from list position everywhere. Make it overridable and thread it through:

- **`author.ts`** — add optional `color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()` to
  `AuthorSchema`. Update `createAuthor` to accept/preserve `color`.
- **`contributor-color.ts`** — add `authorColor(author, index)` → `author.color ?? contributorColor(index)`.
  Change `heatCellColor(mode, baseColor, score)` to take a **resolved base hex** instead of an index
  (caller passes `authorColor(...)` for by-author, the chosen mono hex for monochrome, black for
  grayscale). Update `src/lib/contributor-color.ts`: add an ink variant that darkens any custom hue
  for legible byline text (generalize `contributorInkColor` to take a hex).
- **`export/heatmap-svg.ts`** — resolve fills/legend swatches via `authorColor(author, index)` and the
  new `heatCellColor` signature so SVG/PNG exports honor custom colors and the mono hue.
- Verify `normalizeAuthors`/`updateAuthorName` in the store rebuild authors **without dropping
  `color`** (they currently re-create via `createAuthor` passing only id/orcid/contributions — add
  `color`). Same for any author rebuild in `share.ts`/xml import if present (color in share links is
  optional/nice-to-have, not required for this pass).

## Store changes (`src/store/contribution-store.ts`)

- Add `setAuthorColor(authorId, color | null)` action (null = clear override). `partialize` already
  persists `authors`, so color persists for free.
- Add `heatmapMonoColor: string` (default `#1f4e79`) + `setHeatmapMonoColor`, persisted, for the
  custom monochrome hue.

---

## Area 1 — Contributors (`src/components/steps/AuthorInput.tsx`)

Holistic row redesign; addresses all six requests.

- **Remove the ambiguous selection circle.** The colored initials **badge moves to the left** and
  *becomes* the selection control (`aria-pressed`, keyboard-focusable). Selected state = ring in the
  author's hue + left accent bar on the row + existing "Editing" pill. This gives the left element a
  real, legible job (it picks whose roles the matrix edits) instead of implying dead interactivity.
- **Drag handle.** Add a grip icon (`GripVertical`) at the far left via `@dnd-kit/sortable`
  (`useSortable` per row, `SortableContext` around the list, `DndContext` with keyboard + pointer
  sensors). On drag end call the existing `moveAuthor(fromIndex, toIndex)`. **Remove the up/down
  chevron buttons** (handle + keyboard replace them).
- **Editable color.** Clicking the badge (or a small pencil affordance on hover) opens
  `color-popover.tsx` → `setAuthorColor`. Swatches + native picker + reset.
- **Align trash with the badge.** Drop the column of chevrons; with the badge on the left and a
  vertically-centered row, place the `Trash2` on the right `items-center` aligned to the badge row.
- **Remove the "1" step badge** (drop `StepBadge` from the heading).
- **Remove the "2 authors" count** in the header (delete the `{authors.length} author…` span).

## Connector — Contributors → Matrix (`src/app/page.tsx`)

Between `<AuthorList />` and `<RoleAssignment />` in the left section, add a small **flow connector**:
a thin vertical line + downward chevron, tinted with the *selected author's* hue, with a tiny label
("Editing {name}"). Reinforce the link by showing the selected author's **colored badge in the matrix
header** ("Assign CRediT roles for [badge] Jane Smith"). Keep it subtle (single quiet element).

## Area 2 — Contribution Matrix (`src/components/steps/ContributionMatrix.tsx`)

- **Remove the "2" step badge** from the heading.
- **Collapse role descriptions.** Replace the always-visible `line-clamp-2` description with an
  **info icon** (`Info`) next to the role name that opens the description in the new hover-card
  (hover/focus/tap). Default view shows just the role name → much denser grid.
- **Fix/clarify binary mode.** Replace the subtle custom pill (lines 160-176) with the new `Switch`
  primitive, clearly labelled on/off per role. (Confirm the toggle actually mutates state — it calls
  `toggleContribution`; verify by running, since the user reports it "doesn't seem to work" — likely
  a perception issue from the low-contrast pill, fixed by the clearer Switch.)
- **Unify the level control.** The top-right level label becomes **mode-aware**:
  - Binary mode → **hide** the level label entirely (the Switch is the only control).
  - Levels mode → the top-right label *is* the editable dropdown (move the `Select` up into the
    badge slot; remove the separate control row). One control per role card.
- **Presets → menu + bulk toggle.** Add a prominent **"Select all / Clear all"** toggle button
  (calls `applyPreset('equal-contribution')` / a clear-all that zeroes scores — add a small
  `clearAll`/reuse score setting). Tuck the three named presets (Equal / Senior author / Data-only)
  into a small dropdown menu (a `Select`-styled "Apply preset…" menu). Keep the existing
  overwrite-confirmation dialog.

## Area 3 — Real-time Heatmap (`ContributionHeatmap` / `HeatmapExportButtons`)

Split the control bar into a clearly separated **inputs** group and **outputs** group (a thin
vertical divider between them):

- **Inputs (left):**
  - **Color scheme** → `SegmentedControl` of three options, each with a mini swatch (by-author =
    multi-hue dots, monochrome = single hue dot, grayscale = gray dot), replacing the dropdown.
  - When **monochrome** is active, show a color swatch button (reuse `color-popover.tsx`) bound to
    `heatmapMonoColor` so the mono hue is choosable; thread it into `heatCellColor`/`buildHeatmapSvg`.
  - **Transpose** → the new `Switch` with a clear label ("Transpose axes"), replacing the
    border-toggle button.
- **Outputs (right):** **Download SVG** and **Download PNG** restyled to match the statement's export
  buttons (bordered, icon + label: `Download`), keeping the existing `buildHeatmapSvg` / `svgToPngBlob`
  logic and loading/error states.

## Area 4 — Author Contribution Statement (`src/components/steps/StatementOutput.tsx`)

- **Remove the "3" step badge** from the heading.
- **By author / By role → `SegmentedControl`** (2-way toggle) replacing the three pill buttons.
- **Short → `Switch`.** Separate toggle; combine with the segmented format: `by-author` + Short on →
  `by-author-short`. Short is **disabled/greyed when "By role"** is selected (core ignores short for
  by-role per `generate-statement.ts`).
- **Show levels → `Switch`** (convert the checkbox for consistency with Short).
- **Divider** — add a subtle `<hr className="border-t border-outline-variant/20" />` between the
  statement+validation block and the "Export data" section.

---

## Verification

1. `pnpm --filter @credit-generator/core test` — core color/heatmap-svg tests still pass after the
   `heatCellColor` signature change and `color` field (update the existing
   `heatmap-svg.test.ts` if it asserts fills).
2. `pnpm build` (or `pnpm typecheck`) — clean across core + web after the dependency adds.
3. `pnpm dev` and manually walk each area:
   - Contributors: drag to reorder (mouse + keyboard), edit a color via the badge popover and confirm
     it propagates to badge, heatmap (live), SVG/PNG export, and the statement byline; trash aligns
     with badge; no circle, no count, no "1".
   - Matrix: info popover shows role description; **binary mode toggles a role on/off and the heatmap
     updates**; levels mode edits via the top-right dropdown only; Select all / Clear all + preset
     menu work with the overwrite dialog; no "2".
   - Heatmap: inputs vs outputs visually separated; color-scheme segmented control + monochrome custom
     color; transpose switch; SVG/PNG download in the new button style.
   - Statement: By author/role segmented toggle; Short switch (disabled under By role); Show levels
     switch; divider before Export data; no "3".
4. `pnpm lint` / biome — keep a11y lints green (drag handle, switches, popovers all keyboard-reachable;
   reduced-motion respected for dnd + the connector).

## Critical files

- `src/components/steps/AuthorInput.tsx` — contributor row redesign, drag, color, badge selector.
- `src/components/steps/ContributionMatrix.tsx` — matrix (descriptions, binary/levels, presets) +
  heatmap (input/output split, color scheme, transpose, exports).
- `src/components/steps/StatementOutput.tsx` — format toggle, Short/Show-levels switches, divider.
- `src/app/page.tsx` — connector between Contributors and Matrix.
- `src/store/contribution-store.ts` — `setAuthorColor`, `heatmapMonoColor`, color-preserving rebuilds.
- `packages/core/src/author.ts`, `contributor-color.ts`, `export/heatmap-svg.ts` — `color` field,
  `authorColor`, `heatCellColor(mode, baseColor, score)`.
- `src/lib/contributor-color.ts` — custom-hue ink helper.
- New: `src/components/ui/switch.tsx`, `segmented.tsx`, `hover-card.tsx`, `color-popover.tsx`.
