# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.2.0]: https://github.com/simonvanlierde/credit-heatmap/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/simonvanlierde/credit-heatmap/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/simonvanlierde/credit-heatmap/releases/tag/v0.1.0
