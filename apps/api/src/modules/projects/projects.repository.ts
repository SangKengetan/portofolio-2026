import type { Insertable, Kysely, Selectable } from "kysely";
import { sql } from "kysely";
import { likePattern, toOffset } from "../../common/pagination";
import type { Database, ProjectCategory, PublishStatus } from "../../db/types";
import type { TechnologyRow } from "../technologies/technologies.repository";

export type ProjectRow = Selectable<Database["projects"]>;
export type MetricRow = Selectable<Database["projectMetrics"]>;
export type BlockRow = Selectable<Database["projectBlocks"]>;

export interface ProjectListFilters {
  page: number;
  limit: number;
  category?: ProjectCategory;
  featured?: boolean;
  search?: string;
  status?: PublishStatus;
  /** Public listing: published only. */
  publishedOnly?: boolean;
  sort: "manual" | "newest" | "oldest";
}

/** Everything that can be written by PUT /admin/projects/:id (the join tables are handled separately). */
export type ProjectWrite = Omit<
  Insertable<Database["projects"]>,
  "id" | "createdAt" | "updatedAt" | "deletedAt" | "meta"
> & { meta: Record<string, unknown> };

export interface BlockWrite {
  type: BlockRow["type"];
  heading: string | null;
  data: Record<string, unknown>;
}

export class ProjectsRepository {
  constructor(private readonly db: Kysely<Database>) {}

  /* ---------------- reads ---------------- */

  async list(f: ProjectListFilters): Promise<{ rows: ProjectRow[]; total: number }> {
    let base = this.db.selectFrom("projects").where("deletedAt", "is", null);
    if (f.publishedOnly) base = base.where("status", "=", "published");
    else if (f.status) base = base.where("status", "=", f.status);
    if (f.category) base = base.where("category", "=", f.category);
    if (f.featured !== undefined) base = base.where("isFeatured", "=", f.featured);
    if (f.search) {
      const p = likePattern(f.search);
      base = base.where((eb) => eb.or([eb("title", "ilike", p), eb("summary", "ilike", p)]));
    }

    let q = base.selectAll().limit(f.limit).offset(toOffset(f.page, f.limit));
    // Manual order (drag & drop in the admin) always comes first; ties fall back to the date.
    if (f.sort === "oldest") q = q.orderBy("sortOrder").orderBy(sql`coalesce(published_at, created_at)`, "asc");
    else if (f.sort === "newest") q = q.orderBy("sortOrder").orderBy(sql`coalesce(published_at, created_at)`, "desc");
    else q = q.orderBy("sortOrder").orderBy("updatedAt", "desc");
    q = q.orderBy("id");

    const [rows, count] = await Promise.all([
      q.execute(),
      base.select((eb) => eb.fn.countAll<number>().as("n")).executeTakeFirstOrThrow(),
    ]);
    return { rows, total: count.n };
  }

  /** Published projects in display order (newest first) — used to find the "next project". */
  publishedOrder(): Promise<Array<{ id: string; slug: string }>> {
    return this.db
      .selectFrom("projects")
      .select(["id", "slug"])
      .where("deletedAt", "is", null)
      .where("status", "=", "published")
      .orderBy("sortOrder")
      .orderBy(sql`coalesce(published_at, created_at)`, "desc")
      .orderBy("id")
      .execute();
  }

  findPublishedBySlug(slug: string) {
    return this.db
      .selectFrom("projects")
      .selectAll()
      .where("slug", "=", slug)
      .where("deletedAt", "is", null)
      .where("status", "=", "published")
      .executeTakeFirst();
  }

  findById(id: string) {
    return this.db.selectFrom("projects").selectAll().where("id", "=", id).where("deletedAt", "is", null).executeTakeFirst();
  }

  async slugExists(slug: string, exceptId?: string): Promise<boolean> {
    let q = this.db.selectFrom("projects").select("id").where("slug", "=", slug).where("deletedAt", "is", null);
    if (exceptId) q = q.where("id", "!=", exceptId);
    return !!(await q.executeTakeFirst());
  }

  /** Technologies of many projects in ONE query, in display order. */
  async technologiesFor(projectIds: string[]): Promise<Map<string, TechnologyRow[]>> {
    const out = new Map<string, TechnologyRow[]>();
    if (projectIds.length === 0) return out;
    const rows = await this.db
      .selectFrom("projectTechnologies as pt")
      .innerJoin("technologies as t", "t.id", "pt.technologyId")
      .select([
        "pt.projectId",
        "t.id",
        "t.name",
        "t.slug",
        "t.grp",
        "t.iconKey",
        "t.showOnHome",
        "t.sortOrder",
      ])
      .where("pt.projectId", "in", projectIds)
      .orderBy("pt.sortOrder")
      .orderBy("t.id")
      .execute();
    for (const { projectId, ...tech } of rows) {
      const list = out.get(projectId) ?? [];
      list.push(tech);
      out.set(projectId, list);
    }
    return out;
  }

  metricsFor(projectId: string): Promise<MetricRow[]> {
    return this.db.selectFrom("projectMetrics").selectAll().where("projectId", "=", projectId).orderBy("sortOrder").orderBy("id").execute();
  }

  blocksFor(projectId: string): Promise<BlockRow[]> {
    return this.db.selectFrom("projectBlocks").selectAll().where("projectId", "=", projectId).orderBy("sortOrder").orderBy("id").execute();
  }

  /** Published project counts per category (GET /stats). */
  async publishedCounts(): Promise<Record<ProjectCategory, number>> {
    const rows = await this.db
      .selectFrom("projects")
      .select(["category", (eb) => eb.fn.countAll<number>().as("n")])
      .where("deletedAt", "is", null)
      .where("status", "=", "published")
      .groupBy("category")
      .execute();
    const counts: Record<ProjectCategory, number> = { web: 0, uiux: 0, data: 0 };
    for (const r of rows) counts[r.category] = r.n;
    return counts;
  }

  /* ---------------- writes ---------------- */

  create(values: ProjectWrite, technologyIds: number[]): Promise<ProjectRow> {
    return this.db.transaction().execute(async (trx) => {
      const row = await trx
        .insertInto("projects")
        .values({ ...values, meta: JSON.stringify(values.meta) })
        .returningAll()
        .executeTakeFirstOrThrow();
      await this.setTechnologies(trx, row.id, technologyIds);
      return row;
    });
  }

  update(id: string, values: ProjectWrite, technologyIds: number[]): Promise<ProjectRow | undefined> {
    return this.db.transaction().execute(async (trx) => {
      const row = await trx
        .updateTable("projects")
        .set({ ...values, meta: JSON.stringify(values.meta) })
        .where("id", "=", id)
        .where("deletedAt", "is", null)
        .returningAll()
        .executeTakeFirst();
      if (row) await this.setTechnologies(trx, id, technologyIds);
      return row;
    });
  }

  async setStatus(id: string, status: PublishStatus, publishedAt: Date | null): Promise<ProjectRow | undefined> {
    return this.db
      .updateTable("projects")
      .set({ status, publishedAt })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .returningAll()
      .executeTakeFirst();
  }

  async softDelete(id: string, at: Date): Promise<boolean> {
    const res = await this.db
      .updateTable("projects")
      .set({ deletedAt: at })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .executeTakeFirst();
    return Number(res.numUpdatedRows) > 0;
  }

  replaceMetrics(projectId: string, items: Array<{ value: string; label: string }>) {
    return this.db.transaction().execute(async (trx) => {
      await trx.deleteFrom("projectMetrics").where("projectId", "=", projectId).execute();
      if (items.length) {
        await trx
          .insertInto("projectMetrics")
          .values(items.map((m, i) => ({ projectId, value: m.value, label: m.label, sortOrder: i })))
          .execute();
      }
    });
  }

  replaceBlocks(projectId: string, blocks: BlockWrite[]) {
    return this.db.transaction().execute(async (trx) => {
      await trx.deleteFrom("projectBlocks").where("projectId", "=", projectId).execute();
      if (blocks.length) {
        await trx
          .insertInto("projectBlocks")
          .values(
            blocks.map((b, i) => ({
              projectId,
              type: b.type,
              heading: b.heading,
              data: JSON.stringify(b.data),
              sortOrder: i,
            })),
          )
          .execute();
      }
    });
  }

  reorder(items: Array<{ id: string; sortOrder: number }>) {
    return this.db.transaction().execute(async (trx) => {
      for (const item of items) {
        await trx.updateTable("projects").set({ sortOrder: item.sortOrder }).where("id", "=", item.id).where("deletedAt", "is", null).execute();
      }
    });
  }

  private async setTechnologies(trx: Kysely<Database>, projectId: string, technologyIds: number[]) {
    await trx.deleteFrom("projectTechnologies").where("projectId", "=", projectId).execute();
    if (technologyIds.length) {
      await trx
        .insertInto("projectTechnologies")
        .values(technologyIds.map((technologyId, sortOrder) => ({ projectId, technologyId, sortOrder })))
        .execute();
    }
  }
}
