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

Follow the task order: contributors, contributions, then statement and export. Use one column on
small screens. At `xl`, place the first two steps side by side and span the statement below them.
Use a contributor-focused role list on narrow screens. Keep the desktop matrix in a bounded viewport
with sticky row and column labels.

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

### Don't

- **Don't** add ornamental gradients, glass effects, oversized marketing type, or unrelated accents.
- **Don't** use serif typography for dense controls or data labels.
- **Don't** hide core contribution functionality on small screens.
- **Don't** make color the only way to distinguish a matrix value.
