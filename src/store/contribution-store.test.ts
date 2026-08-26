import { createAuthor } from "@credit-generator/core";
import { beforeEach, describe, expect, it } from "vitest";
import { useContributionStore } from "./contribution-store";

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

  describe("persistence", () => {
    it("persists draft data and the interface language, but nothing ephemeral", () => {
      // `welcomeOpen` is deliberately absent: a re-opened "How it works" must
      // not survive a reload as a fake first run.
      const options = useContributionStore.persist.getOptions();
      const persisted = options.partialize?.(store()) ?? {};
      expect(Object.keys(persisted).sort()).toEqual([
        "authors",
        "heatmapMonoColor",
        "inputMode",
        "outputLocale",
        "title",
        "uiLocale",
        "welcomeSeen",
      ]);
    });

    it("carries no migration, so an older persisted shape is discarded", () => {
      // The app has no users yet. When that changes, this test should be
      // replaced by migration tests rather than deleted.
      expect(useContributionStore.persist.getOptions().migrate).toBeUndefined();
    });
  });
});
