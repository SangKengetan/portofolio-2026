import type { Kysely, Selectable } from "kysely";
import { likePattern, toOffset } from "../../common/pagination";
import type { CertificateCategoryName, Database, PublishStatus } from "../../db/types";

export type CertificateRow = Selectable<Database["certificates"]>;

export interface CertificateFilters {
  page: number;
  limit: number;
  category?: CertificateCategoryName;
  featured?: boolean;
  status?: PublishStatus;
  publishedOnly?: boolean;
  search?: string;
}

export interface CertificateValues {
  title: string;
  issuer: string;
  category: CertificateCategoryName;
  issuedAt: string;
  expiresAt: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
  imageMediaId: string | null;
  issuerLogoMediaId: string | null;
  isFeatured: boolean;
  status: PublishStatus;
  sortOrder: number;
}

export class CertificatesRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async list(f: CertificateFilters): Promise<{ rows: CertificateRow[]; total: number }> {
    let base = this.db.selectFrom("certificates").where("deletedAt", "is", null);
    if (f.publishedOnly) base = base.where("status", "=", "published");
    else if (f.status) base = base.where("status", "=", f.status);
    if (f.category) base = base.where("category", "=", f.category);
    if (f.featured !== undefined) base = base.where("isFeatured", "=", f.featured);
    if (f.search) {
      const p = likePattern(f.search);
      base = base.where((eb) => eb.or([eb("title", "ilike", p), eb("issuer", "ilike", p)]));
    }
    const [rows, count] = await Promise.all([
      base
        .selectAll()
        .orderBy("sortOrder")
        .orderBy("issuedAt", "desc")
        .orderBy("id")
        .limit(f.limit)
        .offset(toOffset(f.page, f.limit))
        .execute(),
      base.select((eb) => eb.fn.countAll<number>().as("n")).executeTakeFirstOrThrow(),
    ]);
    return { rows, total: count.n };
  }

  findById(id: string) {
    return this.db.selectFrom("certificates").selectAll().where("id", "=", id).where("deletedAt", "is", null).executeTakeFirst();
  }

  create(values: CertificateValues) {
    return this.db.insertInto("certificates").values(values).returningAll().executeTakeFirstOrThrow();
  }

  update(id: string, values: CertificateValues) {
    return this.db
      .updateTable("certificates")
      .set(values)
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .returningAll()
      .executeTakeFirst();
  }

  async softDelete(id: string, at: Date): Promise<boolean> {
    const res = await this.db
      .updateTable("certificates")
      .set({ deletedAt: at })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .executeTakeFirst();
    return Number(res.numUpdatedRows) > 0;
  }

  reorder(items: Array<{ id: string; sortOrder: number }>) {
    return this.db.transaction().execute(async (trx) => {
      for (const item of items) {
        await trx.updateTable("certificates").set({ sortOrder: item.sortOrder }).where("id", "=", item.id).where("deletedAt", "is", null).execute();
      }
    });
  }

  async publishedCount(): Promise<number> {
    const r = await this.db
      .selectFrom("certificates")
      .select((eb) => eb.fn.countAll<number>().as("n"))
      .where("deletedAt", "is", null)
      .where("status", "=", "published")
      .executeTakeFirstOrThrow();
    return r.n;
  }
}
