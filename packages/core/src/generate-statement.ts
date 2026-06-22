import type { Author } from "./author.js";
import { activeContributions, scoreToLevel } from "./author.js";

export type StatementFormat = "by-role" | "by-author" | "by-author-short";

export interface StatementOptions {
  format: StatementFormat;
  /**
   * When true, append the contribution level (Lead / Secondary / Tertiary)
   * after each role name where the score is not 0 or 100.
   * Ignored for by-role format.
   */
  showLevels?: boolean;
}

/**
 * Generate a CRediT author statement.
 *
 * Three formats, matching the original Python app:
 *
 * `by-role`:
 *   "CRediT: Conceptualization: JAS, BW; Data curation: JAS; ..."
 *
 * `by-author`:
 *   "CRediT: Jane A Smith: Conceptualization, Data curation; Bob White: Investigation; ..."
 *
 * `by-author-short`:
 *   "CRediT: JAS: Conceptualization, Data curation; BW: Investigation; ..."
 */
export function generateStatement(authors: Author[], options: StatementOptions): string {
  const { format, showLevels = false } = options;

  if (format === "by-role") {
    return generateByRole(authors);
  }
  return generateByAuthor(authors, format === "by-author-short", showLevels);
}

function generateByRole(authors: Author[]): string {
  // Collect initials per role
  const roleMap = new Map<string, string[]>();

  for (const author of authors) {
    for (const contrib of activeContributions(author)) {
      const list = roleMap.get(contrib.role) ?? [];
      list.push(author.initials);
      roleMap.set(contrib.role, list);
    }
  }

  if (roleMap.size === 0) return "";

  const parts = Array.from(roleMap.entries()).map(([role, initials]) => `${role}: ${initials.join(", ")}`);

  return `CRediT: ${parts.join("; ")}`;
}

function generateByAuthor(authors: Author[], useInitials: boolean, showLevels: boolean): string {
  const parts: string[] = [];

  for (const author of authors) {
    const active = activeContributions(author);
    if (active.length === 0) continue;

    const label = useInitials ? author.initials : author.name.replace(/\s+/g, " ").trim();

    const roleList = active.map((c) => {
      if (!showLevels) return c.role;
      const level = scoreToLevel(c.score);
      if (level === "lead") return c.role;
      const levelLabel = level === "secondary" ? "Secondary" : "Tertiary";
      return `${c.role} (${levelLabel})`;
    });

    parts.push(`${label}: ${roleList.join(", ")}`);
  }

  if (parts.length === 0) return "";
  return `CRediT: ${parts.join("; ")}`;
}
