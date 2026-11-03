import path from "node:path";
import pg from "pg";
import { loadDotenvFiles } from "../config/env";
import { runMigrations } from "../db/migrate";

loadDotenvFiles();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  const applied = await runMigrations(pool, path.resolve(process.cwd(), "migrations"), (m) => console.log(m));
  console.log(applied.length ? `Applied ${applied.length} migration(s).` : "Database is up to date.");
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
