import type { RequestHandler } from "express";
import type { AuthService } from "../modules/auth/auth.service";
import { ACCESS_COOKIE } from "../modules/auth/auth.controller";

/** Verifies the short-lived access-token cookie and exposes the admin id as `req.adminId`. */
export function requireAdmin(auth: AuthService): RequestHandler {
  return async (req, res, next) => {
    try {
      const { userId } = await auth.verifyAccessToken(req.cookies?.[ACCESS_COOKIE]);
      req.adminId = userId;
      res.setHeader("Cache-Control", "no-store"); // never cache admin responses
      next();
    } catch (err) {
      next(err);
    }
  };
}
