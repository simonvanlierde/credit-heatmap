# Collecting roles from co-authors

Send each co-author a link, get their own row back.

## Problem

The slow part of a CRediT statement is not writing it, it is asking twelve people
what they did. Today the corresponding author guesses, or collects answers over
email and transcribes them.

The app already encodes a whole draft in a URL fragment. That is most of a
collection workflow; what is missing is a way to say *which row is yours* and a
rule for folding an answer back in.

## Approach

A claimed share link. `buildShareUrl(authors, { claim })` appends the claimed
contributor's id to the fragment: `#s=<payload>&c=<authorId>`.

Opening a claimed link shows a banner — "You're filling in Bob White's roles" —
and the co-author edits as normal. "Send back" regenerates a link with the same
claim, which they paste into a reply.

Importing a claimed link merges **only the claimed row**. Anything the co-author
changed about anyone else is discarded. This is the whole conflict story: no diff
screen, no per-cell review. It matches what actually happens (each person answers
for themselves) and it means a stale copy of the draft cannot wipe the rest.

## Components

### `mergeContributorRow` in core

Pure and independently testable:

```
mergeContributorRow(current: Author[], incoming: Author[], claimId: string):
  { authors: Author[]; merged: Author | null; unmatched: Author | null }
```

- Find the claimed author in `incoming` by id. If absent, the link is not a valid
  claim and nothing merges.
- Match that person into `current` by, in order: ORCID (normalized), then
  normalized name, then the claim id itself. ORCID first because a co-author may
  correct the spelling of their own name, and that correction should land rather
  than break the match.
- Replace the matched row's `contributions` wholesale, and take their `name` and
  `orcid` if they filled in a value where `current` had none.
- No match returns `unmatched`, so the UI can offer "add Bob White as a new
  contributor" instead of silently doing nothing.
- Everything else in `current` is returned untouched, in its original order.

### Share encoding

`share.ts` gains the claim parameter on the way out and returns it on the way in:
`decodeShareHash` returns `{ authors, claim }` instead of a bare array. The
existing unclaimed `#s=` links keep working and decode with `claim: null` — that
is a compatibility requirement, since links are already in the wild.

The claim id is opaque and unvalidated beyond a length check. A wrong or hostile
id simply fails to match and falls through to the unmatched path.

### UI

Three touch points:

- **Send:** a per-contributor "Ask this person" action that copies a claimed link.
- **Receive (their side):** the claim banner, naming the person and explaining that
  only their own row will be collected. Plus the "Send back" button.
- **Receive (your side):** paste a returned link into the import modal. On success,
  a confirmation naming who was merged: "Merged Bob White's roles."

## Testing

- Core unit tests for `mergeContributorRow`: ORCID match, name match, id fallback,
  a co-author who renamed themselves, a co-author who edited someone else's row
  (discarded), an unmatched person, an empty incoming list.
- `share.ts` round-trip tests including an old unclaimed link.
- One end-to-end test covering the full loop in a single browser: build a claimed
  link, load it, change the claimed row and another row, send back, import, and
  assert only the claimed row moved.

## Out of scope

Any server-side collection: no accounts, no invite emails, no draft stored
anywhere but the two browsers and the link between them. That is a different
product, and the link version is testable today.
