import { existsSync } from "node:fs";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestContext, hasTestDb, makePng, signedInAgent, type TestContext } from "../helpers";

const PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");

describe.skipIf(!hasTestDb)("media uploads", () => {
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

  const upload = async (file: Buffer, filename: string, altText?: string) => {
    const req = agent.post("/v1/admin/media").attach("file", file, filename);
    if (altText !== undefined) req.field("altText", altText);
    return req;
  };

  it("re-encodes an image into WebP variants (sm/md/lg) and returns an absolute URL", async () => {
    const res = await upload(await makePng(2400, 1600), "photo.png", "A grey rectangle");
    expect(res.status).toBe(201);
    const m = res.body.data;
    expect(m).toMatchObject({ mimeType: "image/webp", altText: "A grey rectangle", width: 1600, height: 1067 });
    expect(m.url).toMatch(/^https:\/\/cdn\.example\.com\/uploads\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.webp$/);
    expect(Object.keys(m.variants).sort()).toEqual(["lg", "md", "sm"]);

    for (const rel of [m.filePath, m.variants.sm.replace("https://cdn.example.com", ""), m.variants.md.replace("https://cdn.example.com", "")]) {
      expect(existsSync(path.join(ctx.uploadDir, rel.replace(/^\/uploads\//, ""))), rel).toBe(true);
    }
    // The original file name never reaches the disk or the database.
    expect(JSON.stringify(m)).not.toContain("photo.png");
  });

  it("never enlarges small images", async () => {
    const res = await upload(await makePng(300, 200), "small.png", "Small");
    expect(res.body.data).toMatchObject({ width: 300, height: 200 });
  });

  it("requires alt text for images", async () => {
    const res = await upload(await makePng(), "a.png");
    expect(res.status).toBe(422);
    expect(res.body.error.fields).toHaveProperty("altText");
    expect(await ctx.container.db.selectFrom("media").select("id").execute()).toHaveLength(0);
  });

  it("trusts the file's bytes, not its name or declared type", async () => {
    const fakePng = await upload(Buffer.from("<?php echo 'hi'; ?>"), "shell.png", "x");
    expect(fakePng.status).toBe(415);
    const svg = await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), "x.svg", "x");
    expect(svg.status).toBe(415);
    const exe = await upload(Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]), "setup.png", "x");
    expect(exe.status).toBe(415);
  });

  it("rejects a corrupt image that has a valid header", async () => {
    const png = await makePng();
    const res = await upload(Buffer.concat([png.subarray(0, 60), Buffer.alloc(200, 7)]), "broken.png", "broken");
    expect(res.status).toBe(415);
  });

  it("rejects files over 8 MB with 413 and requires the file field", async () => {
    const big = Buffer.concat([await makePng(), Buffer.alloc(9 * 1024 * 1024)]);
    expect((await upload(big, "big.png", "big")).status).toBe(413);
    const none = await agent.post("/v1/admin/media").field("altText", "x");
    expect(none.status).toBe(400);
    expect(none.body.error.code).toBe("FILE_REQUIRED");
  });

  it("accepts a PDF (for the CV) without alt text and stores it untouched", async () => {
    const res = await upload(PDF, "cv.pdf");
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ mimeType: "application/pdf", sizeBytes: PDF.length, variants: {} });
    expect(res.body.data.url).toMatch(/\.pdf$/);
  });

  it("lists, filters and edits alt text; image alt cannot be blanked", async () => {
    const img = (await upload(await makePng(), "a.png", "First")).body.data;
    await upload(PDF, "cv.pdf");

    const all = await agent.get("/v1/admin/media");
    expect(all.body.data).toHaveLength(2);
    expect(all.body.meta).toMatchObject({ total: 2, page: 1 });
    expect((await agent.get("/v1/admin/media?kind=pdf")).body.data).toHaveLength(1);
    expect((await agent.get("/v1/admin/media?search=first")).body.data.map((m: { id: string }) => m.id)).toEqual([img.id]);

    expect((await agent.patch(`/v1/admin/media/${img.id}`).send({ altText: "Renamed" })).body.data.altText).toBe("Renamed");
    expect((await agent.patch(`/v1/admin/media/${img.id}`).send({ altText: "" })).status).toBe(422);
    expect((await agent.get("/v1/admin/media/not-a-uuid")).status).toBe(422);
  });

  it("serves uploads with long-lived cache headers and nosniff (development only)", async () => {
    const m = (await upload(await makePng(), "a.png", "A")).body.data;
    const file = await request(ctx.app).get(new URL(m.url).pathname);
    expect(file.status).toBe(200);
    expect(file.headers["content-type"]).toBe("image/webp");
    expect(file.headers["cache-control"]).toContain("immutable");
    expect(file.headers["x-content-type-options"]).toBe("nosniff");
    expect((await request(ctx.app).get("/uploads/../package.json")).status).toBe(404);
  });

  it("refuses to delete media that content still uses, then deletes files once it is free", async () => {
    const m = (await upload(await makePng(), "a.png", "Cover")).body.data;
    const project = await agent.post("/v1/admin/projects").send({ title: "P", category: "web", summary: "S", coverMediaId: m.id });
    expect(project.status).toBe(201);

    const blocked = await agent.delete(`/v1/admin/media/${m.id}`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe("MEDIA_IN_USE");

    // also protected when only a block (JSON, no foreign key) refers to it
    await agent.put(`/v1/admin/projects/${project.body.data.id}`).send({ title: "P", category: "web", summary: "S" });
    await agent.put(`/v1/admin/projects/${project.body.data.id}/blocks`).send({ blocks: [{ type: "image", data: { mediaId: m.id } }] });
    expect((await agent.delete(`/v1/admin/media/${m.id}`)).status).toBe(409);

    await agent.put(`/v1/admin/projects/${project.body.data.id}/blocks`).send({ blocks: [] });
    const rel = (p: string) => path.join(ctx.uploadDir, p.replace(/^\/uploads\//, ""));
    expect(existsSync(rel(m.filePath))).toBe(true);
    expect((await agent.delete(`/v1/admin/media/${m.id}`)).status).toBe(200);
    expect(existsSync(rel(m.filePath))).toBe(false);
    expect(existsSync(rel(m.variants.sm.replace("https://cdn.example.com", "")))).toBe(false);
    expect((await agent.get(`/v1/admin/media/${m.id}`)).status).toBe(404);
  });
});
