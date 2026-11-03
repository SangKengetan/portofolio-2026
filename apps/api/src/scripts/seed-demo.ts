import { loadConfig, loadDotenvFiles } from "../config/env";
import { createDb } from "../db/client";
import { seedDemo } from "../seed/demo";

/** pnpm --filter @portfolio/api seed:demo   (development only — wipes content tables) */
loadDotenvFiles();
const config = loadConfig();
if (config.isProd) {
  console.error("Refusing to load demo data in production.");
  process.exit(1);
}

const { db } = createDb(config.databaseUrl, 1);
try {
  const result = await seedDemo(db);
  console.log(`Demo data loaded: ${result.projects} projects, ${result.certificates} certificates, ${result.media} media rows.`);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await db.destroy();
}
