import { defineConfig } from "tsup";

/**
 * Three entry points: the server, the migration runner and the production-safe admin seed.
 * `@portfolio/shared` ships TypeScript source, so it is bundled into the output instead of being
 * resolved from node_modules at runtime.
 */
export default defineConfig({
  entry: {
    server: "src/server.ts",
    "scripts/migrate": "src/scripts/migrate.ts",
    "scripts/seed-admin": "src/scripts/seed-admin.ts",
  },
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  splitting: false,
  noExternal: ["@portfolio/shared"],
});
