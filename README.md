# CRediT Generator

[![CI](https://github.com/simonvanlierde/credit-heatmap/actions/workflows/ci.yml/badge.svg)](https://github.com/simonvanlierde/credit-heatmap/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/simonvanlierde/credit-heatmap/branch/main/graph/badge.svg)](https://codecov.io/gh/simonvanlierde/credit-heatmap)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fcredit.duinlab.nl)](https://credit.duinlab.nl)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A web tool for building [CRediT (Contributor Roles Taxonomy)](https://credit.niso.org/) author
contribution statements for scholarly publications.

Add contributors, assign their 14 CRediT roles in an interactive matrix, and get a formatted
statement ready to paste into a manuscript — plus a contribution heatmap and exports (JATS4R XML,
CSV, JSON, Markdown) for journal submission systems.

Inspired by the original
[Python/Dash CRediT Generator](https://github.com/IPHYS-Bioinformatics/CRediT-Generator).

**Try it now:** [credit.duinlab.nl](https://credit.duinlab.nl) — no install required.

![The CRediT Generator workspace: a contributors list and contribution matrix on the left, a live heatmap and exportable statement on the right](docs/screenshots/hero.png)

---

## Features

- **Contributors** — add, rename, reorder; paste an ORCID iD (or URL) to auto-fill the name
- **Contribution matrix** — assign roles as a binary toggle or a granular level, with presets
  (equal contribution, senior author, data-only), guarded by a confirmation before they overwrite
- **Live statement** — three formats (by role, by author, short), with optional level annotations
- **Multilingual output** — localize role names in the statement, Markdown table, and heatmap
  (translations from [credit-translation](https://github.com/contributorshipcollaboration/credit-translation)).
  Machine formats (XML/CSV/JSON) stay canonical English.
- **Heatmap** — interactive preview plus SVG and PNG download, rendered in the browser
- **Exports** — JATS4R XML, CSV, JSON, Markdown; copy or download
- **Validation** — journal-style checks (authors with no roles, missing key roles)
- **Shareable links** — encode the whole draft into a URL for a co-author
- **Import** — paste names, or drop a JSON / CSV / JATS4R XML file to restore a session

| First run | Statement & export |
|---|---|
| ![Empty first-run state inviting you to add a contributor, import, or load sample data](docs/screenshots/empty-state.png) | ![The contribution statement with format options, a copy-statement button, and a format picker offering copy or download](docs/screenshots/statement-export.png) |

---

## Roadmap

- **UI** improvements: add onboarding, better mobile layout, and clearer guidance on how to edit an authors roles
- **UI localization** — output can be localized today, but the app chrome (~116 strings) is still
  English-only. Full UI translation would mean `next-intl`, per-locale catalogs, locale routing, and RTL.
- **More output languages** — [credit-translation](https://github.com/contributorshipcollaboration/credit-translation)
  offers ~47 locales; a curated subset is vendored under
  [`packages/core/src/credit-i18n/translations`](packages/core/src/credit-i18n/translations). Refresh with
  `node packages/core/scripts/fetch-credit-translations.mjs`.

---

## Architecture

A single **Next.js** app plus one **pure domain package** ([`packages/core`](packages/core/README.md)).

```text
Browser
  └─ Next.js app  (repo root, App Router)
       ├─ React UI + Zustand store (persisted to localStorage)
       ├─ @credit-generator/core   ← all domain logic, runs in the browser
       │     statements · JATS4R XML · CSV · JSON · Markdown · heatmap SVG · validation
       └─ /api/orcid  (route handler) ──→ pub.orcid.org    ← the only server-side call
```

Nearly everything is a pure function in `packages/core`, so it runs client-side: statements, exports,
the heatmap SVG (PNG via `<canvas>`), and XML import (native `DOMParser`). The one server call is the
ORCID lookup — the ORCID public API sends no CORS headers — so it's a single Next.js route handler.
`packages/core` stays framework-agnostic (only runtime dependency: `zod`).

**Contribution score model:** contributions are stored as a 0–100 integer (`score`), not a boolean,
so the UI can offer a binary toggle or granular levels without changing the data model. See
[`packages/core/README.md`](packages/core/README.md) for the score→level boundaries and full model.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Workspace | pnpm workspaces | App at the root + a reusable `packages/core` library |
| Language | TypeScript 6 (strict) | `noUncheckedIndexedAccess` on |
| Frontend | Next.js 16 (App Router) | Deploys self-hosted or serverless |
| Styling | Tailwind CSS v4 | Design tokens via `@theme`; no runtime CSS |
| State | Zustand + immer + persist | Mutation-friendly store; survives refresh |
| Validation | Zod | Runtime-safe schemas at trust boundaries |
| Heatmap | @nivo/heatmap + hand-crafted SVG (`core`) | Interactive preview; one SVG source for download + canvas PNG |
| Testing | Vitest (unit) + Playwright (e2e) | Fast ESM unit tests; browser happy-path coverage |
| Linting | Biome | One tool for format + lint |
| Deploy | Docker **or** Cloudflare Workers (OpenNext) | A portable container, or zero-ops serverless edge |

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
│       ├── generate-statement.ts  3 statement formats
│       ├── validate.ts            Journal-style contribution checks
│       └── export/                JATS4R XML, CSV, JSON, Markdown, heatmap SVG
├── justfile                    Dev commands (requires just)
├── Dockerfile                  Multi-stage standalone build
└── docker-compose.yml          Single-container run
```

### Server endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/orcid?id=…` | Proxy an ORCID public lookup (CORS workaround) |
| GET | `/health` | Liveness check for Docker / load balancers |

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
just docker-up      # build + run the Docker stack
```

The `just` recipes wrap a few Docker/watch tasks on top of the pnpm scripts — run `just` to list them.

---

## Testing

```bash
pnpm --filter @credit-generator/core test     # unit tests (Vitest)
pnpm test:e2e                                  # browser happy paths (Playwright)
```

Unit tests cover the domain layer (parsing, statements, all exports, the heatmap SVG, validation).
Playwright covers sample data, name import, the client-side XML download, and the share-link
round-trip; it runs on manual dispatch or PRs labelled `e2e`. CI runs lint, typecheck, test, and
build in parallel on every push and PR.

---

## Deployment

Two targets, sharing the framework-agnostic `packages/core`.

### Self-host — Docker

A multi-stage build packages the Next.js `output: "standalone"` server into a single container that
serves everything, including the `/api/*` route handlers. No reverse proxy required.

```bash
docker compose up --build      # build + run on http://localhost:3000
```

Override the port with `PORT` (see [.env.example](.env.example)).

### Serverless — Cloudflare Workers (OpenNext)

[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) adapts the Next.js build to run on
Cloudflare Workers — how the live demo is hosted.

```bash
pnpm preview        # build + run the Worker locally
pnpm deploy         # build + deploy to Cloudflare
```

Configured in [open-next.config.ts](open-next.config.ts) and [wrangler.jsonc](wrangler.jsonc).
