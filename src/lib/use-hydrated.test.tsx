import { render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useContributionStore } from "@/store/contribution-store";
import { PERSIST_KEY, PERSIST_VERSION } from "@/store/persist-meta";
import { useHydrated } from "./use-hydrated";

/** A field standing in for the title and add-contributor inputs. */
function Field() {
  const hydrated = useHydrated();
  return <input aria-label="field" readOnly={!hydrated} defaultValue="" />;
}

afterEach(() => {
  window.localStorage.clear();
});

describe("useHydrated", () => {
  it("holds a field read-only until the persisted draft has been restored", async () => {
    // Never hydrated yet, and the finish callback is what will release it.
    const hasHydrated = vi.spyOn(useContributionStore.persist, "hasHydrated").mockReturnValue(false);
    let release = () => {
      // Replaced by the hydration callback below.
    };
    const onFinish = vi.spyOn(useContributionStore.persist, "onFinishHydration").mockImplementation((callback) => {
      release = () => callback(useContributionStore.getState());
      return () => {
        // The test callback has no subscription to clean up.
      };
    });

    render(<Field />);
    // This is the window in which a keystroke used to be accepted and then
    // thrown away by the arriving draft.
    expect(screen.getByLabelText("field")).toHaveProperty("readOnly", true);

    await act(async () => release());
    expect(screen.getByLabelText("field")).toHaveProperty("readOnly", false);

    hasHydrated.mockRestore();
    onFinish.mockRestore();
  });

  it("is already released when hydration finished before the mount", () => {
    const hasHydrated = vi.spyOn(useContributionStore.persist, "hasHydrated").mockReturnValue(true);

    render(<Field />);
    expect(screen.getByLabelText("field")).toHaveProperty("readOnly", false);

    hasHydrated.mockRestore();
  });

  it("unsubscribes on unmount, so a late hydration cannot set state on a dead component", () => {
    vi.spyOn(useContributionStore.persist, "hasHydrated").mockReturnValue(false);
    const unsubscribe = vi.fn();
    vi.spyOn(useContributionStore.persist, "onFinishHydration").mockReturnValue(unsubscribe);

    render(<Field />).unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe("the hazard it guards", () => {
  it("refuses to save over the stored draft before the restore has happened", async () => {
    // The hazard is not merely a lost keystroke. Persist saves on every change,
    // so without the guard in `announcingStorage` an edit made before the
    // restore lands writes the *empty* initial state over the draft in storage,
    // and the rehydrate that follows reads that emptied value back. One early
    // keystroke could erase a saved paper.
    // Seeded raw: the store's own adapter would refuse this write too, which
    // is the behaviour under test.
    const stored = JSON.stringify({
      state: { activeDraftId: "d1", drafts: { d1: { id: "d1", title: "Restored paper", authors: [] } } },
      version: PERSIST_VERSION,
    });
    window.localStorage.setItem(PERSIST_KEY, stored);

    useContributionStore.getState().setTitle("Typed before hydration");

    expect(window.localStorage.getItem(PERSIST_KEY)).toBe(stored);

    // And the restore still brings the stored draft back intact.
    await useContributionStore.persist.rehydrate();
    expect(useContributionStore.getState().title).toBe("Restored paper");
  });
});
