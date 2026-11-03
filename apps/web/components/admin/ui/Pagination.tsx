"use client";

import type { PaginationMeta } from "@portfolio/shared";
import { Icon } from "@/components/ui/Icon";

export function Pagination({ meta, onPage }: { meta: PaginationMeta | undefined; onPage: (page: number) => void }) {
  if (!meta || meta.totalPages <= 1) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.total, meta.page * meta.limit);
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3 text-[13px] text-text-muted">
      <span>
        {from}–{to} of {meta.total}
      </span>
      <span className="flex items-center gap-1">
        <button type="button" onClick={() => onPage(meta.page - 1)} disabled={meta.page <= 1} aria-label="Previous page" className="grid size-9 place-items-center rounded-sm border border-border bg-surface hover:bg-surface-2 disabled:opacity-40">
          <Icon name="chevron-left" size={16} />
        </button>
        <span className="px-2 font-mono text-[12px]">
          {meta.page} / {meta.totalPages}
        </span>
        <button type="button" onClick={() => onPage(meta.page + 1)} disabled={meta.page >= meta.totalPages} aria-label="Next page" className="grid size-9 place-items-center rounded-sm border border-border bg-surface hover:bg-surface-2 disabled:opacity-40">
          <Icon name="chevron-right" size={16} />
        </button>
      </span>
    </nav>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search…", label = "Search" }: { value: string; onChange: (v: string) => void; placeholder?: string; label?: string }) {
  return (
    <label className="relative flex min-w-[200px] flex-1 items-center sm:max-w-[280px]">
      <span className="sr-only">{label}</span>
      <Icon name="search" size={15} className="pointer-events-none absolute left-3 text-text-subtle" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-full border border-border bg-surface pr-3 pl-9 text-[13.5px] text-text placeholder:text-text-subtle hover:border-text-subtle focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
      />
    </label>
  );
}
