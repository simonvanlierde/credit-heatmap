# CRediT Generator

A web tool for building [CRediT (Contributor Roles Taxonomy)](https://credit.niso.org/) author
contribution statements for scholarly publications.

Add contributors by name, assign their 14 CRediT roles via an interactive matrix, and the app
generates a formatted statement ready to paste into a manuscript — alongside a contribution
heatmap and exports (JATS4R XML, CSV, JSON, Markdown) for journal submission systems.

This is a TypeScript rewrite of the original
[Python/Dash CRediT Generator](https://github.com/IPHYS-Bioinformatics/CRediT-Generator).

<!-- Live demo: add your deployment URL here -->

---

## Features

- **Contributor management** — add/rename/reorder authors, paste an ORCID iD to auto-fill the name
- **Contribution matrix** — assign roles per author as a binary toggle, granular level, or 0–100 slider, with presets (equal contribution, senior author, data-only)
- **Live statement** — three formats (by role, by author, short) with optional level annotations
- **Contribution heatmap** — interactive preview plus SVG and PNG download (rendered in the browser)
- **Exports** — JATS4R XML, CSV, JSON, and a Markdown table; copy or download
- **Validation** — journal-style checks (authors with no roles, missing key roles)
- **Shareable links** — encode the whole draft into a URL to hand to a co-author
- **Import** — paste names, or drop a JSON / CSV / JATS4R XML file to restore a session

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
client-side: statement generation, XML/CSV/JSON/Markdown, the heatmap SVG (converted to PNG via
`<canvas>`), and XML import (native `DOMParser`). The **only** thing that genuinely needs a server
is the ORCID lookup, because the ORCID public API has no permissive CORS headers — so it's a single
Next.js route handler.

An earlier version had a separate Hono REST API (with OpenAPI docs, server-side Sharp/Satori PNG/PDF
rendering, and an nginx-fronted two-container deploy). That was collapsed on purpose: it was more
surface area than the tool needs. Keeping `packages/core` framework-agnostic (its only runtime
dependency is `zod`) preserves the option to wrap it in a CLI, serverless API, or document plugin
later — without carrying that machinery now.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Workspace | pnpm workspaces | One app at the root + a reusable `packages/core` library |
| Language | TypeScript 5 (strict) | Compile-time safety; `noUncheckedIndexedAccess` on |
| Frontend | Next.js 15 (App Router) | RSC; deploys as a standalone Docker image |
| Styling | Tailwind CSS v4 | Design tokens via `@theme`; no runtime CSS |
| State | Zustand + immer + persist | Simple, mutation-friendly store; survives refresh |
| Validation | Zod | Runtime-safe schemas at trust boundaries |
| Heatmap | @nivo/heatmap (preview) + hand-crafted SVG (`core`) | Interactive chart; one SVG source for download + canvas PNG |
| Testing | Vitest (unit) + Playwright (e2e) | Fast ESM unit tests; browser happy-path coverage |
| Linting | Biome | One tool for format + lint |
| CI | GitHub Actions | lint · typecheck · test · build on every PR |
| Deploy | Docker (single service) + optional nginx / Cloudflare Tunnel | One container; compose profiles for prod and tunnel |

---

## Repository structure

```text
credit-generator/                The Next.js app lives at the repo root
├── src/                        UI (components, store, /api/orcid route handler)
├── e2e/                        Playwright happy-path tests
├── next.config.ts
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
├── docker-compose.yml          Single web service
├── docker-compose.dev.yml      Dev port mapping
├── docker-compose.prod.yml     nginx + optional Cloudflare Tunnel
└── nginx/
```

### Contribution score model

Contributions are stored as a 0–100 integer (`score`) rather than a boolean, so the UI can offer a
toggle, granular levels, or a slider without changing the data model. Boundaries:

| Score | Level |
|---|---|
| 0 | None |
| 1–33 | Tertiary |
| 34–66 | Secondary |
| 67–100 | Lead |

See [`packages/core/README.md`](packages/core/README.md) for the full domain model.

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
PR; `docker.yml` validates the compose files and smoke-tests the built stack.

---

## Docker

```bash
# Local stack (port 3000)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Production stack behind nginx on one public port
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# …with a Cloudflare Tunnel
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile tunnel up -d --build
```

The image uses Next.js `output: "standalone"` with a multi-stage build. The nginx front door listens
on `NGINX_PORT` (default `8080`); set `CLOUDFLARE_TUNNEL_TOKEN` to enable the `tunnel` profile. See
[.env.example](.env.example) for deployment variables.
