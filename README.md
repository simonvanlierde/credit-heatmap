# CRediT Generator

A web tool for building [CRediT (Contributor Roles Taxonomy)](https://credit.niso.org/) author contribution statements for scholarly publications.

Authors are added by name, their 14 CRediT roles are assigned via an interactive matrix, and the app generates a formatted statement ready to paste into a manuscript — along with JATS4R XML and JSON exports for journal submission systems.

This is a full-stack TypeScript rewrite of the original [Python/Dash CRediT Generator](https://github.com/IPHYS-Bioinformatics/CRediT-Generator).

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Monorepo | Turborepo + pnpm workspaces | Fast cached builds; packages/core shared between web and api |
| Language | TypeScript 5 strict | Catch errors at compile time; safer refactoring |
| Frontend | Next.js 15 (App Router) | React Server Components; easy deployment as a standalone Docker image |
| Styling | Tailwind CSS v4 | Design tokens via `@theme`; zero runtime CSS |
| State | Zustand + immer + persist | Simple, mutation-friendly store; survives page refresh |
| Validation | Zod | Runtime-safe schemas shared between frontend and API |
| API | Hono + @hono/zod-openapi | Lightweight, edge-ready; OpenAPI schema auto-generated |
| Heatmap | @nivo/heatmap (UI) + hand-crafted SVG (API export) | Interactive in-browser chart; clean SVG for download |
| PNG export | Sharp | Converts the SVG to PNG server-side; no headless browser needed |
| Testing | Vitest | Fast ESM-native unit tests on packages/core |
| Linting | Biome | Single tool for formatting + linting |
| CI | GitHub Actions | Typecheck → lint → test → build on every PR |
| Deploy | Docker + Coolify on Hetzner VPS | Two images (web, api); docker-compose for local dev |

---

## Repository structure

```
credit-generator/
├── apps/
│   ├── web/          Next.js 15 frontend (port 3000)
│   └── api/          Hono REST API (port 3001)
├── packages/
│   └── core/         Pure TypeScript domain logic
│       ├── src/credit-roles.ts       14 CRediT roles as a typed const
│       ├── src/author.ts             Zod schemas; score → level helpers
│       ├── src/parse-authors.ts      Name parsing + unique-initials logic
│       ├── src/generate-statement.ts 3 statement formats (by-role, by-author, short)
│       └── src/export/               JATS4R XML + JSON serialisers
├── justfile                          Dev commands (requires just)
├── turbo.json
├── pnpm-workspace.yaml
└── docker-compose.yml
```

### Contribution score model

Contributions are stored as a 0–100 integer (`score`) rather than a boolean. This lets the UI offer three input modes — toggle (0 or 100), granular levels (0/33/66/100), or a continuous slider — without changing the underlying data model. Level boundaries:

| Score | Level |
|---|---|
| 0 | None |
| 1–33 | Tertiary |
| 34–66 | Secondary |
| 67–100 | Lead |

### API endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/statement/generate` | Generate a text statement from an author list |
| POST | `/api/v1/heatmap/generate` | Return an SVG (default) or PNG (`Accept: image/png`) heatmap |
| GET | `/api/docs` | Swagger UI |
| GET | `/api/openapi.json` | OpenAPI 3.0 schema |

---

## Quick start

**Prerequisites:** Node ≥ 22, pnpm ≥ 9, [just](https://github.com/casey/just) (optional but recommended)

```bash
# Clone and install
git clone https://github.com/your-org/credit-generator
cd credit-generator
just install        # or: pnpm install

# Run web + API together
just dev            # or: pnpm turbo dev

# Open
# Web:  http://localhost:3000
# API:  http://localhost:3001
# Docs: http://localhost:3001/api/docs
```

### Useful commands

```bash
just dev            # Start all apps in watch mode
just web            # Web only
just api            # API only
just test           # Run unit tests
just test-watch     # Tests in watch mode
just typecheck      # TypeScript check across all packages
just lint           # Biome lint
just lint-fix       # Lint + auto-fix
just build          # Production build
just ci             # Full CI pass locally
just docker-up      # Build + run Docker Compose stack
```

### Without just

```bash
pnpm install
pnpm turbo dev      # dev
pnpm turbo test     # test
pnpm turbo build    # build
pnpm biome check .  # lint
```

---

## Development

### packages/core

All business logic lives here — no framework dependencies. Changes here rebuild both `apps/web` and `apps/api` (Turborepo handles the dependency ordering). Add tests in `src/__tests__/`.

```bash
pnpm --filter @credit-generator/core test
pnpm --filter @credit-generator/core build
```

### apps/web

Next.js App Router. The Zustand store persists to `localStorage` so author data survives refresh. `next.config.ts` proxies `/api/*` requests to the Hono API in development.

### apps/api

Hono with `@hono/zod-openapi`. Stateless — no database. The Zod schemas in `apps/api/src/schemas.ts` re-use types from `packages/core`.

---

## Docker

```bash
# Local stack
docker compose up --build

# Individual images
docker build -f apps/web/Dockerfile -t credit-generator-web .
docker build -f apps/api/Dockerfile -t credit-generator-api .
```

Images use Next.js `output: "standalone"` and multi-stage builds to keep sizes small.

---
