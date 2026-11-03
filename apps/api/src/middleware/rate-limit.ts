import type { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { tooManyRequests } from "../common/errors";

function limiter(options: { windowMs: number; limit: number; message: string; skipSuccessfulRequests?: boolean }): RequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    handler: (_req, _res, next) => next(tooManyRequests(options.message)),
  });
}

export interface Limiters {
  /** Safety net for every /v1 route. */
  global: RequestHandler;
  /** Login: 5 failed attempts / 15 minutes / IP (rancangan §13). Successful logins do not count. */
  login: RequestHandler;
  /** Refresh-token endpoint. */
  refresh: RequestHandler;
  /** Contact form: 3 messages / hour / IP (rancangan §10.1). */
  contact: RequestHandler;
  /** Uploads are CPU-heavy (sharp): cap them. */
  upload: RequestHandler;
}

/** New instances per app, so every app (and every test) starts with empty counters. */
export function createLimiters(): Limiters {
  return {
    global: limiter({ windowMs: 60_000, limit: 300, message: "Too many requests, please slow down." }),
    login: limiter({
      windowMs: 15 * 60_000,
      limit: 5,
      skipSuccessfulRequests: true,
      message: "Too many failed sign-in attempts. Try again in 15 minutes.",
    }),
    refresh: limiter({ windowMs: 60_000, limit: 30, message: "Too many refresh attempts." }),
    contact: limiter({ windowMs: 60 * 60_000, limit: 3, message: "Too many messages — please try again in an hour." }),
    upload: limiter({ windowMs: 60_000, limit: 30, message: "Too many uploads, please slow down." }),
  };
}
