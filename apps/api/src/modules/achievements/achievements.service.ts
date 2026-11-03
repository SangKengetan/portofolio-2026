import type { Achievement } from "@portfolio/shared";
import { notFound, validationError } from "../../common/errors";
import type { TtlCache } from "../../lib/cache";
import type { ContentPublisher } from "../../lib/publisher";
import type { MediaLookup } from "../media/media.mapper";
import type { MediaRepository } from "../media/media.repository";
import { toAchievement, toAdminAchievement } from "./achievements.mapper";
import type { AchievementFilters, AchievementRow, AchievementValues, AchievementsRepository } from "./achievements.repository";
import type { AchievementBody } from "./achievements.schema";

export class AchievementsService {
  constructor(
    private readonly repo: AchievementsRepository,
    private readonly mediaRepo: MediaRepository,
    private readonly mediaLookup: MediaLookup,
    private readonly publisher: ContentPublisher,
    private readonly cache: TtlCache,
    private readonly now: () => Date = () => new Date(),
  ) {}

  listPublic(page: number, limit: number): Promise<{ items: Achievement[]; total: number }> {
    return this.cache.wrap(`achievements:${page}:${limit}`, async () => {
      const { rows, total } = await this.repo.list({ page, limit, publishedOnly: true });
      return { items: rows.map(toAchievement), total };
    });
  }

  async listAdmin(f: AchievementFilters) {
    const { rows, total } = await this.repo.list(f);
    const media = await this.mediaLookup.load(rows.map((r) => r.imageMediaId));
    return { items: rows.map((r) => toAdminAchievement(r, media.get(r.imageMediaId))), total };
  }

  async get(id: string) {
    const row = await this.repo.findById(id);
    if (!row) throw notFound("Achievement");
    return this.detail(row);
  }

  async create(body: AchievementBody) {
    await this.assertReferences(body);
    const row = await this.repo.create(this.values(body));
    this.publisher.changed("achievements");
    return this.detail(row);
  }

  async update(id: string, body: AchievementBody) {
    await this.assertReferences(body);
    const row = await this.repo.update(id, this.values(body));
    if (!row) throw notFound("Achievement");
    this.publisher.changed("achievements");
    return this.detail(row);
  }

  async remove(id: string) {
    if (!(await this.repo.softDelete(id, this.now()))) throw notFound("Achievement");
    this.publisher.changed("achievements");
  }

  async reorder(items: Array<{ id: string; sortOrder: number }>) {
    await this.repo.reorder(items);
    this.publisher.changed("achievements");
  }

  private async detail(row: AchievementRow) {
    const media = await this.mediaLookup.load([row.imageMediaId]);
    return toAdminAchievement(row, media.get(row.imageMediaId));
  }

  private values(b: AchievementBody): AchievementValues {
    return {
      title: b.title,
      organizer: b.organizer,
      level: b.level,
      rankLabel: b.rankLabel,
      achievedAt: b.achievedAt,
      description: b.description,
      linkUrl: b.linkUrl,
      imageMediaId: b.imageMediaId,
      relatedProjectId: b.relatedProjectId,
      status: b.status,
      sortOrder: b.sortOrder,
    };
  }

  private async assertReferences(b: AchievementBody) {
    const fields: Record<string, string> = {};
    if (b.imageMediaId) {
      const row = (await this.mediaRepo.findManyByIds([b.imageMediaId])).get(b.imageMediaId);
      if (!row) fields.imageMediaId = "Media not found.";
      else if (!row.mimeType.startsWith("image/")) fields.imageMediaId = "This file is not an image.";
    }
    if (b.relatedProjectId && !(await this.repo.projectExists(b.relatedProjectId))) {
      fields.relatedProjectId = "Project not found.";
    }
    if (Object.keys(fields).length) throw validationError(fields);
  }
}
