import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { sql } from "kysely";
import type { Container } from "./container";
import { mountDocs } from "./docs/mount";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { createLimiters } from "./middleware/rate-limit";
import { requestLogger } from "./middleware/request-logger";
import { adminRoutes, authRoutes } from "./routes/admin";
import { publicRoutes } from "./routes/public";

export function createApp(c: Container): Express {
  const { config } = c;
  const app = express();
  const limiters = createLimiters();

  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);
  app.use(requestLogger(c.logger));

  // Interactive docs ship their own inline scripts, so they are mounted before helmet's strict CSP.
  if (config.docsEnabled) mountDocs(app);

  app.use(
    helmet({
      // Uploaded images are loaded by the website from another origin.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  const allowed = new Set(config.webOrigins);
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || allowed.has(origin)),
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "X-Request-Id"],
      exposedHeaders: ["X-Request-Id", "X-Unread-Count"],
      maxAge: 600,
    }),
  );

  // Health checks: cheap liveness, and readiness that also pings the database.
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: Math.round(process.uptime()) });
  });
  app.get("/health/ready", async (_req, res) => {
    try {
      await sql`select 1`.execute(c.db);
      res.json({ status: "ready" });
    } catch (err) {
      c.logger.error({ err }, "readiness check failed");
      res.status(503).json({ status: "unavailable" });
    }
  });

  if (config.serveUploads) {
    // Development only — in production Nginx serves this folder (rancangan §12, §15).
    app.use(
      "/uploads",
      express.static(config.uploadDir, {
        index: false,
        dotfiles: "deny",
        maxAge: "365d",
        immutable: true,
        setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
      }),
    );
  }

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  const v1 = express.Router();
  v1.use(limiters.global);
  v1.use("/auth", authRoutes(c, limiters));
  v1.use("/admin", adminRoutes(c, limiters));
  v1.use(publicRoutes(c, limiters));
  app.use("/v1", v1);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
