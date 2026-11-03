"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProjectCategory } from "@portfolio/shared";
import { adminApi } from "@/lib/admin/api";
import { errorMessage } from "@/lib/admin/api";
import { statusOptions, timeAgo } from "@/lib/admin/format";
import { useAdminQuery, useDebouncedValue } from "@/lib/admin/hooks";
import type { AdminProjectListItem, PublishStatus } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { useConfirm, useCounts, useToast } from "../AdminProviders";
import { Pagination, SearchInput } from "../ui/Pagination";
import { EmptyState, ErrorState, IconButton, LoadingBlock, PageHeader, StatusBadge } from "../ui/Primitives";
import { SortableList } from "../ui/SortableList";
import { CategoryTabs } from "@/components/project/CategoryTabs";

type CategoryFilter = "all" | ProjectCategory;

/** /admin/projects — list with category tabs, search, status filter and drag-to-reorder (rancangan §11). */
export function ProjectList() {
  const toast = useToast();
  const confirm = useConfirm();
  const { refresh: refreshCounts } = useCounts();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [status, setStatus] = useState<PublishStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search);

  const list = useAdminQuery<AdminProjectListItem[]>("/admin/projects", {
    page,
    limit: 100,
    sort: "manual",
    category: category === "all" ? undefined : category,
    status: status || undefined,
    search: q || undefined,
  });

  // Manual order only makes sense on the complete, unfiltered list.
  const canReorder = category === "all" && !status && !q && (list.meta?.totalPages ?? 1) === 1;

  async function reorder(items: AdminProjectListItem[]) {
    const previous = list.data;
    list.setData(items);
    try {
      await adminApi.patch("/admin/projects/reorder", { items: items.map((p, i) => ({ id: p.id, sortOrder: i })) });
      toast.success("Order saved.");
    } catch (err) {
      list.setData(previous);
      toast.error(err);
    }
  }

  async function setProjectStatus(p: AdminProjectListItem, next: PublishStatus) {
    try {
      await adminApi.patch(`/admin/projects/${p.id}/status`, { status: next });
      list.setData((items) => items?.map((x) => (x.id === p.id ? { ...x, status: next } : x)) ?? null);
      toast.success(next === "published" ? `“${p.title}” is live.` : `“${p.title}” is now ${next}.`);
      void refreshCounts();
    } catch (err) {
      toast.error(err);
    }
  }

  async function remove(p: AdminProjectListItem) {
    const ok = await confirm({ title: `Delete “${p.title}”?`, description: "The project disappears from the site.", confirmLabel: "Delete", tone: "danger" });
    if (!ok) return;
    try {
      await adminApi.del(`/admin/projects/${p.id}`);
      list.setData((items) => items?.filter((x) => x.id !== p.id) ?? null);
      toast.success("Project deleted.");
      void refreshCounts();
    } catch (err) {
      toast.error(err);
    }
  }

  const row = (p: AdminProjectListItem) => (
    <div className="flex items-center gap-3 py-2.5 pr-2">
      <Link href={`/admin/projects/${p.id}`} className="relative hidden h-12 w-[72px] shrink-0 overflow-hidden rounded-sm bg-surface-2 sm:block" tabIndex={-1} aria-hidden="true">
        {p.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover.url} alt="" loading="lazy" className="size-full object-cover" />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/admin/projects/${p.id}`} className="flex items-center gap-1.5 truncate text-[14.5px] font-medium text-text hover:underline">
          {p.isFeatured && <Icon name="star" size={13} className="shrink-0 fill-current text-[#c49a3a]" label="Featured" />}
          <span className="truncate">{p.title}</span>
        </Link>
        <p className="mt-0.5 truncate text-[12.5px] text-text-subtle">
          /{p.slug} · updated {timeAgo(p.updatedAt)}
        </p>
      </div>
      <span className="hidden md:block">
        <Chip category={p.category} />
      </span>
      <span className="hidden w-[104px] sm:block">
        <StatusBadge status={p.status} />
      </span>
      <span className="flex items-center">
        <button
          type="button"
          onClick={() => void setProjectStatus(p, p.status === "published" ? "draft" : "published")}
          aria-label={`${p.status === "published" ? "Unpublish" : "Publish"} ${p.title}`}
          className="hidden h-8 rounded-full px-3 text-[12.5px] text-text-muted transition-colors hover:bg-surface-2 hover:text-text lg:inline-flex lg:items-center"
        >
          {p.status === "published" ? "Unpublish" : "Publish"}
        </button>
        <IconButton icon="pencil" label={`Edit ${p.title}`} href={`/admin/projects/${p.id}`} />
        <IconButton icon="trash" label={`Delete ${p.title}`} tone="danger" onClick={() => void remove(p)} />
      </span>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Projects"
        description="Web, UI/UX and Data projects. Drag to change the order on the site."
        actions={
          <Button href="/admin/projects/new" size="sm" iconLeft="plus">
            New project
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <CategoryTabs
          options={[
            { value: "all", label: "All" },
            { value: "web", label: "Web" },
            { value: "uiux", label: "UI/UX" },
            { value: "data", label: "Data" },
          ]}
          value={category}
          onChange={(c: CategoryFilter) => {
            setCategory(c);
            setPage(1);
          }}
          label="Filter by category"
          bleed={false}
        />
        <SearchInput value={search} onChange={(x) => { setSearch(x); setPage(1); }} placeholder="Search projects" />
        <label className="relative">
          <span className="sr-only">Status</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as PublishStatus | "");
              setPage(1);
            }}
            className="h-9 cursor-pointer appearance-none rounded-full border border-border bg-surface pr-9 pl-4 text-[13px] text-text"
          >
            <option value="">All statuses</option>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label.split(" — ")[0]}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" size={14} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-text-muted" />
        </label>
        {!canReorder && list.data && list.data.length > 1 && <span className="text-[12.5px] text-text-subtle">Clear filters to reorder.</span>}
      </div>

      {list.error ? (
        <ErrorState message={errorMessage(list.error)} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <LoadingBlock />
      ) : !list.data || list.data.length === 0 ? (
        <EmptyState
          icon="folder"
          title={q || status || category !== "all" ? "No projects match" : "No projects yet"}
          description={q || status || category !== "all" ? "Try another filter." : "Create your first case study — Web, UI/UX or Data."}
          action={
            <Button href="/admin/projects/new" size="sm" iconLeft="plus">
              New project
            </Button>
          }
        />
      ) : (
        <div className={cn("rounded-lg border border-border bg-surface", list.loading && "opacity-60")}>
          <SortableList
            items={list.data}
            getKey={(p) => p.id}
            getLabel={(p) => p.title}
            onReorder={(items) => void reorder(items)}
            disabled={!canReorder}
            className="divide-y divide-border"
            itemClassName="px-2"
            renderItem={(p) => row(p)}
          />
        </div>
      )}
      <Pagination meta={list.meta} onPage={setPage} />
    </>
  );
}
