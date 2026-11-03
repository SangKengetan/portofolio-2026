import type { Experience } from "@portfolio/shared";
import { notFound, validationError } from "../../common/errors";
import type { TtlCache } from "../../lib/cache";
import type { ContentPublisher } from "../../lib/publisher";
import type { MediaLookup } from "../media/media.mapper";
import type { MediaRepository } from "../media/media.repository";
import type { TechnologiesRepository } from "../technologies/technologies.repository";
import { toAdminExperience, toExperience } from "./experiences.mapper";
import type { ExperienceFilters, ExperienceRow, ExperienceValues, ExperiencesRepository } from "./experiences.repository";
import type { ExperienceBody } from "./experiences.schema";

export class ExperiencesService {
  constructor(
    private readonly repo: ExperiencesRepository,
    private readonly techRepo: TechnologiesRepository,
    private readonly mediaRepo: MediaRepository,
    private readonly mediaLookup: MediaLookup,
    private readonly publisher: ContentPublisher,
    private readonly cache: TtlCache,
    private readonly now: () => Date = () => new Date(),
  ) {}

  listPublic(page: number, limit: number): Promise<{ items: Experience[]; total: number }> {
    return this.cache.wrap(`experiences:${page}:${limit}`, async () => {
      const { rows, total } = await this.repo.list({ page, limit, publishedOnly: true });
      const [techMap, media] = await Promise.all([
        this.repo.technologiesFor(rows.map((r) => r.id)),
        this.mediaLookup.load(rows.map((r) => r.imageMediaId)),
      ]);
      return { items: rows.map((r) => toExperience(r, media.get(r.imageMediaId), techMap.get(r.id) ?? [])), total };
    });
  }

  async listAdmin(filters: ExperienceFilters) {
    const { rows, total } = await this.repo.list(filters);
    const [techMap, media] = await Promise.all([
      this.repo.technologiesFor(rows.map((r) => r.id)),
      this.mediaLookup.load(rows.map((r) => r.imageMediaId)),
    ]);
    return { items: rows.map((r) => toAdminExperience(r, media.get(r.imageMediaId), techMap.get(r.id) ?? [])), total };
  }

  async get(id: string) {
    const row = await this.repo.findById(id);
    if (!row) throw notFound("Experience");
    return this.detail(row);
  }

  async create(body: ExperienceBody) {
    await this.assertReferences(body);
    const row = await this.repo.create(this.values(body), body.technologyIds);
    this.publisher.changed("experiences");
    return this.detail(row);
  }

  async update(id: string, body: ExperienceBody) {
    await this.assertReferences(body);
    const row = await this.repo.update(id, this.values(body), body.technologyIds);
    if (!row) throw notFound("Experience");
    this.publisher.changed("experiences");
    return this.detail(row);
  }

  async remove(id: string) {
    if (!(await this.repo.softDelete(id, this.now()))) throw notFound("Experience");
    this.publisher.changed("experiences");
  }

  async reorder(items: Array<{ id: string; sortOrder: number }>) {
    await this.repo.reorder(items);
    this.publisher.changed("experiences");
  }

  private async detail(row: ExperienceRow) {
    const [techMap, media] = await Promise.all([this.repo.technologiesFor([row.id]), this.mediaLookup.load([row.imageMediaId])]);
    return toAdminExperience(row, media.get(row.imageMediaId), techMap.get(row.id) ?? []);
  }

  private values(b: ExperienceBody): ExperienceValues {
    return {
      role: b.role,
      company: b.company,
      companyUrl: b.companyUrl,
      location: b.location,
      employmentType: b.employmentType,
      startDate: b.startDate,
      endDate: b.endDate,
      description: b.description,
      highlights: b.highlights,
      imageMediaId: b.imageMediaId,
      status: b.status,
      sortOrder: b.sortOrder,
    };
  }

  private async assertReferences(body: ExperienceBody) {
    const fields: Record<string, string> = {};
    if (body.imageMediaId) {
      const row = (await this.mediaRepo.findManyByIds([body.imageMediaId])).get(body.imageMediaId);
      if (!row) fields.imageMediaId = "Media not found.";
      else if (!row.mimeType.startsWith("image/")) fields.imageMediaId = "This file is not an image.";
    }
    const existing = await this.techRepo.existingIds(body.technologyIds);
    const missing = body.technologyIds.filter((id) => !existing.has(id));
    if (missing.length) fields.technologyIds = `Unknown technology id: ${missing.join(", ")}.`;
    if (Object.keys(fields).length) throw validationError(fields);
  }
}
