import { renderHook } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { useContributionStore } from "@/store/contribution-store";
import { useSettled } from "./use-settled";

/** Entrance animations are gated a frame late, on purpose; run that frame. */
async function flushFrame() {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
}

describe("useSettled", () => {
  it("stays false through the first painted frame, then settles", async () => {
    vi.spyOn(useContributionStore.persist, "hasHydrated").mockReturnValue(true);
    const { result } = renderHook(() => useSettled());

    expect(result.current).toBe(false);
    await flushFrame();
    expect(result.current).toBe(true);
  });

  it("waits for the restored draft, not merely for the mount", async () => {
    vi.spyOn(useContributionStore.persist, "hasHydrated").mockReturnValue(false);
    let finishHydration = () => {
      // Replaced by the hydration callback below.
    };
    vi.spyOn(useContributionStore.persist, "onFinishHydration").mockImplementation((callback) => {
      finishHydration = () => callback(useContributionStore.getState());
      return () => {
        // The test callback has no subscription to clean up.
      };
    });

    const { result } = renderHook(() => useSettled());

    // Contributors restored from localStorage land in a later render: settling
    // before they arrive would animate the whole draft on every reload.
    await flushFrame();
    expect(result.current).toBe(false);

    await act(async () => finishHydration());
    await flushFrame();
    expect(result.current).toBe(true);
  });
});
