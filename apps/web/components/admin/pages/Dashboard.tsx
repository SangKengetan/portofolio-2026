"use client";

import Link from "next/link";
import { errorMessage } from "@/lib/admin/api";
import { timeAgo } from "@/lib/admin/format";
import { useAdminQuery } from "@/lib/admin/hooks";
import type { AdminMessage, AdminProjectListItem, DashboardSummary } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useAuth } from "../AdminProviders";
import { Card, ErrorState, LoadingBlock, PageHeader, StatusBadge } from "../ui/Primitives";

function Stat({ href, icon, label, value, detail }: { href: string; icon: IconName; label: string; value: number | string; detail?: string }) {
  return (
    <Link href={href} className="group flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-text-subtle">
      <span className="flex items-center justify-between text-text-muted">
        <span className="text-[13px]">{label}</span>
        <Icon name={icon} size={16} />
      </span>
      <span className="text-[30px] leading-none font-semibold tracking-[-0.03em] text-text">{value}</span>
      {detail && <span className="text-[12.5px] text-text-subtle">{detail}</span>}
    </Link>
  );
}

/** /admin — content counts, unread messages and quick actions (rancangan §11). */
export function Dashboard() {
  const { user } = useAuth();
  const summary = useAdminQuery<DashboardSummary>("/admin/dashboard");
  const messages = useAdminQuery<AdminMessage[]>("/admin/messages", { isRead: false, limit: 5 });
  const recent = useAdminQuery<AdminProjectListItem[]>("/admin/projects", { sort: "newest", limit: 5 });
  const s = summary.data;

  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Good morning" : hour < 15 ? "Good afternoon" : hour < 19 ? "Good evening" : "Good night";

  return (
    <>
      <PageHeader
        title={`${greeting}${user?.name ? `, ${user.name.split(" ")[0]}` : ""}.`}
        description="Here is what is on your portfolio right now."
        actions={
          <>
            <Button href="/admin/media" variant="secondary" size="sm" iconLeft="upload">
              Upload media
            </Button>
            <Button href="/admin/projects/new" size="sm" iconLeft="plus">
              Add project
            </Button>
          </>
        }
      />

      {summary.error ? (
        <ErrorState message={errorMessage(summary.error)} onRetry={summary.reload} />
      ) : !s ? (
        <LoadingBlock rows={2} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat href="/admin/projects" icon="folder" label="Projects" value={s.projects.published} detail={`published · ${s.projects.draft} draft${s.projects.archived ? ` · ${s.projects.archived} archived` : ""}`} />
          <Stat href="/admin/experiences" icon="briefcase" label="Experience" value={s.experiences} />
          <Stat href="/admin/certificates" icon="award" label="Certificates" value={s.certificates} />
          <Stat href="/admin/achievements" icon="trophy" label="Achievements" value={s.achievements} />
          <Stat href="/admin/skills" icon="layers" label="Skills" value={s.technologies} />
          <Stat href="/admin/messages" icon="inbox" label="Unread messages" value={s.messages.unread} detail={`${s.messages.total} total`} />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card
          title="Unread messages"
          actions={
            <Link href="/admin/messages" className="text-[13px] text-text-muted hover:text-text">
              Open inbox →
            </Link>
          }
        >
          {messages.loading && !messages.data ? (
            <LoadingBlock rows={2} />
          ) : !messages.data?.length ? (
            <p className="text-[13.5px] text-text-muted">Inbox zero — no unread messages.</p>
          ) : (
            <ul className="-my-2 divide-y divide-border">
              {messages.data.map((m) => (
                <li key={m.id}>
                  <Link href={`/admin/messages?open=${m.id}`} className="flex items-start gap-3 py-3 hover:bg-bg">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[14px] font-medium text-text">{m.name}</span>
                        <span className="shrink-0 text-[12px] text-text-subtle">{timeAgo(m.createdAt)}</span>
                      </span>
                      <span className="block truncate text-[13px] text-text-muted">{m.subject || m.message}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Recent projects"
          actions={
            <Link href="/admin/projects" className="text-[13px] text-text-muted hover:text-text">
              All projects →
            </Link>
          }
        >
          {recent.loading && !recent.data ? (
            <LoadingBlock rows={2} />
          ) : !recent.data?.length ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-[13.5px] text-text-muted">No projects yet.</p>
              <Button href="/admin/projects/new" size="sm" iconLeft="plus">
                Create the first one
              </Button>
            </div>
          ) : (
            <ul className="-my-2 divide-y divide-border">
              {recent.data.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/projects/${p.id}`} className={cn("flex items-center gap-3 py-3 hover:bg-bg")}>
                    <span className="min-w-0 flex-1 truncate text-[14px] text-text">{p.title}</span>
                    <StatusBadge status={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
