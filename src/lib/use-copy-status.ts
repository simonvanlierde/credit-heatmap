import { useState } from "react";

export type CopyStatus = "idle" | "copied" | "error";

/** Copy text to the clipboard, exposing a status that resets to "idle" after 2s. */
export function useCopyStatus(): [CopyStatus, (text: string) => Promise<void>] {
  const [status, setStatus] = useState<CopyStatus>("idle");

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 2000);
  }

  return [status, copy];
}
