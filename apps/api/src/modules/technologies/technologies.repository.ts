import type { Insertable, Kysely, Selectable, Updateable } from "kysely";
import type { Database, TechGroupName } from "../../db/types";
import { likePattern, toOffset } from "../../common/pagination";

export type TechnologyRow = Selectable<Database["technologies"]>;

export interface TechnologyFilters {
  page: number;
  limit: number;
  group?: TechGroupName;
  search?: string;
  /** Public endpoint only returns technologies flagged for the home page. */
  onlyShownOnHome?: boolean;
}

export class TechnologiesRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async list(f: TechnologyFilters): Promise<{ rows: TechnologyRow[]; total: number }> {
    let base = this.db.selectFrom("technologies");
    if (f.group) base = base.where("grp", "=", f.group);
    if (f.onlyShownOnHome) base = base.where("showOnHome", "=", true);
    if (f.search) base = base.where("name", "ilike", likePattern(f.search));
    const [rows, count] = await Promise.all([
      base.selectAll().orderBy("sortOrder").orderBy("id").limit(f.limit).offset(toOffset(f.page, f.limit)).execute(),
      base.select((eb) => eb.fn.countAll<number>().as("n")).executeTakeFirstOrThrow(),
    ]);
    return { rows, total: count.n };
  }

  findById(id: number) {
    return this.db.selectFrom("technologies").selectAll().where("id", "=", id).executeTakeFirst();
  }

  /** Returns the ids that exist (used to validate `technologyIds` in project/experience payloads). */
  async existingIds(ids: number[]): Promise<Set<number>> {
    if (ids.length === 0) return new Set();
    const rows = await this.db.selectFrom("technologies").select("id").where("id", "in", ids).execute();
    return new Set(rows.map((r) => r.id));
  }

  async slugOrNameTaken(slug: string, name: string, exceptId?: number): Promise<{ slug: boolean; name: boolean }> {
    let q = this.db.selectFrom("technologies").select(["slug", "name"]).where((eb) => eb.or([eb("slug", "=", slug), eb("name", "=", name)]));
    if (exceptId !== undefined) q = q.where("id", "!=", exceptId);
    const rows = await q.execute();
    return { slug: rows.some((r) => r.slug === slug), name: rows.some((r) => r.name === name) };
  }

  slugExists(slug: string) {
    return this.db
      .selectFrom("technologies")
      .select("id")
      .where("slug", "=", slug)
      .executeTakeFirst()
      .then((r) => !!r);
  }

  create(values: Insertable<Database["technologies"]>) {
    return this.db.insertInto("technologies").values(values).returningAll().executeTakeFirstOrThrow();
  }

  update(id: number, values: Updateable<Database["technologies"]>) {
    return this.db.updateTable("technologies").set(values).where("id", "=", id).returningAll().executeTakeFirst();
  }

  async delete(id: number): Promise<boolean> {
    const res = await this.db.deleteFrom("technologies").where("id", "=", id).executeTakeFirst();
    return Number(res.numDeletedRows) > 0;
  }

  async reorder(items: Array<{ id: number; sortOrder: number }>) {
    await this.db.transaction().execute(async (trx) => {
      for (const item of items) {
        await trx.updateTable("technologies").set({ sortOrder: item.sortOrder }).where("id", "=", item.id).execute();
      }
    });
  }
}
