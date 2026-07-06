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

- `packages/core`: pure, framework-agnostic domain logic (statements, exports,
  validation, heatmap SVG). No React/Next/Node APIs at import time. Most changes
  and most tests belong here.
- `src/`: the Next.js UI and the single `/api/orcid` route handler.

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

## Testing

- **Unit (Vitest)**: `pnpm --filter @credit-generator/core test`. Covers the domain layer: name
  parsing, initials deduplication, statement formats, score-to-level boundaries, import/export round
  trips, validation, and heatmap SVG generation.
- **End-to-end (Playwright)**: `pnpm test:e2e`. Covers sample data, name import, the client-side XML
  download, and share-link round trips, plus axe accessibility scans. The full E2E suite runs on
  manual dispatch or on PRs labelled `e2e`.

CI runs Biome, typecheck, unit coverage, the axe accessibility scans, and the Cloudflare Worker build
on every push and PR.

### Accessibility

Two automated checks guard the UI. They are guardrails, not a WCAG conformance claim.

| Check | Command | Scope | In CI |
| --- | --- | --- | --- |
| Biome [`a11y`](https://biomejs.dev/linter/rules/#accessibility) lint | `pnpm lint` | alt text, ARIA validity, button `type`, keyboard handlers | Every push and PR |
| [axe-core](https://github.com/dequelabs/axe-core-npm) scan ([`e2e/a11y.spec.ts`](e2e/a11y.spec.ts)) | `pnpm test:e2e` | WCAG 2.0/2.1 A/AA rules over the main screens, light + dark | Every push and PR |

The UI includes a skip link, landmark regions, keyboard-accessible drag-to-reorder with
screen-reader announcements, radiogroup segmented controls, a live region for copy, ORCID-lookup, and
import status, and a `prefers-reduced-motion` fallback that neutralizes transitions and animations.

## Commit and PR conventions

- Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
  and are checked by commitlint (a `commit-msg` hook runs it locally).
- The lefthook hooks auto-format staged files on commit and run lint + tests on
  push, so most CI failures are caught before you push.
- Keep PRs focused. Describe the change and how you verified it.
