"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TechGroup } from "@portfolio/shared";
import { techGroupOptions } from "@/lib/admin/format";
import { useAdminQuery } from "@/lib/admin/hooks";
import type { AdminTechnology } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "../ui/Primitives";

interface TechnologyPickerProps {
  label?: string;
  value: number[];
  onChange: (ids: number[]) => void;
  error?: string;
  max?: number;
}

/** Toggle technologies (from Skills) on a project or experience, grouped like the Skills section. */
export function TechnologyPicker({ label = "Technologies & tools", value, onChange, error, max = 30 }: TechnologyPickerProps) {
  const { data, loading } = useAdminQuery<AdminTechnology[]>("/admin/technologies", { limit: 200 });
  const [filter, setFilter] = useState("");
  const selected = new Set(value);

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const items = (data ?? []).filter((t) => !q || t.name.toLowerCase().includes(q));
    return techGroupOptions
      .map((g) => ({ ...g, items: items.filter((t) => t.group === g.value) }))
      .filter((g) => g.items.length > 0) as Array<{ value: TechGroup; label: string; items: AdminTechnology[] }>;
  }, [data, filter]);

  const toggle = (id: number) => {
    if (selected.has(id)) onChange(value.filter((x) => x !== id));
    else if (value.length < max) onChange([...value, id]);
  };

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1.5 flex w-full items-baseline justify-between text-[13px] font-medium text-text">
        {label}
        <span className="text-[12px] font-normal text-text-subtle">
          {value.length} selected
        </span>
      </legend>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex w-full max-w-[260px] items-center">
          <span className="sr-only">Filter technologies</span>
          <Icon name="search" size={14} className="pointer-events-none absolute left-2.5 text-text-subtle" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter…"
            className="h-8 w-full rounded-sm border border-border bg-surface pr-2 pl-8 text-[13px] focus-visible:outline-2 focus-visible:outline-focus"
          />
        </label>
        <Link href="/admin/skills" target="_blank" className="inline-flex items-center gap-1 text-[12.5px] text-text-muted underline-offset-4 hover:text-text hover:underline">
          Manage skills <Icon name="arrow-up-right" size={12} />
        </Link>
      </div>
      {loading && !data ? (
        <Spinner />
      ) : grouped.length === 0 ? (
        <p className="text-[13px] text-text-subtle">{data?.length ? "Nothing matches the filter." : "No technologies yet — add them under Skills."}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {grouped.map((g) => (
            <div key={g.value}>
              <p className="mb-1.5 text-label text-text-subtle">{g.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((t) => {
                  const on = selected.has(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(t.id)}
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors duration-150",
                        on ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface text-text-muted hover:border-text-subtle hover:text-text",
                      )}
                    >
                      {on && <Icon name="check" size={13} />}
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-[12.5px] text-danger">{error}</p>}
    </fieldset>
  );
}
