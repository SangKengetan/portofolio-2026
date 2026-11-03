import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "../../src/common/errors";
import { sha256Hex } from "../../src/lib/crypto";
import type { AuthRepository, NewRefreshToken, RefreshTokenRow, UserRow } from "../../src/modules/auth/auth.repository";
import { AuthService } from "../../src/modules/auth/auth.service";
import type { PasswordHasher } from "../../src/modules/auth/password";

/** In-memory repository: the service is tested without a database or Express. */
class FakeAuthRepo implements AuthRepository {
  users: UserRow[] = [];
  tokens: RefreshTokenRow[] = [];

  async findUserByEmail(email: string) {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }
  async findUserById(id: string) {
    return this.users.find((u) => u.id === id);
  }
  async touchLogin(id: string, at: Date) {
    const u = this.users.find((x) => x.id === id)!;
    u.lastLoginAt = at;
  }
  async updatePasswordHash(id: string, hash: string) {
    this.users.find((x) => x.id === id)!.passwordHash = hash;
  }
  async insertRefreshToken(row: NewRefreshToken) {
    const t: RefreshTokenRow = { id: crypto.randomUUID(), revokedAt: null, replacedBy: null, createdAt: new Date(), ...row };
    this.tokens.push(t);
    return t;
  }
  async findRefreshTokenByHash(hash: string) {
    return this.tokens.find((t) => t.tokenHash === hash);
  }
  async markRotated(id: string, replacedBy: string, at: Date) {
    Object.assign(this.tokens.find((t) => t.id === id)!, { revokedAt: at, replacedBy });
  }
  async revokeFamily(familyId: string, at: Date) {
    for (const t of this.tokens) if (t.familyId === familyId && !t.revokedAt) t.revokedAt = at;
  }
  async revokeAllForUser(userId: string, at: Date) {
    for (const t of this.tokens) if (t.userId === userId && !t.revokedAt) t.revokedAt = at;
  }
  async deleteExpired() {
    return 0;
  }
  transaction<T>(fn: (repo: AuthRepository) => Promise<T>): Promise<T> {
    return fn(this);
  }
}

const hasher: PasswordHasher = {
  hash: async (p) => `h:${p}`,
  verify: async (h, p) => h === `h:${p}`,
};

describe("AuthService", () => {
  let repo: FakeAuthRepo;
  let clock: Date;
  let service: AuthService;
  const settings = { jwtSecret: "s".repeat(40), accessTtlMinutes: 15, refreshTtlDays: 7, ipHashSecret: "i".repeat(20) };

  beforeEach(() => {
    repo = new FakeAuthRepo();
    clock = new Date("2026-10-26T10:00:00Z");
    repo.users.push({
      id: "11111111-1111-1111-1111-111111111111",
      email: "Admin@Example.com",
      passwordHash: "h:secret-password-1A",
      name: "Admin",
      lastLoginAt: null,
      createdAt: clock,
      updatedAt: clock,
    });
    service = new AuthService(repo, hasher, settings, () => clock);
  });

  const advance = (ms: number) => (clock = new Date(clock.getTime() + ms));
  const code = async (p: Promise<unknown>) => {
    try {
      await p;
      return null;
    } catch (e) {
      return (e as AppError).code;
    }
  };

  it("logs in case-insensitively and returns a session without secrets", async () => {
    const s = await service.login("admin@example.com", "secret-password-1A", { ip: "1.2.3.4", userAgent: "UA" });
    expect(s.user).toMatchObject({ id: expect.any(String), email: "Admin@Example.com", name: "Admin" });
    expect(Object.keys(s.user).sort()).toEqual(["email", "id", "lastLoginAt", "name"]);
    expect(JSON.stringify(s.user)).not.toMatch(/hash/i);
    expect(s.accessExpiresAt.getTime() - clock.getTime()).toBe(15 * 60_000);
    expect(s.refreshExpiresAt.getTime() - clock.getTime()).toBe(7 * 86_400_000);
    // only the hash of the refresh token is stored, the IP only as a hash
    expect(repo.tokens[0]!.tokenHash).toBe(sha256Hex(s.refreshToken));
    expect(repo.tokens[0]!.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(await service.verifyAccessToken(s.accessToken)).toEqual({ userId: repo.users[0]!.id });
  });

  it("gives the same error for an unknown e-mail and a wrong password", async () => {
    expect(await code(service.login("nobody@example.com", "x"))).toBe("INVALID_CREDENTIALS");
    expect(await code(service.login("admin@example.com", "wrong"))).toBe("INVALID_CREDENTIALS");
  });

  it("rejects expired, tampered and foreign access tokens", async () => {
    const s = await service.login("admin@example.com", "secret-password-1A");
    advance(16 * 60_000);
    expect(await code(service.verifyAccessToken(s.accessToken))).toBe("TOKEN_INVALID");
    expect(await code(service.verifyAccessToken(s.accessToken.slice(0, -2) + "xx"))).toBe("TOKEN_INVALID");
    expect(await code(service.verifyAccessToken(undefined))).toBe("UNAUTHORIZED");
    const other = new AuthService(repo, hasher, { ...settings, jwtSecret: "z".repeat(40) }, () => clock);
    const fresh = await other.login("admin@example.com", "secret-password-1A");
    expect(await code(service.verifyAccessToken(fresh.accessToken))).toBe("TOKEN_INVALID");
  });

  it("rotates the refresh token: the old one stops working, the new one works", async () => {
    const first = await service.login("admin@example.com", "secret-password-1A");
    advance(60_000);
    const second = await service.refresh(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(repo.tokens).toHaveLength(2);
    expect(repo.tokens[0]!.replacedBy).toBe(repo.tokens[1]!.id);
    expect(repo.tokens[1]!.familyId).toBe(repo.tokens[0]!.familyId);
    advance(60_000);
    await expect(service.refresh(second.refreshToken)).resolves.toBeDefined();
  });

  it("revokes the whole family when an old token is replayed after the grace window", async () => {
    const first = await service.login("admin@example.com", "secret-password-1A");
    const second = await service.refresh(first.refreshToken);
    advance(60_000); // well past the 10 s grace period
    expect(await code(service.refresh(first.refreshToken))).toBe("SESSION_EXPIRED");
    // the legitimate holder of `second` is logged out too
    expect(await code(service.refresh(second.refreshToken))).toBe("SESSION_EXPIRED");
    expect(repo.tokens.every((t) => t.revokedAt)).toBe(true);
  });

  it("does not punish a racing tab: a replay inside the grace window is only rejected", async () => {
    const first = await service.login("admin@example.com", "secret-password-1A");
    const second = await service.refresh(first.refreshToken);
    advance(2_000);
    expect(await code(service.refresh(first.refreshToken))).toBe("SESSION_EXPIRED");
    await expect(service.refresh(second.refreshToken)).resolves.toBeDefined();
  });

  it("rejects expired and unknown refresh tokens", async () => {
    const s = await service.login("admin@example.com", "secret-password-1A");
    expect(await code(service.refresh("not-a-token"))).toBe("SESSION_EXPIRED");
    expect(await code(service.refresh(undefined))).toBe("SESSION_EXPIRED");
    advance(8 * 86_400_000);
    expect(await code(service.refresh(s.refreshToken))).toBe("SESSION_EXPIRED");
  });

  it("logout revokes the login's tokens", async () => {
    const first = await service.login("admin@example.com", "secret-password-1A");
    const second = await service.refresh(first.refreshToken);
    await service.logout(second.refreshToken);
    expect(repo.tokens.every((t) => t.revokedAt)).toBe(true);
    await expect(service.logout(undefined)).resolves.toBeUndefined();
  });

  it("changing the password needs the current one and signs every device out", async () => {
    const s = await service.login("admin@example.com", "secret-password-1A");
    const id = repo.users[0]!.id;
    expect(await code(service.changePassword(id, "wrong", "New-password-123"))).toBe("INVALID_CREDENTIALS");
    await service.changePassword(id, "secret-password-1A", "New-password-123");
    expect(await code(service.refresh(s.refreshToken))).toBe("SESSION_EXPIRED");
    expect(await code(service.login("admin@example.com", "secret-password-1A"))).toBe("INVALID_CREDENTIALS");
    await expect(service.login("admin@example.com", "New-password-123")).resolves.toBeDefined();
  });
});
