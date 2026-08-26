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

## Migration

Persist version 7. The migration wraps whatever v6 held into a single draft, gives
it a generated id, makes it active, and stamps `updatedAt`. An untitled draft keeps
`title: ""`; the UI renders the fallback label, so no fake title is written into
the data.

The existing v0–v6 fixups run before the wrap, unchanged. A store that arrives with
no authors still produces one empty active draft — the app must never rehydrate into
"no active draft", which would be an unrenderable state.

## Selectors

Every component reads authors through the store today. Rather than rewrite each
call site, the store exposes derived accessors — `authors`, `inputMode`,
`outputLocale`, `heatmapMonoColor` — that read from the active draft, and the
existing mutators write to the active draft. Component churn stays near zero, and
the drafts map stays the single source of truth.

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
  delete-the-last-one, the 50-draft cap, and `reset` leaving other drafts alone.
- Migration tests from a realistic v6 blob and from an empty one.
- One end-to-end test: build a draft, create a second, switch back, and assert the
  first draft's authors and heatmap colour both survived.

## Out of scope

Sync, sharing a draft list, and export/import of all drafts at once. Single-draft
sharing already exists through the share link.
