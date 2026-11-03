"use client";

import { useState, type ReactNode } from "react";
import { adminApi, errorMessage } from "@/lib/admin/api";
import { useAdminQuery, useDebouncedValue } from "@/lib/admin/hooks";
import type { PublishStatus } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { IconName } from "@/components/ui/Icon";
import { useConfirm, useCounts, useToast } from "../AdminProviders";
import { SearchInput } from "../ui/Pagination";
import { EmptyState, ErrorState, IconButton, LoadingBlock, PageHeader, StatusBadge } from "../ui/Primitives";
import { SortableList } from "../ui/SortableList";

interface Item {
  id: string;
  status: PublishStatus;
  sortOrder: number;
}

interface ResourceListProps<T extends Item> {
  title: string;
  description: string;
  /** e.g. "/admin/experiences" — also used for /reorder and /:id */
  endpoint: string;
  /** e.g. "/admin/experiences" — page URLs */
  basePath: string;
  singular: string;
  icon: IconName;
  itemLabel: (item: T) => string;
  renderMain: (item: T) => ReactNode;
  renderAside?: (item: T) => ReactNode;
  thumb?: (item: T) => string | null;
}

/** Shared list page for experiences, certificates and achievements: search, drag order, status, delete. */
export function ResourceList<T extends Item>({ title, description, endpoint, basePath, singular, icon, itemLabel, renderMain, renderAside, thumb }: ResourceListProps<T>) {
  const toast = useToast();
  const confirm = useConfirm();
  const { refresh: refreshCounts } = useCounts();
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search);
  const list = useAdminQuery<T[]>(endpoint, { limit: 100, search: q || undefined });
  const canReorder = !q && (list.meta?.totalPages ?? 1) === 1;

  async function reorder(items: T[]) {
    const previous = list.data;
    list.setData(items);
    try {
      await adminApi.patch(`${endpoint}/reorder`, { items: items.map((x, i) => ({ id: x.id, sortOrder: i })) });
      toast.success("Order saved.");
    } catch (err) {
      list.setData(previous);
      toast.error(err);
    }
  }

  async function remove(item: T) {
    const ok = await confirm({ title: `Delete “${itemLabel(item)}”?`, description: "It is removed from the site.", confirmLabel: "Delete", tone: "danger" });
    if (!ok) return;
    try {
      await adminApi.del(`${endpoint}/${item.id}`);
      list.setData((items) => items?.filter((x) => x.id !== item.id) ?? null);
      toast.success(`${singular} deleted.`);
      void refreshCounts();
    } catch (err) {
      toast.error(err);
    }
  }

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button href={`${basePath}/new`} size="sm" iconLeft="plus">
            New {singular.toLowerCase()}
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder={`Search ${title.toLowerCase()}`} />
        {list.meta && <span className="text-[12.5px] text-text-subtle">{list.meta.total} total</span>}
      </div>

      {list.error ? (
        <ErrorState message={errorMessage(list.error)} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <LoadingBlock />
      ) : !list.data?.length ? (
        <EmptyState
          icon={icon}
          title={q ? "Nothing matches your search" : `No ${title.toLowerCase()} yet`}
          action={
            !q && (
              <Button href={`${basePath}/new`} size="sm" iconLeft="plus">
                New {singular.toLowerCase()}
              </Button>
            )
          }
        />
      ) : (
        <div className={cn("rounded-lg border border-border bg-surface", list.loading && "opacity-60")}>
          <SortableList
            items={list.data}
            getKey={(x) => x.id}
            getLabel={itemLabel}
            onReorder={(items) => void reorder(items)}
            disabled={!canReorder}
            className="divide-y divide-border"
            itemClassName="px-2"
            renderItem={(item) => {
              const src = thumb?.(item);
              return (
                <div className="flex items-center gap-3 py-2.5 pr-2">
                  {thumb && (
                    <span className="hidden size-12 shrink-0 overflow-hidden rounded-sm bg-surface-2 sm:block" aria-hidden="true">
                      {src && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" loading="lazy" className="size-full object-cover" />
                      )}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">{renderMain(item)}</div>
                  {renderAside && <div className="hidden shrink-0 md:block">{renderAside(item)}</div>}
                  <span className="hidden w-[104px] sm:block">
                    <StatusBadge status={item.status} />
                  </span>
                  <span className="flex items-center">
                    <IconButton icon="pencil" label={`Edit ${itemLabel(item)}`} href={`${basePath}/${item.id}`} />
                    <IconButton icon="trash" label={`Delete ${itemLabel(item)}`} tone="danger" onClick={() => void remove(item)} />
                  </span>
                </div>
              );
            }}
          />
        </div>
      )}
    </>
  );
}
