import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  mockAchievements,
  mockCertificates,
  mockContributions,
  mockExperiences,
  mockProfile,
  mockProjectDetail,
  mockProjects,
  mockStats,
  mockTechnologies,
} from "../../../web/lib/mock-data";
import { seedDemo } from "../../src/seed/demo";
import { createTestContext, hasTestDb, type TestContext } from "../helpers";

/**
 * Contract test: the website was built against mock data (apps/web/lib/mock-data.ts).
 * The demo seed loads exactly that data into PostgreSQL; here every public endpoint must return
 * JSON that is deep-equal to the mock — so switching the site from mock to API changes nothing.
 * Only generated values (ids, timestamps) are normalised.
 */

const NOW = new Date("2026-10-26T12:00:00Z");

/** Drops `id` keys (generated) and turns ISO timestamps/dates into one comparable form. */
function normalise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalise);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k, v]) => k !== "id" && v !== undefined)
        .map(([k, v]) => [k, k === "publishedAt" && typeof v === "string" ? new Date(v).toISOString() : normalise(v)]),
    );
  }
  return value;
}
const plain = (v: unknown) => normalise(JSON.parse(JSON.stringify(v)));

describe.skipIf(!hasTestDb)("public API matches the frontend mock data", () => {
  let ctx: TestContext;
  const get = async (path: string) => {
    const res = await request(ctx.app).get(path);
    expect(res.status, `${path} → ${res.status} ${JSON.stringify(res.body)}`).toBe(200);
    expect(res.body).toMatchObject({ success: true, message: expect.any(String) });
    return res.body as { data: unknown; meta?: { page: number; limit: number; total: number; totalPages: number } };
  };

  beforeAll(async () => {
    ctx = await createTestContext({}, () => NOW);
    await seedDemo(ctx.container.db);
  });
  afterAll(async () => ctx?.close());

  it("GET /v1/profile", async () => {
    expect(plain((await get("/v1/profile")).data)).toEqual(plain(mockProfile));
  });

  it("GET /v1/stats", async () => {
    expect((await get("/v1/stats")).data).toEqual(mockStats);
  });

  it("GET /v1/technologies", async () => {
    const body = await get("/v1/technologies");
    expect(plain(body.data)).toEqual(plain(mockTechnologies));
    expect(plain((await get("/v1/technologies?group=data")).data)).toEqual(plain(mockTechnologies.filter((t) => t.group === "data")));
  });

  it("GET /v1/experiences", async () => {
    expect(plain((await get("/v1/experiences")).data)).toEqual(plain(mockExperiences));
  });

  it("GET /v1/projects (+ filters and pagination meta)", async () => {
    const body = await get("/v1/projects");
    expect(plain(body.data)).toEqual(plain(mockProjects));
    expect(body.meta).toEqual({ page: 1, limit: 50, total: mockProjects.length, totalPages: 1 });

    const data = await get("/v1/projects?category=data");
    expect(plain(data.data)).toEqual(plain(mockProjects.filter((p) => p.category === "data")));

    const featured = await get("/v1/projects?featured=true");
    expect(plain(featured.data)).toEqual(plain(mockProjects.filter((p) => p.isFeatured)));

    const oldest = (await get("/v1/projects?sort=oldest")).data as Array<{ slug: string }>;
    expect(oldest.map((p) => p.slug)).toEqual([...mockProjects].reverse().map((p) => p.slug));

    const page2 = await get("/v1/projects?limit=2&page=2");
    expect((page2.data as unknown[]).length).toBe(2);
    expect(page2.meta).toMatchObject({ page: 2, limit: 2, total: mockProjects.length });
  });

  it("GET /v1/projects/:slug for every project", async () => {
    for (const p of mockProjects) {
      const res = await get(`/v1/projects/${p.slug}`);
      expect(plain(res.data), p.slug).toEqual(plain(mockProjectDetail(p.slug)));
    }
  });

  it("GET /v1/certificates (+ filters)", async () => {
    expect(plain((await get("/v1/certificates")).data)).toEqual(plain(mockCertificates));
    expect(plain((await get("/v1/certificates?featured=true")).data)).toEqual(plain(mockCertificates.filter((c) => c.isFeatured)));
    expect(plain((await get("/v1/certificates?category=data")).data)).toEqual(plain(mockCertificates.filter((c) => c.category === "data")));
  });

  it("GET /v1/achievements", async () => {
    expect(plain((await get("/v1/achievements")).data)).toEqual(plain(mockAchievements));
  });

  it("GET /v1/github/contributions turns GitHub's calendar into the heatmap the site renders", async () => {
    const LEVEL = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];
    ctx.github.body = {
      data: {
        user: {
          contributionsCollection: {
            contributionCalendar: {
              totalContributions: mockContributions.totalLastYear,
              weeks: mockContributions.weeks.map((w) => ({
                contributionDays: w.map((d) => ({ date: d.date, contributionCount: d.count, contributionLevel: LEVEL[d.level] })),
              })),
            },
          },
        },
      },
    };
    const res = (await get("/v1/github/contributions")).data as typeof mockContributions;
    expect(res.weeks).toEqual(mockContributions.weeks);
    expect(res).toMatchObject({
      username: "octocat",
      totalLastYear: mockContributions.totalLastYear,
      longestStreak: mockContributions.longestStreak,
    });
    expect(Math.abs(res.activeDaysPercent - mockContributions.activeDaysPercent)).toBeLessThanOrEqual(1);
  });
});
