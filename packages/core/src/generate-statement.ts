import type { Author } from "./author.js";
import { activeContributions, scoreToLevel } from "./author.js";
import { DEFAULT_ROLE_TRANSLATOR, type RoleTranslator } from "./credit-i18n/index.js";
import { DEFAULT_UI_TRANSLATOR, type UiTranslator } from "./credit-i18n/ui-strings.js";
import { CREDIT_ROLES } from "./credit-roles.js";

export type StatementFormat = "by-role" | "by-role-short" | "by-author" | "by-author-short";

export interface StatementOptions {
  format: StatementFormat;
  /**
   * When true, append the contribution level (Equal / Supporting) after each
   * role name (by-author formats) or contributor label (by-role formats)
   * whose score is not 0 or 100. Lead contributions stay unannotated.
   */
  showLevels?: boolean;
  /**
   * Localize displayed role names (e.g. for a non-English statement). Defaults
   * to identity. The "CRediT:" prefix stays English.
   */
  translateRole?: RoleTranslator;
  /**
   * Localize the "Acknowledgements:" prefix and the Equal/Supporting level
   * labels. Defaults to English.
   */
  translateUi?: UiTranslator;
  /**
   * When true (default), people marked as non-author contributors are credited
   * on a separate `Acknowledgements:` line. When false, everyone is listed
   * together on the single `CRediT:` line.
   */
  separateAcknowledgements?: boolean;
}

/**
 * Generate a CRediT author statement.
 *
 * Named authors are listed after a `CRediT:` prefix; people marked as non-author
 * contributors are credited on a second `Acknowledgements:` line — CRediT applies
 * to both (see NISO guidance). Either line is omitted when no one on that side has
 * contributions; the two lines are separated by a blank line.
 *
 * Four formats, matching the original Python app:
 *
 * `by-role`:
 *   "CRediT: Conceptualization: Jane A. Smith, Bob White; Data curation: Jane A. Smith; ..."
 *
 * `by-role-short`:
 *   "CRediT: Conceptualization: JAS, BW; Data curation: JAS; ..."
 *
 * `by-author`:
 *   "CRediT: Jane A Smith: Conceptualization, Data curation; Bob White: Investigation; ..."
 *
 * `by-author-short`:
 *   "CRediT: JAS: Conceptualization, Data curation; BW: Investigation; ..."
 */
export function generateStatement(authors: Author[], options: StatementOptions): string {
  const {
    format,
    showLevels = false,
    translateRole = DEFAULT_ROLE_TRANSLATOR,
    translateUi = DEFAULT_UI_TRANSLATOR,
    separateAcknowledgements = true,
  } = options;
  const useInitials = format === "by-author-short" || format === "by-role-short";
  const byRole = format === "by-role" || format === "by-role-short";

  const body = (people: Author[]): string =>
    byRole
      ? generateByRole(people, useInitials, showLevels, translateRole, translateUi)
      : generateByAuthor(people, useInitials, showLevels, translateRole, translateUi);

  // Combined: everyone (authors and non-authors) on one CRediT line.
  if (!separateAcknowledgements) {
    const allBody = body(authors);
    return allBody ? `CRediT: ${allBody}` : "";
  }

  // Split: named authors on the CRediT line, non-authors on Acknowledgements.
  const namedAuthors = authors.filter((a) => a.contributorType !== "non-author");
  const nonAuthors = authors.filter((a) => a.contributorType === "non-author");

  const lines: string[] = [];
  const creditBody = body(namedAuthors);
  if (creditBody) lines.push(`CRediT: ${creditBody}`);
  const ackBody = body(nonAuthors);
  if (ackBody) lines.push(`${translateUi("acknowledgements")}: ${ackBody}`);
  return lines.join("\n\n");
}

/** Annotate a role or contributor label with its non-lead level: "label (Equal)". */
function withLevel(label: string, score: number, translateUi: UiTranslator): string {
  const level = scoreToLevel(score);
  if (level === "lead") return label;
  const levelLabel = level === "equal" ? translateUi("equal") : translateUi("supporting");
  return `${label} (${levelLabel})`;
}

/** Body of a by-role statement (no `CRediT:`/`Acknowledgements:` prefix); "" if empty. */
function generateByRole(
  authors: Author[],
  useInitials: boolean,
  showLevels: boolean,
  translateRole: RoleTranslator,
  translateUi: UiTranslator,
): string {
  // Collect contributor labels per role, in author order. Keyed on the
  // canonical English role; localized only when emitting the line.
  const roleMap = new Map<string, string[]>();

  for (const author of authors) {
    const label = useInitials ? author.initials : author.name.replace(/\s+/g, " ").trim();
    for (const contrib of activeContributions(author)) {
      const list = roleMap.get(contrib.role) ?? [];
      list.push(showLevels ? withLevel(label, contrib.score, translateUi) : label);
      roleMap.set(contrib.role, list);
    }
  }

  if (roleMap.size === 0) return "";

  // Emit in canonical CRediT order, not first-author-encounter order, so the
  // statement matches the documented role sequence regardless of who contributed.
  const parts = CREDIT_ROLES.filter((r) => roleMap.has(r.name)).map(
    (r) => `${translateRole(r.name)}: ${(roleMap.get(r.name) ?? []).join(", ")}`,
  );

  return parts.join("; ");
}

/** Body of a by-author statement (no `CRediT:`/`Acknowledgements:` prefix); "" if empty. */
function generateByAuthor(
  authors: Author[],
  useInitials: boolean,
  showLevels: boolean,
  translateRole: RoleTranslator,
  translateUi: UiTranslator,
): string {
  const parts: string[] = [];

  for (const author of authors) {
    const active = activeContributions(author);
    if (active.length === 0) continue;

    const label = useInitials ? author.initials : author.name.replace(/\s+/g, " ").trim();

    const roleList = active.map((c) =>
      showLevels ? withLevel(translateRole(c.role), c.score, translateUi) : translateRole(c.role),
    );

    parts.push(`${label}: ${roleList.join(", ")}`);
  }

  if (parts.length === 0) return "";
  return parts.join("; ");
}
