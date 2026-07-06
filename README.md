# CRediT Generator

[![CI](https://github.com/simonvanlierde/credit-heatmap/actions/workflows/ci.yml/badge.svg)](https://github.com/simonvanlierde/credit-heatmap/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/simonvanlierde/credit-heatmap/branch/main/graph/badge.svg)](https://codecov.io/gh/simonvanlierde/credit-heatmap)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fcredit.duinlab.nl)](https://credit.duinlab.nl)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](CONTRIBUTING.md)
<!-- TODO: add a DOI badge once a Zenodo release DOI is minted (see "Citing this software"). -->
<!-- [![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.XXXXXXX.svg)](https://doi.org/10.5281/zenodo.XXXXXXX) -->

A web app for drafting [CRediT (Contributor Roles Taxonomy)](https://credit.niso.org/)
contribution statements for scholarly publications.

Add contributors, assign the 14 CRediT roles, and copy a manuscript-ready statement. The app also
produces a contribution heatmap and exports for journal submission systems: JATS4R XML, CSV, JSON,
and Markdown.

Inspired by the original
[Python/Dash CRediT Generator](https://github.com/IPHYS-Bioinformatics/CRediT-Generator).

**Try it:** [credit.duinlab.nl](https://credit.duinlab.nl)

![The CRediT Generator workspace: a contributors list and contribution matrix on the left, a live heatmap and exportable statement on the right](docs/screenshots/hero.png)

---

## What it does

- **Contributors:** add, rename, reorder, and paste an ORCID iD or URL to look up the name
- **Contribution matrix:** assign each role as a binary yes/no value or as a contribution level
- **Presets:** apply common patterns such as equal contribution, senior author, and data-only
- **Statements:** render by role or by author, with full names or initials, and optional level labels
- **Localized output:** translate role names in statements, Markdown tables, and heatmaps
  (translations from [credit-translation](https://github.com/contributorshipcollaboration/credit-translation)).
  Machine-readable exports keep canonical English CRediT terms.
- **Heatmap:** preview in the browser and download as SVG or PNG
- **Exports:** copy or download JATS4R XML, CSV, JSON, and Markdown
- **Validation:** flag contributors with no roles and missing key roles
- **Sharing/import:** encode a draft in a URL, paste names, or import JSON, CSV, or JATS4R XML

| First run | Statement & export |
|---|---|
| ![Empty first-run state inviting you to add a contributor, import, or load sample data](docs/screenshots/empty-state.png) | ![The contribution statement with format options, a copy-statement button, and a format picker offering copy or download](docs/screenshots/statement-export.png) |

---

## Roadmap

- **Localize the app UI.** Today the UI is English-only; only the output (statements, Markdown
  tables, heatmaps) can use the bundled role translations. Extending localization to the interface
  itself is the main open item.
- **Widen locale coverage.** Only a curated subset of
  [credit-translation](https://github.com/contributorshipcollaboration/credit-translation) locales is
  vendored under [`packages/core/src/credit-i18n/translations`](packages/core/src/credit-i18n/translations);
  refresh or extend them with `node packages/core/scripts/fetch-credit-translations.mjs`.
- **Smooth the onboarding UX.** Make the first-run experience clearer for new users — better empty
  states, guidance on where to start, and a gentler path from a blank workspace to a finished
  statement.

---

## Architecture

The repo contains one **Next.js** app and one framework-agnostic domain package
([`packages/core`](packages/core/README.md)).

```text
Browser
  └─ Next.js app  (repo root, App Router)
       ├─ React UI + Zustand store (persisted to localStorage)
       ├─ @credit-generator/core   ← all domain logic, runs in the browser
       │     statements · JATS4R XML · CSV · JSON · Markdown · heatmap SVG · validation
       └─ /api/orcid  (route handler) ──→ pub.orcid.org    ← the only server-side call
```

Most behavior is pure TypeScript in `packages/core`: statements, exports, validation, XML import
(native `DOMParser`), and the heatmap SVG. The PNG download is produced from that SVG in a browser
`<canvas>`.

The ORCID lookup is the only server-side call. The ORCID public API does not send browser-friendly
CORS headers, so the app proxies that request through a small Next.js route handler. `packages/core`
has no framework dependency and only one runtime dependency, `zod`.

Contributions are stored as a 0-100 integer (`score`), not a boolean. That lets the UI switch between
binary and level-based editing without changing the persisted model. See
[`packages/core/README.md`](packages/core/README.md) for the score-to-level boundaries.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Workspace | pnpm workspaces | App at the root + a reusable `packages/core` library |
| Language | TypeScript 6 (strict) | `noUncheckedIndexedAccess` on |
| Frontend | Next.js 16 (App Router) | Deploys to Cloudflare Workers |
| Styling | Tailwind CSS v4 | Design tokens via `@theme`; no runtime CSS |
| State | Zustand + immer + persist | Local app state, persisted to `localStorage` |
| Validation | Zod | Runtime-safe schemas at trust boundaries |
| Heatmap | @nivo/heatmap + hand-crafted SVG (`core`) | Interactive preview; one SVG source for download + canvas PNG |
| Testing | Vitest (unit) + Playwright (e2e) | Domain tests plus browser happy paths |
| Linting | Biome | One tool for format + lint |
| Deploy | Cloudflare Workers (OpenNext) | Zero-ops serverless edge |

---

## Repository structure

```text
credit-generator/               Next.js app at the repo root
├── src/                        UI (components, store, /api/orcid route handler)
├── e2e/                        Playwright happy-path tests
├── open-next.config.ts         Cloudflare/OpenNext serverless adapter
├── wrangler.jsonc              Cloudflare Worker config
├── packages/core/              Pure, framework-agnostic domain logic (see its README)
│   └── src/
│       ├── credit-roles.ts        14 CRediT roles as a typed const
│       ├── author.ts              Zod schemas; score → level helpers
│       ├── parse-authors.ts       Name parsing + unique-initials logic
│       ├── generate-statement.ts  4 statement formats
│       ├── validate.ts            Journal-style contribution checks
│       └── export/                JATS4R XML, CSV, JSON, Markdown, heatmap SVG
└── justfile                    Dev commands (requires just)
```

### Server endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/orcid?id=…` | Proxy an ORCID public lookup (CORS workaround) |
| GET | `/health` | Liveness check for uptime monitors |

Everything else — statements, exports, heatmap — happens in the browser.

---

## Quick start

**Prerequisites:** Node ≥ 22, pnpm ≥ 9, [just](https://github.com/casey/just) (optional)

```bash
git clone https://github.com/simonvanlierde/credit-heatmap
cd credit-heatmap
pnpm install
pnpm dev            # → http://localhost:3000
```

### Useful commands

```bash
pnpm dev            # Next.js dev server (watch)
pnpm build          # production build
pnpm test           # unit tests
pnpm typecheck      # TypeScript across all packages
pnpm lint           # Biome lint (append :fix to auto-fix)
pnpm test:e2e       # Playwright end-to-end tests
```

The `just` recipes wrap watch/fix tasks on top of the pnpm scripts. Run `just` to list them.

---

## Testing

```bash
pnpm --filter @credit-generator/core test     # unit tests (Vitest)
pnpm test:e2e                                  # browser happy paths + axe a11y scans (Playwright)
```

Unit tests cover the domain layer: parsing, statements, exports, imports, heatmap SVG generation,
and validation. Playwright covers sample data, name import, the client-side XML download, share-link
round trips, and axe accessibility scans. The full E2E suite runs on manual dispatch or on PRs
labelled `e2e`; the axe accessibility scans also run on every push and PR (see below).

Regular CI runs Biome, typecheck, coverage, the axe accessibility scans, and the Cloudflare Worker
build on every push and PR.

### Accessibility

Two automated checks run against the UI. They are guardrails, not a WCAG conformance claim.

| Check | Command | Scope | In CI |
|---|---|---|---|
| Biome [`a11y`](https://biomejs.dev/linter/rules/#accessibility) lint | `pnpm lint` | alt text, ARIA validity, button `type`, keyboard handlers | Every push and PR |
| [axe-core](https://github.com/dequelabs/axe-core-npm) scan ([`e2e/a11y.spec.ts`](e2e/a11y.spec.ts)) | `pnpm test:e2e` | WCAG 2.0/2.1 A/AA rules over the main screens, light + dark | Every push and PR |

The UI includes a skip link, landmark regions, keyboard-accessible drag-to-reorder with
screen-reader announcements, radiogroup segmented controls, a live region for copy, ORCID-lookup,
and import status, and a `prefers-reduced-motion` fallback that neutralizes transitions and
animations.

---

## Deployment

[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) adapts the Next.js build to run on
Cloudflare Workers — how the live demo is hosted.

```bash
pnpm preview        # build + run the Worker locally
pnpm deploy         # build + deploy to Cloudflare
```

Configured in [open-next.config.ts](open-next.config.ts) and [wrangler.jsonc](wrangler.jsonc).

---

## Contributing

Bug reports and small features are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for setup and the
lint/typecheck/test checklist. Design decisions are recorded as [ADRs](docs/adr/).

---

## Citing this software

If you use the CRediT Generator in your work, please cite it. Metadata lives in
[CITATION.cff](CITATION.cff), and GitHub's "Cite this repository" button generates APA and BibTeX from
it.

> van Lierde, S. *CRediT Generator* [Computer software]. <https://github.com/simonvanlierde/credit-heatmap>

<!-- TODO: mint a release DOI via Zenodo, then add it here and to CITATION.cff for a citable, versioned archive. -->
