import { useEffect, useRef, useState } from "react";

export type CopyStatus = "idle" | "copied" | "error";

/** Copy text to the clipboard, exposing a status that resets to "idle" after 2s. */
export function useCopyStatus(): [CopyStatus, (text: string) => Promise<void>] {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Clear any pending reset on unmount so it can't setState on a dead component.
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    // Reset the window on each copy so rapid successive copies don't clear early.
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), 2000);
  }

  return [status, copy];
}
