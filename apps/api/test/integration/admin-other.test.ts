import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestContext, hasTestDb, makePng, signedInAgent, type TestContext } from "../helpers";

/** ISO date `years` years before today (real clock: cookies in the supertest jar expire by real time). */
const yearsAgo = (years: number) => new Date(Date.now() - years * 365.25 * 86_400_000).toISOString().slice(0, 10);

const PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");

describe.skipIf(!hasTestDb)("admin: profile, experience, certificates, achievements, technologies", () => {
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

  const upload = async (file: Buffer, name: string, alt?: string) => {
    const req = agent.post("/v1/admin/media").attach("file", file, name);
    if (alt) req.field("altText", alt);
    return (await req).body.data as { id: string; url: string };
  };

  describe("profile", () => {
    const body = {
      fullName: "Raka Pratama",
      shortName: "Raka",
      roles: ["Full-Stack Web Developer", "UI/UX Designer"],
      headline: "I build things.",
      statement: "I build **web systems**.",
      timezone: "Asia/Makassar",
      email: "hello@example.com",
      handle: "@raka",
      availableForWork: true,
      socials: { github: "https://github.com/raka", linkedin: "" },
    };

    it("saves the single profile row and serves the public shape (photo + CV resolved)", async () => {
      const photo = await upload(await makePng(900, 1100), "me.png", "Portrait");
      const cv = await upload(PDF, "cv.pdf");
      const res = await agent.put("/v1/admin/profile").send({ ...body, photoMediaId: photo.id, cvMediaId: cv.id });
      expect(res.status, JSON.stringify(res.body)).toBe(200);

      const pub = (await request(ctx.app).get("/v1/profile")).body.data;
      expect(pub).toMatchObject({
        fullName: "Raka Pratama",
        roles: ["Full-Stack Web Developer", "UI/UX Designer"],
        handle: "@raka",
        availableForWork: true,
        socials: { github: "https://github.com/raka" }, // blank social dropped
        photo: { id: photo.id, url: photo.url, alt: "Portrait" },
        cvUrl: cv.url,
      });
      expect(pub.socials).not.toHaveProperty("linkedin");
      expect(pub).not.toHaveProperty("phone");
    });

    it("validates formats first, then references (a PDF is required for the CV)", async () => {
      const img = await upload(await makePng(), "a.png", "A");
      const bad = await agent.put("/v1/admin/profile").send({ ...body, timezone: "Mars/Olympus", email: "nope", socials: { github: "ftp://x" } });
      expect(bad.status).toBe(422);
      expect(Object.keys(bad.body.error.fields).sort()).toEqual(["email", "socials.github", "timezone"]);

      const wrongType = await agent.put("/v1/admin/profile").send({ ...body, cvMediaId: img.id });
      expect(wrongType.status).toBe(422);
      expect(Object.keys(wrongType.body.error.fields)).toEqual(["cvMediaId"]);
      const missing = await agent.put("/v1/admin/profile").send({ ...body, photoMediaId: "11111111-1111-4111-8111-111111111111" });
      expect(missing.body.error.fields.photoMediaId).toBe("Media not found.");
    });

    it("a profile edit is visible immediately (cache invalidated) and triggers revalidation", async () => {
      await agent.put("/v1/admin/profile").send(body);
      expect((await request(ctx.app).get("/v1/profile")).body.data.headline).toBe("I build things.");
      await agent.put("/v1/admin/profile").send({ ...body, headline: "Changed." });
      expect((await request(ctx.app).get("/v1/profile")).body.data.headline).toBe("Changed.");
      await ctx.jobs.drain();
      expect(ctx.fetchCalls.some((c) => c.url === "http://web.test/api/revalidate" && String(c.init?.body).includes('"profile"'))).toBe(true);
    });
  });

  describe("technologies", () => {
    it("creates with generated slug, rejects duplicates, filters and reorders", async () => {
      const react = await agent.post("/v1/admin/technologies").send({ name: "React", group: "web", iconKey: "react" });
      expect(react.status).toBe(201);
      expect(react.body.data).toMatchObject({ slug: "react", group: "web", showOnHome: true });
      const dup = await agent.post("/v1/admin/technologies").send({ name: "React", group: "web" });
      expect(dup.status).toBe(409);
      expect(dup.body.error.code).toBe("TECHNOLOGY_EXISTS");

      const figma = (await agent.post("/v1/admin/technologies").send({ name: "Figma", group: "uiux", showOnHome: false })).body.data;
      // hidden technologies stay out of the public skills list but remain usable in projects
      expect((await request(ctx.app).get("/v1/technologies")).body.data.map((t: { name: string }) => t.name)).toEqual(["React"]);
      expect((await agent.get("/v1/admin/technologies?group=uiux")).body.data).toHaveLength(1);

      await agent.patch("/v1/admin/technologies/reorder").send({ items: [{ id: String(figma.id), sortOrder: 0 }, { id: String(react.body.data.id), sortOrder: 1 }] });
      expect((await agent.get("/v1/admin/technologies")).body.data.map((t: { name: string }) => t.name)).toEqual(["Figma", "React"]);

      expect((await agent.put(`/v1/admin/technologies/${figma.id}`).send({ name: "Figma", group: "uiux", showOnHome: true })).status).toBe(200);
      expect((await request(ctx.app).get("/v1/technologies?group=uiux")).body.data).toHaveLength(1);
      expect((await agent.delete(`/v1/admin/technologies/${figma.id}`)).status).toBe(200);
      expect((await agent.get(`/v1/admin/technologies/${figma.id}`)).status).toBe(404);
      expect((await agent.get("/v1/admin/technologies/abc")).status).toBe(422);
    });
  });

  describe("experience", () => {
    const body = { role: "Backend Developer", company: "Acme", employmentType: "internship", startDate: "2025-02-01", endDate: null, highlights: ["APIs"] };

    it("creates, orders newest first, soft-deletes and feeds the 'years of experience' stat", async () => {
      const react = (await agent.post("/v1/admin/technologies").send({ name: "React", group: "web" })).body.data;
      const old = await agent.post("/v1/admin/experiences").send({ ...body, role: "Old", startDate: yearsAgo(3.7), endDate: yearsAgo(3.2) });
      const current = await agent.post("/v1/admin/experiences").send({ ...body, startDate: yearsAgo(2.1), technologyIds: [react.id], companyUrl: "https://acme.test" });
      expect(current.status, JSON.stringify(current.body)).toBe(201);

      const list = (await request(ctx.app).get("/v1/experiences")).body.data;
      expect(list.map((e: { role: string }) => e.role)).toEqual(["Backend Developer", "Old"]);
      expect(list[0]).toMatchObject({ endDate: null, companyUrl: "https://acme.test", technologies: [{ name: "React" }], image: null, description: "" });
      expect(list[0]).not.toHaveProperty("location");

      // earliest start ≈ 3.7 years ago → rounds to 4; without it ≈ 2.1 → 2
      expect((await request(ctx.app).get("/v1/stats")).body.data.yearsExperience).toBe(4);
      await agent.delete(`/v1/admin/experiences/${old.body.data.id}`);
      expect((await request(ctx.app).get("/v1/stats")).body.data.yearsExperience).toBe(2);
    });

    it("volunteer 'organization' roles do not count as professional experience", async () => {
      await agent.post("/v1/admin/experiences").send({ ...body, employmentType: "organization", startDate: yearsAgo(11) });
      expect((await request(ctx.app).get("/v1/stats")).body.data.yearsExperience).toBe(0);
    });

    it("validates dates, unknown technologies and the image reference", async () => {
      const res = await agent.post("/v1/admin/experiences").send({ ...body, startDate: "2025-02-30", technologyIds: [42], imageMediaId: "11111111-1111-4111-8111-111111111111" });
      expect(res.status).toBe(422);
      expect(res.body.error.fields).toHaveProperty("startDate");
      const second = await agent.post("/v1/admin/experiences").send({ ...body, technologyIds: [42], imageMediaId: "11111111-1111-4111-8111-111111111111" });
      expect(second.body.error.fields).toMatchObject({ technologyIds: expect.any(String), imageMediaId: "Media not found." });
      const dates = await agent.post("/v1/admin/experiences").send({ ...body, endDate: "2024-01-01" });
      expect(dates.body.error.fields.endDate).toMatch(/before the start date/);
    });

    it("drafts are hidden from the public list", async () => {
      await agent.post("/v1/admin/experiences").send({ ...body, status: "draft" });
      expect((await request(ctx.app).get("/v1/experiences")).body.data).toEqual([]);
      expect((await agent.get("/v1/admin/experiences")).body.data).toHaveLength(1);
      expect((await agent.get("/v1/admin/experiences?status=published")).body.data).toHaveLength(0);
    });
  });

  describe("certificates", () => {
    const body = { title: "Front-End Web Developer Expert", issuer: "Dicoding", category: "web", issuedAt: "2025-09-12" };

    it("lists newest first, filters by category/featured and shows the Verified link", async () => {
      await agent.post("/v1/admin/certificates").send({ ...body, isFeatured: true, credentialUrl: "https://dicoding.com/c/1", credentialId: "X1" });
      await agent.post("/v1/admin/certificates").send({ ...body, title: "SQL", category: "data", issuedAt: "2024-08-19" });
      const all = (await request(ctx.app).get("/v1/certificates")).body.data;
      expect(all.map((c: { title: string }) => c.title)).toEqual(["Front-End Web Developer Expert", "SQL"]);
      expect(all[0]).toMatchObject({ credentialUrl: "https://dicoding.com/c/1", credentialId: "X1", isFeatured: true, image: null, issuerLogo: null, expiresAt: null });
      expect((await request(ctx.app).get("/v1/certificates?featured=true")).body.data).toHaveLength(1);
      expect((await request(ctx.app).get("/v1/certificates?category=data")).body.data).toHaveLength(1);
      expect((await request(ctx.app).get("/v1/certificates?category=bogus")).status).toBe(422);
      expect((await request(ctx.app).get("/v1/stats")).body.data.certificates).toBe(2);
    });

    it("validates and supports update, reorder and delete", async () => {
      const bad = await agent.post("/v1/admin/certificates").send({ ...body, issuedAt: "yesterday", credentialUrl: "nope", expiresAt: "2020-01-01" });
      expect(bad.status).toBe(422);
      expect(Object.keys(bad.body.error.fields).sort()).toEqual(["credentialUrl", "issuedAt"]);
      expect((await agent.post("/v1/admin/certificates").send({ ...body, expiresAt: "2020-01-01" })).body.error.fields.expiresAt).toMatch(/before the issue date/);

      const a = (await agent.post("/v1/admin/certificates").send(body)).body.data;
      const b = (await agent.post("/v1/admin/certificates").send({ ...body, title: "B", issuedAt: "2020-01-01" })).body.data;
      await agent.patch("/v1/admin/certificates/reorder").send({ items: [{ id: b.id, sortOrder: 0 }, { id: a.id, sortOrder: 1 }] });
      expect((await request(ctx.app).get("/v1/certificates")).body.data[0].title).toBe("B");
      expect((await agent.put(`/v1/admin/certificates/${a.id}`).send({ ...body, title: "Changed" })).body.data.title).toBe("Changed");
      expect((await agent.delete(`/v1/admin/certificates/${a.id}`)).status).toBe(200);
      expect((await agent.delete(`/v1/admin/certificates/${a.id}`)).status).toBe(404);
    });

    it("uses an uploaded image for the certificate and refuses a PDF as image", async () => {
      const img = await upload(await makePng(1400, 990), "c.png", "Certificate scan");
      const pdf = await upload(PDF, "c.pdf");
      expect((await agent.post("/v1/admin/certificates").send({ ...body, imageMediaId: pdf.id })).body.error.fields.imageMediaId).toBe("This file is not an image.");
      await agent.post("/v1/admin/certificates").send({ ...body, imageMediaId: img.id });
      expect((await request(ctx.app).get("/v1/certificates")).body.data[0].image).toMatchObject({ id: img.id, url: img.url, alt: "Certificate scan" });
    });
  });

  describe("achievements", () => {
    const body = { title: "1st Place — UI/UX Design Competition", organizer: "Tech Week", level: "national", rankLabel: "1st Place", achievedAt: "2025-10-18" };

    it("orders newest first and hides drafts", async () => {
      await agent.post("/v1/admin/achievements").send({ ...body, title: "Older", achievedAt: "2024-01-01" });
      await agent.post("/v1/admin/achievements").send(body);
      await agent.post("/v1/admin/achievements").send({ ...body, title: "Hidden", status: "draft" });
      const list = (await request(ctx.app).get("/v1/achievements")).body.data;
      expect(list.map((a: { title: string }) => a.title)).toEqual(["1st Place — UI/UX Design Competition", "Older"]);
      expect(list[0]).toEqual({
        id: expect.any(String),
        title: body.title,
        organizer: "Tech Week",
        level: "national",
        rankLabel: "1st Place",
        achievedAt: "2025-10-18",
        description: null,
        linkUrl: null,
      });
      expect((await request(ctx.app).get("/v1/stats")).body.data.achievements).toBe(2);
    });

    it("links to an existing project only", async () => {
      const bad = await agent.post("/v1/admin/achievements").send({ ...body, relatedProjectId: "11111111-1111-4111-8111-111111111111" });
      expect(bad.status).toBe(422);
      expect(bad.body.error.fields.relatedProjectId).toBe("Project not found.");
      const project = (await agent.post("/v1/admin/projects").send({ title: "P", category: "web", summary: "S" })).body.data;
      const ok = await agent.post("/v1/admin/achievements").send({ ...body, relatedProjectId: project.id });
      expect(ok.status).toBe(201);
      expect(ok.body.data.relatedProjectId).toBe(project.id);
    });
  });

  it("dashboard counts content", async () => {
    await agent.post("/v1/admin/projects").send({ title: "A", category: "web", summary: "S", status: "published" });
    await agent.post("/v1/admin/projects").send({ title: "B", category: "web", summary: "S" });
    await agent.post("/v1/admin/technologies").send({ name: "React", group: "web" });
    const d = (await agent.get("/v1/admin/dashboard")).body.data;
    expect(d.projects).toEqual({ published: 1, draft: 1, archived: 0 });
    expect(d.technologies).toBe(1);
  });
});
