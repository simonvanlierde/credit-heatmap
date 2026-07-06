import { useEffect, useRef, useState } from "react";
import { announce } from "@/lib/announce";

export type CopyStatus = "idle" | "copied" | "error";

/**
 * Copy text to the clipboard, exposing a status that resets to "idle" after 2s.
 * The outcome is also announced to assistive tech; pass `labels` to tailor the
 * spoken text to what was copied (defaults to a generic "Copied to clipboard").
 */
export function useCopyStatus(labels?: {
  copied?: string;
  error?: string;
}): [CopyStatus, (text: string) => Promise<void>] {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Clear any pending reset on unmount so it can't setState on a dead component.
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
      announce(labels?.copied ?? "Copied to clipboard");
    } catch {
      setStatus("error");
      announce(labels?.error ?? "Copy failed", { assertive: true });
    }
    // Reset the window on each copy so rapid successive copies don't clear early.
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), 2000);
  }

  return [status, copy];
}
