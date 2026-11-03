import { z } from "zod";
import { paginationQuery } from "../../common/pagination";
import { isoDate, optText, optUrl, optUuid, sortOrderField, uuid } from "../../common/validate";
import { statusSchema } from "../projects/projects.schema";

export const levelSchema = z.enum(["international", "national", "regional", "university", "other"]);

export const publicAchievementsQuery = paginationQuery(100, 200);

export const adminAchievementsQuery = paginationQuery(20, 100).extend({
  level: levelSchema.optional(),
  status: statusSchema.optional(),
  search: z.string().trim().max(100).optional(),
});

export const idParams = z.object({ id: uuid });

export const achievementBody = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  organizer: optText(160),
  level: levelSchema.default("other"),
  rankLabel: optText(60),
  achievedAt: isoDate,
  description: optText(2000),
  linkUrl: optUrl,
  imageMediaId: optUuid,
  relatedProjectId: optUuid,
  status: statusSchema.default("published"),
  sortOrder: sortOrderField.default(0),
});
export type AchievementBody = z.output<typeof achievementBody>;
