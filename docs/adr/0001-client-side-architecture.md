# 1. Client-side architecture with a framework-agnostic core

- Status: accepted
- Date: 2026-01-01

## Context

The CRediT Generator turns a list of contributors and their roles into a
manuscript-ready statement, a heatmap, and machine-readable exports (JATS4R XML,
CSV, JSON, Markdown). All of this is a pure transformation of data the user types
in: there is no user account, no shared state between users, and nothing worth
persisting on a server. The only external dependency is an ORCID name lookup.

We wanted the app to be cheap to host, trivial to run offline for review, and
easy to reuse — a journal or another tool might want the statement/export logic
without the React UI.

## Decision

Keep the app **client-side only** and put all domain logic in a separate,
framework-agnostic package.

- `packages/core` holds every pure transformation — statement formats, exports,
  validation, XML import (native `DOMParser`), and the heatmap SVG. Its only
  runtime dependency is `zod`; it imports no React, Next, or Node APIs, so it
  runs unchanged in the browser and in Node-based tests.
- The Next.js app is a thin UI layer over `core`, with state in Zustand
  persisted to `localStorage`. No database, no backend session.
- The **one** server-side call is `/api/orcid`, a small Next.js route handler
  that proxies the ORCID public API. This exists only because that API sends no
  browser-friendly CORS headers — not because the lookup needs a server.
- Contributions are stored as a `0–100` integer score rather than a boolean, so
  the UI can offer a binary toggle or graded levels without changing the model
  or any export.
- Deployment targets Cloudflare Workers via OpenNext, matching the
  "no persistent server" shape.

## Consequences

**Good**

- Zero-ops, low-cost hosting; the app is effectively a static bundle plus one
  edge function.
- `core` is independently testable (Vitest in Node) and reusable outside this UI.
- Privacy by default: contributor data never leaves the browser except the
  ORCID iD sent for a lookup.

**Trade-offs**

- No server means no server-side persistence or sharing; drafts are shared by
  encoding the whole state into a URL, which is bounded by URL length.
- The ORCID proxy is a small server-side surface that must validate input (ORCID
  shape + checksum) before calling upstream.
- Node tests must supply a `DOMParser` (via `linkedom`) because `core` assumes
  the browser global for XML import.
