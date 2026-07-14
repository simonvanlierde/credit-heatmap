# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-07-14

### Added

- Editable contribution grid: roles and contributors in one matrix, where a click
  assigns a role or cycles its contribution level in place. It doubles as the live
  heatmap, and its transpose, full-name, and color controls carry through to the
  SVG and PNG downloads.
- First-run welcome card with a three-step walkthrough, re-openable from the
  header, plus numbered step headings across the workspace.
- Bulk contributor entry: paste an author list (commas, newlines, semicolons, or
  ORCID iDs) and each name gets its own row. Inverted names such as
  `Smith, J. A.` are kept whole.
- Contribution levels in by-role statements, annotating contributors the way
  by-author statements already annotated roles.
- A link to each role's full NISO definition in its info popover.

### Changed

- The workspace fits one desktop screen: contributors beside the grid, statement
  full-width below.
- Exported heatmaps drop the baked-in image title (captions belong to the
  document they are pasted into) and size their label bands to their content.
- The About popover carries the version and source link; the header nav is down
  to *How it works* and *About*.
- Copying an export format now confirms on its own button.

### Fixed

- A comma-separated list is now split per line rather than per comma, so a name
  with multiple initials or a compound given name (`Curie, Marie Skłodowska`)
  survives a paste intact.
- An entry with no name in it (a stray affiliation marker, say) no longer aborts
  the rest of a pasted list; it is skipped and reported.

### Removed

- `@nivo/heatmap`, and the separate per-author role checklist beside it. The grid
  is a plain table, so cells are keyboard-reachable and screen-readable rather
  than an `aria-hidden` SVG.

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
