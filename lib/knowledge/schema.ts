import { z } from "zod";

export const articleFrontmatterSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "slug must be kebab-case"),
  title: z.string().min(1),
  quality: z.enum(["good", "weak", "bad"]),
  source: z.object({
    type: z.enum(["study", "coach", "personal", "article"]),
    url: z.string().url().optional(),
    citation: z.string().optional(),
  }),
  language: z.string().default("fr"),
  tags: z.object({
    duration: z.object({
      min_min: z.number().min(0),
      max_min: z.number().nullable(),
    }),
    distance_km: z.object({
      min: z.number().min(0),
      max: z.number().nullable(),
    }),
    terrain: z.array(z.string()).default([]),
    conditions: z.array(z.string()).default([]),
    profile: z.array(z.string()).default([]),
  }),
  last_updated: z
    .union([z.string().min(1), z.date()])
    .transform((v) => (typeof v === "string" ? v : v.toISOString().slice(0, 10))),
  authored_by: z.string().min(1),
});

export type ArticleFrontmatter = z.infer<typeof articleFrontmatterSchema>;
