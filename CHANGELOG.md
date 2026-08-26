# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Offline support: a service worker caches the app's own files, so a draft survives a lost
  connection, and a web app manifest makes it installable. The ORCID lookup is the one path that
  still needs a network, and now says so.

## [0.3.0] - 2026-08-26

### Added

- Bulk assignment: set or clear every role for one contributor, or one role across every
  contributor, from a popover in the contribution step.
- Undo for a removed contributor, and an explicit "Clear local draft" action with a confirmation.
- Rate limiting and stricter input validation on the `/api/orcid` proxy.
- End-to-end coverage of the critical workflows, and release verification in CI. The whole
  Playwright suite now runs on every pull request; it previously ran only the accessibility scans,
  so a regression in import, undo, ORCID lookup, persistence, or export could merge green.
- `PRODUCT.md` and `DESIGN.md`, documenting the product brief and the design system.
- Arrow-key navigation in the contribution grid: the matrix is one tab stop, and Arrow, Home, and
  End move between cells, so crossing it no longer takes a tab press per cell.

### Changed

- The desktop workspace fits one viewport: the page no longer scrolls, and each of the three panes
  scrolls its own content. Short, zoomed, and narrow windows keep ordinary document flow.
- First-run guidance is a modal over the workspace instead of a band above it, so dismissing it no
  longer reflows the page.
- Heatmap controls (color, transpose, initials) moved into a popover beside the grid.
- The Content-Security-Policy now restricts scripts, connections, and form submissions. It
  previously set only `base-uri`, `frame-ancestors`, and `object-src`, which left everything else
  unrestricted.
- The ORCID proxy checks its rate limit before reading the request body, and gives up on an
  unresponsive upstream after five seconds instead of holding the request open.

### Fixed

- An ORCID iD attached to a contributor gets its own line, instead of pushing the contributor row
  onto a second line.
- Responsive and accessibility fixes across the contributor row, grid, and export controls.
- Hardened contributor data handling in `core`, and the lookup and response boundaries of the
  ORCID proxy.
- A multi-word surname survives a JATS round trip. Exporting and re-importing "van der Berg, Anne"
  returned middle name "van" with surname "Berg", which also changed the generated initials.
- The check mark in an assigned grid cell picks its color by measured contrast, so it stays legible
  on light grid colors. On several palette choices it was previously white on a pale fill.
- Keyboard focus survives removing a contributor, clearing the draft, and removing an ORCID iD.
  Each of those unmounted the button being pressed, dropping focus to the top of the page.
- Screen readers announce the contributor list as a list, with a count and a position per row.
- The statement and export controls stay reachable on short desktop windows, at high zoom, and with
  a larger minimum font size, instead of being clipped with no way to scroll to them.
- A share link carrying an unusable contributor shows an error and keeps the current draft, rather
  than failing to render the page.
- Editing one contributor's name is no longer overwritten when another contributor's ORCID lookup
  finishes.
- Drafts saved before the 500-character name limit keep working; over-long names are trimmed on
  load instead of breaking every later edit.
- Pasting an ORCID iD with a bad check digit says so, instead of reporting it as a name with no
  letters. At the 200-contributor limit, adding one more explains the limit.
- Correcting an ORCID iD after a checksum error and clicking away now saves the correction.

## [0.2.0] - 2026-07-14

### Added

- Editable contribution grid: roles and contributors in one matrix, where a click
  assigns a role or cycles its level. It doubles as the live heatmap, and its
  transpose, full-name, and color controls carry through to the SVG/PNG downloads.
- Bulk contributor entry: paste an author list (commas, newlines, semicolons, or
  ORCID iDs) and each name gets a row. Inverted names (`Smith, J. A.`) stay whole.
- First-run welcome card, re-openable from the header, and numbered step headings.
- Contribution levels in by-role statements, annotating contributors the way
  by-author statements already annotated roles.
- A link to each role's full NISO definition in its info popover.

### Changed

- The workspace fits one desktop screen: contributors beside the grid, statement
  full-width below.
- Exported heatmaps drop the baked-in image title and fit their label bands to
  their content.
- The About popover carries the version and source link; the header nav is down
  to two items.
- Copying an export format confirms on its own button.

### Fixed

- Comma-separated lists are split per line rather than per comma, so a name with
  multiple initials or a compound given name survives a paste intact.
- An entry with no name in it no longer aborts the rest of a pasted list; it is
  skipped and reported.

### Removed

- `@nivo/heatmap`, and the per-author role checklist beside it. The grid is a
  plain table, so cells are keyboard-reachable rather than an `aria-hidden` SVG.

Persisted local drafts migrate automatically.

## [0.1.1] - 2026-07-06

### Added

- Accessibility pass over the UI: skip link, page heading and landmark regions,
  keyboard-operable segmented controls, keyboard drag-to-reorder, and a live
  region announcing copy, ORCID-lookup, and import status.
- axe-core accessibility scans of the main screens in the Playwright suite.
- `CITATION.cff`, a `CONTRIBUTING.md` guide, and the first architecture decision
  record (`docs/adr`).
- Zenodo archival with a citable DOI ([10.5281/zenodo.21213659](https://doi.org/10.5281/zenodo.21213659)).

### Fixed

- Domain-logic bugs in author parsing, export, and validation.
- Hardened client-side runtime paths.

### Changed

- Pinned `@types/node` to the Node 26 runtime and declared an `engines` field.
- Dropped unused dependencies, dead exports, and speculative code.

## [0.1.0] - 2026-06-29

### Added

- Initial release: client-side CRediT contribution-statement generator with a
  contribution heatmap, JATS4R XML / CSV / JSON / Markdown exports, ORCID lookup,
  share links, and a framework-agnostic `@credit-generator/core` domain package.

[Unreleased]: https://github.com/simonvanlierde/credit-heatmap/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/simonvanlierde/credit-heatmap/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/simonvanlierde/credit-heatmap/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/simonvanlierde/credit-heatmap/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/simonvanlierde/credit-heatmap/releases/tag/v0.1.0
