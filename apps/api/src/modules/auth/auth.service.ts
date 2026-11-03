import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { forbidden, unauthorized } from "../../common/errors";
import { hashIp, randomToken, sha256Hex } from "../../lib/crypto";
import type { PasswordHasher } from "./password";
import type { AuthRepository, UserRow } from "./auth.repository";

const ISSUER = "portfolio-api";
const AUDIENCE = "portfolio-admin";
/** A rotated token replayed within this window is a racing tab, not an attack. */
const REUSE_GRACE_MS = 10_000;

export interface AuthSettings {
  jwtSecret: string;
  accessTtlMinutes: number;
  refreshTtlDays: number;
  ipHashSecret: string;
}

export interface RequestContext {
  ip?: string;
  userAgent?: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  lastLoginAt: string | null;
}

export interface Session {
  user: PublicUser;
  accessToken: string;
  accessExpiresAt: Date;
  refreshToken: string;
  refreshExpiresAt: Date;
}

const toPublicUser = (u: UserRow): PublicUser => ({
  id: u.id,
  email: u.email,
  name: u.name,
  lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
});

const INVALID_CREDENTIALS = () => unauthorized("Invalid email or password.", "INVALID_CREDENTIALS");
const INVALID_SESSION = () => unauthorized("Your session has expired. Please sign in again.", "SESSION_EXPIRED");

export class AuthService {
  private dummyHash?: Promise<string>;
  private readonly key: Uint8Array;

  constructor(
    private readonly repo: AuthRepository,
    private readonly hasher: PasswordHasher,
    private readonly settings: AuthSettings,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.key = new TextEncoder().encode(settings.jwtSecret);
  }

  async login(email: string, password: string, ctx: RequestContext = {}): Promise<Session> {
    const user = await this.repo.findUserByEmail(email.trim());
    // Always run one hash verification so "unknown e-mail" and "wrong password" take the same time.
    this.dummyHash ??= this.hasher.hash(randomToken());
    const valid = await this.hasher.verify(user?.passwordHash ?? (await this.dummyHash), password);
    if (!user || !valid) throw INVALID_CREDENTIALS();

    await this.repo.touchLogin(user.id, this.now());
    return this.issueSession(user, randomUUID(), ctx);
  }

  async refresh(rawRefreshToken: string | undefined, ctx: RequestContext = {}): Promise<Session> {
    if (!rawRefreshToken) throw INVALID_SESSION();
    const tokenHash = sha256Hex(rawRefreshToken);
    const now = this.now();

    const outcome = await this.repo.transaction(async (repo) => {
      const current = await repo.findRefreshTokenByHash(tokenHash, { lock: true });
      if (!current) return { kind: "invalid" as const };

      if (current.revokedAt) {
        const age = now.getTime() - current.revokedAt.getTime();
        // Replaying a token that was already rotated (outside the grace window) means it may have
        // been stolen: revoke every token of this login so neither party keeps access.
        if (current.replacedBy && age > REUSE_GRACE_MS) await repo.revokeFamily(current.familyId, now);
        return { kind: "invalid" as const };
      }
      if (current.expiresAt <= now) return { kind: "invalid" as const };

      const user = await repo.findUserById(current.userId);
      if (!user) return { kind: "invalid" as const };

      const next = await this.createRefreshToken(repo, user.id, current.familyId, ctx);
      await repo.markRotated(current.id, next.rowId, now);
      return { kind: "ok" as const, user, next };
    });

    if (outcome.kind !== "ok") throw INVALID_SESSION();
    const access = await this.signAccessToken(outcome.user.id);
    return {
      user: toPublicUser(outcome.user),
      accessToken: access.token,
      accessExpiresAt: access.expiresAt,
      refreshToken: outcome.next.raw,
      refreshExpiresAt: outcome.next.expiresAt,
    };
  }

  /** Revokes the whole login (family) of the presented refresh token. Always succeeds. */
  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;
    const row = await this.repo.findRefreshTokenByHash(sha256Hex(rawRefreshToken));
    if (row) await this.repo.revokeFamily(row.familyId, this.now());
  }

  /** Returns the user id if the access token is valid, otherwise throws 401. */
  async verifyAccessToken(token: string | undefined): Promise<{ userId: string }> {
    if (!token) throw unauthorized();
    try {
      const { payload } = await jwtVerify(token, this.key, {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ["HS256"],
        currentDate: this.now(),
      });
      if (!payload.sub) throw new Error("no subject");
      return { userId: payload.sub };
    } catch {
      throw unauthorized("Your session has expired. Please sign in again.", "TOKEN_INVALID");
    }
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.repo.findUserById(userId);
    if (!user) throw unauthorized();
    return toPublicUser(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.repo.findUserById(userId);
    if (!user) throw unauthorized();
    if (!(await this.hasher.verify(user.passwordHash, currentPassword))) {
      throw forbidden("Current password is incorrect.", "INVALID_CREDENTIALS");
    }
    await this.repo.updatePasswordHash(userId, await this.hasher.hash(newPassword));
    // Every device must sign in again with the new password.
    await this.repo.revokeAllForUser(userId, this.now());
  }

  /* ---------- internals ---------- */

  private async issueSession(user: UserRow, familyId: string, ctx: RequestContext): Promise<Session> {
    const refresh = await this.createRefreshToken(this.repo, user.id, familyId, ctx);
    const access = await this.signAccessToken(user.id);
    return {
      user: toPublicUser(user),
      accessToken: access.token,
      accessExpiresAt: access.expiresAt,
      refreshToken: refresh.raw,
      refreshExpiresAt: refresh.expiresAt,
    };
  }

  private async createRefreshToken(repo: AuthRepository, userId: string, familyId: string, ctx: RequestContext) {
    const raw = randomToken();
    const expiresAt = new Date(this.now().getTime() + this.settings.refreshTtlDays * 86_400_000);
    const row = await repo.insertRefreshToken({
      userId,
      familyId,
      tokenHash: sha256Hex(raw),
      expiresAt,
      userAgent: ctx.userAgent?.slice(0, 255) ?? null,
      ipHash: hashIp(ctx.ip, this.settings.ipHashSecret),
    });
    return { raw, expiresAt, rowId: row.id };
  }

  private async signAccessToken(userId: string) {
    const issued = this.now();
    const expiresAt = new Date(issued.getTime() + this.settings.accessTtlMinutes * 60_000);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(userId)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt(Math.floor(issued.getTime() / 1000))
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(this.key);
    return { token, expiresAt };
  }
}
