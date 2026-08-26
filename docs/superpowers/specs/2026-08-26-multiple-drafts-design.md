# Multiple drafts

One workspace per paper, not one per browser.

## Problem

The store persists a single draft under `credit-generator-state`. Starting a
second paper silently destroys the first. Anyone who writes more than one paper a
year hits this, and the loss is invisible until they look for the old one.

## Data model

State splits into per-draft data and global preferences.

```
Draft = {
  id: string
  title: string
  authors: Author[]
  inputMode: InputMode
  heatmapMonoColor: string
  outputLocale: string
  updatedAt: number
}
```

Top-level and global: `drafts: Record<string, Draft>`, `activeDraftId: string`,
`uiLocale`, `welcomeSeen`, and the ephemeral `welcomeOpen`.

The split follows one rule: anything describing *this paper* travels with the
draft, anything describing *this person's preferences* does not. `uiLocale` is the
clearest case — switching drafts must never change the language of the interface.
Theme already lives outside this store and stays there.

`title` is introduced by the DOI import work and moves into `Draft` here.

## Persistence

The persist version bumps and the existing `migrate` function goes away. The app
has no users yet, so a stored draft in the old single-draft shape is discarded on
load rather than migrated. Rehydrating into "no active draft" is still an
unrenderable state, so the store creates one empty active draft whenever the
persisted map is missing or empty.

## Live draft vs. stored drafts

The map is the storage shape, not the memory shape. Keeping `authors` inside
`drafts[activeDraftId]` would mean rewriting every component that reads the
store, so the live draft stays in the top-level fields it already occupies and
`drafts` holds the parked copies.

Two seams keep the two in step:

- `partialize` folds the live fields back into the active entry on the way out,
  so storage always sees one normalized map.
- `merge` unpacks the active entry back into the top-level fields on the way in,
  repairing every draft as it goes.

A switch parks the live draft in the map first, then applies the target. The
picker substitutes the live draft into its list rather than reading the map
copy, which is only as fresh as the last park.

## Actions

`createDraft(title?)`, `switchDraft(id)`, `renameDraft(id, title)`,
`duplicateDraft(id)`, `deleteDraft(id)`. Deleting the active draft switches to the
most recently updated remaining one, or creates a fresh empty draft when it was the
last. `reset` clears the active draft's contents; it does not delete other drafts.

Every mutation stamps `updatedAt` on the active draft, which gives the picker its
ordering for free.

## Limits

localStorage quota is the real failure mode: a few hundred contributors across
many drafts will exceed it, and a quota error mid-write can corrupt the persisted
blob. Two guards:

- A cap of 50 drafts, with a clear message on `createDraft` and `duplicateDraft`
  rather than a silent failure.
- The persist write is wrapped so a quota exception surfaces as a visible warning
  ("this draft could not be saved") instead of a console error nobody sees.

## UI

A drafts dropdown in `HeaderActions.tsx`: the list ordered by `updatedAt`, the
active one marked, and new / rename / duplicate / delete. Not a separate page and
not a sidebar — the workspace is the app, and the picker is a way back to it.

Delete asks for confirmation, because it is the one irreversible action here.

## Testing

- Store unit tests: create, switch, rename, duplicate, delete-active,
  delete-the-last-one, the 50-draft cap, `reset` leaving other drafts alone, and
  a `partialize` → `merge` round trip, which is where normalization can break.
- Rehydration tests: an empty persisted map and a stale-version blob both land
  on one empty active draft.
- One end-to-end test: build a draft, create a second, switch back, and assert the
  first draft's authors and heatmap colour both survived.

## Out of scope

Sync, sharing a draft list, and export/import of all drafts at once. Single-draft
sharing already exists through the share link.
