# CRediT Generator

[![CI](https://github.com/simonvanlierde/credit-heatmap/actions/workflows/ci.yml/badge.svg)](https://github.com/simonvanlierde/credit-heatmap/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/simonvanlierde/credit-heatmap/branch/main/graph/badge.svg)](https://codecov.io/gh/simonvanlierde/credit-heatmap)
[![Demo](https://img.shields.io/website?url=https%3A%2F%2Fcredit.duinlab.nl&label=demo)](https://credit.duinlab.nl)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A web tool for building [CRediT (Contributor Roles Taxonomy)](https://credit.niso.org/) author
contribution statements for scholarly publications.

Add contributors by name, assign their 14 CRediT roles via an interactive matrix, and the app
generates a formatted statement ready to paste into a manuscript — alongside a contribution
heatmap and exports (JATS4R XML, CSV, JSON, Markdown) for journal submission systems.

This is a TypeScript rewrite of the original
[Python/Dash CRediT Generator](https://github.com/IPHYS-Bioinformatics/CRediT-Generator).

**Try it now:** [credit.duinlab.nl](https://credit.duinlab.nl) — no install required.

![The CRediT Generator workspace: a contributors list and contribution matrix on the left, a live heatmap and exportable statement on the right](docs/screenshots/hero.png)

---

## Features

- **Contributor management** — add/rename/reorder authors; paste an ORCID iD (or URL) into any field to auto-fill the name
- **Contribution matrix** — assign roles per author as a binary toggle or a granular level, with presets (equal contribution, senior author, data-only) guarded by a confirmation before they overwrite existing work
- **Live statement** — three formats (by role, by author, short) with optional level annotations
- **Multilingual output** — pick a language to localize the role names in the statement, Markdown table, and heatmap (translations from the community [credit-translation](https://github.com/contributorshipcollaboration/credit-translation) project, keyed by NISO role URL). Machine formats (XML/CSV/JSON) stay canonical English.
- **Contribution heatmap** — interactive preview plus SVG and PNG download (rendered in the browser)
- **Exports** — JATS4R XML, CSV, JSON, and a Markdown table; copy or download
- **Validation** — journal-style checks (authors with no roles, missing key roles)
- **Shareable links** — encode the whole draft into a URL to hand to a co-author
- **Import** — paste names, or drop a JSON / CSV / JATS4R XML file to restore a session

| First run | Statement & export |
|---|---|
| ![Empty first-run state inviting you to add a contributor, import, or load sample data](docs/screenshots/empty-state.png) | ![The contribution statement with format options, a copy-statement button, and a format picker offering copy or download](docs/screenshots/statement-export.png) |

---

## Roadmap

- **UI localization** — the generated *output* can be localized today; the app **chrome** (buttons, labels, help text — ~116 strings) is still English-only. A full UI translation would mean adding `next-intl`, per-locale message catalogs, locale routing, and RTL support.
- **More output languages** — the [credit-translation](https://github.com/contributorshipcollaboration/credit-translation) repo offers ~47 locales; a curated subset is vendored under [`packages/core/src/credit-i18n/translations`](packages/core/src/credit-i18n/translations). Run `node packages/core/scripts/fetch-credit-translations.mjs` to refresh/extend the set.

---

## Architecture

The app is deliberately small: a single **Next.js** application plus one **pure domain package**.

```text
Browser
  └─ Next.js 15 app  (repo root, App Router)
       ├─ React UI + Zustand store (persisted to localStorage)
       ├─ @credit-generator/core   ← all domain logic, runs in the browser
       │     statements · JATS4R XML · CSV · JSON · Markdown · heatmap SVG · validation
       └─ /api/orcid  (route handler) ──→ pub.orcid.org    ← the only server-side call
```

Almost everything is a pure function in [`packages/core`](packages/core/README.md), so it runs
client-side: statements, XML/CSV/JSON/Markdown, the heatmap SVG (PNG via `<canvas>`), and XML import
(native `DOMParser`). The one server call is the ORCID lookup — the ORCID public API sends no CORS
headers — so it's a single Next.js route handler.

An earlier version had a separate Hono REST API (OpenAPI docs, server-side Sharp/Satori rendering, an
nginx-fronted two-container deploy). It was collapsed on purpose — more surface area than the tool
needs. `packages/core` stays framework-agnostic (only runtime dependency: `zod`).

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Workspace | pnpm workspaces | One app at the root + a reusable `packages/core` library |
| Language | TypeScript 6 (strict) | Compile-time safety; `noUncheckedIndexedAccess` on |
| Frontend | Next.js 15 (App Router) | RSC; deploys self-hosted or serverless (see [Deployment](#deployment)) |
| Styling | Tailwind CSS v4 | Design tokens via `@theme`; no runtime CSS |
| State | Zustand + immer + persist | Simple, mutation-friendly store; survives refresh |
| Validation | Zod | Runtime-safe schemas at trust boundaries |
| Heatmap | @nivo/heatmap (preview) + hand-crafted SVG (`core`) | Interactive chart; one SVG source for download + canvas PNG |
| Testing | Vitest (unit) + Playwright (e2e) | Fast ESM unit tests; browser happy-path coverage |
| Linting | Biome | One tool for format + lint |
| CI | GitHub Actions | lint · typecheck · test · build on every PR |
| Deploy | Docker self-host **or** Cloudflare Workers (OpenNext) | Two targets: a portable container, or zero-ops serverless edge |

---

## Repository structure

```text
credit-generator/                The Next.js app lives at the repo root
├── src/                        UI (components, store, /api/orcid route handler)
├── e2e/                        Playwright happy-path tests
├── next.config.ts
├── open-next.config.ts         Cloudflare/OpenNext serverless adapter
├── wrangler.jsonc              Cloudflare Worker config
├── packages/
│   └── core/                   Pure, framework-agnostic domain logic (see its README)
│       ├── src/credit-roles.ts        14 CRediT roles as a typed const
│       ├── src/author.ts              Zod schemas; score → level helpers
│       ├── src/parse-authors.ts       Name parsing + unique-initials logic
│       ├── src/generate-statement.ts  3 statement formats
│       ├── src/validate.ts            Journal-style contribution checks
│       └── src/export/                JATS4R XML, CSV, JSON, Markdown, heatmap SVG
├── justfile                    Dev commands (requires just)
├── tsconfig.base.json          Shared compiler options (app + core extend it)
├── pnpm-workspace.yaml
├── Dockerfile                  Multi-stage standalone build
└── docker-compose.yml          Single-container run
```

### Contribution score model

Contributions are stored as a 0–100 integer (`score`) rather than a boolean, so the UI can offer a
binary toggle or granular levels without changing the data model. See
[`packages/core/README.md`](packages/core/README.md) for the score→level boundaries and full domain
model.

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
git clone https://github.com/your-org/credit-generator
cd credit-generator
just install        # or: pnpm install

just dev            # or: pnpm dev
# open http://localhost:3000
```

### Useful commands

```bash
just dev            # Next.js dev server (watch)
just web            # same, web filter only
just build          # production build
just test           # unit tests
just typecheck      # TypeScript across all packages
just lint           # Biome lint
just lint-fix       # Biome lint + auto-fix
just ci             # full local CI pass
just docker-up      # build + run the dev Docker stack
just docker-prod-up # build + run the production stack
just docker-smoke   # build the stack and curl /health
```

Without `just`: `pnpm install`, then `pnpm dev | test | build` and `pnpm biome check .`.

---

## Testing

```bash
pnpm --filter @credit-generator/core test     # unit tests (Vitest)
pnpm test:e2e                                  # browser happy paths (Playwright)
```

Unit tests cover the domain layer (parsing, statements, all exports, the heatmap SVG, validation).
The Playwright suite covers loading sample data, importing names, the client-side XML download, and
the share-link round-trip. E2e runs on manual dispatch or on PRs labelled `e2e`.

CI (`.github/workflows/ci.yml`) runs lint, typecheck, test, and build in parallel on every push and
PR; `docker.yml` builds the container and smoke-tests it.

---

## Deployment

The app supports two deploy targets. Pick by trade-off — a portable, self-hostable container, or
zero-ops serverless. `packages/core` is framework-agnostic, so neither target leaks into the
domain logic.

### Self-host — Docker

A multi-stage build packages the Next.js `output: "standalone"` server into a single container that
serves everything, including the `/api/*` route handlers. No reverse proxy is required; put one
(nginx, Caddy, a cloud load balancer) in front only if your environment needs it.

```bash
docker compose up --build      # build + run on http://localhost:3000
```

Override the published port with `PORT` (see [.env.example](.env.example)). `docker.yml` builds the
container and smoke-tests `/health` in CI.

### Serverless — Cloudflare Workers (OpenNext)

[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) adapts the Next.js build to run on
Cloudflare Workers, with no server to keep alive — how the live demo is hosted.

```bash
pnpm preview        # build + run the Worker locally
pnpm deploy         # build + deploy to Cloudflare
```

Configured in [open-next.config.ts](open-next.config.ts) and [wrangler.jsonc](wrangler.jsonc).
