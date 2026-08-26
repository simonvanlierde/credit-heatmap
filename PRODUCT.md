# Product brief

A reference for anyone writing copy or designing screens for CRediT Matrix. It covers the
audience, the promise, and the claims this product may make. It is not user documentation: for what
the app does, read the [README](README.md), and for visual rules, read [DESIGN.md](DESIGN.md).

## Users

Researchers and research teams preparing manuscripts on the web. They use the CRediT Contributor
Roles Taxonomy to agree on, record, and export each contributor's work.

## Purpose

CRediT Matrix turns contributor names and role assignments into a manuscript-ready statement
and submission files, so teams never format the taxonomy by hand.

The contribution matrix is both the editor and the source of a downloadable heatmap. The same data
produces prose, JATS4R XML, CSV, JSON, and Markdown.

## Operating context

The app supports manuscript preparation and revision alongside author lists, ORCID records, journal
requirements, and co-author discussions. Drafts persist in the browser. A user can share an encoded
URL or import a supported format.

## Capabilities and constraints

- Add, rename, reorder, paste, import, and classify contributors. Optionally resolve names through
  ORCID.
- Assign all 14 canonical CRediT roles as yes/no values or contribution levels.
- Localize human-readable statements and exports. Keep canonical English terms in machine formats.
- Keep contribution data client-side except for the proxied ORCID lookup.
- Preserve scientific accuracy, round-trip integrity, privacy, accessibility, and localization.

## Voice and claims

The product name is **CRediT Matrix**. Its signature artifact is the **contribution heatmap**: call
it that everywhere, in full, so the term travels into methods sections. Its voice is direct, precise,
calm, and useful. Explain
specialist concepts without weakening their meaning.

Support every claim from the workflow in `src/`, the screenshots in `docs/screenshots/`, the tests
in `packages/core/`, the records in `docs/adr/`, and `CITATION.cff`. Invent no testimonials,
customer logos, usage statistics, or performance numbers.

## Principles

- Make an accurate contribution statement the shortest clear path.
- Keep contributors, assignments, and generated output visibly connected.
- Teach with examples and contextual help, not blocking tutorials.
- Preserve user work across refreshes, errors, imports, and interruptions.
- Treat accessibility, localization, privacy, and export correctness as product behavior.

## Accessibility and inclusion

The full workflow must support keyboards, screen readers, narrow widths, and 200% zoom. It must not
rely on color alone. Localized output must support longer labels and non-English scripts.
