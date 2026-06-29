# @credit-generator/core

The domain layer for the CRediT generator: a pure, framework-agnostic TypeScript
library for modelling author contributions and producing [CRediT (Contributor
Roles Taxonomy)](https://credit.niso.org/) statements and exports.

It has a single runtime dependency (`zod`) and no DOM, React, or Node-only APIs at
import time. The web app consumes it directly in the browser.

## Domain model

An **`Author`** carries identity (`id`, parsed `firstName`/`middleName`/`surname`,
deduplicated `initials`, optional `orcid`) and a fixed array of 14
**`Contribution`** entries — one per CRediT role.

A contribution stores a **0–100 integer score** rather than a boolean. Storing a
continuous score keeps the data model independent of how the UI happens to collect
it (a toggle, a 4-level picker, or a slider are all presentation concerns). The
score maps to a level on demand:

| Score    | Level        |
| -------- | ------------ |
| `0`      | `none`       |
| `1–33`   | `supporting` |
| `34–66`  | `equal`      |
| `67–100` | `lead`       |

The non-zero tiers use NISO's optional degree-of-contribution vocabulary
(lead / equal / supporting). See `scoreToLevel()`. The 14 roles are defined once in
`credit-roles.ts` with their official NISO `id` (role UUID), descriptions, and URLs,
and exposed as a `const` tuple so role names narrow to the `CreditRoleName` union.

## Statements

`generateStatement(authors, { format, showLevels? })` renders three formats:

- **`by-role`** — `CRediT: Conceptualization: JS, BW; Software: JS; …`
- **`by-author`** — `CRediT: Jane Smith: Conceptualization, Software; …`
- **`by-author-short`** — uses initials instead of full names

With `showLevels`, non-lead roles are annotated, e.g. `Software (Equal)`.
Only non-zero contributions appear.

## Import / export

| Format             | Out             | In                              |
| ------------------ | --------------- | ------------------------------- |
| JATS4R XML         | `toJats4rXml`   | `fromJats4rXml` / `fromXmlDocument` |
| CSV                | `toCsv`         | `fromCsv`                       |
| JSON               | `toJson`        | `fromJson`                      |
| Heatmap SVG        | `buildHeatmapSvg` | —                             |

`buildHeatmapSvg` returns a self-contained SVG string (system fonts, no embeds), so
the web app uses one source for live preview, SVG download, and canvas→PNG export.

### DOMParser note

`fromJats4rXml(xml)` uses the global `DOMParser` — native in the browser. In Node
there is no built-in `DOMParser`, so either provide one on `globalThis` (the test
suite does this with `linkedom` in `src/test-setup.ts`) or parse the document
yourself and call `fromXmlDocument(doc)`. Malformed-XML detection relies on the
browser emitting a `<parsererror>` element, which `linkedom` does not replicate.

## Validation

`AuthorSchema` and `ContributionSchema` (Zod) validate data at the trust boundary —
e.g. when importing JSON. Scores are constrained to `0–100` integers and roles to
the known CRediT names.

## Testing

```sh
pnpm --filter @credit-generator/core test
```

Vitest in a Node environment, with `linkedom` supplying a `DOMParser`. Suites cover
parsing/initials deduplication, statement formats, the score→level boundaries, all
import/export round-trips, and the heatmap SVG.
