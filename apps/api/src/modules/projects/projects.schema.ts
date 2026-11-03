import { z } from "zod";
import { boolQuery, paginationQuery } from "../../common/pagination";
import { SLUG_PATTERN } from "../../common/slug";
import { optDate, optText, optUrl, optUuid, sortOrderField, textList, uuid } from "../../common/validate";
import { blockInput } from "./blocks";

export const categorySchema = z.enum(["web", "uiux", "data"]);
export const statusSchema = z.enum(["draft", "published", "archived"]);

export const publicProjectsQuery = paginationQuery(50, 100).extend({
  category: categorySchema.optional(),
  featured: boolQuery.optional(),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
});
export type PublicProjectsQuery = z.infer<typeof publicProjectsQuery>;

export const adminProjectsQuery = paginationQuery(20, 100).extend({
  category: categorySchema.optional(),
  status: statusSchema.optional(),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(["manual", "newest", "oldest"]).default("manual"),
});
export type AdminProjectsQuery = z.infer<typeof adminProjectsQuery>;

export const slugParams = z.object({
  slug: z.string().min(1).max(140).regex(SLUG_PATTERN, "Invalid slug."),
});
export const idParams = z.object({ id: uuid });

export const projectBody = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(160),
    slug: z.string().trim().max(140).regex(SLUG_PATTERN, "Use lower-case letters, digits and hyphens.").optional(),
    category: categorySchema,
    summary: z.string().trim().min(1, "Summary is required.").max(300),
    impactLine: optText(200),
    impactStatement: optText(2000),
    role: optText(160),
    team: optText(160),
    client: optText(160),
    year: z.number().int().min(1990).max(2100).nullish().transform((v) => v ?? null),
    startedAt: optDate,
    endedAt: optDate,
    contributions: textList(20, 300),
    coverMediaId: optUuid,
    demoUrl: optUrl,
    repoUrl: optUrl,
    figmaUrl: optUrl,
    dashboardUrl: optUrl,
    notebookUrl: optUrl,
    meta: z
      .record(z.unknown())
      .default({})
      .refine((v) => JSON.stringify(v).length <= 10_000, "Meta is too large (max 10 KB)."),
    status: statusSchema.default("draft"),
    isFeatured: z.boolean().default(false),
    sortOrder: sortOrderField.default(0),
    seoDescription: optText(160),
    /** Optional: back-date a project. Defaults to the moment it is first published. */
    publishedAt: z.string().datetime({ offset: true }).nullish().transform((v) => v ?? null),
    technologyIds: z
      .array(z.number().int().positive())
      .max(30)
      .default([])
      .transform((ids) => [...new Set(ids)]),
  })
  .refine((v) => !v.startedAt || !v.endedAt || v.endedAt >= v.startedAt, {
    path: ["endedAt"],
    message: "End date cannot be before the start date.",
  });
export type ProjectBody = z.output<typeof projectBody>;

export const statusBody = z.object({ status: statusSchema });

export const metricsBody = z.object({
  items: z
    .array(
      z.object({
        value: z.string().trim().min(1, "Value is required.").max(20),
        label: z.string().trim().min(1, "Label is required.").max(80),
      }),
    )
    .max(8),
});

export const blocksBody = z.object({ blocks: z.array(blockInput).max(60) });
