---
name: CRediT Generator
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
    backgroundColor: "{colors.ink-blue-soft}"
    textColor: "{colors.ink-blue}"
    rounded: "{rounded.md}"
    padding: "4px 8px"
---

# Design System: CRediT Generator

## Overview

**Creative North Star: "The Editorial Research Desk"**

The interface resembles a prepared working document: scholarly, compact, and quiet. Editorial type
gives manuscript output authority. The sans-serif interface keeps controls practical.

This is a workspace, not a marketing page. Its character comes from the visible flow from
contributors through the matrix to manuscript output.

## Colors

Use warm paper neutrals throughout the interface. Reserve ink blue for primary actions, links,
focus, and selected states. Use contributor colors only to identify data.

## Typography

Use Newsreader with Georgia fallback for identity, section headings, and manuscript output. Keep
manuscript prose roman and reserve italics for short accents. Use IBM Plex Sans for controls and
explanations. Use IBM Plex Mono for contributor initials and compact data labels.

## Layout

Follow the task order: contributors, contributions, then statement and export.

Use one column on small screens. From `xl`, give all three steps their own column, so the workflow
reads left to right. Never give the statement a full-width row: its prose is capped at 75ch for
readability, so a 1200px row wraps the text at half its width and leaves the rest empty. Size the
matrix column to the matrix, and let the statement absorb the space the matrix doesn't need.

Let the page use the screen it's given, up to `100rem`. A cap that holds until a late breakpoint
letterboxes the very laptops this workspace is built for.

On a desktop-sized window the workspace is height-locked to the viewport. The page itself doesn't
scroll; each pane scrolls its own content. The `desk` variant carries that rule (≥80rem wide **and**
≥45rem tall). The height guard matters: a short window, a zoomed page, or a phone in landscape falls
back to ordinary document flow instead of trapping the app in a nested scroller.

Give a pane that scrolls but holds no focusable content a tab stop, or keyboard users can't reach
its overflow.

Panels that hang off a control belong in a popover, not a hand-placed absolute box. A popover
dismisses on an outside click and on Escape, portals out of any scrolling ancestor, and reports its
open state so the control that opened it can show it.

A row whose content changes with a mode must not reflow when it does. Pin the elements that anchor
to an edge, let the variable-length part wrap inside its own share of the row, and keep a row whose
width varies out of a `max-content` column's intrinsic sizing (`w-0 min-w-full`). Otherwise flipping
a mode moves controls the visitor was about to click.

Use a contributor-focused role list on narrow screens. Keep the desktop matrix in a bounded viewport
with sticky row and column labels.

## Density

This is a working surface, not a reading one: on a standard 1080p desktop viewport the whole
workflow should be visible at once, with no page scroll. Spend vertical space on contributor rows
and matrix rows, and take it back from chrome. Prefer bounding a list that grows without limit
(contributors, validation checks) over letting it push the rest of the workflow below the fold.

First-run guidance overlays the workspace rather than sitting above it. An inline band costs the
height permanently, and reflows the whole page on dismissal.

## Elevation & Depth

Use tonal paper surfaces and fine neutral rules. Give work cards a low shadow and the generated
result a slightly stronger one.

## Shapes

Use 2–4px corners for document details and 8px corners for controls and cards. Reserve pills for
status, segmented controls, switches, and identity markers.

## Components

### Buttons

Primary buttons use ink blue with bright paper text. Secondary buttons use quiet outlines and paper
or transparent fills. Give every control visible keyboard focus and an appropriate touch target.

### Cards / Containers

Cards use bright paper, 8px corners, a fine outline, and low elevation. Use spacing or a divider
instead of nested cards.

### Inputs / Fields

Fields use bright or muted paper with quiet rules. Use a visible focus style. Keep error and
disabled text readable, and explain how to recover.

### Navigation

Keep identity and global actions in the fixed header. On narrow screens, use labeled icons without
clipping or hiding accessible names.

### Contribution Matrix

Use the matrix on larger screens and a contributor-focused role list on narrow screens. Keep role
and contributor labels visible during scrolling. Show each selected value with color, a mark, an
accessible label, and exported data. Keep bulk assignment behind a disclosure.

## Do's and Don'ts

### Do

- **Do** preserve the visible relationship between input, assignment, and output.
- **Do** use semantic tokens across light and dark themes.
- **Do** define specialist terminology at the decision point.
- **Do** budget for long names, translations, keyboards, and touch.
- **Do** keep the desktop workflow inside one viewport, and let each pane scroll its own overflow.
- **Do** ask which level a bulk action assigns. Defaulting to the strongest one overstates the claim.

### Don't

- **Don't** add ornamental gradients, glass effects, oversized marketing type, or unrelated accents.
- **Don't** use serif typography for dense controls or data labels.
- **Don't** hide core contribution functionality on small screens.
- **Don't** make color the only way to distinguish a matrix value.
- **Don't** height-lock the workspace without a viewport-height guard. A zoomed or short window
  needs ordinary document flow.
