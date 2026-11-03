import type { Kysely, Selectable } from "kysely";
import { sql } from "kysely";
import { likePattern, toOffset } from "../../common/pagination";
import type { Database, PublishStatus } from "../../db/types";
import type { TechnologyRow } from "../technologies/technologies.repository";

export type ExperienceRow = Selectable<Database["experiences"]>;

export interface ExperienceFilters {
  page: number;
  limit: number;
  status?: PublishStatus;
  publishedOnly?: boolean;
  search?: string;
}

export interface ExperienceValues {
  role: string;
  company: string;
  companyUrl: string | null;
  location: string | null;
  employmentType: ExperienceRow["employmentType"];
  startDate: string;
  endDate: string | null;
  description: string | null;
  highlights: string[];
  imageMediaId: string | null;
  status: PublishStatus;
  sortOrder: number;
}

export class ExperiencesRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async list(f: ExperienceFilters): Promise<{ rows: ExperienceRow[]; total: number }> {
    let base = this.db.selectFrom("experiences").where("deletedAt", "is", null);
    if (f.publishedOnly) base = base.where("status", "=", "published");
    else if (f.status) base = base.where("status", "=", f.status);
    if (f.search) {
      const p = likePattern(f.search);
      base = base.where((eb) => eb.or([eb("role", "ilike", p), eb("company", "ilike", p)]));
    }
    const [rows, count] = await Promise.all([
      base
        .selectAll()
        .orderBy("sortOrder")
        .orderBy("startDate", "desc")
        .orderBy("id")
        .limit(f.limit)
        .offset(toOffset(f.page, f.limit))
        .execute(),
      base.select((eb) => eb.fn.countAll<number>().as("n")).executeTakeFirstOrThrow(),
    ]);
    return { rows, total: count.n };
  }

  findById(id: string) {
    return this.db.selectFrom("experiences").selectAll().where("id", "=", id).where("deletedAt", "is", null).executeTakeFirst();
  }

  async technologiesFor(ids: string[]): Promise<Map<string, TechnologyRow[]>> {
    const out = new Map<string, TechnologyRow[]>();
    if (ids.length === 0) return out;
    const rows = await this.db
      .selectFrom("experienceTechnologies as et")
      .innerJoin("technologies as t", "t.id", "et.technologyId")
      .select(["et.experienceId", "t.id", "t.name", "t.slug", "t.grp", "t.iconKey", "t.showOnHome", "t.sortOrder"])
      .where("et.experienceId", "in", ids)
      .orderBy("et.sortOrder")
      .orderBy("t.id")
      .execute();
    for (const { experienceId, ...tech } of rows) {
      const list = out.get(experienceId) ?? [];
      list.push(tech);
      out.set(experienceId, list);
    }
    return out;
  }

  create(values: ExperienceValues, technologyIds: number[]): Promise<ExperienceRow> {
    return this.db.transaction().execute(async (trx) => {
      const row = await trx.insertInto("experiences").values(values).returningAll().executeTakeFirstOrThrow();
      await this.setTechnologies(trx, row.id, technologyIds);
      return row;
    });
  }

  update(id: string, values: ExperienceValues, technologyIds: number[]): Promise<ExperienceRow | undefined> {
    return this.db.transaction().execute(async (trx) => {
      const row = await trx
        .updateTable("experiences")
        .set(values)
        .where("id", "=", id)
        .where("deletedAt", "is", null)
        .returningAll()
        .executeTakeFirst();
      if (row) await this.setTechnologies(trx, id, technologyIds);
      return row;
    });
  }

  async softDelete(id: string, at: Date): Promise<boolean> {
    const res = await this.db
      .updateTable("experiences")
      .set({ deletedAt: at })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .executeTakeFirst();
    return Number(res.numUpdatedRows) > 0;
  }

  reorder(items: Array<{ id: string; sortOrder: number }>) {
    return this.db.transaction().execute(async (trx) => {
      for (const item of items) {
        await trx.updateTable("experiences").set({ sortOrder: item.sortOrder }).where("id", "=", item.id).where("deletedAt", "is", null).execute();
      }
    });
  }

  /** Earliest start date among published, paid-or-project work (volunteer "organization" roles excluded). */
  async earliestProfessionalStart(): Promise<string | null> {
    const res = await sql<{ d: string | null }>`
      select min(start_date)::text as d from experiences
      where deleted_at is null and status = 'published' and employment_type <> 'organization'`.execute(this.db);
    return res.rows[0]?.d ?? null;
  }

  private async setTechnologies(trx: Kysely<Database>, experienceId: string, technologyIds: number[]) {
    await trx.deleteFrom("experienceTechnologies").where("experienceId", "=", experienceId).execute();
    if (technologyIds.length) {
      await trx
        .insertInto("experienceTechnologies")
        .values(technologyIds.map((technologyId, sortOrder) => ({ experienceId, technologyId, sortOrder })))
        .execute();
    }
  }
}
