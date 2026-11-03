import pg from "pg";
import { loadDotenvFiles } from "../config/env";
import { Argon2Hasher } from "../modules/auth/password";

/**
 * Production-safe seed: creates the single admin account (and an empty profile row) if missing.
 * Never overwrites an existing account unless --reset-password is passed.
 *
 *   ADMIN_EMAIL=me@domain.com ADMIN_PASSWORD='long-random-password' pnpm --filter @portfolio/api seed:admin
 */
loadDotenvFiles();

const { DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
if (!DATABASE_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Set DATABASE_URL, ADMIN_EMAIL and ADMIN_PASSWORD.");
  process.exit(1);
}
if (ADMIN_PASSWORD.length < 12) {
  console.error("ADMIN_PASSWORD must be at least 12 characters.");
  process.exit(1);
}

const reset = process.argv.includes("--reset-password");
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
try {
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const name = ADMIN_NAME?.trim() || "Admin";
  const existing = await pool.query<{ id: string }>("select id from admin_users where lower(email) = $1", [email]);

  if (existing.rowCount === 0) {
    const hash = await new Argon2Hasher().hash(ADMIN_PASSWORD);
    await pool.query("insert into admin_users (email, password_hash, name) values ($1, $2, $3)", [email, hash, name]);
    console.log(`Admin created: ${email}`);
  } else if (reset) {
    const hash = await new Argon2Hasher().hash(ADMIN_PASSWORD);
    await pool.query("update admin_users set password_hash = $2 where id = $1", [existing.rows[0]!.id, hash]);
    await pool.query("update refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null", [existing.rows[0]!.id]);
    console.log(`Password reset for ${email} (all sessions revoked).`);
  } else {
    console.log(`Admin ${email} already exists — nothing to do (use --reset-password to change it).`);
  }

  await pool.query(
    `insert into site_profile (id, full_name, short_name, email) values (1, $1, $2, $3) on conflict (id) do nothing`,
    [name, name.split(" ")[0], email],
  );
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
