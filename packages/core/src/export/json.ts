import { z } from "zod";
import type { Author } from "../author.js";
import { AuthorSchema } from "../author.js";
import { CREDIT_ROLES } from "../credit-roles.js";

const RoleRefSchema = z.object({
  name: z.string(),
  id: z.string(),
  url: z.string(),
});

const ExportSchema = z.object({
  version: z.literal(1),
  // Canonical NISO role reference (name → official UUID → URL). Travels with the
  // data so machine consumers (e.g. Crossref) can resolve roles by their IDs.
  roles: z.array(RoleRefSchema).optional(),
  authors: z.array(AuthorSchema),
});

export type CreditExport = z.infer<typeof ExportSchema>;

/** Serialize authors to a JSON string (pretty-printed). */
export function toJson(authors: Author[]): string {
  const roles = CREDIT_ROLES.map((r) => ({ name: r.name, id: r.id, url: r.url }));
  const payload: CreditExport = { version: 1, roles, authors };
  return JSON.stringify(payload, null, 2);
}

/**
 * Parse a JSON string previously produced by `toJson()`.
 * Throws a ZodError if the data doesn't match the expected shape.
 */
export function fromJson(json: string): Author[] {
  const parsed = ExportSchema.parse(JSON.parse(json));
  return parsed.authors;
}
