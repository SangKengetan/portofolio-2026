import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestContext, hasTestDb, makePng, signedInAgent, type TestContext } from "../helpers";

describe.skipIf(!hasTestDb)("admin: projects & case studies", () => {
  let ctx: TestContext;
  let agent: Awaited<ReturnType<typeof signedInAgent>>;

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(async () => ctx?.close());
  beforeEach(async () => {
    await ctx.reset();
    agent = await signedInAgent(ctx);
  });

  const tech = async (name: string, group = "web") => (await agent.post("/v1/admin/technologies").send({ name, group })).body.data as { id: number };
  const image = async (alt = "Alt") =>
    (await agent.post("/v1/admin/media").attach("file", await makePng(1000, 700), "x.png").field("altText", alt)).body.data as { id: string; url: string };
  const create = async (body: Record<string, unknown> = {}) => {
    const res = await agent.post("/v1/admin/projects").send({ title: "My Great App", category: "web", summary: "A summary.", ...body });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return res.body.data as { id: string; slug: string; status: string };
  };
  const revalidations = () =>
    ctx.fetchCalls.filter((c) => c.url === "http://web.test/api/revalidate").map((c) => ({ headers: c.init?.headers as Record<string, string>, body: JSON.parse(String(c.init?.body)) }));

  it("creates a draft with a generated slug that stays invisible to the public until published", async () => {
    const react = await tech("React");
    const p = await create({ technologyIds: [react.id], contributions: ["Built it"], impactLine: "Faster." });
    expect(p).toMatchObject({ slug: "my-great-app", status: "draft" });

    expect((await request(ctx.app).get("/v1/projects")).body.data).toEqual([]);
    expect((await request(ctx.app).get("/v1/projects/my-great-app")).status).toBe(404);

    const pub = await agent.patch(`/v1/admin/projects/${p.id}/status`).send({ status: "published" });
    expect(pub.status).toBe(200);
    expect(pub.body.data.publishedAt).toBeTruthy();

    // the earlier empty answers were cached — publishing must have invalidated them
    const list = await request(ctx.app).get("/v1/projects");
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ slug: "my-great-app", technologies: ["React"], impactLine: "Faster.", cover: null });
    expect((await request(ctx.app).get("/v1/projects/my-great-app")).status).toBe(200);

    expect((await request(ctx.app).get("/v1/stats")).body.data.projects).toEqual({ web: 1, uiux: 0, data: 0, total: 1 });
  });

  it("asks Next.js to revalidate the right tags and paths, with the shared secret", async () => {
    const p = await create();
    await ctx.jobs.drain();
    ctx.fetchCalls.length = 0;
    await agent.patch(`/v1/admin/projects/${p.id}/status`).send({ status: "published" });
    await ctx.jobs.drain();
    const [call] = revalidations();
    expect(call!.headers["x-revalidate-secret"]).toBe("revalidate-secret");
    expect(call!.body.tags).toEqual(expect.arrayContaining(["projects", "stats", "project:my-great-app"]));
    expect(call!.body.paths).toEqual(expect.arrayContaining(["/", "/projects", "/projects/my-great-app"]));
  });

  it("keeps slugs unique: explicit duplicates conflict, generated ones get a suffix, deleted slugs are free again", async () => {
    const first = await create();
    expect((await create()).slug).toBe("my-great-app-2");
    const dup = await agent.post("/v1/admin/projects").send({ title: "Other", slug: "my-great-app", category: "web", summary: "S" });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("SLUG_TAKEN");

    await agent.delete(`/v1/admin/projects/${first.id}`);
    expect((await create({ slug: "my-great-app" })).slug).toBe("my-great-app");
  });

  it("validates fields with per-field messages", async () => {
    const res = await agent.post("/v1/admin/projects").send({
      title: "",
      category: "mobile",
      summary: "x".repeat(301),
      year: 1800,
      demoUrl: "javascript:alert(1)",
    });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.fields).sort()).toEqual(["category", "demoUrl", "summary", "title", "year"]);
    const dates = await agent.post("/v1/admin/projects").send({ title: "T", category: "web", summary: "S", startedAt: "2025-05-01", endedAt: "2025-01-01" });
    expect(dates.status).toBe(422);
    expect(dates.body.error.fields.endedAt).toMatch(/before the start date/);
    const unknownTech = await agent.post("/v1/admin/projects").send({ title: "T", category: "web", summary: "S", technologyIds: [999] });
    expect(unknownTech.status).toBe(422);
    expect(unknownTech.body.error.fields.technologyIds).toMatch(/999/);
    const badCover = await agent.post("/v1/admin/projects").send({ title: "T", category: "web", summary: "S", coverMediaId: "11111111-1111-4111-8111-111111111111" });
    expect(badCover.body.error.fields.coverMediaId).toBe("Media not found.");
  });

  it("saves a case study: sanitises HTML, resolves images for the public page and keeps order", async () => {
    const cover = await image("Cover");
    const shot = await image("Screenshot");
    const react = await tech("React");
    const p = await create({ coverMediaId: cover.id, technologyIds: [react.id] });

    const blocks = await agent.put(`/v1/admin/projects/${p.id}/blocks`).send({
      blocks: [
        { type: "rich_text", heading: "Overview", data: { html: "<p>Hello <strong>world</strong></p><script>alert(1)</script>" } },
        { type: "image", heading: "Screens", data: { mediaId: shot.id, caption: "Dashboard", frame: "browser" } },
        { type: "embed", data: { provider: "figma", url: "https://www.figma.com/proto/abc" } },
        { type: "list", data: { style: "numbered", items: ["One", "Two"] } },
        { type: "metrics", data: { items: [{ value: "40%", label: "faster" }] } },
      ],
    });
    expect(blocks.status, JSON.stringify(blocks.body)).toBe(200);
    expect(blocks.body.data.map((b: { type: string }) => b.type)).toEqual(["rich_text", "image", "embed", "list", "metrics"]);
    expect(blocks.body.data[0].data.html).toBe("<p>Hello <strong>world</strong></p>");

    const metrics = await agent.put(`/v1/admin/projects/${p.id}/metrics`).send({ items: [{ value: "300", label: "users" }, { value: "15", label: "weeks" }] });
    expect(metrics.body.data).toEqual([{ value: "300", label: "users" }, { value: "15", label: "weeks" }]);

    await agent.patch(`/v1/admin/projects/${p.id}/status`).send({ status: "published" });
    const detail = (await request(ctx.app).get("/v1/projects/my-great-app")).body.data;
    expect(detail.cover).toMatchObject({ id: cover.id, url: cover.url, alt: "Cover" });
    expect(detail.metrics).toEqual([{ value: "300", label: "users" }, { value: "15", label: "weeks" }]);
    expect(detail.blocks[1]).toMatchObject({ type: "image", heading: "Screens", data: { media: { id: shot.id, url: shot.url, alt: "Screenshot" }, caption: "Dashboard", frame: "browser" } });
    expect(detail.blocks[2]).toMatchObject({ type: "embed", data: { provider: "figma" } });

    // the admin editor receives media as ids so it can send the same data back
    const admin = (await agent.get(`/v1/admin/projects/${p.id}`)).body.data;
    expect(admin.blocks[1].data).toMatchObject({ mediaId: shot.id });
    expect(admin.coverMediaId).toBe(cover.id);
  });

  it("rejects bad blocks with the exact path of the problem", async () => {
    const p = await create();
    const res = await agent.put(`/v1/admin/projects/${p.id}/blocks`).send({
      blocks: [
        { type: "embed", data: { provider: "figma", url: "https://evil.example/x" } },
        { type: "image", data: { mediaId: "11111111-1111-4111-8111-111111111111" } },
        { type: "video", data: {} },
      ],
    });
    expect(res.status).toBe(422);
    expect(res.body.error.fields).toHaveProperty("blocks.0.data.url");
    expect(res.body.error.fields).toHaveProperty("blocks.2.type");

    const missing = await agent.put(`/v1/admin/projects/${p.id}/blocks`).send({
      blocks: [{ type: "image", data: { mediaId: "11111111-1111-4111-8111-111111111111" } }],
    });
    expect(missing.body.error.fields["blocks.0.data.mediaId"]).toBe("Media not found.");
  });

  it("wraps 'next project' around and honours manual ordering", async () => {
    const a = await create({ title: "Alpha", publishedAt: "2026-03-01T00:00:00Z" });
    const b = await create({ title: "Beta", publishedAt: "2026-02-01T00:00:00Z" });
    for (const p of [a, b]) await agent.patch(`/v1/admin/projects/${p.id}/status`).send({ status: "published" });

    const order = async () => ((await request(ctx.app).get("/v1/projects")).body.data as Array<{ slug: string }>).map((p) => p.slug);
    expect(await order()).toEqual(["alpha", "beta"]);
    expect((await request(ctx.app).get("/v1/projects/alpha")).body.data.nextProject.slug).toBe("beta");
    expect((await request(ctx.app).get("/v1/projects/beta")).body.data.nextProject.slug).toBe("alpha");

    expect((await agent.patch("/v1/admin/projects/reorder").send({ items: [{ id: b.id, sortOrder: 0 }, { id: a.id, sortOrder: 5 }] })).status).toBe(200);
    expect(await order()).toEqual(["beta", "alpha"]);
  });

  it("a project without siblings has no next project", async () => {
    const a = await create();
    await agent.patch(`/v1/admin/projects/${a.id}/status`).send({ status: "published" });
    expect((await request(ctx.app).get("/v1/projects/my-great-app")).body.data.nextProject).toBeNull();
  });

  it("updates, renames the slug, unpublishes, archives and soft-deletes", async () => {
    const p = await create({ status: "published" });
    const put = await agent.put(`/v1/admin/projects/${p.id}`).send({ title: "Renamed", slug: "renamed", category: "data", summary: "New", status: "published" });
    expect(put.status).toBe(200);
    expect(put.body.data).toMatchObject({ slug: "renamed", category: "data", title: "Renamed" });
    expect((await request(ctx.app).get("/v1/projects/my-great-app")).status).toBe(404);
    expect((await request(ctx.app).get("/v1/projects/renamed")).status).toBe(200);

    await ctx.jobs.drain();
    ctx.fetchCalls.length = 0;
    await agent.put(`/v1/admin/projects/${p.id}`).send({ title: "Renamed", slug: "renamed-2", category: "data", summary: "New", status: "published" });
    await ctx.jobs.drain();
    expect(revalidations()[0]!.body.paths).toEqual(expect.arrayContaining(["/projects/renamed", "/projects/renamed-2"]));

    await agent.patch(`/v1/admin/projects/${p.id}/status`).send({ status: "draft" });
    expect((await request(ctx.app).get("/v1/projects/renamed-2")).status).toBe(404);
    await agent.patch(`/v1/admin/projects/${p.id}/status`).send({ status: "archived" });
    expect((await agent.get("/v1/admin/projects?status=archived")).body.data).toHaveLength(1);

    expect((await agent.delete(`/v1/admin/projects/${p.id}`)).status).toBe(200);
    expect((await agent.get(`/v1/admin/projects/${p.id}`)).status).toBe(404);
    expect((await agent.get("/v1/admin/projects")).body.data).toHaveLength(0);
    // soft delete: the row is still there for recovery
    expect(await ctx.container.db.selectFrom("projects").select("deletedAt").where("id", "=", p.id).executeTakeFirstOrThrow()).toMatchObject({ deletedAt: expect.any(Date) });
  });

  it("keeps the original publish date when a project is unpublished and published again", async () => {
    const p = await create();
    const first = (await agent.patch(`/v1/admin/projects/${p.id}/status`).send({ status: "published" })).body.data.publishedAt;
    await agent.patch(`/v1/admin/projects/${p.id}/status`).send({ status: "draft" });
    const again = (await agent.patch(`/v1/admin/projects/${p.id}/status`).send({ status: "published" })).body.data.publishedAt;
    expect(again).toBe(first);
  });

  it("technology order inside a project follows technologyIds", async () => {
    const [a, b, c] = [await tech("Alpha"), await tech("Beta"), await tech("Gamma")];
    const p = await create({ technologyIds: [c.id, a.id, b.id], status: "published" });
    expect((await request(ctx.app).get("/v1/projects")).body.data[0].technologies).toEqual(["Gamma", "Alpha", "Beta"]);
    expect(p.status).toBe("published");
  });

  it("filters, searches and paginates the admin list", async () => {
    await create({ title: "Web one" });
    await create({ title: "Data one", category: "data" });
    await create({ title: "100% special_name" });
    expect((await agent.get("/v1/admin/projects?category=data")).body.data).toHaveLength(1);
    expect((await agent.get("/v1/admin/projects?search=special_name")).body.data).toHaveLength(1);
    expect((await agent.get("/v1/admin/projects?search=%25")).body.data).toHaveLength(1); // % is literal, not a wildcard
    const page = await agent.get("/v1/admin/projects?limit=2&page=2");
    expect(page.body.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
    expect(page.body.data).toHaveLength(1);
    expect((await agent.get("/v1/admin/projects?limit=1000")).status).toBe(422);
  });

  it("treats SQL injection attempts in search as plain text", async () => {
    await create();
    const res = await request(ctx.app).get("/v1/projects").query({ search: "'; DROP TABLE projects; --" });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect((await agent.get("/v1/admin/projects")).body.data).toHaveLength(1);
  });
});
