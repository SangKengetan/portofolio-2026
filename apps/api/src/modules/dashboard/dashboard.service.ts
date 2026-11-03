import { sql, type Kysely } from "kysely";
import type { Database } from "../../db/types";

/** Numbers for the admin dashboard (rancangan §11): content counts and unread messages. */
export class DashboardService {
  constructor(private readonly db: Kysely<Database>) {}

  async summary() {
    const res = await sql<Record<string, number>>`
      select
        (select count(*) from projects where deleted_at is null and status = 'published')::int as projects_published,
        (select count(*) from projects where deleted_at is null and status = 'draft')::int as projects_draft,
        (select count(*) from projects where deleted_at is null and status = 'archived')::int as projects_archived,
        (select count(*) from experiences where deleted_at is null)::int as experiences,
        (select count(*) from certificates where deleted_at is null)::int as certificates,
        (select count(*) from achievements where deleted_at is null)::int as achievements,
        (select count(*) from technologies)::int as technologies,
        (select count(*) from media)::int as media,
        (select count(*) from contact_messages)::int as messages,
        (select count(*) from contact_messages where is_read = false)::int as messages_unread
    `.execute(this.db);
    const r = res.rows[0]!;
    return {
      projects: { published: r.projectsPublished, draft: r.projectsDraft, archived: r.projectsArchived },
      experiences: r.experiences,
      certificates: r.certificates,
      achievements: r.achievements,
      technologies: r.technologies,
      media: r.media,
      messages: { total: r.messages, unread: r.messagesUnread },
    };
  }
}
