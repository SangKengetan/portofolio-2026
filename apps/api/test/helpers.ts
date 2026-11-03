import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { sql } from "kysely";
import pg from "pg";
import pino from "pino";
import request from "supertest";
import { createApp } from "../src/app";
import { loadConfig, type AppConfig } from "../src/config/env";
import { buildContainer, type Container } from "../src/container";
import { runMigrations } from "../src/db/migrate";
import { InlineJobQueue } from "../src/lib/jobs";
import type { MailMessage, Mailer } from "../src/lib/mailer";
import type { PasswordHasher } from "../src/modules/auth/password";

/** Integration tests need a throw-away PostgreSQL database whose name ends in `_test`. */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
export const hasTestDb = !!TEST_DATABASE_URL;

/** Argon2 is deliberately slow; integration tests use a transparent stand-in. */
export const fastHasher: PasswordHasher = {
  hash: async (plain) => `fake$${plain}`,
  verify: async (hash, plain) => hash === `fake$${plain}`,
};

export class RecordingMailer implements Mailer {
  sent: MailMessage[] = [];
  async send(message: MailMessage) {
    this.sent.push(message);
  }
}

export interface FetchCall {
  url: string;
  init?: RequestInit;
}

export const ORIGIN = "http://localhost:3000";
export const ADMIN = { email: "admin@example.com", password: "Correct-Horse-9" };

export function testConfig(overrides: Record<string, string> = {}): AppConfig {
  return loadConfig({
    NODE_ENV: "test",
    DATABASE_URL: TEST_DATABASE_URL,
    JWT_ACCESS_SECRET: "test-secret-test-secret-test-secret-123",
    IP_HASH_SECRET: "test-ip-secret-123456",
    WEB_ORIGIN: ORIGIN,
    MEDIA_PUBLIC_URL: "https://cdn.example.com",
    UPLOAD_DIR: "/tmp/placeholder", // replaced per context
    REVALIDATE_URL: "http://web.test/api/revalidate",
    REVALIDATE_SECRET: "revalidate-secret",
    CONTACT_NOTIFY_TO: "owner@example.com",
    GITHUB_TOKEN: "ghp_test",
    GITHUB_USERNAME: "octocat",
    LOG_LEVEL: "silent",
    ...overrides,
  });
}

export async function createTestContext(envOverrides: Record<string, string> = {}, now?: () => Date) {
  if (!TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is not set");
  const dbName = new URL(TEST_DATABASE_URL).pathname.replace("/", "");
  if (!dbName.endsWith("_test")) throw new Error(`Refusing to wipe database "${dbName}": its name must end with _test`);

  const uploadDir = await mkdtemp(path.join(os.tmpdir(), "portfolio-uploads-"));
  const config = testConfig({ UPLOAD_DIR: uploadDir, ...envOverrides });

  // Fresh schema → real migrations → what production would run.
  const setupPool = new pg.Pool({ connectionString: TEST_DATABASE_URL, max: 1 });
  await setupPool.query("drop schema public cascade; create schema public;");
  await runMigrations(setupPool);
  await setupPool.end();

  const mailer = new RecordingMailer();
  const jobs = new InlineJobQueue();
  const fetchCalls: FetchCall[] = [];
  const github = { status: 200, body: {} as unknown };
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    fetchCalls.push({ url, init });
    if (url.startsWith("https://api.github.com")) {
      return new Response(JSON.stringify(github.body), { status: github.status, headers: { "content-type": "application/json" } });
    }
    return new Response("{}", { status: 200 });
  };

  const container: Container = buildContainer(config, {
    logger: pino({ level: "silent" }),
    mailer,
    jobs,
    hasher: fastHasher,
    fetchFn: fakeFetch,
    now,
  });

  const ctx = {
    /** Replaced by reset(): every test gets a fresh app, so rate-limit counters start at zero. */
    app: createApp(container),
    container,
    config,
    mailer,
    jobs,
    fetchCalls,
    github,
    uploadDir,
    /** Empty every table (keeps the schema). */
    async reset() {
      await sql`truncate table refresh_tokens, admin_users, project_blocks, project_metrics, project_technologies,
        experience_technologies, achievements, certificates, experiences, projects, technologies, site_profile,
        contact_messages, media restart identity cascade`.execute(container.db);
      container.cache.clear();
      ctx.app = createApp(container);
      mailer.sent.length = 0;
      fetchCalls.length = 0;
    },
    async close() {
      await container.close();
      await rm(uploadDir, { recursive: true, force: true });
    },
  };
  return ctx;
}

export type TestContext = Awaited<ReturnType<typeof createTestContext>>;

/** Inserts the admin account and returns a supertest agent that is already signed in. */
export async function signedInAgent(ctx: TestContext) {
  await ctx.container.db
    .insertInto("adminUsers")
    .values({ email: ADMIN.email, passwordHash: await fastHasher.hash(ADMIN.password), name: "Test Admin" })
    .onConflict((oc) => oc.doNothing())
    .execute();
  const agent = request.agent(ctx.app);
  const res = await agent.post("/v1/auth/login").send(ADMIN);
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

/** A real PNG so the upload pipeline (file-type + sharp) is exercised. */
export async function makePng(width = 1200, height = 800) {
  const sharp = (await import("sharp")).default;
  return sharp({ create: { width, height, channels: 3, background: { r: 120, g: 130, b: 140 } } })
    .png()
    .toBuffer();
}
