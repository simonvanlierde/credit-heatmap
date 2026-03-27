import { AuthorSchema } from "@credit-generator/core";
import { z } from "zod";

export const StatementRequestSchema = z.object({
  authors: z.array(AuthorSchema).min(1),
  format: z.enum(["by-role", "by-author", "by-author-short"]),
  showLevels: z.boolean().optional().default(false),
});

export const StatementResponseSchema = z.object({
  result: z.string(),
});

export const HeatmapRequestSchema = z.object({
  authors: z.array(AuthorSchema).min(1),
  options: z
    .object({
      colorScheme: z.string().optional(),
      inputMode: z.enum(["toggle", "levels", "slider"]).optional(),
    })
    .optional()
    .default({}),
});
