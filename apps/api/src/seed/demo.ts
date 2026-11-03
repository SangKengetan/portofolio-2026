import { sql } from "kysely";
import type { Media, ProjectBlock } from "@portfolio/shared";
import type { Db } from "../db/client";
import { sanitizeRichText } from "../lib/sanitize";
import {
  mockAchievements,
  mockCertificates,
  mockExperiences,
  mockProfile,
  mockProjectDetail,
  mockProjects,
  mockTechnologies,
} from "../../../web/lib/mock-data";

/**
 * DEVELOPMENT ONLY — fills an empty database with the same content the website shows in mock mode
 * (apps/web/lib/mock-data.ts), so `API_URL=http://localhost:4000` renders an identical site.
 *
 * It WIPES all content tables first (projects, experiences, certificates, achievements, technologies,
 * media, profile, messages). The admin account and its sessions are left alone.
 * Media rows point at `/placeholders/*` files that Next.js serves from apps/web/public.
 */

const MIME_BY_EXT: Record<string, string> = { svg: "image/svg+xml", pdf: "application/pdf", png: "image/png", webp: "image/webp" };

export async function seedDemo(db: Db): Promise<{ projects: number; certificates: number; media: number }> {
  return db.transaction().execute(async (trx) => {
    await sql`truncate table project_blocks, project_metrics, project_technologies, experience_technologies,
      achievements, certificates, experiences, projects, technologies, site_profile, contact_messages, media
      restart identity cascade`.execute(trx);

    /* ---------- media (one row per distinct mock media id) ---------- */
    const mediaIds = new Map<string, string>();
    const ensureMedia = async (m: Media | null | undefined): Promise<string | null> => {
      if (!m) return null;
      const known = mediaIds.get(m.id);
      if (known) return known;
      const ext = m.url.split(".").pop() ?? "";
      const row = await trx
        .insertInto("media")
        .values({
          filePath: m.url,
          mimeType: MIME_BY_EXT[ext] ?? "application/octet-stream",
          sizeBytes: 0,
          width: m.width ?? null,
          height: m.height ?? null,
          altText: m.alt || null,
          variants: JSON.stringify({}),
        })
        .returning("id")
        .executeTakeFirstOrThrow();
      mediaIds.set(m.id, row.id);
      return row.id;
    };

    /* ---------- profile ---------- */
    const p = mockProfile;
    const cvId = p.cvUrl
      ? (
          await trx
            .insertInto("media")
            .values({ filePath: p.cvUrl, mimeType: "application/pdf", sizeBytes: 0, altText: "Curriculum Vitae", variants: JSON.stringify({}) })
            .returning("id")
            .executeTakeFirstOrThrow()
        ).id
      : null;
    await trx
      .insertInto("siteProfile")
      .values({
        id: 1,
        fullName: p.fullName,
        shortName: p.shortName,
        roles: p.roles,
        headline: p.headline,
        statement: p.statement,
        bio: p.bio,
        location: p.location,
        timezone: p.timezone,
        email: p.email,
        phone: p.phone ?? null,
        handle: p.handle,
        availableForWork: p.availableForWork,
        socials: JSON.stringify(p.socials),
        photoMediaId: await ensureMedia(p.photo),
        cvMediaId: cvId,
        seoTitle: p.seoTitle ?? null,
        seoDescription: p.seoDescription ?? null,
      })
      .execute();

    /* ---------- technologies ---------- */
    const techIds = new Map<string, number>();
    for (const [i, t] of mockTechnologies.entries()) {
      const row = await trx
        .insertInto("technologies")
        .values({ name: t.name, slug: t.slug, grp: t.group, iconKey: t.iconKey ?? null, sortOrder: i })
        .returning("id")
        .executeTakeFirstOrThrow();
      techIds.set(t.name, row.id);
    }
    const techId = (name: string) => {
      const id = techIds.get(name);
      if (!id) throw new Error(`Unknown technology in mock data: ${name}`);
      return id;
    };

    /* ---------- experiences ---------- */
    for (const [i, e] of mockExperiences.entries()) {
      const row = await trx
        .insertInto("experiences")
        .values({
          role: e.role,
          company: e.company,
          companyUrl: e.companyUrl ?? null,
          location: e.location ?? null,
          employmentType: e.employmentType,
          startDate: e.startDate,
          endDate: e.endDate,
          description: e.description,
          highlights: e.highlights,
          imageMediaId: await ensureMedia(e.image),
          sortOrder: i,
        })
        .returning("id")
        .executeTakeFirstOrThrow();
      if (e.technologies.length) {
        await trx
          .insertInto("experienceTechnologies")
          .values(e.technologies.map((t, sortOrder) => ({ experienceId: row.id, technologyId: techId(t.name), sortOrder })))
          .execute();
      }
    }

    /* ---------- projects ---------- */
    const toStoredBlock = async (b: ProjectBlock): Promise<{ type: ProjectBlock["type"]; heading: string | null; data: Record<string, unknown> }> => {
      const base = { type: b.type, heading: b.heading };
      switch (b.type) {
        case "rich_text":
          return { ...base, data: { html: sanitizeRichText(b.data.html) } };
        case "image":
          return { ...base, data: { mediaId: await ensureMedia(b.data.media), caption: b.data.caption ?? null, frame: b.data.frame ?? "browser" } };
        case "gallery":
          return {
            ...base,
            data: {
              items: await Promise.all(b.data.items.map(async (it) => ({ mediaId: await ensureMedia(it.media), caption: it.caption ?? null }))),
              columns: b.data.columns ?? 2,
            },
          };
        case "before_after":
          return {
            ...base,
            data: { beforeMediaId: await ensureMedia(b.data.before), afterMediaId: await ensureMedia(b.data.after), caption: b.data.caption ?? null },
          };
        default:
          return { ...base, data: b.data as unknown as Record<string, unknown> };
      }
    };

    for (const summary of mockProjects) {
      const d = mockProjectDetail(summary.slug);
      if (!d) continue;
      const row = await trx
        .insertInto("projects")
        .values({
          slug: d.slug,
          title: d.title,
          category: d.category,
          summary: d.summary,
          impactLine: d.impactLine,
          impactStatement: d.impactStatement,
          role: d.role,
          team: d.team,
          client: d.client,
          year: d.year,
          startedAt: d.startedAt,
          endedAt: d.endedAt,
          contributions: d.contributions,
          coverMediaId: await ensureMedia(d.cover),
          demoUrl: d.demoUrl,
          repoUrl: d.repoUrl,
          figmaUrl: d.figmaUrl,
          dashboardUrl: d.dashboardUrl,
          notebookUrl: d.notebookUrl,
          status: "published",
          isFeatured: d.isFeatured,
          seoDescription: d.seoDescription,
          publishedAt: new Date(d.publishedAt),
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      if (d.technologies.length) {
        await trx
          .insertInto("projectTechnologies")
          .values(d.technologies.map((t, sortOrder) => ({ projectId: row.id, technologyId: techId(t.name), sortOrder })))
          .execute();
      }
      if (d.metrics.length) {
        await trx
          .insertInto("projectMetrics")
          .values(d.metrics.map((m, i) => ({ projectId: row.id, value: m.value, label: m.label, sortOrder: i })))
          .execute();
      }
      for (const [i, block] of d.blocks.entries()) {
        const stored = await toStoredBlock(block);
        await trx
          .insertInto("projectBlocks")
          .values({ projectId: row.id, type: stored.type, heading: stored.heading, data: JSON.stringify(stored.data), sortOrder: i })
          .execute();
      }
    }

    /* ---------- certificates & achievements ---------- */
    for (const c of mockCertificates) {
      await trx
        .insertInto("certificates")
        .values({
          title: c.title,
          issuer: c.issuer,
          category: c.category,
          issuedAt: c.issuedAt,
          expiresAt: c.expiresAt,
          credentialId: c.credentialId,
          credentialUrl: c.credentialUrl,
          imageMediaId: await ensureMedia(c.image),
          issuerLogoMediaId: await ensureMedia(c.issuerLogo),
          isFeatured: c.isFeatured,
        })
        .execute();
    }
    for (const a of mockAchievements) {
      await trx
        .insertInto("achievements")
        .values({
          title: a.title,
          organizer: a.organizer,
          level: a.level,
          rankLabel: a.rankLabel,
          achievedAt: a.achievedAt,
          description: a.description,
          linkUrl: a.linkUrl,
        })
        .execute();
    }

    return { projects: mockProjects.length, certificates: mockCertificates.length, media: mediaIds.size + 1 };
  });
}
