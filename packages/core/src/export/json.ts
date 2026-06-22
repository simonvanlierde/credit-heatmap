import { z } from "zod";
import type { Author } from "../author.js";
import { AuthorSchema } from "../author.js";

const ExportSchema = z.object({
  version: z.literal(1),
  authors: z.array(AuthorSchema),
});

export type CreditExport = z.infer<typeof ExportSchema>;

/** Serialize authors to a JSON string (pretty-printed). */
export function toJson(authors: Author[]): string {
  const payload: CreditExport = { version: 1, authors };
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
