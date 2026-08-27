---
# Mirrors the tokens defined in src/app/globals.css, which is the source of
# truth for anything the app renders. Change a value there first, then here.
name: CRediT Matrix
description: A precise editorial workspace for scholarly contribution statements.
colors:
  ink-blue: "#1f4e79"
  ink-blue-soft: "#d6e2ee"
  paper: "#fafaf9"
  paper-bright: "#ffffff"
  paper-muted: "#f4f4f2"
  graphite: "#16181c"
  graphite-muted: "#595c63"
  rule: "#c9c9c5"
  error: "#ba1a1a"
typography:
  headline:
    fontFamily: "Newsreader, Georgia, serif"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.08em"
  micro:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
  caption:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
  data:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
rounded:
  sm: "2px"
  md: "4px"
  lg: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink-blue}"
    textColor: "{colors.paper-bright}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  card:
    backgroundColor: "{colors.paper-bright}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.lg}"
    padding: "16px"
  contributor-chip:
    # A 10% tint of ink-blue rather than the flat ink-blue-soft token, so the
    # chip keeps its relationship to the chosen grid color. Height is fixed and
    # the glyph is centred, so only the inline padding is specified.
    backgroundColor: "{colors.ink-blue} @ 10%"
    textColor: "{colors.ink-blue}"
    rounded: "{rounded.md}"
    padding: "0 6px"
---

# Design System: CRediT Matrix

## Overview

The interface resembles a prepared working document: scholarly, compact, and quiet. Editorial type
gives manuscript output authority, and the sans-serif interface keeps controls practical.

This is a workspace, not a marketing page. Its character comes from the visible flow from
contributors, through the matrix, to manuscript output.

## Colors

Use warm paper neutrals throughout the interface. Reserve ink blue for primary actions, links,
focus, and selected states. Use contributor colors only to identify data.

## Typography

Use Newsreader with Georgia fallback for identity, section headings, and manuscript output. Keep
manuscript prose roman and reserve italics for short accents. Use IBM Plex Sans for controls and
explanations. Use IBM Plex Mono for contributor initials and compact data labels.

## Brand

The mark is a 3×3 crop of the contribution matrix, lead on the diagonal. It is drawn on a 32px
grid with 8px cells and 1px gaps. Its fills are the heatmap's real intensity tiers, not decorative
tints, so the mark and the product's data speak the same language.

Use the mark in `currentColor` wherever it sits beside text (the header lockup does), and with
literal ink-blue tiers wherever it stands alone. The lockup is the mark at cap height, then a gap,
then the wordmark in Newsreader italic. Never letterspace or recolor the wordmark away from the
primary token, and never set the mark and the wordmark in different colors.

`docs/brand/` holds the sources for the exported PNG assets and the command that re-renders them.

## Layout

Follow the task order: contributors, contributions, then statement and export.

Use one column on small screens. From `xl`, give all three steps their own column, so the workflow
reads left to right. Never give the statement a full-width row. Its prose is capped at 75ch, so a
wide column wraps the text at half its width and leaves the rest empty. Clamp the statement column
instead, and let the matrix absorb the leftover width: it is the pane that grows with more
contributors, and every column it gains is one less it has to scroll.

Let the page use the screen it's given, up to `100rem`. A cap that holds until a late breakpoint
letterboxes the laptops this workspace is built for.

On a desktop-sized window the workspace is height-locked to the viewport. The page itself doesn't
scroll; each pane scrolls its own content.

Height-lock only behind both halves of the `desk` guard: ≥80rem wide **and** ≥45rem tall. Without
the height half, a short window, a zoomed page, or a phone in landscape traps the app in a nested
scroller. Those windows need ordinary document flow.

Give a pane that scrolls but holds no focusable content a tab stop, or keyboard users can't reach
its overflow.

A panel anchored to a control belongs in a popover, not a hand-placed absolute box. A popover
dismisses on an outside click and on Escape, and portals out of any scrolling ancestor. It also
reports its open state, so the control that opened it can show that state.

A row whose content changes with a mode must not reflow when it does. Otherwise flipping the mode
moves controls the visitor was about to click. Pin the elements that anchor to an edge. Let the
variable-length part wrap inside its own share of the row. Keep a row of varying width out of a
`max-content` column's intrinsic sizing, with `w-0 min-w-full`.

Use a contributor-focused role list on narrow screens. Keep the desktop matrix in a bounded viewport
with sticky row and column labels.

## Density

This is a working surface, not a reading one. On a standard 1080p desktop viewport the whole
workflow should be visible at once, with no page scroll. Spend vertical space on contributor rows
and matrix rows, and take it back from chrome. Bound a list that grows without limit (contributors,
validation checks) rather than letting it push the workflow below the fold.

First-run guidance overlays the workspace rather than taking a band in the layout flow. An inline
band costs that height permanently, and reflows the whole page when dismissed.

## Elevation and depth

Use tonal paper surfaces and fine neutral rules. Give work cards a low shadow and the generated
result a slightly stronger one.

## Shapes

Use 2–4px corners for document details and 8px corners for controls and cards. Reserve pills for
status, segmented controls, switches, and identity markers.

## Components

### Buttons

Primary buttons use ink blue with bright paper text. Secondary buttons use quiet outlines and paper
or transparent fills. Give every control visible keyboard focus and an adequate tap target.

### Cards and containers

Cards use bright paper, 8px corners, a fine outline, and low elevation. Use spacing or a divider
instead of nested cards.

### Inputs and fields

Fields use bright or muted paper with quiet rules. Use a visible focus style. Keep error and
inactive text readable, and explain how to recover.

### Navigation

Keep identity and global actions in the fixed header. On narrow screens, use labeled icons without
clipping or hiding accessible names.

### Contribution matrix

Use the matrix on larger screens and a contributor-focused role list on narrow screens. Keep role
and contributor labels visible during scrolling. Show each selected value with color, a mark, an
accessible label, and exported data. Keep bulk assignment behind a disclosure.

## Do and don't

### Do

- **Do** preserve the visible relationship between input, assignment, and output.
- **Do** use semantic tokens across light and dark themes.
- **Do** define specialist terminology at the decision point.
- **Do** budget for long names, translations, keyboards, and tap targets.
- **Do** keep the desktop workflow inside one viewport, and let each pane scroll its own overflow.
- **Do** ask which level a bulk action assigns. Defaulting to the strongest one overstates the
  claim.

### Don't

- **Don't** add ornamental gradients, glass effects, oversized marketing type, or unrelated accents.
- **Don't** use serif typography for dense controls or data labels.
- **Don't** hide core contribution features on small screens.
- **Don't** make color the only way to distinguish a matrix value.
- **Don't** height-lock the workspace without a viewport-height guard. A zoomed or short window
  needs ordinary document flow.
