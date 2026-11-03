import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import type { Logger } from "../lib/logger";

/** Structured request logging. Every request gets an id (also returned as the x-request-id header). */
export function requestLogger(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId: (req, res) => {
      const incoming = req.headers["x-request-id"];
      const id = typeof incoming === "string" && /^[\w.-]{8,64}$/.test(incoming) ? incoming : randomUUID();
      res.setHeader("x-request-id", id);
      return id;
    },
    autoLogging: { ignore: (req) => req.url === "/health" },
    customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
    serializers: {
      // Query strings and headers are left out on purpose (tokens, search terms, PII).
      req: (req) => ({ id: req.id, method: req.method, url: String(req.url).split("?")[0] }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  });
}
