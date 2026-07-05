# Contributing

Thanks for your interest in the CRediT Generator. Bug reports, fixes, and small
features are welcome.

## Getting set up

**Prerequisites:** Node ≥ 22, pnpm ≥ 9, and optionally
[just](https://github.com/casey/just).

```bash
git clone https://github.com/simonvanlierde/credit-heatmap
cd credit-heatmap
pnpm install        # also installs the lefthook git hooks
pnpm dev            # → http://localhost:3000
```

## Where things live

- `packages/core` — pure, framework-agnostic domain logic (statements, exports,
  validation, heatmap SVG). No React/Next/Node APIs at import time. Most changes
  and most tests belong here.
- `src/` — the Next.js UI and the single `/api/orcid` route handler.

See the [README](README.md#architecture) and
[ADR&nbsp;0001](docs/adr/0001-client-side-architecture.md) for why it's split
this way.

## Before you open a PR

```bash
pnpm lint           # Biome (format + lint); append :fix to auto-fix
pnpm typecheck      # TypeScript across all packages
pnpm test           # Vitest unit tests
pnpm test:e2e       # Playwright (optional locally; label a PR `e2e` to run in CI)
```

`pnpm lint`, `pnpm typecheck`, and `pnpm test` all run in CI on every push and PR.
Add or update tests in `packages/core/src/__tests__` for any change to domain logic.

## Commit and PR conventions

- Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
  and are checked by commitlint (a `commit-msg` hook runs it locally).
- The lefthook hooks auto-format staged files on commit and run lint + tests on
  push, so most CI failures are caught before you push.
- Keep PRs focused. Describe the change and how you verified it.
