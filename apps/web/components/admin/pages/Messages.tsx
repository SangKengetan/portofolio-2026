"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { adminApi, errorMessage } from "@/lib/admin/api";
import { formatDateTime, timeAgo } from "@/lib/admin/format";
import { useAdminQuery, useDebouncedValue } from "@/lib/admin/hooks";
import type { AdminMessage } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useConfirm, useCounts, useToast } from "../AdminProviders";
import { Pagination, SearchInput } from "../ui/Pagination";
import { EmptyState, ErrorState, LoadingBlock, PageHeader } from "../ui/Primitives";
import { CategoryTabs } from "@/components/project/CategoryTabs";

type Filter = "all" | "unread";

function Inbox() {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const params = useSearchParams();
  const { summary, refresh: refreshCounts } = useCounts();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search);
  const openId = params.get("open");

  const list = useAdminQuery<AdminMessage[]>("/admin/messages", { page, limit: 20, isRead: filter === "unread" ? false : undefined, search: q || undefined });
  const selected = useAdminQuery<AdminMessage>(openId ? `/admin/messages/${openId}` : null);
  const message = selected.data;

  const open = (id: string | null) => router.replace(id ? `/admin/messages?open=${id}` : "/admin/messages", { scroll: false });

  // Opening an unread message marks it as read.
  useEffect(() => {
    if (!message || message.isRead) return;
    void adminApi.patch<AdminMessage>(`/admin/messages/${message.id}`, { isRead: true }).then((res) => {
      selected.setData(res.data);
      list.setData((items) => items?.map((m) => (m.id === res.data.id ? res.data : m)) ?? null);
      void refreshCounts();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message?.id]);

  async function setRead(m: AdminMessage, isRead: boolean) {
    try {
      const res = await adminApi.patch<AdminMessage>(`/admin/messages/${m.id}`, { isRead });
      selected.setData(res.data);
      list.setData((items) => items?.map((x) => (x.id === m.id ? res.data : x)) ?? null);
      void refreshCounts();
      if (!isRead) open(null);
    } catch (err) {
      toast.error(err);
    }
  }

  async function remove(m: AdminMessage) {
    if (!(await confirm({ title: "Delete this message?", description: `From ${m.name} <${m.email}>.`, confirmLabel: "Delete", tone: "danger" }))) return;
    try {
      await adminApi.del(`/admin/messages/${m.id}`);
      toast.success("Message deleted.");
      open(null);
      void refreshCounts();
      await list.reload();
    } catch (err) {
      toast.error(err);
    }
  }

  return (
    <>
      <PageHeader title="Messages" description="Sent from the contact form on the site." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <CategoryTabs
          bleed={false}
          label="Filter messages"
          value={filter}
          onChange={(f: Filter) => {
            setFilter(f);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All", count: summary?.messages.total },
            { value: "unread", label: "Unread", count: summary?.messages.unread },
          ]}
        />
        <SearchInput value={search} onChange={(x) => { setSearch(x); setPage(1); }} placeholder="Search name, email or text" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className={cn(openId && "hidden lg:block")}>
          {list.error ? (
            <ErrorState message={errorMessage(list.error)} onRetry={list.reload} />
          ) : list.loading && !list.data ? (
            <LoadingBlock />
          ) : !list.data?.length ? (
            <EmptyState icon="inbox" title={filter === "unread" ? "No unread messages" : q ? "Nothing matches" : "No messages yet"} />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {list.data.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => open(m.id)}
                    aria-current={m.id === openId ? "true" : undefined}
                    className={cn("flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-bg", m.id === openId && "bg-surface-2")}
                  >
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", m.isRead ? "bg-transparent" : "bg-accent")} aria-label={m.isRead ? undefined : "Unread"} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={cn("truncate text-[14px] text-text", !m.isRead && "font-semibold")}>{m.name}</span>
                        <span className="shrink-0 text-[12px] text-text-subtle">{timeAgo(m.createdAt)}</span>
                      </span>
                      <span className="block truncate text-[13px] text-text-muted">{m.subject || "(no subject)"}</span>
                      <span className="block truncate text-[12.5px] text-text-subtle">{m.message}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Pagination meta={list.meta} onPage={setPage} />
        </div>

        <div className={cn(!openId && "hidden lg:block")}>
          {!openId ? (
            <div className="grid h-full min-h-[240px] place-items-center rounded-lg border border-dashed border-border text-[13.5px] text-text-subtle">Select a message to read it.</div>
          ) : selected.error ? (
            <ErrorState message={errorMessage(selected.error)} />
          ) : !message ? (
            <LoadingBlock rows={3} />
          ) : (
            <article className="overflow-hidden rounded-lg border border-border bg-surface">
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
                <div className="min-w-0">
                  <button type="button" onClick={() => open(null)} className="mb-2 text-[13px] text-text-muted hover:text-text lg:hidden">
                    ← Back to inbox
                  </button>
                  <h2 className="text-[17px] font-semibold text-text">{message.subject || "(no subject)"}</h2>
                  <p className="mt-1 text-[13px] text-text-muted">
                    <span className="text-text">{message.name}</span> &lt;
                    <a href={`mailto:${message.email}`} className="underline-offset-4 hover:underline">
                      {message.email}
                    </a>
                    &gt; · {formatDateTime(message.createdAt)}
                  </p>
                </div>
              </header>
              <div className="px-5 py-5 text-[14.5px] leading-relaxed whitespace-pre-wrap text-text">{message.message}</div>
              <footer className="flex flex-wrap gap-2 border-t border-border bg-bg px-5 py-3">
                <Button
                  size="sm"
                  iconLeft="mail"
                  href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject || "your message"}`)}&body=${encodeURIComponent(`\n\n> ${message.message.split("\n").join("\n> ")}`)}`}
                >
                  Reply by email
                </Button>
                <Button size="sm" variant="secondary" iconLeft="mail-open" onClick={() => void setRead(message, !message.isRead)}>
                  {message.isRead ? "Mark as unread" : "Mark as read"}
                </Button>
                <Button size="sm" variant="ghost" iconLeft="trash" onClick={() => void remove(message)} className="ml-auto text-danger">
                  Delete
                </Button>
              </footer>
            </article>
          )}
        </div>
      </div>
    </>
  );
}

export function MessagesPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Inbox />
    </Suspense>
  );
}
