# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.1]: https://github.com/simonvanlierde/credit-heatmap/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/simonvanlierde/credit-heatmap/releases/tag/v0.1.0
