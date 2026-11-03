import type { CookieOptions, Request, Response } from "express";
import { deleted, ok } from "../../common/http";
import { parse } from "../../common/validate";
import type { AppConfig } from "../../config/env";
import { unauthorized } from "../../common/errors";
import type { AuthService, RequestContext, Session } from "./auth.service";
import { changePasswordBody, loginBody } from "./auth.schema";

export const ACCESS_COOKIE = "pf_access";
export const REFRESH_COOKIE = "pf_refresh";
/** The refresh cookie is only ever sent to the auth endpoints. */
const REFRESH_PATH = "/v1/auth";

export const requestContext = (req: Request): RequestContext => ({
  ip: req.ip,
  userAgent: req.get("user-agent") ?? undefined,
});

export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cfg: AppConfig["auth"],
  ) {}

  private cookieBase(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.cfg.cookieSecure,
      sameSite: "lax",
      domain: this.cfg.cookieDomain,
    };
  }

  private setSessionCookies(res: Response, session: Session) {
    res.cookie(ACCESS_COOKIE, session.accessToken, { ...this.cookieBase(), path: "/", expires: session.accessExpiresAt });
    res.cookie(REFRESH_COOKIE, session.refreshToken, {
      ...this.cookieBase(),
      path: REFRESH_PATH,
      expires: session.refreshExpiresAt,
    });
  }

  private clearSessionCookies(res: Response) {
    res.clearCookie(ACCESS_COOKIE, { ...this.cookieBase(), path: "/" });
    res.clearCookie(REFRESH_COOKIE, { ...this.cookieBase(), path: REFRESH_PATH });
  }

  login = async (req: Request, res: Response) => {
    const { email, password } = parse(loginBody, req.body);
    const session = await this.auth.login(email, password, requestContext(req));
    this.setSessionCookies(res, session);
    ok(res, { user: session.user, accessExpiresAt: session.accessExpiresAt.toISOString() }, { message: "Signed in." });
  };

  refresh = async (req: Request, res: Response) => {
    try {
      const session = await this.auth.refresh(req.cookies?.[REFRESH_COOKIE], requestContext(req));
      this.setSessionCookies(res, session);
      ok(res, { user: session.user, accessExpiresAt: session.accessExpiresAt.toISOString() }, { message: "Session refreshed." });
    } catch (err) {
      this.clearSessionCookies(res);
      throw err;
    }
  };

  logout = async (req: Request, res: Response) => {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    this.clearSessionCookies(res);
    deleted(res, "Signed out.");
  };

  me = async (req: Request, res: Response) => {
    if (!req.adminId) throw unauthorized();
    ok(res, await this.auth.me(req.adminId));
  };

  changePassword = async (req: Request, res: Response) => {
    if (!req.adminId) throw unauthorized();
    const body = parse(changePasswordBody, req.body);
    await this.auth.changePassword(req.adminId, body.currentPassword, body.newPassword);
    this.clearSessionCookies(res);
    ok(res, null, { message: "Password changed. Please sign in again." });
  };
}
