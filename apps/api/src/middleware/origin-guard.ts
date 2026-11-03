import type { RequestHandler } from "express";
import { forbidden } from "../common/errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence for cookie-authenticated routes (rancangan §13), on top of SameSite=Lax:
 * a state-changing browser request must come from one of our own origins. Browsers always send
 * `Origin` on cross-site POST/PUT/PATCH/DELETE; requests without it (curl, Postman, server-to-server)
 * cannot be forged by a victim's browser, so they are allowed.
 */
export function originGuard(allowedOrigins: string[]): RequestHandler {
  const allowed = new Set(allowedOrigins);
  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.get("origin");
    if (origin && !allowed.has(origin)) return next(forbidden("Request origin is not allowed.", "ORIGIN_NOT_ALLOWED"));
    next();
  };
}
