import { createAuthor } from "@credit-generator/core";
import { beforeEach, describe, expect, it } from "vitest";
import { MAX_DRAFTS, useContributionStore } from "./contribution-store";

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

    /**
     * The version stays at 1 until launch, so MIGRATIONS is empty — but the
     * machinery is in place, because the first post-launch bump is exactly the
     * moment it is too late to add it. These pin the behaviour around an empty
     * chain so a future step slots in without rediscovering the contract.
     */
    it("runs a migration for an older version, even with no steps yet", () => {
      const migrate = useContributionStore.persist.getOptions().migrate;
      expect(migrate).toBeDefined();
      // No steps between 0 and 1, so the state passes through untouched.
      expect(migrate?.({ title: "kept" }, 0)).toEqual({ title: "kept" });
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
