import { conflict, notFound } from "../../common/errors";
import { slugify, uniqueSlug } from "../../common/slug";
import type { TtlCache } from "../../lib/cache";
import type { ContentPublisher } from "../../lib/publisher";
import { toAdminTechnology, toTechnology } from "./technologies.mapper";
import type { TechnologiesRepository, TechnologyFilters } from "./technologies.repository";
import type { TechnologyBody } from "./technologies.schema";

export class TechnologiesService {
  constructor(
    private readonly repo: TechnologiesRepository,
    private readonly publisher: ContentPublisher,
    private readonly cache: TtlCache,
  ) {}

  async listPublic(filters: Pick<TechnologyFilters, "page" | "limit" | "group">) {
    return this.cache.wrap(`technologies:${filters.group ?? "all"}:${filters.page}:${filters.limit}`, async () => {
      const { rows, total } = await this.repo.list({ ...filters, onlyShownOnHome: true });
      return { items: rows.map(toTechnology), total };
    });
  }

  async listAdmin(filters: TechnologyFilters) {
    const { rows, total } = await this.repo.list(filters);
    return { items: rows.map(toAdminTechnology), total };
  }

  async get(id: number) {
    const row = await this.repo.findById(id);
    if (!row) throw notFound("Technology");
    return toAdminTechnology(row);
  }

  async create(body: TechnologyBody) {
    const slug = body.slug ?? (await uniqueSlug(slugify(body.name, 80), (s) => this.repo.slugExists(s)));
    await this.assertUnique(slug, body.name);
    const row = await this.repo.create({
      name: body.name,
      slug,
      grp: body.group,
      iconKey: body.iconKey,
      showOnHome: body.showOnHome,
      sortOrder: body.sortOrder,
    });
    this.publisher.changed("technologies");
    return toAdminTechnology(row);
  }

  async update(id: number, body: TechnologyBody) {
    const existing = await this.repo.findById(id);
    if (!existing) throw notFound("Technology");
    const slug = body.slug ?? existing.slug;
    await this.assertUnique(slug, body.name, id);
    const row = await this.repo.update(id, {
      name: body.name,
      slug,
      grp: body.group,
      iconKey: body.iconKey,
      showOnHome: body.showOnHome,
      sortOrder: body.sortOrder,
    });
    this.publisher.changed("technologies");
    return toAdminTechnology(row!);
  }

  async remove(id: number) {
    if (!(await this.repo.delete(id))) throw notFound("Technology");
    this.publisher.changed("technologies");
  }

  async reorder(items: Array<{ id: string; sortOrder: number }>) {
    await this.repo.reorder(items.map((i) => ({ id: Number(i.id), sortOrder: i.sortOrder })));
    this.publisher.changed("technologies");
  }

  private async assertUnique(slug: string, name: string, exceptId?: number) {
    const taken = await this.repo.slugOrNameTaken(slug, name, exceptId);
    if (taken.name) throw conflict(`A technology named "${name}" already exists.`, "TECHNOLOGY_EXISTS");
    if (taken.slug) throw conflict(`The slug "${slug}" is already used.`, "SLUG_TAKEN");
  }
}
