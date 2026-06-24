import type { Author } from "../author.js";
import { activeContributions, scoreToLevel } from "../author.js";

/** Escape the pipe character so role/name text can't break the Markdown table. */
function escapeCell(s: string): string {
  return s.replace(/\|/g, "\\|");
}

/**
 * Render the contributions as a Markdown table (Contributor → CRediT roles),
 * suitable for pasting into a README, GitHub issue, or manuscript draft.
 *
 * Lead-level roles are listed plainly; secondary/tertiary roles are annotated
 * with their level, matching the statement's `showLevels` behaviour.
 */
export function toMarkdown(authors: Author[]): string {
  const header = "| Contributor | CRediT roles |\n| --- | --- |";

  const rows = authors.map((author) => {
    const active = activeContributions(author);
    const roles =
      active.length === 0
        ? "—"
        : active
            .map((c) => {
              const level = scoreToLevel(c.score);
              return level === "lead" ? c.role : `${c.role} (${level})`;
            })
            .join(", ");
    return `| ${escapeCell(author.name)} | ${escapeCell(roles)} |`;
  });

  return [header, ...rows].join("\n");
}
