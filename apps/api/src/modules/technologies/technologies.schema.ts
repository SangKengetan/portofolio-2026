import { z } from "zod";
import { paginationQuery } from "../../common/pagination";
import { optText, sortOrderField } from "../../common/validate";
import { SLUG_PATTERN } from "../../common/slug";

export const techGroupSchema = z.enum(["web", "uiux", "data", "tools"]);

export const publicTechnologiesQuery = paginationQuery(100, 200).extend({ group: techGroupSchema.optional() });

export const adminTechnologiesQuery = paginationQuery(100, 200).extend({
  group: techGroupSchema.optional(),
  search: z.string().trim().max(80).optional(),
});

export const technologyIdParams = z.object({ id: z.coerce.number().int().min(1) });

export const technologyBody = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(SLUG_PATTERN, "Use lower-case letters, digits and hyphens.")
    .optional(),
  group: techGroupSchema,
  iconKey: optText(80),
  showOnHome: z.boolean().default(true),
  sortOrder: sortOrderField.default(0),
});
export type TechnologyBody = z.infer<typeof technologyBody>;
