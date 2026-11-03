import type { ProjectDetail, ProjectSummary } from "@portfolio/shared";
import { conflict, notFound, validationError } from "../../common/errors";
import { slugify, uniqueSlug } from "../../common/slug";
import type { TtlCache } from "../../lib/cache";
import type { ContentPublisher } from "../../lib/publisher";
import type { PublishStatus } from "../../db/types";
import type { MediaLookup } from "../media/media.mapper";
import type { MediaRepository } from "../media/media.repository";
import type { TechnologiesRepository } from "../technologies/technologies.repository";
import { storedMediaIds, toPublicBlock, type BlockInput } from "./blocks";
import { toAdminDetail, toAdminListItem, toDetail, toSummary } from "./projects.mapper";
import type { ProjectListFilters, ProjectRow, ProjectWrite, ProjectsRepository } from "./projects.repository";
import type { AdminProjectsQuery, ProjectBody, PublicProjectsQuery } from "./projects.schema";

export class ProjectsService {
  constructor(
    private readonly repo: ProjectsRepository,
    private readonly techRepo: TechnologiesRepository,
    private readonly mediaRepo: MediaRepository,
    private readonly mediaLookup: MediaLookup,
    private readonly publisher: ContentPublisher,
    private readonly cache: TtlCache,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /* ===================== public ===================== */

  listPublic(q: PublicProjectsQuery): Promise<{ items: ProjectSummary[]; total: number }> {
    return this.cache.wrap(`projects:list:${JSON.stringify(q)}`, async () => {
      const { rows, total } = await this.repo.list({
        page: q.page,
        limit: q.limit,
        category: q.category,
        featured: q.featured,
        search: q.search,
        sort: q.sort,
        publishedOnly: true,
      });
      return { items: await this.summaries(rows), total };
    });
  }

  getPublicBySlug(slug: string): Promise<ProjectDetail | null> {
    return this.cache.wrap(`projects:detail:${slug}`, async () => {
      const row = await this.repo.findPublishedBySlug(slug);
      if (!row) return null;

      const [techMap, metrics, blockRows, order] = await Promise.all([
        this.repo.technologiesFor([row.id]),
        this.repo.metricsFor(row.id),
        this.repo.blocksFor(row.id),
        this.repo.publishedOrder(),
      ]);

      // "Next project" wraps around to the first one, like the mock data did.
      const index = order.findIndex((p) => p.id === row.id);
      const nextRef = order.length > 1 && index >= 0 ? order[(index + 1) % order.length] : undefined;
      const nextRow = nextRef ? await this.repo.findById(nextRef.id) : undefined;

      const media = await this.mediaLookup.load([row.coverMediaId, nextRow?.coverMediaId, ...storedMediaIds(blockRows)]);
      const blocks = blockRows.flatMap((b) => {
        const block = toPublicBlock(b, media);
        return block ? [block] : [];
      });
      const next = nextRow ? (await this.summaries([nextRow]))[0]! : null;

      return toDetail(row, {
        cover: media.get(row.coverMediaId),
        technologies: techMap.get(row.id) ?? [],
        metrics,
        blocks,
        next,
      });
    });
  }

  /* ===================== admin ===================== */

  async listAdmin(q: AdminProjectsQuery) {
    const filters: ProjectListFilters = { ...q };
    const { rows, total } = await this.repo.list(filters);
    const [techMap, media] = await Promise.all([
      this.repo.technologiesFor(rows.map((r) => r.id)),
      this.mediaLookup.load(rows.map((r) => r.coverMediaId)),
    ]);
    const items = rows.map((r) =>
      toAdminListItem(r, media.get(r.coverMediaId), (techMap.get(r.id) ?? []).map((t) => t.name)),
    );
    return { items, total };
  }

  async getAdmin(id: string) {
    const row = await this.repo.findById(id);
    if (!row) throw notFound("Project");
    return this.adminDetail(row);
  }

  async create(body: ProjectBody) {
    const slug = body.slug ? await this.requireFreeSlug(body.slug) : await this.generateSlug(body.title);
    await this.assertReferences(body);
    const row = await this.repo.create(this.toWrite(body, slug, null), body.technologyIds);
    this.publisher.changed("projects", { slugs: [slug] });
    return this.adminDetail(row);
  }

  async update(id: string, body: ProjectBody) {
    const existing = await this.repo.findById(id);
    if (!existing) throw notFound("Project");
    const slug = body.slug && body.slug !== existing.slug ? await this.requireFreeSlug(body.slug, id) : (body.slug ?? existing.slug);
    await this.assertReferences(body);
    const row = await this.repo.update(id, this.toWrite(body, slug, existing.publishedAt), body.technologyIds);
    if (!row) throw notFound("Project");
    this.publisher.changed("projects", { slugs: [existing.slug, slug] });
    return this.adminDetail(row);
  }

  async setStatus(id: string, status: PublishStatus) {
    const existing = await this.repo.findById(id);
    if (!existing) throw notFound("Project");
    const publishedAt = status === "published" ? (existing.publishedAt ?? this.now()) : existing.publishedAt;
    const row = await this.repo.setStatus(id, status, publishedAt);
    this.publisher.changed("projects", { slugs: [existing.slug] });
    return this.adminDetail(row!);
  }

  async remove(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw notFound("Project");
    await this.repo.softDelete(id, this.now());
    this.publisher.changed("projects", { slugs: [existing.slug] });
  }

  async replaceMetrics(id: string, items: Array<{ value: string; label: string }>) {
    const existing = await this.repo.findById(id);
    if (!existing) throw notFound("Project");
    await this.repo.replaceMetrics(id, items);
    this.publisher.changed("projects", { slugs: [existing.slug] });
    return (await this.repo.metricsFor(id)).map((m) => ({ value: m.value, label: m.label }));
  }

  async replaceBlocks(id: string, blocks: BlockInput[]) {
    const existing = await this.repo.findById(id);
    if (!existing) throw notFound("Project");

    // Every referenced image must exist; errors point at the exact block ("blocks.2.data.mediaId").
    const refs: Array<{ path: string; id: string }> = [];
    blocks.forEach((b, i) => {
      if (b.type === "image") refs.push({ path: `blocks.${i}.data.mediaId`, id: b.data.mediaId });
      if (b.type === "gallery") b.data.items.forEach((it, j) => refs.push({ path: `blocks.${i}.data.items.${j}.mediaId`, id: it.mediaId }));
      if (b.type === "before_after") {
        refs.push({ path: `blocks.${i}.data.beforeMediaId`, id: b.data.beforeMediaId });
        refs.push({ path: `blocks.${i}.data.afterMediaId`, id: b.data.afterMediaId });
      }
    });
    await this.assertMediaExist(refs, "image/");

    await this.repo.replaceBlocks(
      id,
      blocks.map((b) => ({ type: b.type, heading: b.heading, data: b.data })),
    );
    this.publisher.changed("projects", { slugs: [existing.slug] });
    return (await this.repo.blocksFor(id)).map((b) => ({ id: b.id, type: b.type, heading: b.heading, data: b.data, sortOrder: b.sortOrder }));
  }

  async reorder(items: Array<{ id: string; sortOrder: number }>) {
    await this.repo.reorder(items);
    this.publisher.changed("projects");
  }

  /* ===================== internals ===================== */

  private async summaries(rows: ProjectRow[]): Promise<ProjectSummary[]> {
    const [techMap, media] = await Promise.all([
      this.repo.technologiesFor(rows.map((r) => r.id)),
      this.mediaLookup.load(rows.map((r) => r.coverMediaId)),
    ]);
    return rows.map((r) => toSummary(r, media.get(r.coverMediaId), (techMap.get(r.id) ?? []).map((t) => t.name)));
  }

  private async adminDetail(row: ProjectRow) {
    const [techMap, metrics, blocks, media] = await Promise.all([
      this.repo.technologiesFor([row.id]),
      this.repo.metricsFor(row.id),
      this.repo.blocksFor(row.id),
      this.mediaLookup.load([row.coverMediaId]),
    ]);
    return toAdminDetail(row, { cover: media.get(row.coverMediaId), technologies: techMap.get(row.id) ?? [], metrics, blocks });
  }

  private toWrite(body: ProjectBody, slug: string, currentPublishedAt: Date | null): ProjectWrite {
    let publishedAt = currentPublishedAt;
    if (body.publishedAt) publishedAt = new Date(body.publishedAt);
    else if (body.status === "published" && !publishedAt) publishedAt = this.now();

    return {
      slug,
      title: body.title,
      category: body.category,
      summary: body.summary,
      impactLine: body.impactLine,
      impactStatement: body.impactStatement,
      role: body.role,
      team: body.team,
      client: body.client,
      year: body.year,
      startedAt: body.startedAt,
      endedAt: body.endedAt,
      contributions: body.contributions,
      coverMediaId: body.coverMediaId,
      demoUrl: body.demoUrl,
      repoUrl: body.repoUrl,
      figmaUrl: body.figmaUrl,
      dashboardUrl: body.dashboardUrl,
      notebookUrl: body.notebookUrl,
      meta: body.meta,
      status: body.status,
      isFeatured: body.isFeatured,
      sortOrder: body.sortOrder,
      seoDescription: body.seoDescription,
      publishedAt,
    };
  }

  private generateSlug(title: string) {
    return uniqueSlug(slugify(title, 120), (s) => this.repo.slugExists(s));
  }

  private async requireFreeSlug(slug: string, exceptId?: string) {
    if (await this.repo.slugExists(slug, exceptId)) throw conflict(`The slug "${slug}" is already used by another project.`, "SLUG_TAKEN");
    return slug;
  }

  private async assertReferences(body: ProjectBody) {
    if (body.coverMediaId) await this.assertMediaExist([{ path: "coverMediaId", id: body.coverMediaId }], "image/");
    const existing = await this.techRepo.existingIds(body.technologyIds);
    const missing = body.technologyIds.filter((id) => !existing.has(id));
    if (missing.length) throw validationError({ technologyIds: `Unknown technology id: ${missing.join(", ")}.` });
  }

  private async assertMediaExist(refs: Array<{ path: string; id: string }>, mimePrefix: string) {
    if (refs.length === 0) return;
    const found = await this.mediaRepo.findManyByIds([...new Set(refs.map((r) => r.id))]);
    const fields: Record<string, string> = {};
    for (const r of refs) {
      const row = found.get(r.id);
      if (!row) fields[r.path] = "Media not found.";
      else if (!row.mimeType.startsWith(mimePrefix)) fields[r.path] = "This file is not an image.";
    }
    if (Object.keys(fields).length) throw validationError(fields);
  }
}
