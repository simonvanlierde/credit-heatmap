import type { Author, Contribution } from "../author.js";
import { CREDIT_ROLES } from "../credit-roles.js";
import { createAuthor, deduplicateAuthorInitials } from "../parse-authors.js";

const NAME_HEADER = "Name";
const ORCID_HEADER = "ORCID";

const CSV_HEADERS = [NAME_HEADER, ORCID_HEADER, ...CREDIT_ROLES.map((role) => role.name)];

/** Leading characters a spreadsheet may interpret as the start of a formula. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function escapeCsvValue(value: string): string {
  // Prefix a single quote so Excel/Sheets treat formula-like cells as text.
  const guarded = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  if (/["\n,]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}

/** Inverse of the formula guard added by `escapeCsvValue`. */
function unescapeCsvValue(value: string): string {
  return value.startsWith("'") && FORMULA_PREFIX.test(value.slice(1)) ? value.slice(1) : value;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => unescapeCsvValue(value.trim()));
}

export function toCsv(authors: Author[]): string {
  const rows = [
    CSV_HEADERS.map(escapeCsvValue).join(","),
    ...authors.map((author) => {
      const contributionByRole = new Map(
        author.contributions.map((contribution) => [contribution.role, contribution.score]),
      );

      return [
        author.name,
        author.orcid ?? "",
        ...CREDIT_ROLES.map((role) => String(contributionByRole.get(role.name) ?? 0)),
      ]
        .map(escapeCsvValue)
        .join(",");
    }),
  ];

  return rows.join("\n");
}

export function fromCsv(csv: string): Author[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0] ?? "");
  const nameIndex = headers.indexOf(NAME_HEADER);
  if (nameIndex === -1) {
    throw new Error('CSV must include a "Name" column.');
  }

  const orcidIndex = headers.indexOf(ORCID_HEADER);
  const roleIndexByHeader = new Map(headers.map((header, index) => [header, index]));

  const authors = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const name = cells[nameIndex]?.trim() ?? "";
    if (!name) {
      throw new Error("Each CSV row must include a contributor name.");
    }

    const contributions: Contribution[] = CREDIT_ROLES.map((role) => {
      const scoreText = cells[roleIndexByHeader.get(role.name) ?? -1] ?? "0";
      const parsedScore = Number(scoreText);
      const score = Number.isFinite(parsedScore) ? Math.max(0, Math.min(100, parsedScore)) : 0;
      return { role: role.name, score };
    });

    return createAuthor(name, {
      orcid: cells[orcidIndex]?.trim() || undefined,
      contributions,
    });
  });

  return deduplicateAuthorInitials(authors);
}
