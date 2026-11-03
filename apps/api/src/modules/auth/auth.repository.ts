import type { Kysely, Selectable, Transaction } from "kysely";
import type { Database } from "../../db/types";

export type UserRow = Selectable<Database["adminUsers"]>;
export type RefreshTokenRow = Selectable<Database["refreshTokens"]>;

export interface NewRefreshToken {
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent: string | null;
  ipHash: string | null;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<UserRow | undefined>;
  findUserById(id: string): Promise<UserRow | undefined>;
  touchLogin(userId: string, at: Date): Promise<void>;
  updatePasswordHash(userId: string, hash: string): Promise<void>;
  insertRefreshToken(row: NewRefreshToken): Promise<RefreshTokenRow>;
  /** `lock` = SELECT … FOR UPDATE, so two concurrent refreshes of one token are serialised. */
  findRefreshTokenByHash(hash: string, options?: { lock?: boolean }): Promise<RefreshTokenRow | undefined>;
  markRotated(id: string, replacedBy: string, at: Date): Promise<void>;
  revokeFamily(familyId: string, at: Date): Promise<void>;
  revokeAllForUser(userId: string, at: Date): Promise<void>;
  deleteExpired(before: Date): Promise<number>;
  transaction<T>(fn: (repo: AuthRepository) => Promise<T>): Promise<T>;
}

type Executor = Kysely<Database> | Transaction<Database>;

export class KyselyAuthRepository implements AuthRepository {
  constructor(private readonly db: Executor) {}

  findUserByEmail(email: string) {
    return this.db
      .selectFrom("adminUsers")
      .selectAll()
      .where((eb) => eb(eb.fn("lower", ["email"]), "=", email.toLowerCase()))
      .executeTakeFirst();
  }

  findUserById(id: string) {
    return this.db.selectFrom("adminUsers").selectAll().where("id", "=", id).executeTakeFirst();
  }

  async touchLogin(userId: string, at: Date) {
    await this.db.updateTable("adminUsers").set({ lastLoginAt: at }).where("id", "=", userId).execute();
  }

  async updatePasswordHash(userId: string, hash: string) {
    await this.db.updateTable("adminUsers").set({ passwordHash: hash }).where("id", "=", userId).execute();
  }

  insertRefreshToken(row: NewRefreshToken) {
    return this.db.insertInto("refreshTokens").values(row).returningAll().executeTakeFirstOrThrow();
  }

  findRefreshTokenByHash(hash: string, options: { lock?: boolean } = {}) {
    let q = this.db.selectFrom("refreshTokens").selectAll().where("tokenHash", "=", hash);
    if (options.lock) q = q.forUpdate();
    return q.executeTakeFirst();
  }

  async markRotated(id: string, replacedBy: string, at: Date) {
    await this.db.updateTable("refreshTokens").set({ revokedAt: at, replacedBy }).where("id", "=", id).execute();
  }

  async revokeFamily(familyId: string, at: Date) {
    await this.db
      .updateTable("refreshTokens")
      .set({ revokedAt: at })
      .where("familyId", "=", familyId)
      .where("revokedAt", "is", null)
      .execute();
  }

  async revokeAllForUser(userId: string, at: Date) {
    await this.db
      .updateTable("refreshTokens")
      .set({ revokedAt: at })
      .where("userId", "=", userId)
      .where("revokedAt", "is", null)
      .execute();
  }

  async deleteExpired(before: Date) {
    const res = await this.db.deleteFrom("refreshTokens").where("expiresAt", "<", before).executeTakeFirst();
    return Number(res.numDeletedRows);
  }

  transaction<T>(fn: (repo: AuthRepository) => Promise<T>): Promise<T> {
    // Already inside a transaction → reuse it.
    if ("isTransaction" in this.db && this.db.isTransaction) return fn(this);
    return (this.db as Kysely<Database>).transaction().execute((trx) => fn(new KyselyAuthRepository(trx)));
  }
}
