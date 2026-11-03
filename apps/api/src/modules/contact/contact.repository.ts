import type { Kysely, Selectable } from "kysely";
import { likePattern, toOffset } from "../../common/pagination";
import type { Database } from "../../db/types";

export type MessageRow = Selectable<Database["contactMessages"]>;

export interface NewMessage {
  name: string;
  email: string;
  subject: string | null;
  message: string;
  ipHash: string | null;
}

export interface MessageFilters {
  page: number;
  limit: number;
  isRead?: boolean;
  search?: string;
}

export interface ContactRepository {
  insert(message: NewMessage): Promise<MessageRow>;
}

export class KyselyContactRepository implements ContactRepository {
  constructor(private readonly db: Kysely<Database>) {}

  insert(message: NewMessage) {
    return this.db.insertInto("contactMessages").values(message).returningAll().executeTakeFirstOrThrow();
  }

  async list(f: MessageFilters): Promise<{ rows: MessageRow[]; total: number; unread: number }> {
    let base = this.db.selectFrom("contactMessages");
    if (f.isRead !== undefined) base = base.where("isRead", "=", f.isRead);
    if (f.search) {
      const p = likePattern(f.search);
      base = base.where((eb) => eb.or([eb("name", "ilike", p), eb("email", "ilike", p), eb("subject", "ilike", p), eb("message", "ilike", p)]));
    }
    const [rows, count, unread] = await Promise.all([
      base.selectAll().orderBy("createdAt", "desc").orderBy("id").limit(f.limit).offset(toOffset(f.page, f.limit)).execute(),
      base.select((eb) => eb.fn.countAll<number>().as("n")).executeTakeFirstOrThrow(),
      this.unreadCount(),
    ]);
    return { rows, total: count.n, unread };
  }

  findById(id: string) {
    return this.db.selectFrom("contactMessages").selectAll().where("id", "=", id).executeTakeFirst();
  }

  setRead(id: string, isRead: boolean) {
    return this.db.updateTable("contactMessages").set({ isRead }).where("id", "=", id).returningAll().executeTakeFirst();
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.db.deleteFrom("contactMessages").where("id", "=", id).executeTakeFirst();
    return Number(res.numDeletedRows) > 0;
  }

  async unreadCount(): Promise<number> {
    const r = await this.db
      .selectFrom("contactMessages")
      .select((eb) => eb.fn.countAll<number>().as("n"))
      .where("isRead", "=", false)
      .executeTakeFirstOrThrow();
    return r.n;
  }
}
