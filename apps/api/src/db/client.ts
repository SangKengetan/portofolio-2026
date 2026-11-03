import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { Database } from "./types";

// DATE (1082) stays a plain "YYYY-MM-DD" string — the default parser would build a local-time Date
// and shift the day depending on the server time zone.
pg.types.setTypeParser(1082, (value: string) => value);
// BIGINT (20), e.g. count(*), is safe as a JS number for this data set.
pg.types.setTypeParser(20, (value: string) => Number.parseInt(value, 10));

export type Db = Kysely<Database>;

export interface DbHandle {
  db: Db;
  pool: pg.Pool;
}

export function createDb(connectionString: string, max = 10): DbHandle {
  const pool = new pg.Pool({ connectionString, max, idleTimeoutMillis: 30_000 });
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
    // JSONB documents keep their own key casing (e.g. block data { mediaId }).
    plugins: [new CamelCasePlugin({ maintainNestedObjectKeys: true })],
  });
  return { db, pool };
}
