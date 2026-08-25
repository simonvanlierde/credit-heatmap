import type { Author } from "../author.js";
import { activeContributions, scoreToLevel } from "../author.js";
import { DEFAULT_ROLE_TRANSLATOR, type RoleTranslator } from "../credit-i18n/index.js";
import { DEFAULT_UI_TRANSLATOR, type UiTranslator } from "../credit-i18n/ui-strings.js";

/** Render untrusted text literally inside a Markdown table cell. */
function escapeCell(s: string): string {
  return s
    .replace(/\r?\n|\r/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\\/g, "\\\\")
    .replace(/([|[\]`*_!])/g, "\\$1");
}

/**
 * Render the contributions as a Markdown table (Contributor → CRediT roles),
 * suitable for pasting into a README, GitHub issue, or manuscript draft.
 *
 * Lead-level roles are listed plainly; equal/supporting roles are annotated
 * with their level, matching the statement's `showLevels` behaviour.
 */
export function toMarkdown(
  authors: Author[],
  translateRole: RoleTranslator = DEFAULT_ROLE_TRANSLATOR,
  translateUi: UiTranslator = DEFAULT_UI_TRANSLATOR,
): string {
  const header = "| Contributor | CRediT roles |\n| --- | --- |";

  const rows = authors.map((author) => {
    const active = activeContributions(author);
    const roles =
      active.length === 0
        ? "—"
        : active
            .map((c) => {
              const role = translateRole(c.role);
              const level = scoreToLevel(c.score);
              if (level === "lead") return role;
              const levelLabel = level === "equal" ? translateUi("equal") : translateUi("supporting");
              return `${role} (${levelLabel})`;
            })
            .join(", ");
    return `| ${escapeCell(author.name)} | ${escapeCell(roles)} |`;
  });

  return [header, ...rows].join("\n");
}
