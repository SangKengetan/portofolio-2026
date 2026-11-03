import type { Achievement } from "@portfolio/shared";
import type { AchievementRow } from "./achievements.repository";

export const toAchievement = (r: AchievementRow): Achievement => ({
  id: r.id,
  title: r.title,
  organizer: r.organizer,
  level: r.level,
  rankLabel: r.rankLabel,
  achievedAt: r.achievedAt,
  description: r.description,
  linkUrl: r.linkUrl,
});

export const toAdminAchievement = (r: AchievementRow, imageUrl: { id: string; url: string; alt: string } | null) => ({
  ...toAchievement(r),
  image: imageUrl,
  imageMediaId: r.imageMediaId,
  relatedProjectId: r.relatedProjectId,
  status: r.status,
  sortOrder: r.sortOrder,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});
