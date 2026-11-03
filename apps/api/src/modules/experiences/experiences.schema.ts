import { z } from "zod";
import { paginationQuery } from "../../common/pagination";
import { isoDate, optDate, optText, optUrl, optUuid, sortOrderField, textList, uuid } from "../../common/validate";
import { statusSchema } from "../projects/projects.schema";

export const employmentTypeSchema = z.enum(["full_time", "part_time", "internship", "freelance", "contract", "organization"]);

export const publicExperiencesQuery = paginationQuery(100, 200);

export const adminExperiencesQuery = paginationQuery(20, 100).extend({
  status: statusSchema.optional(),
  search: z.string().trim().max(100).optional(),
});

export const idParams = z.object({ id: uuid });

export const experienceBody = z
  .object({
    role: z.string().trim().min(1, "Role is required.").max(160),
    company: z.string().trim().min(1, "Company is required.").max(160),
    companyUrl: optUrl,
    location: optText(120),
    employmentType: employmentTypeSchema,
    startDate: isoDate,
    endDate: optDate,
    description: optText(3000),
    highlights: textList(10, 200),
    imageMediaId: optUuid,
    status: statusSchema.default("published"),
    sortOrder: sortOrderField.default(0),
    technologyIds: z
      .array(z.number().int().positive())
      .max(30)
      .default([])
      .transform((ids) => [...new Set(ids)]),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    path: ["endDate"],
    message: "End date cannot be before the start date.",
  });
export type ExperienceBody = z.output<typeof experienceBody>;
