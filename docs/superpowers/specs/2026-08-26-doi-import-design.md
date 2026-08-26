# DOI import

Paste a DOI, get the contributor list.

## Problem

Every draft starts by typing an author list that already exists in a published
record. The ORCID lookup resolves one person at a time, from an iD the user must
find first. A DOI is the one identifier an author always has to hand.

## Scope

Resolving a DOI fills three things: the contributor names, their ORCID iDs where
the record carries them, and the work's title. It does not fill the grid. A
minority of Crossref records carry contributor roles, and patchy prefill reads as
a broken feature rather than a helpful one.

## Approach

Crossref's REST API is public, needs no key, and returns authors with ORCID iDs.
The call goes through a server route rather than the browser.

`/api/doi` mirrors `/api/orcid` exactly: the same rate limiter, the same
`{ ok, code, error }` envelope, the same "codes are API surface, add rather than
rename" contract. Two reasons to proxy rather than call Crossref from the page:
the Content-Security-Policy in `next.config.ts` keeps `connect-src 'self'`, and
the polite-pool `mailto` parameter belongs on the server, not in every client.

## Components

### `packages/core/src/doi-lookup.ts`

Beside `orcid-lookup.ts`, same shape.

- `DOI_INPUT_REGEX` accepts a bare DOI (`10.\d{4,9}/\S+`) or a `https://doi.org/`
  URL. `normalizeDoi` strips the resolver prefix and lowercases the prefix half.
- `lookupDoiWork(doi, fetcher = fetch)` returns
  `{ ok: true, title, authors: Array<{ name, orcid? }> }` or
  `{ ok: false, status, code, error }`.
- Codes: `INVALID_DOI` (400), `NOT_FOUND` (404), `NO_AUTHORS` (404, the record
  resolved but lists no contributors), `UNAVAILABLE` (502).
- A `AbortSignal.timeout` deadline, as in `lookupOrcidPerson`.
- The Crossref response is parsed with Zod, not trusted: `message.title` is an
  array, `message.author` entries carry `given`/`family`/`name`/`ORCID` in
  inconsistent combinations, and `ORCID` arrives as a URL. Entries with no usable
  name are dropped; an entry whose `ORCID` fails `isValidOrcid` keeps the name and
  drops the iD rather than failing the import.
- `MAX_AUTHORS` still applies: a record listing more contributors than the cap is
  rejected with a clear message, not silently truncated.

### `src/app/api/doi/route.ts`

A copy of the ORCID route with the DOI validator and `lookupDoiWork` swapped in.
Rate-limit before reading the body, as that route now does.

### Store

`title: string` joins the persisted state, with `setTitle`. It is draft data, so
`reset` clears it. Persist version bumps; the migration only has to default the
new key to `""`.

The title has two consumers beyond display: the export filename, and the drafts
feature specced separately, which reuses this field rather than adding its own.

### UI

A DOI field in `ImportModal.tsx`, alongside the existing import sources. Submitting
resolves, then calls `loadAuthors` and `setTitle`. The modal already owns the
"replace the current draft" confirmation; DOI import routes through it unchanged.

Failure copy is localized from the code, following the ORCID pattern, including the
existing "the connection is gone" message for an offline lookup.

## Testing

- Core unit tests over recorded Crossref fixtures: a normal article, a record with
  no ORCIDs, one with a mixed `given`/`family` and bare `name` entry, one with an
  invalid ORCID checksum, one with no authors, and a malformed body.
- Route tests for the rate limit, the invalid DOI, and the pass-through.
- One end-to-end test that mocks `/api/doi` and asserts the contributor list and
  title land in the workspace.

## Out of scope

DataCite (datasets and preprints) and affiliation import. Both fit the same route
later; neither is needed to make the first paste useful.
