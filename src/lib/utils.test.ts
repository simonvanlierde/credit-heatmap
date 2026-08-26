import { describe, expect, it, vi } from "vitest";
import { cn, download } from "./utils";

describe("cn", () => {
  it("lets a later Tailwind class win over an earlier one in the same group", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", undefined, ["font-medium"])).toBe("text-sm font-medium");
  });
});

describe("download", () => {
  it("clicks a named link and releases the object URL again", () => {
    const createObjectURL = vi.fn(() => "blob:credit/1");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      // jsdom would navigate; the assertions below read the element instead.
      expect(this.href).toBe("blob:credit/1");
      expect(this.download).toBe("credit-heatmap.svg");
    });

    download(new Blob(["<svg/>"], { type: "image/svg+xml" }), "credit-heatmap.svg");

    expect(click).toHaveBeenCalledTimes(1);
    // Not revoking leaks the blob for the life of the document.
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:credit/1");
  });
});
