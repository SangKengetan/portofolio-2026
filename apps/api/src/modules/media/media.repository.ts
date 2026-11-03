import { sql, type Insertable, type Kysely, type Selectable } from "kysely";
import type { Database } from "../../db/types";
import { likePattern, toOffset } from "../../common/pagination";

export type MediaRow = Selectable<Database["media"]>;

export interface MediaListFilters {
  page: number;
  limit: number;
  search?: string;
  kind?: "image" | "pdf";
}

export class MediaRepository {
  constructor(private readonly db: Kysely<Database>) {}

  insert(row: Insertable<Database["media"]>): Promise<MediaRow> {
    return this.db.insertInto("media").values(row).returningAll().executeTakeFirstOrThrow();
  }

  findById(id: string): Promise<MediaRow | undefined> {
    return this.db.selectFrom("media").selectAll().where("id", "=", id).executeTakeFirst();
  }

  async findManyByIds(ids: string[]): Promise<Map<string, MediaRow>> {
    if (ids.length === 0) return new Map();
    const rows = await this.db.selectFrom("media").selectAll().where("id", "in", ids).execute();
    return new Map(rows.map((r) => [r.id, r]));
  }

  async list(filters: MediaListFilters): Promise<{ rows: MediaRow[]; total: number }> {
    let base = this.db.selectFrom("media");
    if (filters.kind === "image") base = base.where("mimeType", "like", "image/%");
    if (filters.kind === "pdf") base = base.where("mimeType", "=", "application/pdf");
    if (filters.search) {
      const pattern = likePattern(filters.search);
      base = base.where((eb) => eb.or([eb("altText", "ilike", pattern), eb("filePath", "ilike", pattern)]));
    }
    const [rows, count] = await Promise.all([
      base
        .selectAll()
        .orderBy("createdAt", "desc")
        .orderBy("id")
        .limit(filters.limit)
        .offset(toOffset(filters.page, filters.limit))
        .execute(),
      base.select((eb) => eb.fn.countAll<number>().as("n")).executeTakeFirstOrThrow(),
    ]);
    return { rows, total: count.n };
  }

  async updateAlt(id: string, altText: string | null): Promise<MediaRow | undefined> {
    return this.db.updateTable("media").set({ altText }).where("id", "=", id).returningAll().executeTakeFirst();
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom("media").where("id", "=", id).execute();
  }

  /** How many records still point at this file (foreign keys + ids stored inside block JSON). */
  async usageCount(id: string): Promise<number> {
    const res = await sql<{ n: number }>`
      select (
        (select count(*) from site_profile where photo_media_id = ${id} or cv_media_id = ${id})
      + (select count(*) from projects where cover_media_id = ${id} and deleted_at is null)
      + (select count(*) from experiences where image_media_id = ${id} and deleted_at is null)
      + (select count(*) from certificates where (image_media_id = ${id} or issuer_logo_media_id = ${id}) and deleted_at is null)
      + (select count(*) from achievements where image_media_id = ${id} and deleted_at is null)
      + (select count(*) from project_blocks where data::text like '%' || ${id} || '%')
      )::int as n`.execute(this.db);
    return res.rows[0]?.n ?? 0;
  }
}
