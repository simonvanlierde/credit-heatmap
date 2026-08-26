# CRediT Matrix

[![CI](https://github.com/simonvanlierde/credit-heatmap/actions/workflows/ci.yml/badge.svg)](https://github.com/simonvanlierde/credit-heatmap/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/simonvanlierde/credit-heatmap/branch/main/graph/badge.svg)](https://codecov.io/gh/simonvanlierde/credit-heatmap)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fcredit.duinlab.nl)](https://credit.duinlab.nl)
[![DOI](https://img.shields.io/badge/DOI-10.5281%2Fzenodo.21213659-blue.svg)](https://doi.org/10.5281/zenodo.21213659)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](CONTRIBUTING.md)

A web app for drafting [CRediT (Contributor Roles Taxonomy)](https://credit.niso.org/) contribution
statements for scholarly publications. Formerly released as *CRediT Generator*.

Add contributors, assign the 14 roles, and copy a manuscript-ready statement. The same grid is a
**contribution heatmap** you can export as a figure, alongside files for journal submission systems:
JATS4R XML, CSV, JSON, and Markdown.

CRediT Matrix is an independent project. It is not affiliated with or endorsed by NISO.

**Try it:** [credit.duinlab.nl](https://credit.duinlab.nl)

![The CRediT Matrix workspace: a contributors list beside an editable contribution grid, with the generated statement and export controls below](docs/screenshots/hero.png)

## What it does

- **Contributors**: add, rename, reorder, or paste a whole author list. Paste an ORCID iD or URL to
  look up the name
- **Contribution grid**: click a cell to assign one of the 14 roles, as a yes/no value or as a
  contribution level. The grid is the heatmap, so you can transpose it, swap initials for full
  names, and recolor it
- **Statements**: group by role or by author, with full names or initials, and optional level labels
- **Eight languages**: the interface and the generated statement each pick their own language, so a
  Dutch interface can produce an English statement. Role names come from
  [credit-translation](https://github.com/contributorshipcollaboration/credit-translation);
  machine-readable exports keep the canonical English CRediT terms
- **Exports**: copy or download JATS4R XML, CSV, JSON, and Markdown, or download the heatmap as SVG
  or PNG
- **Sharing and import**: encode a draft in a URL, paste names, or import JSON, CSV, or JATS4R XML
- **Works offline**: install it, and a draft survives a flight. Only the ORCID lookup needs a
  network

| First run | Statement & export |
|---|---|
| ![Empty first-run state with a getting-started card inviting you to add a contributor, import, or load sample data](docs/screenshots/empty-state.png) | ![The contribution statement with grouping and level options, a copy-statement button, and a format picker offering copy or download](docs/screenshots/statement-export.png) |

---

## Architecture

TypeScript 6 throughout, on pnpm workspaces: the app at the root, reusable `packages/core` beside
it.

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 16 (App Router) | Runs on Cloudflare Workers via OpenNext |
| Styling | Tailwind CSS v4 | Design tokens via `@theme`; no runtime CSS |
| State | Zustand + immer + persist | Survives a refresh via localStorage |
| Validation | Zod | Schema checks at trust boundaries |
| Heatmap | Hand-crafted SVG (`core`) | One SVG source feeds both download and canvas PNG |
| Offline | Service worker + manifest | Runtime cache of the app's own files; no build step |

```text
Browser
  └─ Next.js app  (repo root, App Router)
       ├─ React UI + Zustand store (persisted to localStorage)
       ├─ @credit-generator/core   ← all domain logic, runs in the browser
       │     statements · JATS4R XML · CSV · JSON · Markdown · heatmap SVG · validation
       └─ /api/orcid  (route handler) ──→ pub.orcid.org    ← the only server-side call
```

Nearly everything runs in the browser. [`packages/core`](packages/core/README.md) holds the domain
logic as pure TypeScript, with `zod` as its only runtime dependency. XML import uses the native
`DOMParser`, and the PNG is drawn from the heatmap SVG onto a `<canvas>`.

The ORCID lookup is the one exception: ORCID's public API sends no CORS headers, so `/api/orcid`
proxies it. Contributions store a 0–100 integer `score` rather than a boolean, so the UI switches
between binary and level-based editing without changing the stored model. See
[`packages/core/README.md`](packages/core/README.md#domain-model) for the score-to-level boundaries.

**No accounts, no server-side storage.** This is a deliberate constraint, not a missing feature. A
draft holds the names and ORCID iDs of co-authors who never visited this site, and keeping those in
your browser means there is nothing to ask us to delete. Drafts are therefore per-browser: move one
between devices by exporting JSON. See
[ADR 0002](docs/adr/0002-no-accounts-or-server-side-storage.md) for what would have to change for
this to be revisited.

---

## Self-hosting

**Prerequisites:** Node ≥ 26, pnpm ≥ 11, [just](https://github.com/casey/just) (optional)

```bash
git clone https://github.com/simonvanlierde/credit-heatmap
cd credit-heatmap
pnpm install
pnpm dev            # → http://localhost:3000
```

[CONTRIBUTING.md](CONTRIBUTING.md) has the full command list and the lint/typecheck/test checklist.
Run `just` to list the watch/fix recipes layered on the pnpm scripts.

### Deployment

The live demo runs on Cloudflare Workers via
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare), which adapts the Next.js build. A
push to `main` builds and deploys it; [CI](.github/workflows/ci.yml) lints, tests, and
build-checks, and never deploys.

To run the Worker yourself, set your own domain and bindings in
[wrangler.jsonc](wrangler.jsonc) and [open-next.config.ts](open-next.config.ts):

```bash
pnpm preview        # build + run the Worker locally
pnpm deploy         # build + deploy to your Cloudflare account
```

## Roadmap

- **Review the translations.** The interface ships in eight languages, machine-translated and
  checked for consistency, ICU correctness, and CRediT terminology. Japanese and Chinese in
  particular still want a native speaker: the term for a contribution *statement* is unsettled.
- **Widen locale coverage.** Eight locales ship today (de, es, fr, it, ja, nl, pt, zh), a curated
  subset of
  [credit-translation](https://github.com/contributorshipcollaboration/credit-translation), vendored
  under [`packages/core/src/credit-i18n/translations`](packages/core/src/credit-i18n/translations).
  Refresh them with `node packages/core/scripts/fetch-credit-translations.mjs`.
- **Read more from ORCID.** The lookup takes the name only. Affiliation is the field submission
  systems ask for next.

## Contributing

Bug reports and small features are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup,
testing, and the accessibility checks. [PRODUCT.md](PRODUCT.md) states what the app is for and who
it serves; [DESIGN.md](DESIGN.md) is the design system that UI changes are held to. Design decisions
are recorded as [ADRs](docs/adr/).

## Acknowledgements

CRediT Matrix builds on prior tools and scholarship on contributorship:

- The original
  [Python/Dash CRediT Generator](https://github.com/IPHYS-Bioinformatics/CRediT-Generator), which
  inspired this app.
- Role translations from
  [credit-translation](https://github.com/contributorshipcollaboration/credit-translation).
- The **contribution matrix** proposed by Nick Steinmetz (2019), which this app's heatmap descends
  from. *Nature Index* surveys it in
  ["Researchers are embracing visual tools to give fair credit…"](https://www.nature.com/nature-index/news/researchers-embracing-visual-tools-contribution-matrix-give-fair-credit-authors-scientific-papers).

### Related work

- Brand, A., Allen, L., Altman, M., Hlava, M., & Scott, J. (2015). Beyond authorship: attribution,
  contribution, collaboration, and credit. *Learned Publishing, 28*(2), 151–155.
  <https://doi.org/10.1002/leap.1210>
- Holcombe, A. O., Kovács, M., Aust, F., & Aczel, B. (2020). Documenting contributions to scholarly
  articles using CRediT and tenzing. *PLOS ONE, 15*(12), e0244611.
  <https://doi.org/10.1371/journal.pone.0244611>
- Nakagawa, S., Ivimey-Cook, E. R., Grainger, M. J., O'Dea, R. E., et al. (2023). Method Reporting
  with Initials for Transparency (MeRIT) promotes more granularity and accountability for author
  contributions. *Nature Communications, 14*, 1788. <https://doi.org/10.1038/s41467-023-37039-1>

## Citing this software

If you use CRediT Matrix in your work, please cite it. Metadata lives in
[CITATION.cff](CITATION.cff), and GitHub's "Cite this repository" button generates APA and BibTeX
from it. The archived, versioned release is on Zenodo:
[doi:10.5281/zenodo.21213659](https://doi.org/10.5281/zenodo.21213659).

> van Lierde, S. *CRediT Matrix* [Computer software]. Zenodo.
> <https://doi.org/10.5281/zenodo.21213659>

## License

[MIT](LICENSE) © Simon van Lierde
