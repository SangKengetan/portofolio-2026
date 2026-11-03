import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

/**
 * Environment configuration, validated once at start-up.
 *
 * Files are read in this order (the first value found wins, real environment variables always win):
 *   1. .env.<NODE_ENV>   (e.g. .env.production, .env.development)
 *   2. .env
 */
export function loadDotenvFiles(cwd = process.cwd(), nodeEnv = process.env.NODE_ENV ?? "development") {
  loadDotenv({ path: path.resolve(cwd, `.env.${nodeEnv}`), quiet: true });
  loadDotenv({ path: path.resolve(cwd, ".env"), quiet: true });
}

const bool = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1");

const csv = z.string().transform((v) =>
  v
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  /** Number of reverse proxies in front of the API (Nginx = 1) so req.ip is the real client IP. */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),

  /** Origins allowed by CORS and the CSRF origin check, comma separated. */
  WEB_ORIGIN: csv.default("http://localhost:3000"),
  /** Public base URL used to build absolute media URLs (host that serves /uploads/*). */
  MEDIA_PUBLIC_URL: z.string().url().default("http://localhost:4000"),
  UPLOAD_DIR: z.string().default("./uploads"),
  /** Serve /uploads from Express (development). In production Nginx serves the folder. */
  SERVE_UPLOADS: bool.optional(),
  DOCS_ENABLED: bool.optional(),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(1).max(120).default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: bool.optional(),
  IP_HASH_SECRET: z.string().min(16, "IP_HASH_SECRET must be at least 16 characters"),

  /** Next.js on-demand revalidation (POST {REVALIDATE_URL}). Leave empty to disable. */
  REVALIDATE_URL: z.string().url().optional(),
  REVALIDATE_SECRET: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: bool.default("false"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("Portfolio <no-reply@localhost>"),
  CONTACT_NOTIFY_TO: z.string().email().optional(),

  GITHUB_TOKEN: z.string().optional(),
  GITHUB_USERNAME: z.string().optional(),
});

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  isProd: boolean;
  port: number;
  logLevel: string;
  trustProxy: number;
  databaseUrl: string;
  dbPoolMax: number;
  webOrigins: string[];
  /** Origins accepted by the CSRF check: the web origins, plus the API's own origin when Swagger UI (/docs) is enabled. */
  csrfOrigins: string[];
  mediaPublicUrl: string;
  uploadDir: string;
  serveUploads: boolean;
  docsEnabled: boolean;
  auth: {
    jwtSecret: string;
    accessTtlMinutes: number;
    refreshTtlDays: number;
    cookieDomain?: string;
    cookieSecure: boolean;
  };
  ipHashSecret: string;
  revalidate: { url?: string; secret?: string };
  mail: {
    host?: string;
    port: number;
    secure: boolean;
    user?: string;
    pass?: string;
    from: string;
    notifyTo?: string;
  };
  github: { token?: string; username?: string };
}

const WEAK = /change-?me|secret|password|example/i;

/** Pure function (no side effects) so it can be unit-tested with any source object. */
export function loadConfig(source: Record<string, string | undefined> = process.env): AppConfig {
  // `KEY=` in a .env file means "not set".
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== undefined && v !== ""));
  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".") || "env"}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
  }
  const e = parsed.data;
  const isProd = e.NODE_ENV === "production";
  const docsEnabled = e.DOCS_ENABLED ?? !isProd;

  if (isProd) {
    const problems: string[] = [];
    if (WEAK.test(e.JWT_ACCESS_SECRET)) problems.push("JWT_ACCESS_SECRET looks like a placeholder");
    if (WEAK.test(e.IP_HASH_SECRET)) problems.push("IP_HASH_SECRET looks like a placeholder");
    if (e.COOKIE_SECURE === false) problems.push("COOKIE_SECURE must not be false in production");
    if (e.WEB_ORIGIN.some((o) => !o.startsWith("https://"))) problems.push("WEB_ORIGIN must use https:// in production");
    if (e.REVALIDATE_URL && !e.REVALIDATE_SECRET) problems.push("REVALIDATE_SECRET is required when REVALIDATE_URL is set");
    if (problems.length) throw new Error(`Unsafe production configuration:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }

  return {
    nodeEnv: e.NODE_ENV,
    isProd,
    port: e.PORT,
    logLevel: e.LOG_LEVEL,
    trustProxy: e.TRUST_PROXY,
    databaseUrl: e.DATABASE_URL,
    dbPoolMax: e.DB_POOL_MAX,
    webOrigins: e.WEB_ORIGIN,
    csrfOrigins: docsEnabled
      ? [...new Set([...e.WEB_ORIGIN, new URL(e.MEDIA_PUBLIC_URL).origin, `http://localhost:${e.PORT}`, `http://127.0.0.1:${e.PORT}`])]
      : e.WEB_ORIGIN,
    mediaPublicUrl: e.MEDIA_PUBLIC_URL.replace(/\/$/, ""),
    uploadDir: path.resolve(e.UPLOAD_DIR),
    serveUploads: e.SERVE_UPLOADS ?? !isProd,
    docsEnabled,
    auth: {
      jwtSecret: e.JWT_ACCESS_SECRET,
      accessTtlMinutes: e.ACCESS_TOKEN_TTL_MINUTES,
      refreshTtlDays: e.REFRESH_TOKEN_TTL_DAYS,
      cookieDomain: e.COOKIE_DOMAIN,
      cookieSecure: e.COOKIE_SECURE ?? isProd,
    },
    ipHashSecret: e.IP_HASH_SECRET,
    revalidate: { url: e.REVALIDATE_URL, secret: e.REVALIDATE_SECRET },
    mail: {
      host: e.SMTP_HOST,
      port: e.SMTP_PORT,
      secure: e.SMTP_SECURE,
      user: e.SMTP_USER,
      pass: e.SMTP_PASS,
      from: e.MAIL_FROM,
      notifyTo: e.CONTACT_NOTIFY_TO,
    },
    github: { token: e.GITHUB_TOKEN, username: e.GITHUB_USERNAME },
  };
}
