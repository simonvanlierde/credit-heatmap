# @credit-generator/core

The domain layer for the CRediT generator: a pure, framework-agnostic TypeScript
library for modelling author contributions and producing [CRediT (Contributor
Roles Taxonomy)](https://credit.niso.org/) statements and exports. One runtime
dependency (`zod`), no DOM/React/Node APIs at import time — the web app consumes it
directly in the browser.

## Domain model

An **`Author`** carries identity (`id`, parsed `firstName`/`middleName`/`surname`,
deduplicated `initials`, optional `orcid`) and a fixed array of 14 **`Contribution`**
entries — one per CRediT role.

A contribution stores a **0–100 integer score**, not a boolean, so the data model
stays independent of how the UI collects it (toggle, picker, or slider). The score
maps to a level on demand via `scoreToLevel()`:

| Score    | Level        |
| -------- | ------------ |
| `0`      | `none`       |
| `1–33`   | `supporting` |
| `34–66`  | `equal`      |
| `67–100` | `lead`       |

The non-zero tiers use NISO's optional degree-of-contribution vocabulary. The 14
roles are defined once in `credit-roles.ts` (official NISO UUID, descriptions, URLs)
as a `const` tuple, so role names narrow to the `CreditRoleName` union.

## Statements

`generateStatement(authors, { format, showLevels? })` renders three formats:

- **`by-role`** — `CRediT: Conceptualization: JS, BW; Software: JS; …`
- **`by-author`** — `CRediT: Jane Smith: Conceptualization, Software; …`
- **`by-author-short`** — same, using initials

With `showLevels`, non-lead roles are annotated, e.g. `Software (Equal)`. Only
non-zero contributions appear.

## Import / export

| Format      | Out               | In                                  |
| ----------- | ----------------- | ----------------------------------- |
| JATS4R XML  | `toJats4rXml`     | `fromJats4rXml` / `fromXmlDocument` |
| CSV         | `toCsv`           | `fromCsv`                           |
| JSON        | `toJson`          | `fromJson`                          |
| Markdown    | `toMarkdown`      | —                                   |
| Heatmap SVG | `buildHeatmapSvg` | —                                   |

`buildHeatmapSvg` returns a self-contained SVG string (system fonts, no embeds), so
the web app uses one source for live preview, SVG download, and canvas→PNG export.

**DOMParser:** `fromJats4rXml(xml)` uses the global `DOMParser` — native in the
browser. In Node, either provide one on `globalThis` (the tests use `linkedom` in
`src/test-setup.ts`) or parse the document yourself and call `fromXmlDocument(doc)`.
Malformed-XML detection relies on the browser emitting a `<parsererror>` element,
which `linkedom` does not replicate.

## Validation

`AuthorSchema` and `ContributionSchema` (Zod) validate at the trust boundary — e.g.
importing JSON. Scores are constrained to `0–100` integers and roles to known CRediT names.

## Testing

```sh
pnpm --filter @credit-generator/core test
```

Vitest (Node), with `linkedom` supplying a `DOMParser`. Suites cover parsing/initials
deduplication, statement formats, score→level boundaries, all import/export
round-trips, and the heatmap SVG.
