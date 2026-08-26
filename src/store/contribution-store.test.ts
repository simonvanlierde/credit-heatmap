import { createAuthor } from "@credit-generator/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestStorageFullAnnouncement } from "@/lib/announce";
import { MAX_DRAFTS, useContributionStore } from "./contribution-store";

vi.mock("@/lib/announce", () => ({ requestStorageFullAnnouncement: vi.fn() }));

const initial = useContributionStore.getState();

function store() {
  return useContributionStore.getState();
}

describe("contribution store", () => {
  beforeEach(() => {
    useContributionStore.setState(initial, true);
  });

  describe("title", () => {
    it("trims what it is given", () => {
      store().setTitle("  A study of studies  ");
      expect(store().title).toBe("A study of studies");
    });

    it("caps a pasted document so it cannot bloat the persisted draft", () => {
      store().setTitle("x".repeat(2000));
      expect(store().title).toHaveLength(500);
    });

    it("is draft data, so a reset clears it", () => {
      store().setTitle("A study of studies");
      store().addAuthor("Jane Smith");
      store().reset();
      expect(store().title).toBe("");
      expect(store().authors).toHaveLength(0);
    });

    it("survives a DOI import that carries no title, when cleared deliberately", () => {
      store().setTitle("An earlier import");
      store().setTitle("");
      expect(store().title).toBe("");
    });
  });

  describe("contributors", () => {
    it("returns the new id, and null for a name with nothing to parse", () => {
      const id = store().addAuthor("Jane Smith");
      expect(id).toBeTruthy();
      expect(store().authors[0]?.name).toBe("Jane Smith");
      expect(store().addAuthor("   ")).toBeNull();
      expect(store().authors).toHaveLength(1);
    });

    it("keeps an ORCID iD given alongside the name", () => {
      store().addAuthor("Jane Smith", "0000-0002-1825-0097");
      expect(store().authors[0]?.orcid).toBe("0000-0002-1825-0097");
    });

    it("rejects a load of more contributors than a draft can hold", () => {
      const authors = Array.from({ length: 201 }, (_, i) => createAuthor(`Author ${i}`));
      expect(() => store().loadAuthors(authors)).toThrow(/at most/);
    });
  });

  describe("markers", () => {
    it("toggles each marker independently", () => {
      const id = store().addAuthor("Jane Smith");
      if (!id) throw new Error("expected an author");

      store().setAuthorMarker(id, "equalContribution", true);
      expect(store().authors[0]?.equalContribution).toBe(true);
      expect(store().authors[0]?.corresponding).toBe(false);

      store().setAuthorMarker(id, "corresponding", true);
      store().setAuthorMarker(id, "equalContribution", false);
      expect(store().authors[0]?.equalContribution).toBe(false);
      expect(store().authors[0]?.corresponding).toBe(true);
    });

    it("keeps the markers through an unrelated edit", () => {
      // Every mutation rebuilds the list through `normalizeAuthors`; a field it
      // forgets to carry is silently lost on the next keystroke.
      const id = store().addAuthor("Jane Smith");
      if (!id) throw new Error("expected an author");
      store().setAuthorMarker(id, "corresponding", true);

      store().addAuthor("Bob White");
      store().updateAuthorName(id, "Jane A. Smith");

      expect(store().authors[0]?.corresponding).toBe(true);
    });

    it("ignores a marker set on an unknown contributor", () => {
      store().addAuthor("Jane Smith");
      expect(() => store().setAuthorMarker("no-such-id", "corresponding", true)).not.toThrow();
      expect(store().authors[0]?.corresponding).toBe(false);
    });
  });

  describe("drafts", () => {
    it("starts with one active draft", () => {
      expect(store().activeDraftId).toBeTruthy();
    });

    it("parks the current work when switching away, and restores it coming back", () => {
      const first = store().activeDraftId;
      store().addAuthor("Jane Smith");
      store().setTitle("First paper");
      store().setHeatmapMonoColor("#123456");

      const second = store().createDraft();
      if (!second) throw new Error("expected a new draft");
      expect(store().authors).toHaveLength(0);
      expect(store().title).toBe("");

      store().addAuthor("Bob White");
      store().switchDraft(first);

      expect(store().title).toBe("First paper");
      expect(store().authors[0]?.name).toBe("Jane Smith");
      // Output settings travel with the draft; the interface language does not.
      expect(store().heatmapMonoColor).toBe("#123456");

      store().switchDraft(second);
      expect(store().authors[0]?.name).toBe("Bob White");
    });

    it("leaves the interface language alone across a switch", () => {
      store().setUiLocale("nl");
      const second = store().createDraft();
      if (!second) throw new Error("expected a new draft");
      expect(store().uiLocale).toBe("nl");
    });

    it("renames the live draft and an inactive one alike", () => {
      const first = store().activeDraftId;
      const second = store().createDraft();
      if (!second) throw new Error("expected a new draft");

      store().renameDraft(second, "  Second paper  ");
      store().renameDraft(first, "First paper");

      expect(store().title).toBe("Second paper");
      store().switchDraft(first);
      expect(store().title).toBe("First paper");
    });

    it("duplicates a draft with fresh contributor ids", () => {
      store().addAuthor("Jane Smith");
      store().setTitle("Original");
      const source = store().activeDraftId;

      const copy = store().duplicateDraft(source);
      if (!copy) throw new Error("expected a copy");
      // A duplicate is made in the background: you keep working where you were.
      expect(store().activeDraftId).toBe(source);

      store().switchDraft(copy);
      expect(store().title).toBe("Original");
      expect(store().authors[0]?.name).toBe("Jane Smith");
      // Two drafts sharing a contributor id would make every lookup ambiguous.
      store().switchDraft(source);
      const originalId = store().authors[0]?.id;
      store().switchDraft(copy);
      expect(store().authors[0]?.id).not.toBe(originalId);
    });

    it("lands on the most recent survivor when the active draft is deleted", () => {
      const first = store().activeDraftId;
      store().setTitle("First paper");
      const second = store().createDraft();
      if (!second) throw new Error("expected a new draft");
      store().setTitle("Second paper");

      store().deleteDraft(second);

      expect(store().activeDraftId).toBe(first);
      expect(store().title).toBe("First paper");
    });

    it("always leaves one draft behind, even deleting the last", () => {
      const only = store().activeDraftId;
      store().addAuthor("Jane Smith");

      store().deleteDraft(only);

      expect(store().activeDraftId).toBeTruthy();
      expect(store().authors).toHaveLength(0);
      expect(Object.keys(store().drafts)).toHaveLength(1);
    });

    it("deleting an inactive draft leaves the workspace alone", () => {
      store().setTitle("Keep me");
      const active = store().activeDraftId;
      const other = store().createDraft();
      if (!other) throw new Error("expected a new draft");
      store().switchDraft(active);

      store().deleteDraft(other);

      expect(store().activeDraftId).toBe(active);
      expect(store().title).toBe("Keep me");
    });

    it("refuses to go past the cap rather than failing to save", () => {
      for (let i = 1; i < MAX_DRAFTS; i += 1) {
        expect(store().createDraft()).toBeTruthy();
      }
      expect(Object.keys(store().drafts)).toHaveLength(MAX_DRAFTS);
      expect(store().createDraft()).toBeNull();
      expect(store().duplicateDraft(store().activeDraftId)).toBeNull();
    });

    it("empties the draft you are in without touching the others", () => {
      store().addAuthor("Jane Smith");
      store().setTitle("First paper");
      const first = store().activeDraftId;
      const second = store().createDraft();
      if (!second) throw new Error("expected a new draft");
      store().addAuthor("Bob White");

      store().reset();

      expect(store().authors).toHaveLength(0);
      store().switchDraft(first);
      expect(store().authors[0]?.name).toBe("Jane Smith");
    });
  });

  describe("claim lock", () => {
    it("persists the claim on the draft across a switch and back", () => {
      store().addAuthor("Jane Smith");
      const jane = store().authors[0];
      if (!jane) throw new Error("expected an author");
      const home = store().activeDraftId;
      store().setClaim({ contributorId: jane.id, sourceDraftId: "src-1" });
      store().createDraft();
      expect(store().claim).toBeNull();
      store().switchDraft(home);
      expect(store().claim).toEqual({ contributorId: jane.id, sourceDraftId: "src-1" });
    });

    it("locks every row but the claimed one, and the list shape entirely", () => {
      store().addAuthor("Jane Smith");
      store().addAuthor("Bob White");
      const [jane, bob] = store().authors;
      if (!(jane && bob)) throw new Error("expected two authors");
      store().setClaim({ contributorId: bob.id, sourceDraftId: "src-1" });

      store().toggleContribution(jane.id, 0);
      expect(store().authors[0]?.contributions[0]?.score).toBe(0);
      store().toggleContribution(bob.id, 0);
      expect(store().authors[1]?.contributions[0]?.score).toBe(100);

      expect(store().addAuthor("Carol Davis")).toBeNull();
      store().removeAuthor(jane.id);
      store().moveAuthor(0, 1);
      expect(store().authors.map((a) => a.name)).toEqual(["Jane Smith", "Bob White"]);
      expect(store().updateAuthorName(jane.id, "Renamed")).toBe(false);
      expect(store().updateAuthorName(bob.id, "Bob B. White")).toBe(true);
    });

    it("refuses a whole-roster load, so a late import cannot overwrite a claim", () => {
      store().addAuthor("Jane Smith");
      const jane = store().authors[0];
      if (!jane) throw new Error("expected an author");
      const replacement = [createAuthor("Bob White")];

      store().loadAuthors(replacement);
      expect(store().authors.map((a) => a.name)).toEqual(["Bob White"]);

      store().setClaim({ contributorId: store().authors[0]?.id ?? "", sourceDraftId: "src-1" });
      store().loadAuthors([createAuthor("Carol Davis")]);
      expect(store().authors.map((a) => a.name)).toEqual(["Bob White"]);
    });

    it("clearClaimFor unlocks the active draft", () => {
      store().addAuthor("Jane Smith");
      const jane = store().authors[0];
      if (!jane) throw new Error("expected an author");
      store().setClaim({ contributorId: jane.id, sourceDraftId: "src-1" });
      store().clearClaimFor(store().activeDraftId);
      expect(store().claim).toBeNull();
      expect(store().addAuthor("Bob White")).not.toBeNull();
    });
  });

  describe("first-draft id", () => {
    it("replaces the SSR-constant draft-1 id with a UUID at hydration", async () => {
      await useContributionStore.persist.rehydrate();
      expect(store().activeDraftId).not.toBe("draft-1");
    });
  });

  describe("persistence", () => {
    it("persists draft data and the interface language, but nothing ephemeral", () => {
      // `welcomeOpen` is deliberately absent: a re-opened "How it works" must
      // not survive a reload as a fake first run.
      const options = useContributionStore.persist.getOptions();
      const persisted = options.partialize?.(store()) ?? {};
      // Storage sees the normalized shape: drafts in one map, plus the two
      // preferences that belong to the person rather than to any paper.
      expect(Object.keys(persisted).sort()).toEqual(["activeDraftId", "drafts", "uiLocale", "welcomeSeen"]);
    });

    it("normalizes legacy Portuguese and Chinese locale aliases on load", () => {
      // Owned by the repair pass in `merge`, which runs on every load, not by
      // a migration step: a version bump is not required for a legacy alias.
      const options = useContributionStore.persist.getOptions();
      expect(
        options.merge?.(
          {
            uiLocale: "pt",
            activeDraftId: "paper",
            drafts: { paper: { outputLocale: "zh" } },
          },
          store(),
        ),
      ).toMatchObject({
        uiLocale: "pt-PT",
        drafts: { paper: { outputLocale: "zh-Hans" } },
      });
    });

    it("discards a draft from a newer version rather than guessing", () => {
      // A rolled-back deploy or a second tab on an older bundle. There is no
      // way to walk a schema backwards, so a fresh start beats a half-read one.
      const migrate = useContributionStore.persist.getOptions().migrate;
      expect(migrate?.({ title: "from the future" }, 99)).toEqual({});
    });

    it("discards a persisted value that is not an object", () => {
      const migrate = useContributionStore.persist.getOptions().migrate;
      expect(migrate?.(null, 0)).toEqual({});
      expect(migrate?.("corrupted", 0)).toEqual({});
    });

    /**
     * Repair runs on every load, not only on a version change: a draft can be
     * malformed while its version is current (hand-edited storage, a
     * half-written value from a crashed tab). `normalizeAuthors` throws on a
     * contributor it cannot rebuild and runs on every list edit, so one bad row
     * would make add/remove/rename all throw uncaught.
     */
    it("says so once when the browser refuses to save", () => {
      const storage = useContributionStore.persist.getOptions().storage;
      if (!storage) throw new Error("expected a storage adapter");
      // Writes are refused before the restore lands; this is about the ones
      // after it, where a full quota is the realistic failure.
      const hydrated = vi.spyOn(useContributionStore.persist, "hasHydrated").mockReturnValue(true);
      // Spy on the instance, not Storage.prototype: the test environment's
      // localStorage is a plain in-memory stand-in (see src/test-setup.ts).
      const full = vi.spyOn(globalThis.localStorage, "setItem").mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });

      const state = { drafts: {}, activeDraftId: "a", uiLocale: "en" as const, welcomeSeen: true };
      storage.setItem("credit-generator-state", { state, version: 1 });
      storage.setItem("credit-generator-state", { state, version: 1 });

      // Once per run of failures, not once per keystroke.
      expect(requestStorageFullAnnouncement).toHaveBeenCalledTimes(1);
      full.mockRestore();
      hydrated.mockRestore();
    });

    it("survives a normalize/denormalize round trip", () => {
      // The one contract that matters here: what partialize writes, merge must
      // read back as the same live workspace.
      const options = useContributionStore.persist.getOptions();
      store().addAuthor("Jane Smith");
      store().setTitle("First paper");
      const other = store().createDraft();
      if (!other) throw new Error("expected a new draft");
      store().setTitle("Second paper");

      const written = JSON.parse(JSON.stringify(options.partialize?.(store())));
      const restored = options.merge?.(written, initial) as typeof initial;

      expect(restored.title).toBe("Second paper");
      expect(Object.keys(restored.drafts)).toHaveLength(2);
      expect(
        Object.values(restored.drafts)
          .map((draft) => draft.title)
          .sort(),
      ).toEqual(["First paper", "Second paper"]);
    });

    it("falls back to one empty draft when storage holds none", () => {
      const merge = useContributionStore.persist.getOptions().merge;
      const merged = merge?.({ uiLocale: "nl" }, initial) as typeof initial;
      expect(Object.keys(merged.drafts)).toHaveLength(1);
      expect(merged.activeDraftId).toBeTruthy();
      expect(merged.authors).toHaveLength(0);
      expect(merged.uiLocale).toBe("nl");
    });

    it("drops contributors that would throw on the next edit", () => {
      const merge = useContributionStore.persist.getOptions().merge;
      const good = createAuthor("Jane A. Smith");
      const merged = merge?.(
        {
          activeDraftId: "d1",
          drafts: { d1: { authors: [{ ...good, name: "A".repeat(600) }, { ...good, name: "12345" }, good] } },
        },
        initial,
      ) as { authors: { name: string }[] };

      expect(merged.authors.map((a) => a.name)).toEqual(["Jane A. Smith"]);
    });

    it("clears an unreadable persisted value rather than failing hydration forever", () => {
      // A truncated write from a crashed tab. Left in place, zustand's
      // JSON.parse would reject hydration on every visit: hasHydrated never
      // flips, the inputs stay readOnly, and the write guard drops every save.
      const storage = useContributionStore.persist.getOptions().storage;
      if (!storage) throw new Error("expected a storage adapter");
      globalThis.localStorage.setItem("credit-generator-state", "{truncated");

      expect(storage.getItem("credit-generator-state")).toBeNull();
      // Removed, not just skipped: the next save must not sit behind it.
      expect(globalThis.localStorage.getItem("credit-generator-state")).toBeNull();
    });

    it("drops a malformed iD or contributions list, not the contributor", () => {
      // createAuthor throws on a bad ORCID and iterates contributions, and it
      // runs inside the reducer on every list edit: a field that would throw
      // there must cost the field, never the workspace.
      const merge = useContributionStore.persist.getOptions().merge;
      const good = createAuthor("Jane A. Smith");
      const merged = merge?.(
        {
          activeDraftId: "d1",
          drafts: {
            d1: {
              authors: [
                { ...good, orcid: "not-an-orcid" },
                { ...createAuthor("Bob White"), contributions: "corrupt" },
                { ...createAuthor("Carol Davis"), contributions: [null, { role: "Software", score: 100 }] },
              ],
            },
          },
        },
        initial,
      ) as typeof initial;

      expect(merged.authors.map((a) => a.name)).toEqual(["Jane A. Smith", "Bob White", "Carol Davis"]);
      expect(merged.authors[0]?.orcid).toBeUndefined();
      expect(merged.authors[1]?.contributions).toEqual([]);
      expect(merged.authors[2]?.contributions).toEqual([{ role: "Software", score: 100 }]);
    });

    it("leaves a persisted draft alone when nothing is wrong with it", () => {
      const merge = useContributionStore.persist.getOptions().merge;
      const authors = [createAuthor("Jane A. Smith"), createAuthor("Bob White")];
      const merged = merge?.({ activeDraftId: "d1", drafts: { d1: { authors } } }, initial) as {
        authors: { name: string }[];
      };
      expect(merged.authors.map((a) => a.name)).toEqual(["Jane A. Smith", "Bob White"]);
    });
  });
});
