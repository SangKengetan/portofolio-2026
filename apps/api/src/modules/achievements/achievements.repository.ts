import type { Kysely, Selectable } from "kysely";
import { likePattern, toOffset } from "../../common/pagination";
import type { AchievementLevelName, Database, PublishStatus } from "../../db/types";

export type AchievementRow = Selectable<Database["achievements"]>;

export interface AchievementFilters {
  page: number;
  limit: number;
  level?: AchievementLevelName;
  status?: PublishStatus;
  publishedOnly?: boolean;
  search?: string;
}

export interface AchievementValues {
  title: string;
  organizer: string | null;
  level: AchievementLevelName;
  rankLabel: string | null;
  achievedAt: string;
  description: string | null;
  linkUrl: string | null;
  imageMediaId: string | null;
  relatedProjectId: string | null;
  status: PublishStatus;
  sortOrder: number;
}

export class AchievementsRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async list(f: AchievementFilters): Promise<{ rows: AchievementRow[]; total: number }> {
    let base = this.db.selectFrom("achievements").where("deletedAt", "is", null);
    if (f.publishedOnly) base = base.where("status", "=", "published");
    else if (f.status) base = base.where("status", "=", f.status);
    if (f.level) base = base.where("level", "=", f.level);
    if (f.search) {
      const p = likePattern(f.search);
      base = base.where((eb) => eb.or([eb("title", "ilike", p), eb("organizer", "ilike", p)]));
    }
    const [rows, count] = await Promise.all([
      base
        .selectAll()
        .orderBy("sortOrder")
        .orderBy("achievedAt", "desc")
        .orderBy("id")
        .limit(f.limit)
        .offset(toOffset(f.page, f.limit))
        .execute(),
      base.select((eb) => eb.fn.countAll<number>().as("n")).executeTakeFirstOrThrow(),
    ]);
    return { rows, total: count.n };
  }

  findById(id: string) {
    return this.db.selectFrom("achievements").selectAll().where("id", "=", id).where("deletedAt", "is", null).executeTakeFirst();
  }

  create(values: AchievementValues) {
    return this.db.insertInto("achievements").values(values).returningAll().executeTakeFirstOrThrow();
  }

  update(id: string, values: AchievementValues) {
    return this.db
      .updateTable("achievements")
      .set(values)
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .returningAll()
      .executeTakeFirst();
  }

  async softDelete(id: string, at: Date): Promise<boolean> {
    const res = await this.db
      .updateTable("achievements")
      .set({ deletedAt: at })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .executeTakeFirst();
    return Number(res.numUpdatedRows) > 0;
  }

  reorder(items: Array<{ id: string; sortOrder: number }>) {
    return this.db.transaction().execute(async (trx) => {
      for (const item of items) {
        await trx.updateTable("achievements").set({ sortOrder: item.sortOrder }).where("id", "=", item.id).where("deletedAt", "is", null).execute();
      }
    });
  }

  async projectExists(id: string): Promise<boolean> {
    return !!(await this.db.selectFrom("projects").select("id").where("id", "=", id).where("deletedAt", "is", null).executeTakeFirst());
  }

  async publishedCount(): Promise<number> {
    const r = await this.db
      .selectFrom("achievements")
      .select((eb) => eb.fn.countAll<number>().as("n"))
      .where("deletedAt", "is", null)
      .where("status", "=", "published")
      .executeTakeFirstOrThrow();
    return r.n;
  }
}
