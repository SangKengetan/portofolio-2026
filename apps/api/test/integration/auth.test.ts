import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ADMIN, ORIGIN, createTestContext, fastHasher, hasTestDb, signedInAgent, type TestContext } from "../helpers";

describe.skipIf(!hasTestDb)("authentication", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(async () => ctx?.close());
  beforeEach(async () => {
    await ctx.reset();
    await ctx.container.db
      .insertInto("adminUsers")
      .values({ email: ADMIN.email, passwordHash: await fastHasher.hash(ADMIN.password), name: "Test Admin" })
      .execute();
  });

  const cookies = (res: request.Response) => (res.headers["set-cookie"] as unknown as string[]) ?? [];
  const cookie = (res: request.Response, name: string) => cookies(res).find((c) => c.startsWith(`${name}=`));

  it("logs in and sets httpOnly cookies scoped as designed", async () => {
    const res = await request(ctx.app).post("/v1/auth/login").send(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { user: { email: ADMIN.email, name: "Test Admin" } } });
    expect(JSON.stringify(res.body)).not.toMatch(/hash|token/i);

    const access = cookie(res, "pf_access")!;
    const refresh = cookie(res, "pf_refresh")!;
    expect(access).toMatch(/HttpOnly/);
    expect(access).toMatch(/SameSite=Lax/);
    expect(access).toMatch(/Path=\//);
    expect(refresh).toMatch(/HttpOnly/);
    expect(refresh).toMatch(/Path=\/v1\/auth/); // never sent to content endpoints
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("rejects wrong credentials with the same message for unknown users", async () => {
    const wrong = await request(ctx.app).post("/v1/auth/login").send({ email: ADMIN.email, password: "nope-nope" });
    const unknown = await request(ctx.app).post("/v1/auth/login").send({ email: "who@example.com", password: "nope-nope" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error).toEqual(unknown.body.error);
    expect(cookies(wrong)).toHaveLength(0);
  });

  it("validates the login body", async () => {
    const res = await request(ctx.app).post("/v1/auth/login").send({ email: "not-an-email" });
    expect(res.status).toBe(422);
    expect(res.body.error.fields).toHaveProperty("email");
    expect(res.body.error.fields).toHaveProperty("password");
  });

  it("protects /me and every admin route", async () => {
    expect((await request(ctx.app).get("/v1/auth/me")).status).toBe(401);
    for (const path of ["/v1/admin/dashboard", "/v1/admin/projects", "/v1/admin/media", "/v1/admin/messages", "/v1/admin/profile"]) {
      const res = await request(ctx.app).get(path);
      expect(res.status, path).toBe(401);
      expect(res.body).toMatchObject({ success: false, error: { code: "UNAUTHORIZED" } });
    }
    const agent = await signedInAgent(ctx);
    const me = await agent.get("/v1/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(ADMIN.email);
    expect((await agent.get("/v1/admin/dashboard")).status).toBe(200);
  });

  it("rejects a forged or expired access token", async () => {
    const res = await request(ctx.app).get("/v1/auth/me").set("Cookie", "pf_access=eyJhbGciOiJIUzI1NiJ9.e30.bad");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("TOKEN_INVALID");
  });

  it("rotates refresh tokens and detects replay", async () => {
    const login = await request(ctx.app).post("/v1/auth/login").send(ADMIN);
    const oldRefresh = cookie(login, "pf_refresh")!.split(";")[0]!;

    const refreshed = await request(ctx.app).post("/v1/auth/refresh").set("Cookie", oldRefresh);
    expect(refreshed.status).toBe(200);
    const newRefresh = cookie(refreshed, "pf_refresh")!.split(";")[0]!;
    expect(newRefresh).not.toBe(oldRefresh);

    // Age the first rotation past the 10 s grace window, then replay the old token.
    await ctx.container.db.updateTable("refreshTokens").set({ revokedAt: new Date(Date.now() - 60_000) }).where("replacedBy", "is not", null).execute();
    const replay = await request(ctx.app).post("/v1/auth/refresh").set("Cookie", oldRefresh);
    expect(replay.status).toBe(401);
    expect(cookie(replay, "pf_refresh")).toMatch(/Expires=Thu, 01 Jan 1970/); // cleared

    // The attacker's replay burned the family: the legitimate new token is dead as well.
    const afterReplay = await request(ctx.app).post("/v1/auth/refresh").set("Cookie", newRefresh);
    expect(afterReplay.status).toBe(401);
    const live = await ctx.container.db.selectFrom("refreshTokens").select("id").where("revokedAt", "is", null).execute();
    expect(live).toHaveLength(0);
  });

  it("logout revokes the session server-side", async () => {
    const login = await request(ctx.app).post("/v1/auth/login").send(ADMIN);
    const refresh = cookie(login, "pf_refresh")!.split(";")[0]!;
    const out = await request(ctx.app).post("/v1/auth/logout").set("Cookie", refresh);
    expect(out.status).toBe(200);
    expect((await request(ctx.app).post("/v1/auth/refresh").set("Cookie", refresh)).status).toBe(401);
  });

  it("changing the password requires the current one and ends all sessions", async () => {
    const agent = await signedInAgent(ctx);
    const bad = await agent.post("/v1/auth/change-password").send({ currentPassword: "wrong", newPassword: "Brand-New-Pass-1" });
    expect(bad.status).toBe(403);
    const weak = await agent.post("/v1/auth/change-password").send({ currentPassword: ADMIN.password, newPassword: "short" });
    expect(weak.status).toBe(422);

    const ok = await agent.post("/v1/auth/change-password").send({ currentPassword: ADMIN.password, newPassword: "Brand-New-Pass-1" });
    expect(ok.status).toBe(200);
    expect((await request(ctx.app).post("/v1/auth/login").send(ADMIN)).status).toBe(401);
    expect((await request(ctx.app).post("/v1/auth/login").send({ email: ADMIN.email, password: "Brand-New-Pass-1" })).status).toBe(200);
  });

  it("lets Swagger UI (served from the API's own origin) sign in and write while docs are enabled", async () => {
    const origin = new URL(ctx.config.mediaPublicUrl).origin;
    const agent = request.agent(ctx.app);
    await signedInAgent(ctx); // makes sure the admin exists
    const login = await agent.post("/v1/auth/login").set("Origin", origin).send(ADMIN);
    expect(login.status).toBe(200);
    const write = await agent.post("/v1/admin/technologies").set("Origin", origin).send({ name: "FromSwagger", group: "web" });
    expect(write.status).toBe(201);
  });

  it("blocks state-changing requests from foreign origins (CSRF) but allows our own", async () => {
    const agent = await signedInAgent(ctx);
    const evil = await agent.post("/v1/admin/technologies").set("Origin", "https://evil.example").send({ name: "X", group: "web" });
    expect(evil.status).toBe(403);
    expect(evil.body.error.code).toBe("ORIGIN_NOT_ALLOWED");
    const evilLogin = await request(ctx.app).post("/v1/auth/login").set("Origin", "https://evil.example").send(ADMIN);
    expect(evilLogin.status).toBe(403);

    const own = await agent.post("/v1/admin/technologies").set("Origin", ORIGIN).send({ name: "X", group: "web" });
    expect(own.status).toBe(201);
  });

  it("rate-limits failed logins: the 6th attempt in 15 minutes is refused", async () => {
    const wrong = { email: ADMIN.email, password: "nope-nope" };
    for (let i = 0; i < 5; i++) expect((await request(ctx.app).post("/v1/auth/login").send(wrong)).status).toBe(401);
    const blocked = await request(ctx.app).post("/v1/auth/login").send(wrong);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("RATE_LIMITED");
    // even the right password is refused while the window is exhausted
    expect((await request(ctx.app).post("/v1/auth/login").send(ADMIN)).status).toBe(429);
  });
});
