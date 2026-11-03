import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ORIGIN, createTestContext, hasTestDb, signedInAgent, type TestContext } from "../helpers";

describe.skipIf(!hasTestDb)("contact form", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(async () => ctx?.close());
  beforeEach(() => ctx.reset());

  const valid = { name: "Ada Lovelace", email: "ada@example.com", subject: "Project", message: "I would like to hire you for a project." };

  it("stores the message, hashes the IP and notifies the owner", async () => {
    const res = await request(ctx.app).post("/v1/contact").set("Origin", ORIGIN).send(valid);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true, message: "Message sent.", data: { received: true } });

    const rows = await ctx.container.db.selectFrom("contactMessages").selectAll().execute();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Ada Lovelace", isRead: false });
    expect(rows[0]!.ipHash).toMatch(/^[0-9a-f]{64}$/);
    await ctx.jobs.drain();
    expect(ctx.mailer.sent).toHaveLength(1);
    expect(ctx.mailer.sent[0]!.to).toBe("owner@example.com");
  });

  it("answers a filled honeypot exactly like a success but keeps nothing", async () => {
    const res = await request(ctx.app).post("/v1/contact").send({ ...valid, website: "http://spam.example" });
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ received: true });
    expect(await ctx.container.db.selectFrom("contactMessages").select("id").execute()).toHaveLength(0);
    await ctx.jobs.drain();
    expect(ctx.mailer.sent).toHaveLength(0);
  });

  it("returns per-field validation errors (422)", async () => {
    const res = await request(ctx.app).post("/v1/contact").send({ name: "A", email: "bad", message: "short" });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.fields).sort()).toEqual(["email", "message", "name"]);
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await request(ctx.app).post("/v1/contact").set("Content-Type", "application/json").send("{bad json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });

  it("allows 3 messages per hour per IP, then answers 429 (the message the website shows)", async () => {
    for (let i = 0; i < 3; i++) expect((await request(ctx.app).post("/v1/contact").send(valid)).status).toBe(201);
    const res = await request(ctx.app).post("/v1/contact").send(valid);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("RATE_LIMITED");
  });

  it("lets the admin read, mark and delete messages", async () => {
    await request(ctx.app).post("/v1/contact").send(valid);
    const agent = await signedInAgent(ctx);
    const list = await agent.get("/v1/admin/messages");
    expect(list.status).toBe(200);
    expect(list.headers["x-unread-count"]).toBe("1");
    const id = list.body.data[0].id as string;

    const read = await agent.patch(`/v1/admin/messages/${id}`).send({ isRead: true });
    expect(read.body.data.isRead).toBe(true);
    expect((await agent.get("/v1/admin/messages?isRead=false")).body.data).toHaveLength(0);
    expect((await agent.get("/v1/admin/dashboard")).body.data.messages).toEqual({ total: 1, unread: 0 });

    expect((await agent.delete(`/v1/admin/messages/${id}`)).status).toBe(200);
    expect((await agent.get(`/v1/admin/messages/${id}`)).status).toBe(404);
  });
});

describe.skipIf(!hasTestDb)("platform behaviour", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(async () => ctx?.close());
  beforeEach(() => ctx.reset());

  it("health endpoints", async () => {
    expect((await request(ctx.app).get("/health")).body.status).toBe("ok");
    expect((await request(ctx.app).get("/health/ready")).body).toEqual({ status: "ready" });
  });

  it("unknown routes use the standard error envelope", async () => {
    const res = await request(ctx.app).get("/v1/nope");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: { code: "ROUTE_NOT_FOUND" } });
    expect(res.headers["x-request-id"]).toBeTruthy();
    expect(res.body.requestId).toBe(res.headers["x-request-id"]);
  });

  it("reuses a valid incoming x-request-id and ignores junk", async () => {
    const good = await request(ctx.app).get("/health").set("x-request-id", "abc-12345678");
    expect(good.headers["x-request-id"]).toBe("abc-12345678");
    const bad = await request(ctx.app).get("/health").set("x-request-id", "bad id with spaces!");
    expect(bad.headers["x-request-id"]).not.toBe("bad id with spaces!");
  });

  it("sends security headers and no X-Powered-By", async () => {
    const res = await request(ctx.app).get("/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["strict-transport-security"]).toBeTruthy();
  });

  it("CORS: only the configured website origin, with credentials", async () => {
    const allowed = await request(ctx.app).get("/v1/stats").set("Origin", ORIGIN);
    expect(allowed.headers["access-control-allow-origin"]).toBe(ORIGIN);
    expect(allowed.headers["access-control-allow-credentials"]).toBe("true");
    const denied = await request(ctx.app).get("/v1/stats").set("Origin", "https://evil.example");
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
    const preflight = await request(ctx.app).options("/v1/admin/projects").set("Origin", ORIGIN).set("Access-Control-Request-Method", "PUT");
    expect(preflight.status).toBe(204);
    expect(preflight.headers["access-control-allow-methods"]).toContain("PUT");
  });

  it("answers 404 for an unpublished or unknown project and 422 for a malformed slug", async () => {
    expect((await request(ctx.app).get("/v1/projects/nope")).status).toBe(404);
    expect((await request(ctx.app).get("/v1/projects/Bad%20Slug")).status).toBe(422);
  });

  it("returns 404 PROFILE_NOT_SET before a profile exists, and stats of an empty site", async () => {
    expect((await request(ctx.app).get("/v1/profile")).body.error.code).toBe("PROFILE_NOT_SET");
    const stats = await request(ctx.app).get("/v1/stats");
    expect(stats.body.data).toEqual({ projects: { web: 0, uiux: 0, data: 0, total: 0 }, certificates: 0, achievements: 0, yearsExperience: 0 });
  });

  it("GitHub contributions: 503 with a clear code when GitHub is down and nothing is cached", async () => {
    ctx.github.status = 502;
    const res = await request(ctx.app).get("/v1/github/contributions");
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("GITHUB_UNAVAILABLE");
  });

  it("serves the OpenAPI document and Swagger UI in development", async () => {
    const spec = await request(ctx.app).get("/openapi.json");
    expect(spec.status).toBe(200);
    expect(spec.body.openapi).toBe("3.0.3");
    expect(Object.keys(spec.body.paths)).toEqual(expect.arrayContaining(["/v1/contact", "/v1/projects/{slug}", "/v1/admin/projects/{id}/blocks", "/v1/auth/login"]));
    const contact = spec.body.paths["/v1/contact"].post;
    expect(contact.requestBody.content["application/json"].schema.properties).toHaveProperty("message");
    expect((await request(ctx.app).get("/docs/")).status).toBe(200);
  });
});
