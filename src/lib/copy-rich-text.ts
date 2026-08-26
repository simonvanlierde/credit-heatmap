/**
 * Copy one payload to the clipboard in two flavours at once: HTML for editors
 * that accept rich text, and plain text for everything else. The recipient's
 * application picks; pasting into Word keeps the bold labels, pasting into a
 * terminal or a plain-text field gets the same words without markup.
 *
 * Falls back to a plain-text write wherever `ClipboardItem` is missing or the
 * rich write is refused, so the copy button never fails for lack of the nicer
 * format.
 */
export async function copyRichText(text: string, html: string): Promise<void> {
  if (typeof ClipboardItem === "function" && typeof navigator.clipboard?.write === "function") {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      return;
    } catch {
      /* fall through to the plain-text write below */
    }
  }
  await navigator.clipboard.writeText(text);
}
