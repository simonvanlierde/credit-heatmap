import type { Author } from "./author.js";
import { hasContributions } from "./author.js";
import type { CreditRoleName } from "./credit-roles.js";

export type ValidationLevel = "warning" | "info";

export interface ValidationIssue {
  level: ValidationLevel;
  message: string;
}

/** Roles most journals expect to be assigned to at least one contributor. */
const EXPECTED_ROLES: CreditRoleName[] = ["Conceptualization", "Writing – original draft"];

/**
 * Check a set of authors for common CRediT statement problems, mirroring the
 * sanity checks an editor or submission system would run.
 *
 * Pure and side-effect free — returns an ordered list of issues (empty when the
 * statement looks complete). Returns nothing for an empty author list, since
 * "no authors yet" is a starting state rather than a mistake.
 */
export function validateContributions(authors: Author[]): ValidationIssue[] {
  if (authors.length === 0) return [];

  const issues: ValidationIssue[] = [];

  for (const author of authors) {
    if (!hasContributions(author)) {
      issues.push({
        level: "warning",
        message: `${author.name || "An author"} has no assigned CRediT roles.`,
      });
    }
  }

  const assigned = new Set<string>();
  for (const author of authors) {
    for (const contribution of author.contributions) {
      if (contribution.score > 0) assigned.add(contribution.role);
    }
  }

  for (const role of EXPECTED_ROLES) {
    if (!assigned.has(role)) {
      issues.push({
        level: "info",
        message: `No contributor is assigned "${role}".`,
      });
    }
  }

  return issues;
}
