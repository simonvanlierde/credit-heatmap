# Product

## Platform

web

## Users

Researchers and research teams preparing manuscripts. They use the CRediT Contributor Roles Taxonomy
to agree on, record, and export each contributor's work.

## Product Purpose

CRediT Generator turns contributor names and role assignments into a manuscript-ready statement and
submission files. Teams do not need to format the taxonomy by hand.

## Positioning

The contribution matrix is both the editor and the source of a downloadable heatmap. The same data
produces prose, JATS4R XML, CSV, JSON, and Markdown.

## Operating Context

The product supports manuscript preparation and revision alongside author lists, ORCID records,
journal requirements, and co-author discussions. Drafts persist locally. Users can share an encoded
URL or import a supported format.

## Capabilities and Constraints

- Add, rename, reorder, paste, import, and classify contributors. Optionally resolve names through
  ORCID.
- Assign all 14 canonical CRediT roles as yes/no values or contribution levels.
- Localize human-readable statements and exports. Keep canonical English terms in machine formats.
- Keep contribution data client-side except for the proxied ORCID lookup.
- Preserve scientific accuracy, round-trip integrity, privacy, accessibility, and localization.

## Brand Commitments

The product name is CRediT Generator. Its voice is direct, precise, calm, and useful. Explain
specialist concepts without weakening their meaning or making unsupported claims.

## Evidence on Hand

Evidence comes from the workflow in `src/`, screenshots in `docs/screenshots/`, tests in
`packages/core/`, records in `docs/adr/`, and `CITATION.cff`. Do not invent testimonials, customer
logos, usage statistics, or performance claims.

## Product Principles

- Make an accurate contribution statement the shortest clear path.
- Keep contributors, assignments, and generated output visibly connected.
- Teach with examples and contextual help, not blocking tutorials.
- Preserve user work across refreshes, errors, imports, and interruptions.
- Treat accessibility, localization, privacy, and export correctness as product behavior.

## Accessibility & Inclusion

The full workflow must support keyboards, screen readers, narrow widths, and 200% zoom. It must not
rely on color alone. Localized output must support longer labels and non-English scripts.
